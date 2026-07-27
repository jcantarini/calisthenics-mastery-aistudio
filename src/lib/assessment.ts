import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { AppState } from "@/lib/store";
import { PROGRAMS } from "@/lib/programs";
import type { OnboardingData } from "@/lib/onboarding";
import { generatePlan as basePlan } from "@/lib/onboarding";

export type PushupsBand = "0-5" | "6-10" | "11-20" | "21-40" | "40+";
export type PullupsBand = "0" | "1-3" | "4-8" | "9-15" | "15+";
export type DipsBand = "0" | "1-5" | "6-10" | "11-20" | "20+";
export type PlankBand = "lt20" | "20-40" | "40-60" | "60-120" | "120+";
export type SquatsBand = "0-10" | "11-20" | "21-40" | "41-60" | "60+";
export type MobilityBand = "poor" | "average" | "good" | "excellent";
export type SkillKey =
  | "pullup" | "muscleup" | "handstand" | "frontlever" | "backlever"
  | "lsit" | "planche" | "humanflag" | "none";

export interface AssessmentData {
  pushups?: PushupsBand;
  pullups?: PullupsBand;
  dips?: DipsBand;
  plank?: PlankBand;
  squats?: SquatsBand;
  mobility?: MobilityBand;
  skills: SkillKey[];
  skipped: string[];
  score?: number;
  completed: boolean;
}

export const EMPTY_ASSESSMENT: AssessmentData = {
  skills: [],
  skipped: [],
  completed: false,
};

export const ASSESSMENT_TESTS = [
  "pushups", "pullups", "dips", "plank", "squats", "mobility", "skills",
] as const;
export type TestKey = (typeof ASSESSMENT_TESTS)[number];

// Point tables (per-test 0..4)
const P: Record<string, number> = {
  "0-5": 0, "6-10": 1, "11-20": 2, "21-40": 3, "40+": 4,
  "0": 0, "1-3": 1, "4-8": 2, "9-15": 3, "15+": 4,
  "1-5": 1, "6-10 dips": 2, // placeholder never used
};
// Explicit tables to avoid key clashes across tests
const PUSHUPS_PT: Record<PushupsBand, number> = { "0-5": 0, "6-10": 1, "11-20": 2, "21-40": 3, "40+": 4 };
const PULLUPS_PT: Record<PullupsBand, number> = { "0": 0, "1-3": 1, "4-8": 2, "9-15": 3, "15+": 4 };
const DIPS_PT: Record<DipsBand, number> = { "0": 0, "1-5": 1, "6-10": 2, "11-20": 3, "20+": 4 };
const PLANK_PT: Record<PlankBand, number> = { lt20: 0, "20-40": 1, "40-60": 2, "60-120": 3, "120+": 4 };
const SQUATS_PT: Record<SquatsBand, number> = { "0-10": 0, "11-20": 1, "21-40": 2, "41-60": 3, "60+": 4 };
const MOB_PT: Record<MobilityBand, number> = { poor: 0, average: 1, good: 2, excellent: 3 };

export function scoreAssessment(a: AssessmentData): number {
  let s = 0;
  if (a.pushups) s += PUSHUPS_PT[a.pushups];
  if (a.pullups) s += PULLUPS_PT[a.pullups];
  if (a.dips) s += DIPS_PT[a.dips];
  if (a.plank) s += PLANK_PT[a.plank];
  if (a.squats) s += SQUATS_PT[a.squats];
  if (a.mobility) s += MOB_PT[a.mobility];
  // skills add up to 4 extra points, "none" doesn't count
  const skillsPts = a.skills.filter((x) => x !== "none").length;
  s += Math.min(4, skillsPts);
  return s;
}

/** Recommend a program slug from onboarding + assessment. Deterministic. */
export function recommendProgram(ob: OnboardingData, a: AssessmentData): string {
  const score = scoreAssessment(a);

  // Cardio path
  if (ob.primary_goal === "endurance" || ob.primary_goal === "fat") {
    return score >= 10 ? "cardio-hiit" : "cardio-ignicao";
  }

  // Military path for advanced strength seekers
  if (ob.primary_goal === "strength" && score >= 16) return "calistenia-militar";

  // Skills path: pick a program that trains the pulling base if user targets bar skills
  if (ob.primary_goal === "skills" || (ob.skill_goal && ob.skill_goal !== "none")) {
    if (score >= 12) return "elite";
    if (score >= 6) return "barra-fixa";
    return "fundacao";
  }

  // Default score-based ladder
  if (score >= 18) return "elite";
  if (score >= 9) return "barra-fixa";
  return "fundacao";
}

/** Build final AppState using onboarding + assessment. */
export function generatePlanFromAssessment(
  state: AppState,
  ob: OnboardingData,
  a: AssessmentData,
  displayName?: string,
): AppState {
  const base = basePlan(state, ob, displayName);
  const slug = recommendProgram(ob, a);
  const program = PROGRAMS.find((p) => p.slug === slug) ?? PROGRAMS[0];
  return { ...base, activeProgram: program.slug };
}

export async function fetchAssessment(userId: string): Promise<AssessmentData | null> {
  const { data, error } = await supabase
    .from("fitness_assessment")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    pushups: (data.pushups ?? undefined) as PushupsBand | undefined,
    pullups: (data.pullups ?? undefined) as PullupsBand | undefined,
    dips: (data.dips ?? undefined) as DipsBand | undefined,
    plank: (data.plank ?? undefined) as PlankBand | undefined,
    squats: (data.squats ?? undefined) as SquatsBand | undefined,
    mobility: (data.mobility ?? undefined) as MobilityBand | undefined,
    skills: Array.isArray(data.skills) ? (data.skills as SkillKey[]) : [],
    skipped: Array.isArray(data.skipped) ? (data.skipped as string[]) : [],
    score: data.score ?? undefined,
    completed: !!data.completed,
  };
}

export async function upsertAssessment(userId: string, a: AssessmentData, completed: boolean) {
  const score = scoreAssessment(a);
  const payload = {
    user_id: userId,
    pushups: a.pushups ?? null,
    pullups: a.pullups ?? null,
    dips: a.dips ?? null,
    plank: a.plank ?? null,
    squats: a.squats ?? null,
    mobility: a.mobility ?? null,
    skills: (a.skills ?? []) as unknown as Json,
    skipped: (a.skipped ?? []) as unknown as Json,
    score,
    completed,
    completed_at: completed ? new Date().toISOString() : null,
  };
  const { error } = await supabase
    .from("fitness_assessment")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}
