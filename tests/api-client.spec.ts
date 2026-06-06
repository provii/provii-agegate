/** @jest-environment jsdom */
// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Mutation-testing-focused tests for src/core/api-client.ts
 *
 * Every string literal, numeric constant, boolean, comparison operator,
 * conditional branch, and mapped value is pinned so that Stryker mutants
 * are killed on first contact.
 */

import {
  HostedBackendClient,
  ApiError,
  truncId,
} from "../src/core/api-client.js";
import type {
  ClientConfig,
  SessionCheckResponse,
} from "../src/core/types.js";
import {
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CLIENT_CONFIG,
  ENVIRONMENT_API_ENDPOINTS,
} from "../src/core/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid CreateChallengeResponse (snake_case wire format). */
function validChallengeResponse(overrides: Record<string, unknown> = {}) {
  return {
    challenge_id: "chal-aaaa-bbbb-cccc-dddddddddddd",
    session_id: "sess-aaaa-bbbb-cccc-dddddddddddd",
    short_code: "123456789012",
    rp_challenge: "rp_challenge_base64url_43chars_padded_ok_ab",
    cutoff_days: 6570,
    verifying_key_id: 12,
    submit_secret: "submit_secret_base64url_43chars_padded_ok_a",
    expires_at: 1800000000,
    status_url: "https://api.test.com/v1/hosted/status/chal-aaaa",
    verify_url: "https://api.test.com/v1/hosted/verify/chal-aaaa",
    qr_code_url: "https://api.test.com/qr/chal-aaaa",
    proof_direction: "over_age",
    ...overrides,
  };
}

/** Minimal valid StatusResponse (wire format). */
function validStatusResponse(overrides: Record<string, unknown> = {}) {
  return {
    status: "pending",
    expires_at: "2027-01-01T00:00:00Z",
    ...overrides,
  };
}

/** Minimal valid RedeemResponse (wire format). */
function validRedeemResponse(overrides: Record<string, unknown> = {}) {
  return {
    status: "verified",
    ...overrides,
  };
}

/** Minimal valid SessionCheckResponse. */
function validSessionCheckResponse(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    verified: true,
    session: {
      sessionId: "sess-123",
      expiresAt: 1800000000,
    },
    ...overrides,
  };
}

/** Build a mock Response with .ok, .status, .json(), .headers. */
function mockResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  const headerMap = new Map(Object.entries(headers));
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: {
      get: (name: string) => headerMap.get(name) ?? null,
    },
  } as unknown as Response;
}

/** Build an error response mock (non-2xx). */
function mockErrorResponse(
  status: number,
  body: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): Response {
  return mockResponse(body, status, headers);
}

/** Default challenge params for createChallenge calls. */
const defaultChallengeParams = {
  codeChallenge: "test-challenge-b64url",
  codeChallengeMethod: "S256" as const,
  origin: "https://example.com",
};

/** Create a client with mock fetch. */
function makeClient(
  fetchMock: jest.Mock,
  configOverrides: Partial<ClientConfig> = {},
) {
  return new HostedBackendClient({
    publicKey: "pk_test_key_001",
    apiEndpoint: "https://api.test.com",
    debug: false,
    fetchImpl: fetchMock,
    ...configOverrides,
  });
}

// ---------------------------------------------------------------------------
// truncId
// ---------------------------------------------------------------------------

describe("truncId", () => {
  test("truncates a long string to first 8 chars plus ellipsis", () => {
    const result = truncId("abcdefghijklmnop");
    expect(result).toBe("abcdefgh...");
  });

  test("returns 'none' for empty string", () => {
    expect(truncId("")).toBe("none");
  });

  test("handles string shorter than 8 chars", () => {
    expect(truncId("abc")).toBe("abc...");
  });

  test("handles exactly 8 chars", () => {
    expect(truncId("12345678")).toBe("12345678...");
  });

  test("the substring starts at index 0", () => {
    // Kills mutant that changes substring(0,8) start index
    expect(truncId("ABCDEFGHIJ")).toMatch(/^ABCDEFGH/);
  });

  test("the substring ends at index 8", () => {
    // Kills mutant that changes substring(0,8) end index
    expect(truncId("ABCDEFGHIJ")).toBe("ABCDEFGH...");
    expect(truncId("ABCDEFGHIJ")).not.toBe("ABCDEFGHI...");
  });

  test("suffix is exactly three dots", () => {
    const result = truncId("abcdefghij");
    expect(result).toMatch(/\.\.\.$/);
    // Ends with exactly 3 dots, not 4
    expect(result).not.toMatch(/\.\.\.\.$/);
    // The last 3 characters are all dots
    expect(result.slice(-3)).toBe("...");
    expect(result.slice(-4, -3)).not.toBe(".");
  });
});

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

