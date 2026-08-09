// Goals — automatic tracking rules. Pure: no IO, no React, fully unit-testable.
//
// A rule answers one question: "does this activity move this goal, and by how
// much?". It never decides completion (goalRules) and never persists
// (GoalService).

import type { Goal, GoalUnit } from "./goalTypes";
import type { GoalProgressSignal, GoalTrackingSource } from "./goalEvents";
import type {
  GoalActivityEvent,
  GoalActivityEventType,
  GoalTrackingIgnoreReason,
  GoalTrackingMatch,
} from "./goalTrackingTypes";

/* ---------------- Metadata conventions ---------------- */

/**
 * Directional semantics for body goals. Stored in `goal.metadata.direction`
 * — the smallest justified extension: no schema change, no new column.
 *
 * - `increase`: observed progress = measurement - baseline (65 → 70 kg)
 * - `decrease`: observed progress = baseline - measurement (82 → 75 kg)
 * - `reach`   : observed progress = raw measurement (best value wins)
 *
 * For `increase`/`decrease`, `targetValue` is the REQUIRED CHANGE (e.g. 7 kg)
 * and `metadata.baselineValue` is the starting measurement. That keeps the
 * frozen "higher is better" completion rule correct in both directions.
 */
export type GoalDirection = "increase" | "decrease" | "reach";

