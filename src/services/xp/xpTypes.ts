// XP Engine — domain types. No React, no UI.

/** Every event that can produce (or revoke) experience points. */
export type XPEventType =
  | "assessment_completed"
  | "profile_completed"
  | "first_workout"
  | "workout_completed"
  | "workout_streak"
  | "week_completed"
  | "program_completed"
  | "goal_completed"
  | "achievement_unlocked"
  | "manual_adjustment";

/**
 * Effort tiers the XP Engine prices. Structurally identical to the Goals
 * domain `GoalDifficulty`; declared here so the XP domain owns its own input
 * contract instead of importing from Goals.
 */
export type GoalDifficultyTier = "easy" | "medium" | "hard" | "epic";

/** Payload emitted by producers (services), consumed by the XP engine. */
export interface XPEvent {
  type: XPEventType;
  /**
   * Stable identifier of the thing that caused the event
   * (workout id, plan id, achievement slug...). Used for idempotency:
   * the same (user, type, sourceId) is never rewarded twice.
   */
  sourceId?: string | null;
  /** Human readable reason. Falls back to the rule default. */
  reason?: string;
  /** Overrides the default reward (e.g. streak multipliers). */
  amount?: number;
  /** Free-form context kept for future systems (levels, coach, analytics). */
  metadata?: Record<string, unknown>;
  /** Explicit user, otherwise the authenticated one is resolved. */
  userId?: string;
}

export interface XPEntry {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  eventType: XPEventType;
  sourceId: string | null;
  metadata: Record<string, unknown>;
  runningTotal: number;
  createdAt: string;
}

export interface UserXPStats {
  userId: string;
  currentXP: number;
  lifetimeXP: number;
  level: number;
  lastActivityAt: string | null;
}

export interface XPAwardResult {
  /** False when the event was ignored (duplicate or zero reward). */
  awarded: boolean;
  amount: number;
  entry: XPEntry | null;
  stats: UserXPStats;
}

/** Listener signature for the domain event bus. */
export type XPEventListener = (event: XPEvent) => void | Promise<void>;
