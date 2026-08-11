// Sprint 7.3B — Goal Reward Recovery tests.
// Fake-driven (no Supabase, no React): recovery must reuse the real
// GamificationOrchestrator and never write XP / levels / achievements itself.

import { describe, expect, it } from "vitest";
import { createGamificationOrchestrator } from "@/services/gamification/GamificationOrchestrator";
import type {
  AchievementEnginePort,
  GamificationEngines,
  ProgressionEnginePort,
  XPEnginePort,
} from "@/services/gamification/gamificationTypes";
import { deriveMetricUpdates } from "@/services/achievements/achievementRules";
import type { AchievementUnlockResult } from "@/services/achievements";
import type { LevelUpResult, PlayerProfileStats } from "@/services/progression";
import type { XPAwardResult } from "@/services/xp";
import { GOAL_COMPLETION_XP, goalCompletionSourceId } from "@/services/xp/xpRules";
import {
  GOAL_REWARDS_ACTIVATED_AT,
  createGoalRewardRecovery,
  goalRewardEligibility,
} from "./GoalRewardRecovery";
import type { Goal, GoalStatus } from "./goalTypes";

const USER = "user-1";
const AFTER = "2026-08-20T10:00:00.000Z";
const BEFORE = "2026-08-01T10:00:00.000Z";

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "g1",
    userId: USER,
    type: "workout_count",
    category: "fitness",
    progressType: "count",
    title: "Completar 20 treinos",
    description: null,
    targetValue: 20,
    currentValue: 20,
    unit: "workouts",
    status: "completed",
    difficulty: "medium",
    startDate: "2026-08-01",
    targetDate: null,
    completedAt: AFTER,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: AFTER,
    metadata: {},
    ...overrides,
  };
}

/* ---------------- Fake engines (persistent, idempotent) ---------------- */

const stats: PlayerProfileStats = {
  userId: USER,
  currentLevel: 1,
  currentXP: 0,
  lifetimeXP: 0,
  highestLevel: 1,
  prestige: 0,
  xpRemaining: 250,
  progressPercentage: 0,
  currentStreak: 0,
  programsCompleted: 0,
  achievementsUnlocked: 0,
};

/** Reproduces the real (user, type, sourceId) XP idempotency + history rows. */
function makeXPEngine() {
  const history: { type: string; sourceId: string | null; amount: number }[] = [];
  let currentXP = 0;
  let lifetimeXP = 0;

  const engine: XPEnginePort = {
    async awardXP(event): Promise<XPAwardResult> {
      const amount = event.amount ?? 0;
      const duplicate =
        Boolean(event.sourceId) &&
        history.some((h) => h.type === event.type && h.sourceId === event.sourceId);
      if (duplicate) {
        return {
          awarded: false,
          amount: 0,
          entry: null,
          stats: { userId: USER, currentXP, lifetimeXP, level: 1, lastActivityAt: null },
        };
      }
      history.push({ type: event.type, sourceId: event.sourceId ?? null, amount });
      currentXP += amount;
      lifetimeXP += amount;
      return {
        awarded: amount > 0,
        amount,
        entry: null,
        stats: { userId: USER, currentXP, lifetimeXP, level: 1, lastActivityAt: null },
      };
    },
  };

  return {
    engine,
    history,
    total: () => lifetimeXP,
    /** XP-domain read used by recovery instead of touching xp_history. */
    hasProcessedSource: async (sourceId: string) =>
      history.some((h) => h.type === "goal_completed" && h.sourceId === sourceId),
  };
}

