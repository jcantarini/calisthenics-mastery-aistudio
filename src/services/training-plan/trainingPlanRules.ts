// High-level generation rules: turn (onboarding + assessment + program +
// base workout) into 4 concrete weeks of planned workouts.

import { PROGRAMS } from "@/lib/programs";
import type { OnboardingData } from "@/lib/onboarding";
import type { AssessmentData } from "@/lib/assessment";
import { resolveProgram } from "@/services/workout-generator/workoutRules";
import type { GeneratedWorkout } from "@/services/workout-generator/workoutTypes";
import {
  applyWeeklyProgression,
  attachSkillWork,
  buildWeekSkeleton,
  resolveDaysPerWeek,
} from "./trainingPlanProgression";
import type { PlannedWorkout, TrainingWeek } from "./trainingPlanTypes";

export interface BuiltPlan {
  programSlug: string;
  programTitle: string;
  daysPerWeek: number;
  weeks: TrainingWeek[];
}

/**
 * Deterministically build the full 4-week plan from the user's assessment
 * and the base workout produced by WorkoutGeneratorService.
 */
export function buildFourWeekPlan(
  ob: OnboardingData,
  assessment: AssessmentData,
  baseWorkout: GeneratedWorkout,
): BuiltPlan {
  const program = resolveProgram(ob, assessment);
  const daysPerWeek = resolveDaysPerWeek(ob, assessment);
  const skill = ob.skill_goal ?? null;
  const totalWeeks = 4;

  const weeks: TrainingWeek[] = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const { week, workoutDays } = buildWeekSkeleton({
      weekNumber: w,
      program,
      daysPerWeek,
      baseWorkout,
      skillGoal: skill,
    });

    const { workout: progressed, progression } = applyWeeklyProgression(baseWorkout, w);
    const withSkill = attachSkillWork(progressed, skill, w);

    // Same session repeats across all workout days in the week (deterministic).
    const workouts: PlannedWorkout[] = workoutDays.map((day) => ({
      ...withSkill,
      planId: "",
      weekNumber: w,
      dayNumber: day,
      isCompleted: false,
      progressionData: progression,
    }));

    weeks.push({ ...week, workouts });
  }

  return {
    programSlug: program.slug,
    programTitle: program.title,
    daysPerWeek,
    weeks,
  };
}

/** Look up program metadata by slug (helper for read paths). */
export function programBySlug(slug: string) {
  return PROGRAMS.find((p) => p.slug === slug) ?? PROGRAMS[0];
}