describe("ApiError", () => {
  test("sets name to 'ApiError'", () => {
    const err = new ApiError("msg", 400);
    expect(err.name).toBe("ApiError");
  });

  test("stores message, statusCode, code, details", () => {
    const err = new ApiError("msg", 503, "MY_CODE", { foo: 1 });
    expect(err.message).toBe("msg");
    expect(err.statusCode).toBe(503);
    expect(err.code).toBe("MY_CODE");
    expect(err.details).toEqual({ foo: 1 });
  });

  test("stores retryAfterMs", () => {
    const err = new ApiError("msg", 429, "RATE", undefined, 5000);
    expect(err.retryAfterMs).toBe(5000);
  });

  test("retryAfterMs is undefined when not provided", () => {
    const err = new ApiError("msg", 429);
    expect(err.retryAfterMs).toBeUndefined();
  });

  test("extends Error", () => {
    expect(new ApiError("x", 0)).toBeInstanceOf(Error);
  });

  describe("isRateLimitError", () => {
    test("returns true for 429", () => {
      expect(new ApiError("x", 429).isRateLimitError()).toBe(true);
    });

    test("returns false for 428", () => {
      expect(new ApiError("x", 428).isRateLimitError()).toBe(false);
    });

    test("returns false for 430", () => {
      expect(new ApiError("x", 430).isRateLimitError()).toBe(false);
    });

    test("returns false for 500", () => {
      expect(new ApiError("x", 500).isRateLimitError()).toBe(false);
    });

    test("returns false for 0", () => {
      expect(new ApiError("x", 0).isRateLimitError()).toBe(false);
    });
  });

  describe("isTimeoutError", () => {
    test("returns true when code is TIMEOUT", () => {
      expect(new ApiError("x", 0, "TIMEOUT").isTimeoutError()).toBe(true);
    });

    test("returns false when code is NETWORK_ERROR", () => {
      expect(new ApiError("x", 0, "NETWORK_ERROR").isTimeoutError()).toBe(
        false,
      );
    });

    test("returns false when code is undefined", () => {
      expect(new ApiError("x", 0).isTimeoutError()).toBe(false);
    });

    test("returns false for empty string code", () => {
      expect(new ApiError("x", 0, "").isTimeoutError()).toBe(false);
    });
  });

  describe("isRetryable", () => {
    test("returns true for statusCode 500", () => {
      expect(new ApiError("x", 500).isRetryable()).toBe(true);
    });

    test("returns true for statusCode 502", () => {
      expect(new ApiError("x", 502).isRetryable()).toBe(true);
    });

    test("returns true for statusCode 503", () => {
      expect(new ApiError("x", 503).isRetryable()).toBe(true);
    });

    test("returns false for statusCode 499", () => {
      expect(new ApiError("x", 499).isRetryable()).toBe(false);
    });

    test("returns true for TIMEOUT code regardless of status", () => {
      expect(new ApiError("x", 0, "TIMEOUT").isRetryable()).toBe(true);
    });

    test("returns true for NETWORK_ERROR code regardless of status", () => {
      expect(new ApiError("x", 0, "NETWORK_ERROR").isRetryable()).toBe(true);
    });

    test("returns false for 400 with no special code", () => {
      expect(new ApiError("x", 400, "BAD_REQUEST").isRetryable()).toBe(false);
    });

    test("returns false for 429 (rate limit is NOT auto-retried)", () => {
      expect(new ApiError("x", 429, "RATE_LIMIT").isRetryable()).toBe(false);
    });

    test("returns false for 404", () => {
      expect(new ApiError("x", 404).isRetryable()).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// HostedBackendClient constructor
// ---------------------------------------------------------------------------

describe("HostedBackendClient constructor", () => {
  test("defaults environment to production", () => {
    const fetchMock = jest.fn();
    const client = new HostedBackendClient({
      publicKey: "pk_test",
      fetchImpl: fetchMock,
    });
    // Verify it uses production endpoint by making a request
    fetchMock.mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    // checkSession builds URL from apiEndpoint
    void client.checkSession().catch(() => {
      /* ignore */
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://hosted.provii.app"),
      expect.anything(),
    );
  });

  test("uses sandbox endpoint when environment is sandbox", () => {
    const fetchMock = jest.fn();
    const client = new HostedBackendClient({
      publicKey: "pk_test",
      environment: "sandbox",
      fetchImpl: fetchMock,
    });
    fetchMock.mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    void client.checkSession().catch(() => {
      /* ignore */
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://sandbox-hosted.provii.app"),
      expect.anything(),
    );
  });

  test("explicit apiEndpoint overrides environment endpoint", () => {
    const fetchMock = jest.fn();
    const client = new HostedBackendClient({
      publicKey: "pk_test",
      environment: "sandbox",
      apiEndpoint: "https://custom.endpoint.com",
      fetchImpl: fetchMock,
    });
    fetchMock.mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    void client.checkSession().catch(() => {
      /* ignore */
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://custom.endpoint.com"),
      expect.anything(),
    );
  });

  test("defaults timeout to 10000", () => {
    // We verify the timeout by checking AbortController fires at the right time
    // (covered in timeout tests below). Pin the default config value here.
    expect(DEFAULT_CLIENT_CONFIG.timeout).toBe(10000);
  });

  test("defaults debug to false", () => {
    expect(DEFAULT_CLIENT_CONFIG.debug).toBe(false);
  });

  test("custom timeout is used", async () => {
    // Verify that a short timeout causes a timeout error.
    // We use a fetch that never resolves, so the AbortController fires.
    const fetchMock = jest.fn().mockRejectedValue(
      new DOMException("Aborted", "AbortError"),
    );
    const client = makeClient(fetchMock, { timeout: 1 });
    await expect(client.checkSession()).rejects.toThrow("Request timeout");
  });

  test("debug mode emits console.debug messages", () => {
    const debugSpy = jest.spyOn(console, "debug").mockImplementation();
    const fetchMock = jest.fn().mockResolvedValue(
      mockResponse(validSessionCheckResponse()),
    );
    const client = makeClient(fetchMock, { debug: true });
    void client.checkSession().catch(() => {
      /* ignore */
    });
    // Constructor itself should have logged
    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining("[HostedBackendClient]"),
      expect.anything(),
    );
    debugSpy.mockRestore();
  });

  test("debug=false does not emit console.debug", () => {
    const debugSpy = jest.spyOn(console, "debug").mockImplementation();
    const fetchMock = jest.fn();
    makeClient(fetchMock, { debug: false });
    expect(debugSpy).not.toHaveBeenCalled();
    debugSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Constants pinning (kills constant-replacement mutants)
// ---------------------------------------------------------------------------

describe("Constants pinning", () => {
  test("DEFAULT_RETRY_CONFIG.maxRetries is 3", () => {
    expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
  });

  test("DEFAULT_RETRY_CONFIG.initialDelay is 1000", () => {
    expect(DEFAULT_RETRY_CONFIG.initialDelay).toBe(1000);
  });

  test("DEFAULT_RETRY_CONFIG.maxDelay is 10000", () => {
    expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(10000);
  });

  test("DEFAULT_RETRY_CONFIG.backoffMultiplier is 2", () => {
    expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
  });

  test("ENVIRONMENT_API_ENDPOINTS.production is correct URL", () => {
    expect(ENVIRONMENT_API_ENDPOINTS.production).toBe(
      "https://hosted.provii.app",
    );
  });

  test("ENVIRONMENT_API_ENDPOINTS.sandbox is correct URL", () => {
    expect(ENVIRONMENT_API_ENDPOINTS.sandbox).toBe(
      "https://sandbox-hosted.provii.app",
    );
  });

  test("DEFAULT_CLIENT_CONFIG.environment is production", () => {
    expect(DEFAULT_CLIENT_CONFIG.environment).toBe("production");
  });

  test("DEFAULT_CLIENT_CONFIG.apiEndpoint matches production", () => {
    expect(DEFAULT_CLIENT_CONFIG.apiEndpoint).toBe(
      ENVIRONMENT_API_ENDPOINTS.production,
    );
  });
});

// ---------------------------------------------------------------------------
// mapReasonToMessage (exercised through pollStatus)
// ---------------------------------------------------------------------------

describe("mapReasonToMessage via pollStatus", () => {
  let fetchMock: jest.Mock;
  let client: HostedBackendClient;

  beforeEach(() => {
    fetchMock = jest.fn();
    client = makeClient(fetchMock);
  });

  test("EXPIRED reason maps to 'Session expired'", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validStatusResponse({ reason: "EXPIRED", status: "expired" })),
    );
    const result = await client.pollStatus("sess-1");
    expect(result.error).toBe("Session expired");
  });

  test("BANNED reason maps to 'Access denied'", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validStatusResponse({ reason: "BANNED", status: "failed" })),
    );
    const result = await client.pollStatus("sess-1");
    expect(result.error).toBe("Access denied");
  });

  test("INVALID_PROOF reason maps to verification failed message", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        validStatusResponse({ reason: "INVALID_PROOF", status: "failed" }),
      ),
    );
    const result = await client.pollStatus("sess-1");
    expect(result.error).toBe("Verification failed. Please try again.");
  });

  test("MISMATCHED_INPUTS reason maps to verification failed message", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        validStatusResponse({ reason: "MISMATCHED_INPUTS", status: "failed" }),
      ),
    );
    const result = await client.pollStatus("sess-1");
    expect(result.error).toBe("Verification failed. Please try again.");
  });

  test("UNSUPPORTED_VK reason maps to temporarily unavailable message", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        validStatusResponse({ reason: "UNSUPPORTED_VK", status: "failed" }),
      ),
    );
    const result = await client.pollStatus("sess-1");
    expect(result.error).toBe(
      "Verification service is temporarily unavailable. Please try again later.",
    );
  });

  test("ISSUER_NOT_ALLOWED reason maps to not supported message", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        validStatusResponse({ reason: "ISSUER_NOT_ALLOWED", status: "failed" }),
      ),
    );
    const result = await client.pollStatus("sess-1");
    expect(result.error).toBe(
      "This verification method is not supported by the site.",
    );
  });

  test("NONE reason maps to undefined", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validStatusResponse({ reason: "NONE", status: "pending" })),
    );
    const result = await client.pollStatus("sess-1");
    expect(result.error).toBeUndefined();
  });

  test("undefined reason maps to undefined", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validStatusResponse({ status: "pending" })),
    );
    const result = await client.pollStatus("sess-1");
    expect(result.error).toBeUndefined();
  });

  test("unknown reason falls back to 'Verification failed'", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        validStatusResponse({ reason: "SOMETHING_NEW", status: "failed" }),
      ),
    );
    const result = await client.pollStatus("sess-1");
    expect(result.error).toBe("Verification failed");
  });
});

// ---------------------------------------------------------------------------
// getClientSafeMessage (exercised through error responses)
// ---------------------------------------------------------------------------

