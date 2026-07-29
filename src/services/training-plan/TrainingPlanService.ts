// TrainingPlanService
//
// Central engine for planning workouts. Reuses WorkoutGeneratorService for
// the base workout, then produces a deterministic 4-week program and
// persists it into training_plans / training_weeks / training_days /
// planned_workouts.

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
import type {
  PlannedWorkout,
  PlanStatus,
  TrainingDay,
  TrainingPlan,
  TrainingPlanSummary,
  TrainingWeek,
} from "./trainingPlanTypes";

/* ---------------- Persistence helpers ---------------- */

async function upsertActivePlanShell(
  userId: string,
  base: GeneratedWorkout,
  ob: OnboardingData,
  daysPerWeek: number,
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
      completed: false,
    }));
    const { error: dayErr } = await supabase.from("training_days").insert(dayRows);
    if (dayErr) throw dayErr;
  }
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

  return {
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
    weeks: weeksOut,
  };
}

async function getActivePlanId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("training_plans")
    .select("id, total_weeks")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // Only treat true multi-week plans as generated plans (legacy single-workout
  // plans from Sprint 4.2 have total_weeks = 4 default too, so also check for
  // an actual training_weeks row).
  if (!data) return null;
  const { count } = await supabase
    .from("training_weeks")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", data.id);
  return (count ?? 0) > 0 ? data.id : null;
}

/* ---------------- Public service ---------------- */

export const TrainingPlanService = {
  /**
   * Generate the user's complete 4-week plan. Idempotent: returns the
   * existing active plan if one is already persisted.
   */
  async generateTrainingPlan(userId: string): Promise<TrainingPlan> {
    const existingId = await getActivePlanId(userId);
    if (existingId) {
      const existing = await loadPlan(userId, existingId);
      if (existing) return existing;
    }

    const [ob, ass] = await Promise.all([
      fetchOnboarding(userId),
      fetchAssessment(userId),
    ]);
    const onboarding: OnboardingData = ob ?? EMPTY_ONBOARDING;
    const assessment: AssessmentData = ass ?? EMPTY_ASSESSMENT;

    // Reuse the workout generator for the base workout — never duplicate rules.
    const baseWorkout = await WorkoutGeneratorService.generateFirstWorkout(userId, {
      weightKg: onboarding.weight_kg,
    });

    const built = buildFourWeekPlan(onboarding, assessment, baseWorkout);

    const planId = await upsertActivePlanShell(userId, baseWorkout, onboarding, built.daysPerWeek);
    await persistWeeks(userId, planId, built.weeks);

    const loaded = await loadPlan(userId, planId);
    if (!loaded) throw new Error("Falha ao carregar plano recém-criado");
    return loaded;
  },

  /** Wipe the active plan's weeks/days/workouts and regenerate. */
  async regenerateTrainingPlan(userId: string): Promise<TrainingPlan> {
    const existingId = await getActivePlanId(userId);
    if (existingId) {
      // Cascade deletes weeks/days/planned_workouts through FKs.
      await supabase.from("training_plans").delete().eq("id", existingId).eq("user_id", userId);
    }
    return this.generateTrainingPlan(userId);
  },

  async getActivePlan(userId: string): Promise<TrainingPlan | null> {
    const id = await getActivePlanId(userId);
    if (!id) return null;
    return loadPlan(userId, id);
  },

  async getCurrentWeek(userId: string): Promise<TrainingWeek | null> {
    const plan = await this.getActivePlan(userId);
    if (!plan) return null;
    return plan.weeks.find((w) => w.weekNumber === plan.currentWeek) ?? plan.weeks[0] ?? null;
  },

  async getTodayWorkout(userId: string): Promise<PlannedWorkout | null> {
    const plan = await this.getActivePlan(userId);
    if (!plan) return null;
    const week = plan.weeks.find((w) => w.weekNumber === plan.currentWeek);
    if (!week) return null;
    return week.workouts.find((w) => w.dayNumber === plan.currentDay) ?? null;
  },

  async pausePlan(userId: string, planId: string) {
    await supabase
      .from("training_plans")
      .update({ status: "paused" })
      .eq("id", planId)
      .eq("user_id", userId);
  },

  async resumePlan(userId: string, planId: string) {
    await supabase
      .from("training_plans")
      .update({ status: "active" })
      .eq("id", planId)
      .eq("user_id", userId);
  },

  async advanceDay(userId: string, planId: string) {
    const plan = await loadPlan(userId, planId);
    if (!plan) return;
    let nextDay = plan.currentDay + 1;
    let nextWeek = plan.currentWeek;
    if (nextDay > 7) {
      nextDay = 1;
      nextWeek = Math.min(plan.totalWeeks, plan.currentWeek + 1);
    }
    await supabase
      .from("training_plans")
      .update({ current_day: nextDay, current_week: nextWeek })
      .eq("id", planId)
      .eq("user_id", userId);
  },

  async markWorkoutCompleted(userId: string, plannedWorkoutId: string) {
    const nowIso = new Date().toISOString();
    await supabase
      .from("planned_workouts")
      .update({ is_completed: true, completed_at: nowIso })
      .eq("id", plannedWorkoutId)
      .eq("user_id", userId);
    await supabase
      .from("training_days")
      .update({ completed: true, completed_at: nowIso })
      .eq("planned_workout_id", plannedWorkoutId)
      .eq("user_id", userId);
  },

  /** Compact preview payload for the "plan ready" screen. */
  async getSummary(userId: string): Promise<TrainingPlanSummary | null> {
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

export type { TrainingPlan, TrainingWeek, TrainingDay, PlannedWorkout, TrainingPlanSummary } from "./trainingPlanTypes";
