// Goals Engine — typed event contracts + local bus.
// Sprint 7.1 defines the contracts only. No gamification wiring here:
// GamificationOrchestrator integration is Sprint 7.3.

import type { Goal, GoalProgress, GoalStatus } from "./goalTypes";

export type GoalEventType =
  | "goal_created"
  | "goal_activated"
  | "goal_progress_updated"
  | "goal_completed"
  | "goal_paused"
  | "goal_resumed"
  | "goal_cancelled"
  | "goal_expired";

interface BaseGoalEvent {
  userId: string;
  goalId: string;
  goal: Goal;
  occurredAt: string;
}

export interface GoalCreatedEvent extends BaseGoalEvent {
  type: "goal_created";
}
export interface GoalActivatedEvent extends BaseGoalEvent {
  type: "goal_activated";
  previousStatus: GoalStatus;
}
export interface GoalProgressUpdatedEvent extends BaseGoalEvent {
  type: "goal_progress_updated";
  progress: GoalProgress;
  delta: number;
}
export interface GoalCompletedEvent extends BaseGoalEvent {
  type: "goal_completed";
  completedAt: string;
  /** Stable id for idempotent downstream rewards (Sprint 7.3). */
  sourceId: string;
}
export interface GoalPausedEvent extends BaseGoalEvent {
  type: "goal_paused";
}
export interface GoalResumedEvent extends BaseGoalEvent {
  type: "goal_resumed";
}
export interface GoalCancelledEvent extends BaseGoalEvent {
  type: "goal_cancelled";
}
export interface GoalExpiredEvent extends BaseGoalEvent {
  type: "goal_expired";
}

export type GoalEvent =
  | GoalCreatedEvent
  | GoalActivatedEvent
  | GoalProgressUpdatedEvent
  | GoalCompletedEvent
  | GoalPausedEvent
  | GoalResumedEvent
  | GoalCancelledEvent
  | GoalExpiredEvent;

export type GoalEventListener = (event: GoalEvent) => void | Promise<void>;

const listeners = new Set<GoalEventListener>();

export function onGoalEvent(listener: GoalEventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Never throws: goal persistence must not break because a listener failed. */
export async function emitGoalEvent(event: GoalEvent): Promise<void> {
  for (const listener of Array.from(listeners)) {
    try {
      await listener(event);
    } catch (error) {
      console.error("[goals] listener failed", event.type, error);
    }
  }
}

export function emitGoalEventAsync(event: GoalEvent): void {
  void emitGoalEvent(event);
}

export function clearGoalListeners(): void {
  listeners.clear();
}

/**
 * Sources that will feed automatic goal tracking in Sprint 7.2.
 * Declared now so producers can be typed against a stable contract.
 */
export type GoalTrackingSource =
  | "workout_completed"
  | "exercise_completed"
  | "training_week_completed"
  | "training_program_completed"
  | "streak_updated"
  | "skill_achieved"
  | "body_measurement_recorded"
  | "manual";

export interface GoalProgressSignal {
  source: GoalTrackingSource;
  /** Value observed by the producer, expressed in the goal's unit. */
  value: number;
  mode?: "increment" | "set";
  /** Idempotency hint for Sprint 7.2 (workout id, week id...). */
  sourceId?: string | null;
  metadata?: Record<string, unknown>;
}
