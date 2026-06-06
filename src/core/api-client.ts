// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Hosted backend API client.
 *
 * Type-safe client for communicating with the Provii hosted backend.
 * Handles authentication via public key headers, automatic retries with
 * exponential backoff, request timeouts, and runtime response validation.
 *
 * All server error text is mapped to fixed, client-safe messages so that
 * internal details are never forwarded to external consumers.
 *
 * @module core/api-client
 */

import type {
  ClientConfig,
  Challenge,
  ChallengeParams,
  StatusResponse,
  RedeemResponse,
  SessionCheckResponse,
  ApiErrorResponse,
  RetryConfig,
  SessionState,
} from "./types.js";
import {
  DEFAULT_CLIENT_CONFIG,
  DEFAULT_RETRY_CONFIG,
  ENVIRONMENT_API_ENDPOINTS,
} from "./types.js";
import type {
  CreateChallengeResponse,
  StatusResponse as ApiStatusResponse,
  RedeemResponse as ApiRedeemResponse,
} from "../api/v1.js";
import { ChallengeSchema, StatusSchema } from "../types/api.js";
import { bytesToB64urlStrict } from "../utils/base64.js";
import { cacheServerFailureMode } from "./failure-mode.js";

/**
 * Truncate an identifier for safe debug logging.
 * Prevents full session IDs from appearing in console output.
 */
export const truncId = (id: string): string =>
  id ? `${id.substring(0, 8)}...` : "none";

/**
 * Map server reason codes to user-friendly text.
 *
 * The raw reason string from the API is never exposed directly;
 * callers only see these fixed messages.
 */
function mapReasonToMessage(reason?: string): string | undefined {
  if (!reason || reason === "NONE") return undefined;

  const reasonMessageMap: Record<string, string> = {
    EXPIRED: "Session expired",
    BANNED: "Access denied",
    INVALID_PROOF: "Verification failed. Please try again.",
    MISMATCHED_INPUTS: "Verification failed. Please try again.",
    UNSUPPORTED_VK:
      "Verification service is temporarily unavailable. Please try again later.",
    ISSUER_NOT_ALLOWED:
      "This verification method is not supported by the site.",
  };

  return reasonMessageMap[reason] ?? "Verification failed";
}

/**
 * Runtime validator interface matching the parse() pattern used by ChallengeSchema/StatusSchema
 */
interface ResponseValidator<T> {
  parse: (data: unknown) => T;
}

/**
 * Validator for redeem responses (IV-713: runtime validation of API responses)
 */
const RedeemResponseValidator: ResponseValidator<ApiRedeemResponse> = {
  parse: (obj: unknown): ApiRedeemResponse => {
    if (!obj || typeof obj !== "object") {
      throw new Error("Invalid redeem response: not an object");
    }
    const o = obj as Record<string, unknown>;
    if (typeof o["status"] !== "string")
      throw new Error("Invalid redeem response: missing status");
    return obj as ApiRedeemResponse;
  },
};

/**
 * Validator for session check responses (IV-713: runtime validation of API responses)
 */
const SessionCheckValidator: ResponseValidator<SessionCheckResponse> = {
  parse: (obj: unknown): SessionCheckResponse => {
    if (!obj || typeof obj !== "object") {
      throw new Error("Invalid session check response: not an object");
    }
    const o = obj as Record<string, unknown>;
    if (typeof o["verified"] !== "boolean")
      throw new Error("Invalid session check response: missing verified");
    if (o["session"] !== undefined && o["session"] !== null) {
      if (typeof o["session"] !== "object")
        throw new Error(
          "Invalid session check response: session must be an object",
        );
      const session = o["session"] as Record<string, unknown>;
      if (typeof session["sessionId"] !== "string")
        throw new Error(
          "Invalid session check response: missing session.sessionId",
        );
      if (typeof session["expiresAt"] !== "number")
        throw new Error(
          "Invalid session check response: missing session.expiresAt",
        );
    }
    return obj as SessionCheckResponse;
  },
};

