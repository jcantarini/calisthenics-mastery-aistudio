// Roving-focus navigation for radio-style option groups (Sprint 7.5A).
// PURE: index math only. No React, no DOM, no domain knowledge.

/** Keys this model handles. Anything else is a no-op for the caller. */
export const RADIO_NAV_KEYS = [
  "ArrowRight",
  "ArrowDown",
  "ArrowLeft",
  "ArrowUp",
  "Home",
  "End",
] as const;

export type RadioNavKey = (typeof RADIO_NAV_KEYS)[number];

export function isRadioNavKey(key: string): key is RadioNavKey {
  return (RADIO_NAV_KEYS as readonly string[]).includes(key);
}

/**
 * Next focused index for a wrapping radio group.
 * Returns `null` when the key is not handled or the group is empty, so the
 * caller knows not to preventDefault.
 */
export function nextRadioIndex(key: string, current: number, length: number): number | null {
  if (length <= 0) return null;
  if (!isRadioNavKey(key)) return null;

  const safe = Number.isInteger(current) && current >= 0 && current < length ? current : 0;

  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (safe + 1) % length;
    case "ArrowLeft":
    case "ArrowUp":
      return (safe - 1 + length) % length;
    case "Home":
      return 0;
    case "End":
      return length - 1;
  }
}

/** Keys that select the focused option. Space must never scroll the page. */
export function isRadioSelectKey(key: string): boolean {
  return key === "Enter" || key === " " || key === "Spacebar";
}

/** Exactly one tabbable option per group: the selected one, else the first. */
export function radioTabIndex(index: number, focusIndex: number): 0 | -1 {
  return index === focusIndex ? 0 : -1;
}

/** Resolves the roving anchor when nothing is selected yet. */
export function radioFocusIndex(selectedIndex: number, length: number): number {
  if (length <= 0) return 0;
  if (selectedIndex >= 0 && selectedIndex < length) return selectedIndex;
  return 0;
}
