import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCodes, withRetry, withTimeout } from "../src/utils/error-handler.js";
import { RateLimiter } from "../src/utils/rate-limiter.js";

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Removes retry jitter so delay assertions are deterministic.
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns immediately when the operation succeeds", async () => {
    const operation = vi.fn().mockResolvedValue("success");

    const result = await withRetry(operation, 3, 100);

    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries a failed operation and returns the eventual result", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValue("success");

    const resultPromise = withRetry(operation, 3, 100);

    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toBe("success");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("throws ReviewError after exhausting all attempts", async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(new Error("persistent failure"));

    const resultPromise = withRetry(operation, 3, 100);

    // Attach the rejection handler before advancing timers.
    const assertion = expect(resultPromise).rejects.toMatchObject({
      name: "ReviewError",
      code: ErrorCodes.RETRY_EXHAUSTED,
      message: "Operation failed after 3 attempts",
      metadata: {
        cause: "persistent failure",
      },
    });

    await vi.runAllTimersAsync();
    await assertion;

    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("uses exponential backoff between retries", async () => {
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("first failure"))
      .mockRejectedValueOnce(new Error("second failure"))
      .mockResolvedValue("success");

    const resultPromise = withRetry(operation, 3, 100);

    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toBe("success");
    expect(operation).toHaveBeenCalledTimes(3);

    const delays = timeoutSpy.mock.calls.map(
      (call) => call[1]
    );

    expect(delays).toContain(100);
    expect(delays).toContain(200);
  });
});

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns a result when the operation completes in time", async () => {
    const operation = vi
      .fn()
      .mockResolvedValue("completed");

    await expect(
      withTimeout(operation, 1_000)
    ).resolves.toBe("completed");

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("throws ReviewError when the timeout is reached", async () => {
    const operation = vi.fn(
      () =>
        new Promise<string>(() => {
          // Intentionally unresolved to force the timeout.
        })
    );

    const resultPromise = withTimeout(
      operation,
      100,
      "Agent execution timed out"
    );

    // Attach the rejection handler before triggering the timer.
    const assertion = expect(resultPromise).rejects.toMatchObject({
      name: "ReviewError",
      code: ErrorCodes.AGENT_TIMEOUT,
      message: "Agent execution timed out",
      metadata: {
        timeoutMs: 100,
      },
    });

    await vi.advanceTimersByTimeAsync(100);
    await assertion;

    expect(operation).toHaveBeenCalledTimes(1);
  });
});

describe("RateLimiter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("canProceed returns true when capacity is available", () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 2,
      maxTokensPerMinute: 2_000,
      maxConcurrent: 2,
    });

    expect(limiter.canProceed(500)).toBe(true);
  });

  it("canProceed returns false when estimated tokens exceed capacity", () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 2,
      maxTokensPerMinute: 500,
      maxConcurrent: 2,
    });

    expect(limiter.canProceed(501)).toBe(false);
  });

  it("acquire records request and token usage", async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 2,
      maxTokensPerMinute: 2_000,
      maxConcurrent: 2,
    });

    await limiter.acquire(750);

    expect(limiter.getStatus()).toEqual({
      activeRequests: 1,
      requestsInWindow: 1,
      tokensInWindow: 750,
      availableRequests: 1,
      availableTokens: 1_250,
    });

    limiter.release();
  });

  it("acquire consumes the available request capacity", async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 1,
      maxTokensPerMinute: 2_000,
      maxConcurrent: 2,
    });

    await limiter.acquire(500);

    expect(limiter.canProceed(500)).toBe(false);

    limiter.release();
  });

  it("release makes a concurrent request slot available", async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 10,
      maxTokensPerMinute: 10_000,
      maxConcurrent: 1,
    });

    await limiter.acquire(500);

    expect(limiter.canProceed(500)).toBe(false);

    limiter.release();

    expect(limiter.canProceed(500)).toBe(true);
  });

  it("removes requests after the sliding window expires", async () => {
    const nowSpy = vi.spyOn(Date, "now");

    nowSpy.mockReturnValue(1_000_000);

    const limiter = new RateLimiter({
      maxRequestsPerMinute: 1,
      maxTokensPerMinute: 1_000,
      maxConcurrent: 2,
    });

    await limiter.acquire(500);
    limiter.release();

    expect(limiter.canProceed(500)).toBe(false);
    nowSpy.mockReturnValue(1_060_001);

    expect(limiter.canProceed(500)).toBe(true);
  });
});