// WorkoutGeneratorService
//
// Single entry point for personalized workout generation. React pages MUST
// call this service instead of duplicating rules or persistence. Future
// phases (4-week plans, regeneration, AI-based generation) should extend
// this service rather than reintroducing logic in components.

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { PROGRAMS } from "@/lib/programs";
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
import { buildWorkoutFromRules, resolveProgram } from "./workoutRules";
import type { GeneratedWorkout, GenerateOptions, WorkoutBlockItem, WorkoutExercise, Difficulty } from "./workoutTypes";

async function ensureTrainingPlan(
  userId: string,
  programSlug: string,
  programTitle: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("training_plans")
    .select("id, program_slug, is_active")
    .eq("user_id", userId)
    .eq("program_slug", programSlug)
    .maybeSingle();

  if (existing?.id) {
    if (!existing.is_active) {
      await supabase.from("training_plans").update({ is_active: true }).eq("id", existing.id);
    }
    return existing.id;
  }

  await supabase
    .from("training_plans")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("training_plans")
    .insert({
      user_id: userId,
      name: programTitle,
      description: `Plano personalizado baseado no programa ${programTitle}.`,
      program_slug: programSlug,
      is_active: true,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Falha ao criar plano");
  return data.id;
}

async function saveGeneratedWorkout(
  userId: string,
  planId: string,
  w: GeneratedWorkout,
  isFirst: boolean,
): Promise<string> {
  const { data, error } = await supabase
    .from("generated_workouts")
    .insert({
      user_id: userId,
      plan_id: planId,
      name: w.name,
      description: w.description,
      difficulty: w.difficulty,
      program_slug: w.programSlug,
      estimated_duration_min: w.estimatedDurationMin,
      estimated_calories: w.estimatedCalories,
      warmup: w.warmup as unknown as Json,
      exercises: w.exercises as unknown as Json,
      cooldown: w.cooldown as unknown as Json,
      notes: w.notes,
      is_first: isFirst,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Falha ao salvar treino");
  return data.id;
}

async function fetchFirstWorkoutRow(userId: string): Promise<GeneratedWorkout | null> {
  const { data } = await supabase
    .from("generated_workouts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_first", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const program = PROGRAMS.find((p) => p.slug === data.program_slug) ?? PROGRAMS[0];
  return {
    id: data.id,
    planId: data.plan_id ?? undefined,
    name: data.name,
    description: data.description ?? "",
    difficulty: data.difficulty as Difficulty,
    programSlug: data.program_slug,
    programTitle: program.title,
    estimatedDurationMin: data.estimated_duration_min,
    estimatedCalories: data.estimated_calories,
    warmup: (data.warmup as unknown as WorkoutBlockItem[]) ?? [],
    exercises: (data.exercises as unknown as WorkoutExercise[]) ?? [],
    cooldown: (data.cooldown as unknown as WorkoutBlockItem[]) ?? [],
    notes: data.notes ?? "",
  };
}

export const WorkoutGeneratorService = {
  /**
   * Generate (or return existing) the user's first personalized workout.
   * Steps: fetch onboarding + assessment → resolve program → apply rules
   * → persist to Supabase → return the generated workout.
   */
  async generateFirstWorkout(
    userId: string,
    opts?: GenerateOptions,
  ): Promise<GeneratedWorkout> {
    const existing = await fetchFirstWorkoutRow(userId);
    if (existing) return existing;

    const [ob, ass] = await Promise.all([
      fetchOnboarding(userId),
      fetchAssessment(userId),
    ]);
    const onboarding: OnboardingData = ob ?? EMPTY_ONBOARDING;
    const assessment: AssessmentData = ass ?? EMPTY_ASSESSMENT;

    const program = resolveProgram(onboarding, assessment);
    const workout = buildWorkoutFromRules(onboarding, assessment, program, {
      weightKg: opts?.weightKg ?? onboarding.weight_kg,
    });

    const planId = await ensureTrainingPlan(userId, workout.programSlug, workout.programTitle);
    const id = await saveGeneratedWorkout(userId, planId, workout, true);
    return { ...workout, id, planId };
  },

  /** Read-only accessor for the persisted first workout. */
  async getFirstWorkout(userId: string): Promise<GeneratedWorkout | null> {
    return fetchFirstWorkoutRow(userId);
  },
};

export type { GeneratedWorkout, GenerateOptions } from "./workoutTypes";
