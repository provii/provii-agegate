// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Crash-safe network operations with bounded timeouts.
 *
 * Wraps the Fetch API with automatic abort-controller timeouts, structured
 * error classes, and response body validation helpers. Every thrown error
 * carries both an internal `message` (for debug logging) and a fixed
 * `userMessage` (safe to display in the UI).
 *
 * @module utils/fetchWithTimeout
 */

/**
 * Structured error for network failures.
 *
 * Carries a fixed `userMessage` that is safe to display in the UI and an
 * internal `message` for debug logging. The `code` field enables programmatic
 * error handling without parsing message strings.
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

/* -------------------------------------------------------------------------- */
/*                              Constants                                     */
/* -------------------------------------------------------------------------- */

const DEFAULT_TIMEOUT = 30_000; // 30 seconds default
const MAX_TIMEOUT = 60_000; // 60 seconds maximum
const MIN_TIMEOUT = 1_000; // 1 second minimum

const USER_MESSAGES = {
  TIMEOUT: "Request timed out. Please check your connection and try again.",
  NETWORK_ERROR: "Unable to connect. Please check your internet connection.",
  ABORT: "Request was cancelled.",
  SERVER_ERROR: "Server error. Please try again later.",
  CLIENT_ERROR: "Invalid request. Please refresh and try again.",
  RESPONSE_TOO_LARGE: "Response too large. Please contact support.",
} as const;

/* -------------------------------------------------------------------------- */
/*                          Main Fetch Function                               */
/* -------------------------------------------------------------------------- */

/**
 * Fetch with timeout and structured error handling.
 *
 * @param input - URL or Request object
 * @param init - Fetch options
 * @param timeout - Timeout in milliseconds (bounded to MIN_TIMEOUT..MAX_TIMEOUT)
 * @returns Response object
 * @throws NetworkError with user-friendly message
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeout?: number,
): Promise<Response> {
  // Validate and bound timeout
  const validatedTimeout = validateTimeout(timeout);

  // If no timeout requested, use regular fetch with error handling
  if (!validatedTimeout) {
    return performFetch(input, init);
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), validatedTimeout);

  try {
    // Merge abort signals if one already exists
    const signal = mergeAbortSignals(init.signal, controller.signal);

    const response = await performFetch(input, { ...init, signal });

    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);

    // Check if it was our timeout that caused the abort
    if (controller.signal.aborted && err instanceof Error) {
      throw new NetworkError(
        `Request timed out after ${validatedTimeout}ms`,
        USER_MESSAGES.TIMEOUT,
        "FETCH_TIMEOUT",
        undefined,
        { timeout: validatedTimeout, url: getUrlString(input) },
      );
    }

    // Re-throw if already a NetworkError
    if (err instanceof NetworkError) throw err;

    // Must be some other error
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/*                         Retry Classification + Wrapper                      */
/* -------------------------------------------------------------------------- */

/**
 * Classify a fetch failure as transient (worth a retry) or terminal.
 *
 * Transient: 5xx server errors (including the cold-start 500 on the first
 * request to a cold isolate) and {@link NetworkError}s for timeouts and dropped
 * connections (`FETCH_TIMEOUT` / `NETWORK_FAILURE` / `BROWSER_TIMEOUT`).
 *
 * Terminal: 4xx client/policy errors (400/401/403/404/409/410/429). These are
 * deterministic, so retrying cannot help and may waste the user's time. The
 * thrown errors are an error object carrying `code = "HTTP_<status>"` for HTTP
 * responses, or a `NetworkError` (with `name === "NetworkError"`) for transport
 * failures.
 *
 * This lives here (next to {@link NetworkError}) so both the XState machine and
 * the imperative redeem path classify failures identically without a circular
 * import between those two modules.
 */
export function isRetryableFetchError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; name?: unknown };
  const code = typeof e.code === "string" ? e.code : "";
  if (/^HTTP_5\d\d$/.test(code)) return true; // 5xx, incl. cold-start 500
  if (e.name === "NetworkError") return true; // FETCH_TIMEOUT / NETWORK_FAILURE
  return false;
}

/** True for an HTTP status that is transient and worth retrying. */
function isRetryableStatus(status: number): boolean {
  return status >= 500 && status <= 599;
}

