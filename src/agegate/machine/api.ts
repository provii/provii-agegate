// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * v1 hosted backend API calls for the AgeGate machine: challenge creation
 * (with PKCE), status polling, and PKCE redemption.
 *
 * SECURITY: The code_verifier is NEVER included in QR payloads or deep links.
 * It is stored only in sessionStorage and sent exclusively during redemption.
 *
 * @module machine/api
 */

import {
  fetchWithTimeout,
  fetchWithRetry,
  safeReadJson,
} from "../../utils/fetchWithTimeout.js";
import { bytesToB64urlStrict } from "../../utils/base64.js";
import { cacheServerFailureMode } from "../../core/failure-mode.js";
import { AgeGateError } from "../../errors/AgeGateError.js";
import type {
  CreateChallengeResponse,
  StatusResponse,
  QRPayload,
  RedeemRequest,
} from "../../api/v1.js";
import type { AgeGateConfig } from "../AgeGateConfig.js";
import {
  DEFAULT_TIMEOUT,
  INIT_TIMEOUT,
  ERROR_MESSAGES,
  isNonNullRecord,
} from "./constants.js";
import { generatePKCE } from "./security.js";

/* -------------------------------------------------------------------------- */
/*                        Start Challenge (v1 API)                            */
/* -------------------------------------------------------------------------- */

export async function startChallenge(cfg: AgeGateConfig): Promise<{
  challenge: CreateChallengeResponse;
  code_verifier: string;
  qrPayload: QRPayload;
  pollingUrl: string;
  deepLink: string;
}> {
  // Generate PKCE
  const { code_verifier, code_challenge } = await generatePKCE();

  // Build request matching v1 API contract
  // Server will enforce minimum age based on origin policy
  // Proof direction is determined server-side from origin policy.
  // Server uses rename_all = "camelCase" with deny_unknown_fields.
  // Only send fields the server struct accepts. Method defaults to S256
  // server-side. verifying_key_id, expires_in, and proof_direction are
  // determined by origin policy.
  const body: Record<string, string> = {
    code_challenge: code_challenge,
  };

  // POST /v1/challenge (use longer timeout for initial request)
  const idempotencyKey = crypto.randomUUID();
  const res = await fetchWithTimeout(
    cfg.challengeUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-Version": "v1",
        "X-Public-Key": cfg.publicKey,
        "Idempotency-Key": idempotencyKey,
      },
      redirect: "error", // SSRF-067: Block redirects on sensitive requests
      body: JSON.stringify(body),
    },
    INIT_TIMEOUT,
  );

  if (!res.ok) {
    throw new AgeGateError(
      `Challenge create failed (${res.status})`,
      ERROR_MESSAGES.NETWORK_ERROR,
      `HTTP_${res.status}`,
    );
  }

  const rawJson = await safeReadJson<unknown>(res);

  // Validate challenge response shape before trusting it.
  // All required fields must be present with the expected types.
  if (!isNonNullRecord(rawJson)) {
    throw new AgeGateError(
      "Invalid challenge response: not an object",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "CHALLENGE_INVALID_SHAPE",
    );
  }

  const record = rawJson;
  if (typeof record["challenge_id"] !== "string") {
    throw new AgeGateError(
      "Invalid challenge response: missing challenge_id",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "CHALLENGE_MISSING_FIELD",
    );
  }
  if (typeof record["short_code"] !== "string") {
    throw new AgeGateError(
      "Invalid challenge response: missing short_code",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "CHALLENGE_MISSING_FIELD",
    );
  }
  if (typeof record["rp_challenge"] !== "string") {
    throw new AgeGateError(
      "Invalid challenge response: missing rp_challenge",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "CHALLENGE_MISSING_FIELD",
    );
  }
  if (typeof record["cutoff_days"] !== "number") {
    throw new AgeGateError(
      "Invalid challenge response: missing cutoff_days",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "CHALLENGE_MISSING_FIELD",
    );
  }
  if (typeof record["verifying_key_id"] !== "number") {
    throw new AgeGateError(
      "Invalid challenge response: missing verifying_key_id",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "CHALLENGE_MISSING_FIELD",
    );
  }
  if (typeof record["submit_secret"] !== "string") {
    throw new AgeGateError(
      "Invalid challenge response: missing submit_secret",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "CHALLENGE_MISSING_FIELD",
    );
  }
  if (typeof record["expires_at"] !== "number") {
    throw new AgeGateError(
      "Invalid challenge response: missing expires_at",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "CHALLENGE_MISSING_FIELD",
    );
  }
  if (typeof record["status_url"] !== "string") {
    throw new AgeGateError(
      "Invalid challenge response: missing status_url",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "CHALLENGE_MISSING_FIELD",
    );
  }
  if (typeof record["verify_url"] !== "string") {
    throw new AgeGateError(
      "Invalid challenge response: missing verify_url",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "CHALLENGE_MISSING_FIELD",
    );
  }

  // All required fields validated above. Cast through unknown because
  // the isNonNullRecord guard narrowed rawJson to Record<string, unknown>.
  const json = rawJson as unknown as CreateChallengeResponse;

  // Validate response (IV-715: charset validation in addition to length)
  // rp_challenge is base64url-encoded (RFC 4648 Section 5): [A-Za-z0-9_-]
  const BASE64URL_43_PATTERN = /^[A-Za-z0-9_-]{43}$/;

  if (!json.rp_challenge || !BASE64URL_43_PATTERN.test(json.rp_challenge)) {
    throw new AgeGateError(
      "Invalid rp_challenge in response: must be 43 base64url characters",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "INVALID_RP_CHALLENGE",
    );
  }

  // submit_secret is also base64url-encoded, same charset validation
  if (!json.submit_secret || !BASE64URL_43_PATTERN.test(json.submit_secret)) {
    throw new AgeGateError(
      "Invalid submit_secret in response: must be 43 base64url characters",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "INVALID_SUBMIT_SECRET",
    );
  }

  const qrPayload: QRPayload = {
    challenge_id: json.challenge_id,
  };

  const deepLinkPayload = {
    challenge_id: json.challenge_id,
    rp_challenge: json.rp_challenge,
    cutoff_days: json.cutoff_days,
    verifying_key_id: json.verifying_key_id,
    submit_secret: json.submit_secret,
    expires_at: json.expires_at,
    verify_url: json.verify_url,
    proof_direction: json.proof_direction,
  };

  // Build deep link (IV-716: URL-encode the query parameter value)
  const deepLinkJson = JSON.stringify(deepLinkPayload);
  const deepLinkJson64 = bytesToB64urlStrict(
    new TextEncoder().encode(deepLinkJson),
  );
  const deepLink = `proviiwallet://verify?d=${encodeURIComponent(deepLinkJson64)}`;

  // Cache the server-configured failure mode (keyed by public key) so it
  // survives a later outage when the challenge response cannot be re-fetched.
  const serverFailureMode = json.failure_mode;
  if (
    serverFailureMode === "block" ||
    serverFailureMode === "allow" ||
    serverFailureMode === "defer"
  ) {
    // Key the cache by (publicKey, onUnavailable) so it matches the read in
    // AgeGate.applyFailureMode and so two configs on one origin do not collide.
    cacheServerFailureMode(
      cfg.publicKey,
      serverFailureMode,
      cfg.onUnavailable ?? null,
    );
  }

  return {
    challenge: json,
    code_verifier,
    qrPayload,
    pollingUrl: json.status_url,
    deepLink,
  };
}

