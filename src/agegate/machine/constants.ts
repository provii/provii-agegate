// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Shared constants, error-message strings, and response-shape guards for the
 * AgeGate machine modules.
 *
 * @module machine/constants
 */

import { t } from "../../i18n/index.js";

export const DEFAULT_TIMEOUT = 30_000;
export const INIT_TIMEOUT = 60_000; // Longer timeout for initial challenge creation

// Extracted string literals to satisfy sonarjs/no-duplicate-string
export const getVerifyButtonLabel = (): string => t("verifyButtonLabel");
export const ARIA_DISABLED = "aria-disabled";

export const ERROR_MESSAGES = {
  NETWORK_ERROR:
    "Unable to connect to verification service. Please check your connection and try again.",
  TIMEOUT_ERROR:
    "Request timed out. Please check your connection and try again.",
  VALIDATION_ERROR: "Invalid verification challenge. Please refresh the page.",
  EXPIRED_CHALLENGE:
    "This verification challenge has expired. Please refresh to get a new one.",
  MISSING_CONFIG: "Configuration error. Please refresh the page.",
  MOUNT_ERROR:
    "Unable to display verification interface. Please refresh the page.",
} as const;

// AgeGateError is imported from ../errors/AgeGateError.js

/** Shape returned by the WebSocket notification handler when verification succeeds. */
export interface WsVerificationResult {
  isValid: boolean;
  message: string;
  state?: string;
  source?: string;
}

/**
 * Narrow an unknown value into a successful WsVerificationResult.
 *
 * Returns true only when the value is a non-null object with a truthy
 * `isValid` boolean. This replaces scattered `as { isValid: boolean }`
 * casts that bypassed compile-time safety.
 */
export function isValidWsResult(value: unknown): value is WsVerificationResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "isValid" in value &&
    typeof (value as Record<string, unknown>)["isValid"] === "boolean" &&
    (value as Record<string, unknown>)["isValid"] === true
  );
}

/**
 * Narrow an unknown value to a string-keyed record after confirming it
 * is a non-null object. Used at API response boundaries to avoid bare
 * `as Record<string, unknown>` casts.
 */
export function isNonNullRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Threshold in milliseconds before showing heartbeat status text. */
export const HEARTBEAT_THRESHOLD_MS = 20_000;
