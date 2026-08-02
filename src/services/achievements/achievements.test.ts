import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_CATALOG,
  achievementsForMetric,
  applyUpdate,
  buildProgress,
  clampPercentage,
  deriveMetricUpdates,
  getAchievement,
  isConditionMet,
  isVisible,
  shouldUnlock,
} from "@/services/achievements";
import type { AchievementDefinition } from "@/services/achievements";

const workouts5 = getAchievement("workouts_5") as AchievementDefinition;
const streak7 = getAchievement("streak_7") as AchievementDefinition;
const pullupsSession = getAchievement("pullups_10_session") as AchievementDefinition;
const hidden = getAchievement("skill_planche") as AchievementDefinition;

describe("catalog", () => {
  it("has unique ids", () => {
    const ids = ACHIEVEMENT_CATALOG.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("progress calculation", () => {
  it("increments cumulative metrics", () => {
    expect(applyUpdate(4, { metric: "workouts_completed", value: 1, mode: "increment" })).toBe(5);
  });

  it("keeps the best value for session metrics", () => {
    expect(applyUpdate(12, { metric: "pullups_session", value: 8, mode: "max" })).toBe(12);
  });

  it("overwrites absolute metrics like streaks", () => {
    expect(applyUpdate(9, { metric: "streak_days", value: 2, mode: "absolute" })).toBe(2);
  });

  it("clamps percentage between 0 and 100", () => {
    expect(clampPercentage(3, 5)).toBe(60);
    expect(clampPercentage(50, 5)).toBe(100);
    expect(clampPercentage(-2, 5)).toBe(0);
  });

  it("builds a progress snapshot", () => {
    const p = buildProgress(workouts5, 2, null);
    expect(p).toMatchObject({ currentValue: 2, targetValue: 5, percentage: 40, unlocked: false });
  });
});

describe("threshold detection", () => {
  it("detects completion at or above target", () => {
    expect(isConditionMet(workouts5, 4)).toBe(false);
    expect(isConditionMet(workouts5, 5)).toBe(true);
    expect(isConditionMet(workouts5, 9)).toBe(true);
  });

  it("unlocks streak achievements once the streak reaches the target", () => {
    expect(shouldUnlock(streak7, 6, false)).toBe(false);
    expect(shouldUnlock(streak7, 7, false)).toBe(true);
  });

  it("never re-locks nor re-unlocks an already unlocked achievement", () => {
    expect(shouldUnlock(streak7, 30, true)).toBe(false);
    expect(shouldUnlock(streak7, 1, true)).toBe(false);
  });
});

describe("event mapping", () => {
  it("maps workout completion to the cumulative workout metric", () => {
    expect(deriveMetricUpdates({ type: "WorkoutCompleted" })).toEqual([
      { metric: "workouts_completed", value: 1, mode: "increment" },
    ]);
  });

  it("maps pull-up reps to both total and single-session metrics", () => {
    const updates = deriveMetricUpdates({
      type: "ExerciseCompleted",
      payload: { pullups: 11 },
    });
    expect(updates).toEqual([
      { metric: "pullups_total", value: 11, mode: "increment" },
      { metric: "pullups_session", value: 11, mode: "max" },
    ]);
    expect(shouldUnlock(pullupsSession, 11, false)).toBe(true);
  });

  it("maps skills to their boolean metric", () => {
    expect(
      deriveMetricUpdates({ type: "SkillMarkedAchieved", payload: { skill: "muscle_up" } }),
    ).toEqual([{ metric: "skill_muscle_up", value: 1, mode: "absolute" }]);
  });

  it("ignores invalid or missing payload values", () => {
    expect(deriveMetricUpdates({ type: "WorkoutStarted" })).toEqual([]);
    expect(deriveMetricUpdates({ type: "ExerciseCompleted", payload: { pushups: -5 } })).toEqual(
      [],
    );
  });

  it("routes a metric to every achievement listening to it", () => {
    const ids = achievementsForMetric("workouts_completed").map((a) => a.id);
    expect(ids).toContain("workouts_1");
    expect(ids).toContain("workouts_100");
  });
});

describe("hidden achievements", () => {
  it("stays hidden until unlocked", () => {
    expect(isVisible(hidden, false)).toBe(false);
    expect(isVisible(hidden, true)).toBe(true);
    expect(isVisible(workouts5, false)).toBe(true);
  });
});

describe("idempotency of repeated evaluation", () => {
  it("absolute backfill values converge to the same state when re-run", () => {
    const first = applyUpdate(0, { metric: "workouts_completed", value: 12, mode: "absolute" });
    const second = applyUpdate(first, {
      metric: "workouts_completed",
      value: 12,
      mode: "absolute",
    });
    expect(second).toBe(first);
    // Already unlocked => no second unlock => XP awarded only once.
    expect(shouldUnlock(workouts5, second, true)).toBe(false);
  });
});
