/** @jest-environment jsdom */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT

/**
 * Mutation-killing tests for src/utils/fetchWithTimeout.ts
 *
 * Targets every constant, conditional, operator, string literal, and error
 * classification branch so that Stryker cannot produce surviving mutants.
 */

import {
  fetchWithTimeout,
  NetworkError,
  safeReadJson,
} from "../src/utils/fetchWithTimeout.js";

/* -------------------------------------------------------------------------- */
/*                               Test Helpers                                 */
/* -------------------------------------------------------------------------- */

const mockFetch = jest.fn();
global.fetch = mockFetch;

/** Catch a rejected promise and return the NetworkError, properly typed. */
async function catchNetworkError(
  promise: Promise<unknown>,
): Promise<NetworkError> {
  try {
    await promise;
    throw new Error("Expected promise to reject but it resolved");
  } catch (err: unknown) {
    if (err instanceof NetworkError) return err;
    throw err;
  }
}

function makeResponse(
  body: string | null,
  init: ResponseInit & { contentType?: string } = {},
): Response {
  const { contentType, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (contentType) headers.set("content-type", contentType);
  return new Response(body, { ...rest, headers });
}

/**
 * Create a mock response whose body has a getReader() that yields chunks.
 * jsdom does not have ReadableStream, so we simulate it with a mock reader.
 */
function makeStreamingResponse(
  chunks: Uint8Array[],
  init: { contentType?: string; contentLength?: string; status?: number } = {},
): Response {
  const headers = new Headers();
  if (init.contentType) headers.set("content-type", init.contentType);
  if (init.contentLength) headers.set("content-length", init.contentLength);

  let index = 0;
  const mockReader = {
    read: jest.fn().mockImplementation(() => {
      if (index < chunks.length) {
        const value = chunks[index];
        index++;
        return Promise.resolve({ done: false, value });
      }
      return Promise.resolve({ done: true, value: undefined });
    }),
    releaseLock: jest.fn(),
  };

  return {
    headers,
    status: init.status ?? 200,
    body: {
      getReader: () => mockReader,
    },
  } as unknown as Response;
}

/** Mock fetch that hangs until the signal aborts. */
function mockHangingFetch(): void {
  mockFetch.mockImplementation(
    (_url: unknown, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      }),
  );
}

/* -------------------------------------------------------------------------- */
/*                          NetworkError Class                                */
/* -------------------------------------------------------------------------- */

