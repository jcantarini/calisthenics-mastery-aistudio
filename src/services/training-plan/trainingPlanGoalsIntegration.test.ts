// Sprint 7.5B-P1 — Training × Goals failure-isolation integration test.
//
// Drives the REAL public method TrainingPlanService.completeWorkout() against
// an in-memory persistence layer, with GoalTrackingService.trackSafely forced
// to throw an unexpected exception. It proves the isolation block inside
// completeWorkout keeps the workout completion authoritative.

import { beforeEach, describe, expect, it, vi } from "vitest";

interface Row {
  [column: string]: unknown;
}

const store = vi.hoisted(() => ({
  rows: [] as Row[],
  seq: 0,
}));

vi.mock("@/integrations/supabase/client", () => {
  type Filter = (row: Row) => boolean;

  class Query implements PromiseLike<{ data: unknown; error: unknown; count?: number }> {
    private filters: Filter[] = [];
    private op: "select" | "insert" | "update" | "delete" = "select";
    private payload: Row | Row[] = {};
    private counting = false;
    private limitN: number | null = null;

    constructor(private table: string) {}

    select(_columns?: string, options?: { count?: string; head?: boolean }) {
      if (options?.count) this.counting = true;
      return this;
    }
    insert(values: Row | Row[]) {
      this.op = "insert";
      this.payload = values;
      return this;
    }
    update(values: Row) {
      this.op = "update";
      this.payload = values;
      return this;
    }
    delete() {
      this.op = "delete";
      return this;
    }
    eq(column: string, value: unknown) {
      this.filters.push((row) => row[column] === value);
      return this;
    }
    in(column: string, values: unknown[]) {
      this.filters.push((row) => values.includes(row[column]));
      return this;
    }
    not(column: string) {
      this.filters.push((row) => row[column] !== null && row[column] !== undefined);
      return this;
    }
    order() {
      return this;
    }
    limit(n: number) {
      this.limitN = n;
      return this;
    }

    private matched(): Row[] {
      const rows = store.rows.filter(
        (row) => row["__table"] === this.table && this.filters.every((f) => f(row)),
      );
      return this.limitN === null ? rows : rows.slice(0, this.limitN);
    }

    private execute(): { data: unknown; error: unknown; count?: number } {
      const now = new Date().toISOString();
      switch (this.op) {
        case "insert": {
          const values = Array.isArray(this.payload) ? this.payload : [this.payload];
          const inserted = values.map((value) => {
            store.seq += 1;
            const row: Row = {
              __table: this.table,
              id: `row-${store.seq}`,
              created_at: now,
              updated_at: now,
              ...value,
            };
            store.rows.push(row);
            return { ...row };
          });
          return { data: inserted, error: null };
        }
        case "update": {
          const rows = this.matched();
          for (const row of rows) Object.assign(row, this.payload, { updated_at: now });
          return { data: rows.map((row) => ({ ...row })), error: null };
        }
        case "delete": {
          const rows = this.matched();
          store.rows = store.rows.filter((row) => !rows.includes(row));
          return { data: null, error: null };
        }
        default: {
          const rows = this.matched();
          if (this.counting) return { data: null, error: null, count: rows.length };
          return { data: rows.map((row) => ({ ...row })), error: null };
        }
      }
    }

    async single() {
      const result = this.execute();
      const data = Array.isArray(result.data) ? (result.data[0] ?? null) : result.data;
      if (!data && !result.error) return { data: null, error: { message: "no rows" } };
      return { ...result, data };
    }
    async maybeSingle() {
      const result = this.execute();
      const data = Array.isArray(result.data) ? (result.data[0] ?? null) : result.data;
      return { ...result, data };
    }
    then<R1, R2 = never>(
      onfulfilled?:
        | ((value: { data: unknown; error: unknown; count?: number }) => R1 | PromiseLike<R1>)
        | null,
      onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
    ): PromiseLike<R1 | R2> {
      return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
    }
  }

  return {
    supabase: {
      from: (table: string) => new Query(table),
      auth: {
        getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }),
      },
    },
  };
});

const gamification = vi.hoisted(() => ({
  processWorkoutCompleted: vi.fn(async () => ({ ok: true })),
  processWeekCompleted: vi.fn(async () => ({ ok: true })),
  processProgramCompleted: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/services/gamification", () => ({
  GamificationOrchestrator: gamification,
}));

const trackSafely = vi.hoisted(() =>
  vi.fn(async () => {
    throw new Error("tracking exploded");
  }),
);

