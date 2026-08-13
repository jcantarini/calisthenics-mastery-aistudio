// Goal creation templates — PURE product configuration (Sprint 7.4B-1).
//
// No React, no IO, no database, no completion or reward rules. A template is a
// typed description of a goal a user can create; the adapter below turns the
// user's choices into ONE valid `CreateGoalInput`. The Goals domain
// (validateCreateGoal / GoalService) stays the final authority.

import type {
  CreateGoalInput,
  GoalCategory,
  GoalDifficulty,
  GoalMetadata,
  GoalProgressType,
  GoalType,
  GoalUnit,
} from "@/services/goals/goalTypes";
import { UNITS_BY_PROGRESS_TYPE } from "@/services/goals/goalRules";

/* ---------------- Template model ---------------- */

export interface GoalTemplate {
  /** Stable id — safe to persist in analytics/tests, never shown to users. */
  id: string;
  category: GoalCategory;
  type: GoalType;
  progressType: GoalProgressType;
  unit: GoalUnit;
  /** Whether step 3 asks for a number at all (boolean goals do not). */
  numericTarget: boolean;
  defaultTarget: number;
  minTarget: number;
  maxTarget: number;
  step: number;
  /** Product default; the user can always change it in step 4. */
  difficulty: GoalDifficulty;
  /** Canonical metadata already understood by the Goals domain. */
  metadata: GoalMetadata;
  allowDeadline: boolean;
}

function tpl(t: GoalTemplate): GoalTemplate {
  return t;
}

/** Product catalogue. Ordered per category, most useful first. */
export const GOAL_TEMPLATES: readonly GoalTemplate[] = [
  tpl({
    id: "weekly_workouts",
    category: "fitness",
    type: "workout_frequency",
    progressType: "count",
    unit: "workouts",
    numericTarget: true,
    defaultTarget: 4,
    minTarget: 1,
    maxTarget: 14,
    step: 1,
    difficulty: "medium",
    metadata: {},
    // The domain already closes the frequency window 7 days after the start.
    allowDeadline: false,
  }),
  tpl({
    id: "total_workouts",
    category: "fitness",
    type: "workout_count",
    progressType: "count",
    unit: "workouts",
    numericTarget: true,
    defaultTarget: 20,
    minTarget: 1,
    maxTarget: 500,
    step: 1,
    difficulty: "medium",
    metadata: {},
    allowDeadline: true,
  }),
  tpl({
    id: "training_time",
    category: "fitness",
    type: "training_time",
    progressType: "cumulative",
    unit: "minutes",
    numericTarget: true,
    defaultTarget: 300,
    minTarget: 10,
    maxTarget: 10000,
    step: 10,
    difficulty: "medium",
    metadata: {},
    allowDeadline: true,
  }),
  tpl({
    id: "streak",
    category: "consistency",
    type: "streak",
    progressType: "streak",
    unit: "days",
    numericTarget: true,
    defaultTarget: 7,
    minTarget: 2,
    maxTarget: 365,
    step: 1,
    difficulty: "medium",
    metadata: {},
    allowDeadline: true,
  }),
  tpl({
    id: "pullups",
    category: "strength",
    type: "strength",
    progressType: "threshold",
    unit: "repetitions",
    numericTarget: true,
    defaultTarget: 10,
    minTarget: 1,
    maxTarget: 100,
    step: 1,
    difficulty: "hard",
    metadata: {},
    allowDeadline: true,
  }),
  tpl({
    id: "pushups",
    category: "strength",
    type: "strength",
    progressType: "threshold",
    unit: "repetitions",
    numericTarget: true,
    defaultTarget: 40,
    minTarget: 1,
    maxTarget: 300,
    step: 1,
    difficulty: "medium",
    metadata: {},
    allowDeadline: true,
  }),
  tpl({
    id: "plank",
    category: "strength",
    type: "duration",
    progressType: "threshold",
    unit: "seconds",
    numericTarget: true,
    defaultTarget: 120,
    minTarget: 10,
    maxTarget: 1800,
    step: 10,
    difficulty: "medium",
    metadata: {},
    allowDeadline: true,
  }),
  tpl({
    id: "handstand",
    category: "skill",
    type: "skill",
    progressType: "boolean",
    unit: "boolean",
    numericTarget: false,
    defaultTarget: 1,
    minTarget: 1,
    maxTarget: 1,
    step: 1,
    difficulty: "hard",
    metadata: {},
    allowDeadline: true,
  }),
  tpl({
    id: "lsit",
    category: "skill",
    type: "skill",
    progressType: "boolean",
    unit: "boolean",
    numericTarget: false,
    defaultTarget: 1,
    minTarget: 1,
    maxTarget: 1,
    step: 1,
    difficulty: "hard",
    metadata: {},
    allowDeadline: true,
  }),
  tpl({
    id: "program",
    category: "program",
    type: "program",
    progressType: "boolean",
    unit: "boolean",
    numericTarget: false,
    defaultTarget: 1,
    minTarget: 1,
    maxTarget: 1,
    step: 1,
    difficulty: "hard",
    // `scope: program` is the identifier the tracking rules already read.
    metadata: { scope: "program" },
    allowDeadline: true,
  }),
  tpl({
    id: "custom",
    category: "custom",
    type: "custom",
    progressType: "count",
    unit: "repetitions",
    numericTarget: true,
    defaultTarget: 10,
    minTarget: 1,
    maxTarget: 100000,
    step: 1,
    difficulty: "medium",
    metadata: {},
    allowDeadline: true,
  }),
];