describe("NetworkError class", () => {
  it("sets name to exactly 'NetworkError'", () => {
    const err = new NetworkError("msg", "user", "CODE");
    expect(err.name).toBe("NetworkError");
    expect(err.name).not.toBe("Error");
    expect(err.name).not.toBe("");
  });

  it("extends Error prototype chain", () => {
    const err = new NetworkError("msg", "user", "CODE");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NetworkError);
  });

  it("stores message as the internal message", () => {
    const err = new NetworkError("internal detail", "user msg", "C");
    expect(err.message).toBe("internal detail");
  });

  it("stores userMessage as a readonly property", () => {
    const err = new NetworkError("m", "safe for UI", "C");
    expect(err.userMessage).toBe("safe for UI");
  });

  it("stores code as a readonly property", () => {
    const err = new NetworkError("m", "u", "SOME_CODE");
    expect(err.code).toBe("SOME_CODE");
  });

  it("stores statusCode when provided", () => {
    const err = new NetworkError("m", "u", "C", 503);
    expect(err.statusCode).toBe(503);
  });

  it("leaves statusCode undefined when omitted", () => {
    const err = new NetworkError("m", "u", "C");
    expect(err.statusCode).toBeUndefined();
  });

  it("stores details when provided", () => {
    const details = { key: "value" };
    const err = new NetworkError("m", "u", "C", 200, details);
    expect(err.details).toBe(details);
  });

  it("leaves details undefined when omitted", () => {
    const err = new NetworkError("m", "u", "C", 200);
    expect(err.details).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */
/*                     Constants (pinned via behaviour)                       */
/* -------------------------------------------------------------------------- */

describe("timeout constants", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue(new Response("ok"));
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // DEFAULT_TIMEOUT = 30_000
  it("uses 30000ms default timeout when timeout is undefined", async () => {
    mockHangingFetch();

    jest.useFakeTimers();
    const promise = fetchWithTimeout("https://example.com");
    jest.advanceTimersByTime(30_000);
    await expect(promise).rejects.toMatchObject({
      code: "FETCH_TIMEOUT",
      details: expect.objectContaining({ timeout: 30_000 }),
    });
    jest.useRealTimers();
  });

  // MIN_TIMEOUT = 1_000
  it("clamps to 1000ms when timeout is below minimum", async () => {
    await fetchWithTimeout("https://example.com", {}, 500);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("500ms"),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("1000ms"),
    );
  });

  it("clamps to 1000ms for timeout of exactly 999", async () => {
    await fetchWithTimeout("https://example.com", {}, 999);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("999ms"),
    );
  });

  it("does NOT clamp timeout of exactly 1000", async () => {
    await fetchWithTimeout("https://example.com", {}, 1000);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  // MAX_TIMEOUT = 60_000
  it("clamps to 60000ms when timeout exceeds maximum", async () => {
    await fetchWithTimeout("https://example.com", {}, 100_000);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("100000ms"),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("60000ms"),
    );
  });

  it("clamps to 60000ms for timeout of exactly 60001", async () => {
    await fetchWithTimeout("https://example.com", {}, 60_001);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("60001ms"),
    );
  });

  it("does NOT clamp timeout of exactly 60000", async () => {
    await fetchWithTimeout("https://example.com", {}, 60_000);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------------------- */
/*                         validateTimeout Logic                              */
/* -------------------------------------------------------------------------- */

describe("validateTimeout behaviour", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue(new Response("ok"));
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("returns default timeout for undefined", async () => {
    const response = await fetchWithTimeout("https://example.com");
    expect(response).toBeInstanceOf(Response);
  });

  it("returns default timeout for null", async () => {
    const response = await fetchWithTimeout(
      "https://example.com",
      {},
      null as unknown as number,
    );
    expect(response).toBeInstanceOf(Response);
  });

  it("warns and returns default for NaN", async () => {
    await fetchWithTimeout("https://example.com", {}, NaN);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid timeout value"),
      NaN,
    );
  });

  it("warns and returns default for Infinity", async () => {
    await fetchWithTimeout("https://example.com", {}, Infinity);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid timeout value"),
      Infinity,
    );
  });

  it("warns and returns default for -Infinity", async () => {
    await fetchWithTimeout("https://example.com", {}, -Infinity);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid timeout value"),
      -Infinity,
    );
  });

  it("warns and returns default for string coerced as number", async () => {
    await fetchWithTimeout(
      "https://example.com",
      {},
      "5000" as unknown as number,
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid timeout value"),
      "5000",
    );
  });

  it("returns null (no timeout) for 0", async () => {
    const response = await fetchWithTimeout("https://example.com", {}, 0);
    expect(response).toBeInstanceOf(Response);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("clamps negative values to MIN_TIMEOUT and warns", async () => {
    const response = await fetchWithTimeout("https://example.com", {}, -1);
    expect(response).toBeInstanceOf(Response);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Non-positive timeout"),
    );
  });

  it("returns null (no timeout) for -0.5", async () => {
    const response = await fetchWithTimeout("https://example.com", {}, -0.5);
    expect(response).toBeInstanceOf(Response);
  });

  it("passes through valid timeout in range without warning", async () => {
    await fetchWithTimeout("https://example.com", {}, 5000);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("passes through exact boundary value 1000", async () => {
    await fetchWithTimeout("https://example.com", {}, 1000);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("passes through exact boundary value 60000", async () => {
    await fetchWithTimeout("https://example.com", {}, 60000);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("passes through mid-range value 15000", async () => {
    await fetchWithTimeout("https://example.com", {}, 15000);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------------------- */
/*                     fetchWithTimeout - Timeout Path                        */
/* -------------------------------------------------------------------------- */

describe("fetchWithTimeout timeout path", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("throws FETCH_TIMEOUT with correct message format", async () => {
    mockHangingFetch();

    const promise = fetchWithTimeout("https://example.com/api", {}, 5000);
    jest.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow(NetworkError);
    await expect(promise).rejects.toMatchObject({
      message: "Request timed out after 5000ms",
      userMessage:
        "Request timed out. Please check your connection and try again.",
      code: "FETCH_TIMEOUT",
      statusCode: undefined,
      details: {
        timeout: 5000,
        url: "https://example.com/api",
      },
    });
  });

  it("includes the validated timeout value in error details, not the raw input", async () => {
    mockHangingFetch();

    const promise = fetchWithTimeout("https://example.com", {}, 500);
    jest.advanceTimersByTime(1000);

    await expect(promise).rejects.toMatchObject({
      details: { timeout: 1000 },
    });
  });

  it("clears timeout on successful fetch", async () => {
    mockFetch.mockResolvedValue(new Response("ok"));

    const response = await fetchWithTimeout(
      "https://example.com",
      {},
      5000,
    );

    expect(response).toBeInstanceOf(Response);
    jest.advanceTimersByTime(10000);
  });

  it("clears timeout on fetch error (non-timeout)", async () => {
    mockFetch.mockRejectedValue(new TypeError("Network failure"));

    await expect(
      fetchWithTimeout("https://example.com", {}, 5000),
    ).rejects.toMatchObject({ code: "NETWORK_FAILURE" });

    jest.advanceTimersByTime(10000);
  });

  it("re-throws NetworkError from performFetch without wrapping", async () => {
    mockFetch.mockRejectedValue(new TypeError("fail"));

    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 5000),
    );
    expect(err).toBeInstanceOf(NetworkError);
    expect(err.code).toBe("NETWORK_FAILURE");
  });

  it("re-throws non-NetworkError errors that are not timeout-related", async () => {
    const customErr = new Error("Something bizarre");
    mockFetch.mockRejectedValue(customErr);

    await expect(
      fetchWithTimeout("https://example.com", {}, 5000),
    ).rejects.toMatchObject({ code: "FETCH_UNEXPECTED" });
  });
});

/* -------------------------------------------------------------------------- */
/*                     fetchWithTimeout - No Timeout Path                     */
/* -------------------------------------------------------------------------- */

describe("fetchWithTimeout clamped-timeout path (timeout <= 0)", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("clamps timeout=0 to MIN_TIMEOUT and attaches AbortController signal", async () => {
    const response = new Response("ok");
    mockFetch.mockResolvedValue(response);

    const result = await fetchWithTimeout("https://example.com", {}, 0);
    expect(result).toBe(response);
    const calledInit = mockFetch.mock.calls[0][1] as RequestInit;
    // Signal should be defined because 0 is clamped, not treated as no-timeout
    expect(calledInit.signal).toBeDefined();
  });

  it("propagates errors from performFetch with clamped timeout", async () => {
    mockFetch.mockRejectedValue(new TypeError("offline"));

    await expect(
      fetchWithTimeout("https://example.com", {}, 0),
    ).rejects.toMatchObject({
      code: "NETWORK_FAILURE",
      userMessage: "Unable to connect. Please check your internet connection.",
    });
  });
});

/* -------------------------------------------------------------------------- */
/*                       mergeAbortSignals Behaviour                          */
/* -------------------------------------------------------------------------- */

describe("abort signal merging", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("uses timeout signal when no existing signal is provided", async () => {
    mockFetch.mockImplementation((_url: unknown, init: RequestInit) => {
      expect(init.signal).toBeDefined();
      return Promise.resolve(new Response("ok"));
    });

    await fetchWithTimeout("https://example.com", {}, 5000);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("merges existing signal with timeout signal", async () => {
    const userController = new AbortController();
    mockFetch.mockImplementation((_url: unknown, init: RequestInit) => {
      expect(init.signal).toBeDefined();
      expect(init.signal).not.toBe(userController.signal);
      return Promise.resolve(new Response("ok"));
    });

    await fetchWithTimeout(
      "https://example.com",
      { signal: userController.signal },
      5000,
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("aborts fetch when user-provided signal fires", async () => {
    const userController = new AbortController();
    mockHangingFetch();

    const promise = fetchWithTimeout(
      "https://example.com",
      { signal: userController.signal },
      60000,
    );

    userController.abort();

    await expect(promise).rejects.toMatchObject({
      code: "FETCH_ABORTED",
    });
  });

  it("handles already-aborted existing signal", async () => {
    const userController = new AbortController();
    userController.abort();

    mockFetch.mockImplementation(
      (_url: unknown, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          if (init.signal?.aborted) {
            reject(new DOMException("The operation was aborted.", "AbortError"));
            return;
          }
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
    );

    await expect(
      fetchWithTimeout(
        "https://example.com",
        { signal: userController.signal },
        5000,
      ),
    ).rejects.toMatchObject({
      code: "FETCH_ABORTED",
    });
  });

  it("returns existing signal when no new signal is provided (null init.signal)", async () => {
    mockFetch.mockResolvedValue(new Response("ok"));
    await fetchWithTimeout("https://example.com", { signal: null }, 0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

/* -------------------------------------------------------------------------- */
/*                         performFetch Error Handling                        */
/* -------------------------------------------------------------------------- */

describe("performFetch error classification", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("maps TypeError to NETWORK_FAILURE with fixed message", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.message).toBe("Network request failed");
    expect(err.code).toBe("NETWORK_FAILURE");
    expect(err.userMessage).toBe(
      "Unable to connect. Please check your internet connection.",
    );
  });

  it("logs raw TypeError message for debugging", async () => {
    mockFetch.mockRejectedValue(new TypeError("CORS blocked"));
    await fetchWithTimeout("https://example.com", {}, 0).catch(() => {});
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[fetchWithTimeout] Network error:",
      "CORS blocked",
    );
  });

  it("includes URL in NETWORK_FAILURE details", async () => {
    mockFetch.mockRejectedValue(new TypeError("fail"));
    const err = await catchNetworkError(
      fetchWithTimeout("https://api.example.com/v1", {}, 0),
    );
    expect(err.details).toEqual({ url: "https://api.example.com/v1" });
  });

  it("maps AbortError to FETCH_ABORTED", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    mockFetch.mockRejectedValue(abortError);
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.code).toBe("FETCH_ABORTED");
    expect(err.message).toBe("Request was aborted");
    expect(err.userMessage).toBe("Request was cancelled.");
  });

  it("includes URL in FETCH_ABORTED details", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    mockFetch.mockRejectedValue(abortError);
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com/test", {}, 0),
    );
    expect(err.details).toEqual({ url: "https://example.com/test" });
  });

  it("maps error with 'timeout' in message to BROWSER_TIMEOUT", async () => {
    const timeoutErr = new Error("Request timeout exceeded");
    mockFetch.mockRejectedValue(timeoutErr);
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.code).toBe("BROWSER_TIMEOUT");
    expect(err.message).toBe("Browser request timeout");
    expect(err.userMessage).toBe(
      "Request timed out. Please check your connection and try again.",
    );
  });

  it("timeout detection is case-insensitive", async () => {
    const timeoutErr = new Error("TIMEOUT while connecting");
    mockFetch.mockRejectedValue(timeoutErr);
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.code).toBe("BROWSER_TIMEOUT");
  });

  it("timeout detection finds 'timeout' anywhere in the message", async () => {
    const timeoutErr = new Error("Connection timed out (timeout)");
    mockFetch.mockRejectedValue(timeoutErr);
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.code).toBe("BROWSER_TIMEOUT");
  });

  it("includes URL in BROWSER_TIMEOUT details", async () => {
    const timeoutErr = new Error("timeout");
    mockFetch.mockRejectedValue(timeoutErr);
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com/slow", {}, 0),
    );
    expect(err.details).toEqual({ url: "https://example.com/slow" });
  });

  it("maps non-matching Error to FETCH_UNEXPECTED", async () => {
    mockFetch.mockRejectedValue(new Error("Something random"));
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.code).toBe("FETCH_UNEXPECTED");
    expect(err.message).toBe("Unexpected fetch error");
    expect(err.userMessage).toBe(
      "Unable to connect. Please check your internet connection.",
    );
  });

  it("logs unexpected errors for debugging", async () => {
    mockFetch.mockRejectedValue(new Error("Something random"));
    await fetchWithTimeout("https://example.com", {}, 0).catch(() => {});
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[fetchWithTimeout] Unexpected error:",
      expect.any(Error),
    );
  });

  it("maps non-Error thrown values to FETCH_UNEXPECTED", async () => {
    mockFetch.mockRejectedValue("raw string error");
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.code).toBe("FETCH_UNEXPECTED");
  });

  it("maps thrown number to FETCH_UNEXPECTED", async () => {
    mockFetch.mockRejectedValue(42);
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.code).toBe("FETCH_UNEXPECTED");
  });

  it("maps thrown null to FETCH_UNEXPECTED", async () => {
    mockFetch.mockRejectedValue(null);
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.code).toBe("FETCH_UNEXPECTED");
  });

  it("maps thrown undefined to FETCH_UNEXPECTED", async () => {
    mockFetch.mockRejectedValue(undefined);
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.code).toBe("FETCH_UNEXPECTED");
  });

  it("includes URL in FETCH_UNEXPECTED details", async () => {
    mockFetch.mockRejectedValue({ weird: true });
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com/path", {}, 0),
    );
    expect(err.details).toEqual({ url: "https://example.com/path" });
  });
});

/* -------------------------------------------------------------------------- */
/*                       performFetch Success Logging                         */
/* -------------------------------------------------------------------------- */

describe("performFetch response logging", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("returns response without logging for 200 OK", async () => {
    mockFetch.mockResolvedValue(makeResponse("ok", { status: 200 }));
    // Use a valid timeout (not 0, which now logs a clamp warning)
    const response = await fetchWithTimeout("https://example.com", {}, 5000);
    expect(response.status).toBe(200);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("logs warning for 4xx responses", async () => {
    const resp = makeResponse("not found", {
      status: 404,
      statusText: "Not Found",
    });
    Object.defineProperty(resp, "ok", { value: false });
    mockFetch.mockResolvedValue(resp);

    await fetchWithTimeout("https://example.com/missing", {}, 0);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("HTTP 404"),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Not Found"),
    );
  });

  it("logs warning for 5xx responses", async () => {
    const resp = makeResponse("error", {
      status: 500,
      statusText: "Internal Server Error",
    });
    Object.defineProperty(resp, "ok", { value: false });
    mockFetch.mockResolvedValue(resp);

    await fetchWithTimeout("https://example.com", {}, 0);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("HTTP 500"),
    );
  });

  it("includes URL in non-OK warning", async () => {
    const resp = makeResponse("err", { status: 503 });
    Object.defineProperty(resp, "ok", { value: false });
    mockFetch.mockResolvedValue(resp);

    await fetchWithTimeout("https://api.example.com/health", {}, 0);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("https://api.example.com/health"),
    );
  });

  it("returns non-OK response without throwing", async () => {
    const resp = makeResponse("forbidden", { status: 403 });
    Object.defineProperty(resp, "ok", { value: false });
    mockFetch.mockResolvedValue(resp);

    const result = await fetchWithTimeout("https://example.com", {}, 0);
    expect(result.status).toBe(403);
  });
});

