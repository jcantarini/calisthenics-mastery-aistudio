// Goals UI — manual progress presentation/adapter model (Sprint 7.4B-2).
//
// PURE. No React, no Supabase, no domain rules re-implemented: previews and
// completion come from the canonical Goals helpers (foldProgress /
// isGoalCompleted). This module only decides how the manual editor behaves.

import type { GoalProgressSignal } from "@/services/goals/goalEvents";
import { foldProgress, isGoalCompleted } from "@/services/goals/goalRules";
import { goalTrackingMode } from "@/services/goals/goalTrackingCapability";
import type { Goal, GoalProgressType, GoalUnit } from "@/services/goals/goalTypes";
import { parseDecimalInput } from "./numericInput";

export type ManualSignalMode = "increment" | "set";
export type ManualInputKind = "numeric" | "boolean";

type EligibilityGoal = Pick<Goal, "status" | "type" | "metadata">;

/**
 * Manual controls exist only for ACTIVE goals the tracking engine cannot feed
 * yet. Drafts must be activated and paused goals resumed first.
 */
export function isManualProgressEligible(goal: EligibilityGoal): boolean {
  if (goal.status !== "active") return false;
  const mode = goalTrackingMode(goal);
  return mode === "manual" || mode === "pending";
}

/* ---------------- Signal mode ---------------- */

const SIGNAL_MODE: Record<GoalProgressType, ManualSignalMode> = {
  count: "increment",
  cumulative: "increment",
  duration: "increment",
  threshold: "set",
  target_value: "set",
  streak: "set",
  boolean: "set",
};

export function manualSignalMode(progressType: GoalProgressType): ManualSignalMode {
  return SIGNAL_MODE[progressType];
}

/* ---------------- Units ---------------- */

/** Units that accept decimals; everything else stays integer-oriented. */
const DECIMAL_UNITS: ReadonlySet<GoalUnit> = new Set<GoalUnit>([
  "kilograms",
  "centimeters",
  "percentage",
]);

export function isDecimalUnit(unit: GoalUnit): boolean {
  return DECIMAL_UNITS.has(unit);
}

/** Presentation-only shortcuts. Never a domain rule. */
export const QUICK_ADDS_BY_UNIT: Record<GoalUnit, readonly number[]> = {
  workouts: [1, 2],
  repetitions: [1, 5, 10],
  minutes: [5, 10, 30],
  seconds: [10, 30, 60],
  days: [1, 7],
  kilograms: [],
  centimeters: [],
  percentage: [],
  boolean: [],
};

export function quickAddsFor(unit: GoalUnit, mode: ManualSignalMode): readonly number[] {
  if (mode !== "increment") return [];
  return QUICK_ADDS_BY_UNIT[unit] ?? [];
}

/* ---------------- Model ---------------- */

export interface ManualProgressModel {
  progressType: GoalProgressType;
  unit: GoalUnit;
  mode: ManualSignalMode;
  input: ManualInputKind;
  /** Minimum accepted value: increments need > 0, sets accept 0. */
  min: number;
  step: number;
  decimal: boolean;
  quickAdds: readonly number[];
  /** i18n key describing what the value means. */
  labelKey: string;
}

export function manualProgressModel(
  goal: Pick<Goal, "progressType" | "unit">,
): ManualProgressModel {
  const mode = manualSignalMode(goal.progressType);
  const decimal = isDecimalUnit(goal.unit);
  const input: ManualInputKind = goal.progressType === "boolean" ? "boolean" : "numeric";
  return {
    progressType: goal.progressType,
    unit: goal.unit,
    mode,
    input,
    min: mode === "increment" ? 1 : 0,
    step: decimal ? 0.1 : 1,
    decimal,
    quickAdds: quickAddsFor(goal.unit, mode),
    labelKey: mode === "increment" ? "gl.mp.addLabel" : "gl.mp.setLabel",
  };
}

/* ---------------- Validation ---------------- */

export type ManualValidation =
  | { ok: true; value: number }
  | { ok: false; errorKey: "gl.mp.err.required" | "gl.mp.err.positive" | "gl.mp.err.integer" };

export function validateManualValue(
  model: ManualProgressModel,
  raw: string | number,
): ManualValidation {
  if (model.input === "boolean") return { ok: true, value: 1 };
  // Locale-neutral parsing (comma or period) shared with the creation wizard.
  const value = parseDecimalInput(raw);
  if (value === null) return { ok: false, errorKey: "gl.mp.err.required" };
  if (model.mode === "increment" ? value <= 0 : value < 0) {
    return { ok: false, errorKey: "gl.mp.err.positive" };
  }
  if (!model.decimal && !Number.isInteger(value)) {
    return { ok: false, errorKey: "gl.mp.err.integer" };
  }
  return { ok: true, value };
}

/* ---------------- Preview ---------------- */

export interface ManualProgressPreview {
  currentValue: number;
  nextValue: number;
  completes: boolean;
}

/** Uses the canonical domain fold — never a second progress formula. */
export function previewManualProgress(
  goal: Pick<Goal, "progressType" | "currentValue" | "targetValue">,
  model: ManualProgressModel,
  value: number,
): ManualProgressPreview {
  const nextValue = foldProgress(goal.progressType, goal.currentValue, value, model.mode);
  return {
    currentValue: goal.currentValue,
    nextValue,
    completes: isGoalCompleted(nextValue, goal.targetValue, goal.progressType),
  };
}

/* ---------------- Signal ---------------- */

/** Manual signals carry no invented source id and no metadata. */
export function buildManualSignal(model: ManualProgressModel, value: number): GoalProgressSignal {
  return {
    source: "manual",
    mode: model.mode,
    value: model.input === "boolean" ? 1 : value,
  };
}
