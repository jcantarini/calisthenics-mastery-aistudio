import { describe, expect, it } from "vitest";
import { foldProgress, isGoalCompleted } from "@/services/goals/goalRules";
import type { Goal, GoalProgressType, GoalStatus, GoalUnit } from "@/services/goals/goalTypes";
import {
  QUICK_ADDS_BY_UNIT,
  buildManualSignal,
  isManualProgressEligible,
  manualProgressModel,
  manualSignalMode,
  previewManualProgress,
  validateManualValue,
} from "./manualProgress";

function goal(over: Partial<Goal> = {}): Goal {
  return {
    id: "g1",
    userId: "u1",
    type: "custom",
    category: "custom",
    progressType: "count",
    title: "Goal",
    description: null,
    targetValue: 10,
    currentValue: 0,
    unit: "repetitions",
    status: "active",
    difficulty: "medium",
    startDate: "2026-01-01",
    targetDate: null,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    metadata: {},
    ...over,
  };
}

describe("isManualProgressEligible", () => {
  it("accepts active manual goals", () => {
    expect(isManualProgressEligible(goal({ type: "custom" }))).toBe(true);
  });

  it("accepts active pending goals (auto-trackable type without a link)", () => {
    expect(isManualProgressEligible(goal({ type: "strength", metadata: {} }))).toBe(true);
  });

  it("rejects automatic goals", () => {
    expect(isManualProgressEligible(goal({ type: "workout_count" }))).toBe(false);
    expect(
      isManualProgressEligible(goal({ type: "strength", metadata: { exerciseId: "pull-up" } })),
    ).toBe(false);
  });

  it("rejects draft and paused goals", () => {
    for (const status of ["draft", "paused"] as GoalStatus[]) {
      expect(isManualProgressEligible(goal({ status }))).toBe(false);
    }
  });

  it("rejects completed, cancelled and expired goals", () => {
    for (const status of ["completed", "cancelled", "expired"] as GoalStatus[]) {
      expect(isManualProgressEligible(goal({ status }))).toBe(false);
    }
  });
});

describe("signal mode mapping", () => {
  it("uses increment for additive progress types", () => {
    for (const type of ["count", "cumulative", "duration"] as GoalProgressType[]) {
      expect(manualSignalMode(type)).toBe("increment");
    }
  });

  it("uses set for authoritative progress types", () => {
    for (const type of ["threshold", "target_value", "streak"] as GoalProgressType[]) {
      expect(manualSignalMode(type)).toBe("set");
    }
  });

  it("boolean submits a set signal with value 1 and no numeric input", () => {
    const model = manualProgressModel({ progressType: "boolean", unit: "boolean" });
    expect(model.input).toBe("boolean");
    expect(buildManualSignal(model, 42)).toEqual({ source: "manual", mode: "set", value: 1 });
  });
});

describe("validateManualValue", () => {
  const increment = manualProgressModel({ progressType: "count", unit: "repetitions" });
  const set = manualProgressModel({ progressType: "threshold", unit: "repetitions" });
  const decimal = manualProgressModel({ progressType: "target_value", unit: "kilograms" });

  it("rejects zero, negative and non-finite increments", () => {
    expect(validateManualValue(increment, 0).ok).toBe(false);
    expect(validateManualValue(increment, -3).ok).toBe(false);
    expect(validateManualValue(increment, Number.NaN).ok).toBe(false);
    expect(validateManualValue(increment, "").ok).toBe(false);
    expect(validateManualValue(increment, 4)).toEqual({ ok: true, value: 4 });
  });

  it("accepts zero but rejects negative and non-finite set values", () => {
    expect(validateManualValue(set, 0)).toEqual({ ok: true, value: 0 });
    expect(validateManualValue(set, -1).ok).toBe(false);
    expect(validateManualValue(set, Number.POSITIVE_INFINITY).ok).toBe(false);
  });

  it("rejects fractional values for integer-oriented units", () => {
    const result = validateManualValue(increment, 2.5);
    expect(result).toEqual({ ok: false, errorKey: "gl.mp.err.integer" });
  });

  it("accepts decimals for measurement-oriented units", () => {
    expect(validateManualValue(decimal, "72.4")).toEqual({ ok: true, value: 72.4 });
    expect(decimal.step).toBe(0.1);
  });
});

describe("preview", () => {
  it("uses the canonical foldProgress result", () => {
    const g = goal({ progressType: "count", currentValue: 4, targetValue: 10 });
    const model = manualProgressModel(g);
    const preview = previewManualProgress(g, model, 3);
    expect(preview.nextValue).toBe(foldProgress("count", 4, 3, "increment"));
    expect(preview.completes).toBe(false);
  });

  it("detects completion with the canonical domain rule", () => {
    const g = goal({ progressType: "threshold", currentValue: 5, targetValue: 10 });
    const model = manualProgressModel(g);
    const preview = previewManualProgress(g, model, 12);
    expect(preview.nextValue).toBe(12);
    expect(preview.completes).toBe(isGoalCompleted(12, 10, "threshold"));
    expect(preview.completes).toBe(true);
  });
});

describe("quick-add mappings", () => {
  it("matches the unit table", () => {
    const expected: Partial<Record<GoalUnit, number[]>> = {
      workouts: [1, 2],
      repetitions: [1, 5, 10],
      minutes: [5, 10, 30],
      seconds: [10, 30, 60],
      days: [1, 7],
    };
    for (const [unit, values] of Object.entries(expected)) {
      expect(QUICK_ADDS_BY_UNIT[unit as GoalUnit]).toEqual(values);
    }
  });

  it("offers no quick-adds for authoritative (set) goals", () => {
    const model = manualProgressModel({ progressType: "streak", unit: "days" });
    expect(model.mode).toBe("set");
    expect(model.quickAdds).toEqual([]);
  });
});

describe("tracking metadata", () => {
  it("stays pending after building a manual signal", () => {
    const g = goal({ type: "skill", progressType: "boolean", unit: "boolean", metadata: {} });
    const model = manualProgressModel(g);
    const signal = buildManualSignal(model, 1);
    expect(signal).not.toHaveProperty("metadata");
    expect(signal).not.toHaveProperty("sourceId");
    expect(isManualProgressEligible(g)).toBe(true);
    expect(g.metadata).toEqual({});
  });
});
