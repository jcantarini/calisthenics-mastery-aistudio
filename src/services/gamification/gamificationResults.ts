// Gamification Orchestrator — pure functions. Deterministic, side-effect free,
// unit-testable. No engine here calculates rewards: this module only maps a
// domain event onto the engine events and folds engine outputs into one result.

import type { AchievementEvent, AchievementUnlockResult } from "@/services/achievements";
import type { LevelUpResult, PlayerProfileStats } from "@/services/progression";
import type { WeeklyProgress } from "@/services/training-plan/trainingPlanTypes";
import { goalCompletionXP } from "@/services/xp";
import type { XPEvent, XPEventType } from "@/services/xp";
import type {
  GamificationEvent,
  GamificationMessage,
  GamificationResult,
  GamificationStage,
  GamificationStageError,
  NextGoal,
} from "./gamificationTypes";

/* ---------------- Event mapping ---------------- */

const XP_EVENT_BY_TYPE: Record<string, XPEventType | null> = {
  workout_completed: "workout_completed",
  week_completed: "week_completed",
  program_completed: "program_completed",
  assessment_completed: "assessment_completed",
  profile_completed: "profile_completed",
  goal_completed: "goal_completed",
  achievement_claimed: null, // XP is owned by the Achievements Engine
  custom: null,
};

const ACHIEVEMENT_EVENT_BY_TYPE: Record<string, AchievementEvent["type"] | null> = {
  workout_completed: "WorkoutCompleted",
  week_completed: "TrainingWeekCompleted",
  program_completed: "TrainingProgramCompleted",
  assessment_completed: "AssessmentCompleted",
  profile_completed: "ProfileCompleted",
  goal_completed: "GoalCompleted",
  achievement_claimed: null,
  custom: null,
};

/** XP events the orchestrator must forward to the XP Engine, in order. */
export function toXPEvents(event: GamificationEvent): XPEvent[] {
  const events: XPEvent[] = [];
  if (event.type === "workout_completed" && event.isFirstWorkout) {
    events.push({
      type: "first_workout",
      sourceId: event.sourceId ?? null,
      userId: event.userId,
      metadata: event.metadata,
    });
  }
  const mapped = XP_EVENT_BY_TYPE[event.type] ?? null;
  if (mapped) {
    // Goal completion is priced by the XP Engine from the declared difficulty.
    // The orchestrator never computes an amount itself.
    const amount =
      event.xpAmount ??
      (mapped === "goal_completed"
        ? goalCompletionXP(event.metadata?.["goalDifficulty"])
        : undefined);
    events.push({
      type: mapped,
      sourceId: event.sourceId ?? null,
      userId: event.userId,
      amount,
      metadata: event.metadata,
    });
  }
  for (const extra of event.extraXPEvents ?? []) {
    events.push({ userId: event.userId, ...extra });
  }
  return events;
}

/** Achievement events the orchestrator must forward, in order. */
export function toAchievementEvents(event: GamificationEvent): AchievementEvent[] {
  const events: AchievementEvent[] = [];
  const mapped = ACHIEVEMENT_EVENT_BY_TYPE[event.type] ?? null;
  if (mapped) {
    events.push({
      type: mapped,
      sourceId: event.sourceId ?? null,
      userId: event.userId,
      payload: event.payload,
    });
  }
  for (const extra of event.extraAchievementEvents ?? []) {
    events.push({ userId: event.userId, ...extra });
  }
  return events;
}

/* ---------------- Result builders ---------------- */

export function emptyResult(event: GamificationEvent, userId: string): GamificationResult {
  return {
    eventType: event.type,
    userId,
    sourceId: event.sourceId ?? null,
    xpEarned: 0,
    currentXP: 0,
    lifetimeXP: 0,
    oldLevel: 1,
    newLevel: 1,
    leveledUp: false,
    levelsGained: 0,
    isMaxLevel: false,
    nextLevelXP: 0,
    xpToNextLevel: 0,
    progressPercentage: 0,
    newAchievements: [],
    currentStreak: 0,
    weeklyProgress: null,
    nextGoal: null,
    messages: [],
    pluginData: {},
    partial: false,
    errors: [],
  };
}

export function withXP(
  result: GamificationResult,
  awarded: { amount: number; currentXP: number; lifetimeXP: number }[],
): GamificationResult {
  const xpEarned = awarded.reduce((sum, a) => sum + a.amount, 0);
  const last = awarded[awarded.length - 1];
  return {
    ...result,
    xpEarned: result.xpEarned + xpEarned,
    currentXP: last ? last.currentXP : result.currentXP,
    lifetimeXP: last ? last.lifetimeXP : result.lifetimeXP,
  };
}