vi.mock("@/services/goals", () => ({
  GoalTrackingService: { trackSafely },
}));

import { TrainingPlanService } from "./TrainingPlanService";

const USER_ID = "user-training-1";
const PLAN_ID = "plan-1";
const WORKOUT_ID = "workout-1";
const DAY_ID = "day-1";

function seedPlan() {
  const today = new Date().toISOString().slice(0, 10);
  store.rows.push({
    __table: "training_plans",
    id: PLAN_ID,
    user_id: USER_ID,
    name: "Plano de teste",
    description: "",
    program_slug: "iniciante-total",
    is_active: true,
    status: "active",
    total_weeks: 1,
    current_week: 1,
    current_day: 1,
    difficulty: "iniciante",
    primary_goal: null,
    target_skill: null,
    fitness_level: null,
    days_per_week: 1,
    workout_duration_min: 30,
    started_at: new Date().toISOString(),
    start_date: today,
    completed_workouts: 0,
    completed_weeks: 0,
    progress_percentage: 0,
    created_at: new Date().toISOString(),
  });
  store.rows.push({
    __table: "training_weeks",
    id: "week-1",
    plan_id: PLAN_ID,
    user_id: USER_ID,
    week_number: 1,
    objective: "Base",
    difficulty: "iniciante",
    estimated_duration_min: 30,
    workout_days_count: 1,
    recovery_days_count: 0,
    is_deload: false,
  });
  store.rows.push({
    __table: "planned_workouts",
    id: WORKOUT_ID,
    user_id: USER_ID,
    plan_id: PLAN_ID,
    week_number: 1,
    day_number: 1,
    name: "Treino A",
    description: "",
    difficulty: "iniciante",
    program_slug: "iniciante-total",
    estimated_duration_min: 30,
    estimated_calories: 200,
    warmup: [],
    exercises: [],
    cooldown: [],
    progression_data: {},
    notes: "",
    is_completed: false,
    completed_at: null,
    started_at: null,
    status: "available",
    scheduled_date: today,
  });
  store.rows.push({
    __table: "training_days",
    id: DAY_ID,
    user_id: USER_ID,
    plan_id: PLAN_ID,
    week_id: "week-1",
    week_number: 1,
    day_number: 1,
    day_type: "workout",
    planned_workout_id: WORKOUT_ID,
    scheduled_date: today,
    completed: false,
    completed_at: null,
    notes: null,
  });
}

function row(table: string, id: string): Row {
  return store.rows.find((r) => r["__table"] === table && r["id"] === id)!;
}

describe("TrainingPlanService.completeWorkout × goal tracking failure isolation", () => {
  beforeEach(() => {
    store.rows = [];
    store.seq = 0;
    trackSafely.mockClear();
    gamification.processWorkoutCompleted.mockClear();
    seedPlan();
  });

  it("resolves successfully even when goal tracking throws unexpectedly", async () => {
    const state = await TrainingPlanService.completeWorkout(WORKOUT_ID, USER_ID);

    // The real isolation block was reached: tracking ran and threw.
    expect(trackSafely).toHaveBeenCalled();
    await expect(trackSafely.mock.results[0]!.value).rejects.toThrow("tracking exploded");

    // Workout stays persisted as completed.
    const workout = row("planned_workouts", WORKOUT_ID);
    expect(workout["status"]).toBe("completed");
    expect(workout["is_completed"]).toBe(true);
    expect(workout["completed_at"]).toBeTruthy();

    // The corresponding training day stays completed.
    const day = row("training_days", DAY_ID);
    expect(day["completed"]).toBe(true);
    expect(day["completed_at"]).toBeTruthy();

    // Returned state reports the workout as completed.
    const returned = state.plan.weeks.flatMap((w) => w.workouts).find((w) => w.id === WORKOUT_ID);
    expect(returned?.isCompleted).toBe(true);
    expect(returned?.status).toBe("completed");
    expect(state.plan.completedWorkouts).toBe(1);
  });

  it("never propagates the tracking error and never completes the workout twice", async () => {
    const completedAtBefore = await TrainingPlanService.completeWorkout(WORKOUT_ID, USER_ID).then(
      () => row("planned_workouts", WORKOUT_ID)["completed_at"],
    );

    expect(completedAtBefore).toBeTruthy();
    expect(gamification.processWorkoutCompleted).toHaveBeenCalledTimes(1);
    expect(
      store.rows.filter((r) => r["__table"] === "planned_workouts" && r["is_completed"] === true),
    ).toHaveLength(1);
  });
});
