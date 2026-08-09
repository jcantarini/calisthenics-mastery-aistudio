// Automatic Goal Tracking — Sprint 7.2 domain tests.
// Pure rules + service behaviour against in-memory ports (no Supabase).

import { describe, expect, it } from "vitest";
import { createGoalTrackingService } from "./GoalTrackingService";
import { foldProgress, isGoalCompleted } from "./goalRules";
import { directionalObservation, matchGoalToEvent } from "./goalTrackingRules";
import type { Goal, GoalProgressSignal } from "./index";
import type {
  GoalActivityEvent,
  GoalTrackingGoalsPort,
  GoalTrackingLedgerPort,
} from "./goalTrackingTypes";

const USER = "user-1";

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal-1",
    userId: USER,
    type: "workout_count",
    category: "fitness",
    progressType: "count",
    title: "Complete 20 treinos",
    description: null,
    targetValue: 20,
    currentValue: 0,
    unit: "workouts",
    status: "active",
    startDate: "2026-01-01",
    targetDate: null,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

const workoutEvent = (id: string, extra: Partial<Record<string, unknown>> = {}): GoalActivityEvent =>
  ({
    type: "workout_completed",
    workoutId: id,
    occurredAt: "2026-01-05T10:00:00.000Z",
    userId: USER,
    ...extra,
  }) as GoalActivityEvent;

/* ---------------- In-memory ports ---------------- */

function makeHarness(goals: Goal[]) {
  const store = new Map(goals.map((g) => [g.id, { ...g }]));
  const ledgerRows = new Set<string>();
  const key = (goalId: string, eventId: string, eventType: string) =>
    `${goalId}|${eventId}|${eventType}`;

  const goalsPort: GoalTrackingGoalsPort = {
    async getActiveGoals() {
      return Array.from(store.values()).filter((g) => g.status === "active");
    },
    async getGoal(goalId) {
      return store.get(goalId) ?? null;
    },
    async updateGoalProgress(goalId: string, signal: GoalProgressSignal) {
      const goal = store.get(goalId);
      if (!goal) throw new Error("not found");
      if (goal.status === "completed") return goal;
      const next = foldProgress(goal.progressType, goal.currentValue, signal.value, signal.mode);
      const updated: Goal = { ...goal, currentValue: next };
      if (isGoalCompleted(next, goal.targetValue, goal.progressType)) {
        updated.status = "completed";
        updated.completedAt = new Date().toISOString();
      }
      store.set(goalId, updated);
      return updated;
    },
  };

  const ledger: GoalTrackingLedgerPort = {
    async claim(entry) {
      const k = key(entry.goalId, entry.sourceEventId, entry.sourceEventType);
      if (ledgerRows.has(k)) return false;
      ledgerRows.add(k);
      return true;
    },
    async release(goalId, eventId, eventType) {
      ledgerRows.delete(key(goalId, eventId, eventType));
    },
    async settle() {},
  };

  const service = createGoalTrackingService({
    goals: goalsPort,
    ledger,
    resolveUserId: async (userId?: string) => userId ?? USER,
  });

  return { service, store, ledgerRows, goalsPort, ledger };
}

/* ---------------- Workout count ---------------- */

describe("workout count goals", () => {
  it("increments once per completed workout", async () => {
    const { service, store } = makeHarness([makeGoal({ currentValue: 3 })]);
    await service.track(workoutEvent("w1"));
    expect(store.get("goal-1")?.currentValue).toBe(4);
  });

  it("ignores a duplicated workout_completed event", async () => {
    const { service, store } = makeHarness([makeGoal({ currentValue: 3 })]);
    await service.track(workoutEvent("w1"));
    const second = await service.track(workoutEvent("w1"));
    expect(store.get("goal-1")?.currentValue).toBe(4);
    expect(second.ignoredGoals[0]?.reason).toBe("already_processed");
  });

  it("counts distinct workouts separately", async () => {
    const { service, store } = makeHarness([makeGoal()]);
    await service.track(workoutEvent("w1"));
    await service.track(workoutEvent("w2"));
    expect(store.get("goal-1")?.currentValue).toBe(2);
  });

  it("completes exactly once when the target is reached", async () => {
    const { service, store } = makeHarness([makeGoal({ targetValue: 2, currentValue: 1 })]);
    const result = await service.track(workoutEvent("w1"));
    expect(result.completedGoals).toHaveLength(1);
    expect(store.get("goal-1")?.status).toBe("completed");

    const again = await service.track(workoutEvent("w2"));
    expect(again.completedGoals).toHaveLength(0);
    expect(store.get("goal-1")?.currentValue).toBe(2);
  });
});