/* -------------------------------------------------------------------------- */
/*                          Poll Status (v1 API)                              */
/* -------------------------------------------------------------------------- */

export async function pollStatusEndpoint(
  statusUrl: string,
  challengeId: string | null,
  isRpProxy: boolean,
  timeout: number = DEFAULT_TIMEOUT,
  cfg?: { publicKey: string },
): Promise<StatusResponse> {
  let res: Response;

  if (isRpProxy && challengeId) {
    // RP proxy mode: POST with challengeId in body
    res = await fetchWithTimeout(
      statusUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ challengeId }),
      },
      timeout,
    );
  } else {
    // Direct mode: GET to full status URL.
    // SECURITY: X-Public-Key is required for BOLA prevention (session ownership).
    // credentials: 'include' sends the HttpOnly session cookie.
    res = await fetchWithTimeout(
      statusUrl,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Public-Key": cfg?.publicKey ?? "",
        },
        credentials: "include",
      },
      timeout,
    );
  }

  // Handle expired challenges
  if (res.status === 404 || res.status === 410) {
    return {
      status: "expired",
      expires_at: new Date().toISOString(),
    };
  }

  if (!res.ok) {
    throw new AgeGateError(
      `Status check failed (${res.status})`,
      ERROR_MESSAGES.NETWORK_ERROR,
      `STATUS_HTTP_${res.status}`,
    );
  }

  const data = await safeReadJson<unknown>(res);

  // Validate status response shape before trusting it
  if (!isNonNullRecord(data)) {
    throw new AgeGateError(
      "Invalid status response: not an object",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "STATUS_INVALID_SHAPE",
    );
  }

  const record = data;
  if (typeof record["status"] !== "string") {
    throw new AgeGateError(
      "Invalid status response: missing status field",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "STATUS_MISSING_FIELD",
    );
  }
  if (typeof record["expires_at"] !== "string") {
    throw new AgeGateError(
      "Invalid status response: missing expires_at field",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "STATUS_MISSING_FIELD",
    );
  }

  // All required fields validated above. Cast through unknown because
  // the isNonNullRecord guard narrowed data to Record<string, unknown>.
  return data as unknown as StatusResponse;
}

