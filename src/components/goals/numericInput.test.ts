import { describe, expect, it } from "vitest";
import {
  formatNumericInput,
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
