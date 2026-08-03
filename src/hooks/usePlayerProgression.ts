// React access layer for the Player Progression Engine.
// Components consume these hooks — never Supabase, never level math.

import { useCallback, useEffect, useState } from "react";
import { ProgressionService, onProgressionEvent } from "@/services/progression";
import type {
  LevelHistoryEntry,
  LevelSnapshot,
  PlayerProfileStats,
  PlayerProgression,
} from "@/services/progression";

type AsyncState<T> = { data: T; loading: boolean; error: Error | null };

function useProgressionAsync<T>(loader: () => Promise<T>, initial: T, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ data: initial, loading: true, error: null });

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await loader();
      setState({ data, loading: false, error: null });
    } catch (error) {
      console.error("[progression] load failed", error);
      setState({ data: initial, loading: false, error: error as Error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  // Live refresh on level-up events emitted by the engine.
  useEffect(() => onProgressionEvent(() => void run()), [run]);

  return { ...state, reload: run };
}

export function usePlayerLevel() {
  return useProgressionAsync<PlayerProgression | null>(
    () => ProgressionService.getProgression(),
    null,
    [],
  );
}

export function usePlayerProgress() {
  return useProgressionAsync<LevelSnapshot | null>(
    () => ProgressionService.getProgressToNextLevel(),
    null,
    [],
  );
}

export function useNextLevel() {
  return useProgressionAsync<{ level: number; xpRequired: number } | null>(
    () => ProgressionService.getNextLevel(),
    null,
    [],
  );
}

export function useLevelHistory(limit = 20) {
  return useProgressionAsync<LevelHistoryEntry[]>(
    () => ProgressionService.getLevelHistory({ limit }),
    [],
    [limit],
  );
}

export function usePlayerStats() {
  return useProgressionAsync<PlayerProfileStats | null>(
    () => ProgressionService.getPlayerStats(),
    null,
    [],
  );
}
