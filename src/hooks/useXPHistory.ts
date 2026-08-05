// React access layer for the XP Engine history.
// Components consume this hook — never Supabase, never XP math.

import { useCallback, useEffect, useState } from "react";
import { XPService, onXPApplied } from "@/services/xp";
import type { XPEntry, UserXPStats } from "@/services/xp";

type AsyncState<T> = { data: T; loading: boolean; error: Error | null };

function useXPAsync<T>(loader: () => Promise<T>, initial: T, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ data: initial, loading: true, error: null });

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await loader();
      setState({ data, loading: false, error: null });
    } catch (error) {
      console.error("[xp] load failed", error);
      setState({ data: initial, loading: false, error: error as Error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  // Live refresh whenever the XP engine applies a new award.
  useEffect(() => onXPApplied(() => void run()), [run]);

  return { ...state, reload: run };
}

export function useXPHistory(limit = 50) {
  return useXPAsync<XPEntry[]>(() => XPService.getXPHistory({ limit }), [], [limit]);
}

export function useXPStats() {
  return useXPAsync<UserXPStats | null>(() => XPService.getStats(), null, []);
}
