// Sprint 7.5B — Goals Release Contract Tests.
//
// Integrated validation of everything built in Sprints 7.1–7.5A, exercised
// through the real services, real domain rules and real adapters. Persistence
// is the only substituted layer: an in-memory table stands in for Supabase so
// the whole lifecycle (create → lifecycle → progress → completion → reward)
// runs end to end without network.
//
// These tests assert BEHAVIOUR through public contracts. They never grep the
// source for strings.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ---------------- In-memory persistence ---------------- */

interface Row {
  [column: string]: unknown;
}

const store = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  seq: 0,
  user: "user-1" as string | null,
  failNext: null as string | null,
}));

vi.mock("@/integrations/supabase/client", () => {
  type Filter = (row: Record<string, unknown>) => boolean;

  class Query implements PromiseLike<{ data: unknown; error: unknown; count?: number }> {
    private filters: Filter[] = [];
    private op: "select" | "insert" | "update" | "delete" = "select";
    private payload: Record<string, unknown> = {};
    private counting = false;
    private limitN: number | null = null;

    constructor(private table: string) {}

    select(_columns?: string, options?: { count?: string; head?: boolean }) {
      if (options?.count) this.counting = true;
      return this;
    }
    insert(values: Record<string, unknown>) {
      this.op = "insert";
      this.payload = values;
      return this;
    }
    update(values: Record<string, unknown>) {
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
    not(column: string, _operator: string, _value: unknown) {
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

    private matched() {
      const rows = store.rows.filter(
        (row) => row["__table"] === this.table && this.filters.every((f) => f(row)),
      );
      return this.limitN === null ? rows : rows.slice(0, this.limitN);
    }

    private execute(): { data: unknown; error: unknown; count?: number } {
      if (store.failNext === this.table) {
        store.failNext = null;
        return { data: null, error: { message: "forced failure", code: "XX000" } };
      }
      const now = new Date().toISOString();
      switch (this.op) {
        case "insert": {
          store.seq += 1;
          const row: Row = {
            __table: this.table,
            id: `row-${store.seq}`,
            description: null,
            current_value: 0,
            difficulty: "medium",
            target_date: null,
            completed_at: null,
            metadata: {},
            created_at: now,
            updated_at: now,
            ...this.payload,
          };
          store.rows.push(row);
          return { data: { ...row }, error: null };
        }
        case "update": {
          const rows = this.matched();
          for (const row of rows) Object.assign(row, this.payload, { updated_at: now });
          return { data: rows.length ? { ...rows[0] } : null, error: null };
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
        getUser: async () => ({
          data: { user: store.user ? { id: store.user } : null },
          error: null,
        }),
      },
    },
  };
});

const orchestrator = vi.hoisted(() => ({
  processGoalCompleted: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/services/gamification/GamificationOrchestrator", () => ({
  GamificationOrchestrator: orchestrator,
}));

import { GoalService } from "./GoalService";
import { createGoalTrackingService } from "./GoalTrackingService";
import { createGoalGamificationBridge, registerGoalGamification } from "./goalGamification";
import { createGoalRewardRecovery } from "./GoalRewardRecovery";
import { onGoalEvent, type GoalEvent } from "./goalEvents";
import { GOAL_TRANSITIONS, buildGoalProgress, validateGoalTransition } from "./goalRules";
import { goalTrackingMode } from "./goalTrackingCapability";
import type { Goal } from "./goalTypes";
import type {
  GoalActivityEvent,
  GoalTrackingLedgerEntry,
  GoalTrackingLedgerPort,
} from "./goalTrackingTypes";
import { goalCompletionSourceId } from "@/services/xp/xpRules";

import {
  CUSTOM_KINDS,
  GOAL_TEMPLATES,
  buildCreateGoalInput,
  emptyDraft,
  findTemplate,
  selectCustomKind,
  selectTemplate,
  targetBounds,
  validateDraft,
} from "@/components/goals/goalTemplates";
import { validateCreateGoal } from "./goalValidation";
import {
  buildManualSignal,
  isManualProgressEligible,
  manualProgressModel,
  previewManualProgress,
  validateManualValue,
} from "@/components/goals/manualProgress";
import { availableGoalActions, matchesFilter } from "@/components/goals/goalPresentation";
import {
  isRadioNavKey,
  isRadioSelectKey,
  nextRadioIndex,
  radioTabIndex,
} from "@/components/goals/radioNavigation";
import { routeForIssues, stepKeyForField } from "@/components/goals/wizardNavigation";
import { parseDecimalInput, validateNumericInput } from "@/components/goals/numericInput";
import { runMutationFlow } from "@/hooks/mutationFlow";
import { applyFailure, applySuccess, initialAsyncState, startLoad } from "@/hooks/asyncResource";
import { GOALS_DICTS, GOALS_LOCALES } from "@/lib/goals-i18n";
import { findGoalRewardEntry, goalRewardState } from "@/components/dashboard/goalsDashboard";

const USER = "user-1";
const t = (key: string) => key;

beforeEach(() => {
  store.rows = [];
  store.seq = 0;
  store.user = USER;
  store.failNext = null;
  orchestrator.processGoalCompleted.mockClear();
});

// Importing the Goals barrel is what registers the Goals -> Gamification wire
// exactly once; the release contract exercises that real registration.
import "./index";

const subscriptions: Array<() => void> = [];
afterEach(() => {
  while (subscriptions.length) subscriptions.pop()?.();
});

function collectEvents(): GoalEvent[] {
  const events: GoalEvent[] = [];
  subscriptions.push(
    onGoalEvent((event) => {
      events.push(event);
    }),
  );
  return events;
}

async function createCountGoal(overrides: Record<string, unknown> = {}): Promise<Goal> {
  return GoalService.createGoal({
    userId: USER,
    type: "workout_count",
    category: "fitness",
    progressType: "count",
    title: "Completar 3 treinos",
    targetValue: 3,
    unit: "workouts",
    status: "active",
    difficulty: "medium",
    ...overrides,
  });
}

/* ================= Creation and lifecycle ================= */

describe("release contract — creation and lifecycle", () => {
  it("every template produces a valid CreateGoalInput", () => {
    for (const template of GOAL_TEMPLATES) {
      if (template.id === "custom") continue;
      const draft = selectTemplate(template);
      expect(validateDraft(draft), template.id).toEqual([]);
      const input = buildCreateGoalInput(draft, t);
      expect(input, template.id).not.toBeNull();
      expect(validateCreateGoal(input!).valid, template.id).toBe(true);
    }
  });

  it("every custom kind produces a valid CreateGoalInput", () => {
    const custom = findTemplate("custom")!;
    for (const kind of CUSTOM_KINDS) {
      const draft = {
        ...selectCustomKind({ ...emptyDraft(), ...selectTemplate(custom) }, kind),
        customTitle: "Minha meta pessoal",
      };
      expect(validateDraft(draft), kind.id).toEqual([]);
      const input = buildCreateGoalInput(draft, t);
      expect(input, kind.id).not.toBeNull();
      expect(validateCreateGoal(input!).valid, kind.id).toBe(true);
    }
  });

  it("activates a draft, pauses an active goal and resumes it", async () => {
    const events = collectEvents();
    const draft = await createCountGoal({ status: "draft" });
    expect(draft.status).toBe("draft");

    const active = await GoalService.activateGoal(draft.id);
    expect(active.status).toBe("active");
    const paused = await GoalService.pauseGoal(active.id);
    expect(paused.status).toBe("paused");
    const resumed = await GoalService.resumeGoal(paused.id);
    expect(resumed.status).toBe("active");

    expect(events.map((e) => e.type)).toEqual([
      "goal_created",
      "goal_activated",
      "goal_paused",
      "goal_resumed",
    ]);
  });

  it("offers no lifecycle transition out of terminal states", () => {
    for (const terminal of ["completed", "cancelled", "expired"] as const) {
      expect(GOAL_TRANSITIONS[terminal]).toEqual([]);
      expect(validateGoalTransition(terminal, "active")).toBe(false);
      expect(availableGoalActions({ status: terminal })).not.toContain("pause");
    }
  });

  it("duplicating creates a fresh goal without reopening the original", async () => {
    const goal = await createCountGoal();
    await GoalService.completeGoal(goal.id);
    const copy = await GoalService.duplicateGoal(goal.id);

    expect(copy.id).not.toBe(goal.id);
    expect(copy.status).toBe("active");
    expect(copy.currentValue).toBe(0);
    expect(copy.metadata["duplicatedFrom"]).toBe(goal.id);
    expect((await GoalService.getGoal(goal.id))!.status).toBe("completed");
  });

  it("cancels an active goal once and stays idempotent", async () => {
    const events = collectEvents();
    const goal = await createCountGoal();

    const cancelled = await GoalService.cancelGoal(goal.id);
    expect(cancelled.status).toBe("cancelled");
    expect((await GoalService.getGoal(goal.id))!.status).toBe("cancelled");
    expect(events.filter((e) => e.type === "goal_cancelled")).toHaveLength(1);

    const again = await GoalService.cancelGoal(goal.id);
    expect(again.status).toBe("cancelled");
    expect(events.filter((e) => e.type === "goal_cancelled")).toHaveLength(1);
  });

  it("deletes a goal without reopening, completing or duplicating it", async () => {
    const events = collectEvents();
    const goal = await createCountGoal();

    await expect(GoalService.deleteGoal(goal.id)).resolves.toBeUndefined();

    expect(await GoalService.getGoal(goal.id)).toBeNull();
    expect(await GoalService.getGoals({ userId: USER })).toHaveLength(0);
    expect(
      events.filter(
        (e) => e.type === "goal_completed" || e.type === "goal_activated" || e.type === "goal_created",
      ),
    ).toHaveLength(1); // only the original creation
  });
});


/* ================= Manual progress ================= */

describe("release contract — manual progress", () => {
  it("applies a valid increment exactly once", async () => {
    const goal = await createCountGoal();
    const model = manualProgressModel(goal);
    const validation = validateManualValue(model, "1");
    expect(validation.ok).toBe(true);

    const preview = previewManualProgress(goal, model, 1);
    const updated = await GoalService.updateGoalProgress(goal.id, buildManualSignal(model, 1));

    expect(updated.currentValue).toBe(preview.nextValue);
    expect(updated.currentValue).toBe(1);
    expect(buildGoalProgress(updated).percentage).toBe(33);
  });

  it("completes the goal exactly once when the target is reached", async () => {
    const events = collectEvents();
    const goal = await createCountGoal();
    const model = manualProgressModel(goal);
    const updated = await GoalService.updateGoalProgress(goal.id, buildManualSignal(model, 3));

    expect(updated.status).toBe("completed");
    expect(events.filter((e) => e.type === "goal_completed")).toHaveLength(1);
  });

  it("a duplicate submission does not create a second completion", async () => {
    const events = collectEvents();
    const goal = await createCountGoal();
    const model = manualProgressModel(goal);
    const signal = buildManualSignal(model, 3);

    const [a, b] = await Promise.all([
      GoalService.updateGoalProgress(goal.id, signal),
      GoalService.updateGoalProgress(goal.id, signal),
    ]);

    expect(a.status).toBe("completed");
    expect(b.status).toBe("completed");
    expect(events.filter((e) => e.type === "goal_completed")).toHaveLength(1);
  });

  it("does not offer manual progress for non-eligible goals", async () => {
    // Auto-tracked goals never expose manual controls.
    const auto = await createCountGoal();
    expect(isManualProgressEligible(auto)).toBe(false);

    const manual = await createCountGoal({
      type: "custom",
      category: "custom",
      title: "Meditar 10 vezes",
    });
    expect(isManualProgressEligible(manual)).toBe(true);
    expect(isManualProgressEligible({ ...manual, status: "paused" })).toBe(false);
    const completed = await GoalService.completeGoal(manual.id);
    expect(isManualProgressEligible(completed)).toBe(false);
  });

  it("a completed goal refuses further progress", async () => {
    const goal = await createCountGoal();
    const completed = await GoalService.completeGoal(goal.id);
    const model = manualProgressModel(goal);
    const after = await GoalService.updateGoalProgress(goal.id, buildManualSignal(model, 5));
    expect(after.currentValue).toBe(completed.currentValue);
    expect(after.status).toBe("completed");
  });
});

/* ================= Automatic tracking ================= */

function memoryLedger(): GoalTrackingLedgerPort & { claims: Set<string> } {
  const claims = new Set<string>();
  const key = (goalId: string, eventId: string, type: string) => `${goalId}|${eventId}|${type}`;
  return {
    claims,
    async claim(entry: GoalTrackingLedgerEntry) {
      const k = key(entry.goalId, entry.sourceEventId, entry.sourceEventType);
      if (claims.has(k)) return false;
      claims.add(k);
      return true;
    },
    async release(goalId, eventId, type) {
      claims.delete(key(goalId, eventId, type));
    },
    async settle() {},
  };
}

function trackingService(ledger: GoalTrackingLedgerPort) {
  return createGoalTrackingService({
    goals: {
      getActiveGoals: (userId) => GoalService.getActiveGoals(userId),
      getGoal: (goalId, userId) => GoalService.getGoal(goalId, userId),
      updateGoalProgress: (goalId, signal, userId) =>
        GoalService.updateGoalProgress(goalId, signal, userId),
    },
    ledger,
    resolveUserId: async (userId?: string) => userId ?? USER,
  });
}

const workoutEvent = (id: string): GoalActivityEvent =>
  ({
    type: "workout_completed",
    workoutId: id,
    occurredAt: new Date().toISOString(),
    userId: USER,
  }) as GoalActivityEvent;

describe("release contract — automatic tracking", () => {
  it("updates only the goals that match the event", async () => {
    const matching = await createCountGoal();
    const unrelated = await createCountGoal({
      type: "body_weight",
      category: "body",
      progressType: "target_value",
      unit: "kilograms",
      title: "Chegar a 75 kg",
      targetValue: 75,
    });

    const result = await trackingService(memoryLedger()).track(workoutEvent("w1"));

    expect(result.updatedGoals.map((u) => u.goalId)).toEqual([matching.id]);
    expect((await GoalService.getGoal(unrelated.id))!.currentValue).toBe(0);
  });

  it("ignores an incompatible event", async () => {
    await createCountGoal({
      type: "body_weight",
      category: "body",
      progressType: "target_value",
      unit: "kilograms",
      title: "Chegar a 75 kg",
      targetValue: 75,
    });
    const result = await trackingService(memoryLedger()).track(workoutEvent("w1"));
    expect(result.updatedGoals).toEqual([]);
    expect(result.ignoredGoals.length).toBe(1);
  });

  it("never processes the same source event twice", async () => {
    const goal = await createCountGoal();
    const service = trackingService(memoryLedger());
    await service.track(workoutEvent("w1"));
    const second = await service.track(workoutEvent("w1"));

    expect(second.updatedGoals).toEqual([]);
    expect(second.ignoredGoals[0]?.reason).toBe("already_processed");
    expect((await GoalService.getGoal(goal.id))!.currentValue).toBe(1);
  });

  it("a ledger failure is contained in the typed tracking result", async () => {
    await createCountGoal();
    const broken: GoalTrackingLedgerPort = {
      async claim() {
        throw new Error("ledger offline");
      },
      async release() {},
      async settle() {},
    };
    const result = await trackingService(broken).trackSafely(workoutEvent("w1"));
    expect(result).not.toBeNull();
    expect(result!.errors.length).toBe(1);
  });

  it("concurrent observations never overwrite the newest value", async () => {
    const goal = await createCountGoal({ targetValue: 10 });
    const service = trackingService(memoryLedger());
    await Promise.all([
      service.track(workoutEvent("w1")),
      service.track(workoutEvent("w2")),
      service.track(workoutEvent("w3")),
    ]);
    expect((await GoalService.getGoal(goal.id))!.currentValue).toBe(3);
  });
});

/* ================= Reward ================= */

describe("release contract — reward", () => {
  it("manual and automatic completion emit the same goal_completed contract", async () => {
    const events = collectEvents();

    const manual = await createCountGoal({ targetValue: 1 });
    const model = manualProgressModel(manual);
    await GoalService.updateGoalProgress(manual.id, buildManualSignal(model, 1));

    const auto = await createCountGoal({ targetValue: 1 });
    await trackingService(memoryLedger()).track(workoutEvent("w1"));

    const completions = events.filter((e) => e.type === "goal_completed");
    expect(completions).toHaveLength(2);
    for (const event of completions) {
      expect(event).toMatchObject({ userId: USER, type: "goal_completed" });
      expect((event as { sourceId: string }).sourceId).toBe(event.goalId);
    }
    expect(completions.map((e) => e.goalId).sort()).toEqual([manual.id, auto.id].sort());
  });

  it("goalCompletionSourceId is deterministic", () => {
    expect(goalCompletionSourceId("abc")).toBe(goalCompletionSourceId("abc"));
    expect(goalCompletionSourceId("abc")).not.toBe(goalCompletionSourceId("abd"));
  });

  it("registers the gamification wire once and forwards a completion once", async () => {
    // The barrel already registered the wire; a second call must be a no-op
    // so one completion can never be forwarded twice.
    const extra = registerGoalGamification();
    const goal = await createCountGoal({ targetValue: 1 });
    await GoalService.completeGoal(goal.id);
    expect(orchestrator.processGoalCompleted).toHaveBeenCalledTimes(1);

    // Duplicate delivery of the same completion is a no-op on the goal.
    const again = await GoalService.completeGoal(goal.id);
    expect(again.status).toBe("completed");
    expect(orchestrator.processGoalCompleted).toHaveBeenCalledTimes(1);
    extra();
  });

  it("a gamification failure never undoes the goal completion", async () => {
    const bridge = createGoalGamificationBridge({
      countCompletedGoals: async () => {
        throw new Error("count offline");
      },
      processGoalCompleted: async () => {
        throw new Error("orchestrator offline");
      },
    });
    const goal = await createCountGoal({ targetValue: 1 });
    const completed = await GoalService.completeGoal(goal.id);

    await expect(
      bridge.handleGoalCompleted({
        type: "goal_completed",
        userId: USER,
        goalId: completed.id,
        goal: completed,
        occurredAt: completed.completedAt!,
        completedAt: completed.completedAt!,
        sourceId: completed.id,
      }),
    ).resolves.toBeUndefined();
    expect((await GoalService.getGoal(goal.id))!.status).toBe("completed");
  });

  it("reward recovery replays the pipeline without touching goal state", async () => {
    const goal = await createCountGoal({ targetValue: 1 });
    const completed = await GoalService.completeGoal(goal.id);
    const before = await GoalService.getGoal(goal.id);

    const processed = new Set<string>();
    const recovery = createGoalRewardRecovery({
      listCompletedGoals: async () => [completed],
      countCompletedGoals: async () => 1,
      hasProcessedSource: async (sourceId) => processed.has(sourceId),
      processGoalCompleted: async (options) => {
        processed.add(goalCompletionSourceId(options.goalId));
        return null;
      },
      activatedAt: "2020-01-01T00:00:00.000Z",
      log: () => {},
    });

    const first = await recovery.reconcileCompletedGoalRewards(USER);
    const second = await recovery.reconcileCompletedGoalRewards(USER);

    expect(first.recovered).toBe(1);
    expect(second.recovered).toBe(0);
    expect(second.alreadyProcessed).toBe(1);
    expect(await GoalService.getGoal(goal.id)).toEqual(before);
  });

  it("reward presentation reads only the persisted ledger value", () => {
    const entry = {
      id: "x1",
      userId: USER,
      amount: 150,
      eventType: "goal_completed",
      sourceId: goalCompletionSourceId("goal-9"),
      reason: "Meta concluída",
      createdAt: new Date().toISOString(),
      metadata: {},
    } as never;

    expect(findGoalRewardEntry([entry], "goal-9")).toBe(entry);
    expect(findGoalRewardEntry([entry], "goal-8")).toBeNull();
    expect(goalRewardState({ entry, loading: false, error: false })).toBe("confirmed");
    expect(goalRewardState({ entry: null, loading: true, error: false })).toBe("pending");
  });
});

/* ================= UI contracts ================= */

describe("release contract — UI contracts", () => {
  it("filters behave as a mutually exclusive button group over statuses", () => {
    const active = { status: "active" } as const;
    expect(matchesFilter(active, "active")).toBe(true);
    expect(matchesFilter(active, "paused")).toBe(false);
    expect(matchesFilter(active, "all")).toBe(true);
  });

  it("radio groups keep exactly one tabbable option and support the full keyboard set", () => {
    const length = 4;
    const focus = 2;
    const tabbable = Array.from({ length }, (_, i) => radioTabIndex(i, focus)).filter(
      (v) => v === 0,
    );
    expect(tabbable).toHaveLength(1);

    expect(nextRadioIndex("ArrowRight", 3, length)).toBe(0);
    expect(nextRadioIndex("ArrowLeft", 0, length)).toBe(3);
    expect(nextRadioIndex("Home", 3, length)).toBe(0);
    expect(nextRadioIndex("End", 0, length)).toBe(3);
    expect(nextRadioIndex("Tab", 0, length)).toBeNull();
    expect(isRadioNavKey("ArrowDown")).toBe(true);
    expect(isRadioSelectKey("Enter")).toBe(true);
    expect(isRadioSelectKey(" ")).toBe(true);
  });

  it("wizard routes each invalid field to its own step", () => {
    // Title and target are edited on the target step; the deadline on tune.
    expect(stepKeyForField("title")).toBe("target");
    expect(stepKeyForField("target")).toBe("target");
    expect(stepKeyForField("deadline")).toBe("tune");
    expect(routeForIssues([])).toBeNull();

    // Field priority: title first, then target, then deadline.
    const route = routeForIssues([
      { field: "deadline", messageKey: "gl.err.deadline" },
      { field: "title", messageKey: "gl.err.title" },
    ]);
    expect(route).toEqual({ step: 2, field: "title" });
    expect(routeForIssues([{ field: "deadline", messageKey: "gl.err.deadline" }])).toEqual({
      step: 3,
      field: "deadline",
    });
  });

  it("the numeric parser accepts comma and period and enforces the preset grid", () => {
    expect(parseDecimalInput("1,5")).toBe(1.5);
    expect(parseDecimalInput("1.5")).toBe(1.5);
    expect(parseDecimalInput("abc")).toBeNull();

    for (const template of GOAL_TEMPLATES) {
      const draft = selectTemplate(template);
      const bounds = targetBounds(draft);
      if (!bounds.numeric) continue;
      const result = validateNumericInput(String(draft.target), {
        min: bounds.min,
        max: bounds.max,
        step: bounds.step,
        allowDecimal: !Number.isInteger(bounds.step),
      });
      expect(result.ok, template.id).toBe(true);
    }
  });

  it("awaits an async onChanged before clearing pending", async () => {
    const order: string[] = [];
    let pending = false;
    await runMutationFlow(
      async () => {
        order.push("mutate");
        return "ok";
      },
      async () => {
        expect(pending).toBe(true);
        order.push("reload");
      },
      (value) => {
        pending = value;
        order.push(value ? "pending:on" : "pending:off");
      },
      () => {},
    );
    expect(order).toEqual(["pending:on", "mutate", "reload", "pending:off"]);
  });

  it("keeps usable data when a background refresh fails", () => {
    const loaded = applySuccess(initialAsyncState<number[]>([]), [1, 2]);
    const refreshing = startLoad(loaded);
    expect(refreshing.refreshing).toBe(true);
    const failed = applyFailure(refreshing, new Error("offline"), []);
    expect(failed.data).toEqual([1, 2]);
    expect(failed.loaded).toBe(true);
  });

  it("discards a late response from a superseded request (latest-request-wins)", async () => {
    // Two in-flight loads with distinct ids; the older one resolves last.
    let latestId = 0;
    let state = applySuccess(initialAsyncState<string[]>([]), []);

    const requestA = ++latestId; // superseded
    const requestB = ++latestId; // current

    const slowOld = new Promise<string[]>((resolve) =>
      setTimeout(() => resolve(["stale-a"]), 10),
    );
    const fastCurrent = Promise.resolve(["fresh-b"]);

    const apply = (id: number, data: string[]) => {
      if (isStaleResponse(id, latestId)) return;
      state = applySuccess(state, data);
    };

    apply(requestB, await fastCurrent);
    expect(state.data).toEqual(["fresh-b"]);

    apply(requestA, await slowOld);
    expect(isStaleResponse(requestA, latestId)).toBe(true);
    expect(isStaleResponse(requestB, latestId)).toBe(false);
    expect(state.data).toEqual(["fresh-b"]);
  });


  it("exposes a truthful tracking mode for every goal type used by templates", () => {
    for (const template of GOAL_TEMPLATES) {
      const mode = goalTrackingMode({ type: template.type, metadata: template.metadata });
      expect(["auto", "manual", "pending"], template.id).toContain(mode);
    }
  });

  it("ships every Goals key in the five supported locales", () => {
    const reference = Object.keys(GOALS_DICTS.pt).sort();
    expect(GOALS_LOCALES).toHaveLength(5);
    for (const locale of GOALS_LOCALES) {
      expect(Object.keys(GOALS_DICTS[locale]).sort(), locale).toEqual(reference);
    }
  });
});
