// Pure business rules for workout generation.
// No I/O, no React, no Supabase. Deterministic from inputs.

import { PROGRAMS, type Exercise, type Level, type Program } from "@/lib/programs";
import type { OnboardingData } from "@/lib/onboarding";
import {
  recommendProgram,
  scoreAssessment,
  type AssessmentData,
  type MobilityBand,
} from "@/lib/assessment";
import type {
  GeneratedWorkout,
  GenerateOptions,
  WorkoutBlockItem,
  WorkoutExercise,
} from "./workoutTypes";

/* --------------------------- Capability model --------------------------- */

const PUSHUP_LVL: Record<string, number> = {
  "0-5": 0,
  "6-10": 1,
  "11-20": 2,
  "21-40": 3,
  "40+": 4,
};
const PULLUP_LVL: Record<string, number> = { "0": 0, "1-3": 1, "4-8": 2, "9-15": 3, "15+": 4 };
const DIPS_LVL: Record<string, number> = { "0": 0, "1-5": 1, "6-10": 2, "11-20": 3, "20+": 4 };
const SQUATS_LVL: Record<string, number> = {
  "0-10": 0,
  "11-20": 1,
  "21-40": 2,
  "41-60": 3,
  "60+": 4,
};
const PLANK_SEC: Record<string, number> = {
  lt20: 15,
  "20-40": 30,
  "40-60": 50,
  "60-120": 90,
  "120+": 130,
};
const MOB_LVL: Record<MobilityBand, number> = { poor: 0, average: 1, good: 2, excellent: 3 };

function cap(v: string | undefined, table: Record<string, number>, fallback = 1) {
  if (!v) return fallback;
  return table[v] ?? fallback;
}

/* ------------------------- Warm-up / Cooldown ------------------------- */

const WARMUP_BASE: WorkoutBlockItem[] = [
  { name: "Polichinelos", duration: "60s", cue: "Ritmo constante, respire fundo." },
  { name: "Círculos de braços", duration: "45s", cue: "Frente e trás, amplitude total." },
  { name: "Mobilidade de quadril", duration: "60s", cue: "Rotação lenta em ambos os lados." },
];
const WARMUP_MOBILITY_EXTRA: WorkoutBlockItem = {
  name: "Alongamento dinâmico de isquiotibiais",
  duration: "60s",
  cue: "Toe touches lentos e controlados.",
};

const COOLDOWN_BASE: WorkoutBlockItem[] = [
  {
    name: "Alongamento de peito e ombros",
    duration: "45s",
    cue: "Braço na parede, gire o tronco.",
  },
  { name: "Alongamento de posterior", duration: "45s", cue: "Perna estendida, coluna neutra." },
  { name: "Respiração diafragmática", duration: "60s", cue: "4s inspirar, 6s expirar." },
];

/* ------------------------- Exercise substitutions ------------------------- */

function substituteForCapability(
  ex: Exercise,
  capability: {
    pushups: number;
    pullups: number;
    dips: number;
    hasBar: boolean;
    hasParallel: boolean;
  },
): { ex: WorkoutExercise; note?: string } {
  const nameLower = ex.name.toLowerCase();

  const isPull = /barra|pull|muscle-?up|front lever|back lever|human ?flag/.test(nameLower);
  if (isPull) {
    if (!capability.hasBar) {
      return substituteWith(
        ex,
        {
          name: "Remada invertida na mesa",
          focus: "Costas, bíceps",
          cue: "Peito até a mesa. Corpo alinhado.",
          videoId: "dnpDUwqMX04",
        },
        "Sem barra disponível",
      );
    }
    if (/muscle-?up|front lever|back lever|human ?flag/.test(nameLower) && capability.pullups < 3) {
      return substituteWith(
        ex,
        {
          name: "Barra negativa (descida 5s)",
          focus: "Dorsais, bíceps, potência",
          cue: "Suba com salto, desça em 5s.",
          videoId: "eGo4IYlbE5g",
        },
        "Ainda construindo base de puxada",
      );
    }
    if (/^barra/.test(nameLower) && capability.pullups < 1) {
      return substituteWith(
        ex,
        {
          name: "Barra negativa (descida 5s)",
          focus: "Dorsais, bíceps",
          cue: "Suba com salto, desça em 5s.",
          videoId: "eGo4IYlbE5g",
        },
        "Progressão inicial de barra",
      );
    }
  }

  if (/dip|paralelas/.test(nameLower)) {
    if (!capability.hasParallel || capability.dips < 1) {
      return substituteWith(
        ex,
        {
          name: "Dip de banco (bench dip)",
          focus: "Tríceps, peito",
          cue: "Mãos no banco, cotovelos para trás.",
          videoId: "0326dy_-CzM",
        },
        capability.hasParallel ? "Base inicial para dip" : "Sem paralelas",
      );
    }
  }

  if (/handstand|pike|planche/.test(nameLower) && capability.pushups < 2) {
    return substituteWith(
      ex,
      {
        name: "Flexão pike apoiada",
        focus: "Ombros, tríceps",
        cue: "Quadril alto, empurre o chão para longe.",
        videoId: "cfns5VDVVvk",
      },
      "Progressão para pike/handstand",
    );
  }

  if (/^flex/.test(nameLower) && !/inclinada|pike/.test(nameLower) && capability.pushups < 1) {
    return substituteWith(
      ex,
      {
        name: "Flexão inclinada",
        focus: "Peito, tríceps, core",
        cue: "Mãos em superfície elevada. Corpo em linha.",
        videoId: "cfns5VDVVvk",
      },
      "Adaptação para iniciantes",
    );
  }

  return {
    ex: {
      id: ex.id,
      name: ex.name,
      sets: parseSets(ex.sets),
      reps: parseReps(ex.sets),
      rest: ex.rest,
      focus: ex.focus,
      videoId: ex.videoId,
      cue: ex.cue,
    },
  };
}

