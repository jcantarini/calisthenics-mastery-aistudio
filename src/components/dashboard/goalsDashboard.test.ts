import { describe, expect, it } from "vitest";
import type { Goal } from "@/services/goals/goalTypes";
import { buildGoalProgress } from "@/services/goals/goalRules";
import { goalCompletionSourceId } from "@/services/xp/xpRules";
import type { XPEntry } from "@/services/xp/xpTypes";
import {
  buildGoalsDashboardModel,
  buildRecentGoalRewards,
  findGoalRewardEntry,
  goalRewardState,
  isGoalRewardEntry,
  shouldPresentGoalCompletion,
  goalCounterLabelKey,
} from "./goalsDashboard";
import { tGoals } from "@/lib/goals-i18n";

function goal(over: Partial<Goal> = {}): Goal {
  return {
    id: "g1",
    userId: "u1",
    type: "custom",
    category: "custom",
    progressType: "count",
    title: "Goal",
    description: null,
    targetValue: 10,
    currentValue: 4,
    unit: "repetitions",
    status: "active",
    difficulty: "medium",
    startDate: "2026-01-01",
    targetDate: null,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    metadata: {},
    ...over,
  };
}

function entry(over: Partial<XPEntry> = {}): XPEntry {
  return {
    id: "x1",
    userId: "u1",
    amount: 120,
    reason: "Goal completed",
    eventType: "goal_completed",
    sourceId: goalCompletionSourceId("g1"),
    metadata: {},
    runningTotal: 500,
    createdAt: "2026-02-01T10:00:00.000Z",
    ...over,
  };
}

describe("buildGoalsDashboardModel", () => {
  it("returns the empty state with no goals", () => {
    const model = buildGoalsDashboardModel([]);
    expect(model.state).toBe("empty");
    expect(model.spotlight).toBeNull();
    expect(model.counts.total).toBe(0);
  });

  it("prefers an active goal over a draft", () => {
    const model = buildGoalsDashboardModel([
      goal({ id: "d1", status: "draft" }),
      goal({ id: "a1", status: "active" }),
    ]);
    expect(model.state).toBe("spotlight");
    expect(model.spotlight?.goal.id).toBe("a1");
  });

  it("selects deterministically among active goals by nearest deadline", () => {
    const goals = [
      goal({ id: "a2", targetDate: "2026-05-01" }),
      goal({ id: "a1", targetDate: "2026-03-01" }),
    ];
    expect(buildGoalsDashboardModel(goals).spotlight?.goal.id).toBe("a1");
    expect(buildGoalsDashboardModel([...goals].reverse()).spotlight?.goal.id).toBe("a1");
  });

  it("falls back to a draft when no goal is active", () => {
    const model = buildGoalsDashboardModel([goal({ id: "d1", status: "draft" })]);
    expect(model.spotlight?.goal.id).toBe("d1");
  });

  it("uses the canonical progress helper for the spotlight", () => {
    const g = goal();
    expect(buildGoalsDashboardModel([g]).spotlight?.progress).toEqual(buildGoalProgress(g));
  });

  it("reports the completed-only summary", () => {
    const model = buildGoalsDashboardModel([goal({ status: "completed" })]);
    expect(model.state).toBe("completedOnly");
    expect(model.counts.completed).toBe(1);
  });

  it("reports the inactive state when goals exist but none are active", () => {
    const model = buildGoalsDashboardModel([goal({ status: "paused" })]);
    expect(model.state).toBe("inactive");
    expect(model.counts.paused).toBe(1);
  });
});