/* ---------------- Frequency + windows ---------------- */

describe("time windows", () => {
  const frequency = makeGoal({
    type: "workout_frequency",
    startDate: "2026-01-05",
    targetDate: "2026-01-11",
    targetValue: 4,
  });

  it("counts a workout inside the weekly window", async () => {
    const { service, store } = makeHarness([frequency]);
    await service.track(workoutEvent("w1", { occurredAt: "2026-01-07T08:00:00.000Z" }));
    expect(store.get("goal-1")?.currentValue).toBe(1);
  });

  it("ignores a workout before the start date", async () => {
    const { service, store } = makeHarness([frequency]);
    const result = await service.track(
      workoutEvent("w1", { occurredAt: "2026-01-04T23:00:00.000Z" }),
    );
    expect(result.ignoredGoals[0]?.reason).toBe("out_of_window");
    expect(store.get("goal-1")?.currentValue).toBe(0);
  });

  it("ignores a workout after the target date", async () => {
    const { service, store } = makeHarness([frequency]);
    const result = await service.track(
      workoutEvent("w1", { occurredAt: "2026-01-12T08:00:00.000Z" }),
    );
    expect(result.ignoredGoals[0]?.reason).toBe("out_of_window");
    expect(store.get("goal-1")?.currentValue).toBe(0);
  });

  it("defaults an open-ended frequency goal to a 7-day window", () => {
    const goal = makeGoal({ type: "workout_frequency", startDate: "2026-01-05", targetDate: null });
    expect(matchGoalToEvent(goal, workoutEvent("w", { occurredAt: "2026-01-11T00:00:00Z" }))).not.toBe(
      "out_of_window",
    );
    expect(matchGoalToEvent(goal, workoutEvent("w", { occurredAt: "2026-01-12T00:00:00Z" }))).toBe(
      "out_of_window",
    );
  });
});

/* ---------------- Lifecycle guards ---------------- */

describe("only active goals are tracked", () => {
  for (const status of ["paused", "draft", "completed", "cancelled", "expired"] as const) {
    it(`ignores a ${status} goal`, async () => {
      const { service, store } = makeHarness([makeGoal({ status })]);
      const result = await service.track(workoutEvent("w1"));
      if (status === "active") return;
      expect(store.get("goal-1")?.currentValue).toBe(0);
      expect(result.updatedGoals).toHaveLength(0);
    });
  }
});

/* ---------------- Strength ---------------- */

const exerciseEvent = (over: Partial<Record<string, unknown>> = {}): GoalActivityEvent =>
  ({
    type: "exercise_completed",
    exerciseId: "pull-up",
    workoutId: "w1",
    occurredAt: "2026-01-05T10:00:00.000Z",
    userId: USER,
    ...over,
  }) as GoalActivityEvent;

