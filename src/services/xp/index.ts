// XP Engine public entry point.
// Importing this module guarantees the engine is subscribed to the event bus.

import { registerXPEngine } from "./XPService";

registerXPEngine();

export { XPService, registerXPEngine } from "./XPService";
export { emitXPEvent, emitXPEventAsync, notifyXPApplied, onXPApplied, onXPEvent } from "./xpEvents";
export type { XPAppliedListener, XPAppliedPayload } from "./xpEvents";

export {
  DEFAULT_GOAL_DIFFICULTY_TIER,
  GOAL_COMPLETION_XP,
  XP_REWARDS,
  XP_REASONS,
  goalCompletionSourceId,
  goalCompletionXP,
  isGoalDifficultyTier,
  levelForXP,
  levelProgress,
  xpForLevel,
} from "./xpRules";
export type {
  GoalDifficultyTier,
  UserXPStats,
  XPAwardResult,
  XPEntry,
  XPEvent,
  XPEventListener,
  XPEventType,
} from "./xpTypes";
