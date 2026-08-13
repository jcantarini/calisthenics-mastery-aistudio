import { describe, expect, it, vi } from "vitest";
import { runMutationFlow } from "./mutationFlow";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("runMutationFlow", () => {
  it("keeps pending true until an async onChanged settles", async () => {
    const gate = deferred<void>();
    const pending: boolean[] = [];
    const flow = runMutationFlow(
      () => Promise.resolve("ok"),
      () => gate.promise,
      (value) => pending.push(value),
      () => {},
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(pending).toEqual([true]);

    gate.resolve();
    await expect(flow).resolves.toBe("ok");
    expect(pending).toEqual([true, false]);
  });

  it("runs onChanged exactly once per mutation", async () => {
    const onChanged = vi.fn(async () => {});
    await runMutationFlow(
      () => Promise.resolve(1),
      onChanged,
      () => {},
      () => {},
    );
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("does not retry the mutation when only the reload fails", async () => {
    const action = vi.fn(() => Promise.resolve("done"));
    const errors: (Error | null)[] = [];
    const result = await runMutationFlow(
      action,
      () => Promise.reject(new Error("reload failed")),
      () => {},
      (error) => errors.push(error),
    );
    expect(result).toBe("done");
    expect(action).toHaveBeenCalledTimes(1);
    expect(errors).toEqual([null]);
  });

  it("reports the mutation error and skips onChanged when the action fails", async () => {
    const onChanged = vi.fn();
    const errors: (Error | null)[] = [];
    const result = await runMutationFlow(
      () => Promise.reject(new Error("nope")),
      onChanged,
      () => {},
      (error) => errors.push(error),
    );
    expect(result).toBeNull();
    expect(onChanged).not.toHaveBeenCalled();
    expect(errors[1]).toBeInstanceOf(Error);
  });
});
