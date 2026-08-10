// Goals × Gamification integration (Sprint 7.3).
//
//   GoalCompleted -> GamificationOrchestrator -> XP / Progression / Achievements
//
// This module is a WIRE, not an engine. It contains no XP amount, no level
// math and no unlock condition: it only forwards a legitimate goal completion
// to the single existing orchestration entry point and reads the authoritative
// completed-goal count from the Goals domain.
//
// Both completion paths converge here:
//   manual    : GoalService.completeGoal   -> goal_completed event
//   automatic : GoalTrackingService        -> GoalService -> goal_completed event
//
// Historical policy: only completions emitted after this bridge is registered
// enter the pipeline. Goals completed before Sprint 7.3 are never retro-awarded.

import { onGoalEvent, type GoalCompletedEvent } from "./goalEvents";
import type { Goal } from "./goalTypes";

export interface GoalGamificationPorts {
  /** Authoritative completed-goal count (never a client-provided number). */
  countCompletedGoals(userId: string): Promise<number>;
  /** The existing orchestrator entry point. */
  processGoalCompleted(options: {
    goalId: string;
    goalType?: string;
    difficulty?: string;
    goalsCompleted?: number;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<unknown>;
}

/** Only a legitimate transition to `completed` may produce rewards. */
export function isRewardableCompletion(goal: Pick<Goal, "status">): boolean {
  return goal.status === "completed";
}

export function createGoalGamificationBridge(ports: GoalGamificationPorts) {
  /**
   * Forwards one completion. Never throws: goal completion is already
   * persisted and must survive a gamification failure. A failed run can be
   * retried safely because the XP source reference is deterministic.
   */
  async function handleGoalCompleted(event: GoalCompletedEvent): Promise<void> {
    if (!isRewardableCompletion(event.goal)) return;
    try {
      let goalsCompleted: number | undefined;
      try {
        goalsCompleted = await ports.countCompletedGoals(event.userId);
      } catch (error) {
        // The count is an optimisation; the engine falls back to increment.
        console.error("[goals] completed count unavailable", error);
      }
      await ports.processGoalCompleted({
        goalId: event.goalId,
        goalType: event.goal.type,
        difficulty: event.goal.difficulty,
        goalsCompleted,
        userId: event.userId,
        metadata: { completedAt: event.completedAt },
      });
    } catch (error) {
      console.error("[goals] gamification failed for goal", event.goalId, error);
    }
  }

  return { handleGoalCompleted };
}

export type GoalGamificationBridge = ReturnType<typeof createGoalGamificationBridge>;

let registered = false;

/**
 * Idempotent subscription of the Goals → Gamification wire.
 * The orchestrator is imported lazily to keep the Goals domain free of a
 * static dependency on the Gamification pipeline.
 */
export function registerGoalGamification(): () => void {
  if (registered) return () => undefined;
  registered = true;

  const unsubscribe = onGoalEvent(async (event) => {
    if (event.type !== "goal_completed") return;
    const [{ GoalService }, { GamificationOrchestrator }] = await Promise.all([
      import("./GoalService"),
      import("@/services/gamification/GamificationOrchestrator"),
    ]);
    const bridge = createGoalGamificationBridge({
      countCompletedGoals: (userId) => GoalService.countCompletedGoals(userId),
      processGoalCompleted: (options) => GamificationOrchestrator.processGoalCompleted(options),
    });
    await bridge.handleGoalCompleted(event);
  });

  return () => {
    registered = false;
    unsubscribe();
  };
}
