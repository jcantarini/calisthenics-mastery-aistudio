import { describe, expect, it } from "vitest";
import {
  isRadioNavKey,
  isRadioSelectKey,
  nextRadioIndex,
  radioFocusIndex,
  radioTabIndex,
} from "./radioNavigation";

describe("nextRadioIndex", () => {
  it("moves forward with ArrowRight and ArrowDown", () => {
    expect(nextRadioIndex("ArrowRight", 0, 3)).toBe(1);
    expect(nextRadioIndex("ArrowDown", 1, 3)).toBe(2);
  });

  it("moves backward with ArrowLeft and ArrowUp", () => {
    expect(nextRadioIndex("ArrowLeft", 1, 3)).toBe(0);
    expect(nextRadioIndex("ArrowUp", 0, 3)).toBe(2);
  });

  it("wraps at both ends", () => {
    expect(nextRadioIndex("ArrowRight", 2, 3)).toBe(0);
    expect(nextRadioIndex("ArrowLeft", 0, 3)).toBe(2);
  });

  it("jumps with Home and End", () => {
    expect(nextRadioIndex("Home", 2, 3)).toBe(0);
    expect(nextRadioIndex("End", 0, 3)).toBe(2);
  });

  it("ignores unhandled keys and empty groups", () => {
    expect(nextRadioIndex("Tab", 0, 3)).toBeNull();
    expect(nextRadioIndex("ArrowRight", 0, 0)).toBeNull();
  });

  it("recovers from an out-of-range current index", () => {
    expect(nextRadioIndex("ArrowRight", 99, 3)).toBe(1);
  });
});

describe("radio helpers", () => {
  it("recognises navigation keys", () => {
    expect(isRadioNavKey("Home")).toBe(true);
    expect(isRadioNavKey("Escape")).toBe(false);
  });

  it("recognises selection keys", () => {
    expect(isRadioSelectKey("Enter")).toBe(true);
    expect(isRadioSelectKey(" ")).toBe(true);
    expect(isRadioSelectKey("a")).toBe(false);
  });

  it("keeps exactly one tabbable option", () => {
    expect(radioTabIndex(1, 1)).toBe(0);
    expect(radioTabIndex(0, 1)).toBe(-1);
  });

  it("anchors focus on the first option when nothing is selected", () => {
    expect(radioFocusIndex(-1, 4)).toBe(0);
    expect(radioFocusIndex(2, 4)).toBe(2);
    expect(radioFocusIndex(9, 4)).toBe(0);
  });
});
