// React access layer for the Goals domain.
// Thin: no goal rules, no completion logic — that lives in GoalService.
// Resilience (latest-request-wins, unmount safety, keep-data-on-refresh)
// is modelled by the pure helpers in `asyncResource.ts`.

import { useCallback, useEffect, useRef, useState } from "react";
import { GoalService } from "@/services/goals";
import type { Goal, GoalProgress, GoalQuery } from "@/services/goals";
import {
  applyFailure,
  applySuccess,
  hasBlockingError,
  initialAsyncState,
  isStaleResponse,
  startLoad,
  type AsyncResourceState,
} from "./asyncResource";
import { runMutationFlow } from "./mutationFlow";


export interface AsyncResult<T> {
  data: T;
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

function useAsync<T>(loader: () => Promise<T>, initial: T, deps: unknown[]): AsyncResult<T> {
  const [state, setState] = useState<AsyncResourceState<T>>(() => initialAsyncState(initial));
  const mounted = useRef(true);
  const requestId = useRef(0);
  const fallback = useRef(initial);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setState((s) => startLoad(s));
    try {
      const data = await loader();
      // Drop the response when unmounted or superseded by a newer request.
      if (!mounted.current || isStaleResponse(id, requestId.current)) return;
      setState((s) => applySuccess(s, data));
    } catch (error) {
      console.error("[goals] load failed", error);
      if (!mounted.current || isStaleResponse(id, requestId.current)) return;
      setState((s) => applyFailure(s, error as Error, fallback.current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return {
    data: state.data,
    loading: state.loading,
    refreshing: state.refreshing,
    // Only a blocking error replaces the screen; refresh failures keep data.
    error: hasBlockingError(state) ? state.error : null,
    reload: run,
  };
}

export function useGoals(query: GoalQuery = {}) {
  const key = JSON.stringify(query);

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

/**
 * Mutation state helper so screens don't hand-roll pending/error flags.
 * `onChanged` may be async: `pending` only clears once the awaited reload
 * settled, so the screen never shows stale data as "idle".
 */
export function useGoalMutations(onChanged?: () => void | Promise<void>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(
    async <T>(action: () => Promise<T>): Promise<T | null> =>
      runMutationFlow(action, onChanged, setPending, setError),
    [onChanged],
  );

  return { pending, error, run };
}

