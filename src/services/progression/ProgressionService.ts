// Player Progression Engine — the single source of truth for levels.
// Persistence lives here; every calculation is delegated to the pure rules.

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { XPService } from "@/services/xp";
import { DEFAULT_LEVEL_CURVE, buildLevelTable, xpForLevel } from "./levelCurve";
import {
  buildResult,
  calculateLevel,
  emptyProgression,
  eventTypeForTransition,
  nextProgression,
  snapshotForXP,
} from "./levelRules";
import { emitProgressionEvent } from "./progressionEvents";
import type {
  LevelHistoryEntry,
  LevelSnapshot,
  LevelUpResult,
  PlayerProfileStats,
  PlayerProgression,
} from "./levelTypes";

/* ---------------- Identity ---------------- */

async function resolveUserId(userId?: string): Promise<string> {
  if (userId) return userId;
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Usuário não autenticado");
  return data.user.id;
}

/* ---------------- Mappers ---------------- */

type ProgressionRow = {
  user_id: string;
  current_level: number;
  current_xp: number;
  lifetime_xp: number;
  xp_to_next_level: number;
  progress_percentage: number;
  highest_level: number;
  prestige: number;
  last_level_up_at: string | null;
};

type HistoryRow = {
  id: string;
  user_id: string;
  previous_level: number;
  new_level: number;
  levels_gained: number;
  lifetime_xp: number;
  source: string;
  metadata: Json;
  created_at: string;
};

function toProgression(row: ProgressionRow): PlayerProgression {
  return {
    userId: row.user_id,
    currentLevel: row.current_level,
    currentXP: row.current_xp,
    lifetimeXP: row.lifetime_xp,
    xpToNextLevel: row.xp_to_next_level,
    progressPercentage: row.progress_percentage,
    highestLevel: row.highest_level,
    prestige: row.prestige,
    lastLevelUpAt: row.last_level_up_at,
  };
}

function toHistory(row: HistoryRow): LevelHistoryEntry {
  return {
    id: row.id,
    userId: row.user_id,
    previousLevel: row.previous_level,
    newLevel: row.new_level,
    levelsGained: row.levels_gained,
    lifetimeXP: row.lifetime_xp,
    source: row.source,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
  };
}

const SELECT_PROGRESSION =
  "user_id, current_level, current_xp, lifetime_xp, xp_to_next_level, progress_percentage, highest_level, prestige, last_level_up_at";

/* ---------------- Persistence ---------------- */

async function readProgression(userId: string): Promise<PlayerProgression> {
  const { data, error } = await supabase
    .from("user_progression")
    .select(SELECT_PROGRESSION)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? toProgression(data as ProgressionRow) : emptyProgression(userId);
}

async function writeProgression(next: PlayerProgression): Promise<PlayerProgression> {
  const { data, error } = await supabase
    .from("user_progression")
    .upsert(
      {
        user_id: next.userId,
        current_level: next.currentLevel,
        current_xp: next.currentXP,
        lifetime_xp: next.lifetimeXP,
        xp_to_next_level: next.xpToNextLevel,
        progress_percentage: next.progressPercentage,
        highest_level: next.highestLevel,
        prestige: next.prestige,
        last_level_up_at: next.lastLevelUpAt,
      },
      { onConflict: "user_id" },
    )
    .select(SELECT_PROGRESSION)
    .single();
  if (error) throw error;
  return toProgression(data as ProgressionRow);
}

/**
 * One row per reached level, guarded by a unique (user_id, new_level) index:
 * retries and concurrent writers can never duplicate a level-up.
 */
async function recordHistory(
  userId: string,
  previousLevel: number,
  newLevel: number,
  lifetimeXP: number,
  source: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const rows = [];
  for (let level = previousLevel + 1; level <= newLevel; level += 1) {
    rows.push({
      user_id: userId,
      previous_level: level - 1,
      new_level: level,
      levels_gained: 1,
      lifetime_xp: lifetimeXP,
      source,
      metadata: metadata as Json,
    });
  }
  if (rows.length === 0) return;
  const { error } = await supabase.from("level_history").upsert(rows, {
    onConflict: "user_id,new_level",
    ignoreDuplicates: true,
  });
  if (error && error.code !== "23505") throw error;
}

/* ---------------- Public API ---------------- */