describe("getClientSafeMessage via error responses", () => {
  let fetchMock: jest.Mock;
  let client: HostedBackendClient;

  beforeEach(() => {
    fetchMock = jest.fn();
    client = makeClient(fetchMock);
  });

  test("400 maps to 'Invalid request'", async () => {
    fetchMock.mockResolvedValueOnce(mockErrorResponse(400, { error: "bad" }));
    await expect(client.checkSession()).rejects.toThrow("Invalid request");
  });

  test("401 maps to 'Authentication required'", async () => {
    fetchMock.mockResolvedValueOnce(mockErrorResponse(401, { error: "unauth" }));
    await expect(client.checkSession()).rejects.toThrow(
      "Authentication required",
    );
  });

  test("403 maps to 'Access denied'", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(403, { error: "forbidden" }),
    );
    await expect(client.checkSession()).rejects.toThrow("Access denied");
  });

  test("404 maps to 'Not found'", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(404, { error: "missing" }),
    );
    await expect(client.checkSession()).rejects.toThrow("Not found");
  });

  test("409 maps to 'Request conflict'", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(409, { error: "conflict" }),
    );
    await expect(client.checkSession()).rejects.toThrow("Request conflict");
  });

  test("429 maps to 'Too many requests'", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(429, { error: "rate" }, {}),
    );
    await expect(client.checkSession()).rejects.toThrow("Too many requests");
  });

  test("500 maps to 'Service temporarily unavailable'", async () => {
    // 500 triggers retry, so we need 4 responses (initial + 3 retries)
    for (let attempt = 0; attempt < 4; attempt++) {
      fetchMock.mockResolvedValueOnce(
        mockErrorResponse(500, { error: "internal" }),
      );
    }
    await expect(client.checkSession()).rejects.toThrow(
      "Service temporarily unavailable",
    );
  });

  test("502 maps to 'Service temporarily unavailable'", async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      fetchMock.mockResolvedValueOnce(
        mockErrorResponse(502, { error: "bad gw" }),
      );
    }
    await expect(client.checkSession()).rejects.toThrow(
      "Service temporarily unavailable",
    );
  });

  test("418 (unlisted status) maps to 'Request failed'", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(418, { error: "teapot" }),
    );
    await expect(client.checkSession()).rejects.toThrow("Request failed");
  });

  test("422 (unlisted status) maps to 'Request failed'", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(422, { error: "unprocessable" }),
    );
    await expect(client.checkSession()).rejects.toThrow("Request failed");
  });
});

// ---------------------------------------------------------------------------
// createChallenge
// ---------------------------------------------------------------------------

describe("createChallenge", () => {
  let fetchMock: jest.Mock;
  let client: HostedBackendClient;

  beforeEach(() => {
    fetchMock = jest.fn();
    client = makeClient(fetchMock);
  });

  test("sends POST to /v1/hosted/challenge", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    await client.createChallenge(defaultChallengeParams);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test.com/v1/hosted/challenge",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("sends correct headers", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    await client.createChallenge(defaultChallengeParams);
    const callOptions = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = callOptions.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["X-Public-Key"]).toBe("pk_test_key_001");
    expect(headers["Idempotency-Key"]).toBeDefined();
    expect(headers["Origin"]).toBe("https://example.com");
  });

  test("Idempotency-Key is a UUID", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    await client.createChallenge(defaultChallengeParams);
    const callOptions = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = callOptions.headers as Record<string, string>;
    // UUID v4 pattern
    expect(headers["Idempotency-Key"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  test("sends correct JSON body", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    await client.createChallenge({
      ...defaultChallengeParams,
      metadata: { page: "signup" },
    });
    const callOptions = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(callOptions.body as string) as Record<
      string,
      unknown
    >;
    expect(body["public_key"]).toBe("pk_test_key_001");
    expect(body["origin"]).toBe("https://example.com");
    expect(body["code_challenge"]).toBe("test-challenge-b64url");
    expect(body["code_challenge_method"]).toBe("S256");
    expect(body["metadata"]).toEqual({ page: "signup" });
  });

  test("maps session_id to sessionId when present", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        validChallengeResponse({ session_id: "sess-override-id" }),
      ),
    );
    const result = await client.createChallenge(defaultChallengeParams);
    expect(result.sessionId).toBe("sess-override-id");
  });

  test("falls back to challenge_id for sessionId when session_id absent", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        validChallengeResponse({ session_id: undefined }),
      ),
    );
    const result = await client.createChallenge(defaultChallengeParams);
    expect(result.sessionId).toBe("chal-aaaa-bbbb-cccc-dddddddddddd");
  });

  test("maps challengeId from challenge_id", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    const result = await client.createChallenge(defaultChallengeParams);
    expect(result.challengeId).toBe("chal-aaaa-bbbb-cccc-dddddddddddd");
  });

  test("maps qrCodeUrl from qr_code_url", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    const result = await client.createChallenge(defaultChallengeParams);
    expect(result.qrCodeUrl).toBe("https://api.test.com/qr/chal-aaaa");
  });

  test("maps challengeCode from short_code", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    const result = await client.createChallenge(defaultChallengeParams);
    expect(result.challengeCode).toBe("123456789012");
  });

  test("maps expiresAt from expires_at", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validChallengeResponse({ expires_at: 9999999 })),
    );
    const result = await client.createChallenge(defaultChallengeParams);
    expect(result.expiresAt).toBe(9999999);
  });

  test("status is always 'pending' on creation", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    const result = await client.createChallenge(defaultChallengeParams);
    expect(result.status).toBe("pending");
  });

  test("maps cutoffDays from cutoff_days", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validChallengeResponse({ cutoff_days: 7300 })),
    );
    const result = await client.createChallenge(defaultChallengeParams);
    expect(result.cutoffDays).toBe(7300);
  });

  test("maps proofDirection from proof_direction", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        validChallengeResponse({ proof_direction: "under_age" }),
      ),
    );
    const result = await client.createChallenge(defaultChallengeParams);
    expect(result.proofDirection).toBe("under_age");
  });

  test("deepLink starts with proviiwallet:// scheme", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    const result = await client.createChallenge(defaultChallengeParams);
    expect(result.deepLink).toMatch(/^proviiwallet:\/\/verify\?d=/);
  });

  test("deepLink d param is URI-encoded base64url JSON", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    const result = await client.createChallenge(defaultChallengeParams);
    // Extract the d= parameter value (URI-decoded)
    const url = new URL(result.deepLink);
    const dParam = url.searchParams.get("d");
    expect(dParam).toBeTruthy();
    // It's base64url, so it should contain only [A-Za-z0-9_-]
    expect(dParam).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test("deepLink payload contains required fields", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    const result = await client.createChallenge(defaultChallengeParams);
    // Decode the deep link payload
    const url = new URL(result.deepLink);
    const dParam = url.searchParams.get("d");
    // base64url decode
    const padded = (dParam ?? "").replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded);
    const payload = JSON.parse(json) as Record<string, unknown>;
    expect(payload["challenge_id"]).toBe("chal-aaaa-bbbb-cccc-dddddddddddd");
    expect(payload["rp_challenge"]).toBe(
      "rp_challenge_base64url_43chars_padded_ok_ab",
    );
    expect(payload["cutoff_days"]).toBe(6570);
    expect(payload["verifying_key_id"]).toBe(12);
    expect(payload["submit_secret"]).toBe(
      "submit_secret_base64url_43chars_padded_ok_a",
    );
    expect(payload["expires_at"]).toBe(1800000000);
    expect(payload["verify_url"]).toBe(
      "https://api.test.com/v1/hosted/verify/chal-aaaa",
    );
    expect(payload["proof_direction"]).toBe("over_age");
  });

  test("signal is passed to fetch for abort support", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    await client.createChallenge(defaultChallengeParams);
    const callOptions = fetchMock.mock.calls[0][1] as RequestInit;
    expect(callOptions.signal).toBeInstanceOf(AbortSignal);
  });
});

// ---------------------------------------------------------------------------
// pollStatus
// ---------------------------------------------------------------------------

