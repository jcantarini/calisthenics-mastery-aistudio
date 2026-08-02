// React access layer for the Achievements Engine.
// Components consume these hooks — never Supabase, never unlock logic.

import { useCallback, useEffect, useMemo, useState } from "react";
import { AchievementService } from "@/services/achievements";
import type {
  AchievementCategory,
  AchievementProgress,
  CategoryProgress,
  UserAchievement,
} from "@/services/achievements";

type AsyncState<T> = { data: T; loading: boolean; error: Error | null };

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
      console.error("[achievements] load failed", error);
      setState({ data: initial, loading: false, error: error as Error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { ...state, reload: run };
}

export function useAchievements() {
  return useAsync<UserAchievement[]>(
    () => AchievementService.getUserAchievements(),
    [],
    [],
  );
}

export function useRecentAchievements(limit = 3) {
  return useAsync<UserAchievement[]>(
    () => AchievementService.getRecentlyUnlocked(undefined, limit),
    [],
    [limit],
  );
}

export function useAchievementProgress(achievementId: string) {
  return useAsync<AchievementProgress | null>(
    () => AchievementService.getAchievementProgress(undefined, achievementId),
    null,
    [achievementId],
  );
}

export function useAchievementCategories(category?: AchievementCategory) {
  return useAsync<CategoryProgress[]>(
    () => AchievementService.getCategoryProgress(undefined, category),
    [],
    [category],
  );
}

/** Convenience selector built on top of the full list. */
export function useAchievementsByCategory() {
  const { data, loading, error, reload } = useAchievements();
  const grouped = useMemo(() => {
    const map = new Map<AchievementCategory, UserAchievement[]>();
    for (const item of data) {
      const list = map.get(item.definition.category) ?? [];
      list.push(item);
      map.set(item.definition.category, list);
    }
    return map;
  }, [data]);
  return { grouped, loading, error, reload };
}
