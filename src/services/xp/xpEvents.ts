// XP Engine — event bus. Producers (services) emit; the XP service consumes.
// Keeps XP awarding decoupled: no service depends on XPService directly.

import type { XPEvent, XPEventListener } from "./xpTypes";

const listeners = new Set<XPEventListener>();

/** Subscribe to domain events. Returns an unsubscribe function. */
export function onXPEvent(listener: XPEventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Emit a domain event. Never throws: XP is a secondary concern and must not
 * break the flow that produced the event.
 */
export async function emitXPEvent(event: XPEvent): Promise<void> {
  const snapshot = Array.from(listeners);
  await Promise.all(
    snapshot.map(async (listener) => {
      try {
        await listener(event);
      } catch (error) {
        console.error("[xp] listener failed", event.type, error);
      }
    }),
  );
}

/** Fire-and-forget variant for call sites that must not await XP work. */
export function emitXPEventAsync(event: XPEvent): void {
  void emitXPEvent(event);
}

export function clearXPListeners(): void {
  listeners.clear();
}