describe("pollStatus", () => {
  let fetchMock: jest.Mock;
  let client: HostedBackendClient;

  beforeEach(() => {
    fetchMock = jest.fn();
    client = makeClient(fetchMock);
  });

  test("sends GET to /v1/hosted/status/:sessionId", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validStatusResponse()),
    );
    await client.pollStatus("sess-abc-123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test.com/v1/hosted/status/sess-abc-123",
      expect.objectContaining({ method: "GET" }),
    );
  });

  test("URL-encodes sessionId to prevent path injection", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validStatusResponse()),
    );
    await client.pollStatus("../../../evil");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test.com/v1/hosted/status/..%2F..%2F..%2Fevil",
      expect.anything(),
    );
  });

  test("sends X-Public-Key header", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validStatusResponse()),
    );
    await client.pollStatus("sess-1");
    const callOptions = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = callOptions.headers as Record<string, string>;
    expect(headers["X-Public-Key"]).toBe("pk_test_key_001");
  });

  test("sends Origin header from window.location", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validStatusResponse()),
    );
    await client.pollStatus("sess-1");
    const callOptions = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = callOptions.headers as Record<string, string>;
    expect(headers["Origin"]).toBe("https://localhost");
  });

  describe("state mapping", () => {
    test("'verified' status maps to 'verified' state", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(validStatusResponse({ status: "verified" })),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.state).toBe("verified");
    });

    test("'proof_ok_waiting_for_redeem' maps to 'proof_ok'", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(
          validStatusResponse({ status: "proof_ok_waiting_for_redeem" }),
        ),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.state).toBe("proof_ok");
    });

    test("'failed' maps to 'failed'", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(validStatusResponse({ status: "failed" })),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.state).toBe("failed");
    });

    test("'expired' maps to 'expired'", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(validStatusResponse({ status: "expired" })),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.state).toBe("expired");
    });

    test("'revoked' maps to 'revoked'", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(validStatusResponse({ status: "revoked" })),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.state).toBe("revoked");
    });

    test("'pending' status maps to 'pending' (via fallback)", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(validStatusResponse({ status: "pending" })),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.state).toBe("pending");
    });

    test("unknown status maps to 'pending' (fallback)", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(validStatusResponse({ status: "some_new_status" })),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.state).toBe("pending");
    });
  });

  describe("complete flag", () => {
    test("complete is true only for 'verified' status", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(validStatusResponse({ status: "verified" })),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.complete).toBe(true);
    });

    test("complete is false for 'proof_ok_waiting_for_redeem'", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(
          validStatusResponse({ status: "proof_ok_waiting_for_redeem" }),
        ),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.complete).toBe(false);
    });

    test("complete is false for 'pending'", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(validStatusResponse({ status: "pending" })),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.complete).toBe(false);
    });

    test("complete is false for 'failed'", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(validStatusResponse({ status: "failed" })),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.complete).toBe(false);
    });

    test("complete is false for 'expired'", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(validStatusResponse({ status: "expired" })),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.complete).toBe(false);
    });
  });

  describe("proofVerified flag", () => {
    test("true for 'proof_ok_waiting_for_redeem'", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(
          validStatusResponse({ status: "proof_ok_waiting_for_redeem" }),
        ),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.proofVerified).toBe(true);
    });

    test("true for 'verified'", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(validStatusResponse({ status: "verified" })),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.proofVerified).toBe(true);
    });

    test("false for 'pending'", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(validStatusResponse({ status: "pending" })),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.proofVerified).toBe(false);
    });

    test("false for 'failed'", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(validStatusResponse({ status: "failed" })),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.proofVerified).toBe(false);
    });

    test("false for 'expired'", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(validStatusResponse({ status: "expired" })),
      );
      const result = await client.pollStatus("sess-1");
      expect(result.proofVerified).toBe(false);
    });
  });

  test("sessionId in response matches input", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validStatusResponse()),
    );
    const result = await client.pollStatus("my-session-id");
    expect(result.sessionId).toBe("my-session-id");
  });

  test("expiresAt is computed from ISO date string", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        validStatusResponse({ expires_at: "2027-01-01T00:00:00Z" }),
      ),
    );
    const result = await client.pollStatus("sess-1");
    const expected = new Date("2027-01-01T00:00:00Z").getTime() / 1000;
    expect(result.expiresAt).toBe(expected);
  });

  test("createdAt is 0 (not returned by API)", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validStatusResponse()),
    );
    const result = await client.pollStatus("sess-1");
    expect(result.createdAt).toBe(0);
  });

  test("pollAfter is 0 (not returned by API)", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validStatusResponse()),
    );
    const result = await client.pollStatus("sess-1");
    expect(result.pollAfter).toBe(0);
  });

  test("remainingChecks is 0 (not returned by API)", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validStatusResponse()),
    );
    const result = await client.pollStatus("sess-1");
    expect(result.remainingChecks).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// redeemSession
// ---------------------------------------------------------------------------

describe("redeemSession", () => {
  let fetchMock: jest.Mock;
  let client: HostedBackendClient;

  beforeEach(() => {
    fetchMock = jest.fn();
    client = makeClient(fetchMock);
  });

  test("sends POST to /v1/hosted/redeem/:sessionId", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validRedeemResponse()),
    );
    await client.redeemSession("sess-abc", "verifier-xyz");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test.com/v1/hosted/redeem/sess-abc",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("URL-encodes sessionId in redeem path", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validRedeemResponse()),
    );
    await client.redeemSession("sess/evil%path", "verifier");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("sess%2Fevil%25path"),
      expect.anything(),
    );
  });

  test("sends code_verifier in JSON body", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validRedeemResponse()),
    );
    await client.redeemSession("sess-1", "my-verifier-string");
    const callOptions = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(callOptions.body as string) as Record<
      string,
      unknown
    >;
    expect(body["code_verifier"]).toBe("my-verifier-string");
  });

  test("sends Content-Type application/json header", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validRedeemResponse()),
    );
    await client.redeemSession("sess-1", "v");
    const callOptions = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = callOptions.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  test("sends X-Public-Key header", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validRedeemResponse()),
    );
    await client.redeemSession("sess-1", "v");
    const callOptions = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = callOptions.headers as Record<string, string>;
    expect(headers["X-Public-Key"]).toBe("pk_test_key_001");
  });

  test("sends Idempotency-Key header", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validRedeemResponse()),
    );
    await client.redeemSession("sess-1", "v");
    const callOptions = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = callOptions.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  test("sends credentials: include for cookie binding", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validRedeemResponse()),
    );
    await client.redeemSession("sess-1", "v");
    const callOptions = fetchMock.mock.calls[0][1] as RequestInit;
    expect(callOptions.credentials).toBe("include");
  });

  test("returns status from response", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validRedeemResponse({ status: "verified" })),
    );
    const result = await client.redeemSession("sess-1", "v");
    expect(result.status).toBe("verified");
  });

  test("verifiedAt is approximately Date.now()/1000", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validRedeemResponse()),
    );
    const before = Date.now() / 1000;
    const result = await client.redeemSession("sess-1", "v");
    const after = Date.now() / 1000;
    expect(result.verifiedAt).toBeGreaterThanOrEqual(before);
    expect(result.verifiedAt).toBeLessThanOrEqual(after);
  });

  test("expiresAt is 0 (not returned by API)", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validRedeemResponse()),
    );
    const result = await client.redeemSession("sess-1", "v");
    expect(result.expiresAt).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// checkSession
// ---------------------------------------------------------------------------

describe("checkSession", () => {
  let fetchMock: jest.Mock;
  let client: HostedBackendClient;

  beforeEach(() => {
    fetchMock = jest.fn();
    client = makeClient(fetchMock);
  });

  test("sends GET to /v1/hosted/session/check", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    await client.checkSession();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test.com/v1/hosted/session/check",
      expect.objectContaining({ method: "GET" }),
    );
  });

  test("sends X-Public-Key header", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    await client.checkSession();
    const callOptions = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = callOptions.headers as Record<string, string>;
    expect(headers["X-Public-Key"]).toBe("pk_test_key_001");
  });

  test("sends credentials: include for cookie", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    await client.checkSession();
    const callOptions = fetchMock.mock.calls[0][1] as RequestInit;
    expect(callOptions.credentials).toBe("include");
  });

  test("returns verified=true with session data", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        validSessionCheckResponse({
          verified: true,
          session: { sessionId: "s-42", expiresAt: 12345 },
        }),
      ),
    );
    const result = await client.checkSession();
    expect(result.verified).toBe(true);
    expect(result.session).toBeDefined();
    expect(result.session?.sessionId).toBe("s-42");
    expect(result.session?.expiresAt).toBe(12345);
  });

  test("returns verified=false without session", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ verified: false }),
    );
    const result = await client.checkSession();
    expect(result.verified).toBe(false);
    expect(result.session).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SessionCheckValidator edge cases
// ---------------------------------------------------------------------------