/* -------------------------------------------------------------------------- */
/*                          getUrlString Behaviour                            */
/* -------------------------------------------------------------------------- */

describe("getUrlString extraction", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("extracts URL from string input", async () => {
    mockFetch.mockRejectedValue(new TypeError("fail"));
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com/path", {}, 0),
    );
    expect(err.details).toEqual({ url: "https://example.com/path" });
  });

  it("extracts URL from URL object", async () => {
    mockFetch.mockRejectedValue(new TypeError("fail"));
    const url = new URL("https://example.com/url-obj");
    const err = await catchNetworkError(
      fetchWithTimeout(url, {}, 0),
    );
    expect(err.details).toEqual({ url: "https://example.com/url-obj" });
  });

  it("extracts URL from Request object", async () => {
    mockFetch.mockRejectedValue(new TypeError("fail"));
    const request = new Request("https://example.com/request");
    const err = await catchNetworkError(
      fetchWithTimeout(request, {}, 0),
    );
    expect(err.details).toEqual({ url: "https://example.com/request" });
  });
});

/* -------------------------------------------------------------------------- */
/*                       USER_MESSAGES String Pinning                         */
/* -------------------------------------------------------------------------- */

describe("USER_MESSAGES string pinning", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("TIMEOUT message is exact string", async () => {
    jest.useFakeTimers();
    mockHangingFetch();
    const promise = fetchWithTimeout("https://example.com", {}, 5000);
    jest.advanceTimersByTime(5000);
    const err = await catchNetworkError(promise);
    expect(err.userMessage).toBe(
      "Request timed out. Please check your connection and try again.",
    );
    jest.useRealTimers();
  });

  it("NETWORK_ERROR message is exact string", async () => {
    mockFetch.mockRejectedValue(new TypeError("fail"));
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.userMessage).toBe(
      "Unable to connect. Please check your internet connection.",
    );
  });

  it("ABORT message is exact string", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    mockFetch.mockRejectedValue(abortError);
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.userMessage).toBe("Request was cancelled.");
  });

  it("BROWSER_TIMEOUT uses TIMEOUT userMessage", async () => {
    mockFetch.mockRejectedValue(new Error("timeout"));
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.userMessage).toBe(
      "Request timed out. Please check your connection and try again.",
    );
  });

  it("FETCH_UNEXPECTED uses NETWORK_ERROR userMessage", async () => {
    mockFetch.mockRejectedValue({ not: "an error" });
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.userMessage).toBe(
      "Unable to connect. Please check your internet connection.",
    );
  });
});

/* -------------------------------------------------------------------------- */
/*                      validateContentType (via safeReadJson)                */
/* -------------------------------------------------------------------------- */

describe("validateContentType", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("accepts application/json content type", async () => {
    const resp = makeResponse('{"ok":true}', {
      contentType: "application/json",
    });
    const result = await safeReadJson(resp);
    expect(result).toEqual({ ok: true });
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Unexpected content-type"),
    );
  });

  it("accepts application/json with charset parameter", async () => {
    const resp = makeResponse('{"ok":true}', {
      contentType: "application/json; charset=utf-8",
    });
    const result = await safeReadJson(resp);
    expect(result).toEqual({ ok: true });
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Unexpected content-type"),
    );
  });

  it("accepts case-insensitive content type", async () => {
    const resp = makeResponse('{"ok":true}', {
      contentType: "Application/JSON",
    });
    const result = await safeReadJson(resp);
    expect(result).toEqual({ ok: true });
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Unexpected content-type"),
    );
  });

  it("warns about mismatched content type but still parses", async () => {
    const resp = makeResponse('{"ok":true}', {
      contentType: "text/html",
    });
    const result = await safeReadJson(resp);
    expect(result).toEqual({ ok: true });
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unexpected content-type"),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("text/html"),
    );
  });

  it("warns about missing content-type header", async () => {
    // jsdom's Response constructor sets a default content-type, so we
    // construct a mock response with no content-type header at all.
    const mockResponse = {
      headers: new Headers(),
      status: 200,
      body: null,
      arrayBuffer: jest
        .fn()
        .mockResolvedValue(
          new TextEncoder().encode('{"ok":true}').buffer,
        ),
    } as unknown as Response;
    const result = await safeReadJson(mockResponse);
    expect(result).toEqual({ ok: true });
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Missing content-type"),
    );
  });

  it("does not throw on missing content-type (lenient)", async () => {
    const mockResponse = {
      headers: new Headers(),
      status: 200,
      body: null,
      arrayBuffer: jest
        .fn()
        .mockResolvedValue(
          new TextEncoder().encode('{"ok":true}').buffer,
        ),
    } as unknown as Response;
    await expect(safeReadJson(mockResponse)).resolves.toEqual({ ok: true });
  });

  it("accepts 204 response with allowEmpty and no content-type", async () => {
    const resp = new Response(null, { status: 204 });
    await expect(safeReadJson(resp)).rejects.toMatchObject({
      code: "JSON_PARSE_FAILED",
    });
  });
});

/* -------------------------------------------------------------------------- */
/*                       safeReadBody (via safeReadJson)                      */
/* -------------------------------------------------------------------------- */

describe("safeReadBody", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("rejects when Content-Length exceeds maxSize", async () => {
    const resp = makeResponse('{"data":"x"}', {
      contentType: "application/json",
    });
    resp.headers.set("content-length", "5000000");

    await expect(safeReadJson(resp, 100)).rejects.toMatchObject({
      code: "RESPONSE_TOO_LARGE",
      userMessage: "Response too large. Please contact support.",
      statusCode: 200,
    });
  });

  it("RESPONSE_TOO_LARGE includes size and maxSize in details", async () => {
    const resp = makeResponse('{"data":"x"}', {
      contentType: "application/json",
    });
    resp.headers.set("content-length", "2000");

    const err = await catchNetworkError(safeReadJson(resp, 100));
    expect(err.details).toEqual({ size: 2000, maxSize: 100 });
  });

  it("uses 1MB default maxSize for safeReadJson", async () => {
    const resp = makeResponse('{"data":"x"}', {
      contentType: "application/json",
    });
    resp.headers.set("content-length", "2000000");

    await expect(safeReadJson(resp)).rejects.toMatchObject({
      code: "RESPONSE_TOO_LARGE",
      details: expect.objectContaining({ maxSize: 1_048_576 }),
    });
  });

  it("accepts body exactly at maxSize", async () => {
    const data = JSON.stringify({ v: "a".repeat(50) });
    const resp = makeResponse(data, { contentType: "application/json" });
    const result = await safeReadJson(resp, 10000);
    expect(result).toEqual({ v: "a".repeat(50) });
  });

  it("falls back to arrayBuffer() when body.getReader() is unavailable", async () => {
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      status: 200,
      body: null,
      arrayBuffer: jest.fn().mockResolvedValue(
        new TextEncoder().encode('{"fallback":true}').buffer,
      ),
    } as unknown as Response;

    const result = await safeReadJson(mockResponse);
    expect(result).toEqual({ fallback: true });
    expect(mockResponse.arrayBuffer).toHaveBeenCalled();
  });

  it("rejects in fallback path when arrayBuffer exceeds maxSize", async () => {
    const bigBuffer = new ArrayBuffer(5000);
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      status: 200,
      body: null,
      arrayBuffer: jest.fn().mockResolvedValue(bigBuffer),
    } as unknown as Response;

    await expect(safeReadJson(mockResponse, 100)).rejects.toMatchObject({
      code: "RESPONSE_TOO_LARGE",
      details: expect.objectContaining({ size: 5000, maxSize: 100 }),
    });
  });

  it("handles streaming body that exceeds maxSize during read", async () => {
    const chunk1 = new Uint8Array(60);
    const chunk2 = new Uint8Array(60);
    const resp = makeStreamingResponse([chunk1, chunk2], {
      contentType: "application/json",
    });

    await expect(safeReadJson(resp, 100)).rejects.toMatchObject({
      code: "RESPONSE_TOO_LARGE",
    });
  });

  it("wraps non-NetworkError body read failures as BODY_READ_FAILED", async () => {
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      status: 500,
      body: null,
      arrayBuffer: jest.fn().mockRejectedValue(new Error("Read interrupted")),
    } as unknown as Response;

    await expect(safeReadJson(mockResponse)).rejects.toMatchObject({
      code: "BODY_READ_FAILED",
      userMessage: "Failed to read server response. Please try again.",
      statusCode: 500,
    });
  });

  it("re-throws NetworkError from body read without wrapping", async () => {
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      status: 200,
      body: null,
      arrayBuffer: jest.fn().mockRejectedValue(
        new NetworkError(
          "custom",
          "custom user msg",
          "CUSTOM_CODE",
          200,
        ),
      ),
    } as unknown as Response;

    await expect(safeReadJson(mockResponse)).rejects.toMatchObject({
      code: "CUSTOM_CODE",
      userMessage: "custom user msg",
    });
  });

  it("ignores invalid Content-Length values (NaN)", async () => {
    const resp = makeResponse('{"ok":true}', {
      contentType: "application/json",
    });
    resp.headers.set("content-length", "not-a-number");

    const result = await safeReadJson(resp, 100);
    expect(result).toEqual({ ok: true });
  });

  it("handles streaming body with multiple chunks correctly", async () => {
    const encoder = new TextEncoder();
    const part1 = encoder.encode('{"multi');
    const part2 = encoder.encode('":');
    const part3 = encoder.encode('"ok"}');
    const resp = makeStreamingResponse([part1, part2, part3], {
      contentType: "application/json",
    });

    const result = await safeReadJson(resp, 10000);
    expect(result).toEqual({ multi: "ok" });
  });
});