/**
 * API error class with structured error information
 */
export class ApiError extends Error {
  /**
   * M-44: When the server returns a 429 with a Retry-After header, this
   * field contains the parsed delay in milliseconds. Polling layers can
   * use it as the next poll interval instead of their default backoff.
   */
  public readonly retryAfterMs?: number;

  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly details?: unknown,
    retryAfterMs?: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.retryAfterMs = retryAfterMs;
  }

  /**
   * Check if error is a rate limit error
   */
  isRateLimitError(): boolean {
    return this.statusCode === 429;
  }

  /**
   * Check if error is a timeout error
   */
  isTimeoutError(): boolean {
    return this.code === "TIMEOUT";
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    // Network errors and 5xx are retryable
    return (
      this.statusCode >= 500 ||
      this.code === "TIMEOUT" ||
      this.code === "NETWORK_ERROR"
    );
  }
}

/**
 * Hosted Backend API Client
 *
 * Provides type-safe methods for all hosted backend endpoints:
 * - POST /v1/hosted/challenge - Create verification challenge
 * - GET /v1/hosted/status/:session_id - Poll verification status
 * - POST /v1/hosted/redeem/:session_id - Redeem verified session
 * - GET /v1/hosted/session/check - Check existing session
 */
export class HostedBackendClient {
  private readonly config: Required<ClientConfig>;
  private readonly retryConfig: RetryConfig;
  private readonly fetchImpl: typeof fetch;

  constructor(config: ClientConfig) {
    // Determine environment (defaults to production)
    const environment =
      config.environment || DEFAULT_CLIENT_CONFIG.environment || "production";

    // Determine API endpoint: explicit > environment-based > default
    const apiEndpoint =
      config.apiEndpoint || ENVIRONMENT_API_ENDPOINTS[environment];

    // Reject non-HTTPS endpoints (except localhost for local development)
    if (apiEndpoint) {
      const lower = apiEndpoint.toLowerCase();
      let isLocalDev = false;
      try {
        const parsed = new URL(apiEndpoint);
        const h = parsed.hostname;
        isLocalDev =
          h === "localhost" ||
          h === "127.0.0.1" ||
          h === "[::1]" ||
          h === "::1";
      } catch {
        // malformed URL , let the fetch layer handle it
      }
      if (!lower.startsWith("https://") && !isLocalDev) {
        throw new Error(
          `apiEndpoint must use https:// (got "${apiEndpoint.slice(0, 40)}")`,
        );
      }
    }

    this.config = {
      publicKey: config.publicKey,
      environment,
      apiEndpoint,
      timeout: config.timeout ?? DEFAULT_CLIENT_CONFIG.timeout ?? 10000,
      debug: config.debug ?? DEFAULT_CLIENT_CONFIG.debug ?? false,
      fetchImpl: config.fetchImpl ?? globalThis.fetch.bind(globalThis),
      // Carried only to key the failure-mode cache; never acted on here.
      onUnavailable: config.onUnavailable ?? null,
    };

    this.retryConfig = DEFAULT_RETRY_CONFIG;
    this.fetchImpl = config.fetchImpl || globalThis.fetch.bind(globalThis);

    this.log("Client initialised", {
      environment: this.config.environment,
      apiEndpoint: this.config.apiEndpoint,
    });
  }

