import { describe, expect, it, vi } from "vitest";
import { createGamificationOrchestrator } from "./GamificationOrchestrator";
import { buildMessages, toAchievementEvents, toXPEvents } from "./gamificationResults";
import type {
  AchievementEnginePort,
  GamificationEngines,
  ProgressionEnginePort,
  XPEnginePort,
} from "./gamificationTypes";
import type { AchievementUnlockResult } from "@/services/achievements";
import type { LevelUpResult, PlayerProfileStats } from "@/services/progression";
import type { XPAwardResult } from "@/services/xp";

const USER = "user-1";

function award(amount: number, currentXP: number, lifetimeXP: number): XPAwardResult {
  return {
    awarded: amount > 0,
    amount,
    entry: null,
    stats: { userId: USER, currentXP, lifetimeXP, level: 1, lastActivityAt: null },
  };
}

function levelResult(old: number, next: number, xpEarned: number): LevelUpResult {
  return {
    leveledUp: next > old,
    oldLevel: old,
    newLevel: next,
    levelsGained: Math.max(0, next - old),
    xpEarned,
    currentXP: 300,
    lifetimeXP: 300,
    xpRemaining: 300,
    progressPercentage: 14,
    isMaxLevel: false,
    unlockedRewards: [],
    progression: {
      userId: USER,
      currentLevel: next,
      currentXP: 300,
      lifetimeXP: 300,
      xpToNextLevel: 350,
      progressPercentage: 14,
      highestLevel: next,
      prestige: 0,
      lastLevelUpAt: null,
    },
  };
}

function unlock(id: string): AchievementUnlockResult {
  return {
    achievement: {
      id,
      category: "workouts",
      titleKey: `ach.${id}`,
      descriptionKey: `ach.${id}.desc`,
      icon: "trophy",
      metric: "workouts_completed",
      progressType: "cumulative",
      target: 1,
      xpReward: 100,
      rarity: "common",
      hidden: false,
    },
    xpEarned: 100,
    titleKey: `ach.${id}`,
    descriptionKey: `ach.${id}.desc`,
    icon: "trophy",
    rarity: "common",
    unlockedAt: "2026-01-01T00:00:00Z",
  };
}

const stats: PlayerProfileStats = {
  userId: USER,
  currentLevel: 2,
  currentXP: 300,
  lifetimeXP: 300,
  highestLevel: 2,
  prestige: 0,
  xpRemaining: 300,
  progressPercentage: 14,
  currentStreak: 4,
  programsCompleted: 0,
  achievementsUnlocked: 1,
};

function makeEngines(overrides: Partial<GamificationEngines> = {}): GamificationEngines {
  const xp: XPEnginePort = { awardXP: vi.fn(async () => award(50, 300, 300)) };
  const progression: ProgressionEnginePort = {
    processXPUpdate: vi.fn(async () => levelResult(1, 2, 50)),
    getPlayerStats: vi.fn(async () => stats),
  };
  const achievements: AchievementEnginePort = { processEvent: vi.fn(async () => []) };
  return {
    xp,
    progression,
    achievements,
    training: {
      getWeeklyProgress: async () => ({
        weekNumber: 1,
        objective: "base",
        isDeload: false,
        totalWorkouts: 4,
        completedWorkouts: 2,
        remainingWorkouts: 2,
        recoveryDays: 3,
        percentage: 50,
      }),
    },
    ...overrides,
  };
}

describe("event mapping", () => {
  it("maps workout completion to XP and achievement events", () => {
    const event = { type: "workout_completed", sourceId: "w1", userId: USER } as const;
    expect(toXPEvents(event).map((e) => e.type)).toEqual(["workout_completed"]);
    expect(toAchievementEvents(event).map((e) => e.type)).toEqual(["WorkoutCompleted"]);
  });

  it("adds the first workout bonus only on the first workout", () => {
    const events = toXPEvents({
      type: "workout_completed",
      sourceId: "w1",
      userId: USER,
      isFirstWorkout: true,
    });
    expect(events.map((e) => e.type)).toEqual(["first_workout", "workout_completed"]);
  });

  it("maps program completion", () => {
    expect(toXPEvents({ type: "program_completed", sourceId: "p1" })[0]!.type).toBe(
      "program_completed",
    );
    expect(toAchievementEvents({ type: "program_completed", sourceId: "p1" })[0]!.type).toBe(
      "TrainingProgramCompleted",
    );
  });
});

