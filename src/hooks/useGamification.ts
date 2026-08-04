// React access layer for the Gamification Orchestrator.
// Components consume these hooks — never the engines, never business rules.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GamificationOrchestrator,
  onGamificationResult,
} from "@/services/gamification";
import type { GamificationEvent, GamificationResult } from "@/services/gamification";

type State = { data: GamificationResult | null; loading: boolean; error: Error | null };

/** Consolidated gamification snapshot, live-refreshed on every result. */
export function useGamification() {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await GamificationOrchestrator.getSnapshot();
      setState({ data, loading: false, error: null });
    } catch (error) {
      console.error("[gamification] snapshot failed", error);
      setState({ data: null, loading: false, error: error as Error });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Any orchestrated event refreshes every consumer.
  useEffect(
    () => onGamificationResult((result) => setState({ data: result, loading: false, error: null })),
    [],
  );

  return { ...state, reload };
}

/** Level/XP projection of the consolidated result. */
export function useLevelProgress() {
  const { data, loading, error, reload } = useGamification();
  const progress = useMemo(() => {
    if (!data) return null;
    return {
      level: data.newLevel,
      currentXP: data.currentXP,
      lifetimeXP: data.lifetimeXP,
      xpToNextLevel: data.xpToNextLevel,
      nextLevelXP: data.nextLevelXP,
      progressPercentage: data.progressPercentage,
      isMaxLevel: data.isMaxLevel,
      leveledUp: data.leveledUp,
    };
  }, [data]);
  return { data: progress, loading, error, reload };
}

/**
 * Workout completion rewards. `complete()` runs the whole gamification
 * pipeline through the orchestrator and exposes the consolidated result for
 * the reusable result screen.
 */
export function useWorkoutRewards() {
  const [result, setResult] = useState<GamificationResult | null>(null);
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const complete = useCallback(
    async (options: {
      plannedWorkoutId: string;
      isFirstWorkout?: boolean;
      payload?: GamificationEvent["payload"];
      metadata?: Record<string, unknown>;
    }) => {
      setPending(true);
      try {
        const next = await GamificationOrchestrator.processWorkoutCompleted(options);
        if (mounted.current) setResult(next);
        return next;
      } finally {
        if (mounted.current) setPending(false);
      }
    },
    [],
  );

  const dismiss = useCallback(() => setResult(null), []);

  return { result, pending, complete, dismiss };
}