/** Options for {@link fetchWithRetry}. */
export interface FetchRetryOptions {
  /** Maximum number of RETRIES after the first attempt. Default 2 (3 tries). */
  maxRetries?: number;
  /** Base backoff in ms; grows exponentially per attempt. Default 600. */
  baseDelayMs?: number;
  /** Upper bound on any single backoff wait. Default 5000ms. */
  maxDelayMs?: number;
}

const DEFAULT_FETCH_RETRY: Required<FetchRetryOptions> = {
  maxRetries: 2,
  baseDelayMs: 600,
  maxDelayMs: 5_000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * {@link fetchWithTimeout} with bounded exponential-backoff retries for
 * TRANSIENT failures only.
 *
 * A retry is attempted when, and only when, either:
 * - the underlying fetch threw a retryable error ({@link isRetryableFetchError},
 *   i.e. a timeout or a dropped connection), or
 * - the response came back with a 5xx status.
 *
 * A returned 4xx (including 409/410) is treated as terminal and returned to the
 * caller immediately, so the caller's own status handling decides what it means.
 * The final attempt's response (even if 5xx) is returned, and the final
 * attempt's thrown error (if every attempt threw) is re-thrown unchanged, so
 * callers keep their existing error shapes.
 *
 * SAFETY: retries reuse the SAME `init` (and therefore the same
 * `Idempotency-Key`, if the caller set one), so retrying a non-idempotent write
 * is safe only when the server deduplicates on that key. Do not use this
 * wrapper for writes that lack an idempotency key.
 *
 * Backoff: `baseDelayMs * 2^(retryIndex)`, capped at `maxDelayMs` (e.g. 600ms,
 * then 1200ms for the defaults).
 *
 * @param input - URL or Request.
 * @param init - Fetch options, reused across attempts.
 * @param timeout - Per-attempt timeout in ms (passed to fetchWithTimeout).
 * @param options - Retry budget and backoff tuning.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeout?: number,
  options: FetchRetryOptions = {},
): Promise<Response> {
  const cfg = { ...DEFAULT_FETCH_RETRY, ...options };
  const totalAttempts = cfg.maxRetries + 1;

  let lastError: unknown;
  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    const isLastAttempt = attempt === totalAttempts - 1;
    try {
      const res = await fetchWithTimeout(input, init, timeout);
      // A 5xx is transient: retry unless this was the last attempt, in which
      // case return it so the caller can produce its own terminal error.
      if (isRetryableStatus(res.status) && !isLastAttempt) {
        await sleep(backoffDelay(attempt, cfg));
        continue;
      }
      // 2xx, 3xx, 4xx, or a 5xx on the final attempt: hand back to the caller.
      return res;
    } catch (err) {
      lastError = err;
      // Non-retryable error, or budget exhausted: surface it unchanged.
      if (!isRetryableFetchError(err) || isLastAttempt) {
        throw err;
      }
      await sleep(backoffDelay(attempt, cfg));
    }
  }

  // Unreachable in practice (the loop always returns or throws), but keeps the
  // type checker happy and fails safe if the budget were ever zero.
  throw lastError ?? new Error("fetchWithRetry: no attempts were made");
}

/** Exponential backoff for a given zero-based retry index, capped. */
function backoffDelay(
  attemptIndex: number,
  cfg: Required<FetchRetryOptions>,
): number {
  const delay = cfg.baseDelayMs * Math.pow(2, attemptIndex);
  return Math.min(delay, cfg.maxDelayMs);
}

/* -------------------------------------------------------------------------- */
/*                           Helper Functions                                 */
/* -------------------------------------------------------------------------- */

/**
 * Validate and bound timeout value
 */
