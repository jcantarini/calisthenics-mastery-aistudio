// Goals Engine — pure domain rules. No IO, no React: unit-testable as-is.

import type { Goal, GoalProgress, GoalProgressType, GoalStatus, GoalUnit } from "./goalTypes";

/** Explicit lifecycle. Anything not listed here is invalid. */
export const GOAL_TRANSITIONS: Record<GoalStatus, readonly GoalStatus[]> = {
  draft: ["active", "cancelled"],
  active: ["paused", "completed", "cancelled", "expired"],
  paused: ["active", "cancelled", "expired"],
  // Terminal states. Restarting a completed goal is an explicit duplicate.
  completed: [],
  cancelled: [],
  expired: [],
};

export function validateGoalTransition(from: GoalStatus, to: GoalStatus): boolean {
  if (from === to) return false;
  return GOAL_TRANSITIONS[from].includes(to);
}

/** Statuses whose progress may still move. */
export function acceptsProgress(status: GoalStatus): boolean {
  return status === "active" || status === "draft";
}

/**
 * Normalizes a raw achievement value for storage.
 * Boolean goals collapse to 0/1; everything else keeps the raw value
 * (a 12/10 pull-up result is meaningful) but can never go negative.
 */
export function normalizeGoalProgress(progressType: GoalProgressType, value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (progressType === "boolean") return value >= 1 ? 1 : 0;
  return Math.max(0, value);
}

/**
 * How a new observation folds into the stored value.
 * - count / cumulative / duration: accumulate.
 * - threshold / target_value / streak / boolean: best observed value wins.
 */
export function foldProgress(
  progressType: GoalProgressType,
  current: number,
  incoming: number,
  mode: "increment" | "set" = "increment",
): number {
  const safeIncoming = normalizeGoalProgress(progressType, incoming);
  if (mode === "set") return safeIncoming;
  switch (progressType) {
    case "count":
    case "cumulative":
    case "duration":
      return normalizeGoalProgress(progressType, current + safeIncoming);
    case "threshold":
    case "target_value":
    case "streak":
    case "boolean":
      return Math.max(normalizeGoalProgress(progressType, current), safeIncoming);
    default:
      return safeIncoming;
  }
}

/** Clamped 0-100 percentage, safe for UI. */
export function calculateGoalProgress(
  currentValue: number,
  targetValue: number,
  progressType: GoalProgressType,
): number {
  if (progressType === "boolean") return currentValue >= 1 ? 100 : 0;
  if (!Number.isFinite(targetValue) || targetValue <= 0) return 0;
  const pct = (normalizeGoalProgress(progressType, currentValue) / targetValue) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

export function isGoalCompleted(
  currentValue: number,
  targetValue: number,
  progressType: GoalProgressType,
): boolean {
  if (progressType === "boolean") return currentValue >= 1;
  if (targetValue <= 0) return false;
  return normalizeGoalProgress(progressType, currentValue) >= targetValue;
}

export function isGoalExpired(
  goal: Pick<Goal, "targetDate" | "status">,
  now: Date = new Date(),
): boolean {
  if (goal.status === "completed" || goal.status === "cancelled" || goal.status === "expired") {
    return false;
  }
  if (!goal.targetDate) return false;
  const target = new Date(`${goal.targetDate}T23:59:59.999Z`);
  if (Number.isNaN(target.getTime())) return false;
  return now.getTime() > target.getTime();
}

/** Units allowed per progress semantics. Guards nonsense like "plank in kg". */
export const UNITS_BY_PROGRESS_TYPE: Record<GoalProgressType, readonly GoalUnit[]> = {
  count: ["workouts", "repetitions", "days"],
  threshold: ["repetitions", "seconds", "kilograms", "centimeters", "percentage"],
  duration: ["seconds", "minutes"],
  cumulative: ["minutes", "seconds", "workouts", "repetitions"],
  streak: ["days"],
  target_value: ["kilograms", "centimeters", "percentage", "repetitions"],
  boolean: ["boolean"],
};

export function isUnitAllowed(progressType: GoalProgressType, unit: GoalUnit): boolean {
  return UNITS_BY_PROGRESS_TYPE[progressType].includes(unit);
}

export function buildGoalProgress(goal: Goal): GoalProgress {
  const percentage = calculateGoalProgress(goal.currentValue, goal.targetValue, goal.progressType);
  return {
    goalId: goal.id,
    currentValue: Math.min(goal.currentValue, goal.targetValue),
    rawValue: goal.currentValue,
    targetValue: goal.targetValue,
    unit: goal.unit,
    percentage,
    remaining: Math.max(0, goal.targetValue - goal.currentValue),
    completed:
      goal.status === "completed" ||
      isGoalCompleted(goal.currentValue, goal.targetValue, goal.progressType),
  };
}
