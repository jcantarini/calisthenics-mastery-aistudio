// Sprint 7.3B — Goal Reward Recovery.
//
// Reliability gap it closes: a goal can be persisted as `completed` while the
// in-memory `goal_completed` event is lost (crash, network loss, app closed)
// before the Gamification pipeline finished. The goal stays completed forever,
// but the reward side effects never happened.
//
// This module OWNS NOTHING. It only detects a missing execution of the
// existing pipeline and replays it:
//
//   GoalRewardRecovery -> GamificationOrchestrator.processGoalCompleted
//                      -> XPService -> ProgressionService -> AchievementService
//
// It never writes XP, levels, achievements — and never touches goal state.
//
// Identity: the deterministic XP source reference `goal_completed:<goalId>`
// (owned by the XP domain) is the authoritative proof that the reward ran.
// No extra table, no extra column.

import { goalCompletionSourceId } from "@/services/xp/xpRules";
import type { Goal } from "./goalTypes";

/**
 * Historical activation boundary.
 *
 * Goals × Gamification became active with the Sprint 7.3 migration
 * (`user_goals.difficulty`, 2026-08-10T19:41:17Z). Goals completed before that
 * moment were never eligible for goal-completion rewards, so recovery must not
 * retro-award them. Only completions at or after this instant are reconciled.
 */
export const GOAL_REWARDS_ACTIVATED_AT = "2026-08-10T19:41:17.000Z";

/** Reliability reconciliation, not analytics: keep the scan bounded. */
export const GOAL_REWARD_RECOVERY_LIMIT = 50;

export type GoalRewardSkipReason =
  | "not_completed"
  | "missing_completed_at"
  | "before_activation"
  | "already_processed";

export interface GoalRewardRecoveryEntry {
  goalId: string;
  status: "recovered" | "already_processed" | "skipped" | "failed";
  reason?: GoalRewardSkipReason;
  error?: string;
}

export interface GoalRewardRecoveryReport {
  userId: string;
  scanned: number;
  alreadyProcessed: number;
  recovered: number;
  skipped: number;
  failed: number;
  errors: string[];
  entries: GoalRewardRecoveryEntry[];
}

