// Deprecated: business logic moved to `src/services/workout-generator`.
// This shim remains for backwards compatibility with any lingering imports.
// New code MUST import { WorkoutGeneratorService } from
// "@/services/workout-generator/WorkoutGeneratorService".

export type {
  GeneratedWorkout,
  WorkoutBlockItem,
  WorkoutExercise,
  Difficulty,
  GenerateOptions,
} from "@/services/workout-generator/workoutTypes";

import { WorkoutGeneratorService } from "@/services/workout-generator/WorkoutGeneratorService";

/** @deprecated Use WorkoutGeneratorService.generateFirstWorkout(userId). */
export async function generateAndPersistFirstWorkout(
  userId: string,
  _ob?: unknown,
  _ass?: unknown,
  opts?: { weightKg?: number },
) {
  return WorkoutGeneratorService.generateFirstWorkout(userId, opts);
}

/** @deprecated Use WorkoutGeneratorService.getFirstWorkout(userId). */
export async function fetchFirstWorkout(userId: string) {
  return WorkoutGeneratorService.getFirstWorkout(userId);
}
