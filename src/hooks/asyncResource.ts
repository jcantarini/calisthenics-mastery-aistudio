// Async resource state model for Goals hooks (Sprint 7.5A).
// PURE: no React, no Supabase. Encodes latest-request-wins, initial load vs
// background refresh, and "keep usable data on refresh failure".

export interface AsyncResourceState<T> {
  data: T;
  /** True once at least one successful load completed. */
  loaded: boolean;
  /** Blocking initial load: the screen may show a skeleton. */
  loading: boolean;
  /** Background refresh: current data stays visible. */
  refreshing: boolean;
  error: Error | null;
}

export function initialAsyncState<T>(data: T): AsyncResourceState<T> {
  return { data, loaded: false, loading: true, refreshing: false, error: null };
}

/** A newer request always wins: older responses are dropped. */
export function isStaleResponse(requestId: number, latestId: number): boolean {
  return requestId !== latestId;
}

/** Starting a load: blocking only while no usable data exists. */
export function startLoad<T>(state: AsyncResourceState<T>): AsyncResourceState<T> {
  return state.loaded
    ? { ...state, refreshing: true }
    : { ...state, loading: true, refreshing: false };
}

export function applySuccess<T>(state: AsyncResourceState<T>, data: T): AsyncResourceState<T> {
  return { data, loaded: true, loading: false, refreshing: false, error: null };
}

/** A refresh failure preserves already-loaded data; an initial failure does not. */
export function applyFailure<T>(
  state: AsyncResourceState<T>,
  error: Error,
  fallback: T,
): AsyncResourceState<T> {
  if (state.loaded) {
    return { ...state, loading: false, refreshing: false, error };
  }
  return { data: fallback, loaded: false, loading: false, refreshing: false, error };
}

/** A blocking error state is only correct when no usable data exists. */
export function hasBlockingError<T>(state: AsyncResourceState<T>): boolean {
  return state.error !== null && !state.loaded;
}