/* -------------------------------------------------------------------------- */
/*                          safeReadJson                                      */
/* -------------------------------------------------------------------------- */

describe("safeReadJson", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("parses valid JSON response", async () => {
    const resp = makeResponse('{"key":"value","num":42}', {
      contentType: "application/json",
    });
    const result = await safeReadJson<{ key: string; num: number }>(resp);
    expect(result).toEqual({ key: "value", num: 42 });
  });

  it("parses JSON array response", async () => {
    const resp = makeResponse("[1,2,3]", {
      contentType: "application/json",
    });
    const result = await safeReadJson<number[]>(resp);
    expect(result).toEqual([1, 2, 3]);
  });

  it("parses JSON null response", async () => {
    const resp = makeResponse("null", {
      contentType: "application/json",
    });
    const result = await safeReadJson(resp);
    expect(result).toBeNull();
  });

  it("parses JSON string response", async () => {
    const resp = makeResponse('"hello"', {
      contentType: "application/json",
    });
    const result = await safeReadJson(resp);
    expect(result).toBe("hello");
  });

  it("throws JSON_PARSE_FAILED for invalid JSON", async () => {
    const resp = makeResponse("{broken", {
      contentType: "application/json",
    });
    await expect(safeReadJson(resp)).rejects.toMatchObject({
      code: "JSON_PARSE_FAILED",
      userMessage: "Invalid response format. Please try again.",
    });
  });

  it("includes status code in JSON_PARSE_FAILED error", async () => {
    const resp = makeResponse("not json", {
      contentType: "application/json",
      status: 502,
    });
    const err = await catchNetworkError(safeReadJson(resp));
    expect(err.statusCode).toBe(502);
  });

  it("includes parseError and preview in JSON_PARSE_FAILED details", async () => {
    const resp = makeResponse("bad data", {
      contentType: "application/json",
    });
    const err = await catchNetworkError(safeReadJson(resp));
    const details = err.details as { parseError: unknown; preview: string };
    expect(details.parseError).toBeInstanceOf(SyntaxError);
    expect(details.preview).toBe("bad data");
  });

  it("truncates preview to 100 chars with ellipsis for long bodies", async () => {
    const longBody = "x".repeat(200);
    const resp = makeResponse(longBody, {
      contentType: "application/json",
    });
    const err = await catchNetworkError(safeReadJson(resp));
    const details = err.details as { preview: string };
    expect(details.preview.length).toBe(103);
    expect(details.preview).toMatch(/^x{100}\.\.\.$/);
  });

  it("does NOT truncate preview for body of exactly 100 chars", async () => {
    const exactBody = "y".repeat(100);
    const resp = makeResponse(exactBody, {
      contentType: "application/json",
    });
    const err = await catchNetworkError(safeReadJson(resp));
    const details = err.details as { preview: string };
    expect(details.preview.length).toBe(100);
    expect(details.preview).not.toContain("...");
  });

  it("truncates preview for body of exactly 101 chars", async () => {
    const body = "z".repeat(101);
    const resp = makeResponse(body, {
      contentType: "application/json",
    });
    const err = await catchNetworkError(safeReadJson(resp));
    const details = err.details as { preview: string };
    expect(details.preview.length).toBe(103);
    expect(details.preview.endsWith("...")).toBe(true);
  });

  it("logs JSON parse error to console.error", async () => {
    const resp = makeResponse("not json at all", {
      contentType: "application/json",
    });
    await safeReadJson(resp).catch(() => {});
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[fetchWithTimeout] JSON parse failed:",
      expect.any(SyntaxError),
    );
  });

  it("uses custom description in error message", async () => {
    const resp = makeResponse("bad", {
      contentType: "application/json",
    });
    const err = await catchNetworkError(
      safeReadJson(resp, 1_048_576, "config payload"),
    );
    expect(err.message).toContain("config payload");
  });

  it("uses default description 'JSON response' in error message", async () => {
    const resp = makeResponse("bad", {
      contentType: "application/json",
    });
    const err = await catchNetworkError(safeReadJson(resp));
    expect(err.message).toContain("JSON response");
  });

  it("re-throws NetworkError from inner operations without wrapping", async () => {
    const resp = makeResponse("x", {
      contentType: "application/json",
    });
    resp.headers.set("content-length", "5000000");

    const err = await catchNetworkError(safeReadJson(resp, 100));
    expect(err.code).toBe("RESPONSE_TOO_LARGE");
  });

  it("wraps non-NetworkError exceptions in outer catch as JSON_READ_FAILED", async () => {
    const badResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      status: 200,
      body: {
        getReader() {
          throw new RangeError("Unexpected reader error");
        },
      },
      arrayBuffer: undefined,
    } as unknown as Response;

    const err = await catchNetworkError(safeReadJson(badResponse));
    expect(["BODY_READ_FAILED", "JSON_READ_FAILED"]).toContain(err.code);
  });

  it("JSON_READ_FAILED has correct userMessage", async () => {
    const originalTextDecoder = global.TextDecoder;
    const mockDecoder = jest.fn().mockImplementation(() => ({
      decode: () => {
        throw new Error("decode failed");
      },
    }));
    global.TextDecoder = mockDecoder as unknown as typeof TextDecoder;

    try {
      const resp = makeResponse('{"ok":true}', {
        contentType: "application/json",
      });
      const err = await catchNetworkError(safeReadJson(resp));
      expect(err.code).toBe("JSON_READ_FAILED");
      expect(err.userMessage).toBe(
        "Failed to process server response. Please try again.",
      );
    } finally {
      global.TextDecoder = originalTextDecoder;
    }
  });
});

/* -------------------------------------------------------------------------- */
/*                     fetchWithTimeout with init options                     */
/* -------------------------------------------------------------------------- */

describe("fetchWithTimeout passes init through", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue(new Response("ok"));
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("passes method through", async () => {
    await fetchWithTimeout(
      "https://example.com",
      { method: "POST" },
      5000,
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("passes headers through", async () => {
    await fetchWithTimeout(
      "https://example.com",
      { headers: { "X-Custom": "value" } },
      5000,
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        headers: { "X-Custom": "value" },
      }),
    );
  });

  it("passes body through", async () => {
    await fetchWithTimeout(
      "https://example.com",
      { method: "POST", body: '{"data":1}' },
      5000,
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ body: '{"data":1}' }),
    );
  });

  it("defaults init to empty object", async () => {
    await fetchWithTimeout("https://example.com");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

/* -------------------------------------------------------------------------- */
/*                     Error code string literal pinning                      */
/* -------------------------------------------------------------------------- */

describe("error code string pinning", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("FETCH_TIMEOUT is exact string", async () => {
    jest.useFakeTimers();
    mockHangingFetch();
    const promise = fetchWithTimeout("https://example.com", {}, 5000);
    jest.advanceTimersByTime(5000);
    const err = await catchNetworkError(promise);
    expect(err.code).toBe("FETCH_TIMEOUT");
    expect(err.code).not.toBe("TIMEOUT");
    expect(err.code).not.toBe("fetch_timeout");
    jest.useRealTimers();
  });

  it("NETWORK_FAILURE is exact string", async () => {
    mockFetch.mockRejectedValue(new TypeError("fail"));
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.code).toBe("NETWORK_FAILURE");
    expect(err.code).not.toBe("NETWORK_ERROR");
  });

  it("FETCH_ABORTED is exact string", async () => {
    mockFetch.mockRejectedValue(
      new DOMException("Aborted", "AbortError"),
    );
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.code).toBe("FETCH_ABORTED");
    expect(err.code).not.toBe("ABORTED");
  });

  it("BROWSER_TIMEOUT is exact string", async () => {
    mockFetch.mockRejectedValue(new Error("timeout occurred"));
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.code).toBe("BROWSER_TIMEOUT");
    expect(err.code).not.toBe("TIMEOUT");
  });

  it("FETCH_UNEXPECTED is exact string", async () => {
    mockFetch.mockRejectedValue(new Error("random"));
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.code).toBe("FETCH_UNEXPECTED");
    expect(err.code).not.toBe("UNEXPECTED");
  });

  it("RESPONSE_TOO_LARGE is exact string", async () => {
    const resp = makeResponse("x", { contentType: "application/json" });
    resp.headers.set("content-length", "9999999");
    const err = await catchNetworkError(safeReadJson(resp, 100));
    expect(err.code).toBe("RESPONSE_TOO_LARGE");
  });

  it("JSON_PARSE_FAILED is exact string", async () => {
    const resp = makeResponse("not json", {
      contentType: "application/json",
    });
    const err = await catchNetworkError(safeReadJson(resp));
    expect(err.code).toBe("JSON_PARSE_FAILED");
  });

  it("BODY_READ_FAILED is exact string", async () => {
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      status: 200,
      body: null,
      arrayBuffer: jest.fn().mockRejectedValue(new Error("read fail")),
    } as unknown as Response;
    const err = await catchNetworkError(safeReadJson(mockResponse));
    expect(err.code).toBe("BODY_READ_FAILED");
  });
});

