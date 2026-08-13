// Mutation flow model for Goals mutations (Sprint 7.5A-P1).
// PURE: no React, no Supabase. Guarantees that the pending flag only clears
// after the awaited post-mutation refresh settled, and that a failing refresh
// never re-runs the mutation.

export async function runMutationFlow<T>(
  action: () => Promise<T>,
  onChanged: (() => void | Promise<void>) | undefined,
  setPending: (value: boolean) => void,
  setError: (error: Error | null) => void,
): Promise<T | null> {
  setPending(true);
  setError(null);
  try {
    const result = await action();
    try {
      // Single awaited reload. A refresh problem must never retry the mutation.
      await onChanged?.();
    } catch (refreshError) {
      console.error("[goals] post-mutation refresh failed", refreshError);
    }
    return result;
  } catch (e) {
    setError(e as Error);
    return null;
  } finally {
    setPending(false);
  }
}
