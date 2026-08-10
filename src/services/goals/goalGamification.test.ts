// Sprint 7.3 — Goals × Gamification integration tests.
// Pure/fake-driven: no Supabase, no React. Verifies that Goals only reports
// "completed" and that every reward consequence comes from the existing
// Gamification pipeline, idempotently.

import { describe, expect, it, vi } from "vitest";
import { createGamificationOrchestrator } from "@/services/gamification/GamificationOrchestrator";
import { toAchievementEvents, toXPEvents } from "@/services/gamification/gamificationResults";
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
import { GOAL_COMPLETION_XP, goalCompletionSourceId, goalCompletionXP } from "@/services/xp/xpRules";
import { createGoalGamificationBridge, isRewardableCompletion } from "./goalGamification";
import type { GoalCompletedEvent } from "./goalEvents";
import type { Goal, GoalDifficulty, GoalStatus } from "./goalTypes";

const USER = "user-1";

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
    startDate: "2026-01-01",
    targetDate: null,
    completedAt: "2026-02-01T10:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-02-01T10:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

function completedEvent(overrides: Partial<Goal> = {}): GoalCompletedEvent {
  const g = goal(overrides);
  return {
    type: "goal_completed",
    userId: g.userId,
    goalId: g.id,
    goal: g,
    occurredAt: g.completedAt ?? "2026-02-01T10:00:00.000Z",
    completedAt: g.completedAt ?? "2026-02-01T10:00:00.000Z",
    sourceId: g.id,
  };
}

/* ---------------- Fake engines (persistent-ish, idempotent) ---------------- */

const stats: PlayerProfileStats = {
  userId: USER,
  currentLevel: 8,
  currentXP: 950,
  lifetimeXP: 950,
  highestLevel: 8,
  prestige: 0,
  xpRemaining: 100,
  progressPercentage: 90,
  currentStreak: 3,
  programsCompleted: 0,
  achievementsUnlocked: 0,
};

