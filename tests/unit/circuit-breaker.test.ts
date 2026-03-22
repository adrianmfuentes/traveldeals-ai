import { describe, it, expect, vi, beforeEach } from "vitest";
import { CircuitBreaker } from "../../src/lib/circuit-breaker";

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker("test", {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
    });
  });

  it("starts in CLOSED state", () => {
    expect(breaker.getState()).toBe("CLOSED");
    expect(breaker.isAvailable()).toBe(true);
  });

  it("executes a successful function and stays CLOSED", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await breaker.execute(fn);
    expect(result).toBe("ok");
    expect(breaker.getState()).toBe("CLOSED");
  });

  it("opens after reaching failure threshold", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow("fail");
    }

    expect(breaker.getState()).toBe("OPEN");
    expect(breaker.isAvailable()).toBe(false);
  });

  it("throws circuit breaker error when OPEN and timeout not elapsed", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow("fail");
    }

    // Now breaker is OPEN
    const safeFn = vi.fn().mockResolvedValue("success");
    await expect(breaker.execute(safeFn)).rejects.toThrow("Circuit breaker OPEN for test");
    expect(safeFn).not.toHaveBeenCalled();
  });

  it("transitions to HALF_OPEN after timeout elapses", async () => {
    const failFn = vi.fn().mockRejectedValue(new Error("fail"));

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failFn)).rejects.toThrow();
    }

    expect(breaker.getState()).toBe("OPEN");

    // Simulate timeout elapsed by checking isAvailable with mocked time
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 2000);

    expect(breaker.isAvailable()).toBe(true);

    vi.restoreAllMocks();
  });

  it("transitions from HALF_OPEN to CLOSED after enough successes", async () => {
    const failFn = vi.fn().mockRejectedValue(new Error("fail"));
    const successFn = vi.fn().mockResolvedValue("ok");

    // Trip the breaker
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failFn)).rejects.toThrow();
    }

    // Mock time past timeout
    const futureTime = Date.now() + 2000;
    vi.spyOn(Date, "now").mockReturnValue(futureTime);

    // First success in HALF_OPEN
    await breaker.execute(successFn);
    expect(breaker.getState()).toBe("HALF_OPEN");

    // Second success should close it
    await breaker.execute(successFn);
    expect(breaker.getState()).toBe("CLOSED");

    vi.restoreAllMocks();
  });

  it("transitions from HALF_OPEN back to OPEN on failure", async () => {
    const failFn = vi.fn().mockRejectedValue(new Error("fail"));

    // Trip the breaker
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failFn)).rejects.toThrow();
    }

    // Mock time past timeout
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 2000);

    // Fail during HALF_OPEN
    await expect(breaker.execute(failFn)).rejects.toThrow("fail");
    expect(breaker.getState()).toBe("OPEN");

    vi.restoreAllMocks();
  });

  it("resets failure count after a success in CLOSED state", async () => {
    const failFn = vi.fn().mockRejectedValue(new Error("fail"));
    const successFn = vi.fn().mockResolvedValue("ok");

    // 2 failures (threshold is 3)
    await expect(breaker.execute(failFn)).rejects.toThrow();
    await expect(breaker.execute(failFn)).rejects.toThrow();
    expect(breaker.getState()).toBe("CLOSED");

    // 1 success - resets failures
    await breaker.execute(successFn);
    expect(breaker.getState()).toBe("CLOSED");

    // 2 more failures should not trip (failures were reset)
    await expect(breaker.execute(failFn)).rejects.toThrow();
    await expect(breaker.execute(failFn)).rejects.toThrow();
    expect(breaker.getState()).toBe("CLOSED");
  });
});