describe("SessionCheckValidator (via checkSession)", () => {
  let fetchMock: jest.Mock;
  let client: HostedBackendClient;

  beforeEach(() => {
    fetchMock = jest.fn();
    client = makeClient(fetchMock);
  });

  test("rejects null response body", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(null));
    await expect(client.checkSession()).rejects.toThrow(
      "Invalid server response",
    );
  });

  test("rejects non-object response", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse("a string"));
    await expect(client.checkSession()).rejects.toThrow(
      "Invalid server response",
    );
  });

  test("rejects missing verified field", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ session: { sessionId: "x", expiresAt: 1 } }),
    );
    await expect(client.checkSession()).rejects.toThrow(
      "Invalid server response",
    );
  });

  test("rejects non-boolean verified field", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ verified: "yes" }),
    );
    await expect(client.checkSession()).rejects.toThrow(
      "Invalid server response",
    );
  });

  test("rejects session that is not an object", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ verified: true, session: "not-an-object" }),
    );
    await expect(client.checkSession()).rejects.toThrow(
      "Invalid server response",
    );
  });

  test("rejects session missing sessionId", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ verified: true, session: { expiresAt: 1 } }),
    );
    await expect(client.checkSession()).rejects.toThrow(
      "Invalid server response",
    );
  });

  test("rejects session missing expiresAt", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ verified: true, session: { sessionId: "x" } }),
    );
    await expect(client.checkSession()).rejects.toThrow(
      "Invalid server response",
    );
  });

  test("accepts null session field", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ verified: false, session: null }),
    );
    const result = await client.checkSession();
    expect(result.verified).toBe(false);
  });

  test("accepts undefined session field", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ verified: false }),
    );
    const result = await client.checkSession();
    expect(result.verified).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RedeemResponseValidator edge cases
// ---------------------------------------------------------------------------

describe("RedeemResponseValidator (via redeemSession)", () => {
  let fetchMock: jest.Mock;
  let client: HostedBackendClient;

  beforeEach(() => {
    fetchMock = jest.fn();
    client = makeClient(fetchMock);
  });

  test("rejects null response body", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(null));
    await expect(client.redeemSession("s", "v")).rejects.toThrow(
      "Invalid server response",
    );
  });

  test("rejects non-object response", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(42));
    await expect(client.redeemSession("s", "v")).rejects.toThrow(
      "Invalid server response",
    );
  });

  test("rejects missing status field", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ foo: "bar" }));
    await expect(client.redeemSession("s", "v")).rejects.toThrow(
      "Invalid server response",
    );
  });

  test("rejects non-string status field", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ status: 123 }));
    await expect(client.redeemSession("s", "v")).rejects.toThrow(
      "Invalid server response",
    );
  });
});

// ---------------------------------------------------------------------------
// Retry logic
// ---------------------------------------------------------------------------

describe("Retry logic", () => {
  let fetchMock: jest.Mock;
  let client: HostedBackendClient;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn();
    client = makeClient(fetchMock);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("retries up to maxRetries (3) times on 500", async () => {
    // 4 total calls: initial + 3 retries, all fail
    for (let attempt = 0; attempt < 4; attempt++) {
      fetchMock.mockResolvedValueOnce(
        mockErrorResponse(500, { error: "fail" }),
      );
    }
    let caughtError: unknown;
    const promise = client.checkSession().catch((err: unknown) => {
      caughtError = err;
    });
    await jest.runAllTimersAsync();
    await promise;

    expect(caughtError).toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  test("succeeds on second attempt after 500", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(500, { error: "fail" }),
    );
    fetchMock.mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    const promise = client.checkSession();
    await jest.runAllTimersAsync();
    const result = await promise;
    expect(result.verified).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("does not retry on 400", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(400, { error: "bad" }),
    );
    await expect(client.checkSession()).rejects.toThrow("Invalid request");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("does not retry on 401", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(401, { error: "unauth" }),
    );
    await expect(client.checkSession()).rejects.toThrow(
      "Authentication required",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("does not retry on 403", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(403, { error: "denied" }),
    );
    await expect(client.checkSession()).rejects.toThrow("Access denied");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("does not retry on 404", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(404, { error: "not found" }),
    );
    await expect(client.checkSession()).rejects.toThrow("Not found");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("does not retry on 429", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(429, { error: "rate" }, {}),
    );
    await expect(client.checkSession()).rejects.toThrow("Too many requests");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("retries network errors (TypeError) up to maxRetries", async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    }
    let caughtError: unknown;
    const promise = client.checkSession().catch((err: unknown) => {
      caughtError = err;
    });
    await jest.runAllTimersAsync();
    await promise;

    expect(caughtError).toBeInstanceOf(ApiError);
    expect((caughtError as ApiError).message).toBe("Network error");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  test("network error eventually succeeds after retries", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    fetchMock.mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    const promise = client.checkSession();
    await jest.runAllTimersAsync();
    const result = await promise;
    expect(result.verified).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Exponential backoff delay calculation
// ---------------------------------------------------------------------------

describe("Exponential backoff timing", () => {
  let fetchMock: jest.Mock;
  let client: HostedBackendClient;
  let setTimeoutSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn();
    client = makeClient(fetchMock);
    setTimeoutSpy = jest.spyOn(globalThis, "setTimeout");
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
    jest.useRealTimers();
  });

  test("first retry delay is baseDelay (1000) plus jitter up to 1000", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(500, { error: "fail" }),
    );
    fetchMock.mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    const promise = client.checkSession();
    await jest.runAllTimersAsync();
    await promise;
    // With jitter the delay is in [1000, 2000). Find the retry sleep call.
    const retrySleepCall = setTimeoutSpy.mock.calls.find(
      (call) => typeof call[1] === "number" && call[1] >= 1000 && call[1] < 2000,
    );
    expect(retrySleepCall).toBeDefined();
  });

  test("second retry delay is baseDelay (2000) plus jitter up to 2000", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(500, { error: "fail" }),
    );
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(500, { error: "fail" }),
    );
    fetchMock.mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    const promise = client.checkSession();
    await jest.runAllTimersAsync();
    await promise;
    const secondRetrySleepCall = setTimeoutSpy.mock.calls.find(
      (call) => typeof call[1] === "number" && call[1] >= 2000 && call[1] < 4000,
    );
    expect(secondRetrySleepCall).toBeDefined();
  });

  test("third retry delay is baseDelay (4000) plus jitter up to 4000", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(500, { error: "fail" }),
    );
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(500, { error: "fail" }),
    );
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(500, { error: "fail" }),
    );
    fetchMock.mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    const promise = client.checkSession();
    await jest.runAllTimersAsync();
    await promise;
    const thirdRetrySleepCall = setTimeoutSpy.mock.calls.find(
      (call) => typeof call[1] === "number" && call[1] >= 4000 && call[1] < 8000,
    );
    expect(thirdRetrySleepCall).toBeDefined();
  });

  test("delay is capped at maxDelay (10000ms)", async () => {
    // If we could get to retry 4+ (which we can't with maxRetries=3),
    // delay = min(1000 * 2^3, 10000) = 8000 which is under cap.
    // But let's verify the cap is applied by checking the math:
    // retry 4 would be min(1000 * 2^3, 10000) = 8000
    // retry 5 would be min(1000 * 2^4, 10000) = min(16000, 10000) = 10000
    // We verify the cap constant is correct.
    expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(10000);
    expect(DEFAULT_RETRY_CONFIG.initialDelay).toBe(1000);
    expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
    // At retryCount=5: min(1000 * 2^4, 10000) = min(16000, 10000) = 10000
    const computedDelay = Math.min(
      DEFAULT_RETRY_CONFIG.initialDelay *
        Math.pow(DEFAULT_RETRY_CONFIG.backoffMultiplier, 4),
      DEFAULT_RETRY_CONFIG.maxDelay,
    );
    expect(computedDelay).toBe(10000);
  });
});

// ---------------------------------------------------------------------------
// Timeout handling
// ---------------------------------------------------------------------------

