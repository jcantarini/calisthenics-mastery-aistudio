// XP Engine — the only place XP is calculated and persisted.
// No React, no UI. Components/services interact through this API or the bus.

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { isIdempotent, levelForXP, resolveAmount, resolveReason } from "./xpRules";
import { notifyXPApplied, onXPEvent } from "./xpEvents";

import type { XPAwardResult, XPEntry, XPEvent, XPEventType, UserXPStats } from "./xpTypes";

/* ---------------- Identity ---------------- */

async function resolveUserId(userId?: string): Promise<string> {
  if (userId) return userId;
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Usuário não autenticado");
  return data.user.id;
}

/* ---------------- Mappers ---------------- */

type HistoryRow = {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  event_type: string;
  source_id: string | null;
  metadata: Json;
  running_total: number;
  created_at: string;
};

type StatsRow = {
  user_id: string;
  current_xp: number;
  lifetime_xp: number;
  level: number;
  last_activity_at: string | null;
};

function toEntry(row: HistoryRow): XPEntry {
  return {
    id: row.id,
    userId: row.user_id,
    amount: row.amount,
    reason: row.reason,
    eventType: row.event_type as XPEventType,
    sourceId: row.source_id,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    runningTotal: row.running_total,
    createdAt: row.created_at,
  };
}

function toStats(row: StatsRow): UserXPStats {
  return {
    userId: row.user_id,
    currentXP: row.current_xp,
    lifetimeXP: row.lifetime_xp,
    level: row.level,
    lastActivityAt: row.last_activity_at,
  };
}

function emptyStats(userId: string): UserXPStats {
  return { userId, currentXP: 0, lifetimeXP: 0, level: 1, lastActivityAt: null };
}

/* ---------------- Persistence ---------------- */

async function readStats(userId: string): Promise<UserXPStats> {
  const { data, error } = await supabase
    .from("user_stats")
    .select("user_id, current_xp, lifetime_xp, level, last_activity_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? toStats(data as StatsRow) : emptyStats(userId);
}

async function writeStats(next: UserXPStats): Promise<UserXPStats> {
  const { data, error } = await supabase
    .from("user_stats")
    .upsert(
      {
        user_id: next.userId,
        current_xp: next.currentXP,
        lifetime_xp: next.lifetimeXP,
        level: next.level,
        last_activity_at: next.lastActivityAt,
      },
      { onConflict: "user_id" },
    )
    .select("user_id, current_xp, lifetime_xp, level, last_activity_at")
    .single();
  if (error) throw error;
  return toStats(data as StatsRow);
}

async function alreadyAwarded(userId: string, type: XPEventType, sourceId?: string | null) {
  if (!sourceId || !isIdempotent(type)) return false;
  const { data, error } = await supabase
    .from("xp_history")
    .select("id")
    .eq("user_id", userId)
    .eq("event_type", type)
    .eq("source_id", sourceId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

/** Core transactional-ish write: history row + aggregated stats. */
async function applyDelta(userId: string, delta: number, event: XPEvent): Promise<XPAwardResult> {
  const stats = await readStats(userId);
  const currentXP = Math.max(0, stats.currentXP + delta);
  const lifetimeXP = delta > 0 ? stats.lifetimeXP + delta : stats.lifetimeXP;
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("xp_history")
    .insert({
      user_id: userId,
      amount: delta,
      reason: resolveReason(event),
      event_type: event.type,
      source_id: event.sourceId ?? null,
      metadata: (event.metadata ?? {}) as Json,
      running_total: currentXP,
    })
    .select("*")
    .single();

  // Unique index violation = concurrent duplicate; treat as no-op.
  if (error) {
    if (error.code === "23505") return { awarded: false, amount: 0, entry: null, stats };
    throw error;
  }

  const nextStats = await writeStats({
    userId,
    currentXP,
    lifetimeXP,
    level: levelForXP(lifetimeXP),
    lastActivityAt: nowIso,
  });

  await notifyXPApplied({
    userId,
    amount: delta,
    eventType: event.type,
    currentXP: nextStats.currentXP,
    lifetimeXP: nextStats.lifetimeXP,
  });

  return { awarded: true, amount: delta, entry: toEntry(data as HistoryRow), stats: nextStats };
}

/* ---------------- Public API ---------------- */

export const XPService = {
  /** Award XP for a domain event. Idempotent for events with a sourceId. */
  async awardXP(event: XPEvent): Promise<XPAwardResult> {
    const userId = await resolveUserId(event.userId);
    const amount = resolveAmount(event);
    if (amount <= 0) {
      return { awarded: false, amount: 0, entry: null, stats: await readStats(userId) };
    }
    if (await alreadyAwarded(userId, event.type, event.sourceId)) {
      return { awarded: false, amount: 0, entry: null, stats: await readStats(userId) };
    }
    return applyDelta(userId, amount, event);
  },

  /** Remove XP (penalties, undo, corrections). Lifetime XP is never reduced. */
  async removeXP(event: XPEvent): Promise<XPAwardResult> {
    const userId = await resolveUserId(event.userId);
    const amount = Math.abs(resolveAmount(event));
    if (amount <= 0) {
      return { awarded: false, amount: 0, entry: null, stats: await readStats(userId) };
    }
    return applyDelta(userId, -amount, { ...event, sourceId: null });
  },

  /** Spendable / displayed XP balance. */
  async getCurrentXP(userId?: string): Promise<number> {
    const uid = await resolveUserId(userId);
    return (await readStats(uid)).currentXP;
  },

  /** Total XP ever earned — drives levels and achievements. */
  async getLifetimeXP(userId?: string): Promise<number> {
    const uid = await resolveUserId(userId);
    return (await readStats(uid)).lifetimeXP;
  },

  async getStats(userId?: string): Promise<UserXPStats> {
    return readStats(await resolveUserId(userId));
  },

  async getXPHistory(options?: { limit?: number; userId?: string }): Promise<XPEntry[]> {
    const uid = await resolveUserId(options?.userId);
    const { data, error } = await supabase
      .from("xp_history")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(options?.limit ?? 50);
    if (error) throw error;
    return ((data ?? []) as HistoryRow[]).map(toEntry);
  },

  /** Ensure a stats row exists (called after onboarding/auth if needed). */
  async ensureStats(userId?: string): Promise<UserXPStats> {
    const uid = await resolveUserId(userId);
    const stats = await readStats(uid);
    return stats.lastActivityAt === null && stats.lifetimeXP === 0 ? writeStats(stats) : stats;
  },
};

/* ---------------- Bus wiring (single subscriber) ---------------- */

let registered = false;

/** Idempotent registration of the XP listener on the domain event bus. */
export function registerXPEngine(): void {
  if (registered) return;
  registered = true;
  onXPEvent(async (event) => {
    await XPService.awardXP(event);
  });
}