describe("orchestrator pipeline", () => {
  it("consolidates workout completion", async () => {
    const engines = makeEngines();
    const orchestrator = createGamificationOrchestrator(engines);
    const result = await orchestrator.processWorkoutCompleted({
      plannedWorkoutId: "w1",
      userId: USER,
    });

    expect(result.xpEarned).toBe(50);
    expect(result.oldLevel).toBe(1);
    expect(result.newLevel).toBe(2);
    expect(result.leveledUp).toBe(true);
    expect(result.currentStreak).toBe(4);
    expect(result.weeklyProgress?.completedWorkouts).toBe(2);
    expect(result.nextGoal?.key).toBe("goal.week");
    expect(result.partial).toBe(false);
  });

  it("collects multiple achievements without duplicates", async () => {
    const engines = makeEngines({
      achievements: { processEvent: vi.fn(async () => [unlock("a1"), unlock("a2"), unlock("a1")]) },
    });
    const result = await createGamificationOrchestrator(engines).processWorkoutCompleted({
      plannedWorkoutId: "w1",
      userId: USER,
    });
    expect(result.newAchievements.map((a) => a.achievement.id)).toEqual(["a1", "a2"]);
  });

  it("reports multiple level-ups", async () => {
    const engines = makeEngines();
    engines.progression.processXPUpdate = vi.fn(async () => levelResult(1, 4, 1000));
    const result = await createGamificationOrchestrator(engines).processProgramCompleted({
      planId: "p1",
      userId: USER,
    });
    expect(result.levelsGained).toBe(3);
    expect(result.messages.some((m) => m.key === "gamification.multiLevelUp")).toBe(true);
    expect(result.messages.some((m) => m.key === "gamification.programCompleted")).toBe(true);
  });

  it("awards no XP when the XP engine reports a duplicate (idempotency)", async () => {
    const engines = makeEngines({ xp: { awardXP: vi.fn(async () => award(0, 300, 300)) } });
    const orchestrator = createGamificationOrchestrator(engines);
    const first = await orchestrator.processWorkoutCompleted({
      plannedWorkoutId: "w1",
      userId: USER,
    });
    const second = await orchestrator.processWorkoutCompleted({
      plannedWorkoutId: "w1",
      userId: USER,
    });
    expect(first.xpEarned).toBe(0);
    expect(second.xpEarned).toBe(0);
    expect(second.messages.some((m) => m.kind === "xp")).toBe(false);
  });

  it("continues after a partial engine failure", async () => {
    const engines = makeEngines({
      achievements: {
        processEvent: vi.fn(async () => {
          throw new Error("achievements down");
        }),
      },
    });
    const result = await createGamificationOrchestrator(engines).processWorkoutCompleted({
      plannedWorkoutId: "w1",
      userId: USER,
    });
    expect(result.partial).toBe(true);
    expect(result.errors[0]!.stage).toBe("achievements");
    expect(result.xpEarned).toBe(50);
    expect(result.newLevel).toBe(2);
  });

  it("still returns XP when the progression engine fails", async () => {
    const engines = makeEngines();
    engines.progression.processXPUpdate = vi.fn(async () => {
      throw new Error("progression down");
    });
    const result = await createGamificationOrchestrator(engines).processWorkoutCompleted({
      plannedWorkoutId: "w1",
      userId: USER,
    });
    expect(result.xpEarned).toBe(50);
    expect(result.errors.map((e) => e.stage)).toContain("progression");
  });

  it("runs future engines registered as plugins", async () => {
    const orchestrator = createGamificationOrchestrator(makeEngines());
    orchestrator.registerEngine({
      name: "goals",
      process: async () => ({ data: { completed: 1 }, messages: [] }),
    });
    const result = await orchestrator.processGoalCompleted({ goalId: "g1", userId: USER });
    expect(orchestrator.registeredEngines()).toContain("goals");
    expect(result.pluginData.goals).toEqual({ completed: 1 });
  });

  it("coordinates assessment completion", async () => {
    const engines = makeEngines();
    const result = await createGamificationOrchestrator(engines).processAssessmentCompleted({
      userId: USER,
      assessmentId: "a1",
    });
    expect(engines.xp.awardXP).toHaveBeenCalledWith(
      expect.objectContaining({ type: "assessment_completed", sourceId: "a1" }),
    );
    expect(result.eventType).toBe("assessment_completed");
  });

  it("coordinates week completion", async () => {
    const engines = makeEngines();
    const result = await createGamificationOrchestrator(engines).processWeekCompleted({
      planId: "p1",
      weekNumber: 2,
      userId: USER,
    });
    expect(engines.achievements.processEvent).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({ type: "TrainingWeekCompleted", sourceId: "p1:2" }),
    );
    expect(result.messages.some((m) => m.key === "gamification.weekCompleted")).toBe(true);
  });
});

describe("messages", () => {
  it("derives messages from the consolidated result only", () => {
    const messages = buildMessages({
      eventType: "workout_completed",
      userId: USER,
      sourceId: "w1",
      xpEarned: 50,
      currentXP: 300,
      lifetimeXP: 300,
      oldLevel: 1,
      newLevel: 2,
      leveledUp: true,
      levelsGained: 1,
      isMaxLevel: false,
      nextLevelXP: 350,
      xpToNextLevel: 300,
      progressPercentage: 14,
      newAchievements: [unlock("a1")],
      currentStreak: 3,
      weeklyProgress: null,
      nextGoal: null,
      messages: [],
      pluginData: {},
      partial: false,
      errors: [],
    });
    expect(messages.map((m) => m.kind)).toEqual(["xp", "level_up", "achievement", "streak"]);
  });
});
