// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Runtime validation schemas for hosted backend API responses.
 *
 * Re-exports the wire-format types from `api/v1` and provides lightweight
 * parse-and-validate functions used by {@link HostedBackendClient} to
 * validate external input at runtime rather than relying on unsafe type
 * assertions.
 *
 * @module types/api
 */

export * from "../api/v1.js";

/**
 * Runtime validator for challenge creation responses.
 *
 * Checks that every required field is present and has the expected primitive
 * type. Throws on the first mismatch so that the API client can surface a
 * clear VALIDATION_ERROR to callers.
 */
export const ChallengeSchema = {
  parse: (obj: unknown) => {
    if (!obj || typeof obj !== "object") {
      throw new Error("Invalid challenge: not an object");
    }
    const o = obj as Record<string, unknown>;

    if (typeof o["challenge_id"] !== "string")
      throw new Error("Invalid challenge_id");
    if (typeof o["short_code"] !== "string")
      throw new Error("Invalid short_code");
    if (typeof o["rp_challenge"] !== "string")
      throw new Error("Invalid rp_challenge");
    if (typeof o["cutoff_days"] !== "number")
      throw new Error("Invalid cutoff_days");
    if (typeof o["verifying_key_id"] !== "number")
      throw new Error("Invalid verifying_key_id");
    if (typeof o["submit_secret"] !== "string")
      throw new Error("Invalid submit_secret");
    if (typeof o["expires_at"] !== "number")
      throw new Error("Invalid expires_at");
    if (typeof o["status_url"] !== "string")
      throw new Error("Invalid status_url");
    if (typeof o["verify_url"] !== "string")
      throw new Error("Invalid verify_url");

    return obj;
  },
};

/**
 * Runtime validator for status polling responses.
 *
 * Only enforces the presence and type of the `status` field; remaining
 * fields are optional and vary by session state.
 */
export const StatusSchema = {
  parse: (obj: unknown) => {
    if (!obj || typeof obj !== "object") {
      throw new Error("Invalid status: not an object");
    }
    const o = obj as Record<string, unknown>;
    if (typeof o["status"] !== "string")
      throw new Error("Invalid status field");
    if (typeof o["expires_at"] !== "string")
      throw new Error("Invalid expires_at");
    if (isNaN(new Date(o["expires_at"]).getTime()))
      throw new Error("Invalid expires_at: not a valid date");
    return obj;
  },
};