/** 250 XP per level; records every level-up (level_history equivalent). */
function makeProgressionEngine() {
  let lifetime = 0;
  const levelHistory: number[] = [];
  const levelFor = (xp: number) => Math.floor(xp / 250) + 1;

  const engine: ProgressionEnginePort = {
    async processXPUpdate(options): Promise<LevelUpResult> {
      const oldLevel = levelFor(lifetime);
      lifetime += options?.xpEarned ?? 0;
      const newLevel = levelFor(lifetime);
      for (let l = oldLevel + 1; l <= newLevel; l += 1) levelHistory.push(l);
      return {
        leveledUp: newLevel > oldLevel,
        oldLevel,
        newLevel,
        levelsGained: Math.max(0, newLevel - oldLevel),
        xpEarned: options?.xpEarned ?? 0,
        currentXP: lifetime,
        lifetimeXP: lifetime,
        xpRemaining: 250 - (lifetime % 250),
        progressPercentage: Math.round(((lifetime % 250) / 250) * 100),
        isMaxLevel: false,
        unlockedRewards: [],
        progression: {
          userId: USER,
          currentLevel: newLevel,
          currentXP: lifetime,
          lifetimeXP: lifetime,
          xpToNextLevel: 250,
          progressPercentage: 0,
          highestLevel: newLevel,
          prestige: 0,
          lastLevelUpAt: null,
        },
      };
    },
    async getPlayerStats() {
      return stats;
    },
  };
  return { engine, levelHistory };
}

function unlock(id: string): AchievementUnlockResult {
  return {
    achievement: {
      id,
      category: "goals",
      titleKey: `ach.${id}`,
      descriptionKey: `ach.${id}.desc`,
      icon: "target",
      metric: "goals_completed",
      progressType: "cumulative",
      target: 1,
      xpReward: 100,
      rarity: "common",
      hidden: false,
    },
    xpEarned: 100,
    titleKey: `ach.${id}`,
    descriptionKey: `ach.${id}.desc`,
    icon: "target",
    rarity: "common",
    unlockedAt: AFTER,
  };
}

function makeAchievementEngine() {
  const unlocked: string[] = [];
  let goalsCompleted = 0;
  const engine: AchievementEnginePort = {
    async processEvent(_userId, event) {
      for (const update of deriveMetricUpdates(event)) {
        if (update.metric !== "goals_completed") continue;
        goalsCompleted = update.mode === "absolute" ? update.value : goalsCompleted + update.value;
      }
      const results: AchievementUnlockResult[] = [];
      for (const [id, target] of [
        ["goal_first", 1],
        ["goal_5", 5],
      ] as const) {
        if (goalsCompleted >= target && !unlocked.includes(id)) {
          unlocked.push(id);
          results.push(unlock(id));
        }
      }
      return results;
    },
  };
  return { engine, unlocked, metric: () => goalsCompleted };
}

interface SetupOptions {
  goals: Goal[];
  failFor?: string[];
  completedCount?: number;
}

function makeSetup(options: SetupOptions) {
  const xp = makeXPEngine();
  const progression = makeProgressionEngine();
  const achievements = makeAchievementEngine();
  const engines: GamificationEngines = {
    xp: xp.engine,
    progression: progression.engine,
    achievements: achievements.engine,
  };
  const orchestrator = createGamificationOrchestrator(engines);
  const store = [...options.goals];

  const recovery = createGoalRewardRecovery({
    listCompletedGoals: async (_uid, limit) =>
      store
        .filter((g) => g.status === "completed" && g.completedAt)
        .sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!))
        .slice(0, limit),
    countCompletedGoals: async () =>
      options.completedCount ?? store.filter((g) => g.status === "completed").length,
    hasProcessedSource: (sourceId) => xp.hasProcessedSource(sourceId),
    processGoalCompleted: async (opts) => {
      if (options.failFor?.includes(opts.goalId)) throw new Error("network error");
      return orchestrator.processGoalCompleted(opts);
    },
    log: () => undefined,
  });

  return { xp, progression, achievements, recovery, store };
}

/* ---------------- Eligibility ---------------- */

describe("goal reward eligibility", () => {
  const ignored: GoalStatus[] = ["draft", "active", "paused", "cancelled", "expired"];

  it.each(ignored)("ignores %s goals", (status) => {
    const result = goalRewardEligibility(goal({ status }));
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("not_completed");
  });

  it("ignores a completed goal without completed_at", () => {
    expect(goalRewardEligibility(goal({ completedAt: null })).reason).toBe("missing_completed_at");
  });

  it("ignores historical goals completed before the activation boundary", () => {
    expect(goalRewardEligibility(goal({ completedAt: BEFORE })).reason).toBe("before_activation");
  });

  it("accepts a goal completed after the activation boundary", () => {
    expect(goalRewardEligibility(goal({ completedAt: AFTER })).eligible).toBe(true);
    expect(Date.parse(GOAL_REWARDS_ACTIVATED_AT)).toBeLessThan(Date.parse(AFTER));
  });
});

