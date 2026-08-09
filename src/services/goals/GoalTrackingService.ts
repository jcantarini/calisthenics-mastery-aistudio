// Goals — Automatic Tracking Service (Sprint 7.2).
//
//   Domain event -> GoalTrackingService -> GoalService -> goalRules -> Supabase
//
// Tracking NEVER writes to `user_goals` and NEVER awards rewards.
// Reward integration (XP / achievements) is Sprint 7.3.

import { supabase } from "@/integrations/supabase/client";
import { GoalService } from "./GoalService";
import { buildGoalProgress } from "./goalRules";
import { isMatch, matchGoalToEvent } from "./goalTrackingRules";
import type { Goal } from "./goalTypes";
import type {
  GoalActivityEvent,
  GoalTrackingDeps,
  GoalTrackingError,
  GoalTrackingIgnored,
  GoalTrackingLedgerEntry,
  GoalTrackingLedgerPort,
  GoalTrackingResult,
  GoalTrackingUpdate,
} from "./goalTrackingTypes";
import { activitySourceId } from "./goalTrackingRules";

/* ---------------- Default ledger (persistent idempotency) ---------------- */

const supabaseLedger: GoalTrackingLedgerPort = {
  async claim(entry: GoalTrackingLedgerEntry) {
    const { error } = await supabase.from("goal_progress_events").insert({
      user_id: entry.userId,
      goal_id: entry.goalId,
      source_event_id: entry.sourceEventId,
      source_event_type: entry.sourceEventType,
      observed_value: entry.observedValue,
    });
    if (!error) return true;
    // 23505 = unique violation: this event already updated this goal.
    if (error.code === "23505") return false;
    throw error;
  },
  async release(goalId, sourceEventId, sourceEventType) {
    await supabase
      .from("goal_progress_events")
      .delete()
      .eq("goal_id", goalId)
      .eq("source_event_id", sourceEventId)
      .eq("source_event_type", sourceEventType);
  },
  async settle(goalId, sourceEventId, sourceEventType, delta) {
    await supabase
      .from("goal_progress_events")
      .update({ progress_delta: delta })
      .eq("goal_id", goalId)
      .eq("source_event_id", sourceEventId)
      .eq("source_event_type", sourceEventType);
  },
};

async function defaultResolveUserId(userId?: string): Promise<string> {
  if (userId) return userId;
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Usuário não autenticado");
  return data.user.id;
}

/* ---------------- Service ---------------- */

function emptyResult(event: GoalActivityEvent): GoalTrackingResult {
  return {
    eventId: activitySourceId(event),
    eventType: event.type,
    processedGoals: 0,
    updatedGoals: [],
    completedGoals: [],
    ignoredGoals: [],
    errors: [],
  };
}

