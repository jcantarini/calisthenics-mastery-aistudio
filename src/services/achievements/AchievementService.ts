// Achievements Engine — the only place achievement progress is persisted and
// unlocks are decided. No React, no UI. XP is delegated to XPService.

import { supabase } from "@/integrations/supabase/client";
import { XPService } from "@/services/xp";
import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_CATEGORIES,
  getAchievement,
} from "./achievementCatalog";
import {
  achievementsForMetric,
  applyUpdate,
  buildProgress,
  clampPercentage,
  deriveMetricUpdates,
  isVisible,
  shouldUnlock,
} from "./achievementRules";
import { setAchievementHandler } from "./achievementEvents";
import type {
  AchievementCategory,
  AchievementEvent,
  AchievementProgress,
  AchievementUnlockResult,
  CategoryProgress,
  MetricUpdate,
  UserAchievement,
} from "./achievementTypes";

/* ---------------- Identity ---------------- */

async function resolveUserId(userId?: string): Promise<string> {
  if (userId) return userId;
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Usuário não autenticado");
  return data.user.id;
}

/* ---------------- Persistence ---------------- */

type ProgressRow = {
  achievement_id: string;
  current_value: number;
  target_value: number;
  progress_percentage: number;
};

type UnlockRow = {
  achievement_id: string;
  unlocked_at: string;
  xp_awarded: number;
};

async function readProgressRows(userId: string): Promise<Map<string, ProgressRow>> {
  const { data, error } = await supabase
    .from("user_achievement_progress")
    .select("achievement_id, current_value, target_value, progress_percentage")
    .eq("user_id", userId);
  if (error) throw error;
  return new Map(((data ?? []) as ProgressRow[]).map((r) => [r.achievement_id, r]));
}

async function readUnlockRows(userId: string): Promise<Map<string, UnlockRow>> {
  const { data, error } = await supabase
    .from("user_achievements")
    .select("achievement_id, unlocked_at, xp_awarded")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });
  if (error) throw error;
  return new Map(((data ?? []) as UnlockRow[]).map((r) => [r.achievement_id, r]));
}