describe("Timeout handling", () => {
  test("throws ApiError with code TIMEOUT on abort", async () => {
    const fetchMock = jest.fn().mockRejectedValue(
      new DOMException("Aborted", "AbortError"),
    );
    const client = makeClient(fetchMock);
    try {
      await client.checkSession();
      fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiErr = error as ApiError;
      expect(apiErr.message).toBe("Request timeout");
      expect(apiErr.code).toBe("TIMEOUT");
      expect(apiErr.statusCode).toBe(0);
      expect(apiErr.isTimeoutError()).toBe(true);
      expect(apiErr.isRetryable()).toBe(true);
    }
  });

  test("abort signal is attached to fetch call", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockResponse(validSessionCheckResponse()),
    );
    const client = makeClient(fetchMock);
    await client.checkSession();
    const callOptions = fetchMock.mock.calls[0][1] as RequestInit;
    expect(callOptions.signal).toBeDefined();
    expect(callOptions.signal).toBeInstanceOf(AbortSignal);
  });
});

// ---------------------------------------------------------------------------
// Network errors
// ---------------------------------------------------------------------------

describe("Network errors", () => {
  test("TypeError is classified as NETWORK_ERROR after retries exhausted", async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn();
    for (let attempt = 0; attempt < 4; attempt++) {
      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    }
    const client = makeClient(fetchMock);
    let caughtError: unknown;
    const promise = client.checkSession().catch((err: unknown) => {
      caughtError = err;
    });
    await jest.runAllTimersAsync();
    await promise;

    expect(caughtError).toBeInstanceOf(ApiError);
    const apiErr = caughtError as ApiError;
    expect(apiErr.code).toBe("NETWORK_ERROR");
    expect(apiErr.message).toBe("Network error");
    expect(apiErr.statusCode).toBe(0);
    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Unknown errors
// ---------------------------------------------------------------------------

describe("Unknown errors", () => {
  test("non-Error, non-TypeError, non-ApiError throws UNKNOWN_ERROR", async () => {
    const fetchMock = jest.fn().mockRejectedValue("bare string error");
    const client = makeClient(fetchMock);
    try {
      await client.checkSession();
      fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiErr = error as ApiError;
      expect(apiErr.code).toBe("UNKNOWN_ERROR");
      expect(apiErr.message).toBe("An unexpected error occurred");
      expect(apiErr.statusCode).toBe(0);
    }
  });

  test("non-standard Error subclass that is not ApiError or TypeError throws UNKNOWN_ERROR", async () => {
    class CustomError extends Error {
      constructor() {
        super("custom");
        this.name = "CustomError";
      }
    }
    const fetchMock = jest.fn().mockRejectedValue(new CustomError());
    const client = makeClient(fetchMock);
    try {
      await client.checkSession();
      fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiErr = error as ApiError;
      expect(apiErr.code).toBe("UNKNOWN_ERROR");
    }
  });
});

// ---------------------------------------------------------------------------
// Retry-After header parsing
// ---------------------------------------------------------------------------

describe("Retry-After header on 429", () => {
  test("parses valid Retry-After seconds", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockErrorResponse(429, { error: "rate" }, { "Retry-After": "5" }),
    );
    const client = makeClient(fetchMock);
    try {
      await client.checkSession();
      fail("Should have thrown");
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.retryAfterMs).toBe(5000);
    }
  });

  test("retryAfterMs is seconds * 1000", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockErrorResponse(429, { error: "rate" }, { "Retry-After": "10" }),
    );
    const client = makeClient(fetchMock);
    try {
      await client.checkSession();
      fail("Should have thrown");
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.retryAfterMs).toBe(10000);
    }
  });

  test("ignores Retry-After of 0", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockErrorResponse(429, { error: "rate" }, { "Retry-After": "0" }),
    );
    const client = makeClient(fetchMock);
    try {
      await client.checkSession();
      fail("Should have thrown");
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.retryAfterMs).toBeUndefined();
    }
  });

  test("ignores negative Retry-After", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockErrorResponse(429, { error: "rate" }, { "Retry-After": "-5" }),
    );
    const client = makeClient(fetchMock);
    try {
      await client.checkSession();
      fail("Should have thrown");
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.retryAfterMs).toBeUndefined();
    }
  });

  test("ignores Retry-After exceeding 300", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockErrorResponse(429, { error: "rate" }, { "Retry-After": "301" }),
    );
    const client = makeClient(fetchMock);
    try {
      await client.checkSession();
      fail("Should have thrown");
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.retryAfterMs).toBeUndefined();
    }
  });

  test("accepts Retry-After of exactly 300", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockErrorResponse(429, { error: "rate" }, { "Retry-After": "300" }),
    );
    const client = makeClient(fetchMock);
    try {
      await client.checkSession();
      fail("Should have thrown");
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.retryAfterMs).toBe(300000);
    }
  });

  test("accepts Retry-After of exactly 1", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockErrorResponse(429, { error: "rate" }, { "Retry-After": "1" }),
    );
    const client = makeClient(fetchMock);
    try {
      await client.checkSession();
      fail("Should have thrown");
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.retryAfterMs).toBe(1000);
    }
  });

  test("ignores NaN Retry-After", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockErrorResponse(429, { error: "rate" }, { "Retry-After": "abc" }),
    );
    const client = makeClient(fetchMock);
    try {
      await client.checkSession();
      fail("Should have thrown");
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.retryAfterMs).toBeUndefined();
    }
  });

  test("no Retry-After header means retryAfterMs is undefined", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockErrorResponse(429, { error: "rate" }, {}),
    );
    const client = makeClient(fetchMock);
    try {
      await client.checkSession();
      fail("Should have thrown");
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.retryAfterMs).toBeUndefined();
    }
  });

  test("Retry-After is only parsed for 429, not for 500", async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn();
    for (let attempt = 0; attempt < 4; attempt++) {
      fetchMock.mockResolvedValueOnce(
        mockErrorResponse(500, { error: "fail" }, { "Retry-After": "10" }),
      );
    }
    const client = makeClient(fetchMock);
    let caughtError: unknown;
    const promise = client.checkSession().catch((err: unknown) => {
      caughtError = err;
    });
    await jest.runAllTimersAsync();
    await promise;

    expect((caughtError as ApiError).retryAfterMs).toBeUndefined();
    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Error response body parsing
// ---------------------------------------------------------------------------

describe("Error response body parsing", () => {
  test("captures code from error body", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockErrorResponse(400, { error: "bad", code: "MY_ERROR_CODE" }),
    );
    const client = makeClient(fetchMock);
    try {
      await client.checkSession();
      fail("Should have thrown");
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.code).toBe("MY_ERROR_CODE");
    }
  });

  test("handles error response with unparseable JSON body", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => {
        throw new Error("JSON parse failed");
      },
      headers: {
        get: () => null,
      },
    });
    const client = makeClient(fetchMock);
    try {
      await client.checkSession();
      fail("Should have thrown");
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.statusCode).toBe(400);
      expect(apiErr.message).toBe("Invalid request");
      // code should be undefined when body parse fails
      expect(apiErr.code).toBeUndefined();
    }
  });

  test("details are never forwarded from server (always undefined)", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockErrorResponse(400, {
        error: "bad",
        code: "X",
        details: "sensitive internal info",
      }),
    );
    const client = makeClient(fetchMock);
    try {
      await client.checkSession();
      fail("Should have thrown");
    } catch (error) {
      const apiErr = error as ApiError;
      // The constructor is called with `undefined` for details
      expect(apiErr.details).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Response validation errors
// ---------------------------------------------------------------------------

describe("Response validation errors", () => {
  let fetchMock: jest.Mock;
  let client: HostedBackendClient;

  beforeEach(() => {
    fetchMock = jest.fn();
    client = makeClient(fetchMock);
  });

  test("invalid challenge response (missing fields) throws VALIDATION_ERROR", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ challenge_id: "abc" }), // missing many required fields
    );
    try {
      await client.createChallenge(defaultChallengeParams);
      fail("Should have thrown");
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.code).toBe("VALIDATION_ERROR");
      expect(apiErr.message).toBe("Invalid server response");
      expect(apiErr.statusCode).toBe(0);
    }
  });

  test("invalid status response (not an object) throws VALIDATION_ERROR", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(null));
    try {
      await client.pollStatus("sess-1");
      fail("Should have thrown");
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.code).toBe("VALIDATION_ERROR");
    }
  });

  test("invalid status response (missing status field) throws VALIDATION_ERROR", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ expires_at: "2027-01-01T00:00:00Z" }),
    );
    try {
      await client.pollStatus("sess-1");
      fail("Should have thrown");
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.code).toBe("VALIDATION_ERROR");
    }
  });

  test("invalid redeem response (array instead of object) throws VALIDATION_ERROR", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse([1, 2, 3]));
    // Arrays pass typeof === 'object' check but may not have .status
    try {
      await client.redeemSession("s", "v");
      fail("Should have thrown");
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.code).toBe("VALIDATION_ERROR");
    }
  });
});

