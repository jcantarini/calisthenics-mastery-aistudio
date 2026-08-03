// Player Progression Engine — domain types. No React, no Supabase.

/** Configurable parameters of the level curve. */
export interface LevelCurveConfig {
  /** Highest reachable level. */
  maxLevel: number;
  /** Quadratic coefficient of the per-level XP increment. */
  quadratic: number;
  /** Linear coefficient of the per-level XP increment. */
  linear: number;
  /** Constant coefficient of the per-level XP increment. */
  base: number;
}

/** Immutable snapshot of where a player stands right now. */
export interface LevelSnapshot {
  level: number;
  /** XP threshold where the current level starts. */
  currentLevelXP: number;
  /** XP threshold where the next level starts (equals currentLevelXP at max). */
  nextLevelXP: number;
  /** XP accumulated inside the current level. */
  xpIntoLevel: number;
  /** XP span of the current level. */
  levelSpan: number;
  /** XP still required to reach the next level (0 at max level). */
  xpRemaining: number;
  /** 0..100 progress towards the next level. */
  progressPercentage: number;
  isMaxLevel: boolean;
}

/** Persisted progression state of a player. */
export interface PlayerProgression {
  userId: string;
  currentLevel: number;
  currentXP: number;
  lifetimeXP: number;
  xpToNextLevel: number;
  progressPercentage: number;
  highestLevel: number;
  prestige: number;
  lastLevelUpAt: string | null;
}

export interface LevelHistoryEntry {
  id: string;
  userId: string;
  previousLevel: number;
  newLevel: number;
  levelsGained: number;
  lifetimeXP: number;
  source: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Reusable result object returned by every progression update. */
export interface LevelUpResult {
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  xpEarned: number;
  currentXP: number;
  lifetimeXP: number;
  xpRemaining: number;
  progressPercentage: number;
  isMaxLevel: boolean;
  /** Reserved for Season Pass / Premium Rewards. Always empty for now. */
  unlockedRewards: string[];
  progression: PlayerProgression;
}

export type ProgressionEventType = "level_up" | "multiple_level_up" | "max_level_reached";

export interface ProgressionEvent {
  type: ProgressionEventType;
  userId: string;
  result: LevelUpResult;
}

export type ProgressionEventListener = (event: ProgressionEvent) => void | Promise<void>;

/** Aggregated player card data, consumed later by Profile and Leaderboards. */
export interface PlayerProfileStats {
  userId: string;
  currentLevel: number;
  currentXP: number;
  lifetimeXP: number;
  highestLevel: number;
  prestige: number;
  xpRemaining: number;
  progressPercentage: number;
  currentStreak: number;
  programsCompleted: number;
  achievementsUnlocked: number;
}
