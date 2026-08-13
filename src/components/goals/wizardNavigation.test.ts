import { describe, expect, it } from "vitest";
import type { DraftIssue } from "./goalTemplates";
import {
  WIZARD_STEP_KEYS,
  firstIssue,
  routeForIssues,
  stepIndexForField,
  stepKeyForField,
} from "./wizardNavigation";

const issue = (field: DraftIssue["field"]): DraftIssue => ({
  field,
  messageKey: `gl.err.${field}`,
});

describe("wizard step mapping", () => {
  it("keeps a stable five-step order", () => {
    expect(WIZARD_STEP_KEYS).toEqual(["category", "goal", "target", "tune", "review"]);
  });

  it("routes title and target to the target step", () => {
    expect(stepKeyForField("title")).toBe("target");
    expect(stepKeyForField("target")).toBe("target");
    expect(stepIndexForField("target")).toBe(2);
  });

  it("routes the deadline to the tune step", () => {
    expect(stepKeyForField("deadline")).toBe("tune");
    expect(stepIndexForField("deadline")).toBe(3);
  });
});

describe("firstIssue", () => {
  it("prefers title over target and deadline", () => {
    expect(firstIssue([issue("deadline"), issue("target"), issue("title")])?.field).toBe("title");
  });

  it("prefers target over deadline", () => {
    expect(firstIssue([issue("deadline"), issue("target")])?.field).toBe("target");
  });

  it("returns null when there is nothing to fix", () => {
    expect(firstIssue([])).toBeNull();
  });
});

describe("routeForIssues", () => {
  it("returns the owning step and field", () => {
    expect(routeForIssues([issue("deadline")])).toEqual({ step: 3, field: "deadline" });
  });

  it("returns null for a valid draft", () => {
    expect(routeForIssues([])).toBeNull();
  });
});
