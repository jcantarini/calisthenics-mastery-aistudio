import { describe, expect, it } from "vitest";
import { validateCreateGoal } from "@/services/goals/goalValidation";
import { goalTrackingMode } from "@/services/goals/goalTrackingCapability";
import {
  CUSTOM_KINDS,
  GOAL_TEMPLATES,
  WIZARD_CATEGORIES,
  buildCreateGoalInput,
  emptyDraft,
  findCustomKind,
  findTemplate,
  isCustomCombinationAllowed,
  selectCategory,
  selectCustomKind,
  selectTemplate,
  templatesForCategory,
  validateDraft,
  type GoalDraft,
} from "./goalTemplates";

const t = (key: string) => key;
const TODAY = "2026-01-10";

function draftFor(id: string): GoalDraft {
  const template = findTemplate(id);
  if (!template) throw new Error(`unknown template ${id}`);
  return selectTemplate(template);
}

describe("goal templates catalogue", () => {
  it("exposes only categories that own templates", () => {
    for (const category of WIZARD_CATEGORIES) {
      expect(templatesForCategory(category).length).toBeGreaterThan(0);
    }
  });

  it("filters templates by category", () => {
    expect(templatesForCategory("skill").map((x) => x.id)).toEqual(["handstand", "lsit"]);
    expect(templatesForCategory("strength").every((x) => x.category === "strength")).toBe(true);
  });

  it("every template produces a valid CreateGoalInput", () => {
    for (const template of GOAL_TEMPLATES) {
      const draft = { ...draftFor(template.id), customTitle: "Minha meta" };
      const input = buildCreateGoalInput(draft, t, TODAY);
      expect(input, template.id).not.toBeNull();
      expect(validateCreateGoal(input!).errors, template.id).toEqual([]);
    }
  });
});

describe("template mapping", () => {
  it("maps weekly workouts to a 7-day frequency goal without a deadline", () => {
    const input = buildCreateGoalInput(draftFor("weekly_workouts"), t, TODAY)!;
    expect(input.type).toBe("workout_frequency");
    expect(input.progressType).toBe("count");
    expect(input.unit).toBe("workouts");
    expect(input.targetValue).toBe(4);
    expect(input.targetDate).toBeNull();
    expect(input.startDate).toBe(TODAY);
  });

  it("maps total workouts", () => {
    const input = buildCreateGoalInput(draftFor("total_workouts"), t, TODAY)!;
    expect(input.type).toBe("workout_count");
    expect(input.category).toBe("fitness");
    expect(input.unit).toBe("workouts");
  });

  it("maps training time to cumulative minutes", () => {
    const input = buildCreateGoalInput(draftFor("training_time"), t, TODAY)!;
    expect(input.type).toBe("training_time");
    expect(input.progressType).toBe("cumulative");
    expect(input.unit).toBe("minutes");
  });

  it("maps streak to days", () => {
    const input = buildCreateGoalInput(draftFor("streak"), t, TODAY)!;
    expect(input.type).toBe("streak");
    expect(input.progressType).toBe("streak");
    expect(input.unit).toBe("days");
    expect(input.category).toBe("consistency");
  });

  it("maps program completion to the canonical program scope", () => {
    const input = buildCreateGoalInput(draftFor("program"), t, TODAY)!;
    expect(input.type).toBe("program");
    expect(input.metadata).toEqual({ scope: "program" });
    expect(input.targetValue).toBe(1);
  });

  it("keeps boolean skill goals at target 1", () => {
    for (const id of ["handstand", "lsit"]) {
      const input = buildCreateGoalInput(draftFor(id), t, TODAY)!;
      expect(input.progressType).toBe("boolean");
      expect(input.unit).toBe("boolean");
      expect(input.targetValue).toBe(1);
      expect(validateCreateGoal(input).valid).toBe(true);
    }
  });

  it("never attaches fake tracking identifiers", () => {
    for (const template of GOAL_TEMPLATES) {
      const metadata = template.metadata as Record<string, unknown>;
      expect(metadata["exerciseId"]).toBeUndefined();
      expect(metadata["skillId"]).toBeUndefined();
      expect(metadata["measurementKey"]).toBeUndefined();
    }
  });
});

describe("tracking truthfulness", () => {
  const modeOf = (id: string) => {
    const template = findTemplate(id)!;
    return goalTrackingMode({ type: template.type, metadata: template.metadata });
  };

  it("marks production-supported templates as auto", () => {
    for (const id of ["weekly_workouts", "total_workouts", "training_time", "streak", "program"]) {
      expect(modeOf(id), id).toBe("auto");
    }
  });

  it("never promises automatic tracking for exercise or skill templates", () => {
    for (const id of ["pullups", "pushups", "plank", "handstand", "lsit"]) {
      expect(modeOf(id), id).toBe("pending");
    }
  });

  it("keeps custom goals manual", () => {
    expect(modeOf("custom")).toBe("manual");
  });
});

