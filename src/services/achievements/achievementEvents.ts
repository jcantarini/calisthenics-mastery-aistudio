// Achievements Engine — event bus. Producers emit domain events; the engine
// consumes them. Emitting never throws: gamification must not block training.

import type { AchievementEvent, AchievementUnlockResult } from "./achievementTypes";

type EventHandler = (event: AchievementEvent) => Promise<AchievementUnlockResult[]>;
type UnlockListener = (unlocks: AchievementUnlockResult[]) => void | Promise<void>;

let handler: EventHandler | null = null;
const unlockListeners = new Set<UnlockListener>();

/** Registered once by AchievementService. */
export function setAchievementHandler(next: EventHandler): void {
  handler = next;
}

/** UI layers subscribe here to render unlock toasts/modals. */
export function onAchievementUnlocked(listener: UnlockListener): () => void {
  unlockListeners.add(listener);
  return () => unlockListeners.delete(listener);
}

export async function notifyUnlocks(unlocks: AchievementUnlockResult[]): Promise<void> {
  if (unlocks.length === 0) return;
  for (const listener of Array.from(unlockListeners)) {
    try {
      await listener(unlocks);
    } catch (error) {
      console.error("[achievements] unlock listener failed", error);
    }
  }
}

/** Emit a domain event and get the resulting unlocks. Never throws. */
export async function emitAchievementEvent(
  event: AchievementEvent,
): Promise<AchievementUnlockResult[]> {
  if (!handler) return [];
  try {
    const unlocks = await handler(event);
    await notifyUnlocks(unlocks);
    return unlocks;
  } catch (error) {
    console.error("[achievements] processing failed", event.type, error);
    return [];
  }
}

/** Fire-and-forget variant for call sites that must not await. */
export function emitAchievementEventAsync(event: AchievementEvent): void {
  void emitAchievementEvent(event);
}

export function clearAchievementListeners(): void {
  unlockListeners.clear();
}
