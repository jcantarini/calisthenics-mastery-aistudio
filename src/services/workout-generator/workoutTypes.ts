// Public types for the Workout Generator Service.
// Kept isolated so future phases (4-week plans, regeneration, AI generation)
// can reuse these shapes without pulling in rules or persistence code.

export type Difficulty = "iniciante" | "intermediario" | "avancado";

export interface WorkoutBlockItem {
  name: string;
  duration?: string;
  cue?: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: string;
  focus: string;
  videoId?: string;
  cue?: string;
  substitutedFrom?: string;
}

export interface GeneratedWorkout {
  id?: string;
  planId?: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  programSlug: string;
  programTitle: string;
  estimatedDurationMin: number;
  estimatedCalories: number;
  warmup: WorkoutBlockItem[];
  exercises: WorkoutExercise[];
  cooldown: WorkoutBlockItem[];
  notes: string;
}

export interface GenerateOptions {
  weightKg?: number;
}
