// Shared types for the Training Plan Service.

import type { GeneratedWorkout, Difficulty } from "@/services/workout-generator/workoutTypes";
import type { PrimaryGoal, SkillGoal, FitnessLevel } from "@/lib/onboarding";

export type PlanStatus = "active" | "paused" | "completed" | "archived";
export type DayType = "workout" | "recovery";

export interface PlannedWorkout extends GeneratedWorkout {
  planId: string;
  weekNumber: number;
  dayNumber: number;
  isCompleted: boolean;
  completedAt?: string | null;
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
  weeks: TrainingWeek[];
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
