// Goals Engine — domain types. No React, no UI, no persistence details.

/** What the goal is about, semantically. */
export const GOAL_TYPES = [
  "workout_frequency",
  "workout_count",
  "streak",
  "strength",
  "duration",
  "training_time",
  "program",
  "skill",
  "body_weight",
  "body_measurement",
  "custom",
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

/** Grouping used by UI and future filters. */
export const GOAL_CATEGORIES = [
  "fitness",
  "strength",
  "consistency",
  "skill",
  "program",
  "body",
  "custom",
] as const;
export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

/**
 * How progress behaves. This is the discriminator that drives every
 * calculation — never infer behaviour from the title or the type alone.
 */
export const GOAL_PROGRESS_TYPES = [
  "count",
  "threshold",
  "duration",
  "cumulative",
  "streak",
  "target_value",
  "boolean",
] as const;
export type GoalProgressType = (typeof GOAL_PROGRESS_TYPES)[number];

/** Units keep raw numbers unambiguous. */
export const GOAL_UNITS = [
  "workouts",
  "repetitions",
  "seconds",
  "minutes",
  "days",
  "kilograms",
  "centimeters",
  "percentage",
  "boolean",
] as const;
export type GoalUnit = (typeof GOAL_UNITS)[number];

export const GOAL_STATUSES = [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
  "expired",
] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

/**
 * Explicit effort tier of a goal (Sprint 7.3). It is NEVER inferred from the
 * title, description or target value. Goals only declare it; the XP Engine
 * owns what it is worth.
 */
export const GOAL_DIFFICULTIES = ["easy", "medium", "hard", "epic"] as const;
export type GoalDifficulty = (typeof GOAL_DIFFICULTIES)[number];

/** Safe default for goals created before difficulty existed. */
export const DEFAULT_GOAL_DIFFICULTY: GoalDifficulty = "medium";

export function isGoalDifficulty(value: unknown): value is GoalDifficulty {
  return typeof value === "string" && (GOAL_DIFFICULTIES as readonly string[]).includes(value);
}

/** Free-form context. Typed as unknown values — never `any`. */
export type GoalMetadata = Record<string, unknown>;


export interface Goal {
  id: string;
  userId: string;
  type: GoalType;
  category: GoalCategory;
  progressType: GoalProgressType;
  title: string;
  description: string | null;
  targetValue: number;
  currentValue: number;
  unit: GoalUnit;
  status: GoalStatus;
  /** Explicit effort tier. Drives Goal completion XP through the XP Engine. */
  difficulty: GoalDifficulty;
  /** ISO date (yyyy-mm-dd). */
  startDate: string;
  /** ISO date (yyyy-mm-dd) or null when the goal is open-ended. */
  targetDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: GoalMetadata;
}

export interface CreateGoalInput {
  type: GoalType;
  category: GoalCategory;
  progressType: GoalProgressType;
  title: string;
  description?: string | null;
  targetValue: number;
  currentValue?: number;
  unit: GoalUnit;
  status?: Extract<GoalStatus, "draft" | "active">;
  /** Defaults to `medium` when the caller does not declare it. */
  difficulty?: GoalDifficulty;
  startDate?: string;
  targetDate?: string | null;
  metadata?: GoalMetadata;
  userId?: string;
}

/** Only editable fields. Status changes go through the lifecycle methods. */
export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  targetValue?: number;
  unit?: GoalUnit;
  difficulty?: GoalDifficulty;
  targetDate?: string | null;
  metadata?: GoalMetadata;
}

export interface GoalProgress {
  goalId: string;
  currentValue: number;
  targetValue: number;
  unit: GoalUnit;
  /** Clamped 0-100, safe for progress bars. */
  percentage: number;
  /** Raw achievement value, may exceed targetValue when meaningful. */
  rawValue: number;
  remaining: number;
  completed: boolean;
}

export interface GoalQuery {
  status?: GoalStatus | GoalStatus[];
  category?: GoalCategory;
  type?: GoalType;
  limit?: number;
}

/** Typed domain error so UI never sees raw database messages. */
export type GoalErrorCode =
  | "validation_failed"
  | "invalid_transition"
  | "not_found"
  | "unauthenticated"
  | "persistence_failed";

export class GoalError extends Error {
  readonly code: GoalErrorCode;
  readonly details?: string[];

  constructor(code: GoalErrorCode, message: string, details?: string[]) {
    super(message);
    this.name = "GoalError";
    this.code = code;
    this.details = details;
  }
}
