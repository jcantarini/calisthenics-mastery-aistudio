// Single-flight submission guard (Sprint 7.4B-1C).
// Pure TypeScript: no React, Supabase, domain or UI logic.
// Guarantees an async action runs at most once concurrently, and releases
// the lock when the promise settles (success, failure result, or throw).

export interface SingleFlightGuard {
  /** True while a submission is in flight. */
  readonly isRunning: () => boolean;
  /**
   * Runs `action` when idle and resolves with its result.
   * Returns `undefined` immediately when a submission is already in flight.
   */
  run: <T>(action: () => Promise<T>) => Promise<T | undefined>;
}

export function createSingleFlightGuard(): SingleFlightGuard {
  let running = false;

  return {
    isRunning: () => running,
    run: async <T>(action: () => Promise<T>): Promise<T | undefined> => {
      if (running) return undefined;
      running = true;
      try {
        return await action();
      } finally {
        running = false;
      }
    },
  };
}
