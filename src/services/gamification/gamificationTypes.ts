// Gamification Orchestrator — domain types. No React, no Supabase.
// The orchestrator NEVER calculates XP, levels or achievements: it only
// coordinates the engines that own those calculations.

import type { AchievementEvent, AchievementUnlockResult } from "@/services/achievements";
import type { LevelUpResult, PlayerProfileStats } from "@/services/progression";
import type { WeeklyProgress } from "@/services/training-plan/trainingPlanTypes";
import type { XPAwardResult, XPEvent } from "@/services/xp";

/* ---------------- Events ---------------- */

export type GamificationEventType =
  | "workout_completed"
  | "week_completed"
  | "program_completed"
  | "assessment_completed"
  | "profile_completed"
  | "goal_completed"
  | "achievement_claimed"
  | "custom";

/** Single entry point payload for every gamification-related domain event. */
export interface GamificationEvent {
  type: GamificationEventType;
  /** Stable id of the origin (workout id, plan id, goal id...). Drives idempotency. */
  sourceId?: string | null;
  userId?: string;
  /** True only for the very first workout ever completed. */
  isFirstWorkout?: boolean;
  /** Explicit XP override forwarded to the XP Engine (never computed here). */
  xpAmount?: number;
  /** Extra XP events the caller wants coordinated in the same pipeline. */
  extraXPEvents?: XPEvent[];
  /** Extra achievement events (personal records, skills, streaks...). */
  extraAchievementEvents?: AchievementEvent[];
  /** Free-form context forwarded to every engine. */
  metadata?: Record<string, unknown>;
  /** Payload forwarded to the Achievements Engine (reps, seconds, streak...). */
  payload?: AchievementEvent["payload"];
}

/* ---------------- Engine ports (SOLID: depend on abstractions) ---------------- */

export interface XPEnginePort {
  awardXP(event: XPEvent): Promise<XPAwardResult>;
}

export interface ProgressionEnginePort {
  processXPUpdate(options?: {
    userId?: string;
    xpEarned?: number;
    source?: string;
    metadata?: Record<string, unknown>;
  }): Promise<LevelUpResult>;
  getPlayerStats(userId?: string): Promise<PlayerProfileStats>;
}

export interface AchievementEnginePort {
  processEvent(
    userId: string | undefined,
    event: AchievementEvent,
  ): Promise<AchievementUnlockResult[]>;
}

export interface TrainingEnginePort {
  getWeeklyProgress(userId?: string): Promise<WeeklyProgress | null>;
}

/**
 * Future engines (Goals, Nutrition, Notifications, AI Coach, Daily Rewards,
 * Season Pass, Premium Rewards, Leaderboards) plug in through this port
 * without changing the pipeline.
 */
export interface GamificationPluginPort {
  readonly name: string;
  process(
    event: GamificationEvent,
    context: GamificationPluginContext,
  ): Promise<GamificationPluginOutput | void>;
}

export interface GamificationPluginContext {
  userId: string;
  result: GamificationResult;
}

export interface GamificationPluginOutput {
  messages?: GamificationMessage[];
  /** Anything the plugin wants exposed to consumers (rewards, goals...). */
  data?: Record<string, unknown>;
}

export interface GamificationEngines {
  xp: XPEnginePort;
  progression: ProgressionEnginePort;
  achievements: AchievementEnginePort;
  training?: TrainingEnginePort;
  plugins?: GamificationPluginPort[];
}

/* ---------------- Result ---------------- */

export type GamificationStage =
  | "xp"
  | "progression"
  | "achievements"
  | "training"
  | "stats"
  | string;

export interface GamificationStageError {
  stage: GamificationStage;
  message: string;
}

export type GamificationMessageKind =
  | "xp"
  | "level_up"
  | "achievement"
  | "streak"
  | "week"
  | "program"
  | "info";

export interface GamificationMessage {
  kind: GamificationMessageKind;
  /** i18n-friendly key. */
  key: string;
  values?: Record<string, string | number>;
}

export interface NextGoal {
  key: string;
  label: string;
  current: number;
  target: number;
  percentage: number;
}

/** One consolidated object consumed by Dashboard, result screens, AI coach... */
export interface GamificationResult {
  eventType: GamificationEventType;
  userId: string;
  sourceId: string | null;

  xpEarned: number;
  currentXP: number;
  lifetimeXP: number;

  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
  levelsGained: number;
  isMaxLevel: boolean;
  nextLevelXP: number;
  xpToNextLevel: number;
  progressPercentage: number;

  newAchievements: AchievementUnlockResult[];
  currentStreak: number;
  weeklyProgress: WeeklyProgress | null;
  nextGoal: NextGoal | null;

  messages: GamificationMessage[];
  /** Namespaced output of future engines. */
  pluginData: Record<string, unknown>;

  /** True when at least one engine failed but the pipeline continued. */
  partial: boolean;
  errors: GamificationStageError[];
}

/* ---------------- Bus ---------------- */

export type GamificationListener = (result: GamificationResult) => void | Promise<void>;
