// Gamification Orchestrator — result bus. Consumers: Dashboard, workout
// complete screen, notifications, AI coach. Emitting never throws.

import type { GamificationListener, GamificationResult } from "./gamificationTypes";

const listeners = new Set<GamificationListener>();

export function onGamificationResult(listener: GamificationListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function emitGamificationResult(result: GamificationResult): Promise<void> {
  for (const listener of Array.from(listeners)) {
    try {
      await listener(result);
    } catch (error) {
      console.error("[gamification] listener failed", result.eventType, error);
    }
  }
}

export function emitGamificationResultAsync(result: GamificationResult): void {
  void emitGamificationResult(result);
}

export function clearGamificationListeners(): void {
  listeners.clear();
}
