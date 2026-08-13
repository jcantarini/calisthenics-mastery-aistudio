import { describe, expect, it } from "vitest";
import {
  applyFailure,
  applySuccess,
  hasBlockingError,
  initialAsyncState,
  isStaleResponse,
  startLoad,
} from "./asyncResource";

describe("initialAsyncState", () => {
  it("starts as a blocking load with no data yet", () => {
    expect(initialAsyncState<number[]>([])).toEqual({
      data: [],
      loaded: false,
      loading: true,
      refreshing: false,
      error: null,
    });
  });
});

describe("isStaleResponse", () => {
  it("drops superseded responses only", () => {
    expect(isStaleResponse(1, 2)).toBe(true);
    expect(isStaleResponse(2, 2)).toBe(false);
  });
});

describe("startLoad", () => {
  it("blocks on the first load", () => {
    const next = startLoad(initialAsyncState<number[]>([]));
    expect(next.loading).toBe(true);
    expect(next.refreshing).toBe(false);
  });

  it("refreshes in the background once data exists", () => {
    const loaded = applySuccess(initialAsyncState<number[]>([]), [1]);
    const next = startLoad(loaded);
    expect(next.loading).toBe(false);
    expect(next.refreshing).toBe(true);
    expect(next.data).toEqual([1]);
  });
});

describe("applySuccess", () => {
  it("clears errors and marks the resource loaded", () => {
    const failed = applyFailure(initialAsyncState<number[]>([]), new Error("x"), []);
    const next = applySuccess(failed, [1, 2]);
    expect(next).toEqual({
      data: [1, 2],
      loaded: true,
      loading: false,
      refreshing: false,
      error: null,
    });
  });
});

describe("applyFailure", () => {
  it("preserves usable data when a refresh fails", () => {
    const loaded = applySuccess(initialAsyncState<number[]>([]), [1, 2]);
    const next = applyFailure(loaded, new Error("offline"), []);
    expect(next.data).toEqual([1, 2]);
    expect(next.error?.message).toBe("offline");
  });

  it("falls back to the initial value when the first load fails", () => {
    const next = applyFailure(initialAsyncState<number[]>([]), new Error("boom"), []);
    expect(next.data).toEqual([]);
    expect(next.loaded).toBe(false);
  });
});

describe("hasBlockingError", () => {
  it("blocks only when no usable data exists", () => {
    const first = applyFailure(initialAsyncState<number[]>([]), new Error("boom"), []);
    expect(hasBlockingError(first)).toBe(true);

    const loaded = applySuccess(initialAsyncState<number[]>([]), [1]);
    expect(hasBlockingError(applyFailure(loaded, new Error("boom"), []))).toBe(false);
  });
});