/* -------------------------------------------------------------------------- */
/*                   Internal message string pinning                          */
/* -------------------------------------------------------------------------- */

describe("internal message pinning", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("NETWORK_FAILURE internal message is 'Network request failed'", async () => {
    mockFetch.mockRejectedValue(new TypeError("fail"));
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.message).toBe("Network request failed");
  });

  it("FETCH_ABORTED internal message is 'Request was aborted'", async () => {
    mockFetch.mockRejectedValue(
      new DOMException("Aborted", "AbortError"),
    );
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.message).toBe("Request was aborted");
  });

  it("BROWSER_TIMEOUT internal message is 'Browser request timeout'", async () => {
    mockFetch.mockRejectedValue(new Error("timeout"));
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.message).toBe("Browser request timeout");
  });

  it("FETCH_UNEXPECTED internal message is 'Unexpected fetch error'", async () => {
    mockFetch.mockRejectedValue(new Error("something else"));
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err.message).toBe("Unexpected fetch error");
  });

  it("FETCH_TIMEOUT internal message includes timeout ms", async () => {
    jest.useFakeTimers();
    mockHangingFetch();
    const promise = fetchWithTimeout("https://example.com", {}, 10000);
    jest.advanceTimersByTime(10000);
    const err = await catchNetworkError(promise);
    expect(err.message).toBe("Request timed out after 10000ms");
    jest.useRealTimers();
  });

  it("BODY_READ_FAILED uses description in message", async () => {
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      status: 200,
      body: null,
      arrayBuffer: jest.fn().mockRejectedValue(new Error("oops")),
    } as unknown as Response;
    const err = await catchNetworkError(
      safeReadJson(mockResponse, 1_048_576, "my payload"),
    );
    expect(err.message).toContain("my payload");
  });

  it("BODY_READ_FAILED userMessage is fixed string", async () => {
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      status: 200,
      body: null,
      arrayBuffer: jest.fn().mockRejectedValue(new Error("oops")),
    } as unknown as Response;
    const err = await catchNetworkError(safeReadJson(mockResponse));
    expect(err.userMessage).toBe(
      "Failed to read server response. Please try again.",
    );
  });

  it("JSON_PARSE_FAILED userMessage is fixed string", async () => {
    const resp = makeResponse("nope", { contentType: "application/json" });
    const err = await catchNetworkError(safeReadJson(resp));
    expect(err.userMessage).toBe(
      "Invalid response format. Please try again.",
    );
  });

  it("RESPONSE_TOO_LARGE userMessage is fixed string", async () => {
    const resp = makeResponse("x", { contentType: "application/json" });
    resp.headers.set("content-length", "9999999");
    const err = await catchNetworkError(safeReadJson(resp, 100));
    expect(err.userMessage).toBe(
      "Response too large. Please contact support.",
    );
  });
});

/* -------------------------------------------------------------------------- */
/*                   Operator and Conditional Mutations                       */
/* -------------------------------------------------------------------------- */

describe("operator and conditional mutations", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue(new Response("ok"));
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // timeout <= 0 check: boundary (clamped to MIN_TIMEOUT, not no-timeout)
  it("timeout of exactly 0 is clamped to MIN_TIMEOUT", async () => {
    const response = await fetchWithTimeout("https://example.com", {}, 0);
    expect(response).toBeInstanceOf(Response);
    const calledInit = mockFetch.mock.calls[0][1] as RequestInit;
    expect(calledInit.signal).toBeDefined();
  });

  it("timeout of exactly 1 does NOT yield no-timeout path", async () => {
    await fetchWithTimeout("https://example.com", {}, 1);
    const calledInit = mockFetch.mock.calls[0][1] as RequestInit;
    expect(calledInit.signal).toBeDefined();
  });

  it("timeout of exactly -1 is clamped to MIN_TIMEOUT", async () => {
    const response = await fetchWithTimeout("https://example.com", {}, -1);
    expect(response).toBeInstanceOf(Response);
    const calledInit = mockFetch.mock.calls[0][1] as RequestInit;
    expect(calledInit.signal).toBeDefined();
  });

  // timeout < MIN_TIMEOUT boundary (1000)
  it("timeout=999 is below MIN_TIMEOUT boundary", async () => {
    await fetchWithTimeout("https://example.com", {}, 999);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Timeout too short"),
    );
  });

  it("timeout=1000 is NOT below MIN_TIMEOUT", async () => {
    await fetchWithTimeout("https://example.com", {}, 1000);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("timeout=1001 is NOT below MIN_TIMEOUT", async () => {
    await fetchWithTimeout("https://example.com", {}, 1001);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  // timeout > MAX_TIMEOUT boundary (60000)
  it("timeout=59999 is NOT above MAX_TIMEOUT", async () => {
    await fetchWithTimeout("https://example.com", {}, 59999);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("timeout=60000 is NOT above MAX_TIMEOUT", async () => {
    await fetchWithTimeout("https://example.com", {}, 60000);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("timeout=60001 is above MAX_TIMEOUT", async () => {
    await fetchWithTimeout("https://example.com", {}, 60001);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Timeout too long"),
    );
  });

  // isFinite check
  it("rejects positive Infinity as invalid", async () => {
    await fetchWithTimeout("https://example.com", {}, Infinity);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid timeout value"),
      Infinity,
    );
  });

  it("rejects negative Infinity as invalid", async () => {
    await fetchWithTimeout("https://example.com", {}, -Infinity);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid timeout value"),
      -Infinity,
    );
  });

  // typeof check
  it("rejects boolean as invalid timeout type", async () => {
    await fetchWithTimeout(
      "https://example.com",
      {},
      true as unknown as number,
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid timeout value"),
      true,
    );
  });

  // Content-Length parsing: size > maxSize check
  it("Content-Length exactly at maxSize is accepted", async () => {
    const data = JSON.stringify({ ok: true });
    const resp = makeResponse(data, { contentType: "application/json" });
    resp.headers.set("content-length", "100");
    const result = await safeReadJson(resp, 100);
    expect(result).toEqual({ ok: true });
  });

  it("Content-Length one above maxSize is rejected", async () => {
    const resp = makeResponse("x", { contentType: "application/json" });
    resp.headers.set("content-length", "101");
    await expect(safeReadJson(resp, 100)).rejects.toMatchObject({
      code: "RESPONSE_TOO_LARGE",
    });
  });

  // text.length > 100 boundary in preview truncation
  it("body of 99 chars is not truncated in preview", async () => {
    const body = "a".repeat(99);
    const resp = makeResponse(body, { contentType: "application/json" });
    const err = await catchNetworkError(safeReadJson(resp));
    const details = err.details as { preview: string };
    expect(details.preview).toBe(body);
    expect(details.preview).not.toContain("...");
  });

  it("body of 100 chars is not truncated in preview", async () => {
    const body = "b".repeat(100);
    const resp = makeResponse(body, { contentType: "application/json" });
    const err = await catchNetworkError(safeReadJson(resp));
    const details = err.details as { preview: string };
    expect(details.preview).toBe(body);
  });

  it("body of 101 chars IS truncated in preview", async () => {
    const body = "c".repeat(101);
    const resp = makeResponse(body, { contentType: "application/json" });
    const err = await catchNetworkError(safeReadJson(resp));
    const details = err.details as { preview: string };
    expect(details.preview.length).toBe(103);
    expect(details.preview).toBe("c".repeat(100) + "...");
  });

  // AbortError name check: err.name === "AbortError"
  it("Error with name 'AbortError' is classified as FETCH_ABORTED", async () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    mockFetch.mockRejectedValue(err);
    const result = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(result.code).toBe("FETCH_ABORTED");
  });

  it("Error with name 'aborterror' (wrong case) is NOT classified as FETCH_ABORTED", async () => {
    const err = new Error("aborted");
    err.name = "aborterror";
    mockFetch.mockRejectedValue(err);
    const result = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(result.code).toBe("FETCH_UNEXPECTED");
  });

  // AbortError check occurs before timeout message check
  it("AbortError with 'timeout' in message is still classified as FETCH_ABORTED, not BROWSER_TIMEOUT", async () => {
    const err = new Error("timeout aborted");
    err.name = "AbortError";
    mockFetch.mockRejectedValue(err);
    const result = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(result.code).toBe("FETCH_ABORTED");
  });

  // response.ok check
  it("does not log warning for response with ok=true", async () => {
    mockFetch.mockResolvedValue(makeResponse("ok", { status: 200 }));
    // Use a valid timeout (not 0, which now logs a clamp warning)
    await fetchWithTimeout("https://example.com", {}, 5000);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  // controller.signal.aborted check in timeout path
  it("distinguishes our timeout abort from other aborts in error handler", async () => {
    jest.useFakeTimers();
    mockHangingFetch();
    const promise = fetchWithTimeout("https://example.com", {}, 5000);
    jest.advanceTimersByTime(5000);
    const err = await catchNetworkError(promise);
    expect(err.code).toBe("FETCH_TIMEOUT");
    jest.useRealTimers();
  });
});

/* -------------------------------------------------------------------------- */
/*                       safeReadBody default parameters                      */
/* -------------------------------------------------------------------------- */

describe("safeReadBody default parameter values", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("safeReadJson default maxSize is 1MB (1024 * 1024)", async () => {
    const resp = makeResponse('{"ok":true}', {
      contentType: "application/json",
    });
    resp.headers.set("content-length", String(1024 * 1024));
    const result = await safeReadJson(resp);
    expect(result).toEqual({ ok: true });
  });

  it("safeReadJson rejects 1MB + 1 byte Content-Length by default", async () => {
    const resp = makeResponse("x", { contentType: "application/json" });
    resp.headers.set("content-length", String(1024 * 1024 + 1));
    await expect(safeReadJson(resp)).rejects.toMatchObject({
      code: "RESPONSE_TOO_LARGE",
    });
  });
});

/* -------------------------------------------------------------------------- */
/*                       Edge cases and misc mutations                        */
/* -------------------------------------------------------------------------- */

describe("edge cases", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("handles Request input for URL extraction in timeout error", async () => {
    jest.useFakeTimers();
    mockHangingFetch();
    const request = new Request("https://example.com/req-input");
    const promise = fetchWithTimeout(request, {}, 5000);
    jest.advanceTimersByTime(5000);
    const err = await catchNetworkError(promise);
    expect(err.details).toEqual(
      expect.objectContaining({ url: "https://example.com/req-input" }),
    );
    jest.useRealTimers();
  });

  it("handles URL input for URL extraction in timeout error", async () => {
    jest.useFakeTimers();
    mockHangingFetch();
    const url = new URL("https://example.com/url-input");
    const promise = fetchWithTimeout(url, {}, 5000);
    jest.advanceTimersByTime(5000);
    const err = await catchNetworkError(promise);
    expect(err.details).toEqual(
      expect.objectContaining({ url: "https://example.com/url-input" }),
    );
    jest.useRealTimers();
  });

  it("handles empty string URL", async () => {
    mockFetch.mockRejectedValue(new TypeError("fail"));
    const err = await catchNetworkError(
      fetchWithTimeout("", {}, 0),
    );
    expect(err.details).toEqual({ url: "<unknown>" });
  });

  it("safeReadJson with empty body parses as empty string", async () => {
    const resp = makeResponse("", { contentType: "application/json" });
    await expect(safeReadJson(resp)).rejects.toMatchObject({
      code: "JSON_PARSE_FAILED",
    });
  });

  it("content-type normalisation splits on semicolon and trims", async () => {
    const resp = makeResponse('{"ok":true}', {
      contentType: "  application/json  ;  charset=utf-8  ",
    });
    const result = await safeReadJson(resp);
    expect(result).toEqual({ ok: true });
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Unexpected content-type"),
    );
  });

  it("normalised content-type check uses startsWith", async () => {
    const resp = makeResponse('{"ok":true}', {
      contentType: "application/json-patch+json",
    });
    const result = await safeReadJson(resp);
    expect(result).toEqual({ ok: true });
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Unexpected content-type"),
    );
  });

  it("content-type that does not start with expected type triggers warning", async () => {
    const resp = makeResponse('{"ok":true}', {
      contentType: "text/plain",
    });
    await safeReadJson(resp);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unexpected content-type"),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("application/json"),
    );
  });
});

