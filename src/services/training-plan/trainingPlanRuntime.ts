// Pure runtime helpers for program execution.
// No I/O, no React — safe to unit test and reuse everywhere.

import type {
  CurrentProgramState,
  OverallProgress,
  PlanStatus,
  PlannedWorkout,
  TrainingPlan,
  TrainingWeek,
  WeeklyProgress,
  WorkoutStatus,
} from "./trainingPlanTypes";

/* ---------------- Dates ---------------- */

export function toDateKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  return toDateKey(dt);
}

/** Monday-anchored schedule: week 1 day 1 == start date. */
export function scheduledDateFor(startDate: string, weekNumber: number, dayNumber: number): string {
  return addDays(startDate, (weekNumber - 1) * 7 + (dayNumber - 1));
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = Date.UTC(ay, (am ?? 1) - 1, ad ?? 1);
  const db = Date.UTC(by, (bm ?? 1) - 1, bd ?? 1);
  return Math.round((db - da) / 86400000);
}

/* ---------------- Position & status ---------------- */

/** Linear index of a (week, day) pair, used for ordering comparisons. */
export function positionOf(weekNumber: number, dayNumber: number): number {
  return (weekNumber - 1) * 7 + dayNumber;
}

/**
 * Derive the effective execution status of a workout. Terminal statuses
 * persisted in the database win; everything else is positional.
 */
export function deriveWorkoutStatus(
  workout: Pick<PlannedWorkout, "weekNumber" | "dayNumber" | "isCompleted" | "status">,
  plan: Pick<TrainingPlan, "currentWeek" | "currentDay" | "status">,
): WorkoutStatus {
  if (workout.isCompleted || workout.status === "completed") return "completed";
  if (workout.status === "skipped") return "skipped";
  if (workout.status === "in_progress") return "in_progress";

  const cursor = positionOf(plan.currentWeek, plan.currentDay);
  const pos = positionOf(workout.weekNumber, workout.dayNumber);
  if (pos < cursor) return "missed";
  if (pos === cursor) return "available";
  return "locked";
}

export function applyDerivedStatuses(plan: TrainingPlan): TrainingPlan {
  return {
    ...plan,
    weeks: plan.weeks.map((w) => ({
      ...w,
      workouts: w.workouts.map((wk) => ({ ...wk, status: deriveWorkoutStatus(wk, plan) })),
    })),
  };
}

/* ---------------- Progress ---------------- */

export function computeWeeklyProgress(week: TrainingWeek): WeeklyProgress {
  const total = week.workouts.length;
  const completed = week.workouts.filter((w) => w.status === "completed").length;
  return {
    weekNumber: week.weekNumber,
    objective: week.objective,
    isDeload: week.isDeload,
    totalWorkouts: total,
    completedWorkouts: completed,
    remainingWorkouts: Math.max(0, total - completed),
    recoveryDays: week.days.filter((d) => d.dayType === "recovery").length,
    percentage: total ? Math.round((completed / total) * 100) : 0,
  };
}

export function isWeekComplete(week: TrainingWeek): boolean {
  return week.workouts.length > 0 && week.workouts.every((w) => w.status === "completed");
}

/** Consecutive-day streak based on completed workout dates. */
export function computeStreak(plan: TrainingPlan, today = toDateKey(new Date())): number {
  const dates = Array.from(
    new Set(
      allWorkouts(plan)
        .filter((w) => w.status === "completed" && w.completedAt)
        .map((w) => toDateKey(w.completedAt as string)),
    ),
  ).sort((a, b) => (a < b ? 1 : -1));
  if (!dates.length) return 0;

  const gapToToday = daysBetween(dates[0], today);
  if (gapToToday > 1) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i], dates[i - 1]) === 1) streak++;
    else break;
  }
  return streak;
}

export function allWorkouts(plan: TrainingPlan): PlannedWorkout[] {
  return plan.weeks.flatMap((w) => w.workouts);
}

