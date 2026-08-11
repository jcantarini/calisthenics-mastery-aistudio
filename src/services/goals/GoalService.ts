// Goals Engine — the single source of truth for user goals.
// No React, no XP, no achievements: Goals only emits typed events.

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  buildGoalProgress,
  foldProgress,
  isGoalCompleted,
  isGoalExpired,
  validateGoalTransition,
} from "./goalRules";
import { emitGoalEvent, type GoalProgressSignal } from "./goalEvents";
import { validateCreateGoal, validateUpdateGoal } from "./goalValidation";
import {
  DEFAULT_GOAL_DIFFICULTY,
  GoalError,
  isGoalDifficulty,
  type CreateGoalInput,
  type Goal,
  type GoalCategory,
  type GoalProgress,
  type GoalProgressType,
  type GoalQuery,
  type GoalStatus,
  type GoalType,
  type GoalUnit,
  type UpdateGoalInput,
} from "./goalTypes";

/* ---------------- Identity ---------------- */

async function resolveUserId(userId?: string): Promise<string> {
  if (userId) return userId;
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new GoalError("unauthenticated", "Usuário não autenticado");
  return data.user.id;
}

/* ---------------- Mapping ---------------- */

const COLUMNS =
  "id, user_id, type, category, progress_type, title, description, target_value, current_value, unit, status, difficulty, start_date, target_date, completed_at, metadata, created_at, updated_at";

interface GoalRow {
  id: string;
  user_id: string;
  type: string;
  category: string;
  progress_type: string;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  unit: string;
  status: string;
  difficulty: string | null;
  start_date: string;
  target_date: string | null;
  completed_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as GoalType,
    category: row.category as GoalCategory,
    progressType: row.progress_type as GoalProgressType,
    title: row.title,
    description: row.description,
    targetValue: Number(row.target_value),
    currentValue: Number(row.current_value),
    unit: row.unit as GoalUnit,
    status: row.status as GoalStatus,
    difficulty: isGoalDifficulty(row.difficulty) ? row.difficulty : DEFAULT_GOAL_DIFFICULTY,
    startDate: row.start_date,
    targetDate: row.target_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function fail(context: string, error: unknown): never {
  console.error(`[goals] ${context}`, error);
  throw new GoalError("persistence_failed", "Não foi possível salvar a meta agora.");
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ---------------- Service ---------------- */

async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const validation = validateCreateGoal(input);
  if (!validation.valid) {
    throw new GoalError("validation_failed", validation.errors[0], validation.errors);
  }
  const userId = await resolveUserId(input.userId);
  const status: GoalStatus = input.status ?? "active";

  const { data, error } = await supabase
    .from("user_goals")
    .insert({
      user_id: userId,
      type: input.type,
      category: input.category,
      progress_type: input.progressType,
      title: input.title.trim(),
      description: input.description ?? null,
      target_value: input.targetValue,
      current_value: input.currentValue ?? 0,
      unit: input.unit,
      status,
      difficulty: input.difficulty ?? DEFAULT_GOAL_DIFFICULTY,
      start_date: input.startDate ?? todayIso(),
      target_date: input.targetDate ?? null,
      metadata: (input.metadata ?? {}) as Json,
    })
    .select(COLUMNS)
    .single();
  if (error || !data) fail("createGoal", error);

  const goal = toGoal(data as GoalRow);
  await emitGoalEvent({
    type: "goal_created",
    userId,
    goalId: goal.id,
    goal,
    occurredAt: new Date().toISOString(),
  });
  return goal;
}

async function getGoal(goalId: string, userId?: string): Promise<Goal | null> {
  const uid = await resolveUserId(userId);
  const { data, error } = await supabase
    .from("user_goals")
    .select(COLUMNS)
    .eq("id", goalId)
    .eq("user_id", uid)
    .maybeSingle();
  if (error) fail("getGoal", error);
  return data ? toGoal(data as GoalRow) : null;
}

async function requireGoal(goalId: string, userId?: string): Promise<Goal> {
  const goal = await getGoal(goalId, userId);
  if (!goal) throw new GoalError("not_found", "Meta não encontrada.");
  return goal;
}

async function getGoals(query: GoalQuery = {}, userId?: string): Promise<Goal[]> {
  const uid = await resolveUserId(userId);
  let request = supabase
    .from("user_goals")
    .select(COLUMNS)
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (query.status) {
    request = Array.isArray(query.status)
      ? request.in("status", query.status)
      : request.eq("status", query.status);
  }
  if (query.category) request = request.eq("category", query.category);
  if (query.type) request = request.eq("type", query.type);
  if (query.limit) request = request.limit(query.limit);

  const { data, error } = await request;
  if (error) fail("getGoals", error);
  return (data as GoalRow[]).map(toGoal);
}

const getActiveGoals = (userId?: string) => getGoals({ status: "active" }, userId);
const getCompletedGoals = (userId?: string) => getGoals({ status: "completed" }, userId);

/**
 * Bounded list of the most recently completed goals (newest completion first).
 * Used by the reward reconciliation layer — reliability, not analytics — so the
 * query is always limited and ordered by the authoritative `completed_at`.
 */
async function getRecentCompletedGoals(limit = 50, userId?: string): Promise<Goal[]> {
  const uid = await resolveUserId(userId);
  const { data, error } = await supabase
    .from("user_goals")
    .select(COLUMNS)
    .eq("user_id", uid)
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(Math.max(1, Math.trunc(limit)));
  if (error) fail("getRecentCompletedGoals", error);
  return (data as GoalRow[]).map(toGoal);
}

async function updateGoal(goalId: string, patch: UpdateGoalInput, userId?: string): Promise<Goal> {
  const goal = await requireGoal(goalId, userId);
  const validation = validateUpdateGoal(goal, patch);
  if (!validation.valid) {
    throw new GoalError("validation_failed", validation.errors[0], validation.errors);
  }

  const { data, error } = await supabase
    .from("user_goals")
    .update({
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.targetValue !== undefined ? { target_value: patch.targetValue } : {}),
      ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
      ...(patch.difficulty !== undefined ? { difficulty: patch.difficulty } : {}),
      ...(patch.targetDate !== undefined ? { target_date: patch.targetDate } : {}),
      ...(patch.metadata !== undefined ? { metadata: patch.metadata as Json } : {}),
    })
    .eq("id", goal.id)
    .eq("user_id", goal.userId)
    .select(COLUMNS)
    .single();
  if (error || !data) fail("updateGoal", error);
  return toGoal(data as GoalRow);
}