describe("custom goals", () => {
  it("only offers combinations the domain accepts", () => {
    for (const kind of CUSTOM_KINDS) {
      for (const unit of kind.units) {
        expect(isCustomCombinationAllowed(kind.progressType, unit), `${kind.id}/${unit}`).toBe(
          true,
        );
      }
    }
  });

  it("rejects nonsense combinations", () => {
    expect(isCustomCombinationAllowed("duration", "kilograms")).toBe(false);
    expect(isCustomCombinationAllowed("boolean", "repetitions")).toBe(false);
    expect(isCustomCombinationAllowed("streak", "workouts")).toBe(false);
  });

  it("builds a valid input for every custom kind", () => {
    for (const kind of CUSTOM_KINDS) {
      const draft = selectCustomKind(
        { ...draftFor("custom"), customTitle: "Treinar na praia" },
        kind,
      );
      const input = buildCreateGoalInput(draft, t, TODAY)!;
      expect(input.type).toBe("custom");
      expect(input.progressType).toBe(kind.progressType);
      expect(validateCreateGoal(input).errors, kind.id).toEqual([]);
    }
  });

  it("requires a title of at least 3 characters", () => {
    const draft = { ...draftFor("custom"), customTitle: "ab" };
    expect(validateDraft(draft, TODAY).some((i) => i.field === "title")).toBe(true);
  });

  it("keeps an achieved/not-achieved custom goal at target 1", () => {
    const done = findCustomKind("done")!;
    const draft = selectCustomKind({ ...draftFor("custom"), customTitle: "Subir a corda" }, done);
    const input = buildCreateGoalInput(draft, t, TODAY)!;
    expect(input.targetValue).toBe(1);
    expect(input.progressType).toBe("boolean");
  });
});

describe("draft validation", () => {
  it("rejects out-of-range targets", () => {
    const low = { ...draftFor("streak"), target: 0 };
    const high = { ...draftFor("streak"), target: 5000 };
    expect(validateDraft(low, TODAY).some((i) => i.field === "target")).toBe(true);
    expect(validateDraft(high, TODAY).some((i) => i.field === "target")).toBe(true);
  });

  it("rejects a deadline before today", () => {
    const draft = { ...draftFor("total_workouts"), targetDate: "2026-01-09" };
    expect(validateDraft(draft, TODAY).some((i) => i.field === "deadline")).toBe(true);
  });

  it("accepts today as a deadline", () => {
    const draft = { ...draftFor("total_workouts"), targetDate: TODAY };
    expect(validateDraft(draft, TODAY)).toEqual([]);
  });

  it("passes the domain validator for a dated goal", () => {
    const draft = { ...draftFor("total_workouts"), targetDate: "2026-03-01", target: 30 };
    const input = buildCreateGoalInput(draft, t, TODAY)!;
    expect(input.targetDate).toBe("2026-03-01");
    expect(validateCreateGoal(input).valid).toBe(true);
  });
});

describe("wizard state resets", () => {
  it("clears template configuration when the category changes", () => {
    const configured = { ...draftFor("streak"), target: 30, targetDate: "2026-02-01" };
    const next = selectCategory(configured, "strength");
    expect(next.templateId).toBeNull();
    expect(next.targetDate).toBeNull();
    expect(next.category).toBe("strength");
  });

  it("resets incompatible target values when the template changes", () => {
    const plank = selectTemplate(findTemplate("plank")!);
    const modified = { ...plank, target: 600 };
    const pullups = selectTemplate(findTemplate("pullups")!);
    expect(modified.target).toBe(600);
    expect(pullups.target).toBe(10);
    expect(pullups.difficulty).toBe("hard");
  });

  it("resets the unit when the custom kind changes", () => {
    const draft = selectCustomKind(draftFor("custom"), findCustomKind("measure")!);
    expect(draft.customUnit).toBe("kilograms");
    const back = selectCustomKind(draft, findCustomKind("time")!);
    expect(back.customUnit).toBe("minutes");
    expect(back.target).toBe(120);
  });

  it("starts empty", () => {
    const draft = emptyDraft();
    expect(draft.category).toBeNull();
    expect(draft.templateId).toBeNull();
    expect(buildCreateGoalInput(draft, t, TODAY)).toBeNull();
  });
});
