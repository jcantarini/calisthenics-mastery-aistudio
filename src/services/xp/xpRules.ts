// XP Engine — pure rules. Deterministic, side-effect free, unit-testable.

import type { GoalDifficultyTier, XPEvent, XPEventType } from "./xpTypes";

/**
 * Goal completion balancing. Centralised here (XP domain) so Goals, the
 * orchestrator and the UI never contain reward numbers. These are balancing
 * constants: change them here and every surface follows.
 */
export const GOAL_COMPLETION_XP: Record<GoalDifficultyTier, number> = {
  easy: 50,
  medium: 100,
  hard: 200,
  epic: 400,
};

export const DEFAULT_GOAL_DIFFICULTY_TIER: GoalDifficultyTier = "medium";

export function isGoalDifficultyTier(value: unknown): value is GoalDifficultyTier {
  return typeof value === "string" && value in GOAL_COMPLETION_XP;
}

/** XP awarded when a goal legitimately reaches `completed`. */
export function goalCompletionXP(difficulty?: unknown): number {
  const tier = isGoalDifficultyTier(difficulty) ? difficulty : DEFAULT_GOAL_DIFFICULTY_TIER;
  return GOAL_COMPLETION_XP[tier];
}

/** Deterministic idempotency reference for goal completion XP. */
export function goalCompletionSourceId(goalId: string): string {
  return `goal_completed:${goalId}`;
}

/** Default reward table. Single source of truth for XP values. */
export const XP_REWARDS: Record<XPEventType, number> = {
  assessment_completed: 100,
  profile_completed: 100,
  first_workout: 150,
  workout_completed: 50,
  workout_streak: 75,
  week_completed: 250,
  program_completed: 1000,
  goal_completed: 100, // medium tier; see GOAL_COMPLETION_XP
  achievement_unlocked: 100,
  manual_adjustment: 0,
};

/** Default human readable reason per event. */
export const XP_REASONS: Record<XPEventType, string> = {
  assessment_completed: "Avaliação física concluída",
  profile_completed: "Perfil completo",
  first_workout: "Primeiro treino concluído",
  workout_completed: "Treino concluído",
  workout_streak: "Sequência de treinos",
  week_completed: "Semana concluída",
  program_completed: "Programa concluído",
  goal_completed: "Meta concluída",
  achievement_unlocked: "Conquista desbloqueada",
  manual_adjustment: "Ajuste de XP",
};

/** Events that may only ever be rewarded once per source. */
const IDEMPOTENT_EVENTS: ReadonlySet<XPEventType> = new Set<XPEventType>([
  "assessment_completed",
  "profile_completed",
  "first_workout",
  "workout_completed",
  "week_completed",
  "program_completed",
  "goal_completed",
  "achievement_unlocked",
]);

export function isIdempotent(type: XPEventType): boolean {
  return IDEMPOTENT_EVENTS.has(type);
}

/** Resolve the XP value for an event (explicit amount wins over the table). */
export function resolveAmount(event: XPEvent): number {
  const raw = event.amount ?? XP_REWARDS[event.type] ?? 0;
  return Math.trunc(raw);
}

export function resolveReason(event: XPEvent): string {
  return event.reason?.trim() || XP_REASONS[event.type] || "XP";
}

/**
 * Level curve. Levels are not surfaced yet (Sprint 6.1 is engine-only),
 * but the stored value keeps the schema future-proof.
 */
export function levelForXP(lifetimeXP: number): number {
  if (lifetimeXP <= 0) return 1;
  return Math.max(1, Math.floor(Math.sqrt(lifetimeXP / 250)) + 1);
}

export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.trunc(level));
  return (l - 1) * (l - 1) * 250;
}

/** Progress (0..1) inside the current level — used later by UI layers. */
export function levelProgress(lifetimeXP: number): {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  ratio: number;
} {
  const level = levelForXP(lifetimeXP);
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForLevel(level + 1);
  const span = Math.max(1, nextLevelXP - currentLevelXP);
  const ratio = Math.min(1, Math.max(0, (lifetimeXP - currentLevelXP) / span));
  return { level, currentLevelXP, nextLevelXP, ratio };
}
