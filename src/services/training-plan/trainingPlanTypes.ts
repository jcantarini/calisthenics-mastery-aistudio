// Shared types for the Training Plan Service (generation + runtime).

import type { GeneratedWorkout, Difficulty } from "@/services/workout-generator/workoutTypes";
import type { PrimaryGoal, SkillGoal, FitnessLevel } from "@/lib/onboarding";

/* ---------------- Lifecycle ---------------- */

export type PlanStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "regenerated"
  | "expired"
  | "archived";

export const PLAN_STATUSES: PlanStatus[] = [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
  "regenerated",
  "expired",
  "archived",
];

/** Statuses a plan can still be executed from. */
export const RUNNABLE_STATUSES: PlanStatus[] = ["draft", "active", "paused"];

export type WorkoutStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "completed"
  | "skipped"
  | "missed";

export type DayType = "workout" | "recovery";

/* ---------------- Entities ---------------- */

export interface PlannedWorkout extends GeneratedWorkout {
  id?: string;
  planId: string;
  weekNumber: number;
  dayNumber: number;
  isCompleted: boolean;
  completedAt?: string | null;
  startedAt?: string | null;
  scheduledDate?: string | null;
  status: WorkoutStatus;
  progressionData?: ProgressionData;
}

export interface ProgressionData {
  strategy: "base" | "volume" | "intensity" | "deload" | "skill";
  setsDelta?: number;
  repsDelta?: number;
  restDeltaSec?: number;
  notes?: string;
}

export interface TrainingDay {
  id?: string;
  weekNumber: number;
  dayNumber: number; // 1..7 (Mon..Sun)
  dayType: DayType;
  plannedWorkoutId?: string | null;
  scheduledDate?: string | null;
  completed: boolean;
  completedAt?: string | null;
  notes?: string | null;
}

export interface TrainingWeek {
  id?: string;
  weekNumber: number;
  objective: string;
  difficulty: Difficulty;
  estimatedDurationMin: number;
  workoutDaysCount: number;
  recoveryDaysCount: number;
  isDeload: boolean;
  days: TrainingDay[];
  workouts: PlannedWorkout[];
}

export interface TrainingPlan {
  id: string;
  userId: string;
  name: string;
  description: string;
  programSlug: string;
  programTitle: string;
  primaryGoal?: PrimaryGoal | null;
  targetSkill?: SkillGoal | null;
  fitnessLevel?: FitnessLevel | null;
  difficulty: Difficulty;
  totalWeeks: number;
  currentWeek: number;
  currentDay: number;
  daysPerWeek: number;
  workoutDurationMin: number;
  status: PlanStatus;
  isActive: boolean;
  startedAt?: string | null;
  startDate?: string | null;
  completedWorkouts: number;
  completedWeeks: number;
  lastWorkoutDate?: string | null;
  nextWorkoutDate?: string | null;
  progressPercentage: number;
  weeks: TrainingWeek[];
}

/* ---------------- Progress ---------------- */

export interface WeeklyProgress {
  weekNumber: number;
  objective: string;
  isDeload: boolean;
  totalWorkouts: number;
  completedWorkouts: number;
  remainingWorkouts: number;
  recoveryDays: number;
  percentage: number;
}

export interface OverallProgress {
  totalWeeks: number;
  completedWeeks: number;
  totalWorkouts: number;
  completedWorkouts: number;
  remainingWorkouts: number;
  skippedWorkouts: number;
  missedWorkouts: number;
  recoveryDays: number;
  percentage: number;
  currentStreak: number;
  lastWorkoutDate?: string | null;
  nextWorkoutDate?: string | null;
}

/** One-shot snapshot: everything a screen needs, already computed. */
export interface CurrentProgramState {
  plan: TrainingPlan;
  status: PlanStatus;
  currentWeek: TrainingWeek | null;
  currentWeekNumber: number;
  currentDay: number;
  todayWorkout: PlannedWorkout | null;
  tomorrowWorkout: PlannedWorkout | null;
  nextWorkout: PlannedWorkout | null;
  previousWorkout: PlannedWorkout | null;
  weekly: WeeklyProgress | null;
  overall: OverallProgress;
}

export interface TrainingPlanSummary {
  planId: string;
  programTitle: string;
  primaryGoal?: PrimaryGoal | null;
  targetSkill?: SkillGoal | null;
  fitnessLevel?: FitnessLevel | null;
  difficulty: Difficulty;
  totalWeeks: number;
  daysPerWeek: number;
  workoutDurationMin: number;
  weekOnePreview: TrainingWeek;
}
