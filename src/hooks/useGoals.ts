// React access layer for the Goals domain.
// Thin: no goal rules, no completion logic — that lives in GoalService.

import { useCallback, useEffect, useState } from "react";
import { GoalService } from "@/services/goals";
import type { Goal, GoalProgress, GoalQuery } from "@/services/goals";

interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

function useAsync<T>(loader: () => Promise<T>, initial: T, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({
    data: initial,
    loading: true,
    error: null,
  });

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await loader();
      setState({ data, loading: false, error: null });
    } catch (error) {
      console.error("[goals] load failed", error);
      setState({ data: initial, loading: false, error: error as Error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { ...state, reload: run };
}

export function useGoals(query: GoalQuery = {}) {
  const key = JSON.stringify(query);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useAsync<Goal[]>(() => GoalService.getGoals(query), [], [key]);
}

export function useActiveGoals() {
  return useAsync<Goal[]>(() => GoalService.getActiveGoals(), [], []);
}

export function useCompletedGoals() {
  return useAsync<Goal[]>(() => GoalService.getCompletedGoals(), [], []);
}

export function useGoal(goalId: string | null) {
  return useAsync<Goal | null>(
    () => (goalId ? GoalService.getGoal(goalId) : Promise.resolve(null)),
    null,
    [goalId],
  );
}

export function useGoalProgress(goalId: string | null) {
  return useAsync<GoalProgress | null>(
    () => (goalId ? GoalService.getGoalProgress(goalId) : Promise.resolve(null)),
    null,
    [goalId],
  );
}

/** Mutation state helper so screens don't hand-roll pending/error flags. */
export function useGoalMutations(onChanged?: () => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | null> => {
      setPending(true);
      setError(null);
      try {
        const result = await action();
        onChanged?.();
        return result;
      } catch (e) {
        setError(e as Error);
        return null;
      } finally {
        setPending(false);
      }
    },
    [onChanged],
  );

  return { pending, error, run };
}
