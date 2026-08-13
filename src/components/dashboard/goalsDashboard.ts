// Dashboard Goals — PURE presentation helpers (Sprint 7.4B-3).
//
// No React, no Supabase, no reward math. Progress comes from the Goals domain
// (buildGoalProgress) and reward amounts come exclusively from the persisted
// XP ledger (XPEntry.amount) matched by the canonical source identity.

import { buildGoalProgress } from "@/services/goals/goalRules";
import type { Goal, GoalProgress } from "@/services/goals/goalTypes";
import { goalCompletionSourceId } from "@/services/xp/xpRules";
import type { XPEntry } from "@/services/xp/xpTypes";
import { sortGoalsForDisplay } from "@/components/goals/goalPresentation";

/* ---------------- Dashboard model ---------------- */

export type GoalsDashboardState = "empty" | "spotlight" | "inactive" | "completedOnly";

export interface GoalsDashboardCounts {
  active: number;
  draft: number;
  paused: number;
  completed: number;
  total: number;
}

export interface GoalsDashboardModel {
  state: GoalsDashboardState;
  counts: GoalsDashboardCounts;
  /** Highlighted goal with its canonical progress, computed exactly once. */
  spotlight: { goal: Goal; progress: GoalProgress } | null;
}

/**
 * Deterministic spotlight: active goals first, then drafts awaiting
 * activation, each group ordered by the shared display sorting rules.
 */
export function buildGoalsDashboardModel(goals: readonly Goal[]): GoalsDashboardModel {
  const counts: GoalsDashboardCounts = {
    active: goals.filter((g) => g.status === "active").length,
    draft: goals.filter((g) => g.status === "draft").length,
    paused: goals.filter((g) => g.status === "paused").length,
    completed: goals.filter((g) => g.status === "completed").length,
    total: goals.length,
  };

  if (goals.length === 0) {
    return { state: "empty", counts, spotlight: null };
  }

  const actives = sortGoalsForDisplay(goals.filter((g) => g.status === "active"));
  const drafts = sortGoalsForDisplay(goals.filter((g) => g.status === "draft"));
  const chosen = actives[0] ?? drafts[0] ?? null;

  if (chosen) {
    return {
      state: "spotlight",
      counts,
      spotlight: { goal: chosen, progress: buildGoalProgress(chosen) },
    };
  }

  const onlyCompleted = counts.completed > 0 && counts.paused === 0;
  return { state: onlyCompleted ? "completedOnly" : "inactive", counts, spotlight: null };
}

/* ---------------- Reward ledger matching ---------------- */

/** A goal reward is confirmed only by the persisted ledger contract. */
export function isGoalRewardEntry(entry: XPEntry, goalId: string): boolean {
  return entry.eventType === "goal_completed" && entry.sourceId === goalCompletionSourceId(goalId);
}

export function findGoalRewardEntry(
  entries: readonly XPEntry[],
  goalId: string | null,
): XPEntry | null {
  if (!goalId) return null;
  return entries.find((entry) => isGoalRewardEntry(entry, goalId)) ?? null;
}

export type GoalRewardState = "confirmed" | "pending" | "unavailable";

export function goalRewardState(options: {
  loading: boolean;
  error: boolean;
  entry: XPEntry | null;
}): GoalRewardState {
  if (options.entry) return "confirmed";
  if (options.error) return "unavailable";
  return "pending";
}

/* ---------------- Recent goal rewards ---------------- */

export interface RecentGoalReward {
  id: string;
  amount: number;
  createdAt: string;
  /** Resolved goal title, or null when the goal is unavailable/deleted. */
  goalTitle: string | null;
}

/**
 * Automatic and manual completions are indistinguishable here on purpose:
 * both write the same ledger contract. The raw source id never leaves this
 * module.
 */
export function buildRecentGoalRewards(
  entries: readonly XPEntry[],
  goals: readonly Goal[],
  limit = 3,
): RecentGoalReward[] {
  const titleBySource = new Map<string, string>();
  for (const goal of goals) titleBySource.set(goalCompletionSourceId(goal.id), goal.title);

  return entries
    .filter((entry) => entry.eventType === "goal_completed")
    .slice(0, limit)
    .map((entry) => ({
      id: entry.id,
      amount: entry.amount,
      createdAt: entry.createdAt,
      goalTitle: (entry.sourceId && titleBySource.get(entry.sourceId)) || null,
    }));
}

/* ---------------- Completion presentation ---------------- */

/**
 * Whether a manual progress mutation result should open the completion
 * reward presentation. Completion itself is decided by the Goals domain.
 */
export function shouldPresentGoalCompletion(updated: Pick<Goal, "status"> | null): boolean {
  return updated?.status === "completed";
}

/* ---------------- Counter labels (presentation only) ---------------- */

export type GoalCounterCategory = "active" | "paused" | "completed";

const COUNTER_KEY_BASE: Record<GoalCounterCategory, string> = {
  active: "gl.dash.countActive",
  paused: "gl.dash.countPaused",
  completed: "gl.dash.countCompleted",
};

/**
 * Deterministic singular/plural key selection. Singular only for exactly 1;
 * 0 and every other value use the plural form.
 */
export function goalCounterLabelKey(category: GoalCounterCategory, count: number): string {
  return `${COUNTER_KEY_BASE[category]}${count === 1 ? "One" : "Other"}`;
}