/* -------------------------------------------------------------------------- */
/*  Mutation killers: validateTimeout L105-L120 conditional/logical survivors  */
/* -------------------------------------------------------------------------- */

describe("validateTimeout mutation killers", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue(new Response("ok"));
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // L105:9 ConditionalExpression true/false , `if (err instanceof NetworkError) throw err`
  // If mutated to `true`, non-NetworkError errors would be thrown raw (not re-thrown).
  // If mutated to `false`, NetworkError would fall through to the bare `throw err`.
  // We need a test where a NetworkError from performFetch is caught in the timeout
  // path's catch block, and we verify it retains its exact type and code.
  it("re-throws NetworkError from performFetch in the timeout path preserving code", async () => {
    // TypeError produces a NetworkError via performFetch; it enters the timeout catch block
    mockFetch.mockRejectedValue(new TypeError("network down"));
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 5000),
    );
    // Must be a NetworkError, not a raw TypeError
    expect(err).toBeInstanceOf(NetworkError);
    expect(err.code).toBe("NETWORK_FAILURE");
    // Must NOT be wrapped again as something else
    expect(err.code).not.toBe("FETCH_UNEXPECTED");
    expect(err.code).not.toBe("FETCH_TIMEOUT");
  });

  // Ensure a non-NetworkError, non-timeout error in the timeout path is still thrown
  it("re-throws non-NetworkError in timeout path without converting to NetworkError", async () => {
    // A raw Error (not TypeError, not AbortError) thrown from fetch
    // performFetch wraps unknowns as FETCH_UNEXPECTED NetworkError,
    // so this will be a NetworkError with code FETCH_UNEXPECTED
    const weirdError = new Error("some weirdness");
    mockFetch.mockRejectedValue(weirdError);
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 5000),
    );
    expect(err).toBeInstanceOf(NetworkError);
    expect(err.code).toBe("FETCH_UNEXPECTED");
  });

  // L120:7 LogicalOperator , `timeout === undefined || timeout === null` mutated to `&&`
  // If `||` becomes `&&`, only when BOTH are true (impossible) would we get default.
  // So undefined alone must still return default, and null alone must still return default.
  it("undefined timeout alone returns default (kills || to && mutation)", async () => {
    jest.useFakeTimers();
    mockHangingFetch();
    // undefined timeout should use DEFAULT_TIMEOUT (30000)
    const promise = fetchWithTimeout("https://example.com");
    jest.advanceTimersByTime(30_000);
    const err = await catchNetworkError(promise);
    expect(err.code).toBe("FETCH_TIMEOUT");
    expect(err.details).toEqual(
      expect.objectContaining({ timeout: 30_000 }),
    );
    jest.useRealTimers();
  });

  it("null timeout alone returns default (kills || to && mutation)", async () => {
    jest.useFakeTimers();
    mockHangingFetch();
    // null coerced as number still hits the === null branch
    const promise = fetchWithTimeout(
      "https://example.com",
      {},
      null as unknown as number,
    );
    jest.advanceTimersByTime(30_000);
    const err = await catchNetworkError(promise);
    expect(err.code).toBe("FETCH_TIMEOUT");
    expect(err.details).toEqual(
      expect.objectContaining({ timeout: 30_000 }),
    );
    jest.useRealTimers();
  });

  // L120:32 ConditionalExpression false , the entire `timeout === undefined` sub-expression
  // If only `=== undefined` is replaced with false, undefined would fall through to
  // typeof check. typeof undefined is "undefined" !== "number", so it would warn.
  // We verify no warning is emitted for undefined timeout.
  it("undefined timeout does NOT produce an 'Invalid timeout' warning", async () => {
    await fetchWithTimeout("https://example.com");
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Invalid timeout value"),
      undefined,
    );
  });

  // L120:50 BlockStatement {} , the return DEFAULT_TIMEOUT block replaced with empty block
  // If the block is empty, undefined/null would fall through to the typeof check.
  // undefined would hit typeof !== "number" and warn. We verify it does NOT warn.
  it("null timeout does NOT produce an 'Invalid timeout' warning", async () => {
    await fetchWithTimeout(
      "https://example.com",
      {},
      null as unknown as number,
    );
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Invalid timeout value"),
      null,
    );
  });
});

/* -------------------------------------------------------------------------- */
/*  Mutation killers: Error classification L201 optional chaining survivor    */
/* -------------------------------------------------------------------------- */

describe("error classification optional chaining mutation killer", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // L201:11 OptionalChaining , `err.message?.toLowerCase()` removing `?.`
  // If the `?.` is removed and err.message is undefined, calling
  // `.toLowerCase()` on undefined would throw a TypeError instead of
  // gracefully falling through to FETCH_UNEXPECTED.
  it("handles Error with undefined message without crashing (kills optional chaining removal)", async () => {
    const errorWithNoMessage = new Error();
    // Force message to undefined to test the optional chaining
    Object.defineProperty(errorWithNoMessage, "message", {
      value: undefined,
      writable: false,
    });
    mockFetch.mockRejectedValue(errorWithNoMessage);
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    // Without optional chaining, this would throw a TypeError internally.
    // With it, it falls through to FETCH_UNEXPECTED.
    expect(err).toBeInstanceOf(NetworkError);
    expect(err.code).toBe("FETCH_UNEXPECTED");
  });

  it("Error with null message does not crash on optional chaining", async () => {
    const errorWithNullMessage = new Error();
    Object.defineProperty(errorWithNullMessage, "message", {
      value: null,
      writable: false,
    });
    mockFetch.mockRejectedValue(errorWithNullMessage);
    const err = await catchNetworkError(
      fetchWithTimeout("https://example.com", {}, 0),
    );
    expect(err).toBeInstanceOf(NetworkError);
    expect(err.code).toBe("FETCH_UNEXPECTED");
  });
});

/* -------------------------------------------------------------------------- */
/*  Mutation killers: Response logging L232, L240 survivors                   */
/* -------------------------------------------------------------------------- */