async function writeProgress(
  userId: string,
  rows: { achievementId: string; value: number; target: number }[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from("user_achievement_progress").upsert(
    rows.map((r) => ({
      user_id: userId,
      achievement_id: r.achievementId,
      current_value: r.value,
      target_value: r.target,
      progress_percentage: clampPercentage(r.value, r.target),
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,achievement_id" },
  );
  if (error) throw error;
}

/**
 * Persist the unlock first — the unique constraint is what guarantees a user
 * never unlocks the same achievement twice, even under concurrent retries.
 * XP is only awarded when this insert wins.
 */
async function persistUnlock(
  userId: string,
  achievementId: string,
  sourceEventId: string | null,
): Promise<AchievementUnlockResult | null> {
  const definition = getAchievement(achievementId);
  if (!definition) return null;

  const { data, error } = await supabase
    .from("user_achievements")
    .insert({
      user_id: userId,
      achievement_id: achievementId,
      xp_awarded: definition.xpReward,
      source_event_id: sourceEventId,
    })
    .select("achievement_id, unlocked_at, xp_awarded")
    .maybeSingle();

  // 23505 = already unlocked (duplicate). Idempotent no-op.
  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }
  if (!data) return null;

  // XPService owns XP. The achievement id is the idempotency source.
  const award = await XPService.awardXP({
    type: "achievement_unlocked",
    sourceId: achievementId,
    amount: definition.xpReward,
    userId,
    metadata: { achievementId, category: definition.category, rarity: definition.rarity },
  });

  return {
    achievement: definition,
    xpEarned: award.awarded ? award.amount : 0,
    titleKey: definition.titleKey,
    descriptionKey: definition.descriptionKey,
    descriptionVars: definition.descriptionVars,
    icon: definition.icon,
    rarity: definition.rarity,
    unlockedAt: (data as UnlockRow).unlocked_at,
  };
}

/* ---------------- Evaluation core ---------------- */

async function applyMetricUpdates(
  userId: string,
  updates: MetricUpdate[],
  sourceEventId: string | null,
): Promise<AchievementUnlockResult[]> {
  if (updates.length === 0) return [];

  const [progress, unlocked] = await Promise.all([
    readProgressRows(userId),
    readUnlockRows(userId),
  ]);

  const nextRows: { achievementId: string; value: number; target: number }[] = [];
  const toUnlock: string[] = [];

  for (const update of updates) {
    for (const definition of achievementsForMetric(update.metric)) {
      const current = progress.get(definition.id)?.current_value ?? 0;
      const value = applyUpdate(current, update);
      nextRows.push({ achievementId: definition.id, value, target: definition.target });
      if (shouldUnlock(definition, value, unlocked.has(definition.id))) {
        toUnlock.push(definition.id);
      }
    }
  }

  await writeProgress(userId, nextRows);

  const results: AchievementUnlockResult[] = [];
  for (const id of toUnlock) {
    const result = await persistUnlock(userId, id, sourceEventId);
    if (result) results.push(result);
  }
  return results;
}

/* ---------------- Historical backfill ---------------- */

function longestStreakDays(dates: string[]): number {
  const days = Array.from(new Set(dates.map((d) => d.slice(0, 10)))).sort();
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of days) {
    const time = new Date(`${day}T00:00:00Z`).getTime();
    if (previous !== null && time - previous === 86_400_000) run += 1;
    else run = 1;
    previous = time;
    best = Math.max(best, run);
  }
  return best;
}

async function collectHistoricalMetrics(userId: string): Promise<MetricUpdate[]> {
  const [workouts, plans, onboarding, assessment] = await Promise.all([
    supabase
      .from("planned_workouts")
      .select("completed_at")
      .eq("user_id", userId)
      .eq("is_completed", true),
    supabase
      .from("training_plans")
      .select("status, completed_weeks")
      .eq("user_id", userId),
    supabase
      .from("user_onboarding")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("fitness_assessment")
      .select("completed")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const completed = (workouts.data ?? []) as { completed_at: string | null }[];
  const planRows = (plans.data ?? []) as { status: string; completed_weeks: number }[];

  const updates: MetricUpdate[] = [
    { metric: "workouts_completed", value: completed.length, mode: "absolute" },
    {
      metric: "weeks_completed",
      value: planRows.reduce((sum, p) => sum + (p.completed_weeks ?? 0), 0),
      mode: "absolute",
    },
    {
      metric: "programs_completed",
      value: planRows.filter((p) => p.status === "completed").length,
      mode: "absolute",
    },
    {
      metric: "streak_days",
      value: longestStreakDays(completed.map((w) => w.completed_at ?? "").filter(Boolean)),
      mode: "absolute",
    },
  ];

  if (onboarding.data?.onboarding_completed) {
    updates.push({ metric: "profile_completed", value: 1, mode: "absolute" });
  }
  if (assessment.data?.completed) {
    updates.push({ metric: "assessment_completed", value: 1, mode: "absolute" });
  }
  return updates;
}

/* ---------------- Public API ---------------- */

export const AchievementService = {
  /**
   * Single entry point for domain events. Returns newly unlocked achievements.
   * Failures are surfaced to the caller of processEvent only; the event bus
   * swallows them so training flows are never blocked.
   */
  async processEvent(
    userId: string | undefined,
    event: AchievementEvent,
  ): Promise<AchievementUnlockResult[]> {
    const uid = await resolveUserId(userId ?? event.userId);
    const updates = deriveMetricUpdates(event);
    return applyMetricUpdates(uid, updates, event.sourceId ?? null);
  },

  getAchievementCatalog() {
    return ACHIEVEMENT_CATALOG;
  },

  /** Catalog + per-user progress. Hidden achievements stay hidden until unlocked. */
  async getUserAchievements(userId?: string): Promise<UserAchievement[]> {
    const uid = await resolveUserId(userId);
    const [progress, unlocked] = await Promise.all([
      readProgressRows(uid),
      readUnlockRows(uid),
    ]);
    return ACHIEVEMENT_CATALOG.filter((d) => isVisible(d, unlocked.has(d.id))).map((d) => {
      const row = unlocked.get(d.id);
      const value = row ? d.target : (progress.get(d.id)?.current_value ?? 0);
      return {
        ...buildProgress(d, value, row?.unlocked_at ?? null),
        definition: d,
        xpAwarded: row?.xp_awarded ?? 0,
      };
    });
  },

  async getUnlockedAchievements(userId?: string): Promise<UserAchievement[]> {
    return (await this.getUserAchievements(userId)).filter((a) => a.unlocked);
  },

  async getLockedAchievements(userId?: string): Promise<UserAchievement[]> {
    return (await this.getUserAchievements(userId)).filter((a) => !a.unlocked);
  },

  async getAchievementProgress(
    userId: string | undefined,
    achievementId: string,
  ): Promise<AchievementProgress | null> {
    const definition = getAchievement(achievementId);
    if (!definition) return null;
    const uid = await resolveUserId(userId);
    const [progress, unlocked] = await Promise.all([
      readProgressRows(uid),
      readUnlockRows(uid),
    ]);
    const row = unlocked.get(achievementId);
    const value = row ? definition.target : (progress.get(achievementId)?.current_value ?? 0);
    return buildProgress(definition, value, row?.unlocked_at ?? null);
  },

  async getRecentlyUnlocked(userId?: string, limit = 3): Promise<UserAchievement[]> {
    const unlocked = await this.getUnlockedAchievements(userId);
    return unlocked
      .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""))
      .slice(0, limit);
  },

  async getCategoryProgress(
    userId?: string,
    category?: AchievementCategory,
  ): Promise<CategoryProgress[]> {
    const all = await this.getUserAchievements(userId);
    const categories = category ? [category] : ACHIEVEMENT_CATEGORIES;
    return categories.map((c) => {
      const items = all.filter((a) => a.definition.category === c);
      const unlocked = items.filter((a) => a.unlocked).length;
      return {
        category: c,
        total: items.length,
        unlocked,
        percentage: items.length === 0 ? 0 : Math.round((unlocked / items.length) * 100),
      };
    });
  },

  /**
   * Evaluates already existing user data (workouts, weeks, programs, streak,
   * assessment, profile) and unlocks whatever was earned before this engine
   * existed. Idempotent: safe to run on every app start.
   */
  async checkHistoricalAchievements(userId?: string): Promise<AchievementUnlockResult[]> {
    const uid = await resolveUserId(userId);
    const updates = await collectHistoricalMetrics(uid);
    return applyMetricUpdates(uid, updates, "historical_backfill");
  },
};

/* ---------------- Bus wiring (single subscriber) ---------------- */

let registered = false;

/** Idempotent registration of the engine on the achievement event bus. */
export function registerAchievementEngine(): void {
  if (registered) return;
  registered = true;
  setAchievementHandler((event) => AchievementService.processEvent(event.userId, event));
}
