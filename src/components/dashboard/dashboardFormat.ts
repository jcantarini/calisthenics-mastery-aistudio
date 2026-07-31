// Presentation-only helpers for the dashboard. No business logic here —
// every number comes pre-computed from TrainingPlanService.

import type { Difficulty } from "@/services/workout-generator/workoutTypes";
import type {
  PlanStatus,
  PlannedWorkout,
  TrainingWeek,
  WorkoutStatus,
} from "@/services/training-plan/trainingPlanTypes";

export const WORKOUT_STATUS_LABEL: Record<WorkoutStatus, string> = {
  locked: "Bloqueado",
  available: "Disponível",
  in_progress: "Em andamento",
  completed: "Concluído",
  skipped: "Pulado",
  missed: "Perdido",
};

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  paused: "Pausado",
  completed: "Concluído",
  cancelled: "Cancelado",
  regenerated: "Regenerado",
  expired: "Expirado",
  archived: "Arquivado",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export function dayLabel(dayNumber: number) {
  return WEEKDAYS[(dayNumber - 1 + 7) % 7] ?? `Dia ${dayNumber}`;
}

export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Distinct focus tags of a workout, used as "primary muscle groups". */
export function muscleGroups(workout: PlannedWorkout | null, max = 4): string[] {
  if (!workout) return [];
  const seen = new Set<string>();
  for (const ex of workout.exercises) {
    if (ex.focus) seen.add(ex.focus);
    if (seen.size >= max) break;
  }
  return [...seen];
}

/** Human phase name for the current week. */
export function weekPhase(week: TrainingWeek | null): string {
  if (!week) return "—";
  if (week.isDeload) return "Deload";
  return week.objective || `Semana ${week.weekNumber}`;
}

export function formatMinutes(totalMin: number) {
  if (totalMin < 60) return `${Math.round(totalMin)} min`;
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return m ? `${h}h ${m}min` : `${h}h`;
}

const MOTIVATION = [
  "Você fica mais forte a cada treino.",
  "Mantenha a consistência.",
  "Pequenos progressos todos os dias.",
  "Disciplina vence motivação.",
  "Seu único adversário é o de ontem.",
  "Constância transforma corpo e mente.",
  "Confie no processo — o plano funciona.",
];

/** Rotates deterministically by day so the message is stable within a day. */
export function motivationOfTheDay(date = new Date()) {
  const dayIndex = Math.floor(date.getTime() / 86400000);
  return MOTIVATION[dayIndex % MOTIVATION.length];
}
