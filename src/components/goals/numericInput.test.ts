import { describe, expect, it } from "vitest";
import {
  formatNumericInput,
  isStepAligned,
  parseDecimalInput,
  validateNumericInput,
} from "./numericInput";

const bounds = { min: 1, max: 100, allowDecimal: false };

describe("parseDecimalInput", () => {
  it("accepts period and comma decimal separators", () => {
    expect(parseDecimalInput("12.5")).toBe(12.5);
    expect(parseDecimalInput("12,5")).toBe(12.5);
  });

  it("trims surrounding and inner whitespace", () => {
    expect(parseDecimalInput("  42 ")).toBe(42);
  });

  it("returns null for empty and malformed input", () => {
    expect(parseDecimalInput("")).toBeNull();
    expect(parseDecimalInput("abc")).toBeNull();
    expect(parseDecimalInput("1.2.3")).toBeNull();
    expect(parseDecimalInput("1,2,3")).toBeNull();
  });

  it("never returns NaN or Infinity", () => {
    expect(parseDecimalInput(Number.NaN)).toBeNull();
    expect(parseDecimalInput(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("validateNumericInput", () => {
  it("flags empty input as required", () => {
    expect(validateNumericInput("", bounds)).toMatchObject({ ok: false, issue: "required" });
  });

  it("flags malformed input as invalid", () => {
    expect(validateNumericInput("ten", bounds)).toMatchObject({ ok: false, issue: "invalid" });
  });

  it("rejects decimals when they are not allowed", () => {
    expect(validateNumericInput("3,5", bounds)).toMatchObject({ ok: false, issue: "integer" });
  });

  it("accepts decimals when allowed", () => {
    expect(validateNumericInput("3,5", { ...bounds, allowDecimal: true })).toEqual({
      ok: true,
      value: 3.5,
    });
  });

  it("enforces min and max bounds", () => {
    expect(validateNumericInput("0", bounds)).toMatchObject({ ok: false, issue: "min" });
    expect(validateNumericInput("101", bounds)).toMatchObject({ ok: false, issue: "max" });
  });

  it("exposes a localizable message key for every failure", () => {
    const result = validateNumericInput("0", bounds);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.messageKey).toBe("gl.err.num.min");
  });
});

describe("formatNumericInput", () => {
  it("renders numbers without trailing noise", () => {
    expect(formatNumericInput(12)).toBe("12");
    expect(formatNumericInput(12.5)).toBe("12.5");
  });

  it("renders an empty string for non-finite values", () => {
    expect(formatNumericInput(Number.NaN)).toBe("");
  });
});

describe("step alignment", () => {
  it("enforces an integer step from the minimum", () => {
    const b = { min: 10, max: 100, allowDecimal: false, step: 10 };
    expect(validateNumericInput("10", b)).toEqual({ ok: true, value: 10 });
    expect(validateNumericInput("20", b)).toEqual({ ok: true, value: 20 });
    expect(validateNumericInput("30", b)).toEqual({ ok: true, value: 30 });
    expect(validateNumericInput("15", b)).toMatchObject({
      ok: false,
      issue: "step",
      messageKey: "gl.err.num.step",
    });
  });

  it("handles decimal steps without floating point noise", () => {
    const b = { min: 0.1, max: 5, allowDecimal: true, step: 0.1 };
    for (const raw of ["0.2", "0.3", "0.7", "1.1", "2.9"]) {
      expect(validateNumericInput(raw, b), raw).toEqual({ ok: true, value: Number(raw) });
    }
    expect(validateNumericInput("0.25", b)).toMatchObject({ ok: false, issue: "step" });
  });

  it("keeps comma and period accepted with step validation on", () => {
    const b = { min: 0, max: 10, allowDecimal: true, step: 0.5 };
    expect(validateNumericInput("2,5", b)).toEqual({ ok: true, value: 2.5 });
    expect(validateNumericInput("2.5", b)).toEqual({ ok: true, value: 2.5 });
  });

  it("skips the check when no step is declared", () => {
    expect(validateNumericInput("15", { min: 10, max: 100, allowDecimal: false })).toEqual({
      ok: true,
      value: 15,
    });
  });

  it("exposes float-safe alignment directly", () => {
    expect(isStepAligned(0.3, 0.1, 0.1)).toBe(true);
    expect(isStepAligned(0.35, 0.1, 0.1)).toBe(false);
    expect(isStepAligned(1000000, 0, 1)).toBe(true);
  });

  it("rejects values that are only nearly aligned", () => {
    const b = { min: 1, max: 100000, allowDecimal: true, step: 1 };
    expect(validateNumericInput("999.0005", b)).toMatchObject({ ok: false, issue: "step" });
    expect(validateNumericInput("10.000005", b)).toMatchObject({ ok: false, issue: "step" });
    expect(isStepAligned(999.0005, 1, 1)).toBe(false);
    expect(isStepAligned(10.000005, 1, 1)).toBe(false);
  });

  it("keeps large aligned values valid", () => {
    const b = { min: 10, max: 1000000, allowDecimal: false, step: 10 };
    expect(validateNumericInput("999990", b)).toEqual({ ok: true, value: 999990 });
    expect(isStepAligned(1000000, 10, 10)).toBe(true);
  });

});
