// Goals UI — PRESENTATION ONLY.
// No domain rules live here: percentages, completion and lifecycle come from
// the Goals domain (goalRules / GoalService). This module only decides how
// already-computed values are shown.

import {
  Activity,
  Award,
  CalendarCheck,
  Dumbbell,
  Flame,
  HeartPulse,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { Goal, GoalCategory, GoalStatus, GoalUnit } from "@/services/goals";
import { validateGoalTransition } from "@/services/goals";

/* ---------------- Category ---------------- */

const CATEGORY_ICONS: Record<GoalCategory, LucideIcon> = {
  fitness: Activity,
  strength: Dumbbell,
  consistency: Flame,
  skill: Sparkles,
  program: CalendarCheck,
  body: HeartPulse,
  custom: Target,
};

export function categoryIcon(category: GoalCategory): LucideIcon {
  return CATEGORY_ICONS[category] ?? Target;
}

export function categoryLabelKey(category: GoalCategory): string {
  return `gl.cat.${category}`;
}

/* ---------------- Status ---------------- */

export type BadgeTone = "primary" | "accent" | "muted" | "success" | "warning" | "danger";

const STATUS_TONES: Record<GoalStatus, BadgeTone> = {
  draft: "muted",
  active: "primary",
  paused: "warning",
  completed: "success",
  cancelled: "muted",
  expired: "danger",
};

export function statusTone(status: GoalStatus): BadgeTone {
  return STATUS_TONES[status] ?? "muted";
}

export function statusLabelKey(status: GoalStatus): string {
  return `gl.status.${status}`;
}

/* ---------------- Deadline ---------------- */

export interface DeadlineInfo {
  daysLeft: number;
  overdue: boolean;
  lastDay: boolean;
}

function dayNumber(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000;
}

/** Days between today and the target date. `null` when the goal is open-ended. */
export function deadlineInfo(
  targetDate: string | null,
  today: Date = new Date(),
): DeadlineInfo | null {
  if (!targetDate) return null;
  const todayIso = today.toISOString().slice(0, 10);
  const daysLeft = dayNumber(targetDate) - dayNumber(todayIso);
  return { daysLeft, overdue: daysLeft < 0, lastDay: daysLeft === 0 };
}

export function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const date = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/* ---------------- Values ---------------- */

export function unitLabelKey(unit: GoalUnit): string {
  return `gl.unit.${unit}`;
}

function trim(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * "7 / 10 reps" — or an achieved/not-achieved sentence for boolean goals.
 * All numbers arrive pre-computed from the domain.
 */
export function formatGoalValue(
  goal: Pick<Goal, "progressType" | "targetValue" | "unit">,
  rawValue: number,
  t: (key: string) => string,
): string {
  if (goal.progressType === "boolean") {
    return rawValue >= 1 ? t("gl.achieved") : t("gl.notAchieved");
  }
  const unit = t(unitLabelKey(goal.unit));
  return `${trim(rawValue)} / ${trim(goal.targetValue)}${unit ? ` ${unit}` : ""}`;
}

/* ---------------- Ordering ---------------- */

const STATUS_ORDER: Record<GoalStatus, number> = {
  active: 0,
  draft: 1,
  paused: 2,
  expired: 3,
  completed: 4,
  cancelled: 5,
};

/**
 * Deterministic presentation order: live goals first, then nearest deadline,
 * then most recently created. Not a domain priority system.
 */
export function sortGoalsForDisplay<T extends Goal>(goals: readonly T[]): T[] {
  return [...goals].sort((a, b) => {
    const status = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (status !== 0) return status;
    if (a.status === "completed" || b.status === "completed") {
      return (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt);
    }
    if (a.targetDate && b.targetDate && a.targetDate !== b.targetDate) {
      return a.targetDate.localeCompare(b.targetDate);
    }
    if (a.targetDate && !b.targetDate) return -1;
    if (!a.targetDate && b.targetDate) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/* ---------------- Filters ---------------- */

export const GOAL_FILTERS = ["active", "paused", "completed", "all"] as const;
export type GoalFilter = (typeof GOAL_FILTERS)[number];

export function filterLabelKey(filter: GoalFilter): string {
  return `gl.${filter}`;
}

/** Active tab also surfaces drafts; "all" hides nothing. */
export function matchesFilter(goal: Pick<Goal, "status">, filter: GoalFilter): boolean {
  switch (filter) {
    case "active":
      return goal.status === "active" || goal.status === "draft";
    case "paused":
      return goal.status === "paused";
    case "completed":
      return goal.status === "completed";
    case "all":
      return true;
  }
}

/* ---------------- Difficulty ---------------- */

export function difficultyLabelKey(difficulty: string): string {
  return `gl.diff.${difficulty}`;
}

export const DIFFICULTY_ICON = Award;

/* ---------------- Lifecycle actions ---------------- */

export type GoalAction = "pause" | "resume" | "cancel" | "duplicate" | "delete";

/**
 * Which actions may be OFFERED for a goal. Availability is decided by the
 * domain (`validateGoalTransition`) — this helper only maps a legal
 * transition to a button. Deleting and duplicating are not transitions and
 * are always available.
 */
export function availableGoalActions(goal: Pick<Goal, "status">): GoalAction[] {
  const actions: GoalAction[] = [];
  if (validateGoalTransition(goal.status, "paused")) actions.push("pause");
  if (validateGoalTransition(goal.status, "active")) actions.push("resume");
  if (validateGoalTransition(goal.status, "cancelled")) actions.push("cancel");
  if (goal.status === "completed" || goal.status === "cancelled" || goal.status === "expired") {
    actions.push("duplicate");
  }
  actions.push("delete");
  return actions;
}

export function actionLabelKey(action: GoalAction): string {
  return `gl.${action}`;
}

export const DESTRUCTIVE_ACTIONS: ReadonlySet<GoalAction> = new Set<GoalAction>([
  "cancel",
  "delete",
]);

/* ---------------- Summary ---------------- */

export interface GoalsSummaryData {
  active: number;
  completed: number;
  averageProgress: number | null;
}

/**
 * Counts come from the loaded goals; the average uses ONLY percentages that
 * the domain already calculated (never a formula re-implemented here).
 */
export function buildGoalsSummary(
  goals: readonly Goal[],
  percentageOf: (goal: Goal) => number,
): GoalsSummaryData {
  const active = goals.filter((g) => g.status === "active" || g.status === "draft");
  const completed = goals.filter((g) => g.status === "completed");
  const average =
    active.length === 0
      ? null
      : Math.round(active.reduce((sum, g) => sum + percentageOf(g), 0) / active.length);
  return { active: active.length, completed: completed.length, averageProgress: average };
}