describe("strength goals", () => {
  const threshold = makeGoal({
    type: "strength",
    category: "strength",
    progressType: "threshold",
    unit: "repetitions",
    targetValue: 10,
    metadata: { exerciseId: "pull-up" },
  });

  it("stores the best single-set performance", async () => {
    const { service, store } = makeHarness([threshold]);
    await service.track(exerciseEvent({ workoutId: "w1", repetitions: 7, totalRepetitions: 21 }));
    expect(store.get("goal-1")?.currentValue).toBe(7);
    await service.track(exerciseEvent({ workoutId: "w2", repetitions: 9 }));
    expect(store.get("goal-1")?.currentValue).toBe(9);
  });

  it("never regresses on a weaker session", async () => {
    const { service, store } = makeHarness([{ ...threshold, currentValue: 9 }]);
    await service.track(exerciseEvent({ workoutId: "w3", repetitions: 6 }));
    expect(store.get("goal-1")?.currentValue).toBe(9);
  });

  it("completes when the best performance passes the target", async () => {
    const { service, store } = makeHarness([{ ...threshold, currentValue: 9 }]);
    const result = await service.track(exerciseEvent({ workoutId: "w4", repetitions: 11 }));
    expect(store.get("goal-1")?.currentValue).toBe(11);
    expect(result.completedGoals).toHaveLength(1);
  });

  it("accumulates cumulative exercise goals", async () => {
    const cumulative = makeGoal({
      type: "strength",
      category: "strength",
      progressType: "cumulative",
      unit: "repetitions",
      targetValue: 500,
      metadata: { exerciseId: "push-up" },
    });
    const { service, store } = makeHarness([cumulative]);
    await service.track(
      exerciseEvent({ exerciseId: "push-up", workoutId: "w1", totalRepetitions: 50 }),
    );
    await service.track(
      exerciseEvent({ exerciseId: "push-up", workoutId: "w2", totalRepetitions: 70 }),
    );
    expect(store.get("goal-1")?.currentValue).toBe(120);
  });

  it("ignores a different exercise", async () => {
    const { service, store } = makeHarness([threshold]);
    const result = await service.track(exerciseEvent({ exerciseId: "dip", repetitions: 20 }));
    expect(result.ignoredGoals[0]?.reason).toBe("no_rule");
    expect(store.get("goal-1")?.currentValue).toBe(0);
  });
});

/* ---------------- Duration ---------------- */

describe("duration goals", () => {
  const plank = makeGoal({
    type: "duration",
    category: "fitness",
    progressType: "threshold",
    unit: "seconds",
    targetValue: 120,
    metadata: { exerciseId: "plank" },
  });

  it("keeps the best hold instead of summing attempts", async () => {
    const { service, store } = makeHarness([plank]);
    await service.track(exerciseEvent({ exerciseId: "plank", workoutId: "w1", seconds: 60 }));
    await service.track(exerciseEvent({ exerciseId: "plank", workoutId: "w2", seconds: 70 }));
    expect(store.get("goal-1")?.currentValue).toBe(70);
  });

  it("sums attempts only for explicit cumulative duration goals", async () => {
    const { service, store } = makeHarness([
      { ...plank, progressType: "cumulative", targetValue: 600 },
    ]);
    await service.track(
      exerciseEvent({ exerciseId: "plank", workoutId: "w1", totalSeconds: 60, seconds: 60 }),
    );
    await service.track(
      exerciseEvent({ exerciseId: "plank", workoutId: "w2", totalSeconds: 70, seconds: 70 }),
    );
    expect(store.get("goal-1")?.currentValue).toBe(130);
  });
});

/* ---------------- Training time ---------------- */

describe("training time goals", () => {
  const goal = makeGoal({
    type: "training_time",
    progressType: "cumulative",
    unit: "minutes",
    targetValue: 300,
  });

  it("prefers real duration over the estimate and accumulates", async () => {
    const { service, store } = makeHarness([goal]);
    await service.track(
      workoutEvent("w1", { actualDurationMin: 42, estimatedDurationMin: 30 }),
    );
    await service.track(workoutEvent("w2", { estimatedDurationMin: 30 }));
    expect(store.get("goal-1")?.currentValue).toBe(72);
  });

  it("does not count the same workout twice", async () => {
    const { service, store } = makeHarness([goal]);
    await service.track(workoutEvent("w1", { actualDurationMin: 42 }));
    await service.track(workoutEvent("w1", { actualDurationMin: 42 }));
    expect(store.get("goal-1")?.currentValue).toBe(42);
  });
});

/* ---------------- Program & weeks ---------------- */

