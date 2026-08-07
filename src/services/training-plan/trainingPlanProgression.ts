// Deterministic scheduling and progression rules for a 4-week plan.
// Pure functions: no I/O, no React.

import type { OnboardingData } from "@/lib/onboarding";
import { scoreAssessment, type AssessmentData } from "@/lib/assessment";
import type { Program } from "@/lib/programs";
import type {
  Difficulty,
  GeneratedWorkout,
  WorkoutExercise,
} from "@/services/workout-generator/workoutTypes";
import type { ProgressionData, TrainingDay, TrainingWeek } from "./trainingPlanTypes";

/* ---------------- Weekly frequency & recovery ---------------- */

/**
 * Resolve the actual training frequency for the plan.
 * Caps by fitness level and assessment score so beginners don't overtrain.
 */
export function resolveDaysPerWeek(ob: OnboardingData, assessment: AssessmentData): number {
  const requested = ob.days_per_week ?? 3;
  const score = scoreAssessment(assessment);
  let cap = 5;
  if (ob.fitness_level === "beginner" || score < 8) cap = 3;
  else if (ob.fitness_level === "intermediate" || score < 16) cap = 4;
  else cap = 6;
  // Poor mobility reduces the cap by 1
  if (assessment.mobility === "poor") cap = Math.max(2, cap - 1);
  return Math.min(Math.max(2, requested), cap);
}

/**
 * Deterministic weekday distribution given N training days.
 * Days are 1..7 (Mon..Sun). Recovery on all remaining days.
 */
export function scheduleDaysOfWeek(daysPerWeek: number): number[] {
  const patterns: Record<number, number[]> = {
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 5, 6],
    6: [1, 2, 3, 4, 5, 6],
  };
  return patterns[daysPerWeek] ?? [1, 3, 5];
}

/* ---------------- Weekly objectives ---------------- */

const WEEK_OBJECTIVES: Record<number, string> = {
  1: "Adaptação: consolidar técnica e base.",
  2: "Volume: adicionar séries para estímulo hipertrófico.",
  3: "Intensidade: reduzir descanso e elevar densidade.",
  4: "Deload: consolidar ganhos e recuperar totalmente.",
};

export function weekObjective(weekNumber: number, isDeload: boolean): string {
  if (isDeload) return WEEK_OBJECTIVES[4];
  return WEEK_OBJECTIVES[weekNumber] ?? WEEK_OBJECTIVES[1];
}

/* ---------------- Progression per week ---------------- */

export function progressionForWeek(weekNumber: number): ProgressionData {
  switch (weekNumber) {
    case 1:
      return { strategy: "base", notes: "Semana base: aprenda a execução." };
    case 2:
      return { strategy: "volume", setsDelta: 1, notes: "+1 série por exercício principal." };
    case 3:
      return {
        strategy: "intensity",
        restDeltaSec: -15,
        repsDelta: 1,
        notes: "-15s de descanso e +1 rep quando possível.",
      };
    case 4:
      return {
        strategy: "deload",
        setsDelta: -1,
        notes: "Deload: -1 série, foco em qualidade e mobilidade.",
      };
    default:
      return { strategy: "base" };
  }
}

/**
 * Apply weekly progression on top of the base workout.
 * Deterministic; only mutates the returned copy.
 */
export function applyWeeklyProgression(
  base: GeneratedWorkout,
  weekNumber: number,
): { workout: GeneratedWorkout; progression: ProgressionData } {
  const progression = progressionForWeek(weekNumber);
  const exercises: WorkoutExercise[] = base.exercises.map((ex) => {
    let sets = ex.sets;
    let reps = ex.reps;
    let rest = ex.rest;

    if (progression.setsDelta) {
      sets = Math.max(2, sets + progression.setsDelta);
    }
    if (progression.repsDelta) {
      reps = bumpReps(reps, progression.repsDelta);
    }
    if (progression.restDeltaSec) {
      rest = shiftRest(rest, progression.restDeltaSec);
    }
    return { ...ex, sets, reps, rest };
  });

  const difficulty: Difficulty = weekNumber === 4 ? base.difficulty : base.difficulty;
  const durationDelta =
    progression.strategy === "deload" ? -5 : progression.strategy === "volume" ? 5 : 0;

  return {
    workout: {
      ...base,
      exercises,
      difficulty,
      estimatedDurationMin: Math.max(15, base.estimatedDurationMin + durationDelta),
      estimatedCalories: Math.max(80, base.estimatedCalories + durationDelta * 6),
      name: `Semana ${weekNumber} · ${base.programTitle}`,
      description: `${base.description} Progressão: ${progression.notes ?? progression.strategy}.`,
    },
    progression,
  };
}

function bumpReps(reps: string, delta: number): string {
  // "8-12" → "9-13"; "30s" left unchanged (time-based).
  const range = reps.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) {
    const lo = Number(range[1]) + delta;
    const hi = Number(range[2]) + delta;
    return `${Math.max(1, lo)}-${Math.max(1, hi)}`;
  }
  const single = reps.match(/^(\d+)$/);
  if (single) return String(Math.max(1, Number(single[1]) + delta));
  return reps;
}