/** Categories that actually own at least one template. Never empty tabs. */
export const WIZARD_CATEGORIES: readonly GoalCategory[] = [
  "fitness",
  "consistency",
  "strength",
  "skill",
  "program",
  "custom",
];

export function templatesForCategory(category: GoalCategory): GoalTemplate[] {
  return GOAL_TEMPLATES.filter((t) => t.category === category);
}

export function findTemplate(id: string | null): GoalTemplate | null {
  if (!id) return null;
  return GOAL_TEMPLATES.find((t) => t.id === id) ?? null;
}

/* ---------------- Custom goal (constrained) ---------------- */

export interface CustomKind {
  id: string;
  progressType: GoalProgressType;
  /** Only units the domain accepts for this progress type. */
  units: readonly GoalUnit[];
  numericTarget: boolean;
  defaultTarget: number;
  minTarget: number;
  maxTarget: number;
  step: number;
}

export const CUSTOM_KINDS: readonly CustomKind[] = [
  {
    id: "reps",
    progressType: "count",
    units: ["repetitions"],
    numericTarget: true,
    defaultTarget: 100,
    minTarget: 1,
    maxTarget: 100000,
    step: 1,
  },
  {
    id: "workouts",
    progressType: "count",
    units: ["workouts"],
    numericTarget: true,
    defaultTarget: 10,
    minTarget: 1,
    maxTarget: 1000,
    step: 1,
  },
  {
    id: "time",
    progressType: "cumulative",
    units: ["minutes", "seconds"],
    numericTarget: true,
    defaultTarget: 120,
    minTarget: 10,
    maxTarget: 100000,
    step: 10,
  },
  {
    id: "days",
    progressType: "count",
    units: ["days"],
    numericTarget: true,
    defaultTarget: 30,
    minTarget: 1,
    maxTarget: 365,
    step: 1,
  },
  {
    id: "measure",
    progressType: "target_value",
    units: ["kilograms", "centimeters", "percentage"],
    numericTarget: true,
    defaultTarget: 10,
    minTarget: 1,
    maxTarget: 1000,
    step: 1,
  },
  {
    id: "done",
    progressType: "boolean",
    units: ["boolean"],
    numericTarget: false,
    defaultTarget: 1,
    minTarget: 1,
    maxTarget: 1,
    step: 1,
  },
];

export function findCustomKind(id: string | null): CustomKind | null {
  if (!id) return null;
  return CUSTOM_KINDS.find((k) => k.id === id) ?? null;
}

/** Guard: a custom combination is only offered when the domain allows it. */
export function isCustomCombinationAllowed(
  progressType: GoalProgressType,
  unit: GoalUnit,
): boolean {
  return UNITS_BY_PROGRESS_TYPE[progressType].includes(unit);
}

/* ---------------- Draft ---------------- */

export interface GoalDraft {
  category: GoalCategory | null;
  templateId: string | null;
  target: number;
  difficulty: GoalDifficulty;
  targetDate: string | null;
  customTitle: string;
  customDescription: string;
  customKindId: string;
  customUnit: GoalUnit;
}

export function emptyDraft(): GoalDraft {
  const kind = CUSTOM_KINDS[0]!;
  return {
    category: null,
    templateId: null,
    target: 0,
    difficulty: "medium",
    targetDate: null,
    customTitle: "",
    customDescription: "",
    customKindId: kind.id,
    customUnit: kind.units[0]!,
  };
}

/** Selecting a category clears every template-bound value. */
export function selectCategory(draft: GoalDraft, category: GoalCategory): GoalDraft {
  if (draft.category === category) return draft;
  return { ...emptyDraft(), category };
}