function str(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(meta: Record<string, unknown>, key: string): number | null {
  const value = meta[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function goalDirection(goal: Goal): GoalDirection {
  const raw = str(goal.metadata, "direction");
  return raw === "increase" || raw === "decrease" ? raw : "reach";
}

export function goalExerciseId(goal: Goal): string | null {
  return str(goal.metadata, "exerciseId");
}

export function goalSkillId(goal: Goal): string | null {
  return str(goal.metadata, "skillId");
}

export function goalMeasurementKey(goal: Goal): string | null {
  return str(goal.metadata, "measurementKey");
}

/** Program goals may count whole programs (default) or training weeks. */
export function goalProgramScope(goal: Goal): "program" | "week" {
  return str(goal.metadata, "scope") === "week" ? "week" : "program";
}

/* ---------------- Time windows ---------------- */

export function toDateKey(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso.slice(0, 10) : date.toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Domain date logic uses UTC date keys everywhere (same convention as the
 * training runtime) — never locale-formatted UI strings.
 */
export function isWithinGoalWindow(goal: Goal, occurredAt: string): boolean {
  const day = toDateKey(occurredAt);
  if (day < goal.startDate) return false;
  if (goal.targetDate && day > goal.targetDate) return false;
  return true;
}

/** Frequency goals count only inside their own window (defaults to 7 days). */
export function isWithinFrequencyWindow(goal: Goal, occurredAt: string): boolean {
  const day = toDateKey(occurredAt);
  if (day < goal.startDate) return false;
  const end = goal.targetDate ?? addDays(goal.startDate, 6);
  return day <= end;
}

/* ---------------- Source identity (idempotency) ---------------- */

export function activitySourceId(event: GoalActivityEvent): string {
  switch (event.type) {
    case "workout_completed":
      return event.workoutId;
    case "exercise_completed":
      return `${event.workoutId}:${event.exerciseId}`;
    case "training_week_completed":
      return `${event.planId}:week-${event.weekNumber}`;
    case "training_program_completed":
      return event.planId;
    case "streak_updated":
      return `${toDateKey(event.occurredAt)}:${event.currentStreak}`;
    case "skill_achieved":
      return event.skillId;
    case "body_measurement_recorded":
      return event.measurementId ?? `${event.measurementKey}:${event.occurredAt}`;
    default:
      return "unknown";
  }
}

const SOURCE_BY_EVENT: Record<GoalActivityEventType, GoalTrackingSource> = {
  workout_completed: "workout_completed",
  exercise_completed: "exercise_completed",
  training_week_completed: "training_week_completed",
  training_program_completed: "training_program_completed",
  streak_updated: "streak_updated",
  skill_achieved: "skill_achieved",
  body_measurement_recorded: "body_measurement_recorded",
};

/* ---------------- Value derivation ---------------- */

function minutesToUnit(minutes: number, unit: GoalUnit): number {
  if (unit === "seconds") return minutes * 60;
  return minutes;
}

/**
 * Threshold semantics ask for the BEST single performance, cumulative/count
 * semantics ask for the TOTAL. Mixing the two is the classic tracking bug.
 */
function exerciseValue(
  goal: Goal,
  event: Extract<GoalActivityEvent, { type: "exercise_completed" }>,
) {
  const best = goal.progressType === "threshold" || goal.progressType === "target_value";
  switch (goal.unit) {
    case "repetitions":
      return best
        ? (event.repetitions ?? null)
        : (event.totalRepetitions ?? event.repetitions ?? null);
    case "seconds":
      return best ? (event.seconds ?? null) : (event.totalSeconds ?? event.seconds ?? null);
    case "minutes": {
      const seconds = event.totalSeconds ?? event.seconds;
      return seconds != null ? seconds / 60 : null;
    }
    case "kilograms":
      return event.weightKg ?? null;
    default:
      return null;
  }
}

export function directionalObservation(goal: Goal, measurement: number): number {
  const direction = goalDirection(goal);
  const baseline = num(goal.metadata, "baselineValue");
  if (direction === "reach" || baseline === null) return Math.max(0, measurement);
  const delta = direction === "decrease" ? baseline - measurement : measurement - baseline;
  return Math.max(0, delta);
}

/* ---------------- Matching ---------------- */

function signal(
  event: GoalActivityEvent,
  value: number,
  mode: "increment" | "set" = "increment",
): GoalProgressSignal {
  return {
    source: SOURCE_BY_EVENT[event.type],
    value,
    mode,
    sourceId: activitySourceId(event),
  };
}

function match(goal: Goal, event: GoalActivityEvent, value: number): GoalTrackingMatch | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return {
    goalId: goal.id,
    sourceEventId: activitySourceId(event),
    sourceEventType: event.type,
    signal: signal(event, value),
  };
}

/**
 * Decides whether an activity applies to a goal.
 * Returns a typed match, or the reason it was ignored.
 */
export function matchGoalToEvent(
  goal: Goal,
  event: GoalActivityEvent,
): GoalTrackingMatch | GoalTrackingIgnoreReason {
  // Automatic tracking only ever touches active goals.
  if (goal.status !== "active") return "not_active";

  const frequency = goal.type === "workout_frequency";
  const inWindow = frequency
    ? isWithinFrequencyWindow(goal, event.occurredAt)
    : isWithinGoalWindow(goal, event.occurredAt);
  if (!inWindow) return "out_of_window";

  switch (event.type) {
    case "workout_completed": {
      if (goal.type === "workout_count" || goal.type === "workout_frequency") {
        return match(goal, event, 1) ?? "no_rule";
      }
      if (goal.type === "training_time") {
        const minutes = event.actualDurationMin ?? event.estimatedDurationMin ?? null;
        if (minutes == null || minutes <= 0) return "no_rule";
        return match(goal, event, minutesToUnit(minutes, goal.unit)) ?? "no_rule";
      }
      return "no_rule";
    }

    case "exercise_completed": {
      if (goal.type !== "strength" && goal.type !== "duration") return "no_rule";
      const exerciseId = goalExerciseId(goal);
      if (!exerciseId || exerciseId !== event.exerciseId) return "no_rule";
      const value = exerciseValue(goal, event);
      if (value == null) return "no_rule";
      return match(goal, event, value) ?? "no_rule";
    }

    case "training_week_completed": {
      if (goal.type !== "program" || goalProgramScope(goal) !== "week") return "no_rule";
      return match(goal, event, 1) ?? "no_rule";
    }

    case "training_program_completed": {
      if (goal.type !== "program" || goalProgramScope(goal) !== "program") return "no_rule";
      return match(goal, event, 1) ?? "no_rule";
    }

    case "streak_updated": {
      if (goal.type !== "streak") return "no_rule";
      // Authoritative value; `streak` folds as best-wins, so a dropped streak
      // never erases the historical best.
      return match(goal, event, event.currentStreak) ?? "no_rule";
    }

    case "skill_achieved": {
      if (goal.type !== "skill") return "no_rule";
      const skillId = goalSkillId(goal);
      if (!skillId || skillId !== event.skillId) return "no_rule";
      return match(goal, event, 1) ?? "no_rule";
    }

    case "body_measurement_recorded": {
      if (goal.type !== "body_weight" && goal.type !== "body_measurement") return "no_rule";
      const key = goalMeasurementKey(goal);
      if (!key || key !== event.measurementKey) return "no_rule";
      const observed = directionalObservation(goal, event.value);
      return match(goal, event, observed) ?? "no_change";
    }

    default:
      return "no_rule";
  }
}

export function isMatch(
  value: GoalTrackingMatch | GoalTrackingIgnoreReason,
): value is GoalTrackingMatch {
  return typeof value !== "string";
}
