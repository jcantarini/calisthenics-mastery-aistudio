// TrainingPlanService
//
// Single source of truth for every training-plan read, write, navigation and
// progress computation. React components MUST NOT query training tables.
//
// Responsibilities:
//  - loading / saving plans
//  - program lifecycle transitions
//  - workout status + program navigation
//  - progress calculation
//
// Generation rules live in WorkoutGeneratorService + trainingPlanRules.
// Pure runtime math lives in trainingPlanRuntime.

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  fetchOnboarding,
  EMPTY_ONBOARDING,
  type OnboardingData,
} from "@/lib/onboarding";
import {
  fetchAssessment,
  EMPTY_ASSESSMENT,
  type AssessmentData,
} from "@/lib/assessment";
import { WorkoutGeneratorService } from "@/services/workout-generator/WorkoutGeneratorService";
import type { GeneratedWorkout } from "@/services/workout-generator/workoutTypes";
import { buildFourWeekPlan, programBySlug } from "./trainingPlanRules";
import {
  applyDerivedStatuses,
  assertTransition,
  buildProgramState,
  computeOverallProgress,
  computeWeeklyProgress,
  findNextWorkout,
  findPreviousWorkout,
  findWorkoutAt,
  isWeekComplete,
  nextCursor,
  scheduledDateFor,
  toDateKey,
} from "./trainingPlanRuntime";
import type {
  CurrentProgramState,
  OverallProgress,
  PlanStatus,
  PlannedWorkout,
  TrainingDay,
  TrainingPlan,
  TrainingPlanSummary,
  TrainingWeek,
  WeeklyProgress,
  WorkoutStatus,
} from "./trainingPlanTypes";

/* ---------------- Identity ---------------- */

async function resolveUserId(userId?: string): Promise<string> {
  if (userId) return userId;
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Usuário não autenticado");
  return data.user.id;
}

/* ---------------- Persistence helpers ---------------- */