/** Selecting a template resets the target/difficulty to that template's defaults. */
export function selectTemplate(template: GoalTemplate): GoalDraft {
  const base = emptyDraft();
  return {
    ...base,
    category: template.category,
    templateId: template.id,
    target: template.defaultTarget,
    difficulty: template.difficulty,
    targetDate: null,
  };
}

/** Changing the custom kind resets target and unit to that kind's defaults. */
export function selectCustomKind(draft: GoalDraft, kind: CustomKind): GoalDraft {
  return {
    ...draft,
    customKindId: kind.id,
    customUnit: kind.units[0]!,
    target: kind.defaultTarget,
  };
}

/** Effective numeric bounds for the current draft. */
export function targetBounds(draft: GoalDraft): {
  min: number;
  max: number;
  step: number;
  numeric: boolean;
} {
  const template = findTemplate(draft.templateId);
  if (template && template.id !== "custom") {
    return {
      min: template.minTarget,
      max: template.maxTarget,
      step: template.step,
      numeric: template.numericTarget,
    };
  }
  const kind = findCustomKind(draft.customKindId) ?? CUSTOM_KINDS[0]!;
  return {
    min: kind.minTarget,
    max: kind.maxTarget,
    step: kind.step,
    numeric: kind.numericTarget,
  };
}

/** Resolved progress semantics for the current draft. */
export function draftShape(draft: GoalDraft): {
  progressType: GoalProgressType;
  unit: GoalUnit;
  type: GoalType;
  category: GoalCategory;
  metadata: GoalMetadata;
} | null {
  const template = findTemplate(draft.templateId);
  if (!template) return null;
  if (template.id !== "custom") {
    return {
      progressType: template.progressType,
      unit: template.unit,
      type: template.type,
      category: template.category,
      metadata: template.metadata,
    };
  }
  const kind = findCustomKind(draft.customKindId);
  if (!kind) return null;
  const unit = kind.units.includes(draft.customUnit) ? draft.customUnit : kind.units[0]!;
  return {
    progressType: kind.progressType,
    unit,
    type: "custom",
    category: "custom",
    metadata: {},
  };
}

/* ---------------- Validation (UI-level, friendly) ---------------- */

export type DraftErrorField = "title" | "target" | "deadline";

export interface DraftIssue {
  field: DraftErrorField;
  messageKey: string;
}

export function todayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Friendly pre-flight checks. GoalService remains authoritative. */
export function validateDraft(draft: GoalDraft, today: string = todayKey()): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const shape = draftShape(draft);
  const template = findTemplate(draft.templateId);
  if (!shape || !template) return issues;

  if (template.id === "custom" && draft.customTitle.trim().length < 3) {
    issues.push({ field: "title", messageKey: "gl.err.title" });
  }

  const bounds = targetBounds(draft);
  if (bounds.numeric) {
    const value = draft.target;
    if (!Number.isFinite(value) || value < bounds.min || value > bounds.max) {
      issues.push({ field: "target", messageKey: "gl.err.target" });
    }
  }

  if (draft.targetDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.targetDate) || draft.targetDate < today) {
      issues.push({ field: "deadline", messageKey: "gl.err.deadline" });
    }
  }

  if (!isCustomCombinationAllowed(shape.progressType, shape.unit)) {
    issues.push({ field: "target", messageKey: "gl.err.target" });
  }

  return issues;
}

/* ---------------- Adapter: draft -> CreateGoalInput ---------------- */

/**
 * Single place where product choices become a domain input. Pure: the title
 * translator is injected so no dictionary is imported here.
 */
export function buildCreateGoalInput(
  draft: GoalDraft,
  t: (key: string) => string,
  today: string = todayKey(),
): CreateGoalInput | null {
  const template = findTemplate(draft.templateId);
  const shape = draftShape(draft);
  if (!template || !shape) return null;

  const bounds = targetBounds(draft);
  const targetValue = bounds.numeric ? draft.target : 1;

  const title =
    template.id === "custom"
      ? draft.customTitle.trim()
      : t(`gl.t.${template.id}.goal`).replace("{n}", String(targetValue));

  const description =
    template.id === "custom" && draft.customDescription.trim().length > 0
      ? draft.customDescription.trim()
      : null;

  return {
    type: shape.type,
    category: shape.category,
    progressType: shape.progressType,
    unit: shape.unit,
    title,
    description,
    targetValue,
    currentValue: 0,
    status: "active",
    difficulty: draft.difficulty,
    startDate: today,
    targetDate: template.allowDeadline ? draft.targetDate : null,
    metadata: shape.metadata,
  };
}