/* ---------------- Recovery behaviour ---------------- */

describe("reconcileCompletedGoalRewards", () => {
  it("recovers a completed goal whose reward never ran", async () => {
    const { recovery, xp } = makeSetup({ goals: [goal()] });
    const report = await recovery.reconcileCompletedGoalRewards(USER);

    expect(report).toMatchObject({ scanned: 1, recovered: 1, alreadyProcessed: 0, failed: 0 });
    expect(xp.total()).toBe(GOAL_COMPLETION_XP.medium);
    expect(xp.history[0]?.sourceId).toBe(goalCompletionSourceId("g1"));
  });

  it("awards XP matching the persisted difficulty", async () => {
    const { recovery, xp } = makeSetup({ goals: [goal({ difficulty: "epic" })] });
    await recovery.reconcileCompletedGoalRewards(USER);
    expect(xp.total()).toBe(GOAL_COMPLETION_XP.epic);
  });

  it("skips a goal whose reward was already processed", async () => {
    const { recovery, xp } = makeSetup({ goals: [goal()] });
    await recovery.reconcileCompletedGoalRewards(USER);
    const second = await recovery.reconcileCompletedGoalRewards(USER);

    expect(second).toMatchObject({ alreadyProcessed: 1, recovered: 0 });
    expect(xp.history).toHaveLength(1);
  });

  it("is idempotent across ten runs (XP, achievements, level history)", async () => {
    const { recovery, xp, progression, achievements } = makeSetup({
      goals: [goal({ difficulty: "epic" })],
    });
    for (let i = 0; i < 10; i += 1) await recovery.reconcileCompletedGoalRewards(USER);

    expect(xp.history.filter((h) => h.type === "goal_completed")).toHaveLength(1);
    expect(xp.total()).toBe(GOAL_COMPLETION_XP.epic);
    expect(progression.levelHistory).toEqual([2]);
    expect(achievements.unlocked).toEqual(["goal_first"]);
  });

  it("can trigger a level-up through the existing progression engine", async () => {
    const { recovery, progression } = makeSetup({ goals: [goal({ difficulty: "epic" })] });
    await recovery.reconcileCompletedGoalRewards(USER);
    expect(progression.levelHistory).toEqual([2]);
  });

  it("can unlock goal achievements through the existing pipeline", async () => {
    const goals = Array.from({ length: 5 }, (_, i) =>
      goal({ id: `g${i + 1}`, completedAt: `2026-08-2${i}T10:00:00.000Z` }),
    );
    const { recovery, achievements } = makeSetup({ goals });
    await recovery.reconcileCompletedGoalRewards(USER);
    expect(achievements.unlocked).toEqual(["goal_first", "goal_5"]);
  });

  it("continues after a failing goal (partial failure isolation)", async () => {
    const goals = [
      goal({ id: "gA", completedAt: "2026-08-23T10:00:00.000Z" }),
      goal({ id: "gB", completedAt: "2026-08-22T10:00:00.000Z" }),
      goal({ id: "gC", completedAt: "2026-08-21T10:00:00.000Z" }),
      goal({ id: "gD", completedAt: "2026-08-20T10:00:00.000Z" }),
    ];
    const { recovery, xp } = makeSetup({ goals, failFor: ["gC"] });
    const report = await recovery.reconcileCompletedGoalRewards(USER);

    expect(report).toMatchObject({ scanned: 4, recovered: 3, failed: 1 });
    expect(report.errors).toHaveLength(1);
    expect(xp.history.map((h) => h.sourceId)).not.toContain(goalCompletionSourceId("gC"));
  });

  it("retries a previously failed goal safely on the next run", async () => {
    const g = goal({ id: "gC" });
    const failing = makeSetup({ goals: [g], failFor: ["gC"] });
    await failing.recovery.reconcileCompletedGoalRewards(USER);
    expect(failing.xp.history).toHaveLength(0);

    const healthy = makeSetup({ goals: [g] });
    const report = await healthy.recovery.reconcileCompletedGoalRewards(USER);
    expect(report.recovered).toBe(1);
    expect(healthy.xp.total()).toBe(GOAL_COMPLETION_XP.medium);
  });

  it("ignores non-completed and pre-activation goals while recovering eligible ones", async () => {
    const goals = [
      goal({ id: "active", status: "active", completedAt: null }),
      goal({ id: "paused", status: "paused", completedAt: null }),
      goal({ id: "cancelled", status: "cancelled", completedAt: null }),
      goal({ id: "expired", status: "expired", completedAt: null }),
      goal({ id: "historical", completedAt: BEFORE }),
      goal({ id: "eligible", completedAt: AFTER }),
    ];
    const { recovery, xp } = makeSetup({ goals });
    const report = await recovery.reconcileCompletedGoalRewards(USER);

    // Non-completed goals never even reach the scan (bounded completed query).
    expect(report.scanned).toBe(2);
    expect(report.skipped).toBe(1);
    expect(report.recovered).toBe(1);
    expect(xp.history.map((h) => h.sourceId)).toEqual([goalCompletionSourceId("eligible")]);
  });

  it("never mutates goal lifecycle state or completed_at", async () => {
    const original = goal();
    const snapshot = JSON.stringify(original);
    const { recovery, store } = makeSetup({ goals: [original] });
    await recovery.reconcileCompletedGoalRewards(USER);

    expect(store[0]?.status).toBe("completed");
    expect(store[0]?.completedAt).toBe(AFTER);
    expect(JSON.stringify(store[0])).toBe(snapshot);
  });

  it("still awards XP when the authoritative count is unavailable", async () => {
    const xp = makeXPEngine();
    const progression = makeProgressionEngine();
    const achievements = makeAchievementEngine();
    const orchestrator = createGamificationOrchestrator({
      xp: xp.engine,
      progression: progression.engine,
      achievements: achievements.engine,
    });
    const recovery = createGoalRewardRecovery({
      listCompletedGoals: async () => [goal()],
      countCompletedGoals: async () => {
        throw new Error("offline");
      },
      hasProcessedSource: (sourceId) => xp.hasProcessedSource(sourceId),
      processGoalCompleted: (opts) => orchestrator.processGoalCompleted(opts),
      log: () => undefined,
    });

    const report = await recovery.reconcileCompletedGoalRewards(USER);
    expect(report.recovered).toBe(1);
    expect(xp.total()).toBe(GOAL_COMPLETION_XP.medium);
  });

  it("reports a listing failure without throwing", async () => {
    const recovery = createGoalRewardRecovery({
      listCompletedGoals: async () => {
        throw new Error("network down");
      },
      countCompletedGoals: async () => 0,
      hasProcessedSource: async () => false,
      processGoalCompleted: async () => undefined,
      log: () => undefined,
    });
    const report = await recovery.reconcileCompletedGoalRewards(USER);
    expect(report).toMatchObject({ scanned: 0, recovered: 0, failed: 1 });
  });
});

describe("reconcileGoalReward (single goal diagnostics)", () => {
  it("recovers once and then reports already_processed", async () => {
    const g = goal();
    const { recovery } = makeSetup({ goals: [g] });
    expect((await recovery.reconcileGoalReward(g, USER)).status).toBe("recovered");
    expect((await recovery.reconcileGoalReward(g, USER)).status).toBe("already_processed");
  });

  it("skips an active goal", async () => {
    const g = goal({ status: "active", completedAt: null });
    const { recovery } = makeSetup({ goals: [g] });
    expect(await recovery.reconcileGoalReward(g, USER)).toMatchObject({
      status: "skipped",
      reason: "not_completed",
    });
  });
});
