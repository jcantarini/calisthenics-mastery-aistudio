// Wizard step routing for validation issues (Sprint 7.5A).
// PURE: no React. Maps a draft issue to the step that actually owns the field
// so validation never sends the user to the wrong screen.

import type { DraftErrorField, DraftIssue } from "./goalTemplates";

export const WIZARD_STEP_KEYS = ["category", "goal", "target", "tune", "review"] as const;
export type WizardStepKey = (typeof WIZARD_STEP_KEYS)[number];

/** Step index that owns each invalid field. */
const FIELD_STEP: Record<DraftErrorField, WizardStepKey> = {
  title: "target",
  target: "target",
  deadline: "tune",
};

export function stepKeyForField(field: DraftErrorField): WizardStepKey {
  return FIELD_STEP[field];
}

export function stepIndexForField(field: DraftErrorField): number {
  return WIZARD_STEP_KEYS.indexOf(stepKeyForField(field));
}

/** First issue in field priority order: title, then target, then deadline. */
const FIELD_PRIORITY: readonly DraftErrorField[] = ["title", "target", "deadline"];

export function firstIssue(issues: readonly DraftIssue[]): DraftIssue | null {
  for (const field of FIELD_PRIORITY) {
    const found = issues.find((issue) => issue.field === field);
    if (found) return found;
  }
  return null;
}

export interface WizardFocusRoute {
  /** Step index the wizard must show before focusing. */
  step: number;
  /** Field the wizard must focus once that step has mounted. */
  field: DraftErrorField;
}

/**
 * Where the wizard must go when submission/continue validation fails.
 * Returns `null` when there is nothing to fix.
 */
export function routeForIssues(issues: readonly DraftIssue[]): WizardFocusRoute | null {
  const issue = firstIssue(issues);
  if (!issue) return null;
  return { step: stepIndexForField(issue.field), field: issue.field };
}