async function deleteGoal(goalId: string, userId?: string): Promise<void> {
  const uid = await resolveUserId(userId);
  const { error } = await supabase.from("user_goals").delete().eq("id", goalId).eq("user_id", uid);
  if (error) fail("deleteGoal", error);
}

/** Applies a lifecycle transition after validating it against the rules. */
async function transition(goalId: string, to: GoalStatus, userId?: string): Promise<Goal> {
  const goal = await requireGoal(goalId, userId);
  if (goal.status === to) return goal; // idempotent no-op
  if (!validateGoalTransition(goal.status, to)) {
    throw new GoalError("invalid_transition", `Transição inválida: ${goal.status} → ${to}.`);
  }

  const completedAt = to === "completed" ? new Date().toISOString() : goal.completedAt;
  const { data, error } = await supabase
    .from("user_goals")
    .update({ status: to, completed_at: to === "completed" ? completedAt : goal.completedAt })
    .eq("id", goal.id)
    .eq("user_id", goal.userId)
    .eq("status", goal.status) // optimistic guard: prevents double transitions
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail("transition", error);
  if (!data) return requireGoal(goalId, userId); // someone else already moved it

  const next = toGoal(data as GoalRow);
  const occurredAt = new Date().toISOString();
  switch (to) {
    case "active":
      await emitGoalEvent({
        type: goal.status === "paused" ? "goal_resumed" : "goal_activated",
        userId: next.userId,
        goalId: next.id,
        goal: next,
        occurredAt,
        previousStatus: goal.status,
      } as never);
      break;
    case "paused":
      await emitGoalEvent({
        type: "goal_paused",
        userId: next.userId,
        goalId: next.id,
        goal: next,
        occurredAt,
      });
      break;
    case "cancelled":
      await emitGoalEvent({
        type: "goal_cancelled",
        userId: next.userId,
        goalId: next.id,
        goal: next,
        occurredAt,
      });
      break;
    case "expired":
      await emitGoalEvent({
        type: "goal_expired",
        userId: next.userId,
        goalId: next.id,
        goal: next,
        occurredAt,
      });
      break;
    case "completed":
      await emitGoalEvent({
        type: "goal_completed",
        userId: next.userId,
        goalId: next.id,
        goal: next,
        occurredAt,
        completedAt: next.completedAt ?? occurredAt,
        sourceId: next.id,
      });
      break;
    default:
      break;
  }
  return next;
}

