// Player Progression Engine public entry point.
// Importing this module guarantees the engine is subscribed to the XP bus.

import { registerProgressionEngine } from "./ProgressionService";

registerProgressionEngine();

export { ProgressionService, registerProgressionEngine } from "./ProgressionService";
export {
  DEFAULT_LEVEL_CURVE,
  buildLevelTable,
  clampLevel,
  isMaxLevel,
  levelForXP,
  levelIncrement,
  xpForLevel,
} from "./levelCurve";
export {
  buildResult,
  calculateLevel,
  emptyProgression,
  eventTypeForTransition,
  nextProgression,
  snapshotForXP,
} from "./levelRules";
export {
  clearProgressionListeners,
  emitProgressionEvent,
  emitProgressionEventAsync,
  onProgressionEvent,
} from "./progressionEvents";
export type {
  LevelCurveConfig,
  LevelHistoryEntry,
  LevelSnapshot,
  LevelUpResult,
  PlayerProfileStats,
  PlayerProgression,
  ProgressionEvent,
  ProgressionEventListener,
  ProgressionEventType,
} from "./levelTypes";
