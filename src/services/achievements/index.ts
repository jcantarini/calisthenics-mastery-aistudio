// Achievements Engine public entry point.
// Importing this module guarantees the engine is wired to the event bus.

import { registerAchievementEngine } from "./AchievementService";

registerAchievementEngine();

export { AchievementService, registerAchievementEngine } from "./AchievementService";
export {
  emitAchievementEvent,
  emitAchievementEventAsync,
  onAchievementUnlocked,
} from "./achievementEvents";
export {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_CATEGORIES,
  achievementsByCategory,
  getAchievement,
} from "./achievementCatalog";
export {
  achievementsForMetric,
  applyUpdate,
  buildProgress,
  clampPercentage,
  deriveMetricUpdates,
  isConditionMet,
  isVisible,
  shouldUnlock,
} from "./achievementRules";
export type {
  AchievementCategory,
  AchievementDefinition,
  AchievementEvent,
  AchievementEventType,
  AchievementMetric,
  AchievementProgress,
  AchievementProgressType,
  AchievementRarity,
  AchievementUnlockResult,
  CategoryProgress,
  MetricUpdate,
  SkillSlug,
  UserAchievement,
} from "./achievementTypes";
