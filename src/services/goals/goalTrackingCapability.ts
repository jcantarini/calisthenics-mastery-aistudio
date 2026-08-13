// Goals — canonical tracking-capability selector.
//
// Answers ONE question, truthfully: can this goal currently receive automatic
// activity events? It derives the answer from the same metadata the tracking
// rules require (goalTrackingRules.matchGoalToEvent), so the UI never keeps a
// second, drifting list of "auto tracked" types.
//
// Pure. No IO. It never changes tracking behaviour.

import type { Goal, GoalType } from "./goalTypes";
import { goalExerciseId, goalMeasurementKey, goalSkillId } from "./goalTrackingRules";

/**
 * - `auto`    : the tracking engine already listens for this goal.
 * - `pending` : the goal type is auto-trackable, but the link to a real
 *               exercise / skill / measurement is missing, so no event can
 *               ever match it yet.
 * - `manual`  : the user moves this goal forward.
 */
export type GoalTrackingMode = "auto" | "manual" | "pending";

/** Types the tracking engine matches with no extra metadata required. */
const ALWAYS_AUTO: ReadonlySet<GoalType> = new Set<GoalType>([
  "workout_count",
  "workout_frequency",
  "training_time",
  "streak",
  "program",
]);

export function goalTrackingMode(goal: Pick<Goal, "type" | "metadata">): GoalTrackingMode {
  const probe = { metadata: goal.metadata ?? {} } as Goal;

  if (ALWAYS_AUTO.has(goal.type)) return "auto";

  switch (goal.type) {
    case "strength":
    case "duration":
      return goalExerciseId(probe) ? "auto" : "pending";
    case "skill":
      return goalSkillId(probe) ? "auto" : "pending";
    case "body_weight":
    case "body_measurement":
      return goalMeasurementKey(probe) ? "auto" : "pending";
    case "custom":
    default:
      return "manual";
  }
}

/** True when the user is the only source of progress for this goal. */
export function requiresManualProgress(goal: Pick<Goal, "type" | "metadata">): boolean {
  return goalTrackingMode(goal) !== "auto";
}
