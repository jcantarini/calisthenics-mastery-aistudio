import { describe, expect, it, vi } from "vitest";
import { createSingleFlightGuard } from "./goalSubmissionGuard";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createSingleFlightGuard", () => {
  it("executes the action only once when a second attempt starts before settling", async () => {
    const guard = createSingleFlightGuard();
    const d = deferred<string>();
    const action = vi.fn(() => d.promise);

    const first = guard.run(action);
    const second = guard.run(action);

    expect(action).toHaveBeenCalledTimes(1);
    await expect(second).resolves.toBeUndefined();

    d.resolve("ok");
    await expect(first).resolves.toBe("ok");
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("stays locked for the full duration of the first promise", async () => {
    const guard = createSingleFlightGuard();
    const d = deferred<void>();

    const first = guard.run(() => d.promise);
    expect(guard.isRunning()).toBe(true);

    await Promise.resolve();
    expect(guard.isRunning()).toBe(true);

    d.resolve();
    await first;
    expect(guard.isRunning()).toBe(false);
  });

  it("releases the lock after success", async () => {
    const guard = createSingleFlightGuard();
    await expect(guard.run(async () => true)).resolves.toBe(true);
    expect(guard.isRunning()).toBe(false);
  });

  it("releases the lock after an exception", async () => {
    const guard = createSingleFlightGuard();
    await expect(
      guard.run(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(guard.isRunning()).toBe(false);
  });

  it("allows a legitimate retry after a failed submission", async () => {
    const guard = createSingleFlightGuard();
    const action = vi
      .fn(async (): Promise<boolean> => false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(guard.run(action)).resolves.toBe(false);
    await expect(guard.run(action)).resolves.toBe(true);
    expect(action).toHaveBeenCalledTimes(2);
    expect(guard.isRunning()).toBe(false);
  });
});
