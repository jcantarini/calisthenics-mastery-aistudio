import { describe, expect, it } from "vitest";
import { DEFAULT_LEVEL_CURVE, buildLevelTable, levelForXP, xpForLevel } from "./levelCurve";
import { buildResult, emptyProgression, eventTypeForTransition, nextProgression, snapshotForXP } from "./levelRules";

describe("level curve", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(levelForXP(0)).toBe(1);
  });

  it("follows the designed progression", () => {
    expect(xpForLevel(2)).toBe(250);
    expect(xpForLevel(3)).toBe(600);
    expect(xpForLevel(4)).toBe(1100);
    expect(xpForLevel(5)).toBe(1800);
  });

  it("is strictly increasing across 100 levels", () => {
    const table = buildLevelTable();
    expect(table).toHaveLength(100);
    for (let i = 1; i < table.length; i += 1) {
      expect(table[i]!.xpRequired).toBeGreaterThan(table[i - 1]!.xpRequired);
    }
  });

  it("maps XP back to the right level", () => {
    expect(levelForXP(249)).toBe(1);
    expect(levelForXP(250)).toBe(2);
    expect(levelForXP(1099)).toBe(3);
    expect(levelForXP(10 ** 9)).toBe(DEFAULT_LEVEL_CURVE.maxLevel);
  });
});

describe("progression rules", () => {
  it("computes progress inside a level", () => {
    const snap = snapshotForXP(425);
    expect(snap.level).toBe(2);
    expect(snap.xpIntoLevel).toBe(175);
    expect(snap.xpRemaining).toBe(175);
    expect(snap.progressPercentage).toBe(50);
  });

  it("caps progress at max level", () => {
    const snap = snapshotForXP(xpForLevel(100) + 5000);
    expect(snap.isMaxLevel).toBe(true);
    expect(snap.xpRemaining).toBe(0);
    expect(snap.progressPercentage).toBe(100);
  });

  it("classifies level transitions", () => {
    expect(eventTypeForTransition(2, 2)).toBeNull();
    expect(eventTypeForTransition(2, 3)).toBe("level_up");
    expect(eventTypeForTransition(2, 5)).toBe("multiple_level_up");
    expect(eventTypeForTransition(98, 100)).toBe("max_level_reached");
  });

  it("tracks highest level and builds a result object", () => {
    const previous = emptyProgression("u1");
    const updated = nextProgression(previous, 700, 700);
    expect(updated.currentLevel).toBe(3);
    expect(updated.highestLevel).toBe(3);
    const result = buildResult(previous.currentLevel, updated, 700);
    expect(result.leveledUp).toBe(true);
    expect(result.levelsGained).toBe(2);
    expect(result.unlockedRewards).toEqual([]);
  });
});
