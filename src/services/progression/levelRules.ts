// Player Progression Engine — pure rules. Deterministic, side-effect free.

import { DEFAULT_LEVEL_CURVE, clampLevel, isMaxLevel, levelForXP, xpForLevel } from "./levelCurve";
import type {
  LevelCurveConfig,
  LevelSnapshot,
  LevelUpResult,
  PlayerProgression,
  ProgressionEventType,
} from "./levelTypes";

/** Everything the UI needs about a player's position on the curve. */
export function snapshotForXP(
  lifetimeXP: number,
  config: LevelCurveConfig = DEFAULT_LEVEL_CURVE,
): LevelSnapshot {
  const xp = Math.max(0, Math.trunc(lifetimeXP));
  const level = levelForXP(xp, config);
  const maxed = isMaxLevel(level, config);
  const currentLevelXP = xpForLevel(level, config);
  const nextLevelXP = maxed ? currentLevelXP : xpForLevel(level + 1, config);
  const levelSpan = Math.max(1, nextLevelXP - currentLevelXP);
  const xpIntoLevel = Math.max(0, xp - currentLevelXP);
  const xpRemaining = maxed ? 0 : Math.max(0, nextLevelXP - xp);
  const progressPercentage = maxed
    ? 100
    : Math.min(100, Math.max(0, Math.round((xpIntoLevel / levelSpan) * 100)));

  return {
    level,
    currentLevelXP,
    nextLevelXP,
    xpIntoLevel,
    levelSpan,
    xpRemaining,
    progressPercentage,
    isMaxLevel: maxed,
  };
}

export function calculateLevel(
  lifetimeXP: number,
  config: LevelCurveConfig = DEFAULT_LEVEL_CURVE,
): number {
  return levelForXP(lifetimeXP, config);
}

/** Which event (if any) a level transition should emit. */
export function eventTypeForTransition(
  oldLevel: number,
  newLevel: number,
  config: LevelCurveConfig = DEFAULT_LEVEL_CURVE,
): ProgressionEventType | null {
  if (newLevel <= oldLevel) return null;
  if (isMaxLevel(newLevel, config)) return "max_level_reached";
  return newLevel - oldLevel > 1 ? "multiple_level_up" : "level_up";
}

/** Build the next persisted state from raw XP totals. Pure. */
export function nextProgression(
  previous: PlayerProgression,
  currentXP: number,
  lifetimeXP: number,
  config: LevelCurveConfig = DEFAULT_LEVEL_CURVE,
): PlayerProgression {
  const snapshot = snapshotForXP(lifetimeXP, config);
  const leveledUp = snapshot.level > previous.currentLevel;
  return {
    ...previous,
    currentLevel: snapshot.level,
    currentXP: Math.max(0, Math.trunc(currentXP)),
    lifetimeXP: Math.max(0, Math.trunc(lifetimeXP)),
    xpToNextLevel: snapshot.xpRemaining,
    progressPercentage: snapshot.progressPercentage,
    highestLevel: Math.max(clampLevel(previous.highestLevel, config), snapshot.level),
    lastLevelUpAt: leveledUp ? new Date().toISOString() : previous.lastLevelUpAt,
  };
}

/** Reusable result object handed to UI, notifications and future reward systems. */
export function buildResult(
  oldLevel: number,
  progression: PlayerProgression,
  xpEarned: number,
  config: LevelCurveConfig = DEFAULT_LEVEL_CURVE,
): LevelUpResult {
  const snapshot = snapshotForXP(progression.lifetimeXP, config);
  return {
    leveledUp: progression.currentLevel > oldLevel,
    oldLevel,
    newLevel: progression.currentLevel,
    levelsGained: Math.max(0, progression.currentLevel - oldLevel),
    xpEarned: Math.trunc(xpEarned),
    currentXP: progression.currentXP,
    lifetimeXP: progression.lifetimeXP,
    xpRemaining: snapshot.xpRemaining,
    progressPercentage: snapshot.progressPercentage,
    isMaxLevel: snapshot.isMaxLevel,
    unlockedRewards: [],
    progression,
  };
}

export function emptyProgression(userId: string): PlayerProgression {
  const snapshot = snapshotForXP(0);
  return {
    userId,
    currentLevel: 1,
    currentXP: 0,
    lifetimeXP: 0,
    xpToNextLevel: snapshot.xpRemaining,
    progressPercentage: 0,
    highestLevel: 1,
    prestige: 0,
    lastLevelUpAt: null,
  };
}