/** XP engine fake reproducing the real (user, type, sourceId) idempotency. */
function makeXPEngine() {
  const awardedKeys = new Set<string>();
  let currentXP = 0;
  let lifetimeXP = 0;
  const calls: { type: string; sourceId: string | null; amount?: number }[] = [];

  const engine: XPEnginePort = {
    async awardXP(event): Promise<XPAwardResult> {
      calls.push({ type: event.type, sourceId: event.sourceId ?? null, amount: event.amount });
      const key = `${event.type}:${event.sourceId ?? ""}`;
      const amount = event.amount ?? 0;
      if (event.sourceId && awardedKeys.has(key)) {
        return {
          awarded: false,
          amount: 0,
          entry: null,
          stats: { userId: USER, currentXP, lifetimeXP, level: 1, lastActivityAt: null },
        };
      }
      if (event.sourceId) awardedKeys.add(key);
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
  return { engine, calls, total: () => lifetimeXP };
}

/** Progression fake: 250 XP per level, supports multiple level-ups. */
function makeProgressionEngine(startLifetime = 950) {
  let lifetime = startLifetime;
  const history: number[] = [];
  const levelFor = (xp: number) => Math.floor(xp / 250) + 1;

  const engine: ProgressionEnginePort = {
    async processXPUpdate(options): Promise<LevelUpResult> {
      const oldLevel = levelFor(lifetime);
      lifetime += options?.xpEarned ?? 0;
      const newLevel = levelFor(lifetime);
      if (newLevel > oldLevel) history.push(newLevel);
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
  return { engine, history };
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
    unlockedAt: "2026-02-01T10:00:00.000Z",
  };
}

/** Achievement fake: unique unlock per achievement id, metric accumulates. */
function makeAchievementEngine() {
  const unlocked = new Set<string>();
  let goalsCompleted = 0;
  const engine: AchievementEnginePort = {
    async processEvent(_userId, event) {
      const updates = deriveMetricUpdates(event);
      for (const update of updates) {
        if (update.metric !== "goals_completed") continue;
        goalsCompleted =
          update.mode === "absolute" ? update.value : goalsCompleted + update.value;
      }
      const results: AchievementUnlockResult[] = [];
      for (const [id, target] of [
        ["goal_first", 1],
        ["goal_5", 5],
        ["goal_10", 10],
      ] as const) {
        if (goalsCompleted >= target && !unlocked.has(id)) {
          unlocked.add(id);
          results.push(unlock(id));
        }
      }
      return results;
    },
  };
  return { engine, unlocked, metric: () => goalsCompleted };
}

function makeSetup(startLifetime = 950) {
  const xp = makeXPEngine();
  const progression = makeProgressionEngine(startLifetime);
  const achievements = makeAchievementEngine();
  const engines: GamificationEngines = {
    xp: xp.engine,
    progression: progression.engine,
    achievements: achievements.engine,
  };
  const orchestrator = createGamificationOrchestrator(engines);
  const bridge = createGoalGamificationBridge({
    countCompletedGoals: async () => achievements.metric() + 1,
    processGoalCompleted: (options) => orchestrator.processGoalCompleted(options),
  });
  return { xp, progression, achievements, orchestrator, bridge };
}

/* ---------------- 1-4: difficulty balancing ---------------- */

describe("goal completion XP balancing (XP domain owns the numbers)", () => {
  const cases: [GoalDifficulty, number][] = [
    ["easy", 50],
    ["medium", 100],
    ["hard", 200],
    ["epic", 400],
  ];

  it.each(cases)("%s goal awards %i XP", async (difficulty, expected) => {
    expect(goalCompletionXP(difficulty)).toBe(expected);
    expect(GOAL_COMPLETION_XP[difficulty]).toBe(expected);

    const { xp, bridge } = makeSetup();
    await bridge.handleGoalCompleted(completedEvent({ difficulty }));
    expect(xp.total()).toBe(expected);
  });

  it("falls back to the medium tier for unknown difficulty", () => {
    expect(goalCompletionXP(undefined)).toBe(GOAL_COMPLETION_XP.medium);
    expect(goalCompletionXP("legendary")).toBe(GOAL_COMPLETION_XP.medium);
  });

  it("prices the XP event from difficulty, not from the orchestrator", () => {
    const events = toXPEvents({
      type: "goal_completed",
      sourceId: goalCompletionSourceId("g1"),
      metadata: { goalDifficulty: "epic" },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("goal_completed");
    expect(events[0]!.amount).toBe(400);
  });
});

/* ---------------- 5-8: only legitimate completion rewards ---------------- */

describe("only a legitimate completion rewards", () => {
  it("goal creation awards no XP", async () => {
    const { xp, bridge } = makeSetup();
    // A created goal is not completed: the bridge refuses it.
    await bridge.handleGoalCompleted(completedEvent({ status: "active", currentValue: 0 }));
    expect(xp.total()).toBe(0);
  });

  it("progress updates award no XP", async () => {
    const { xp, bridge } = makeSetup();
    await bridge.handleGoalCompleted(completedEvent({ status: "active", currentValue: 9 }));
    expect(xp.calls).toHaveLength(0);
    expect(xp.total()).toBe(0);
  });

  it.each(["cancelled", "expired", "paused", "draft"] as GoalStatus[])(
    "%s goals award no XP",
    async (status) => {
      const { xp, bridge } = makeSetup();
      expect(isRewardableCompletion({ status })).toBe(false);
      await bridge.handleGoalCompleted(completedEvent({ status }));
      expect(xp.total()).toBe(0);
    },
  );
});

/* ---------------- 9-10, 18-20: idempotency & retry ---------------- */

describe("idempotency and retry safety", () => {
  it("duplicate completion events award XP once", async () => {
    const { xp, bridge } = makeSetup();
    await bridge.handleGoalCompleted(completedEvent());
    await bridge.handleGoalCompleted(completedEvent());
    expect(xp.total()).toBe(100);
  });

  it("network retry after a lost response awards XP once", async () => {
    const { xp, orchestrator } = makeSetup();
    const options = { goalId: "g1", difficulty: "hard", userId: USER };
    const first = await orchestrator.processGoalCompleted(options);
    const retry = await orchestrator.processGoalCompleted(options);
    expect(first.xpEarned).toBe(200);
    expect(retry.xpEarned).toBe(0);
    expect(xp.total()).toBe(200);
  });

  it("uses a deterministic source reference that survives restart", async () => {
    const { xp, bridge } = makeSetup();
    await bridge.handleGoalCompleted(completedEvent());
    expect(xp.calls[0]!.sourceId).toBe("goal_completed:g1");
    expect(goalCompletionSourceId("g1")).toBe("goal_completed:g1");
  });

  it("duplicate completion does not duplicate the achievement unlock", async () => {
    const { achievements, bridge } = makeSetup();
    const first = await bridge.handleGoalCompleted(completedEvent());
    void first;
    const before = achievements.unlocked.size;
    await bridge.handleGoalCompleted(completedEvent());
    expect(achievements.unlocked.size).toBe(before);
  });

  it("duplicate completion does not duplicate level history", async () => {
    const { progression, bridge } = makeSetup(900);
    await bridge.handleGoalCompleted(completedEvent({ difficulty: "hard" }));
    await bridge.handleGoalCompleted(completedEvent({ difficulty: "hard" }));
    expect(progression.history).toHaveLength(1);
  });

  it("authoritative count keeps the goal metric stable across replays", () => {
    const absolute = deriveMetricUpdates({ type: "GoalCompleted", payload: { goalsCompleted: 3 } });
    expect(absolute[0]).toEqual({ metric: "goals_completed", value: 3, mode: "absolute" });
    const fallback = deriveMetricUpdates({ type: "GoalCompleted" });
    expect(fallback[0]).toEqual({ metric: "goals_completed", value: 1, mode: "increment" });
  });
});

/* ---------------- 11-12: one pipeline ---------------- */

describe("manual and automatic completion share one pipeline", () => {
  it("manual completion enters the orchestrator", async () => {
    const { xp, bridge } = makeSetup();
    await bridge.handleGoalCompleted(completedEvent({ id: "manual-1", difficulty: "easy" }));
    expect(xp.calls[0]).toMatchObject({
      type: "goal_completed",
      sourceId: "goal_completed:manual-1",
      amount: 50,
    });
  });

  it("automatically tracked completion enters the same orchestrator path", async () => {
    const { xp, bridge } = makeSetup();
    // Same event shape: tracking only causes GoalService to emit it.
    await bridge.handleGoalCompleted(
      completedEvent({ id: "auto-1", difficulty: "easy", metadata: { source: "tracking" } }),
    );
    expect(xp.calls[0]).toMatchObject({
      type: "goal_completed",
      sourceId: "goal_completed:auto-1",
      amount: 50,
    });
  });
});

/* ---------------- 13-16: progression & achievements ---------------- */

describe("progression and achievements consequences", () => {
  it("goal completion can trigger a level up", async () => {
    const { orchestrator } = makeSetup(950);
    const result = await orchestrator.processGoalCompleted({ goalId: "g1", difficulty: "medium" });
    expect(result.leveledUp).toBe(true);
    expect(result.levelsGained).toBe(1);
    expect(result.newLevel).toBe(result.oldLevel + 1);
  });

  it("an epic goal can trigger multiple level ups", async () => {
    const { orchestrator } = makeSetup(0);
    const result = await orchestrator.processGoalCompleted({ goalId: "g1", difficulty: "epic" });
    expect(result.levelsGained).toBeGreaterThan(1);
    expect(result.messages.some((m) => m.key === "gamification.multiLevelUp")).toBe(true);
  });

  it("unlocks the first goal achievement", async () => {
    const { orchestrator } = makeSetup();
    const result = await orchestrator.processGoalCompleted({
      goalId: "g1",
      difficulty: "easy",
      goalsCompleted: 1,
    });
    expect(result.newAchievements.map((a) => a.achievement.id)).toEqual(["goal_first"]);
  });

  it("multiple completions advance goal achievements", async () => {
    const { orchestrator, achievements } = makeSetup();
    for (let i = 1; i <= 5; i += 1) {
      await orchestrator.processGoalCompleted({
        goalId: `g${i}`,
        difficulty: "easy",
        goalsCompleted: i,
      });
    }
    expect(achievements.metric()).toBe(5);
    expect(Array.from(achievements.unlocked)).toEqual(["goal_first", "goal_5"]);
  });

  it("maps goal completion to the existing GoalCompleted achievement event", () => {
    const events = toAchievementEvents({ type: "goal_completed", sourceId: "goal_completed:g1" });
    expect(events.map((e) => e.type)).toEqual(["GoalCompleted"]);
  });
});

/* ---------------- 17-18: failure isolation ---------------- */

describe("failure isolation", () => {
  it("a gamification failure never propagates to goal completion", async () => {
    const bridge = createGoalGamificationBridge({
      countCompletedGoals: async () => 1,
      processGoalCompleted: async () => {
        throw new Error("orchestrator down");
      },
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(bridge.handleGoalCompleted(completedEvent())).resolves.toBeUndefined();
    spy.mockRestore();
  });

  it("still rewards when the authoritative count is unavailable", async () => {
    const { xp, orchestrator } = makeSetup();
    const bridge = createGoalGamificationBridge({
      countCompletedGoals: async () => {
        throw new Error("count down");
      },
      processGoalCompleted: (options) => orchestrator.processGoalCompleted(options),
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await bridge.handleGoalCompleted(completedEvent({ difficulty: "hard" }));
    spy.mockRestore();
    expect(xp.total()).toBe(200);
  });

  it("retry after a partial failure remains safe", async () => {
    const { xp, orchestrator } = makeSetup();
    let fail = true;
    const bridge = createGoalGamificationBridge({
      countCompletedGoals: async () => 1,
      processGoalCompleted: async (options) => {
        if (fail) {
          fail = false;
          throw new Error("network");
        }
        return orchestrator.processGoalCompleted(options);
      },
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await bridge.handleGoalCompleted(completedEvent());
    await bridge.handleGoalCompleted(completedEvent());
    await bridge.handleGoalCompleted(completedEvent());
    spy.mockRestore();
    expect(xp.total()).toBe(100);
  });
});

/* ---------------- 21-24: no regression on existing domains ---------------- */

describe("existing behaviour is unchanged", () => {
  it("non-goal XP events keep their mapping and amounts", () => {
    const workout = toXPEvents({ type: "workout_completed", sourceId: "w1" });
    expect(workout[0]).toMatchObject({ type: "workout_completed", amount: undefined });
    const week = toXPEvents({ type: "week_completed", sourceId: "p1:1" });
    expect(week[0]).toMatchObject({ type: "week_completed", amount: undefined });
  });

  it("workout gamification still runs the full pipeline", async () => {
    const { orchestrator, xp } = makeSetup();
    const result = await orchestrator.processWorkoutCompleted({ plannedWorkoutId: "w1" });
    expect(result.eventType).toBe("workout_completed");
    expect(xp.calls[0]!.type).toBe("workout_completed");
  });

  it("non-goal achievement events are untouched", () => {
    expect(deriveMetricUpdates({ type: "WorkoutCompleted" })[0]).toEqual({
      metric: "workouts_completed",
      value: 1,
      mode: "increment",
    });
  });

  it("progression keeps owning the level math", async () => {
    const { orchestrator, progression } = makeSetup(0);
    const spy = vi.spyOn(progression.engine, "processXPUpdate");
    await orchestrator.processGoalCompleted({ goalId: "g1", difficulty: "medium" });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ xpEarned: 100 }));
  });
});
