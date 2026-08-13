import { describe, expect, it } from "vitest";
import type { Goal, GoalStatus } from "@/services/goals";
import {
  availableGoalActions,
  buildGoalsSummary,
  deadlineInfo,
  formatGoalValue,
  matchesFilter,
  sortGoalsForDisplay,
} from "./goalPresentation";

function goal(partial: Partial<Goal>): Goal {
  return {
    id: "g1",
    status: "active" as GoalStatus,
    targetDate: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    completedAt: null,
    ...partial,
  } as Goal;
}

describe("filters", () => {
  it("active includes drafts, not paused or completed", () => {
    expect(matchesFilter({ status: "active" }, "active")).toBe(true);
    expect(matchesFilter({ status: "draft" }, "active")).toBe(true);
    expect(matchesFilter({ status: "paused" }, "active")).toBe(false);
    expect(matchesFilter({ status: "completed" }, "active")).toBe(false);
  });

  it("all includes expired and cancelled", () => {
    expect(matchesFilter({ status: "expired" }, "all")).toBe(true);
    expect(matchesFilter({ status: "cancelled" }, "all")).toBe(true);
  });
});

describe("sortGoalsForDisplay", () => {
  it("puts active goals first and nearest deadline before later ones", () => {
    const sorted = sortGoalsForDisplay([
      goal({ id: "done", status: "completed" }),
      goal({ id: "late", targetDate: "2026-06-01" }),
      goal({ id: "soon", targetDate: "2026-02-01" }),
      goal({ id: "paused", status: "paused" }),
    ]);
    expect(sorted.map((g) => g.id)).toEqual(["soon", "late", "paused", "done"]);
  });
});

describe("deadlineInfo", () => {
  const today = new Date("2026-03-10T12:00:00.000Z");

  it("returns null for open-ended goals", () => {
    expect(deadlineInfo(null, today)).toBeNull();
  });

  it("detects last day and overdue", () => {
    expect(deadlineInfo("2026-03-10", today)).toEqual({
      daysLeft: 0,
      overdue: false,
      lastDay: true,
    });
    expect(deadlineInfo("2026-03-08", today)?.overdue).toBe(true);
    expect(deadlineInfo("2026-03-15", today)?.daysLeft).toBe(5);
  });
});

describe("formatGoalValue", () => {
  const t = (key: string) => (key === "gl.unit.repetitions" ? "reps" : key);

  it("formats numeric goals with unit", () => {
    expect(
      formatGoalValue({ progressType: "count", targetValue: 10, unit: "repetitions" }, 7, t),
    ).toBe("7 / 10 reps");
  });

  it("formats boolean goals as a sentence", () => {
    expect(
      formatGoalValue({ progressType: "boolean", targetValue: 1, unit: "boolean" }, 1, t),
    ).toBe("gl.achieved");
    expect(
      formatGoalValue({ progressType: "boolean", targetValue: 1, unit: "boolean" }, 0, t),
    ).toBe("gl.notAchieved");
  });
});

describe("availableGoalActions", () => {
  it("offers pause and cancel for active goals, never resume", () => {
    const actions = availableGoalActions({ status: "active" });
    expect(actions).toContain("pause");
    expect(actions).toContain("cancel");
    expect(actions).not.toContain("resume");
  });

  it("offers resume for paused goals", () => {
    expect(availableGoalActions({ status: "paused" })).toContain("resume");
  });

  it("never offers resume or pause for completed goals", () => {
    const actions = availableGoalActions({ status: "completed" });
    expect(actions).not.toContain("resume");
    expect(actions).not.toContain("pause");
    expect(actions).toEqual(["duplicate", "delete"]);
  });

  it("offers duplicate for expired and cancelled goals", () => {
    expect(availableGoalActions({ status: "expired" })).toContain("duplicate");
    expect(availableGoalActions({ status: "cancelled" })).toContain("duplicate");
  });
});

describe("buildGoalsSummary", () => {
  it("counts active and completed goals and averages canonical percentages", () => {
    const goals = [
      goal({ id: "a", status: "active" }),
      goal({ id: "b", status: "draft" }),
      goal({ id: "c", status: "completed" }),
    ];
    const summary = buildGoalsSummary(goals, (g) => (g.id === "a" ? 40 : 60));
    expect(summary).toEqual({ active: 2, completed: 1, averageProgress: 50 });
  });

  it("omits the average when nothing is active", () => {
    expect(buildGoalsSummary([goal({ status: "completed" })], () => 100).averageProgress).toBeNull();
  });
});