export interface GoalRewardRecoveryPorts {
  /** Bounded list of completed goals, newest completion first. */
  listCompletedGoals(userId: string, limit: number): Promise<Goal[]>;
  /** Authoritative completed-goal count (achievements use absolute updates). */
  countCompletedGoals(userId: string): Promise<number>;
  /** XP domain read: has this deterministic source already been rewarded? */
  hasProcessedSource(sourceId: string, userId: string): Promise<boolean>;
  /** The one existing reward entry point. */
  processGoalCompleted(options: {
    goalId: string;
    goalType?: string;
    difficulty?: string;
    goalsCompleted?: number;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<unknown>;
  /** Optional clock/limit overrides for tests. */
  activatedAt?: string;
  limit?: number;
  log?: (message: string, data?: Record<string, unknown>) => void;
}

/** Pure eligibility rule — no I/O, fully unit-testable. */
export function goalRewardEligibility(
  goal: Pick<Goal, "status" | "completedAt">,
  activatedAt: string = GOAL_REWARDS_ACTIVATED_AT,
): { eligible: boolean; reason?: GoalRewardSkipReason } {
  if (goal.status !== "completed") return { eligible: false, reason: "not_completed" };
  if (!goal.completedAt) return { eligible: false, reason: "missing_completed_at" };
  if (Date.parse(goal.completedAt) < Date.parse(activatedAt)) {
    return { eligible: false, reason: "before_activation" };
  }
  return { eligible: true };
}

function emptyReport(userId: string): GoalRewardRecoveryReport {
  return {
    userId,
    scanned: 0,
    alreadyProcessed: 0,
    recovered: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    entries: [],
  };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createGoalRewardRecovery(ports: GoalRewardRecoveryPorts) {
  const activatedAt = ports.activatedAt ?? GOAL_REWARDS_ACTIVATED_AT;
  const limit = ports.limit ?? GOAL_REWARD_RECOVERY_LIMIT;
  const log = ports.log ?? ((m: string, d?: Record<string, unknown>) => console.info(m, d ?? {}));

  /** Reconcile one goal. Never throws; failures are reported, not propagated. */
  async function reconcileOne(
    goal: Goal,
    userId: string,
    goalsCompleted: number | undefined,
  ): Promise<GoalRewardRecoveryEntry> {
    const eligibility = goalRewardEligibility(goal, activatedAt);
    if (!eligibility.eligible) {
      return { goalId: goal.id, status: "skipped", reason: eligibility.reason };
    }
    try {
      const sourceId = goalCompletionSourceId(goal.id);
      if (await ports.hasProcessedSource(sourceId, userId)) {
        return { goalId: goal.id, status: "already_processed", reason: "already_processed" };
      }
      await ports.processGoalCompleted({
        goalId: goal.id,
        goalType: goal.type,
        difficulty: goal.difficulty,
        goalsCompleted,
        userId,
        metadata: { completedAt: goal.completedAt, recovered: true },
      });
      return { goalId: goal.id, status: "recovered" };
    } catch (error) {
      return { goalId: goal.id, status: "failed", error: message(error) };
    }
  }

  function fold(report: GoalRewardRecoveryReport, entry: GoalRewardRecoveryEntry) {
    report.entries.push(entry);
    if (entry.status === "recovered") report.recovered += 1;
    else if (entry.status === "already_processed") report.alreadyProcessed += 1;
    else if (entry.status === "skipped") report.skipped += 1;
    else {
      report.failed += 1;
      if (entry.error) report.errors.push(`${entry.goalId}: ${entry.error}`);
    }
  }

  return {
    /**
     * Bounded, idempotent reconciliation of recently completed goals.
     * Safe after authentication, after startup, after reconnect, after
     * returning to foreground and during manual diagnostics: running it N
     * times produces the same final state as running it once.
     */
    async reconcileCompletedGoalRewards(userId: string): Promise<GoalRewardRecoveryReport> {
      const report = emptyReport(userId);
      log("[goals] reward reconciliation started", { limit });

      let goals: Goal[] = [];
      try {
        goals = await ports.listCompletedGoals(userId, limit);
      } catch (error) {
        report.failed += 1;
        report.errors.push(`list: ${message(error)}`);
        return report;
      }
      report.scanned = goals.length;

      let goalsCompleted: number | undefined;
      try {
        goalsCompleted = await ports.countCompletedGoals(userId);
      } catch {
        // Optional optimisation; the achievement engine falls back to increment.
        goalsCompleted = undefined;
      }

      // Sequential on purpose: one failing goal must not stop the others,
      // and the reward pipeline is not meant to be hammered in parallel.
      for (const goal of goals) {
        fold(report, await reconcileOne(goal, userId, goalsCompleted));
      }

      log("[goals] reward reconciliation finished", {
        scanned: report.scanned,
        recovered: report.recovered,
        alreadyProcessed: report.alreadyProcessed,
        skipped: report.skipped,
        failed: report.failed,
      });
      return report;
    },

    /** Diagnostics / targeted retry for a single goal. */
    async reconcileGoalReward(goal: Goal, userId: string): Promise<GoalRewardRecoveryEntry> {
      let goalsCompleted: number | undefined;
      try {
        goalsCompleted = await ports.countCompletedGoals(userId);
      } catch {
        goalsCompleted = undefined;
      }
      return reconcileOne(goal, userId, goalsCompleted);
    },
  };
}

export type GoalRewardRecoveryInstance = ReturnType<typeof createGoalRewardRecovery>;

/**
 * Live instance wired to the real domains. Gamification and XP are imported
 * lazily so the Goals domain keeps no static dependency on them.
 */
export const GoalRewardRecoveryService = {
  async reconcileCompletedGoalRewards(userId: string): Promise<GoalRewardRecoveryReport> {
    const [{ GoalService }, { XPService }, { GamificationOrchestrator }] = await Promise.all([
      import("./GoalService"),
      import("@/services/xp"),
      import("@/services/gamification/GamificationOrchestrator"),
    ]);
    const recovery = createGoalRewardRecovery({
      listCompletedGoals: (uid, limit) => GoalService.getRecentCompletedGoals(limit, uid),
      countCompletedGoals: (uid) => GoalService.countCompletedGoals(uid),
      hasProcessedSource: (sourceId, uid) =>
        XPService.hasProcessedSource("goal_completed", sourceId, uid),
      processGoalCompleted: (options) => GamificationOrchestrator.processGoalCompleted(options),
    });
    return recovery.reconcileCompletedGoalRewards(userId);
  },

  /** Targeted retry (diagnostics). Returns null when the goal does not exist. */
  async reconcileGoalReward(
    goalId: string,
    userId: string,
  ): Promise<GoalRewardRecoveryEntry | null> {
    const [{ GoalService }, { XPService }, { GamificationOrchestrator }] = await Promise.all([
      import("./GoalService"),
      import("@/services/xp"),
      import("@/services/gamification/GamificationOrchestrator"),
    ]);
    const goal = await GoalService.getGoal(goalId, userId);
    if (!goal) return null;
    const recovery = createGoalRewardRecovery({
      listCompletedGoals: (uid, limit) => GoalService.getRecentCompletedGoals(limit, uid),
      countCompletedGoals: (uid) => GoalService.countCompletedGoals(uid),
      hasProcessedSource: (sourceId, uid) =>
        XPService.hasProcessedSource("goal_completed", sourceId, uid),
      processGoalCompleted: (options) => GamificationOrchestrator.processGoalCompleted(options),
    });
    return recovery.reconcileGoalReward(goal, userId);
  },

  /** Fire-and-forget entry point for lifecycle triggers (startup, reconnect). */
  reconcileSafely(userId: string): void {
    void GoalRewardRecoveryService.reconcileCompletedGoalRewards(userId).catch((error) => {
      console.error("[goals] reward reconciliation failed", error);
    });
  },
};
