// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Hosted backend API v1 wire types.
 *
 * These interfaces mirror the JSON shapes exchanged with the hosted backend
 * over `/v1/hosted/*` endpoints. They use snake_case field names to match the
 * server contract. Internal SDK code maps these to camelCase domain types
 * defined in `core/types.ts`.
 *
 * @module api/v1
 */

/** Request body for POST /v1/hosted/challenge. */
interface CreateChallengeRequest {
  code_challenge: string;
  /** PKCE method. Defaults to "S256" on the server. */
  method?: string;
  /** Verifying key identifier. Server selects default when omitted. */
  verifying_key_id?: number;
  /** Challenge TTL in seconds. Server defaults to 300. */
  expires_in?: number;
}

/** Response body from POST /v1/hosted/challenge. */
export interface CreateChallengeResponse {
  /** UUID v4 assigned by provii-verifier. */
  challenge_id: string;
  /** UUID v4 assigned by provii-verifier (present when using hosted flow). */
  session_id?: string;
  /** 12-digit numeric code for accessibility, displayed as XXXX XXXX XXXX. */
  short_code: string;
  /** Base64url-encoded RP challenge (43 characters). */
  rp_challenge: string;
  /** Effective age cutoff in days, resolved from server policy. */
  cutoff_days: number;
  /** Verifying key identifier selected by the server. */
  verifying_key_id: number;
  /** Base64url-encoded anti-spam secret (43 characters). */
  submit_secret: string;
  /** Unix timestamp when the challenge expires. */
  expires_at: number;
  /** Full URL for status polling. */
  status_url: string;
  /** Full URL for wallet verification. */
  verify_url: string;
  /** URL for rendering a QR code that the wallet scans. */
  qr_code_url: string;
  /** Direction of the age proof: "over_age" or "under_age". */
  proof_direction?: string;
  /**
   * Server-configured outage failure mode for this origin:
   * "block" | "allow" | "defer". Absent when the origin policy leaves it
   * unset (force-explicit). A config source and record, not an enforcement
   * point: the SDK caches it so it survives an outage.
   */
  failure_mode?: string;
  /** When true, the integrator's data-on-unavailable choice is ignored. */
  failure_mode_locked?: boolean;
  /** WebSocket URL for push status updates (alternative to polling). */
  ws_url?: string;
}

/** Response body from GET /v1/hosted/status/:session_id. */
export interface StatusResponse {
  /** Current session state. */
  status:
    | "pending"
    | "proof_ok_waiting_for_redeem"
    | "verified"
    | "expired"
    | "failed";
  /** ISO 8601 expiry timestamp. */
  expires_at: string;
  /** Server reason code when the session is not pending. */
  reason?:
    | "NONE"
    | "INVALID_PROOF"
    | "MISMATCHED_INPUTS"
    | "UNSUPPORTED_VK"
    | "ISSUER_NOT_ALLOWED"
    | "BANNED"
    | "EXPIRED";
}

/** Request body for POST /v1/hosted/redeem/:session_id. */
export interface RedeemRequest {
  /** RFC 7636 code verifier: 43-128 characters from [A-Za-z0-9\-._~]. */
  code_verifier: string;
}

/** Response body from POST /v1/hosted/redeem/:session_id. */
export interface RedeemResponse {
  /** Always "verified" on success. */
  status: "verified";
}

/** Payload encoded in the QR code shown to the user. */
export interface QRPayload {
  /** Challenge identifier the wallet uses to begin verification. */
  challenge_id: string;
}
