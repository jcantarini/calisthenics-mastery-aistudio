// React access layer for the training program runtime.
// Components consume these hooks only — never Supabase directly.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TrainingPlanService } from "@/services/training-plan/TrainingPlanService";
import type { CurrentProgramState } from "@/services/training-plan/trainingPlanTypes";

export const trainingProgramKey = ["training-program", "current"] as const;

/** Full runtime snapshot: current week/day, today's workout, progress. */
export function useCurrentProgram() {
  return useQuery({
    queryKey: trainingProgramKey,
    queryFn: () => TrainingPlanService.getCurrentProgress(),
    staleTime: 30_000,
  });
}

type Action = (state: CurrentProgramState | null) => void;

/** Mutations that mutate program state and refresh the snapshot. */
export function useProgramActions(onSuccess?: Action) {
  const qc = useQueryClient();
  const settle = (state: CurrentProgramState | null) => {
    qc.setQueryData(trainingProgramKey, state);
    onSuccess?.(state);
  };

  const completeWorkout = useMutation({
    mutationFn: (workoutId: string) => TrainingPlanService.completeWorkout(workoutId),
    onSuccess: settle,
  });
  const startWorkout = useMutation({
    mutationFn: (workoutId: string) => TrainingPlanService.startWorkout(workoutId),
    onSuccess: settle,
  });
  const skipWorkout = useMutation({
    mutationFn: (workoutId: string) => TrainingPlanService.skipWorkout(workoutId),
    onSuccess: settle,
  });
  const pauseProgram = useMutation({
    mutationFn: () => TrainingPlanService.pauseProgram(),
    onSuccess: settle,
  });
  const resumeProgram = useMutation({
    mutationFn: () => TrainingPlanService.resumeProgram(),
    onSuccess: settle,
  });
  const restartProgram = useMutation({
    mutationFn: () => TrainingPlanService.restartProgram(),
    onSuccess: settle,
  });
  const advanceDay = useMutation({
    mutationFn: () => TrainingPlanService.advanceDay(),
    onSuccess: settle,
  });
  const advanceWeek = useMutation({
    mutationFn: () => TrainingPlanService.advanceWeek(),
    onSuccess: settle,
  });
  const regenerateProgram = useMutation({
    mutationFn: () => TrainingPlanService.regenerateProgram(),
    onSuccess: () => qc.invalidateQueries({ queryKey: trainingProgramKey }),
  });

  return {
    completeWorkout,
    startWorkout,
    skipWorkout,
    pauseProgram,
    resumeProgram,
    restartProgram,
    advanceDay,
    advanceWeek,
    regenerateProgram,
  };
}
