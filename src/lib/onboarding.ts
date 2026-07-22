import { supabase } from "@/integrations/supabase/client";
import { PROGRAMS } from "@/lib/programs";
import type { AppState, ActivityLevel, Sex } from "@/lib/store";
import { initialsFrom } from "@/lib/store";

export type Gender = "male" | "female" | "other";
export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type PrimaryGoal = "muscle" | "fat" | "strength" | "endurance" | "skills" | "fitness";
export type Motivation = "healthy" | "stronger" | "muscle" | "lose" | "skills" | "appearance";
export type SkillGoal =
  | "pullup" | "muscleup" | "handstand" | "frontlever" | "backlever"
  | "planche" | "humanflag" | "pistol" | "lsit" | "none";

export interface CurrentPerformance {
  pushups?: number;
  pullups?: number;
  dips?: number;
  squats?: number;
  plank?: number;
}

export interface OnboardingData {
  age?: number;
  gender?: Gender;
  height_cm?: number;
  weight_kg?: number;
  country?: string;
  language?: string;
  fitness_level?: FitnessLevel;
  primary_goal?: PrimaryGoal;
  has_experience?: boolean;
  equipment: string[];
  days_per_week?: number;
  workout_duration_min?: number;
  target_areas: string[];
  injuries?: string;
  motivation?: Motivation;
  skill_goal?: SkillGoal;
  current_performance: CurrentPerformance;
  onboarding_completed?: boolean;
}

export const EMPTY_ONBOARDING: OnboardingData = {
  equipment: [],
  target_areas: [],
  current_performance: {},
  onboarding_completed: false,
};

export const DRAFT_KEY = "barra:onboarding:draft";

export function loadDraft(): OnboardingData {
  if (typeof window === "undefined") return EMPTY_ONBOARDING;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...EMPTY_ONBOARDING, ...JSON.parse(raw) };
  } catch {}
  return EMPTY_ONBOARDING;
}

export function saveDraft(data: OnboardingData) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {}
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

/** Fetch a user's onboarding row (or null). Used for gating. */
export async function fetchOnboarding(userId: string): Promise<OnboardingData | null> {
  const { data, error } = await supabase
    .from("user_onboarding")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    age: data.age ?? undefined,
    gender: (data.gender ?? undefined) as Gender | undefined,
    height_cm: data.height_cm ?? undefined,
    weight_kg: data.weight_kg == null ? undefined : Number(data.weight_kg),
    country: data.country ?? undefined,
    language: data.language ?? undefined,
    fitness_level: (data.fitness_level ?? undefined) as FitnessLevel | undefined,
    primary_goal: (data.primary_goal ?? undefined) as PrimaryGoal | undefined,
    has_experience: data.has_experience ?? undefined,
    equipment: Array.isArray(data.equipment) ? (data.equipment as string[]) : [],
    days_per_week: data.days_per_week ?? undefined,
    workout_duration_min: data.workout_duration_min ?? undefined,
    target_areas: Array.isArray(data.target_areas) ? (data.target_areas as string[]) : [],
    injuries: data.injuries ?? undefined,
    motivation: (data.motivation ?? undefined) as Motivation | undefined,
    skill_goal: (data.skill_goal ?? undefined) as SkillGoal | undefined,
    current_performance: (data.current_performance as CurrentPerformance) ?? {},
    onboarding_completed: !!data.onboarding_completed,
  };
}

/** Upsert autosave (partial). */
export async function upsertOnboarding(
  userId: string,
  data: OnboardingData,
  completed = false,
) {
  const payload = {
    user_id: userId,
    age: data.age ?? null,
    gender: data.gender ?? null,
    height_cm: data.height_cm ?? null,
    weight_kg: data.weight_kg ?? null,
    country: data.country ?? null,
    language: data.language ?? null,
    fitness_level: data.fitness_level ?? null,
    primary_goal: data.primary_goal ?? null,
    has_experience: data.has_experience ?? null,
    equipment: data.equipment ?? [],
    days_per_week: data.days_per_week ?? null,
    workout_duration_min: data.workout_duration_min ?? null,
    target_areas: data.target_areas ?? [],
    injuries: data.injuries ?? null,
    motivation: data.motivation ?? null,
    skill_goal: data.skill_goal ?? null,
    current_performance: data.current_performance ?? {},
    onboarding_completed: completed,
    completed_at: completed ? new Date().toISOString() : null,
  };
  const { error } = await supabase
    .from("user_onboarding")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

/** Map onboarding answers to a program slug and update AppState (personalized plan). */
export function generatePlan(state: AppState, data: OnboardingData, displayName?: string): AppState {
  const slugByLevel: Record<FitnessLevel, string> = {
    beginner: "fundacao",
    intermediate: "barra-fixa",
    advanced: "elite",
  };
  const level = data.fitness_level ?? "beginner";
  let slug = slugByLevel[level];

  // Adjust based on goal
  if (data.primary_goal === "endurance" || data.primary_goal === "fat") {
    slug = data.fitness_level === "beginner" ? "cardio-ignicao" : "cardio-hiit";
  }
  if (data.primary_goal === "strength" && data.fitness_level === "advanced") {
    slug = "calistenia-militar";
  }

  const program = PROGRAMS.find((p) => p.slug === slug) ?? PROGRAMS[0];

  const genderToSex: Record<Gender, Sex> = { male: "masculino", female: "feminino", other: "masculino" };
  const daysToActivity = (d?: number): ActivityLevel => {
    if (!d) return "moderado";
    if (d <= 1) return "sedentario";
    if (d <= 3) return "leve";
    if (d <= 5) return "moderado";
    if (d <= 6) return "intenso";
    return "atleta";
  };

  const name = (displayName ?? state.profile.name) || "";
  const year = new Date().getFullYear();
  return {
    ...state,
    activeProgram: program.slug,
    weeklyGoal: data.days_per_week ?? state.weeklyGoal,
    profile: {
      ...state.profile,
      name,
      initials: name ? initialsFrom(name) : state.profile.initials,
      weightKg: data.weight_kg ?? state.profile.weightKg,
      heightCm: data.height_cm ?? state.profile.heightCm,
      birthYear: data.age ? year - data.age : state.profile.birthYear,
      sex: data.gender ? genderToSex[data.gender] : state.profile.sex,
      activity: daysToActivity(data.days_per_week),
    },
  };
}

export const TOTAL_STEPS = 13;