async function upsertActivePlanShell(
  userId: string,
  base: GeneratedWorkout,
  ob: OnboardingData,
  daysPerWeek: number,
  startDate: string,
): Promise<string> {
  // Deactivate any other active plans first.
  await supabase
    .from("training_plans")
    .update({ is_active: false, status: "archived" })
    .eq("user_id", userId)
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("training_plans")
    .insert({
      user_id: userId,
      name: `${base.programTitle} · 4 semanas`,
      description: `Plano personalizado de 4 semanas baseado em ${base.programTitle}.`,
      program_slug: base.programSlug,
      is_active: true,
      status: "active",
      total_weeks: 4,
      current_week: 1,
      current_day: 1,
      difficulty: base.difficulty,
      primary_goal: ob.primary_goal ?? null,
      target_skill: ob.skill_goal ?? null,
      fitness_level: ob.fitness_level ?? null,
      days_per_week: daysPerWeek,
      workout_duration_min: base.estimatedDurationMin,
      started_at: new Date().toISOString(),
      start_date: startDate,
      completed_workouts: 0,
      completed_weeks: 0,
      progress_percentage: 0,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Falha ao criar plano");
  return data.id;
}

async function persistWeeks(
  userId: string,
  planId: string,
  weeks: TrainingWeek[],
  startDate: string,
): Promise<void> {
  for (const week of weeks) {
    const { data: weekRow, error: weekErr } = await supabase
      .from("training_weeks")
      .insert({
        plan_id: planId,
        user_id: userId,
        week_number: week.weekNumber,
        objective: week.objective,
        difficulty: week.difficulty,
        estimated_duration_min: week.estimatedDurationMin,
        workout_days_count: week.workoutDaysCount,
        recovery_days_count: week.recoveryDaysCount,
        is_deload: week.isDeload,
      })
      .select("id")
      .single();
    if (weekErr || !weekRow) throw weekErr ?? new Error("Falha ao criar semana");

    // Persist planned workouts (one per workout day)
    const workoutRows = week.workouts.map((w) => ({
      user_id: userId,
      plan_id: planId,
      week_number: week.weekNumber,
      day_number: w.dayNumber,
      name: w.name,
      description: w.description,
      difficulty: w.difficulty,
      program_slug: w.programSlug,
      estimated_duration_min: w.estimatedDurationMin,
      estimated_calories: w.estimatedCalories,
      warmup: w.warmup as unknown as Json,
      exercises: w.exercises as unknown as Json,
      cooldown: w.cooldown as unknown as Json,
      progression_data: (w.progressionData ?? {}) as unknown as Json,
      notes: w.notes,
      is_completed: false,
      status:
        week.weekNumber === 1 && w.dayNumber === firstWorkoutDay(week) ? "available" : "locked",
      scheduled_date: scheduledDateFor(startDate, week.weekNumber, w.dayNumber),
    }));

    let insertedWorkouts: { id: string; day_number: number }[] = [];
    if (workoutRows.length) {
      const { data, error } = await supabase
        .from("planned_workouts")
        .insert(workoutRows)
        .select("id, day_number");
      if (error || !data) throw error ?? new Error("Falha ao criar treinos da semana");
      insertedWorkouts = data;
    }

    const workoutIdByDay = new Map<number, string>(
      insertedWorkouts.map((r) => [r.day_number, r.id]),
    );

    const dayRows = week.days.map((d) => ({
      user_id: userId,
      plan_id: planId,
      week_id: weekRow.id,
      week_number: week.weekNumber,
      day_number: d.dayNumber,
      day_type: d.dayType,
      planned_workout_id: workoutIdByDay.get(d.dayNumber) ?? null,
      scheduled_date: scheduledDateFor(startDate, week.weekNumber, d.dayNumber),
      completed: false,
    }));
    const { error: dayErr } = await supabase.from("training_days").insert(dayRows);
    if (dayErr) throw dayErr;
  }
}

function firstWorkoutDay(week: TrainingWeek): number {
  return week.workouts.reduce((min, w) => Math.min(min, w.dayNumber), Number.MAX_SAFE_INTEGER);
}

async function loadPlan(userId: string, planId: string): Promise<TrainingPlan | null> {
  const { data: plan } = await supabase
    .from("training_plans")
    .select("*")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!plan) return null;

  const [{ data: weeks }, { data: workouts }, { data: days }] = await Promise.all([
    supabase.from("training_weeks").select("*").eq("plan_id", planId).order("week_number"),
    supabase
      .from("planned_workouts")
      .select("*")
      .eq("plan_id", planId)
      .order("week_number")
      .order("day_number"),
    supabase.from("training_days").select("*").eq("plan_id", planId).order("week_number").order("day_number"),
  ]);

  const program = programBySlug(plan.program_slug);
  const workoutsByWeek = new Map<number, PlannedWorkout[]>();
  (workouts ?? []).forEach((w) => {
    const arr = workoutsByWeek.get(w.week_number) ?? [];
    arr.push({
      id: w.id,
      planId: w.plan_id,
      weekNumber: w.week_number,
      dayNumber: w.day_number,
      name: w.name,
      description: w.description ?? "",
      difficulty: w.difficulty as PlannedWorkout["difficulty"],
      programSlug: w.program_slug,
      programTitle: program.title,
      estimatedDurationMin: w.estimated_duration_min,
      estimatedCalories: w.estimated_calories,
      warmup: (w.warmup as unknown as PlannedWorkout["warmup"]) ?? [],
      exercises: (w.exercises as unknown as PlannedWorkout["exercises"]) ?? [],
      cooldown: (w.cooldown as unknown as PlannedWorkout["cooldown"]) ?? [],
      notes: w.notes ?? "",
      isCompleted: w.is_completed,
      completedAt: w.completed_at,
      startedAt: w.started_at,
      scheduledDate: w.scheduled_date,
      status: (w.status as WorkoutStatus) ?? "locked",
      progressionData: (w.progression_data as unknown as PlannedWorkout["progressionData"]) ?? undefined,
    });
    workoutsByWeek.set(w.week_number, arr);
  });

  const daysByWeek = new Map<number, TrainingDay[]>();
  (days ?? []).forEach((d) => {
    const arr = daysByWeek.get(d.week_number) ?? [];
    arr.push({
      id: d.id,
      weekNumber: d.week_number,
      dayNumber: d.day_number,
      dayType: d.day_type as TrainingDay["dayType"],
      plannedWorkoutId: d.planned_workout_id,
      scheduledDate: d.scheduled_date,
      completed: d.completed,
      completedAt: d.completed_at,
      notes: d.notes,
    });
    daysByWeek.set(d.week_number, arr);
  });

  const weeksOut: TrainingWeek[] = (weeks ?? []).map((w) => ({
    id: w.id,
    weekNumber: w.week_number,
    objective: w.objective,
    difficulty: w.difficulty as TrainingWeek["difficulty"],
    estimatedDurationMin: w.estimated_duration_min,
    workoutDaysCount: w.workout_days_count,
    recoveryDaysCount: w.recovery_days_count,
    isDeload: w.is_deload,
    days: daysByWeek.get(w.week_number) ?? [],
    workouts: workoutsByWeek.get(w.week_number) ?? [],
  }));

  const loaded: TrainingPlan = {
    id: plan.id,
    userId: plan.user_id,
    name: plan.name,
    description: plan.description ?? "",
    programSlug: plan.program_slug,
    programTitle: program.title,
    primaryGoal: (plan.primary_goal as TrainingPlan["primaryGoal"]) ?? null,
    targetSkill: (plan.target_skill as TrainingPlan["targetSkill"]) ?? null,
    fitnessLevel: (plan.fitness_level as TrainingPlan["fitnessLevel"]) ?? null,
    difficulty: (plan.difficulty as TrainingPlan["difficulty"]) ?? "iniciante",
    totalWeeks: plan.total_weeks,
    currentWeek: plan.current_week,
    currentDay: plan.current_day,
    daysPerWeek: plan.days_per_week ?? 3,
    workoutDurationMin: plan.workout_duration_min ?? 30,
    status: (plan.status as PlanStatus) ?? "active",
    isActive: plan.is_active,
    startedAt: plan.started_at,
    startDate: plan.start_date,
    completedWorkouts: plan.completed_workouts ?? 0,
    completedWeeks: plan.completed_weeks ?? 0,
    lastWorkoutDate: plan.last_workout_date,
    nextWorkoutDate: plan.next_workout_date,
    progressPercentage: plan.progress_percentage ?? 0,
    weeks: weeksOut,
  };

  return applyDerivedStatuses(loaded);
}

async function getActivePlanId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("training_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .in("status", ["draft", "active", "paused", "completed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // Only treat true multi-week plans as generated plans (legacy single-workout
  // plans from Sprint 4.2 have no training_weeks rows).
  if (!data) return null;
  const { count } = await supabase
    .from("training_weeks")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", data.id);
  return (count ?? 0) > 0 ? data.id : null;
}

/** Persist aggregate progress + cursor onto the plan row. */
async function syncPlanProgress(plan: TrainingPlan): Promise<TrainingPlan> {
  const overall = computeOverallProgress(plan);
  const patch = {
    completed_workouts: overall.completedWorkouts,
    completed_weeks: overall.completedWeeks,
    progress_percentage: overall.percentage,
    last_workout_date: overall.lastWorkoutDate,
    next_workout_date: overall.nextWorkoutDate,
    current_week: plan.currentWeek,
    current_day: plan.currentDay,
    status: plan.status,
  };
  await supabase.from("training_plans").update(patch).eq("id", plan.id).eq("user_id", plan.userId);
  return {
    ...plan,
    completedWorkouts: overall.completedWorkouts,
    completedWeeks: overall.completedWeeks,
    progressPercentage: overall.percentage,
    lastWorkoutDate: overall.lastWorkoutDate ?? null,
    nextWorkoutDate: overall.nextWorkoutDate ?? null,
  };
}

async function setPlanStatus(plan: TrainingPlan, next: PlanStatus): Promise<TrainingPlan> {
  assertTransition(plan.status, next);
  const isActive = next === "active" || next === "paused" || next === "draft";
  await supabase
    .from("training_plans")
    .update({ status: next, is_active: isActive })
    .eq("id", plan.id)
    .eq("user_id", plan.userId);
  return { ...plan, status: next, isActive };
}

async function requirePlan(userId: string): Promise<TrainingPlan> {
  const id = await getActivePlanId(userId);
  const plan = id ? await loadPlan(userId, id) : null;
  if (!plan) throw new Error("Nenhum programa ativo encontrado");
  return plan;
}

/* ---------------- Public service ---------------- */

export const TrainingPlanService = {
  /* ----- Generation (delegates rules, never duplicates them) ----- */

  /**
   * Generate the user's complete 4-week plan. Idempotent: returns the
   * existing active plan if one is already persisted.
   */
  async generateTrainingPlan(userId?: string): Promise<TrainingPlan> {
    const uid = await resolveUserId(userId);
    const existingId = await getActivePlanId(uid);
    if (existingId) {
      const existing = await loadPlan(uid, existingId);
      if (existing) return existing;
    }

    const [ob, ass] = await Promise.all([fetchOnboarding(uid), fetchAssessment(uid)]);
    const onboarding: OnboardingData = ob ?? EMPTY_ONBOARDING;
    const assessment: AssessmentData = ass ?? EMPTY_ASSESSMENT;

    // Reuse the workout generator for the base workout — never duplicate rules.
    const baseWorkout = await WorkoutGeneratorService.generateFirstWorkout(uid, {
      weightKg: onboarding.weight_kg,
    });

    const built = buildFourWeekPlan(onboarding, assessment, baseWorkout);
    const startDate = toDateKey(new Date());

    const planId = await upsertActivePlanShell(uid, baseWorkout, onboarding, built.daysPerWeek, startDate);
    await persistWeeks(uid, planId, built.weeks, startDate);

    const loaded = await loadPlan(uid, planId);
    if (!loaded) throw new Error("Falha ao carregar plano recém-criado");
    return syncPlanProgress(loaded);
  },

  /** Archive the current program as "regenerated" and build a fresh one. */
  async regenerateProgram(userId?: string): Promise<TrainingPlan> {
    const uid = await resolveUserId(userId);
    const existingId = await getActivePlanId(uid);
    if (existingId) {
      const existing = await loadPlan(uid, existingId);
      if (existing) await setPlanStatus(existing, "regenerated");
      // Cascade deletes weeks/days/planned_workouts through FKs.
      await supabase.from("training_plans").delete().eq("id", existingId).eq("user_id", uid);
    }
    return this.generateTrainingPlan(uid);
  },

  /** @deprecated use regenerateProgram */
  async regenerateTrainingPlan(userId?: string): Promise<TrainingPlan> {
    return this.regenerateProgram(userId);
  },

  /* ----- Reads ----- */

  async getActivePlan(userId?: string): Promise<TrainingPlan | null> {
    const uid = await resolveUserId(userId);
    const id = await getActivePlanId(uid);
    if (!id) return null;
    return loadPlan(uid, id);
  },

  /** One-shot snapshot with everything a screen needs. */
  async getCurrentProgress(userId?: string): Promise<CurrentProgramState | null> {
    const plan = await this.getActivePlan(userId);
    return plan ? buildProgramState(plan) : null;
  },

  async getCurrentWeek(userId?: string): Promise<TrainingWeek | null> {
    const state = await this.getCurrentProgress(userId);
    return state?.currentWeek ?? null;
  },

  async getWeeklyProgress(userId?: string): Promise<WeeklyProgress | null> {
    const state = await this.getCurrentProgress(userId);
    return state?.weekly ?? null;
  },

  async getOverallProgress(userId?: string): Promise<OverallProgress | null> {
    const state = await this.getCurrentProgress(userId);
    return state?.overall ?? null;
  },

  async getTodayWorkout(userId?: string): Promise<PlannedWorkout | null> {
    const state = await this.getCurrentProgress(userId);
    return state?.todayWorkout ?? null;
  },

  async getTomorrowWorkout(userId?: string): Promise<PlannedWorkout | null> {
    const state = await this.getCurrentProgress(userId);
    return state?.tomorrowWorkout ?? null;
  },

  async getNextWorkout(userId?: string): Promise<PlannedWorkout | null> {
    const plan = await this.getActivePlan(userId);
    return plan ? findNextWorkout(plan) : null;
  },

  async getPreviousWorkout(userId?: string): Promise<PlannedWorkout | null> {
    const plan = await this.getActivePlan(userId);
    return plan ? findPreviousWorkout(plan) : null;
  },

  async getWorkoutAt(weekNumber: number, dayNumber: number, userId?: string) {
    const plan = await this.getActivePlan(userId);
    return plan ? findWorkoutAt(plan, weekNumber, dayNumber) : null;
  },

  /* ----- Workout status ----- */

  async startWorkout(plannedWorkoutId: string, userId?: string): Promise<CurrentProgramState | null> {
    const uid = await resolveUserId(userId);
    await supabase
      .from("planned_workouts")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", plannedWorkoutId)
      .eq("user_id", uid);
    return this.getCurrentProgress(uid);
  },

  /**
   * Mark a workout completed, move the cursor forward, refresh aggregates and
   * finish the program when the last session is done.
   */
  async completeWorkout(plannedWorkoutId: string, userId?: string): Promise<CurrentProgramState> {
    const uid = await resolveUserId(userId);
    const nowIso = new Date().toISOString();

    await supabase
      .from("planned_workouts")
      .update({ status: "completed", is_completed: true, completed_at: nowIso })
      .eq("id", plannedWorkoutId)
      .eq("user_id", uid);
    await supabase
      .from("training_days")
      .update({ completed: true, completed_at: nowIso })
      .eq("planned_workout_id", plannedWorkoutId)
      .eq("user_id", uid);

    let plan = await requirePlan(uid);
    plan = advanceCursorTo(plan, plannedWorkoutId);

    const done = plan.weeks.every(isWeekComplete);
    if (done && plan.status === "active") plan = await setPlanStatus(plan, "completed");

    plan = await syncPlanProgress(plan);
    return buildProgramState(plan);
  },

  /** @deprecated use completeWorkout */
  async markWorkoutCompleted(userId: string, plannedWorkoutId: string) {
    await this.completeWorkout(plannedWorkoutId, userId);
  },

  async skipWorkout(plannedWorkoutId: string, userId?: string): Promise<CurrentProgramState> {
    const uid = await resolveUserId(userId);
    await supabase
      .from("planned_workouts")
      .update({ status: "skipped" })
      .eq("id", plannedWorkoutId)
      .eq("user_id", uid);
    let plan = await requirePlan(uid);
    plan = advanceCursorTo(plan, plannedWorkoutId);
    plan = await syncPlanProgress(plan);
    return buildProgramState(plan);
  },

  /* ----- Navigation ----- */

  async advanceDay(userId?: string): Promise<CurrentProgramState> {
    const uid = await resolveUserId(userId);
    let plan = await requirePlan(uid);
    const next = nextCursor(plan);
    plan = { ...plan, currentWeek: next.week, currentDay: next.day };
    if (next.finished && plan.status === "active") plan = await setPlanStatus(plan, "completed");
    plan = await syncPlanProgress(plan);
    return buildProgramState(plan);
  },

  async advanceWeek(userId?: string): Promise<CurrentProgramState> {
    const uid = await resolveUserId(userId);
    let plan = await requirePlan(uid);
    if (plan.currentWeek >= plan.totalWeeks) return this.finishProgram(uid);
    plan = { ...plan, currentWeek: plan.currentWeek + 1, currentDay: 1 };
    plan = await syncPlanProgress(plan);
    return buildProgramState(plan);
  },

  /* ----- Lifecycle ----- */

  async pauseProgram(userId?: string): Promise<CurrentProgramState> {
    const uid = await resolveUserId(userId);
    let plan = await requirePlan(uid);
    plan = await setPlanStatus(plan, "paused");
    return buildProgramState(plan);
  },

  async resumeProgram(userId?: string): Promise<CurrentProgramState> {
    const uid = await resolveUserId(userId);
    let plan = await requirePlan(uid);
    plan = await setPlanStatus(plan, "active");
    return buildProgramState(plan);
  },

  async finishProgram(userId?: string): Promise<CurrentProgramState> {
    const uid = await resolveUserId(userId);
    let plan = await requirePlan(uid);
    plan = await setPlanStatus(plan, "completed");
    plan = await syncPlanProgress(plan);
    return buildProgramState(plan);
  },

  async cancelProgram(userId?: string): Promise<TrainingPlan> {
    const uid = await resolveUserId(userId);
    const plan = await requirePlan(uid);
    return setPlanStatus(plan, "cancelled");
  },

  /** Reset progress of the current program back to week 1 / day 1. */
  async restartProgram(userId?: string): Promise<CurrentProgramState> {
    const uid = await resolveUserId(userId);
    let plan = await requirePlan(uid);

    await supabase
      .from("planned_workouts")
      .update({ status: "locked", is_completed: false, completed_at: null, started_at: null })
      .eq("plan_id", plan.id)
      .eq("user_id", uid);
    await supabase
      .from("training_days")
      .update({ completed: false, completed_at: null })
      .eq("plan_id", plan.id)
      .eq("user_id", uid);

    if (plan.status !== "active") plan = await setPlanStatus(plan, "active");

    const reloaded = await loadPlan(uid, plan.id);
    if (!reloaded) throw new Error("Falha ao reiniciar o programa");
    const reset = await syncPlanProgress({ ...reloaded, currentWeek: 1, currentDay: 1 });
    return buildProgramState(reset);
  },

  /** @deprecated use pauseProgram */
  async pausePlan(userId?: string) {
    await this.pauseProgram(userId);
  },

  /** @deprecated use resumeProgram */
  async resumePlan(userId?: string) {
    await this.resumeProgram(userId);
  },

  /* ----- Summary ----- */

  /** Compact preview payload for the "plan ready" screen. */
  async getSummary(userId?: string): Promise<TrainingPlanSummary | null> {
    const plan = await this.getActivePlan(userId);
    if (!plan) return null;
    const wk1 = plan.weeks.find((w) => w.weekNumber === 1) ?? plan.weeks[0];
    if (!wk1) return null;
    return {
      planId: plan.id,
      programTitle: plan.programTitle,
      primaryGoal: plan.primaryGoal,
      targetSkill: plan.targetSkill,
      fitnessLevel: plan.fitnessLevel,
      difficulty: plan.difficulty,
      totalWeeks: plan.totalWeeks,
      daysPerWeek: plan.daysPerWeek,
      workoutDurationMin: plan.workoutDurationMin,
      weekOnePreview: wk1,
    };
  },
};

/** Move the cursor to just after the given workout (never backwards). */
function advanceCursorTo(plan: TrainingPlan, plannedWorkoutId: string): TrainingPlan {
  const target = plan.weeks.flatMap((w) => w.workouts).find((w) => w.id === plannedWorkoutId);
  if (!target) return plan;
  const base = { ...plan, currentWeek: target.weekNumber, currentDay: target.dayNumber };
  const next = nextCursor(base);
  const forward =
    (next.week - 1) * 7 + next.day > (plan.currentWeek - 1) * 7 + plan.currentDay
      ? { currentWeek: next.week, currentDay: next.day }
      : { currentWeek: plan.currentWeek, currentDay: plan.currentDay };
  return { ...plan, ...forward };
}

export { computeWeeklyProgress, computeOverallProgress };
export type {
  TrainingPlan,
  TrainingWeek,
  TrainingDay,
  PlannedWorkout,
  TrainingPlanSummary,
  CurrentProgramState,
  WeeklyProgress,
  OverallProgress,
  PlanStatus,
  WorkoutStatus,
} from "./trainingPlanTypes";