const activateGoal = (goalId: string, userId?: string) => transition(goalId, "active", userId);
const pauseGoal = (goalId: string, userId?: string) => transition(goalId, "paused", userId);
const resumeGoal = (goalId: string, userId?: string) => transition(goalId, "active", userId);
const cancelGoal = (goalId: string, userId?: string) => transition(goalId, "cancelled", userId);

/** Idempotent: completing an already completed goal is a no-op. */
const completeGoal = (goalId: string, userId?: string) => transition(goalId, "completed", userId);

async function getGoalProgress(goalId: string, userId?: string): Promise<GoalProgress> {
  const goal = await requireGoal(goalId, userId);
  return buildGoalProgress(goal);
}

/**
 * Records observed progress. Completion is auto-applied (and only once)
 * when the domain rules say the target was reached.
 *
 * The write uses a compare-and-set guard on `current_value` and retries on a
 * lost race, so two concurrent observations can never overwrite each other.
 */
async function updateGoalProgress(
  goalId: string,
  signal: GoalProgressSignal,
  userId?: string,
  attempt = 0,
): Promise<Goal> {
  const goal = await requireGoal(goalId, userId);
  if (goal.status === "completed") return goal; // idempotent
  if (goal.status !== "active" && goal.status !== "draft") {
    throw new GoalError("invalid_transition", "Só metas ativas registram progresso.");
  }

  const nextValue = foldProgress(goal.progressType, goal.currentValue, signal.value, signal.mode);
  if (nextValue === goal.currentValue) return goal;

  const { data, error } = await supabase
    .from("user_goals")
    .update({ current_value: nextValue })
    .eq("id", goal.id)
    .eq("user_id", goal.userId)
    .eq("current_value", goal.currentValue) // optimistic guard against lost updates
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail("updateGoalProgress", error);
  if (!data) {
    // Someone else moved the value between our read and write: re-read and retry.
    if (attempt >= 4) {
      throw new GoalError("persistence_failed", "Não foi possível salvar a meta agora.");
    }
    return updateGoalProgress(goalId, signal, userId, attempt + 1);
  }

  const updated = toGoal(data as GoalRow);
  await emitGoalEvent({
    type: "goal_progress_updated",
    userId: updated.userId,
    goalId: updated.id,
    goal: updated,
    occurredAt: new Date().toISOString(),
    progress: buildGoalProgress(updated),
    delta: nextValue - goal.currentValue,
  });

  if (isGoalCompleted(updated.currentValue, updated.targetValue, updated.progressType)) {
    return completeGoal(updated.id, updated.userId);
  }
  return updated;
}

/**
 * Re-evaluates a goal against the rules (expiration + completion).
 * Pure decisions live in goalRules; this only persists the outcome.
 */
async function evaluateGoal(goalId: string, userId?: string): Promise<Goal> {
  const goal = await requireGoal(goalId, userId);
  if (
    isGoalCompleted(goal.currentValue, goal.targetValue, goal.progressType) &&
    goal.status === "active"
  ) {
    return completeGoal(goal.id, goal.userId);
  }
  if (isGoalExpired(goal)) return transition(goal.id, "expired", goal.userId);
  return goal;
}

/**
 * Authoritative count of completed goals. Used by the Gamification pipeline so
 * goal achievements never trust a client-provided number. Goals owns the data;
 * it still knows nothing about achievements.
 */
async function countCompletedGoals(userId?: string): Promise<number> {
  const uid = await resolveUserId(userId);
  const { count, error } = await supabase
    .from("user_goals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("status", "completed");
  if (error) fail("countCompletedGoals", error);
  return count ?? 0;
}

/** Explicit restart of a finished goal: creates a fresh copy at zero. */
async function duplicateGoal(goalId: string, userId?: string): Promise<Goal> {
  const goal = await requireGoal(goalId, userId);
  return createGoal({
    userId: goal.userId,
    type: goal.type,
    category: goal.category,
    progressType: goal.progressType,
    title: goal.title,
    description: goal.description,
    targetValue: goal.targetValue,
    unit: goal.unit,
    difficulty: goal.difficulty,
    status: "active",
    startDate: todayIso(),
    targetDate: null,
    metadata: { ...goal.metadata, duplicatedFrom: goal.id },
  });
}

export const GoalService = {
  createGoal,
  getGoal,
  getGoals,
  getActiveGoals,
  getCompletedGoals,
  getRecentCompletedGoals,
  countCompletedGoals,
  updateGoal,
  deleteGoal,
  activateGoal,
  pauseGoal,
  resumeGoal,
  cancelGoal,
  completeGoal,
  getGoalProgress,
  updateGoalProgress,
  evaluateGoal,
  duplicateGoal,
};