  /**
   * Create a new verification challenge
   *
   * POST /v1/hosted/challenge
   *
   * @param params Challenge parameters
   * @returns Challenge information including QR code URL
   * @throws ApiError on failure
   */
  async createChallenge(params: ChallengeParams): Promise<Challenge> {
    this.log("Creating challenge");

    const url = `${this.config.apiEndpoint}/v1/hosted/challenge`;
    const body: Record<string, unknown> = {
      public_key: this.config.publicKey,
      origin: params.origin,
      code_challenge: params.codeChallenge,
      code_challenge_method: params.codeChallengeMethod,
      metadata: params.metadata,
    };

    const idempotencyKey = crypto.randomUUID();
    const response = await this.request<CreateChallengeResponse>(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Public-Key": this.config.publicKey,
          "Idempotency-Key": idempotencyKey,
          Origin: params.origin,
        },
        body: JSON.stringify(body),
      },
      0,
      ChallengeSchema as ResponseValidator<CreateChallengeResponse>,
    );

    this.log("Challenge created", {
      sessionId: truncId(response.challenge_id),
    });

    // Build deep link payload for wallet app
    const deepLinkPayload = {
      challenge_id: response.challenge_id,
      rp_challenge: response.rp_challenge,
      cutoff_days: response.cutoff_days,
      verifying_key_id: response.verifying_key_id,
      submit_secret: response.submit_secret,
      expires_at: response.expires_at,
      verify_url: response.verify_url,
      proof_direction: response.proof_direction,
    };
    const deepLinkJson64 = bytesToB64urlStrict(
      new TextEncoder().encode(JSON.stringify(deepLinkPayload)),
    );
    const deepLink = `proviiwallet://verify?d=${encodeURIComponent(deepLinkJson64)}`;

    const failureMode =
      response.failure_mode === "block" ||
      response.failure_mode === "allow" ||
      response.failure_mode === "defer"
        ? response.failure_mode
        : undefined;

    const challenge: Challenge = {
      sessionId: response.session_id ?? response.challenge_id,
      challengeId: response.challenge_id,
      qrCodeUrl: response.qr_code_url,
      challengeCode: response.short_code,
      expiresAt: response.expires_at,
      deepLink,
      status: "pending",
      cutoffDays: response.cutoff_days,
      proofDirection: response.proof_direction,
      ...(failureMode ? { failureMode } : {}),
      failureModeLocked: response.failure_mode_locked ?? false,
    };

    // Cache the server-configured failure mode (keyed by public key) so it
    // survives a later outage, when the challenge response cannot be fetched.
    if (failureMode) {
      cacheServerFailureMode(
        this.config.publicKey,
        failureMode,
        this.config.onUnavailable,
      );
    }
    return challenge;
  }

  /**
   * Poll verification status
   *
   * GET /v1/hosted/status/:session_id
   *
   * @param sessionId Session identifier
   * @returns Current session status
   * @throws ApiError on failure
   */
  async pollStatus(sessionId: string): Promise<StatusResponse> {
    this.log("Polling status", { sessionId: truncId(sessionId) });

    // IV-714: URL-encode sessionId to prevent path injection
    const url = `${this.config.apiEndpoint}/v1/hosted/status/${encodeURIComponent(sessionId)}`;
    const origin = window.location.origin;

    const response = await this.request<ApiStatusResponse>(
      url,
      {
        method: "GET",
        headers: {
          "X-Public-Key": this.config.publicKey,
          Origin: origin,
        },
      },
      0,
      StatusSchema as ResponseValidator<ApiStatusResponse>,
    );

    // Map API wire status to SDK SessionState
    const stateMap: Record<string, SessionState> = {
      verified: "verified",
      proof_ok_waiting_for_redeem: "proof_ok",
      failed: "failed",
      expired: "expired",
      revoked: "revoked",
    };
    const state: SessionState = stateMap[response.status] ?? "pending";
    const complete = response.status === "verified";

    this.log("Status received", {
      sessionId: truncId(sessionId),
      state,
      complete,
    });

    const computedExpiresAt = new Date(response.expires_at).getTime() / 1000;
    if (!Number.isFinite(computedExpiresAt)) {
      throw new ApiError(
        "Invalid expires_at in status response",
        0,
        "VALIDATION_ERROR",
      );
    }

    const statusResponse: StatusResponse = {
      sessionId: sessionId,
      state,
      complete,
      createdAt: 0, // Not returned by API
      expiresAt: computedExpiresAt,
      proofVerified:
        response.status === "proof_ok_waiting_for_redeem" ||
        response.status === "verified",
      pollAfter: 0, // Not returned by API
      remainingChecks: 0, // Not returned by API
      error: mapReasonToMessage(response.reason),
    };
    return statusResponse;
  }

  /**
   * Redeem verified session
   *
   * POST /v1/hosted/redeem/:session_id
   *
   * @param sessionId Session identifier
   * @param verifier PKCE code verifier
   * @returns Redemption result with session cookie set
   * @throws ApiError on failure
   */
  async redeemSession(
    sessionId: string,
    verifier: string,
  ): Promise<RedeemResponse> {
    this.log("Redeeming session", { sessionId: truncId(sessionId) });

    // IV-714: URL-encode sessionId to prevent path injection
    const url = `${this.config.apiEndpoint}/v1/hosted/redeem/${encodeURIComponent(sessionId)}`;
    const origin = window.location.origin;

    const idempotencyKey = crypto.randomUUID();
    const response = await this.request<ApiRedeemResponse>(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Public-Key": this.config.publicKey,
          "Idempotency-Key": idempotencyKey,
          Origin: origin,
        },
        body: JSON.stringify({
          code_verifier: verifier,
        }),
        // SECURITY: credentials: 'include' sends the HttpOnly session cookie
        // so that the hosted backend can bind the redemption to the browser.
        credentials: "include",
      },
      0,
      RedeemResponseValidator as ResponseValidator<ApiRedeemResponse>,
    );

    this.log("Session redeemed", { sessionId: truncId(sessionId) });
    const redeemResponse: RedeemResponse = {
      status: response.status,
      verifiedAt: Date.now() / 1000, // Not returned by API
      expiresAt: 0, // Not returned by API
    };
    return redeemResponse;
  }

  /**
   * Check for existing session
   *
   * GET /v1/hosted/session/check
   *
   * @returns Session check result
   * @throws ApiError on failure
   */
  async checkSession(): Promise<SessionCheckResponse> {
    this.log("Checking session");

    const url = `${this.config.apiEndpoint}/v1/hosted/session/check`;
    const origin = window.location.origin;

    const response = await this.request<SessionCheckResponse>(
      url,
      {
        method: "GET",
        headers: {
          "X-Public-Key": this.config.publicKey,
          Origin: origin,
        },
        // SECURITY: credentials: 'include' sends the HttpOnly session cookie
        // so the hosted backend can validate the existing session.
        credentials: "include",
      },
      0,
      SessionCheckValidator,
    );

    this.log("Session check complete", { verified: response.verified });
    return response;
  }

  /**
   * Make an HTTP request with retry logic
   *
   * IV-713: Accepts an optional validator for runtime response validation
   * instead of relying on unsafe `as T` casts.
   *
   * @param url Request URL
   * @param options Fetch options
   * @param retryCount Current retry attempt
   * @param validator Optional runtime validator with parse() method
   * @returns Response data
   * @throws ApiError on failure
   */
  private async request<T>(
    url: string,
    options: RequestInit,
    retryCount = 0,
    validator?: ResponseValidator<T>,
  ): Promise<T> {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout,
      );

      try {
        const response = await this.fetchImpl(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle non-2xx responses (return retry result directly)
        if (!response.ok) {
          return await this.handleErrorResponse(
            response,
            url,
            options,
            retryCount,
            validator,
          );
        }

        // Parse JSON response
        const data: unknown = await response.json();

        // IV-713: Runtime validation of API response using provided validator.
        // All call sites now supply a validator, so the unvalidated path is
        // unreachable. The guard is kept as a defence-in-depth measure.
        if (validator) {
          try {
            return validator.parse(data);
          } catch (validationError) {
            this.log("Response validation failed", {
              url,
              error: validationError,
            });
            throw new ApiError(
              "Invalid server response",
              0,
              "VALIDATION_ERROR",
            );
          }
        }

        throw new ApiError(
          "No response validator provided",
          0,
          "MISSING_VALIDATOR",
        );
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.name === "AbortError") {
        this.log("Request timeout", { url });
        throw new ApiError("Request timeout", 0, "TIMEOUT");
      }

      // Handle network errors
      if (error instanceof TypeError) {
        this.log("Network error", { url, error: error.message });

        // Retry on network errors
        if (retryCount < this.retryConfig.maxRetries) {
          return this.retryRequest(url, options, retryCount + 1, validator);
        }

        throw new ApiError("Network error", 0, "NETWORK_ERROR");
      }

      // Re-throw ApiError
      if (error instanceof ApiError) {
        throw error;
      }

      // Unknown error
      this.log("Unknown error", { url, error });
      throw new ApiError("An unexpected error occurred", 0, "UNKNOWN_ERROR");
    }
  }

  /**
   * Map HTTP status codes to fixed client-safe error messages.
   *
   * Server error text is never forwarded to the caller; only these
   * pre-defined strings are exposed outside the SDK.
   */
  private getClientSafeMessage(status: number): string {
    if (status === 400) return "Invalid request";
    if (status === 401) return "Authentication required";
    if (status === 403) return "Access denied";
    if (status === 404) return "Not found";
    if (status === 409) return "Request conflict";
    if (status === 429) return "Too many requests";
    if (status >= 500) return "Service temporarily unavailable";
    return "Request failed";
  }

  /**
   * Handle error responses from the API
   */
  private async handleErrorResponse<T>(
    response: Response,
    url: string,
    options: RequestInit,
    retryCount: number,
    validator?: ResponseValidator<T>,
  ): Promise<T> {
    const statusCode = response.status;

    // Try to parse error body for debug logging only
    let errorData: ApiErrorResponse | null = null;
    try {
      errorData = await response.json();
    } catch {
      // Ignore JSON parse errors
    }

    const code = errorData?.code;

    // Log raw server error via debug only. Never expose to caller.
    this.log("API error", {
      url,
      statusCode,
      serverMessage: errorData?.error,
      serverDetails: errorData?.details,
      code,
    });

    // M-44: Parse Retry-After header on 429 responses so the polling layer
    // can honour the server's requested backoff period.
    let retryAfterMs: number | undefined;
    if (statusCode === 429) {
      const retryAfterHeader = response.headers.get("Retry-After");
      if (retryAfterHeader) {
        const seconds = parseInt(retryAfterHeader, 10);
        if (!isNaN(seconds) && seconds > 0 && seconds <= 300) {
          retryAfterMs = seconds * 1000;
        }
      }
    }

    // Create ApiError with fixed client-safe message (no server details)
    const clientSafeMessage = this.getClientSafeMessage(statusCode);
    const apiError = new ApiError(
      clientSafeMessage,
      statusCode,
      code,
      undefined,
      retryAfterMs,
    );

    // Retry on 5xx errors
    if (apiError.isRetryable() && retryCount < this.retryConfig.maxRetries) {
      return this.retryRequest(url, options, retryCount + 1, validator);
    }

    throw apiError;
  }

  /**
   * Retry a failed request with exponential backoff
   */
  private async retryRequest<T>(
    url: string,
    options: RequestInit,
    retryCount: number,
    validator?: ResponseValidator<T>,
  ): Promise<T> {
    // Calculate delay with exponential backoff plus random jitter to
    // prevent thundering herd when many clients retry simultaneously.
    const baseDelay = Math.min(
      this.retryConfig.initialDelay *
        Math.pow(this.retryConfig.backoffMultiplier, retryCount - 1),
      this.retryConfig.maxDelay,
    );
    const delay = baseDelay + Math.random() * baseDelay;

    this.log("Retrying request", { url, retryCount, delay });

    // Wait before retrying
    await this.sleep(delay);

    // Retry the request
    return this.request<T>(url, options, retryCount, validator);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log debug messages to the browser console.
   *
   * Only emits output when the `debug` configuration flag is enabled.
   * Uses `console.debug` so that messages are hidden by default in most
   * browser developer tools.
   */
  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
      console.debug(`[HostedBackendClient] ${message}`, data || "");
    }
  }
}
