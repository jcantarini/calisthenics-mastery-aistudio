// Player Progression Engine — event bus. Consumers: Dashboard, notifications,
// achievements, AI coach, premium rewards. Emitting never throws.

import type { ProgressionEvent, ProgressionEventListener } from "./levelTypes";

const listeners = new Set<ProgressionEventListener>();

export function onProgressionEvent(listener: ProgressionEventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function emitProgressionEvent(event: ProgressionEvent): Promise<void> {
  for (const listener of Array.from(listeners)) {
    try {
      await listener(event);
    } catch (error) {
      console.error("[progression] listener failed", event.type, error);
    }
  }
}

export function emitProgressionEventAsync(event: ProgressionEvent): void {
  void emitProgressionEvent(event);
}

export function clearProgressionListeners(): void {
  listeners.clear();
}
