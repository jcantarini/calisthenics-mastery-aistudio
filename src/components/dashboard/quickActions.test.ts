import { describe, expect, it } from "vitest";
import { DASHBOARD_QUICK_ACTIONS, quickActionTarget } from "./quickActions";

describe("dashboard quick actions", () => {
  it("routes the Goals action to /metas", () => {
    expect(quickActionTarget("gl.qa.goals")).toBe("/metas");
  });

  it("keeps Progress semantically separate from Goals", () => {
    expect(
      DASHBOARD_QUICK_ACTIONS.some((a) => a.labelKey === "gl.qa.goals" && a.to === "/progresso"),
    ).toBe(false);
  });

  it("uses localization keys for every label", () => {
    expect(DASHBOARD_QUICK_ACTIONS.every((a) => a.labelKey.startsWith("gl.qa."))).toBe(true);
  });
});
