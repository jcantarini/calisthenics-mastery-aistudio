// Achievements Engine — domain types. No React, no UI, no Supabase.

export type AchievementCategory =
  | "onboarding"
  | "workouts"
  | "consistency"
  | "programs"
  | "strength"
  | "skills"
  | "goals";

export type AchievementRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/**
 * How progress toward the target is computed.
 * - boolean:  0 -> 1, a flag flip (profile completed, skill achieved)
 * - cumulative: values accumulate over time (total workouts, total push-ups)
 * - session: best value inside a single session (10 pull-ups in one workout)
 * - streak: latest streak value (absolute, may go down)
 * - duration: best duration in seconds (plank hold)
 * - percentage: absolute 0..target progression value
 */
export type AchievementProgressType =
  | "boolean"
  | "cumulative"
  | "session"
  | "streak"
  | "duration"
  | "percentage";

/**
 * Metric a achievement listens to. Events are translated into metric updates,
 * so a single evaluation pipeline serves every achievement.
 */
export type AchievementMetric =
  | "profile_completed"
  | "assessment_completed"
  | "workouts_completed"
  | "streak_days"
  | "weeks_completed"
  | "programs_completed"
  | "pushups_total"
  | "pullups_total"
  | "pullups_session"
  | "plank_seconds_session"
  | "goals_completed"
  | "skill_l_sit"
  | "skill_handstand"
  | "skill_muscle_up"
  | "skill_front_lever"
  | "skill_back_lever"
  | "skill_human_flag"
  | "skill_planche";

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  /** i18n key for the user facing title. */
  titleKey: string;
  /** i18n key for the user facing description. */
  descriptionKey: string;
  /** Interpolation values for the description key. */
  descriptionVars?: Record<string, string | number>;
  /** Icon identifier resolved by the presentation layer. */
  icon: string;
  metric: AchievementMetric;
  progressType: AchievementProgressType;
  target: number;
  xpReward: number;
  rarity: AchievementRarity;
  hidden: boolean;
}

/* ---------------- Events ---------------- */

export type AchievementEventType =
  | "ProfileCompleted"
  | "AssessmentCompleted"
  | "WorkoutStarted"
  | "WorkoutCompleted"
  | "ExerciseCompleted"
  | "PersonalRecordCreated"
  | "TrainingWeekCompleted"
  | "TrainingProgramCompleted"
  | "StreakUpdated"
  | "GoalCompleted"
  | "SkillMarkedAchieved";

export type SkillSlug =
  | "l_sit"
  | "handstand"
  | "muscle_up"
  | "front_lever"
  | "back_lever"
  | "human_flag"
  | "planche";

export interface AchievementEvent {
  type: AchievementEventType;
  /** Stable id of the origin (workout id, plan id, goal id...). */
  sourceId?: string | null;
  userId?: string;
  payload?: {
    /** Repetitions performed for a given exercise family in this event. */
    pushups?: number;
    pullups?: number;
    /** Best hold in seconds recorded in this event. */
    plankSeconds?: number;
    /** Current streak length in days. */
    streakDays?: number;
    skill?: SkillSlug;
    /** Authoritative number of goals completed by the user so far. */
    goalsCompleted?: number;
    [key: string]: unknown;
  };
}

export type MetricUpdateMode = "increment" | "absolute" | "max";

export interface MetricUpdate {
  metric: AchievementMetric;
  value: number;
  mode: MetricUpdateMode;
}

/* ---------------- Progress / unlocks ---------------- */

export interface AchievementProgress {
  achievementId: string;
  currentValue: number;
  targetValue: number;
  percentage: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface UserAchievement extends AchievementProgress {
  definition: AchievementDefinition;
  xpAwarded: number;
}

/** Data contract consumed by a future unlock toast/modal. */
export interface AchievementUnlockResult {
  achievement: AchievementDefinition;
  xpEarned: number;
  titleKey: string;
  descriptionKey: string;
  descriptionVars?: Record<string, string | number>;
  icon: string;
  rarity: AchievementRarity;
  unlockedAt: string;
}

export interface CategoryProgress {
  category: AchievementCategory;
  total: number;
  unlocked: number;
  percentage: number;
}

export type AchievementEventListener = (unlocks: AchievementUnlockResult[]) => void | Promise<void>;