export function withProgression(
  result: GamificationResult,
  level: LevelUpResult,
): GamificationResult {
  return {
    ...result,
    currentXP: level.currentXP,
    lifetimeXP: level.lifetimeXP,
    oldLevel: level.oldLevel,
    newLevel: level.newLevel,
    leveledUp: level.leveledUp,
    levelsGained: level.levelsGained,
    isMaxLevel: level.isMaxLevel,
    xpToNextLevel: level.xpRemaining,
    nextLevelXP: level.progression.xpToNextLevel,
    progressPercentage: level.progressPercentage,
  };
}

/** Achievements are merged de-duplicated: replays never duplicate unlocks. */
export function withAchievements(
  result: GamificationResult,
  unlocks: AchievementUnlockResult[],
): GamificationResult {
  const seen = new Set(result.newAchievements.map((a) => a.achievement.id));
  const merged = [...result.newAchievements];
  for (const unlock of unlocks) {
    if (seen.has(unlock.achievement.id)) continue;
    seen.add(unlock.achievement.id);
    merged.push(unlock);
  }
  return { ...result, newAchievements: merged };
}

export function withStats(
  result: GamificationResult,
  stats: PlayerProfileStats,
): GamificationResult {
  return { ...result, currentStreak: stats.currentStreak };
}

export function withWeekly(
  result: GamificationResult,
  weekly: WeeklyProgress | null,
): GamificationResult {
  return { ...result, weeklyProgress: weekly, nextGoal: buildNextGoal(result, weekly) };
}

export function withError(
  result: GamificationResult,
  stage: GamificationStage,
  error: unknown,
): GamificationResult {
  const entry: GamificationStageError = {
    stage,
    message: error instanceof Error ? error.message : String(error),
  };
  return { ...result, partial: true, errors: [...result.errors, entry] };
}

export function withPluginOutput(
  result: GamificationResult,
  name: string,
  data: Record<string, unknown> | undefined,
  messages: GamificationMessage[] = [],
): GamificationResult {
  return {
    ...result,
    pluginData: data ? { ...result.pluginData, [name]: data } : result.pluginData,
    messages: [...result.messages, ...messages],
  };
}

/** Next goal shown on the result screen: finish the week, then level up. */
export function buildNextGoal(
  result: GamificationResult,
  weekly: WeeklyProgress | null,
): NextGoal | null {
  if (weekly && weekly.remainingWorkouts > 0) {
    return {
      key: "goal.week",
      label: `Semana ${weekly.weekNumber}`,
      current: weekly.completedWorkouts,
      target: weekly.totalWorkouts,
      percentage: weekly.percentage,
    };
  }
  if (result.isMaxLevel) return null;
  return {
    key: "goal.level",
    label: `Nível ${result.newLevel + 1}`,
    current: Math.max(0, result.nextLevelXP - result.xpToNextLevel),
    target: Math.max(1, result.nextLevelXP),
    percentage: result.progressPercentage,
  };
}

/** Human-facing messages derived from the consolidated result. */
export function buildMessages(result: GamificationResult): GamificationMessage[] {
  const messages: GamificationMessage[] = [];
  if (result.xpEarned > 0) {
    messages.push({ kind: "xp", key: "gamification.xpEarned", values: { xp: result.xpEarned } });
  }
  if (result.leveledUp) {
    messages.push({
      kind: "level_up",
      key: result.levelsGained > 1 ? "gamification.multiLevelUp" : "gamification.levelUp",
      values: { level: result.newLevel, levels: result.levelsGained },
    });
  }
  if (result.isMaxLevel && result.leveledUp) {
    messages.push({ kind: "level_up", key: "gamification.maxLevel" });
  }
  for (const unlock of result.newAchievements) {
    messages.push({
      kind: "achievement",
      key: "gamification.achievement",
      values: { id: unlock.achievement.id, titleKey: unlock.titleKey },
    });
  }
  if (result.currentStreak > 1) {
    messages.push({
      kind: "streak",
      key: "gamification.streak",
      values: { days: result.currentStreak },
    });
  }
  if (result.eventType === "goal_completed") {
    messages.push({ kind: "goal", key: "gamification.goalCompleted" });
  }
  if (result.eventType === "week_completed") {
    messages.push({ kind: "week", key: "gamification.weekCompleted" });
  }
  if (result.eventType === "program_completed") {
    messages.push({ kind: "program", key: "gamification.programCompleted" });
  }
  return messages;
}

export function finalize(result: GamificationResult): GamificationResult {
  return { ...result, messages: [...buildMessages(result), ...result.messages] };
}