describe("program goals", () => {
  it("completes on training_program_completed", async () => {
    const goal = makeGoal({
      type: "program",
      category: "program",
      progressType: "count",
      unit: "workouts",
      targetValue: 1,
    });
    const { service, store } = makeHarness([goal]);
    const result = await service.track({
      type: "training_program_completed",
      planId: "plan-1",
      occurredAt: "2026-02-01T00:00:00.000Z",
      userId: USER,
    });
    expect(store.get("goal-1")?.status).toBe("completed");
    expect(result.completedGoals).toHaveLength(1);
  });

  it("counts multiple programs cumulatively", async () => {
    const goal = makeGoal({
      type: "program",
      category: "program",
      progressType: "count",
      unit: "workouts",
      targetValue: 3,
    });
    const { service, store } = makeHarness([goal]);
    await service.track({
      type: "training_program_completed",
      planId: "plan-1",
      occurredAt: "2026-02-01T00:00:00.000Z",
    });
    await service.track({
      type: "training_program_completed",
      planId: "plan-2",
      occurredAt: "2026-03-01T00:00:00.000Z",
    });
    expect(store.get("goal-1")?.currentValue).toBe(2);
  });

  it("counts training weeks only for week-scoped goals", async () => {
    const weekGoal = makeGoal({
      type: "program",
      category: "program",
      progressType: "count",
      unit: "workouts",
      targetValue: 4,
      metadata: { scope: "week" },
    });
    const { service, store } = makeHarness([weekGoal]);
    await service.track({
      type: "training_week_completed",
      planId: "plan-1",
      weekNumber: 1,
      occurredAt: "2026-01-08T00:00:00.000Z",
    });
    await service.track({
      type: "training_week_completed",
      planId: "plan-1",
      weekNumber: 1,
      occurredAt: "2026-01-08T00:00:00.000Z",
    });
    await service.track({
      type: "training_week_completed",
      planId: "plan-1",
      weekNumber: 2,
      occurredAt: "2026-01-15T00:00:00.000Z",
    });
    expect(store.get("goal-1")?.currentValue).toBe(2);
  });
});

/* ---------------- Streak ---------------- */

describe("streak goals", () => {
  const goal = makeGoal({
    type: "streak",
    category: "consistency",
    progressType: "streak",
    unit: "days",
    targetValue: 7,
  });

  it("uses the authoritative streak value, not +1", async () => {
    const { service, store } = makeHarness([goal]);
    await service.track({
      type: "streak_updated",
      currentStreak: 5,
      occurredAt: "2026-01-05T00:00:00.000Z",
    });
    expect(store.get("goal-1")?.currentValue).toBe(5);
  });

  it("preserves the historical best when the streak falls", async () => {
    const { service, store } = makeHarness([{ ...goal, currentValue: 6 }]);
    await service.track({
      type: "streak_updated",
      currentStreak: 1,
      occurredAt: "2026-01-09T00:00:00.000Z",
    });
    expect(store.get("goal-1")?.currentValue).toBe(6);
  });

  it("completes when the target streak is reached", async () => {
    const { service, store } = makeHarness([{ ...goal, currentValue: 6 }]);
    const result = await service.track({
      type: "streak_updated",
      currentStreak: 7,
      occurredAt: "2026-01-08T00:00:00.000Z",
    });
    expect(store.get("goal-1")?.status).toBe("completed");
    expect(result.completedGoals).toHaveLength(1);
  });
});

/* ---------------- Skill ---------------- */

describe("skill goals", () => {
  const goal = makeGoal({
    type: "skill",
    category: "skill",
    progressType: "boolean",
    unit: "boolean",
    targetValue: 1,
    metadata: { skillId: "handstand" },
  });

  it("completes on the matching skill identifier", async () => {
    const { service, store } = makeHarness([goal]);
    await service.track({
      type: "skill_achieved",
      skillId: "handstand",
      occurredAt: "2026-02-01T00:00:00.000Z",
    });
    expect(store.get("goal-1")?.status).toBe("completed");
  });

  it("ignores a different skill (never matches display text)", async () => {
    const { service, store } = makeHarness([goal]);
    await service.track({
      type: "skill_achieved",
      skillId: "muscle-up",
      occurredAt: "2026-02-01T00:00:00.000Z",
    });
    expect(store.get("goal-1")?.status).toBe("active");
  });
});

/* ---------------- Body goals (directional) ---------------- */