export const ProgressionService = {
  /** Pure helpers re-exported so consumers never re-implement the curve. */
  curve: DEFAULT_LEVEL_CURVE,
  calculateLevel,
  xpForLevel,
  levelTable: () => buildLevelTable(),

  async getProgression(userId?: string): Promise<PlayerProgression> {
    return readProgression(await resolveUserId(userId));
  },

  async getCurrentLevel(userId?: string): Promise<number> {
    return (await this.getProgression(userId)).currentLevel;
  },

  async getCurrentXP(userId?: string): Promise<number> {
    return (await this.getProgression(userId)).currentXP;
  },

  async getNextLevel(userId?: string): Promise<{ level: number; xpRequired: number } | null> {
    const progression = await this.getProgression(userId);
    const snapshot = snapshotForXP(progression.lifetimeXP);
    if (snapshot.isMaxLevel) return null;
    return { level: snapshot.level + 1, xpRequired: snapshot.nextLevelXP };
  },

  async getXPRemaining(userId?: string): Promise<number> {
    return snapshotForXP((await this.getProgression(userId)).lifetimeXP).xpRemaining;
  },

  async getProgressToNextLevel(userId?: string): Promise<LevelSnapshot> {
    return snapshotForXP((await this.getProgression(userId)).lifetimeXP);
  },

  /**
   * Recompute progression from the authoritative XP totals owned by XPService.
   * Safe to call repeatedly: level-up events fire only on real transitions.
   */
  async processXPUpdate(options?: {
    userId?: string;
    xpEarned?: number;
    source?: string;
    metadata?: Record<string, unknown>;
  }): Promise<LevelUpResult> {
    const userId = await resolveUserId(options?.userId);
    const stats = await XPService.getStats(userId);
    const previous = await readProgression(userId);
    const updated = nextProgression(previous, stats.currentXP, stats.lifetimeXP);
    const persisted = await writeProgression(updated);

    const eventType = eventTypeForTransition(previous.currentLevel, persisted.currentLevel);
    if (eventType) {
      await recordHistory(
        userId,
        previous.currentLevel,
        persisted.currentLevel,
        persisted.lifetimeXP,
        options?.source ?? "xp_update",
        options?.metadata ?? {},
      );
    }

    const result = buildResult(previous.currentLevel, persisted, options?.xpEarned ?? 0);
    if (eventType) {
      await emitProgressionEvent({ type: eventType, userId, result });
    }
    return result;
  },

  /** Ensures a row exists (called after onboarding/auth). */
  async ensureProgression(userId?: string): Promise<PlayerProgression> {
    const uid = await resolveUserId(userId);
    return writeProgression(await readProgression(uid));
  },

  async getLevelHistory(options?: {
    userId?: string;
    limit?: number;
  }): Promise<LevelHistoryEntry[]> {
    const uid = await resolveUserId(options?.userId);
    const { data, error } = await supabase
      .from("level_history")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(options?.limit ?? 50);
    if (error) throw error;
    return ((data ?? []) as HistoryRow[]).map(toHistory);
  },

  /** Reusable player card data for Profile, Leaderboards and the AI Coach. */
  async getPlayerStats(userId?: string): Promise<PlayerProfileStats> {
    const uid = await resolveUserId(userId);
    const progression = await readProgression(uid);
    const snapshot = snapshotForXP(progression.lifetimeXP);

    const [achievements, programs, streak] = await Promise.all([
      supabase
        .from("user_achievements")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid),
      supabase
        .from("training_plans")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("status", "completed"),
      supabase
        .from("planned_workouts")
        .select("completed_at")
        .eq("user_id", uid)
        .eq("is_completed", true)
        .order("completed_at", { ascending: false })
        .limit(120),
    ]);

    return {
      userId: uid,
      currentLevel: progression.currentLevel,
      currentXP: progression.currentXP,
      lifetimeXP: progression.lifetimeXP,
      highestLevel: progression.highestLevel,
      prestige: progression.prestige,
      xpRemaining: snapshot.xpRemaining,
      progressPercentage: snapshot.progressPercentage,
      currentStreak: computeStreak(
        ((streak.data ?? []) as { completed_at: string | null }[])
          .map((row) => row.completed_at)
          .filter((value): value is string => Boolean(value)),
      ),
      programsCompleted: programs.count ?? 0,
      achievementsUnlocked: achievements.count ?? 0,
    };
  },
};

/** Consecutive-day streak from completion timestamps (most recent first). */
function computeStreak(timestamps: string[]): number {
  if (timestamps.length === 0) return 0;
  const days = new Set(timestamps.map((iso) => iso.slice(0, 10)));
  const cursor = new Date();
  let streak = 0;
  // Tolerate "not trained yet today" by starting from today or yesterday.
  const today = cursor.toISOString().slice(0, 10);
  if (!days.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/* ---------------- Bus wiring (single subscriber) ---------------- */

let registered = false;

/** Idempotent registration of the progression listener on the XP bus. */
export function registerProgressionEngine(): void {
  if (registered) return;
  registered = true;
  void import("@/services/xp/xpEvents").then(({ onXPApplied }) => {
    onXPApplied(async ({ userId, amount, eventType }) => {
      try {
        await ProgressionService.processXPUpdate({
          userId,
          xpEarned: amount,
          source: eventType,
        });
      } catch (error) {
        // Progression is a secondary concern: never break the XP/workout flow.
        console.error("[progression] processXPUpdate failed", error);
      }
    });
  });
}
