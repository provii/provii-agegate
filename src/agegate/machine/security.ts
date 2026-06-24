// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Security-sensitive helpers for the AgeGate machine: RFC-7636 PKCE
 * generation (via the shared PKCEManager singleton), WebSocket URL
 * validation (SSRF-066), and the safe same-origin redirect (ADV-AG-002).
 *
 * This module is the sole home of the `pkceManager` singleton.
 *
 * @module machine/security
 */

import { PKCEManager } from "../../core/pkce.js";
import { AgeGateError } from "../../errors/AgeGateError.js";
import { ERROR_MESSAGES } from "./constants.js";

/* -------------------------------------------------------------------------- */
/*                      RFC-7636 Compliant PKCE (via PKCEManager)             */
/* -------------------------------------------------------------------------- */

/**
 * Shared PKCEManager instance for the state machine flow.
 *
 * ST-AG-002: Consolidates PKCE generation to a single implementation
 * (core/pkce.ts PKCEManager) instead of maintaining a duplicate here.
 * PKCEManager uses raw bytes -> base64url encoding (no modular bias),
 * and manages sessionStorage with the canonical `provii_pkce_` prefix.
 *
 * SECURITY: The code_verifier MUST remain browser-local. It is stored
 * in sessionStorage (scoped to the browser tab) and only transmitted
 * during the PKCE redemption step.
 *
 * ADV-AG-003: PKCE verifiers in sessionStorage is standard browser
 * practice per RFC 7636. sessionStorage is scoped to the tab and
 * cleared on close. Same-origin XSS could read it, but that is an
 * inherent browser security model limitation, not a PKCE design flaw.
 */
export const pkceManager = new PKCEManager();

// SECURITY: PKCE generation. The code_verifier MUST remain browser-local.
export async function generatePKCE(): Promise<{
  code_verifier: string;
  code_challenge: string;
}> {
  try {
    const { verifier, challenge } = await pkceManager.generateChallenge();
    return { code_verifier: verifier, code_challenge: challenge };
  } catch (err) {
    console.error("[AgeGate] PKCE generation failed:", err);
    throw new AgeGateError(
      "Failed to generate PKCE parameters",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "PKCE_GENERATION_FAILED",
      err,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                      WebSocket URL Validation (SSRF-066)                   */
/* -------------------------------------------------------------------------- */

/**
 * Validate that a WebSocket URL from the server response uses wss:// and
 * that its hostname matches the configured API domain. This prevents an
 * attacker-controlled backend from redirecting the WebSocket connection
 * to an arbitrary host.
 */
export function validateWebSocketUrl(wsUrl: string, referenceApiUrl: string): void {
  // Require wss:// (secure WebSocket). Plain ws:// is rejected.
  if (!wsUrl.startsWith("wss://")) {
    throw new AgeGateError(
      `WebSocket URL must use wss:// protocol, got: ${wsUrl.slice(0, 40)}`,
      ERROR_MESSAGES.VALIDATION_ERROR,
      "INVALID_WS_PROTOCOL",
    );
  }

  // The ws_url hostname must match the configured API hostname.
  // This prevents a compromised or malicious backend from sending
  // the client to a completely different server.
  try {
    const wsHostname = new URL(wsUrl).hostname.toLowerCase();
    const apiHostname = new URL(referenceApiUrl).hostname.toLowerCase();
    if (wsHostname !== apiHostname) {
      throw new AgeGateError(
        `WebSocket hostname "${wsHostname}" does not match API hostname "${apiHostname}"`,
        ERROR_MESSAGES.VALIDATION_ERROR,
        "WS_HOSTNAME_MISMATCH",
      );
    }
  } catch (err) {
    if (err instanceof AgeGateError) throw err;
    throw new AgeGateError(
      "Failed to parse WebSocket URL",
      ERROR_MESSAGES.VALIDATION_ERROR,
      "WS_URL_PARSE_FAILED",
      err,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                      Safe Same-Origin Redirect (ADV-AG-002)               */
/* -------------------------------------------------------------------------- */

/**
 * Redirect to a URL only if it is same-origin with the current page.
 *
 * ADV-AG-002: The visibilitychange handler can fire after an arbitrary delay
 * (e.g. the user backgrounds the tab for hours). If the contentUrl were ever
 * mutated or if the origin check done at config time no longer reflects the
 * current browsing context, a stale URL could function as an open redirect.
 * This function re-validates at redirect time.
 *
 * @throws Error if the URL is not same-origin
 */
export function safeRedirect(targetUrl: string): void {
  try {
    const currentOrigin = window.location.origin;
    const targetOrigin = new URL(targetUrl, currentOrigin).origin;
    if (targetOrigin !== currentOrigin) {
      console.error(
        `[AgeGate] Blocked cross-origin redirect: target origin "${targetOrigin}" does not match current origin "${currentOrigin}"`,
      );
      return;
    }
  } catch {
    console.error("[AgeGate] Blocked redirect: failed to parse target URL");
    return;
  }
  window.location.href = targetUrl;
}
