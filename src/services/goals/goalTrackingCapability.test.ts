import { describe, expect, it } from "vitest";
import { goalTrackingMode, requiresManualProgress } from "./goalTrackingCapability";
import type { Goal, GoalType } from "./goalTypes";

function goal(type: GoalType, metadata: Record<string, unknown> = {}): Goal {
  return { type, metadata } as Goal;
}

describe("goalTrackingMode", () => {
  it("marks workout_count as automatic", () => {
    expect(goalTrackingMode(goal("workout_count"))).toBe("auto");
  });

  it("marks frequency, training time, streak and program as automatic", () => {
    for (const type of ["workout_frequency", "training_time", "streak", "program"] as const) {
      expect(goalTrackingMode(goal(type))).toBe("auto");
    }
  });

  it("marks strength with an exerciseId as automatic", () => {
    expect(goalTrackingMode(goal("strength", { exerciseId: "pull-up" }))).toBe("auto");
  });

  it("marks strength without an exerciseId as pending", () => {
    expect(goalTrackingMode(goal("strength"))).toBe("pending");
  });

  it("marks duration with and without an exerciseId", () => {
    expect(goalTrackingMode(goal("duration", { exerciseId: "plank" }))).toBe("auto");
    expect(goalTrackingMode(goal("duration"))).toBe("pending");
  });

  it("marks skill by skillId", () => {
    expect(goalTrackingMode(goal("skill", { skillId: "handstand" }))).toBe("auto");
    expect(goalTrackingMode(goal("skill"))).toBe("pending");
  });

  it("marks body goals by measurementKey", () => {
    expect(goalTrackingMode(goal("body_measurement", { measurementKey: "waist" }))).toBe("auto");
    expect(goalTrackingMode(goal("body_measurement"))).toBe("pending");
    expect(goalTrackingMode(goal("body_weight", { measurementKey: "weight" }))).toBe("auto");
    expect(goalTrackingMode(goal("body_weight"))).toBe("pending");
  });

  it("marks custom goals as manual", () => {
    expect(goalTrackingMode(goal("custom"))).toBe("manual");
  });

  it("treats everything that is not auto as manual progress", () => {
    expect(requiresManualProgress(goal("custom"))).toBe(true);
    expect(requiresManualProgress(goal("skill"))).toBe(true);
    expect(requiresManualProgress(goal("workout_count"))).toBe(false);
  });
});
