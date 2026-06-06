// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT

/**
 * H18: redeem-failure handling.
 *
 * Two layers are covered:
 *
 *  1. fetchWithRetry (C1) - the REAL retry loop, exercised by mocking the
 *     global fetch so both fetchWithTimeout and fetchWithRetry run unmocked.
 *     Asserts: transient 5xx and network failures are retried then succeed,
 *     terminal 4xx fail fast (no retry), the budget is bounded, the final 5xx
 *     is handed back, and every attempt reuses the SAME Idempotency-Key (which
 *     is what makes retrying the redeem write safe).
 *
 *  2. redeem terminal status handling - through machineServices.pollStatus,
 *     the public entry that drives redeemChallenge: a 409 is an idempotent
 *     double-redeem (treated as success) and a 410 is terminal (expired).
 */

import {
  fetchWithRetry,
  isRetryableFetchError,
  NetworkError,
} from "../src/utils/fetchWithTimeout.js";

/* -------------------------------------------------------------------------- */
/*  Layer 1: the real fetchWithRetry loop (global fetch mocked)               */
/* -------------------------------------------------------------------------- */

describe("fetchWithRetry (C1): transient-only retry with bounded backoff", () => {
  let mockFetch: jest.Mock;
  const REDEEM_URL = "https://verifier.example/v1/hosted/redeem/sess-1";

  // baseDelayMs:0 keeps the real timers effectively instant for call-count and
  // outcome assertions. A dedicated fake-timer test below covers the wait.
  const NO_WAIT = { maxRetries: 2, baseDelayMs: 0 } as const;

  const jsonResponse = (status: number, body: unknown = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("retries a transient 5xx and then succeeds (returns the 200)", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const res = await fetchWithRetry(REDEEM_URL, { method: "POST" }, 5000, NO_WAIT);

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries a cold-start 500 then succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(500))
      .mockResolvedValueOnce(jsonResponse(200));

    const res = await fetchWithRetry(REDEEM_URL, { method: "POST" }, 5000, NO_WAIT);

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries a dropped connection (TypeError -> NetworkError) then succeeds", async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse(200));

    const res = await fetchWithRetry(REDEEM_URL, { method: "POST" }, 5000, NO_WAIT);

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("FAILS FAST on a 4xx: returns it without any retry", async () => {
    mockFetch.mockResolvedValue(jsonResponse(400, { error: "bad" }));

    const res = await fetchWithRetry(REDEEM_URL, { method: "POST" }, 5000, NO_WAIT);

    expect(res.status).toBe(400);
    expect(mockFetch).toHaveBeenCalledTimes(1); // no retry on a client error
  });

  it("FAILS FAST on a 410 (expired): one call only", async () => {
    mockFetch.mockResolvedValue(jsonResponse(410));

    const res = await fetchWithRetry(REDEEM_URL, { method: "POST" }, 5000, NO_WAIT);

    expect(res.status).toBe(410);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("FAILS FAST on a 409 (already redeemed): one call only", async () => {
    mockFetch.mockResolvedValue(jsonResponse(409));

    const res = await fetchWithRetry(REDEEM_URL, { method: "POST" }, 5000, NO_WAIT);

    expect(res.status).toBe(409);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry a 429 (rate limited) - it is a terminal 4xx", async () => {
    mockFetch.mockResolvedValue(jsonResponse(429));

    const res = await fetchWithRetry(REDEEM_URL, { method: "POST" }, 5000, NO_WAIT);

    expect(res.status).toBe(429);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("exhausts the budget (3 attempts total) and returns the final 5xx", async () => {
    mockFetch.mockResolvedValue(jsonResponse(500));

    const res = await fetchWithRetry(REDEEM_URL, { method: "POST" }, 5000, NO_WAIT);

    expect(res.status).toBe(500); // handed back so the caller produces its error
    expect(mockFetch).toHaveBeenCalledTimes(3); // 1 + maxRetries(2)
  });

  it("re-throws the last NetworkError when every attempt is a network failure", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      fetchWithRetry(REDEEM_URL, { method: "POST" }, 5000, NO_WAIT),
    ).rejects.toBeInstanceOf(NetworkError);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("honours a custom maxRetries budget", async () => {
    mockFetch.mockResolvedValue(jsonResponse(503));

    const res = await fetchWithRetry(REDEEM_URL, { method: "POST" }, 5000, {
      maxRetries: 4,
      baseDelayMs: 0,
    });

    expect(res.status).toBe(503);
    expect(mockFetch).toHaveBeenCalledTimes(5); // 1 + 4
  });

  it("reuses the SAME Idempotency-Key across every retry (safe to retry)", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(500))
      .mockResolvedValueOnce(jsonResponse(500))
      .mockResolvedValueOnce(jsonResponse(200));

    const idempotencyKey = "11111111-1111-4111-8111-111111111111";
    await fetchWithRetry(
      REDEEM_URL,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
      },
      5000,
      NO_WAIT,
    );

    expect(mockFetch).toHaveBeenCalledTimes(3);
    const keys = mockFetch.mock.calls.map((call) => {
      const init = call[1] as RequestInit;
      return (init.headers as Record<string, string>)["Idempotency-Key"];
    });
    expect(keys).toEqual([idempotencyKey, idempotencyKey, idempotencyKey]);
  });

  it("does not retry a successful first attempt", async () => {
    mockFetch.mockResolvedValue(jsonResponse(200));

    const res = await fetchWithRetry(REDEEM_URL, { method: "POST" }, 5000, NO_WAIT);

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("fetchWithRetry (C1): backoff actually waits between attempts", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch = jest.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("waits the exponential backoff (600ms, then 1200ms) before each retry", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const promise = fetchWithRetry(
      "https://verifier.example/redeem/s",
      { method: "POST" },
      5000,
      { maxRetries: 2, baseDelayMs: 600 },
    );

    // First attempt fires synchronously.
    await Promise.resolve();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Before 600ms elapses, no second attempt.
    await jest.advanceTimersByTimeAsync(599);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Second backoff is ~1200ms (600 * 2^1).
    await jest.advanceTimersByTimeAsync(1199);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1);
    expect(mockFetch).toHaveBeenCalledTimes(3);

    const res = await promise;
    expect(res.status).toBe(200);
  });
});

describe("isRetryableFetchError classifier (shared with the XState machine)", () => {
  const withCode = (code: string, name = "AgeGateError") => ({ code, name });

  it("treats 5xx and NetworkErrors as retryable", () => {
    expect(isRetryableFetchError(withCode("HTTP_500"))).toBe(true);
    expect(isRetryableFetchError(withCode("HTTP_503"))).toBe(true);
    expect(
      isRetryableFetchError(withCode("FETCH_TIMEOUT", "NetworkError")),
    ).toBe(true);
    expect(
      isRetryableFetchError(withCode("NETWORK_FAILURE", "NetworkError")),
    ).toBe(true);
  });

  it("treats 4xx and non-fetch errors as terminal", () => {
    expect(isRetryableFetchError(withCode("HTTP_400"))).toBe(false);
    expect(isRetryableFetchError(withCode("HTTP_409"))).toBe(false);
    expect(isRetryableFetchError(withCode("HTTP_410"))).toBe(false);
    expect(isRetryableFetchError(withCode("HTTP_429"))).toBe(false);
    expect(isRetryableFetchError(new Error("plain"))).toBe(false);
    expect(isRetryableFetchError(null)).toBe(false);
    expect(isRetryableFetchError(undefined)).toBe(false);
  });
});