describe("goal reward ledger matching", () => {
  it("requires the goal_completed event type", () => {
    expect(isGoalRewardEntry(entry({ eventType: "workout_completed" }), "g1")).toBe(false);
  });

  it("requires the canonical source identity", () => {
    expect(isGoalRewardEntry(entry({ sourceId: "g1" }), "g1")).toBe(false);
    expect(isGoalRewardEntry(entry(), "g1")).toBe(true);
  });

  it("ignores unrelated entries", () => {
    const entries = [entry({ id: "x0", eventType: "goal_completed", sourceId: "goal:other" })];
    expect(findGoalRewardEntry(entries, "g1")).toBeNull();
  });

  it("exposes the persisted amount", () => {
    expect(findGoalRewardEntry([entry({ amount: 275 })], "g1")?.amount).toBe(275);
  });

  it("returns pending when no ledger entry exists yet", () => {
    expect(goalRewardState({ loading: true, error: false, entry: null })).toBe("pending");
    expect(goalRewardState({ loading: false, error: false, entry: null })).toBe("pending");
  });

  it("returns unavailable when the ledger failed to load", () => {
    expect(goalRewardState({ loading: false, error: true, entry: null })).toBe("unavailable");
  });

  it("returns confirmed once the entry exists", () => {
    expect(goalRewardState({ loading: false, error: true, entry: entry() })).toBe("confirmed");
  });
});

describe("buildRecentGoalRewards", () => {
  it("resolves the goal title through the canonical identity", () => {
    const [reward] = buildRecentGoalRewards([entry()], [goal({ title: "Pull-ups" })]);
    expect(reward?.goalTitle).toBe("Pull-ups");
    expect(reward?.amount).toBe(120);
  });

  it("uses no title (generic copy) when the goal is unavailable", () => {
    const rewards = buildRecentGoalRewards([entry()], []);
    expect(rewards[0]?.goalTitle).toBeNull();
    expect(JSON.stringify(rewards)).not.toContain(goalCompletionSourceId("g1"));
  });

  it("presents automatic and manual entries identically", () => {
    const auto = entry({ id: "a", metadata: { source: "automatic" } });
    const manual = entry({ id: "m", metadata: { source: "manual" } });
    const [ra, rm] = buildRecentGoalRewards([auto, manual], [goal()]);
    expect({ ...ra, id: "" }).toEqual({ ...rm, id: "" });
  });

  it("keeps only goal rewards and caps the list", () => {
    const entries = [
      entry({ id: "1" }),
      entry({ id: "2" }),
      entry({ id: "3" }),
      entry({ id: "4" }),
      entry({ id: "5", eventType: "workout_completed" }),
    ];
    const rewards = buildRecentGoalRewards(entries, []);
    expect(rewards).toHaveLength(3);
    expect(rewards.every((r) => r.amount === 120)).toBe(true);
  });
});

describe("shouldPresentGoalCompletion", () => {
  it("opens the completion presentation for a completed goal", () => {
    expect(shouldPresentGoalCompletion(goal({ status: "completed" }))).toBe(true);
  });

  it("does not open it for a non-completing manual update", () => {
    expect(shouldPresentGoalCompletion(goal({ status: "active" }))).toBe(false);
    expect(shouldPresentGoalCompletion(null)).toBe(false);
  });
});

describe("goalCounterLabelKey", () => {
  it("uses the plural key for 0", () => {
    expect(goalCounterLabelKey("active", 0)).toBe("gl.dash.countActiveOther");
  });

  it("uses the singular key for exactly 1", () => {
    expect(goalCounterLabelKey("active", 1)).toBe("gl.dash.countActiveOne");
    expect(goalCounterLabelKey("paused", 1)).toBe("gl.dash.countPausedOne");
    expect(goalCounterLabelKey("completed", 1)).toBe("gl.dash.countCompletedOne");
  });

  it("uses the plural key for 2 and above", () => {
    expect(goalCounterLabelKey("paused", 2)).toBe("gl.dash.countPausedOther");
    expect(goalCounterLabelKey("completed", 7)).toBe("gl.dash.countCompletedOther");
  });

  it("resolves correct Portuguese singular and plural labels", () => {
    expect(tGoals("pt", goalCounterLabelKey("paused", 1))).toBe("pausada");
    expect(tGoals("pt", goalCounterLabelKey("paused", 2))).toBe("pausadas");
    expect(tGoals("pt", goalCounterLabelKey("completed", 1))).toBe("concluída");
    expect(tGoals("pt", goalCounterLabelKey("completed", 0))).toBe("concluídas");
  });

  it("is deterministic for repeated calls", () => {
    for (const n of [0, 1, 2, 3]) {
      expect(goalCounterLabelKey("completed", n)).toBe(goalCounterLabelKey("completed", n));
    }
  });
});
