import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  GOAL_TRANSITIONS,
  buildGoalProgress,
  calculateGoalProgress,
  foldProgress,
  isGoalCompleted,
  isGoalExpired,
  isUnitAllowed,
  normalizeGoalProgress,
  validateGoalTransition,
} from "./goalRules";
import { validateCreateGoal, validateUpdateGoal } from "./goalValidation";
import { clearGoalListeners, emitGoalEvent, onGoalEvent } from "./goalEvents";
import type { CreateGoalInput, Goal } from "./goalTypes";

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "g1",
    userId: "u1",
    type: "workout_count",
    category: "fitness",
    progressType: "count",
    title: "Completar 20 treinos",
    description: null,
    targetValue: 20,
    currentValue: 0,
    unit: "workouts",
    status: "active",
    difficulty: "medium",
    startDate: "2026-01-01",
    targetDate: null,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

function createInput(overrides: Partial<CreateGoalInput> = {}): CreateGoalInput {
  return {
    type: "workout_count",
    category: "fitness",
    progressType: "count",
    title: "Completar 20 treinos",
    targetValue: 20,
    unit: "workouts",
    ...overrides,
  };
}

describe("goal creation validation", () => {
  it("accepts a valid count goal", () => {
    expect(validateCreateGoal(createInput()).valid).toBe(true);
  });

  it("rejects short titles and non-positive targets", () => {
    expect(validateCreateGoal(createInput({ title: "x" })).valid).toBe(false);
    expect(validateCreateGoal(createInput({ targetValue: 0 })).valid).toBe(false);
  });

  it("rejects invalid units for the progress type", () => {
    const result = validateCreateGoal(
      createInput({ progressType: "duration", unit: "kilograms", type: "duration" }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("kilograms");
  });

  it("rejects repetitions for a body-weight target goal", () => {
    expect(isUnitAllowed("target_value", "kilograms")).toBe(true);
    expect(isUnitAllowed("duration", "repetitions")).toBe(false);
  });

  it("rejects a target date before the start date", () => {
    const result = validateCreateGoal(
      createInput({ startDate: "2026-02-01", targetDate: "2026-01-01" }),
    );
    expect(result.valid).toBe(false);
  });

  it("rejects invalid dates", () => {
    expect(validateCreateGoal(createInput({ targetDate: "31/12/2026" })).valid).toBe(false);
  });

  it("forces boolean goals to target 1", () => {
    expect(
      validateCreateGoal(
        createInput({ progressType: "boolean", unit: "boolean", type: "skill", targetValue: 3 }),
      ).valid,
    ).toBe(false);
  });

  it("blocks edits on finished goals", () => {
    expect(
      validateUpdateGoal(goal({ status: "completed", completedAt: "x" }), { title: "novo" }).valid,
    ).toBe(false);
  });
});

describe("progress calculation", () => {
  it("count goal", () => {
    expect(calculateGoalProgress(10, 20, "count")).toBe(50);
  });

  it("threshold goal keeps the best value", () => {
    expect(foldProgress("threshold", 8, 6)).toBe(8);
    expect(foldProgress("threshold", 8, 11)).toBe(11);
  });

  it("duration goal accumulates", () => {
    expect(foldProgress("duration", 60, 60)).toBe(120);
    expect(isGoalCompleted(120, 120, "duration")).toBe(true);
  });

  it("cumulative training minutes accumulate", () => {
    expect(foldProgress("cumulative", 250, 60)).toBe(310);
    expect(calculateGoalProgress(310, 300, "cumulative")).toBe(100);
  });

  it("streak goal keeps the highest streak", () => {
    expect(foldProgress("streak", 7, 3)).toBe(7);
  });

  it("target-value (body weight) goal", () => {
    expect(foldProgress("target_value", 0, 75, "set")).toBe(75);
    expect(isGoalCompleted(75, 75, "target_value")).toBe(true);
  });

  it("boolean/skill goal", () => {
    expect(normalizeGoalProgress("boolean", 5)).toBe(1);
    expect(calculateGoalProgress(1, 1, "boolean")).toBe(100);
    expect(isGoalCompleted(0, 1, "boolean")).toBe(false);
  });

  it("normalizes overshoot to 100% but keeps the raw value", () => {
    const progress = buildGoalProgress(
      goal({ progressType: "threshold", unit: "repetitions", targetValue: 10, currentValue: 12 }),
    );
    expect(progress.percentage).toBe(100);
    expect(progress.rawValue).toBe(12);
    expect(progress.currentValue).toBe(10);
    expect(progress.remaining).toBe(0);
  });

  it("never produces negative progress", () => {
    expect(normalizeGoalProgress("count", -5)).toBe(0);
    expect(calculateGoalProgress(-5, 10, "count")).toBe(0);
  });
});

describe("lifecycle transitions", () => {
  it("allows the documented transitions", () => {
    expect(validateGoalTransition("draft", "active")).toBe(true);
    expect(validateGoalTransition("active", "paused")).toBe(true);
    expect(validateGoalTransition("paused", "active")).toBe(true);
    expect(validateGoalTransition("active", "completed")).toBe(true);
    expect(validateGoalTransition("active", "cancelled")).toBe(true);
    expect(validateGoalTransition("active", "expired")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(validateGoalTransition("completed", "active")).toBe(false);
    expect(validateGoalTransition("cancelled", "active")).toBe(false);
    expect(validateGoalTransition("draft", "completed")).toBe(false);
    expect(validateGoalTransition("active", "active")).toBe(false);
  });

  it("keeps terminal states terminal", () => {
    expect(GOAL_TRANSITIONS.completed).toHaveLength(0);
    expect(GOAL_TRANSITIONS.expired).toHaveLength(0);
  });
});

describe("expiration", () => {
  it("expires an active goal past its target date", () => {
    expect(
      isGoalExpired(goal({ targetDate: "2026-01-05" }), new Date("2026-01-06T10:00:00Z")),
    ).toBe(true);
  });

  it("does not expire before the target date or without one", () => {
    expect(
      isGoalExpired(goal({ targetDate: "2026-01-05" }), new Date("2026-01-05T10:00:00Z")),
    ).toBe(false);
    expect(isGoalExpired(goal({ targetDate: null }))).toBe(false);
  });

  it("never expires finished goals", () => {
    expect(isGoalExpired(goal({ targetDate: "2020-01-01", status: "completed" }), new Date())).toBe(
      false,
    );
  });
});

describe("goal events", () => {
  beforeEach(() => clearGoalListeners());

  it("delivers typed events to subscribers", async () => {
    const listener = vi.fn();
    onGoalEvent(listener);
    await emitGoalEvent({
      type: "goal_completed",
      userId: "u1",
      goalId: "g1",
      goal: goal({ status: "completed", completedAt: "2026-01-02T00:00:00.000Z" }),
      occurredAt: "2026-01-02T00:00:00.000Z",
      completedAt: "2026-01-02T00:00:00.000Z",
      sourceId: "g1",
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("never throws when a listener fails", async () => {
    onGoalEvent(() => {
      throw new Error("boom");
    });
    await expect(
      emitGoalEvent({
        type: "goal_paused",
        userId: "u1",
        goalId: "g1",
        goal: goal({ status: "paused" }),
        occurredAt: "2026-01-02T00:00:00.000Z",
      }),
    ).resolves.toBeUndefined();
  });
});
