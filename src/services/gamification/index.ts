// Gamification Orchestrator public entry point.
// React and services should import from here.

export {
  GamificationOrchestrator,
  createGamificationOrchestrator,
} from "./GamificationOrchestrator";
export type { GamificationOrchestratorInstance } from "./GamificationOrchestrator";
export {
  clearGamificationListeners,
  emitGamificationResult,
  emitGamificationResultAsync,
  onGamificationResult,
} from "./gamificationEvents";
export {
  buildMessages,
  buildNextGoal,
  emptyResult,
  finalize,
  toAchievementEvents,
  toXPEvents,
  withAchievements,
  withError,
  withPluginOutput,
  withProgression,
  withStats,
  withWeekly,
  withXP,
} from "./gamificationResults";
export type {
  AchievementEnginePort,
  GamificationEngines,
  GamificationEvent,
  GamificationEventType,
  GamificationListener,
  GamificationMessage,
  GamificationMessageKind,
  GamificationPluginContext,
  GamificationPluginOutput,
  GamificationPluginPort,
  GamificationResult,
  GamificationStage,
  GamificationStageError,
  NextGoal,
  ProgressionEnginePort,
  TrainingEnginePort,
  XPEnginePort,
} from "./gamificationTypes";
