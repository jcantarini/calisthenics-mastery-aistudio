// Goals — automatic tracking contracts (Sprint 7.2).
// Tracking DETECTS progress. It never persists goal state itself:
// GoalService remains the single source of truth.

import type { GoalProgressSignal } from "./goalEvents";
import type { Goal } from "./goalTypes";

/* ---------------- Activity events ---------------- */

export type GoalActivityEventType =
  | "workout_completed"
  | "exercise_completed"
  | "training_week_completed"
  | "training_program_completed"
  | "streak_updated"
  | "skill_achieved"
  | "body_measurement_recorded";

interface BaseActivityEvent {
  /** ISO timestamp of when the activity happened (authoritative, not UI time). */
  occurredAt: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkoutCompletedActivity extends BaseActivityEvent {
  type: "workout_completed";
  /** Stable id of the completed workout — drives idempotency. */
  workoutId: string;
  planId?: string | null;
  /** Real measured duration. Preferred over the estimate when present. */
  actualDurationMin?: number | null;
  estimatedDurationMin?: number | null;
}

export interface ExerciseCompletedActivity extends BaseActivityEvent {
  type: "exercise_completed";
  /** Stable identifier (slug), never translated display text. */
  exerciseId: string;
  workoutId: string;
  /** Best single-set performance observed in this workout. */
  repetitions?: number | null;
  seconds?: number | null;
  weightKg?: number | null;
  /** Sum over the whole workout, used by cumulative goals. */
  totalRepetitions?: number | null;
  totalSeconds?: number | null;
}

export interface TrainingWeekCompletedActivity extends BaseActivityEvent {
  type: "training_week_completed";
  planId: string;
  weekNumber: number;
}

export interface TrainingProgramCompletedActivity extends BaseActivityEvent {
  type: "training_program_completed";
  planId: string;
  programSlug?: string | null;
}

export interface StreakUpdatedActivity extends BaseActivityEvent {
  type: "streak_updated";
  /** Authoritative current streak, never a "+1" hint. */
  currentStreak: number;
}

export interface SkillAchievedActivity extends BaseActivityEvent {
  type: "skill_achieved";
  /** Stable skill identifier (e.g. "handstand"). */
  skillId: string;
}

export interface BodyMeasurementRecordedActivity extends BaseActivityEvent {
  type: "body_measurement_recorded";
  /** Stable measurement key, e.g. "body_weight", "waist", "chest". */
  measurementKey: string;
  value: number;
  unit: "kilograms" | "centimeters" | "percentage";
  /** Stable id of the measurement record when the producer has one. */
  measurementId?: string | null;
}

export type GoalActivityEvent =
  | WorkoutCompletedActivity
  | ExerciseCompletedActivity
  | TrainingWeekCompletedActivity
  | TrainingProgramCompletedActivity
  | StreakUpdatedActivity
  | SkillAchievedActivity
  | BodyMeasurementRecordedActivity;

/* ---------------- Matching ---------------- */

export type GoalTrackingIgnoreReason =
  | "not_active"
  | "out_of_window"
  | "no_rule"
  | "already_processed"
  | "no_change";

/** A rule decided this event moves this goal by this observation. */
export interface GoalTrackingMatch {
  goalId: string;
  sourceEventId: string;
  sourceEventType: GoalActivityEventType;
  signal: GoalProgressSignal;
}

/* ---------------- Result ---------------- */

export interface GoalTrackingUpdate {
  goalId: string;
  previousValue: number;
  currentValue: number;
  delta: number;
  completed: boolean;
}

export interface GoalTrackingIgnored {
  goalId: string;
  reason: GoalTrackingIgnoreReason;
}

export interface GoalTrackingError {
  goalId: string | null;
  message: string;
}

export interface GoalTrackingResult {
  eventId: string;
  eventType: GoalActivityEventType | "reconcile";
  processedGoals: number;
  updatedGoals: GoalTrackingUpdate[];
  completedGoals: Goal[];
  ignoredGoals: GoalTrackingIgnored[];
  errors: GoalTrackingError[];
}

/* ---------------- Ports (injectable for tests) ---------------- */

export interface GoalTrackingGoalsPort {
  getActiveGoals(userId?: string): Promise<Goal[]>;
  getGoal(goalId: string, userId?: string): Promise<Goal | null>;
  updateGoalProgress(goalId: string, signal: GoalProgressSignal, userId?: string): Promise<Goal>;
}

export interface GoalTrackingLedgerEntry {
  userId: string;
  goalId: string;
  sourceEventId: string;
  sourceEventType: string;
  observedValue: number;
}

export interface GoalTrackingLedgerPort {
  /** Returns false when this (goal, event) pair was already processed. */
  claim(entry: GoalTrackingLedgerEntry): Promise<boolean>;
  /** Releases a claim so a failed application can be retried safely. */
  release(goalId: string, sourceEventId: string, sourceEventType: string): Promise<void>;
  /** Records the applied delta once the update succeeded. */
  settle(
    goalId: string,
    sourceEventId: string,
    sourceEventType: string,
    delta: number,
  ): Promise<void>;
}

export interface GoalTrackingDeps {
  goals: GoalTrackingGoalsPort;
  ledger: GoalTrackingLedgerPort;
  resolveUserId(userId?: string): Promise<string>;
}
