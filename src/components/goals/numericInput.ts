// Locale-neutral numeric parsing/validation for Goals inputs (Sprint 7.5A).
// PURE: no React, no domain rules. Shared by the creation wizard and the
// manual-progress editor so parsing never diverges between the two flows.

/**
 * Parses a user-typed number accepting both "," and "." as decimal separator.
 * Returns `null` for empty, malformed, NaN and infinite input — never NaN.
 */
export function parseDecimalInput(raw: string | number): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const text = raw.trim().replace(/\s/g, "");
  if (text === "") return null;
  const normalized = text.replace(",", ".");
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export type NumericIssue = "required" | "invalid" | "integer" | "min" | "max" | "step";

export const NUMERIC_ISSUE_KEY: Record<NumericIssue, string> = {
  required: "gl.err.num.required",
  invalid: "gl.err.num.invalid",
  integer: "gl.err.num.integer",
  min: "gl.err.num.min",
  max: "gl.err.num.max",
  step: "gl.err.num.step",
};

export interface NumericBounds {
  min: number;
  max: number;
  allowDecimal: boolean;
  /** Optional increment: values must sit on `min + k * step`. */
  step?: number;
}

export type NumericValidation =
  | { ok: true; value: number }
  | { ok: false; issue: NumericIssue; messageKey: string };

function fail(issue: NumericIssue): NumericValidation {
  return { ok: false, issue, messageKey: NUMERIC_ISSUE_KEY[issue] };
}

/**
 * Step alignment with float-safe tolerance: decimal steps such as 0.1 cannot
 * be checked with a naive modulo (0.3 % 0.1 !== 0 in IEEE-754).
 */
export function isStepAligned(value: number, min: number, step: number): boolean {
  if (!Number.isFinite(step) || step <= 0) return true;
  const steps = (value - min) / step;
  const nearest = Math.round(steps);
  const tolerance = 1e-6 * Math.max(1, Math.abs(steps));
  return Math.abs(steps - nearest) <= tolerance;
}

/** Validates a raw target/progress value against presentation bounds. */
export function validateNumericInput(
  raw: string | number,
  bounds: NumericBounds,
): NumericValidation {
  if (typeof raw === "string" && raw.trim() === "") return fail("required");
  const value = parseDecimalInput(raw);
  if (value === null) return fail(typeof raw === "string" ? "invalid" : "required");
  if (!bounds.allowDecimal && !Number.isInteger(value)) return fail("integer");
  if (value < bounds.min) return fail("min");
  if (value > bounds.max) return fail("max");
  if (bounds.step !== undefined && !isStepAligned(value, bounds.min, bounds.step)) {
    return fail("step");
  }
  return { ok: true, value };
}


/** Renders a number back into an editable string without trailing noise. */
export function formatNumericInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 1000) / 1000);
}