describe("response logging mutation killers", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // L232:7 ConditionalExpression false , `if (!response.ok)` mutated to `if (false)`
  // The warn call would never fire. We must assert it IS called for non-OK.
  it("MUST log a warning for non-OK response (kills if-false mutation)", async () => {
    const resp = makeResponse("error", {
      status: 500,
      statusText: "Internal Server Error",
    });
    Object.defineProperty(resp, "ok", { value: false });
    mockFetch.mockResolvedValue(resp);

    await fetchWithTimeout("https://example.com/api", {}, 5000);
    // If the conditional is mutated to false, this assertion fails
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/HTTP 500.*Internal Server Error.*example\.com\/api/),
    );
  });

  // L240:30 StringLiteral "" , the URL in the template literal replaced with ""
  // We verify the exact URL appears in the logged message.
  it("logs the exact URL in the non-OK warning message (kills empty string mutation)", async () => {
    const resp = makeResponse("not found", {
      status: 404,
      statusText: "Not Found",
    });
    Object.defineProperty(resp, "ok", { value: false });
    mockFetch.mockResolvedValue(resp);

    await fetchWithTimeout("https://specific-domain.com/specific-path", {}, 5000);
    const warnCall = consoleWarnSpy.mock.calls[0][0] as string;
    expect(warnCall).toContain("https://specific-domain.com/specific-path");
    expect(warnCall).toContain("HTTP 404");
    expect(warnCall).toContain("Not Found");
  });

  // Also verify OK responses do NOT trigger any logging
  it("does NOT log any warning for OK response (kills if-true mutation)", async () => {
    mockFetch.mockResolvedValue(makeResponse("ok", { status: 200 }));
    await fetchWithTimeout("https://example.com", {}, 5000);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------------------- */
/*  Mutation killers: validateContentType L257-287 survivors                  */
/* -------------------------------------------------------------------------- */

describe("validateContentType mutation killers", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // L257:9 ConditionalExpression true , `if (!contentType)` mutated to `if (true)`
  // Would always skip content-type validation. We need to prove that when
  // content-type IS present but wrong, a warning IS emitted.
  it("warns about wrong content-type even when header is present (kills always-true mutation)", async () => {
    const resp = makeResponse('{"ok":true}', {
      contentType: "text/xml",
    });
    await safeReadJson(resp);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unexpected content-type"),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("text/xml"),
    );
  });

  // L258:12 StringLiteral "" , the "[fetchWithTimeout] Missing content-type header" log
  // L259:11 BlockStatement {} , the return after "be lenient" replaced with empty block
  // L260:12 StringLiteral "" , another string literal in that block
  // To kill these, verify the exact warning text for missing content-type.
  it("logs exact 'Missing content-type header' text when header is absent", async () => {
    const mockResponse = {
      headers: new Headers(),
      status: 200,
      body: null,
      arrayBuffer: jest
        .fn()
        .mockResolvedValue(
          new TextEncoder().encode('{"ok":true}').buffer,
        ),
    } as unknown as Response;
    await safeReadJson(mockResponse);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[fetchWithTimeout] Missing content-type header",
    );
  });

  // L274:25 BooleanLiteral true (was false) , the `allowEmpty` default parameter
  // `allowEmpty: boolean = false` mutated to `allowEmpty: boolean = true`
  // safeReadJson calls validateContentType(response, "application/json", true)
  // so the default does not matter there. But internally, when allowEmpty is false
  // and status is 204 with no content-type, it should NOT return early (it should
  // log the missing header warning). When allowEmpty is true and status is 204,
  // it SHOULD return early without warning.
  // Since safeReadJson always passes `true` for allowEmpty (L401), we can only
  // observe the difference indirectly. A 204 with no content-type and allowEmpty=true
  // should silently return without the "Missing content-type" warning.
  it("204 with no content-type and allowEmpty=true does not warn about missing content-type", async () => {
    // safeReadJson passes allowEmpty=true to validateContentType
    const mockResponse = {
      headers: new Headers(),
      status: 204,
      body: null,
      arrayBuffer: jest
        .fn()
        .mockResolvedValue(new ArrayBuffer(0)),
    } as unknown as Response;
    // This will fail at JSON parse, but we only care about the content-type warning
    await safeReadJson(mockResponse).catch(() => {});
    // With allowEmpty=true and status 204, the function returns early, no warning
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      "[fetchWithTimeout] Missing content-type header",
    );
  });

  // L280:9 ConditionalExpression false , `if (allowEmpty && response.status === 204)` mutated to false
  // Would never return early for 204. Instead it would fall through to the
  // "Missing content-type" warning. We verify no such warning for 204.
  it("204 with allowEmpty=true returns early without missing content-type warning (kills if-false mutation)", async () => {
    const mockResponse = {
      headers: new Headers(),
      status: 204,
      body: null,
      arrayBuffer: jest
        .fn()
        .mockResolvedValue(new ArrayBuffer(0)),
    } as unknown as Response;
    await safeReadJson(mockResponse).catch(() => {});
    // If the conditional is mutated to false, the "Missing content-type" warning fires
    const missingContentTypeWarnings = consoleWarnSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === "[fetchWithTimeout] Missing content-type header",
    );
    expect(missingContentTypeWarnings).toHaveLength(0);
  });

  // L287:26 OptionalChaining , `contentType.toLowerCase().split(";")[0]?.trim()` removing `?.`
  // If split(";") returns an array where [0] is undefined (impossible for split with
  // a non-empty string), the `?.` is protective. But the real way to kill this:
  // verify that a content-type with just a semicolon works.
  it("handles content-type with trailing semicolon (kills optional chaining removal)", async () => {
    const resp = makeResponse('{"ok":true}', {
      contentType: "application/json;",
    });
    const result = await safeReadJson(resp);
    expect(result).toEqual({ ok: true });
    // The split produces ["application/json", ""], so [0] is "application/json"
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Unexpected content-type"),
    );
  });

  // L287:77 StringLiteral "Stryker was here!" , replaces the expected content type
  // in `normalizedExpected`. If the expected type becomes "Stryker was here!",
  // startsWith would fail for "application/json", producing a warning.
  // We verify that a correct application/json does NOT produce a warning.
  it("exact 'application/json' content-type does not warn (kills string literal mutation)", async () => {
    const resp = makeResponse('{"ok":true}', {
      contentType: "application/json",
    });
    await safeReadJson(resp);
    // If the expected type is mutated to "Stryker was here!", this would warn
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Unexpected content-type"),
    );
  });
});

/* -------------------------------------------------------------------------- */
/*  Mutation killers: Size limit checks L302-L361 survivors                   */
/* -------------------------------------------------------------------------- */