function shiftRest(rest: string, deltaSec: number): string {
  const m = rest.match(/^(\d+)\s*s$/i);
  if (!m) return rest;
  const next = Math.max(20, Number(m[1]) + deltaSec);
  return `${next}s`;
}

/* ---------------- Skill accessory work ---------------- */

const SKILL_ACCESSORIES: Record<string, WorkoutExercise[]> = {
  muscleup: [
    {
      id: "acc-muscleup",
      name: "Barra explosiva + trânsito",
      sets: 3,
      reps: "3-5",
      rest: "90s",
      focus: "Muscle-up",
      cue: "Puxe alto até o peito, gire os punhos.",
      videoId: "eGo4IYlbE5g",
    },
  ],
  handstand: [
    {
      id: "acc-handstand",
      name: "Parada de mãos na parede",
      sets: 4,
      reps: "30s",
      rest: "60s",
      focus: "Handstand",
      cue: "Barriga contraída, olhar entre as mãos.",
      videoId: "cfns5VDVVvk",
    },
  ],
  frontlever: [
    {
      id: "acc-frontlever",
      name: "Front lever tuck hold",
      sets: 4,
      reps: "10-20s",
      rest: "90s",
      focus: "Front lever",
      cue: "Escápulas retraídas, quadril acima da linha.",
    },
  ],
  backlever: [
    {
      id: "acc-backlever",
      name: "Back lever tuck",
      sets: 4,
      reps: "10-15s",
      rest: "90s",
      focus: "Back lever",
      cue: "Empurre a barra para longe do peito.",
    },
  ],
  planche: [
    {
      id: "acc-planche",
      name: "Planche lean",
      sets: 4,
      reps: "15-25s",
      rest: "90s",
      focus: "Planche",
      cue: "Ombros à frente das mãos, cotovelos travados.",
    },
  ],
  humanflag: [
    {
      id: "acc-flag",
      name: "Flag tuck (barra vertical)",
      sets: 4,
      reps: "8-12s",
      rest: "90s",
      focus: "Human flag",
      cue: "Puxe com o braço de cima, empurre com o de baixo.",
    },
  ],
  lsit: [
    {
      id: "acc-lsit",
      name: "L-Sit no chão / paralelas",
      sets: 4,
      reps: "10-20s",
      rest: "60s",
      focus: "L-Sit",
      cue: "Ative o core, pernas altas e retas.",
    },
  ],
};

export function skillAccessoriesFor(skill?: string | null): WorkoutExercise[] {
  if (!skill || skill === "none") return [];
  return SKILL_ACCESSORIES[skill] ?? [];
}

/**
 * Add skill accessory work to the end of the workout. Progressive across weeks:
 * +1 set on week 2, +1 rep on week 3, deload on week 4.
 */
export function attachSkillWork(
  workout: GeneratedWorkout,
  skill: string | null | undefined,
  weekNumber: number,
): GeneratedWorkout {
  const acc = skillAccessoriesFor(skill);
  if (!acc.length) return workout;
  const progressed = acc.map((ex) => {
    let sets = ex.sets;
    let reps = ex.reps;
    if (weekNumber === 2) sets = sets + 1;
    if (weekNumber === 3) reps = bumpReps(reps, 1);
    if (weekNumber === 4) sets = Math.max(2, sets - 1);
    return { ...ex, id: `${ex.id}-w${weekNumber}`, sets, reps };
  });
  return { ...workout, exercises: [...workout.exercises, ...progressed] };
}

/* ---------------- Week assembly ---------------- */

export interface WeekPlanOptions {
  weekNumber: number;
  program: Program;
  daysPerWeek: number;
  baseWorkout: GeneratedWorkout;
  skillGoal?: string | null;
}

export function buildWeekSkeleton(opts: WeekPlanOptions): {
  week: Omit<TrainingWeek, "workouts"> & { workouts: never[] };
  workoutDays: number[];
} {
  const { weekNumber, daysPerWeek, baseWorkout } = opts;
  const isDeload = weekNumber === 4;
  const workoutDays = scheduleDaysOfWeek(daysPerWeek);
  const days: TrainingDay[] = [];
  for (let d = 1; d <= 7; d++) {
    const isWorkout = workoutDays.includes(d);
    days.push({
      weekNumber,
      dayNumber: d,
      dayType: isWorkout ? "workout" : "recovery",
      completed: false,
    });
  }
  const estimatedDurationMin = baseWorkout.estimatedDurationMin * daysPerWeek;
  return {
    week: {
      weekNumber,
      objective: weekObjective(weekNumber, isDeload),
      difficulty: baseWorkout.difficulty,
      estimatedDurationMin,
      workoutDaysCount: daysPerWeek,
      recoveryDaysCount: 7 - daysPerWeek,
      isDeload,
      days,
      workouts: [],
    },
    workoutDays,
  };
}