function substituteWith(
  original: Exercise,
  replacement: { name: string; focus: string; cue: string; videoId?: string },
  reason: string,
): { ex: WorkoutExercise; note?: string } {
  return {
    ex: {
      id: original.id,
      name: replacement.name,
      sets: parseSets(original.sets),
      reps: parseReps(original.sets),
      rest: original.rest,
      focus: replacement.focus,
      videoId: replacement.videoId,
      cue: replacement.cue,
      substitutedFrom: original.name,
    },
    note: `${original.name} → ${replacement.name} (${reason})`,
  };
}

function parseSets(raw: string): number {
  const m = raw.match(/^(\d+)/);
  return m ? Number(m[1]) : 3;
}
function parseReps(raw: string): string {
  const m = raw.split(/×|x/i);
  return (m[1] ?? m[0] ?? "").trim() || "8-12";
}

/* ---------------------- Duration / Calorie estimates ---------------------- */

const MET_BY_LEVEL: Record<Level, number> = {
  iniciante: 5,
  intermediario: 7,
  avancado: 9,
};

function estimateCalories(met: number, weightKg: number, minutes: number) {
  return Math.round((met * weightKg * minutes) / 60);
}

function exercisesForDuration(durationMin: number): number {
  if (durationMin <= 20) return 4;
  if (durationMin <= 35) return 5;
  if (durationMin <= 50) return 6;
  return 7;
}

const LEVEL_LABEL: Record<Level, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

/* ------------------------------ Public rule ------------------------------ */

export function resolveProgram(ob: OnboardingData, assessment: AssessmentData): Program {
  const slug = recommendProgram(ob, assessment);
  return PROGRAMS.find((p) => p.slug === slug) ?? PROGRAMS[0];
}

export function buildWorkoutFromRules(
  ob: OnboardingData,
  assessment: AssessmentData,
  program: Program,
  opts?: GenerateOptions,
): GeneratedWorkout {
  const equipment = ob.equipment ?? [];
  const eqLower = equipment.map((e) => e.toLowerCase());
  const hasBar = eqLower.some((e) => /barra|bar\b|pull/.test(e));
  const hasParallel = eqLower.some((e) => /paralel|parallettes|dip/.test(e));

  const capability = {
    pushups: cap(assessment.pushups, PUSHUP_LVL, 1),
    pullups: cap(assessment.pullups, PULLUP_LVL, 0),
    dips: cap(assessment.dips, DIPS_LVL, 0),
    squats: cap(assessment.squats, SQUATS_LVL, 1),
    plankSec: PLANK_SEC[assessment.plank ?? ""] ?? 20,
    mobility: MOB_LVL[assessment.mobility ?? "average"],
    hasBar,
    hasParallel,
  };

  const desiredDuration = ob.workout_duration_min ?? 30;
  const targetCount = exercisesForDuration(desiredDuration);

  const substitutions: string[] = [];
  const chosen: WorkoutExercise[] = [];
  for (const ex of program.exercises) {
    if (chosen.length >= targetCount) break;
    const { ex: mapped, note } = substituteForCapability(ex, capability);
    if (note) substitutions.push(note);
    chosen.push(mapped);
  }

  const warmup: WorkoutBlockItem[] = [...WARMUP_BASE];
  if (capability.mobility <= 1) warmup.push(WARMUP_MOBILITY_EXTRA);

  const weightKg = opts?.weightKg ?? ob.weight_kg ?? 70;
  const met = MET_BY_LEVEL[program.level];
  const estimatedCalories = estimateCalories(met, weightKg, desiredDuration);

  const score = scoreAssessment(assessment);

  const description =
    `Primeiro treino personalizado baseado na sua avaliação (${score}/27 pts). ` +
    `Programa: ${program.title}. Nível: ${LEVEL_LABEL[program.level]}. ` +
    `Duração alvo: ${desiredDuration} min.`;

  const notesParts: string[] = [];
  if (substitutions.length) {
    notesParts.push("Adaptações aplicadas: " + substitutions.join(" · "));
  }
  if (ob.injuries && ob.injuries.trim()) {
    notesParts.push(`Atenção às lesões relatadas: ${ob.injuries.trim()}.`);
  }
  notesParts.push("Foque na execução. Descanse o suficiente entre séries.");

  return {
    name: `Treino 1 · ${program.title}`,
    description,
    difficulty: program.level,
    programSlug: program.slug,
    programTitle: program.title,
    estimatedDurationMin: desiredDuration,
    estimatedCalories,
    warmup,
    exercises: chosen,
    cooldown: COOLDOWN_BASE,
    notes: notesParts.join(" "),
  };
}