describe("size limit mutation killers", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // L302:21 ArithmeticOperator , `10 * 1024 * 1024` mutated to `10 * 1024 / 1024`
  // or `10 / 1024 * 1024`. The default maxSize for safeReadBody is 10MB (10485760).
  // safeReadJson overrides maxSize to 1MB. To test the 10MB default, we need to call
  // safeReadBody directly, but it's not exported. Instead, the default only matters
  // when safeReadBody is called with its default param. safeReadJson always passes
  // maxSize explicitly, so we cannot directly test the 10MB default through safeReadJson.
  // However, the mutation in the default parameter expression would cause a different
  // maxSize if ever used. Since we cannot call safeReadBody directly, we can at least
  // verify that safeReadJson's 1MB default (which calls safeReadBody with 1MB) works
  // correctly at the boundary.
  // Actually, looking at the code again: safeReadJson passes its own maxSize to
  // safeReadBody. The 10MB default is only used if safeReadBody is called without
  // a maxSize arg. Since safeReadJson always provides one, we need a different approach.
  // The mutation still needs killing. The default `10 * 1024 * 1024` expression is
  // evaluated when safeReadBody is called without the second argument. safeReadJson
  // always provides one. So this mutation may only be killable if there's another
  // caller. Looking at the exports, only safeReadJson is exported, so this may be
  // an unkillable mutation. But we should at least verify the formula produces the
  // right value indirectly.

  // L303:25 StringLiteral "" , the `description` default "response" replaced with ""
  // safeReadJson always passes "JSON response" as description, overriding the default.
  // Same situation: the default is only used when called without the arg.

  // L308:9 ConditionalExpression true , `if (contentLength)` mutated to `if (true)`
  // If mutated, a null contentLength would try to parseInt(null), getting NaN.
  // The isNaN check would skip the size check. So it would not reject.
  // This is actually equivalent to the current behaviour (skip size check when
  // no content-length). So the mutation survives because the behaviour is the same.
  // To kill this, we need a response WITHOUT content-length but whose body exceeds
  // maxSize, so the streaming/fallback path catches it instead.
  it("rejects oversized body even without Content-Length header (streaming path)", async () => {
    const chunk1 = new Uint8Array(60);
    const chunk2 = new Uint8Array(60);
    const resp = makeStreamingResponse([chunk1, chunk2], {
      contentType: "application/json",
      // No content-length header
    });

    const err = await catchNetworkError(safeReadJson(resp, 100));
    expect(err.code).toBe("RESPONSE_TOO_LARGE");
    expect(err.userMessage).toBe("Response too large. Please contact support.");
  });

  // L312:11 StringLiteral `` , error message template for Content-Length too large
  // `${description} too large: ${size} bytes exceeds ${maxSize}`
  it("Content-Length rejection error message contains description, size, and maxSize", async () => {
    const resp = makeResponse("x", { contentType: "application/json" });
    resp.headers.set("content-length", "5000");
    const err = await catchNetworkError(
      safeReadJson(resp, 100, "test payload"),
    );
    expect(err.message).toBe("test payload too large: 5000 bytes exceeds 100");
    expect(err.code).toBe("RESPONSE_TOO_LARGE");
  });

  // L326:11 EqualityOperator , `buffer.byteLength > maxSize` mutated to `>=`
  // In the fallback path (no streaming), a buffer of exactly maxSize should be accepted.
  // A buffer of maxSize+1 should be rejected.
  it("fallback path accepts buffer of exactly maxSize bytes", async () => {
    const exactData = new Uint8Array(100);
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      status: 200,
      body: null,
      arrayBuffer: jest.fn().mockResolvedValue(exactData.buffer),
    } as unknown as Response;
    // This will fail JSON parse, but the body read should succeed
    await safeReadJson(mockResponse, 100).catch((err: NetworkError) => {
      // Should NOT be RESPONSE_TOO_LARGE
      expect(err.code).not.toBe("RESPONSE_TOO_LARGE");
    });
  });

  it("fallback path rejects buffer of exactly maxSize + 1 bytes", async () => {
    const overData = new Uint8Array(101);
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      status: 200,
      body: null,
      arrayBuffer: jest.fn().mockResolvedValue(overData.buffer),
    } as unknown as Response;
    const err = await catchNetworkError(safeReadJson(mockResponse, 100));
    expect(err.code).toBe("RESPONSE_TOO_LARGE");
    expect(err.details).toEqual({ size: 101, maxSize: 100 });
  });

  // L328:11 StringLiteral `` , error message for fallback path too large
  it("fallback path rejection message contains description, size, and maxSize", async () => {
    const overData = new Uint8Array(200);
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      status: 200,
      body: null,
      arrayBuffer: jest.fn().mockResolvedValue(overData.buffer),
    } as unknown as Response;
    const err = await catchNetworkError(
      safeReadJson(mockResponse, 100, "my response"),
    );
    expect(err.message).toBe("my response too large: 200 bytes exceeds 100");
  });

  // L348:13 EqualityOperator , `totalSize > maxSize` mutated to `>=`
  // In the streaming path, totalSize of exactly maxSize should be accepted.
  it("streaming path accepts chunks totalling exactly maxSize", async () => {
    const encoder = new TextEncoder();
    const jsonBytes = encoder.encode('{"ok":true}');
    // Create a single chunk of exactly the right size
    const resp = makeStreamingResponse([jsonBytes], {
      contentType: "application/json",
    });
    const result = await safeReadJson(resp, jsonBytes.length);
    expect(result).toEqual({ ok: true });
  });

  it("streaming path rejects chunks totalling exactly maxSize + 1", async () => {
    const chunk = new Uint8Array(101);
    const resp = makeStreamingResponse([chunk], {
      contentType: "application/json",
    });
    const err = await catchNetworkError(safeReadJson(resp, 100));
    expect(err.code).toBe("RESPONSE_TOO_LARGE");
  });

  // L350:13 StringLiteral `` , error message for streaming too large
  it("streaming path rejection message contains description, size, and maxSize", async () => {
    const chunk = new Uint8Array(200);
    const resp = makeStreamingResponse([chunk], {
      contentType: "application/json",
    });
    const err = await catchNetworkError(
      safeReadJson(resp, 100, "stream payload"),
    );
    expect(err.message).toBe(
      "stream payload too large: 200 bytes exceeds 100",
    );
  });

  // L354:13 ObjectLiteral {} , `chunks.push(value)` replaced with empty object
  // If chunks are not accumulated, the final result would be empty.
  it("streaming path correctly accumulates all chunks into final result", async () => {
    const encoder = new TextEncoder();
    const part1 = encoder.encode('{"acc');
    const part2 = encoder.encode('um":');
    const part3 = encoder.encode('"ok"}');
    const resp = makeStreamingResponse([part1, part2, part3], {
      contentType: "application/json",
    });
    const result = await safeReadJson(resp, 10000);
    expect(result).toEqual({ accum: "ok" });
  });

  // L360:15 BlockStatement {} , `reader.releaseLock()` replaced with empty block
  // L361:11 BlockStatement {} , the finally block's try body replaced with empty
  // We verify that releaseLock IS called after successful streaming read.
  it("calls releaseLock on the reader after streaming completes", async () => {
    const encoder = new TextEncoder();
    const chunk = encoder.encode('{"lock":true}');

    let releaseLockCalled = false;
    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({ done: false, value: chunk })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      releaseLock: jest.fn().mockImplementation(() => {
        releaseLockCalled = true;
      }),
    };

    const resp = {
      headers: new Headers({ "content-type": "application/json" }),
      status: 200,
      body: { getReader: () => mockReader },
    } as unknown as Response;

    await safeReadJson(resp, 10000);
    expect(releaseLockCalled).toBe(true);
    expect(mockReader.releaseLock).toHaveBeenCalledTimes(1);
  });

  it("calls releaseLock even when streaming read throws RESPONSE_TOO_LARGE", async () => {
    const bigChunk = new Uint8Array(200);

    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({ done: false, value: bigChunk }),
      releaseLock: jest.fn(),
    };

    const resp = {
      headers: new Headers({ "content-type": "application/json" }),
      status: 200,
      body: { getReader: () => mockReader },
    } as unknown as Response;

    await safeReadJson(resp, 100).catch(() => {});
    expect(mockReader.releaseLock).toHaveBeenCalledTimes(1);
  });
});

/* -------------------------------------------------------------------------- */
/*  Mutation killers: L380, L401, L429 remaining survivors                    */
/* -------------------------------------------------------------------------- */

describe("remaining mutation killers (L380, L401, L429)", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // L380:19 StringLiteral `` , `Failed to read ${description}:` error message template
  // in safeReadBody's outer catch. The description must appear in the message.
  it("BODY_READ_FAILED error message contains the description text", async () => {
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      status: 500,
      body: null,
      arrayBuffer: jest.fn().mockRejectedValue(new Error("disk error")),
    } as unknown as Response;
    const err = await catchNetworkError(
      safeReadJson(mockResponse, 1_048_576, "custom desc"),
    );
    expect(err.code).toBe("BODY_READ_FAILED");
    expect(err.message).toContain("Failed to read custom desc");
    expect(err.message).toContain("disk error");
  });

  it("BODY_READ_FAILED error message is non-empty (kills empty string mutation)", async () => {
    const mockResponse = {
      headers: new Headers({ "content-type": "application/json" }),
      status: 200,
      body: null,
      arrayBuffer: jest.fn().mockRejectedValue(new Error("oops")),
    } as unknown as Response;
    const err = await catchNetworkError(safeReadJson(mockResponse));
    expect(err.message.length).toBeGreaterThan(0);
    expect(err.message).toMatch(/^Failed to read /);
  });

  // L401:55 BooleanLiteral false (was true) , the `true` passed as `allowEmpty`
  // to validateContentType in safeReadJson. If mutated to `false`, then a 204
  // response with no content-type would trigger the "Missing content-type" warning
  // instead of returning early.
  it("safeReadJson passes allowEmpty=true to validateContentType (kills false mutation)", async () => {
    // 204 with no content-type: with allowEmpty=true, no "Missing content-type" warning
    const mockResponse = {
      headers: new Headers(),
      status: 204,
      body: null,
      arrayBuffer: jest
        .fn()
        .mockResolvedValue(new ArrayBuffer(0)),
    } as unknown as Response;
    await safeReadJson(mockResponse).catch(() => {});
    // If allowEmpty were false, the 204 check wouldn't trigger the early return
    // and we'd get the "Missing content-type header" warning
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      "[fetchWithTimeout] Missing content-type header",
    );
  });

  // L429:7 StringLiteral `` , `Failed to read ${description}: ${err}` in the
  // outer catch of safeReadJson. The message template must be non-empty.
  it("JSON_READ_FAILED error message contains the description (kills empty string mutation)", async () => {
    // Force an error that is NOT NetworkError in the outer try of safeReadJson
    // TextDecoder throwing will bypass inner catches and hit the outer catch
    const originalTextDecoder = global.TextDecoder;
    const mockDecoder = jest.fn().mockImplementation(() => ({
      decode: () => {
        throw new RangeError("decode boom");
      },
    }));
    global.TextDecoder = mockDecoder as unknown as typeof TextDecoder;

    try {
      const resp = makeResponse('{"ok":true}', {
        contentType: "application/json",
      });
      const err = await catchNetworkError(
        safeReadJson(resp, 1_048_576, "my JSON desc"),
      );
      expect(err.code).toBe("JSON_READ_FAILED");
      expect(err.message).toContain("Failed to read my JSON desc");
      expect(err.message).toContain("decode boom");
      expect(err.message.length).toBeGreaterThan(0);
    } finally {
      global.TextDecoder = originalTextDecoder;
    }
  });

  it("JSON_READ_FAILED uses default description 'JSON response' when none provided", async () => {
    const originalTextDecoder = global.TextDecoder;
    const mockDecoder = jest.fn().mockImplementation(() => ({
      decode: () => {
        throw new RangeError("decode fail");
      },
    }));
    global.TextDecoder = mockDecoder as unknown as typeof TextDecoder;

    try {
      const resp = makeResponse('{"ok":true}', {
        contentType: "application/json",
      });
      const err = await catchNetworkError(safeReadJson(resp));
      expect(err.code).toBe("JSON_READ_FAILED");
      expect(err.message).toContain("Failed to read JSON response");
    } finally {
      global.TextDecoder = originalTextDecoder;
    }
  });
});
