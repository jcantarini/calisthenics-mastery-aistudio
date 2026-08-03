// Player Progression Engine — the level curve. Pure and configurable.
//
// The curve is defined by a per-level XP increment:
//   increment(n) = quadratic * n^2 + linear * n + base      (n = 1..maxLevel-1)
// The XP threshold of level L is the sum of the first (L - 1) increments.
//
// With the default config the curve reads:
//   L1: 0 · L2: 250 · L3: 600 · L4: 1100 · L5: 1800 · L6: 2750 ...
// and keeps growing smoothly up to level 100.

import type { LevelCurveConfig } from "./levelTypes";

export const DEFAULT_LEVEL_CURVE: LevelCurveConfig = {
  maxLevel: 100,
  quadratic: 25,
  linear: 25,
  base: 200,
};

/** XP required to go from level `n` to level `n + 1`. */
export function levelIncrement(n: number, config: LevelCurveConfig = DEFAULT_LEVEL_CURVE): number {
  const step = Math.max(1, Math.trunc(n));
  return config.quadratic * step * step + config.linear * step + config.base;
}

/**
 * Cumulative XP threshold at which `level` starts.
 * Closed form of the increment sum, so lookups stay O(1) for any level.
 */
export function xpForLevel(level: number, config: LevelCurveConfig = DEFAULT_LEVEL_CURVE): number {
  const target = clampLevel(level, config);
  const n = target - 1;
  if (n <= 0) return 0;
  const squares = (n * (n + 1) * (2 * n + 1)) / 6;
  const naturals = (n * (n + 1)) / 2;
  return config.quadratic * squares + config.linear * naturals + config.base * n;
}

/** Level reached with `lifetimeXP`. Never below 1, never above `maxLevel`. */
export function levelForXP(lifetimeXP: number, config: LevelCurveConfig = DEFAULT_LEVEL_CURVE): number {
  const xp = Math.max(0, Math.trunc(lifetimeXP));
  if (xp <= 0) return 1;
  // Binary search over the monotonically increasing threshold table.
  let low = 1;
  let high = config.maxLevel;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (xpForLevel(mid, config) <= xp) low = mid;
    else high = mid - 1;
  }
  return low;
}

export function isMaxLevel(level: number, config: LevelCurveConfig = DEFAULT_LEVEL_CURVE): boolean {
  return level >= config.maxLevel;
}

export function clampLevel(level: number, config: LevelCurveConfig = DEFAULT_LEVEL_CURVE): number {
  return Math.min(config.maxLevel, Math.max(1, Math.trunc(level || 1)));
}

/** Full threshold table — handy for debug screens and future leaderboards. */
export function buildLevelTable(config: LevelCurveConfig = DEFAULT_LEVEL_CURVE) {
  return Array.from({ length: config.maxLevel }, (_, index) => ({
    level: index + 1,
    xpRequired: xpForLevel(index + 1, config),
  }));
}