export function computeOverallProgress(plan: TrainingPlan): OverallProgress {
  const workouts = allWorkouts(plan);
  const completed = workouts.filter((w) => w.status === "completed");
  const total = workouts.length;
  const completedWeeks = plan.weeks.filter(isWeekComplete).length;
  const next = findNextWorkout(plan);
  const last = completed
    .map((w) => w.completedAt)
    .filter(Boolean)
    .sort()
    .pop();

  return {
    totalWeeks: plan.totalWeeks,
    completedWeeks,
    totalWorkouts: total,
    completedWorkouts: completed.length,
    remainingWorkouts: Math.max(0, total - completed.length),
    skippedWorkouts: workouts.filter((w) => w.status === "skipped").length,
    missedWorkouts: workouts.filter((w) => w.status === "missed").length,
    recoveryDays: plan.weeks.reduce(
      (acc, w) => acc + w.days.filter((d) => d.dayType === "recovery").length,
      0,
    ),
    percentage: total ? Math.round((completed.length / total) * 100) : 0,
    currentStreak: computeStreak(plan),
    lastWorkoutDate: last ? toDateKey(last) : null,
    nextWorkoutDate: next?.scheduledDate ?? null,
  };
}

/* ---------------- Navigation ---------------- */

export function findWorkoutAt(
  plan: TrainingPlan,
  weekNumber: number,
  dayNumber: number,
): PlannedWorkout | null {
  return (
    allWorkouts(plan).find((w) => w.weekNumber === weekNumber && w.dayNumber === dayNumber) ?? null
  );
}

function sortedWorkouts(plan: TrainingPlan): PlannedWorkout[] {
  return [...allWorkouts(plan)].sort(
    (a, b) => positionOf(a.weekNumber, a.dayNumber) - positionOf(b.weekNumber, b.dayNumber),
  );
}

/** First not-yet-completed workout at or after the cursor. */
export function findNextWorkout(plan: TrainingPlan): PlannedWorkout | null {
  const cursor = positionOf(plan.currentWeek, plan.currentDay);
  return (
    sortedWorkouts(plan).find(
      (w) => positionOf(w.weekNumber, w.dayNumber) >= cursor && w.status !== "completed",
    ) ??
    sortedWorkouts(plan).find((w) => w.status !== "completed") ??
    null
  );
}

export function findPreviousWorkout(plan: TrainingPlan): PlannedWorkout | null {
  const cursor = positionOf(plan.currentWeek, plan.currentDay);
  const before = sortedWorkouts(plan).filter((w) => positionOf(w.weekNumber, w.dayNumber) < cursor);
  return before.at(-1) ?? null;
}

export function nextCursor(plan: Pick<TrainingPlan, "currentWeek" | "currentDay" | "totalWeeks">): {
  week: number;
  day: number;
  finished: boolean;
} {
  let day = plan.currentDay + 1;
  let week = plan.currentWeek;
  if (day > 7) {
    day = 1;
    week += 1;
  }
  if (week > plan.totalWeeks) {
    return { week: plan.totalWeeks, day: 7, finished: true };
  }
  return { week, day, finished: false };
}

/* ---------------- Lifecycle transitions ---------------- */

const TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
  draft: ["active", "cancelled", "regenerated"],
  active: ["paused", "completed", "cancelled", "regenerated", "expired"],
  paused: ["active", "cancelled", "completed", "regenerated", "expired"],
  completed: ["regenerated", "archived", "active"],
  cancelled: ["regenerated", "archived"],
  regenerated: ["archived"],
  expired: ["regenerated", "archived", "active"],
  archived: [],
};

export function canTransition(from: PlanStatus, to: PlanStatus): boolean {
  return from === to || (TRANSITIONS[from] ?? []).includes(to);
}

export function assertTransition(from: PlanStatus, to: PlanStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Transição de programa inválida: ${from} → ${to}`);
  }
}

/** Build the full runtime snapshot from a loaded plan. */
export function buildProgramState(plan: TrainingPlan): CurrentProgramState {
  const withStatus = applyDerivedStatuses(plan);
  const currentWeek =
    withStatus.weeks.find((w) => w.weekNumber === withStatus.currentWeek) ??
    withStatus.weeks[0] ??
    null;
  const tomorrow = nextCursor(withStatus);

  return {
    plan: withStatus,
    status: withStatus.status,
    currentWeek,
    currentWeekNumber: withStatus.currentWeek,
    currentDay: withStatus.currentDay,
    todayWorkout: findWorkoutAt(withStatus, withStatus.currentWeek, withStatus.currentDay),
    tomorrowWorkout: tomorrow.finished
      ? null
      : findWorkoutAt(withStatus, tomorrow.week, tomorrow.day),
    nextWorkout: findNextWorkout(withStatus),
    previousWorkout: findPreviousWorkout(withStatus),
    weekly: currentWeek ? computeWeeklyProgress(currentWeek) : null,
    overall: computeOverallProgress(withStatus),
  };
}