function validateTimeout(timeout?: number): number | null {
  if (timeout === undefined || timeout === null) {
    return DEFAULT_TIMEOUT;
  }

  if (typeof timeout !== "number" || !isFinite(timeout)) {
    console.warn(
      "[fetchWithTimeout] Invalid timeout value, using default:",
      timeout,
    );
    return DEFAULT_TIMEOUT;
  }

  if (timeout <= 0) {
    // Zero or negative timeouts would allow unbounded requests.
    // Clamp to MIN_TIMEOUT as a safety floor.
    console.warn(
      `[fetchWithTimeout] Non-positive timeout (${timeout}ms), clamping to minimum ${MIN_TIMEOUT}ms`,
    );
    return MIN_TIMEOUT;
  }

  // Bound to min/max
  if (timeout < MIN_TIMEOUT) {
    console.warn(
      `[fetchWithTimeout] Timeout too short (${timeout}ms), using minimum ${MIN_TIMEOUT}ms`,
    );
    return MIN_TIMEOUT;
  }

  if (timeout > MAX_TIMEOUT) {
    console.warn(
      `[fetchWithTimeout] Timeout too long (${timeout}ms), using maximum ${MAX_TIMEOUT}ms`,
    );
    return MAX_TIMEOUT;
  }

  return timeout;
}

/**
 * Perform fetch with error handling
 */
async function performFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  try {
    const response = await fetch(input, init);

    // Log non-success status codes for debugging
    if (!response.ok) {
      console.warn(
        `[fetchWithTimeout] HTTP ${String(response.status)} ${response.statusText} for ${getUrlString(input)}`,
      );
    }

    return response;
  } catch (err) {
    // Handle different error types
    if (err instanceof TypeError) {
      // Network error (no connection, CORS, etc.)
      // Log the raw message for debugging but use a fixed string in the
      // NetworkError so that internal details are never forwarded to callers.
      console.error("[fetchWithTimeout] Network error:", err.message);
      throw new NetworkError(
        "Network request failed",
        USER_MESSAGES.NETWORK_ERROR,
        "NETWORK_FAILURE",
        undefined,
        { url: getUrlString(input) },
      );
    }

    if (err instanceof Error) {
      // Check for abort errors
      if (err.name === "AbortError") {
        throw new NetworkError(
          "Request was aborted",
          USER_MESSAGES.ABORT,
          "FETCH_ABORTED",
          undefined,
          { url: getUrlString(input) },
        );
      }

      // Check for timeout errors from the browser
      if (err.message?.toLowerCase().includes("timeout")) {
        throw new NetworkError(
          "Browser request timeout",
          USER_MESSAGES.TIMEOUT,
          "BROWSER_TIMEOUT",
          undefined,
          { url: getUrlString(input) },
        );
      }
    }

    // Unknown error type -- log for debug, but emit a fixed message
    console.error("[fetchWithTimeout] Unexpected error:", err);
    throw new NetworkError(
      "Unexpected fetch error",
      USER_MESSAGES.NETWORK_ERROR,
      "FETCH_UNEXPECTED",
      undefined,
      { url: getUrlString(input) },
    );
  }
}

/**
 * Merge multiple abort signals
 */
function mergeAbortSignals(
  existing?: AbortSignal | null,
  newSignal?: AbortSignal,
): AbortSignal | undefined {
  if (!existing) return newSignal;
  if (!newSignal) return existing;

  // Create a new controller that aborts when either signal aborts.
  // Use { once: true } so listeners auto-remove after first fire,
  // preventing a minor leak if the signals outlive the fetch request.
  const controller = new AbortController();

  const onAbort = () => controller.abort();

  existing.addEventListener("abort", onAbort, { once: true });
  newSignal.addEventListener("abort", onAbort, { once: true });

  // Clean up listeners if already aborted
  if (existing.aborted || newSignal.aborted) {
    controller.abort();
  }

  return controller.signal;
}

/**
 * Get a redacted URL string from various input types.
 *
 * Query parameters are stripped because they may contain tokens, API
 * keys, or other sensitive values. Only the origin + pathname are kept
 * so error details remain useful for debugging without leaking secrets.
 */
function getUrlString(input: RequestInfo | URL): string {
  try {
    let raw: string;
    if (typeof input === "string") {
      raw = input;
    } else if (input instanceof URL) {
      raw = input.toString();
    } else if (input instanceof Request) {
      raw = input.url;
    } else {
      return "<unknown>";
    }

    // Strip query string and fragment to avoid logging tokens
    const parsed = new URL(raw);
    const redacted = parsed.origin + parsed.pathname;
    if (parsed.search) {
      return redacted + "?[REDACTED]";
    }
    return redacted;
  } catch {
    // If URL parsing fails, truncate to origin-like prefix as fallback
    const questionMarkIndex = (typeof input === "string" ? input : "").indexOf(
      "?",
    );
    if (questionMarkIndex > 0) {
      return (input as string).substring(0, questionMarkIndex) + "?[REDACTED]";
    }
    return "<unknown>";
  }
}

