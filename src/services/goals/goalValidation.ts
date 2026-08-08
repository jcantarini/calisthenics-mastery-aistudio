// Goals Engine — input validation. Pure, returns typed results (never throws).

import {
  GOAL_CATEGORIES,
  GOAL_PROGRESS_TYPES,
  GOAL_TYPES,
  GOAL_UNITS,
  type CreateGoalInput,
  type Goal,
  type UpdateGoalInput,
} from "./goalTypes";
import { isUnitAllowed } from "./goalRules";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const ok: ValidationResult = { valid: true, errors: [] };

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

export function validateCreateGoal(input: CreateGoalInput): ValidationResult {
  const errors: string[] = [];

  if (!input.title || input.title.trim().length < 3) {
    errors.push("O título da meta precisa ter ao menos 3 caracteres.");
  }
  if (!GOAL_TYPES.includes(input.type)) errors.push("Tipo de meta inválido.");
  if (!GOAL_CATEGORIES.includes(input.category)) errors.push("Categoria de meta inválida.");
  if (!GOAL_PROGRESS_TYPES.includes(input.progressType)) {
    errors.push("Tipo de progresso inválido.");
  }
  if (!GOAL_UNITS.includes(input.unit)) errors.push("Unidade inválida.");

  if (!Number.isFinite(input.targetValue) || input.targetValue <= 0) {
    errors.push("O valor alvo precisa ser maior que zero.");
  }
  if (input.progressType === "boolean" && input.targetValue !== 1) {
    errors.push("Metas de conquista (sim/não) precisam ter valor alvo igual a 1.");
  }
  if (input.currentValue !== undefined && (!Number.isFinite(input.currentValue) || input.currentValue < 0)) {
    errors.push("O valor atual não pode ser negativo.");
  }
  if (
    GOAL_PROGRESS_TYPES.includes(input.progressType) &&
    GOAL_UNITS.includes(input.unit) &&
    !isUnitAllowed(input.progressType, input.unit)
  ) {
    errors.push(`A unidade "${input.unit}" não é válida para metas do tipo "${input.progressType}".`);
  }

  if (input.startDate && !isIsoDate(input.startDate)) errors.push("Data de início inválida.");
  if (input.targetDate) {
    if (!isIsoDate(input.targetDate)) {
      errors.push("Data alvo inválida.");
    } else if (input.startDate && isIsoDate(input.startDate) && input.targetDate < input.startDate) {
      errors.push("A data alvo não pode ser anterior à data de início.");
    }
  }

  return errors.length ? { valid: false, errors } : ok;
}

export function validateUpdateGoal(goal: Goal, patch: UpdateGoalInput): ValidationResult {
  const errors: string[] = [];

  if (patch.title !== undefined && patch.title.trim().length < 3) {
    errors.push("O título da meta precisa ter ao menos 3 caracteres.");
  }
  if (patch.targetValue !== undefined && (!Number.isFinite(patch.targetValue) || patch.targetValue <= 0)) {
    errors.push("O valor alvo precisa ser maior que zero.");
  }
  if (patch.unit !== undefined) {
    if (!GOAL_UNITS.includes(patch.unit)) {
      errors.push("Unidade inválida.");
    } else if (!isUnitAllowed(goal.progressType, patch.unit)) {
      errors.push(`A unidade "${patch.unit}" não é válida para esta meta.`);
    }
  }
  if (patch.targetDate) {
    if (!isIsoDate(patch.targetDate)) {
      errors.push("Data alvo inválida.");
    } else if (patch.targetDate < goal.startDate) {
      errors.push("A data alvo não pode ser anterior à data de início.");
    }
  }
  if (goal.status === "completed" || goal.status === "cancelled" || goal.status === "expired") {
    errors.push("Metas finalizadas não podem ser editadas. Duplique a meta para recomeçar.");
  }

  return errors.length ? { valid: false, errors } : ok;
}

/** Invariant checked on read/write: a completed goal must carry completedAt. */
export function validateCompletionInvariant(goal: Goal): ValidationResult {
  if (goal.status === "completed" && !goal.completedAt) {
    return { valid: false, errors: ["Meta concluída sem data de conclusão."] };
  }
  return ok;
}