export function createGoalTrackingService(deps: GoalTrackingDeps) {
  // In-process serialization per goal: prevents read-modify-write races between
  // events fired back to back in the same tab. Cross-session safety comes from
  // the ledger's unique constraint plus GoalService's compare-and-set retry.
  const queues = new Map<string, Promise<unknown>>();

  function serialize<T>(goalId: string, task: () => Promise<T>): Promise<T> {
    const previous = queues.get(goalId) ?? Promise.resolve();
    const next = previous.then(task, task);
    queues.set(
      goalId,
      next.catch(() => undefined),
    );
    return next;
  }

  async function applyToGoal(
    userId: string,
    goal: Goal,
    event: GoalActivityEvent,
    result: GoalTrackingResult,
  ): Promise<void> {
    const outcome = matchGoalToEvent(goal, event);
    if (!isMatch(outcome)) {
      result.ignoredGoals.push({ goalId: goal.id, reason: outcome });
      return;
    }

    // Claim first: the unique constraint makes duplicate delivery a no-op even
    // across refresh, restart and network retry.
    let claimed = false;
    try {
      claimed = await deps.ledger.claim({
        userId,
        goalId: goal.id,
        sourceEventId: outcome.sourceEventId,
        sourceEventType: outcome.sourceEventType,
        observedValue: outcome.signal.value,
      });
    } catch (error) {
      result.errors.push({ goalId: goal.id, message: (error as Error).message });
      return;
    }
    if (!claimed) {
      result.ignoredGoals.push({ goalId: goal.id, reason: "already_processed" });
      return;
    }

    try {
      const updated = await serialize(goal.id, () =>
        deps.goals.updateGoalProgress(goal.id, outcome.signal, userId),
      );
      const delta = updated.currentValue - goal.currentValue;
      result.processedGoals += 1;

      if (delta === 0 && updated.status === goal.status) {
        result.ignoredGoals.push({ goalId: goal.id, reason: "no_change" });
        await deps.ledger.settle(goal.id, outcome.sourceEventId, outcome.sourceEventType, 0);
        return;
      }

      const update: GoalTrackingUpdate = {
        goalId: goal.id,
        previousValue: goal.currentValue,
        currentValue: updated.currentValue,
        delta,
        completed: updated.status === "completed",
      };
      result.updatedGoals.push(update);
      if (updated.status === "completed") result.completedGoals.push(updated);
      await deps.ledger.settle(goal.id, outcome.sourceEventId, outcome.sourceEventType, delta);
    } catch (error) {
      // Release the claim so a retry can reapply the very same event safely.
      try {
        await deps.ledger.release(goal.id, outcome.sourceEventId, outcome.sourceEventType);
      } catch {
        /* releasing is best-effort; the claim expires with the goal */
      }
      result.errors.push({ goalId: goal.id, message: (error as Error).message });
    }
  }

  /** Processes one authoritative activity event against every active goal. */
  async function track(event: GoalActivityEvent): Promise<GoalTrackingResult> {
    const result = emptyResult(event);
    try {
      const userId = await deps.resolveUserId(event.userId);
      const goals = await deps.goals.getActiveGoals(userId);
      for (const goal of goals) {
        await applyToGoal(userId, goal, event, result);
      }
    } catch (error) {
      result.errors.push({ goalId: null, message: (error as Error).message });
    }
    return result;
  }

  /**
   * Failure isolation: tracking must never break workout completion.
   * Callers in the training runtime use this variant.
   */
  async function trackSafely(event: GoalActivityEvent): Promise<GoalTrackingResult | null> {
    try {
      const result = await track(event);
      if (result.errors.length) console.error("[goals] tracking errors", result.errors);
      return result;
    } catch (error) {
      console.error("[goals] tracking failed", error);
      return null;
    }
  }

  /**
   * Bounded historical reconciliation: replays already completed workouts of
   * the active plan through the same idempotent pipeline. Only workout-driven
   * goals can be reconciled — exercise, body and skill history has no
   * authoritative store yet (documented as pending, Phase 8).
   */
  async function reconcileGoal(goalId: string, userId?: string): Promise<GoalTrackingResult> {
    const result: GoalTrackingResult = {
      eventId: goalId,
      eventType: "reconcile",
      processedGoals: 0,
      updatedGoals: [],
      completedGoals: [],
      ignoredGoals: [],
      errors: [],
    };
    try {
      const uid = await deps.resolveUserId(userId);
      const goal = await deps.goals.getGoal(goalId, uid);
      if (!goal) return result;
      if (goal.status !== "active") {
        result.ignoredGoals.push({ goalId, reason: "not_active" });
        return result;
      }
      const reconcilable = ["workout_count", "workout_frequency", "training_time"];
      if (!reconcilable.includes(goal.type)) {
        result.ignoredGoals.push({ goalId, reason: "no_rule" });
        return result;
      }

      const { TrainingPlanService } = await import("@/services/training-plan/TrainingPlanService");
      const plan = await TrainingPlanService.getActivePlan(uid);
      if (!plan) return result;

      const completed = plan.weeks
        .flatMap((week) => week.workouts)
        .filter((workout) => workout.status === "completed" && workout.completedAt)
        .sort((a, b) => String(a.completedAt).localeCompare(String(b.completedAt)))
        .slice(-200); // bounded: never a full-history analytics scan

      for (const workout of completed) {
        const fresh = await deps.goals.getGoal(goalId, uid);
        if (!fresh || fresh.status !== "active") break;
        await applyToGoal(
          uid,
          fresh,
          {
            type: "workout_completed",
            workoutId: workout.id,
            planId: plan.id,
            occurredAt: workout.completedAt as string,
            estimatedDurationMin: workout.estimatedDurationMin,
            userId: uid,
          },
          result,
        );
      }
    } catch (error) {
      result.errors.push({ goalId, message: (error as Error).message });
    }
    return result;
  }

  return { track, trackSafely, reconcileGoal };
}

export type GoalTrackingServiceInstance = ReturnType<typeof createGoalTrackingService>;

export const GoalTrackingService = createGoalTrackingService({
  goals: {
    getActiveGoals: (userId) => GoalService.getActiveGoals(userId),
    getGoal: (goalId, userId) => GoalService.getGoal(goalId, userId),
    updateGoalProgress: (goalId, signal, userId) =>
      GoalService.updateGoalProgress(goalId, signal, userId),
  },
  ledger: supabaseLedger,
  resolveUserId: defaultResolveUserId,
});

/** Convenience for UI: progress snapshot of a tracked goal. */
export const trackingProgress = buildGoalProgress;