// ---------------------------------------------------------------------------
// URL construction
// ---------------------------------------------------------------------------

describe("URL construction", () => {
  test("createChallenge uses apiEndpoint + /v1/hosted/challenge", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    const client = makeClient(fetchMock, {
      apiEndpoint: "https://my-api.example.com",
    });
    await client.createChallenge(defaultChallengeParams);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://my-api.example.com/v1/hosted/challenge",
    );
  });

  test("pollStatus uses apiEndpoint + /v1/hosted/status/ + encoded sessionId", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(validStatusResponse()),
    );
    const client = makeClient(fetchMock, {
      apiEndpoint: "https://my-api.example.com",
    });
    await client.pollStatus("sess-42");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://my-api.example.com/v1/hosted/status/sess-42",
    );
  });

  test("redeemSession uses apiEndpoint + /v1/hosted/redeem/ + encoded sessionId", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(validRedeemResponse()),
    );
    const client = makeClient(fetchMock, {
      apiEndpoint: "https://my-api.example.com",
    });
    await client.redeemSession("sess-42", "v");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://my-api.example.com/v1/hosted/redeem/sess-42",
    );
  });

  test("checkSession uses apiEndpoint + /v1/hosted/session/check", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    const client = makeClient(fetchMock, {
      apiEndpoint: "https://my-api.example.com",
    });
    await client.checkSession();
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://my-api.example.com/v1/hosted/session/check",
    );
  });
});

// ---------------------------------------------------------------------------
// Debug logging
// ---------------------------------------------------------------------------

describe("Debug logging", () => {
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    debugSpy = jest.spyOn(console, "debug").mockImplementation();
  });

  afterEach(() => {
    debugSpy.mockRestore();
  });

  test("logs 'Client initialised' on construction when debug=true", () => {
    const fetchMock = jest.fn();
    makeClient(fetchMock, { debug: true });
    expect(debugSpy).toHaveBeenCalledWith(
      "[HostedBackendClient] Client initialised",
      expect.objectContaining({
        environment: expect.anything(),
        apiEndpoint: expect.anything(),
      }),
    );
  });

  test("logs 'Creating challenge' on createChallenge when debug=true", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    const client = makeClient(fetchMock, { debug: true });
    await client.createChallenge(defaultChallengeParams);
    expect(debugSpy).toHaveBeenCalledWith(
      "[HostedBackendClient] Creating challenge",
      "",
    );
  });

  test("logs 'Challenge created' after successful creation", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    const client = makeClient(fetchMock, { debug: true });
    await client.createChallenge(defaultChallengeParams);
    expect(debugSpy).toHaveBeenCalledWith(
      "[HostedBackendClient] Challenge created",
      expect.objectContaining({ sessionId: expect.anything() }),
    );
  });

  test("logs 'Polling status' on pollStatus", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(validStatusResponse()),
    );
    const client = makeClient(fetchMock, { debug: true });
    await client.pollStatus("sess-x");
    expect(debugSpy).toHaveBeenCalledWith(
      "[HostedBackendClient] Polling status",
      expect.objectContaining({ sessionId: expect.anything() }),
    );
  });

  test("logs 'Status received' after polling", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(validStatusResponse()),
    );
    const client = makeClient(fetchMock, { debug: true });
    await client.pollStatus("sess-x");
    expect(debugSpy).toHaveBeenCalledWith(
      "[HostedBackendClient] Status received",
      expect.objectContaining({
        sessionId: expect.anything(),
        state: expect.anything(),
        complete: expect.anything(),
      }),
    );
  });

  test("logs 'Redeeming session' on redeemSession", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(validRedeemResponse()),
    );
    const client = makeClient(fetchMock, { debug: true });
    await client.redeemSession("sess-x", "v");
    expect(debugSpy).toHaveBeenCalledWith(
      "[HostedBackendClient] Redeeming session",
      expect.objectContaining({ sessionId: expect.anything() }),
    );
  });

  test("logs 'Session redeemed' after successful redemption", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(validRedeemResponse()),
    );
    const client = makeClient(fetchMock, { debug: true });
    await client.redeemSession("sess-x", "v");
    expect(debugSpy).toHaveBeenCalledWith(
      "[HostedBackendClient] Session redeemed",
      expect.objectContaining({ sessionId: expect.anything() }),
    );
  });

  test("logs 'Checking session' on checkSession", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    const client = makeClient(fetchMock, { debug: true });
    await client.checkSession();
    expect(debugSpy).toHaveBeenCalledWith(
      "[HostedBackendClient] Checking session",
      "",
    );
  });

  test("logs 'Session check complete' after check", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    const client = makeClient(fetchMock, { debug: true });
    await client.checkSession();
    expect(debugSpy).toHaveBeenCalledWith(
      "[HostedBackendClient] Session check complete",
      expect.objectContaining({ verified: true }),
    );
  });

  test("no debug output when debug=false", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    const client = makeClient(fetchMock, { debug: false });
    await client.checkSession();
    expect(debugSpy).not.toHaveBeenCalled();
  });

  test("log prefix is exactly '[HostedBackendClient] '", () => {
    const fetchMock = jest.fn();
    makeClient(fetchMock, { debug: true });
    const firstCallArgs = debugSpy.mock.calls[0];
    expect(firstCallArgs[0]).toMatch(/^\[HostedBackendClient\] /);
  });

  test("logs API error details on non-2xx response", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockErrorResponse(400, { error: "bad", code: "BAD_REQ" }),
    );
    const client = makeClient(fetchMock, { debug: true });
    await client.checkSession().catch(() => {
      /* expected */
    });
    expect(debugSpy).toHaveBeenCalledWith(
      "[HostedBackendClient] API error",
      expect.objectContaining({
        statusCode: 400,
        serverMessage: "bad",
        code: "BAD_REQ",
      }),
    );
  });

  test("logs request timeout", async () => {
    const fetchMock = jest.fn().mockRejectedValue(
      new DOMException("Aborted", "AbortError"),
    );
    const client = makeClient(fetchMock, { debug: true });
    await client.checkSession().catch(() => {
      /* expected */
    });
    expect(debugSpy).toHaveBeenCalledWith(
      "[HostedBackendClient] Request timeout",
      expect.objectContaining({ url: expect.anything() }),
    );
  });

  test("logs network error", async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn();
    for (let attempt = 0; attempt < 4; attempt++) {
      fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    }
    const client = makeClient(fetchMock, { debug: true });
    const promise = client.checkSession().catch(() => {
      /* expected */
    });
    await jest.runAllTimersAsync();
    await promise;
    expect(debugSpy).toHaveBeenCalledWith(
      "[HostedBackendClient] Network error",
      expect.objectContaining({ error: "fetch failed" }),
    );
    jest.useRealTimers();
  });

  test("logs retry attempts with delay info", async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn();
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(500, { error: "fail" }),
    );
    fetchMock.mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    const client = makeClient(fetchMock, { debug: true });
    const promise = client.checkSession();
    await jest.runAllTimersAsync();
    await promise;
    // Delay includes jitter so check the range [1000, 2000) rather than exact value
    const retryLogCall = debugSpy.mock.calls.find(
      (call) =>
        call[0] === "[HostedBackendClient] Retrying request" &&
        typeof call[1] === "object" &&
        call[1].retryCount === 1 &&
        call[1].delay >= 1000 &&
        call[1].delay < 2000,
    );
    expect(retryLogCall).toBeDefined();
    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Edge cases for challenge creation with missing optional fields
// ---------------------------------------------------------------------------