/* -------------------------------------------------------------------------- */
/*                     Response Validation Helpers                            */
/* -------------------------------------------------------------------------- */

/**
 * Check if response has expected content type
 */
function validateContentType(
  response: Response,
  expectedType: string,
  allowEmpty: boolean = false,
): void {
  const contentType = response.headers.get("content-type");

  // Handle empty responses
  if (!contentType) {
    if (allowEmpty && response.status === 204) return;

    console.warn("[fetchWithTimeout] Missing content-type header");
    return; // Be lenient about missing content-type
  }

  // Check if content type matches (case-insensitive, ignore charset)
  const normalizedType = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  const normalizedExpected = expectedType.toLowerCase();

  if (!normalizedType.startsWith(normalizedExpected)) {
    console.warn(
      `[fetchWithTimeout] Unexpected content-type: ${contentType}, expected: ${expectedType}`,
    );
  }
}

/**
 * Safely read response body with size limit
 */
async function safeReadBody(
  response: Response,
  maxSize: number = 10 * 1024 * 1024, // 10MB default
  description: string = "response",
): Promise<ArrayBuffer> {
  try {
    // Check Content-Length if available
    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (!isNaN(size) && size > maxSize) {
        throw new NetworkError(
          `${description} too large: ${size} bytes exceeds ${maxSize}`,
          USER_MESSAGES.RESPONSE_TOO_LARGE,
          "RESPONSE_TOO_LARGE",
          response.status,
          { size, maxSize },
        );
      }
    }

    // Read body with streaming size check
    const reader = response.body?.getReader();
    if (!reader) {
      // Fallback for environments without streaming
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > maxSize) {
        throw new NetworkError(
          `${description} too large: ${buffer.byteLength} bytes exceeds ${maxSize}`,
          USER_MESSAGES.RESPONSE_TOO_LARGE,
          "RESPONSE_TOO_LARGE",
          response.status,
          { size: buffer.byteLength, maxSize },
        );
      }
      return buffer;
    }

    // Stream with size checking
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalSize += value.length;
        if (totalSize > maxSize) {
          throw new NetworkError(
            `${description} too large: ${totalSize} bytes exceeds ${maxSize}`,
            USER_MESSAGES.RESPONSE_TOO_LARGE,
            "RESPONSE_TOO_LARGE",
            response.status,
            { size: totalSize, maxSize },
          );
        }

        chunks.push(value);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // Ignore release errors
      }
    }

    // Combine chunks
    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result.buffer;
  } catch (err) {
    if (err instanceof NetworkError) throw err;

    console.error(`[fetchWithTimeout] Failed to read ${description}:`, err);
    throw new NetworkError(
      `Failed to read ${description}: ${err}`,
      "Failed to read server response. Please try again.",
      "BODY_READ_FAILED",
      response.status,
      err,
    );
  }
}

/**
 * Safely read JSON response with validation
 */
export async function safeReadJson<T = unknown>(
  response: Response,
  maxSize: number = 1024 * 1024, // 1MB default
  description: string = "JSON response",
): Promise<T> {
  try {
    // Validate content type
    validateContentType(response, "application/json", true);

    // Read body with size limit
    const buffer = await safeReadBody(response, maxSize, description);

    // Convert to text
    const text = new TextDecoder("utf-8").decode(buffer);

    // Parse JSON
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      console.error("[fetchWithTimeout] JSON parse failed:", parseErr);

      // Include first 100 chars for debugging
      const preview = text.length > 100 ? text.substring(0, 100) + "..." : text;
      throw new NetworkError(
        `Invalid JSON in ${description}: ${parseErr}`,
        "Invalid response format. Please try again.",
        "JSON_PARSE_FAILED",
        response.status,
        { parseError: parseErr, preview },
      );
    }
  } catch (err) {
    if (err instanceof NetworkError) throw err;

    throw new NetworkError(
      `Failed to read ${description}: ${err}`,
      "Failed to process server response. Please try again.",
      "JSON_READ_FAILED",
      response.status,
      err,
    );
  }
}
