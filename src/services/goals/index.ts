// Goals domain public entry point.

export { GoalService } from "./GoalService";
export { GoalTrackingService, createGoalTrackingService } from "./GoalTrackingService";
export type { GoalTrackingServiceInstance } from "./GoalTrackingService";
export {
  activitySourceId,
  directionalObservation,
  goalDirection,
  goalExerciseId,
  goalMeasurementKey,
  goalProgramScope,
  goalSkillId,
  isMatch,
  isWithinFrequencyWindow,
  isWithinGoalWindow,
  matchGoalToEvent,
} from "./goalTrackingRules";
export type { GoalDirection } from "./goalTrackingRules";
export type {
  GoalActivityEvent,
  GoalActivityEventType,
  GoalTrackingDeps,
  GoalTrackingError,
  GoalTrackingGoalsPort,
  GoalTrackingIgnored,
  GoalTrackingIgnoreReason,
  GoalTrackingLedgerEntry,
  GoalTrackingLedgerPort,
  GoalTrackingMatch,
  GoalTrackingResult,
  GoalTrackingUpdate,
} from "./goalTrackingTypes";
export {
  GOAL_TRANSITIONS,
  UNITS_BY_PROGRESS_TYPE,
  acceptsProgress,
  buildGoalProgress,
  calculateGoalProgress,
  foldProgress,
  isGoalCompleted,
  isGoalExpired,
  isUnitAllowed,
  normalizeGoalProgress,
  validateGoalTransition,
} from "./goalRules";
export {
  validateCompletionInvariant,
  validateCreateGoal,
  validateUpdateGoal,
} from "./goalValidation";
export type { ValidationResult } from "./goalValidation";
export { clearGoalListeners, emitGoalEvent, emitGoalEventAsync, onGoalEvent } from "./goalEvents";
export type {
  GoalEvent,
  GoalEventListener,
  GoalEventType,
  GoalProgressSignal,
  GoalTrackingSource,
} from "./goalEvents";
export {
  GOAL_CATEGORIES,
  GOAL_PROGRESS_TYPES,
  GOAL_STATUSES,
  GOAL_TYPES,
  GOAL_UNITS,
  GoalError,
} from "./goalTypes";
export type {
  CreateGoalInput,
  Goal,
  GoalCategory,
  GoalErrorCode,
  GoalMetadata,
  GoalProgress,
  GoalProgressType,
  GoalQuery,
  GoalStatus,
  GoalType,
  GoalUnit,
  UpdateGoalInput,
} from "./goalTypes";
