// Achievements Engine — pure rules. Deterministic, side-effect free, testable.

import { ACHIEVEMENT_CATALOG } from "./achievementCatalog";
import type {
  AchievementDefinition,
  AchievementEvent,
  AchievementMetric,
  AchievementProgress,
  MetricUpdate,
} from "./achievementTypes";

const SKILL_METRIC: Record<string, AchievementMetric> = {
  l_sit: "skill_l_sit",
  handstand: "skill_handstand",
  muscle_up: "skill_muscle_up",
  front_lever: "skill_front_lever",
  back_lever: "skill_back_lever",
  human_flag: "skill_human_flag",
  planche: "skill_planche",
};

/** Translate a domain event into metric updates. Pure. */
export function deriveMetricUpdates(event: AchievementEvent): MetricUpdate[] {
  const p = event.payload ?? {};
  const updates: MetricUpdate[] = [];

  const reps = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

  switch (event.type) {
    case "ProfileCompleted":
      updates.push({ metric: "profile_completed", value: 1, mode: "absolute" });
      break;
    case "AssessmentCompleted":
      updates.push({ metric: "assessment_completed", value: 1, mode: "absolute" });
      break;
    case "WorkoutCompleted":
      updates.push({ metric: "workouts_completed", value: 1, mode: "increment" });
      break;
    case "TrainingWeekCompleted":
      updates.push({ metric: "weeks_completed", value: 1, mode: "increment" });
      break;
    case "TrainingProgramCompleted":
      updates.push({ metric: "programs_completed", value: 1, mode: "increment" });
      break;
    case "GoalCompleted":
      updates.push({ metric: "goals_completed", value: 1, mode: "increment" });
      break;
    case "StreakUpdated":
      updates.push({ metric: "streak_days", value: reps(p.streakDays), mode: "absolute" });
      break;
    case "SkillMarkedAchieved": {
      const metric = p.skill ? SKILL_METRIC[p.skill] : undefined;
      if (metric) updates.push({ metric, value: 1, mode: "absolute" });
      break;
    }
    case "WorkoutStarted":
      break;
    default:
      break;
  }

  // Rep/duration payloads may ride along with any event (exercise or PR).
  if (reps(p.pushups)) {
    updates.push({ metric: "pushups_total", value: reps(p.pushups), mode: "increment" });
  }
  if (reps(p.pullups)) {
    updates.push({ metric: "pullups_total", value: reps(p.pullups), mode: "increment" });
    updates.push({ metric: "pullups_session", value: reps(p.pullups), mode: "max" });
  }
  if (reps(p.plankSeconds)) {
    updates.push({
      metric: "plank_seconds_session",
      value: reps(p.plankSeconds),
      mode: "max",
    });
  }

  return updates;
}

/** Achievements listening to a given metric. Pure. */
export function achievementsForMetric(metric: AchievementMetric): AchievementDefinition[] {
  return ACHIEVEMENT_CATALOG.filter((a) => a.metric === metric);
}

/** Apply one metric update to a stored value. Pure. */
export function applyUpdate(current: number, update: MetricUpdate): number {
  switch (update.mode) {
    case "increment":
      return current + update.value;
    case "max":
      return Math.max(current, update.value);
    case "absolute":
      return update.value;
  }
}

export function clampPercentage(current: number, target: number): number {
  if (target <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

/** Threshold detection. Pure. */
export function isConditionMet(definition: AchievementDefinition, value: number): boolean {
  return value >= definition.target;
}

export function buildProgress(
  definition: AchievementDefinition,
  currentValue: number,
  unlockedAt: string | null,
): AchievementProgress {
  return {
    achievementId: definition.id,
    currentValue,
    targetValue: definition.target,
    percentage: clampPercentage(currentValue, definition.target),
    unlocked: unlockedAt !== null,
    unlockedAt,
  };
}

/**
 * Streak metrics are absolute and may decrease; an already unlocked
 * achievement must never be re-locked.
 */
export function shouldUnlock(
  definition: AchievementDefinition,
  value: number,
  alreadyUnlocked: boolean,
): boolean {
  return !alreadyUnlocked && isConditionMet(definition, value);
}

/** Hidden achievements stay out of listings until unlocked. */
export function isVisible(definition: AchievementDefinition, unlocked: boolean): boolean {
  return !definition.hidden || unlocked;
}