/* -------------------------------------------------------------------------- */
/*                        Redeem Challenge (PKCE)                             */
/* -------------------------------------------------------------------------- */

/**
 * Complete PKCE flow by calling redemption endpoint.
 *
 * RECOMMENDED PRODUCTION PATTERN:
 * Use RP proxy mode where your backend calls the verifier. This allows:
 * - Server-side verification confirmation
 * - Session/cookie creation
 * - Audit logging
 * - Business logic enforcement
 *
 * @param challenge_id - The challenge to redeem
 * @param code_verifier - PKCE verifier from sessionStorage
 * @param cfg - Config with redemption settings
 * @param timeout - Request timeout
 */
export async function redeemChallenge(
  challenge_id: string,
  code_verifier: string,
  cfg: AgeGateConfig,
  timeout: number = DEFAULT_TIMEOUT,
): Promise<void> {
  let redeemUrl: string;
  let body: RedeemRequest | (RedeemRequest & { challenge_id: string });

  if (cfg.redeemMode === "rp-proxy" && cfg.redeemUrl) {
    // RECOMMENDED: RP proxy mode
    // Your backend endpoint handles verification and session creation
    redeemUrl = cfg.redeemUrl;
    body = {
      challenge_id,
      code_verifier,
    };
  } else {
    // DIRECT MODE: For demos/testing only
    // In production, use RP proxy to maintain server-side state
    // provii-verifier expects: POST /v1/hosted/redeem/{session_id}
    const baseUrl = cfg.challengeUrl.replace(/\/challenge$/, "");
    redeemUrl = `${baseUrl}/redeem/${encodeURIComponent(challenge_id)}`;
    body = { code_verifier };

    if (
      typeof process !== "undefined" &&
      process.env?.["NODE_ENV"] !== "production"
    ) {
      console.warn(
        "[AgeGate] Direct redemption mode should only be used for demos. " +
          'In production, configure redeemMode: "rp-proxy" with your backend endpoint.',
      );
    }
  }

  // Generated ONCE, outside the retry loop, so every retry of this logical
  // redeem carries the SAME Idempotency-Key. The verifier deduplicates on it,
  // which is what makes retrying this write safe (a retry after a 5xx or a
  // dropped connection cannot double-redeem the challenge).
  const redeemIdempotencyKey = crypto.randomUUID();
  // C1: redeem now retries transient failures (5xx / timeout / dropped
  // connection) with a short exponential backoff, but fails fast on any 4xx so
  // terminal outcomes (409 already-redeemed, 410 expired) are handled below
  // without delay. The challenge-create path retries at the XState level; this
  // is the redeem-only retry.
  const res = await fetchWithRetry(
    redeemUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Public-Key": cfg.publicKey,
        "Idempotency-Key": redeemIdempotencyKey,
      },
      // SECURITY: credentials: 'include' required for cross-origin Set-Cookie to work
      credentials: "include",
      redirect: "error", // SSRF-067: Block redirects on credential-bearing requests
      body: JSON.stringify(body),
    },
    timeout,
    { maxRetries: 2, baseDelayMs: 600 },
  );

  if (!res.ok) {
    // Handle specific error codes
    if (res.status === 409) {
      return; // Treat as success for idempotency
    }

    throw new AgeGateError(
      `Redeem failed HTTP ${res.status}`,
      res.status === 410
        ? ERROR_MESSAGES.EXPIRED_CHALLENGE
        : ERROR_MESSAGES.NETWORK_ERROR,
      `REDEEM_HTTP_${res.status}`,
    );
  }

  // If using RP proxy, consume the response body (RP may return session info).
  // Response body is not used client-side; the session cookie is what matters.
  if (cfg.redeemMode === "rp-proxy") {
    try {
      await res.json();
    } catch {
      // Response might not be JSON, that's OK
    }
  }
}
