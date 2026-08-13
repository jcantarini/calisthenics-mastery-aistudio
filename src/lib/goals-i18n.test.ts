import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { GOALS_DICTS, GOALS_LOCALES, tGoals } from "./goals-i18n";
import { GOAL_CATEGORIES, GOAL_DIFFICULTIES, GOAL_STATUSES, GOAL_UNITS } from "@/services/goals";
import { CUSTOM_KINDS, GOAL_TEMPLATES } from "@/components/goals/goalTemplates";
import {
  GOAL_FILTERS,
  actionLabelKey,
  categoryLabelKey,
  difficultyLabelKey,
  filterLabelKey,
  statusLabelKey,
  unitLabelKey,
} from "@/components/goals/goalPresentation";
import { NUMERIC_ISSUE_KEY } from "@/components/goals/numericInput";

// The empty label is intentional: the boolean unit renders no suffix.
const ALLOWED_EMPTY = new Set(["gl.unit.boolean"]);

const ACTIONS = ["activate", "pause", "resume", "cancel", "duplicate", "delete"] as const;

describe("goals dictionary parity", () => {
  const ptKeys = Object.keys(GOALS_DICTS.pt).sort();

  it("ships the same key set in all five locales", () => {
    for (const locale of GOALS_LOCALES) {
      expect(Object.keys(GOALS_DICTS[locale]).sort()).toEqual(ptKeys);
    }
  });

  it("has no empty translation outside the documented exception", () => {
    for (const locale of GOALS_LOCALES) {
      const dict = GOALS_DICTS[locale] as Record<string, string>;
      for (const key of ptKeys) {
        if (ALLOWED_EMPTY.has(key)) continue;
        expect(dict[key]?.trim(), `${locale}:${key}`).not.toBe("");
      }
    }
  });
});

describe("dynamic goals key families", () => {
  const dynamicKeys = [
    ...GOAL_CATEGORIES.map(categoryLabelKey),
    ...GOAL_TEMPLATES.flatMap((t) => [`gl.t.${t.id}.title`, `gl.t.${t.id}.q`, `gl.t.${t.id}.goal`]),
    ...CUSTOM_KINDS.flatMap((k) => [`gl.ck.${k.id}`, `gl.ck.q.${k.id}`]),
    ...GOAL_UNITS.filter((u) => u !== "boolean").map(unitLabelKey),
    ...GOAL_DIFFICULTIES.map(difficultyLabelKey),
    ...GOAL_STATUSES.map(statusLabelKey),
    ...GOAL_FILTERS.map(filterLabelKey),
    ...ACTIONS.map(actionLabelKey),
    ...Object.values(NUMERIC_ISSUE_KEY),
  ];

  it("resolves every dynamic key in every locale", () => {
    for (const locale of GOALS_LOCALES) {
      for (const key of dynamicKeys) {
        const value = tGoals(locale, key);
        expect(value, `${locale}:${key}`).not.toBe(key);
        expect(value.trim(), `${locale}:${key}`).not.toBe("");
      }
    }
  });
});

describe("accessible busy semantics", () => {
  const read = (path: string) => readFileSync(path, "utf-8");

  it("exposes aria-busy and a live status in every busy surface", () => {
    const surfaces: [string, string][] = [
      ["src/routes/_authenticated/metas.tsx", "gl.list.refreshing"],
      ["src/components/goals/GoalManualProgress.tsx", "gl.mp.savingStatus"],
      ["src/components/goals/GoalDetails.tsx", "gl.details.working"],
      ["src/components/goals/GoalCompletionRewardDialog.tsx", "gl.rw.checking"],
    ];
    for (const [file, key] of surfaces) {
      const source = read(file);
      expect(source, file).toContain("aria-busy=");
      expect(source, file).toContain('aria-live="polite"');
      expect(source, file).toContain(key);
    }
  });
});
