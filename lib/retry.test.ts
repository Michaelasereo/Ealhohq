import { describe, expect, it, vi } from "vitest";

import { withRetry } from "./retry";

describe("withRetry", () => {
  it("returns on first success", async () => {
    const fn = vi.fn().mockResolvedValue(42);
    await expect(withRetry(fn, { attempts: 3 })).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("ok");
    await expect(withRetry(fn, { attempts: 3, delayMs: 1 })).resolves.toBe(
      "ok",
    );
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws last error after attempts exhausted", async () => {
    const err = new Error("always");
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withRetry(fn, { attempts: 2, delayMs: 1 })).rejects.toBe(
      err,
    );
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