describe("body goals", () => {
  const decreaseGoal = makeGoal({
    type: "body_weight",
    category: "body",
    progressType: "target_value",
    unit: "kilograms",
    targetValue: 7, // 82 -> 75 kg
    metadata: { measurementKey: "body_weight", direction: "decrease", baselineValue: 82 },
  });

  it("tracks a decreasing target", async () => {
    const { service, store } = makeHarness([decreaseGoal]);
    await service.track({
      type: "body_measurement_recorded",
      measurementKey: "body_weight",
      value: 79,
      unit: "kilograms",
      occurredAt: "2026-01-20T00:00:00.000Z",
    });
    expect(store.get("goal-1")?.currentValue).toBe(3);
  });

  it("tracks an increasing target", async () => {
    const increaseGoal = makeGoal({
      type: "body_weight",
      category: "body",
      progressType: "target_value",
      unit: "kilograms",
      targetValue: 5, // 65 -> 70 kg
      metadata: { measurementKey: "body_weight", direction: "increase", baselineValue: 65 },
    });
    const { service, store } = makeHarness([increaseGoal]);
    await service.track({
      type: "body_measurement_recorded",
      measurementKey: "body_weight",
      value: 68,
      unit: "kilograms",
      occurredAt: "2026-01-20T00:00:00.000Z",
    });
    expect(store.get("goal-1")?.currentValue).toBe(3);
  });

  it("never treats a wrong-direction measurement as progress", () => {
    expect(directionalObservation(decreaseGoal, 85)).toBe(0);
  });

  it("keeps the best measurement of a directional goal", async () => {
    const { service, store } = makeHarness([{ ...decreaseGoal, currentValue: 4 }]);
    await service.track({
      type: "body_measurement_recorded",
      measurementKey: "waist",
      value: 80,
      unit: "centimeters",
      occurredAt: "2026-01-25T00:00:00.000Z",
    });
    expect(store.get("goal-1")?.currentValue).toBe(4); // different measurement key
  });
});

/* ---------------- Robustness ---------------- */

describe("robustness", () => {
  it("isolates failures without corrupting goal state", async () => {
    const { service, store, ledgerRows } = makeHarness([makeGoal({ currentValue: 2 })]);
    const broken = createGoalTrackingService({
      goals: {
        getActiveGoals: async () => Array.from(store.values()),
        getGoal: async (id) => store.get(id) ?? null,
        updateGoalProgress: async () => {
          throw new Error("network down");
        },
      },
      ledger: {
        async claim(entry) {
          const k = `${entry.goalId}|${entry.sourceEventId}|${entry.sourceEventType}`;
          if (ledgerRows.has(k)) return false;
          ledgerRows.add(k);
          return true;
        },
        async release(goalId, eventId, eventType) {
          ledgerRows.delete(`${goalId}|${eventId}|${eventType}`);
        },
        async settle() {},
      },
      resolveUserId: async () => USER,
    });

    const failed = await broken.track(workoutEvent("w1"));
    expect(failed.errors).toHaveLength(1);
    expect(store.get("goal-1")?.currentValue).toBe(2);
    expect(ledgerRows.size).toBe(0); // claim released -> retry is safe

    // Retry with a healthy service applies the very same event exactly once.
    await service.track(workoutEvent("w1"));
    await service.track(workoutEvent("w1"));
    expect(store.get("goal-1")?.currentValue).toBe(3);
  });

  it("does not lose updates when events arrive concurrently", async () => {
    const { service, store } = makeHarness([makeGoal()]);
    await Promise.all([
      service.track(workoutEvent("w1")),
      service.track(workoutEvent("w2")),
      service.track(workoutEvent("w3")),
    ]);
    expect(store.get("goal-1")?.currentValue).toBe(3);
  });

  it("returns a typed result", async () => {
    const { service } = makeHarness([makeGoal()]);
    const result = await service.track(workoutEvent("w1"));
    expect(result).toMatchObject({
      eventId: "w1",
      eventType: "workout_completed",
      processedGoals: 1,
    });
    expect(Array.isArray(result.ignoredGoals)).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