describe("createChallenge edge cases", () => {
  test("session_id null falls back to challenge_id for sessionId", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(
        validChallengeResponse({ session_id: null }),
      ),
    );
    const client = makeClient(fetchMock);
    const result = await client.createChallenge(defaultChallengeParams);
    expect(result.sessionId).toBe("chal-aaaa-bbbb-cccc-dddddddddddd");
  });

  test("proof_direction undefined is mapped correctly", async () => {
    const resp = validChallengeResponse();
    delete (resp as Record<string, unknown>)["proof_direction"];
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(resp),
    );
    const client = makeClient(fetchMock);
    const result = await client.createChallenge(defaultChallengeParams);
    expect(result.proofDirection).toBeUndefined();
  });

  test("metadata is optional and can be omitted", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    const client = makeClient(fetchMock);
    await client.createChallenge({
      codeChallenge: "ch",
      codeChallengeMethod: "S256",
      origin: "https://example.com",
    });
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    ) as Record<string, unknown>;
    expect(body["metadata"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ApiError re-throw path
// ---------------------------------------------------------------------------

describe("ApiError re-throw in request catch", () => {
  test("ApiError thrown from validator is re-thrown, not wrapped", async () => {
    // The validator throws a VALIDATION_ERROR ApiError, which then gets
    // caught by the outer try-catch. Since it's already an ApiError, it
    // should be re-thrown as-is.
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse({ bad: "data" }), // will fail SessionCheckValidator
    );
    const client = makeClient(fetchMock);
    try {
      await client.checkSession();
      fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiErr = error as ApiError;
      // It should be the VALIDATION_ERROR, not UNKNOWN_ERROR
      expect(apiErr.code).toBe("VALIDATION_ERROR");
    }
  });
});

// ---------------------------------------------------------------------------
// Request method per endpoint
// ---------------------------------------------------------------------------

describe("HTTP methods per endpoint", () => {
  let fetchMock: jest.Mock;
  let client: HostedBackendClient;

  beforeEach(() => {
    fetchMock = jest.fn();
    client = makeClient(fetchMock);
  });

  test("createChallenge uses POST", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    await client.createChallenge(defaultChallengeParams);
    const opts = fetchMock.mock.calls[0][1] as RequestInit;
    expect(opts.method).toBe("POST");
  });

  test("pollStatus uses GET", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validStatusResponse()),
    );
    await client.pollStatus("s");
    const opts = fetchMock.mock.calls[0][1] as RequestInit;
    expect(opts.method).toBe("GET");
  });

  test("redeemSession uses POST", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validRedeemResponse()),
    );
    await client.redeemSession("s", "v");
    const opts = fetchMock.mock.calls[0][1] as RequestInit;
    expect(opts.method).toBe("POST");
  });

  test("checkSession uses GET", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    await client.checkSession();
    const opts = fetchMock.mock.calls[0][1] as RequestInit;
    expect(opts.method).toBe("GET");
  });
});

// ---------------------------------------------------------------------------
// ApiError statusCode boundaries for getClientSafeMessage
// ---------------------------------------------------------------------------

describe("getClientSafeMessage boundary values", () => {
  let fetchMock: jest.Mock;
  let client: HostedBackendClient;

  beforeEach(() => {
    fetchMock = jest.fn();
    client = makeClient(fetchMock);
  });

  test("status 399 is not matched by any specific rule, falls through to 'Request failed'", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(399, { error: "x" }),
    );
    await expect(client.checkSession()).rejects.toThrow("Request failed");
  });

  test("status 499 falls through to 'Request failed'", async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(499, { error: "x" }),
    );
    await expect(client.checkSession()).rejects.toThrow("Request failed");
  });

  test("status 500 exactly triggers 'Service temporarily unavailable'", async () => {
    jest.useFakeTimers();
    const fm = jest.fn();
    for (let attempt = 0; attempt < 4; attempt++) {
      fm.mockResolvedValueOnce(mockErrorResponse(500, { error: "x" }));
    }
    const c = makeClient(fm);
    let caughtError: unknown;
    const p = c.checkSession().catch((err: unknown) => {
      caughtError = err;
    });
    await jest.runAllTimersAsync();
    await p;
    expect((caughtError as ApiError).message).toBe(
      "Service temporarily unavailable",
    );
    jest.useRealTimers();
  });

  test("status 599 triggers 'Service temporarily unavailable'", async () => {
    jest.useFakeTimers();
    const fm = jest.fn();
    for (let attempt = 0; attempt < 4; attempt++) {
      fm.mockResolvedValueOnce(mockErrorResponse(599, { error: "x" }));
    }
    const c = makeClient(fm);
    let caughtError: unknown;
    const p = c.checkSession().catch((err: unknown) => {
      caughtError = err;
    });
    await jest.runAllTimersAsync();
    await p;
    expect((caughtError as ApiError).message).toBe(
      "Service temporarily unavailable",
    );
    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// qr_code_url field in challenge response
// ---------------------------------------------------------------------------

describe("Challenge qr_code_url field mapping", () => {
  test("missing qr_code_url still produces a challenge (field is undefined)", async () => {
    // qr_code_url is not required by ChallengeSchema, so omitting it is fine
    // but it will be undefined in the result
    const resp = validChallengeResponse();
    delete (resp as Record<string, unknown>)["qr_code_url"];
    const fetchMock = jest.fn().mockResolvedValueOnce(mockResponse(resp));
    const client = makeClient(fetchMock);
    const result = await client.createChallenge(defaultChallengeParams);
    expect(result.qrCodeUrl).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Verify clearTimeout is called (both success and error paths)
// ---------------------------------------------------------------------------

describe("Timeout cleanup", () => {
  test("clearTimeout is called on successful response", async () => {
    const clearTimeoutSpy = jest.spyOn(globalThis, "clearTimeout");
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockResponse(validSessionCheckResponse()),
    );
    const client = makeClient(fetchMock);
    await client.checkSession();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  test("clearTimeout is called on error response", async () => {
    const clearTimeoutSpy = jest.spyOn(globalThis, "clearTimeout");
    const fetchMock = jest.fn().mockResolvedValueOnce(
      mockErrorResponse(400, { error: "bad" }),
    );
    const client = makeClient(fetchMock);
    await client.checkSession().catch(() => {
      /* expected */
    });
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Multiple concurrent requests
// ---------------------------------------------------------------------------

describe("Concurrent requests", () => {
  test("multiple simultaneous requests each get their own AbortController", async () => {
    const fetchMock = jest.fn().mockImplementation(async () =>
      mockResponse(validSessionCheckResponse()),
    );
    const client = makeClient(fetchMock);
    await Promise.all([client.checkSession(), client.checkSession()]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const signal1 = (fetchMock.mock.calls[0][1] as RequestInit).signal;
    const signal2 = (fetchMock.mock.calls[1][1] as RequestInit).signal;
    expect(signal1).not.toBe(signal2);
  });
});

// ---------------------------------------------------------------------------
// Full round-trip: createChallenge -> pollStatus -> redeemSession
// ---------------------------------------------------------------------------

describe("Full verification round-trip", () => {
  test("create -> poll pending -> poll proof_ok -> redeem", async () => {
    const fetchMock = jest.fn();
    const client = makeClient(fetchMock);

    // 1. Create challenge
    fetchMock.mockResolvedValueOnce(
      mockResponse(validChallengeResponse()),
    );
    const challenge = await client.createChallenge(defaultChallengeParams);
    expect(challenge.status).toBe("pending");

    // 2. Poll: pending
    fetchMock.mockResolvedValueOnce(
      mockResponse(validStatusResponse({ status: "pending" })),
    );
    const status1 = await client.pollStatus(challenge.sessionId);
    expect(status1.state).toBe("pending");
    expect(status1.complete).toBe(false);

    // 3. Poll: proof_ok_waiting_for_redeem
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        validStatusResponse({ status: "proof_ok_waiting_for_redeem" }),
      ),
    );
    const status2 = await client.pollStatus(challenge.sessionId);
    expect(status2.state).toBe("proof_ok");
    expect(status2.proofVerified).toBe(true);

    // 4. Redeem
    fetchMock.mockResolvedValueOnce(
      mockResponse(validRedeemResponse()),
    );
    const redeemResult = await client.redeemSession(
      challenge.sessionId,
      "verifier",
    );
    expect(redeemResult.status).toBe("verified");
  });
});
