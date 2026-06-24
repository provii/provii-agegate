// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Asynchronous XState services (promise actors) for the AgeGate machine:
 * fetchChallenge (challenge creation + PKCE + WS validation) and pollStatus
 * (HTTP polling with optional WebSocket race + PKCE redemption).
 *
 * @module machine/services
 */

import { isMobile } from "../../utils/device.js";
import { WebSocketManager } from "../WebSocketManager.js";
import { AgeGateError } from "../../errors/AgeGateError.js";
import type { GateContext } from "../AgeGateMachine.js";
import type {
  CreateChallengeResponse,
  StatusResponse,
  QRPayload,
} from "../../api/v1.js";
import { machineCtx } from "./context.js";
import {
  DEFAULT_TIMEOUT,
  ERROR_MESSAGES,
  HEARTBEAT_THRESHOLD_MS,
  isValidWsResult,
} from "./constants.js";
import { validateWebSocketUrl, pkceManager } from "./security.js";
import {
  startChallenge,
  pollStatusEndpoint,
  redeemChallenge,
} from "./api.js";
import { showConfirmingStatus, showHeartbeatStatus } from "./render.js";

/* -------------------------------------------------------------------------- */
/*                               Machine SERVICES                             */
/* -------------------------------------------------------------------------- */

export const machineServices = {
  /**
   * Fetch a new verification challenge from the hosted backend.
   *
   * // SECURITY: Generates a fresh PKCE pair. The code_verifier is stored
   * // in sessionStorage and never leaves the browser until redemption.
   */
  async fetchChallenge(context: GateContext): Promise<{
    challenge: CreateChallengeResponse;
    deepLink: string;
    pollingUrl?: string;
    qrPayload?: QRPayload;
    code_verifier?: string;
    wsUrl?: string;
  }> {
    if (!context.cfg) {
      throw new AgeGateError(
        "Configuration missing",
        ERROR_MESSAGES.MISSING_CONFIG,
        "NO_CONFIG",
      );
    }

    // Reset WebSocket state for a fresh challenge (e.g., retry after failure)
    if (machineCtx.wsManager) {
      machineCtx.wsManager.close();
      machineCtx.wsManager = null;
    }
    machineCtx.wsPromise = null;
    machineCtx.wsFailed = false;
    machineCtx.wsWasConnected = false;

    try {
      const result = await startChallenge(context.cfg);

      // SECURITY: Store code_verifier via PKCEManager for later redemption.
      // This is the ONLY place where code_verifier is persisted locally.
      // Use session_id (provii-verifier's ID) NOT challenge_id (provii-verifier's ID)
      const storageId =
        result.challenge.session_id || result.challenge.challenge_id;
      if (storageId && result.code_verifier) {
        try {
          pkceManager.storeVerifier(storageId, result.code_verifier);
        } catch (err) {
          console.warn("[AgeGate] Failed to store PKCE verifier:", err);
        }
      }

      // SSRF-066: Validate ws_url from server before passing it to the machine.
      // An attacker-controlled backend could supply an arbitrary WebSocket URL
      // to exfiltrate session data. Require wss:// and matching hostname.
      let validatedWsUrl: string | undefined;
      if (result.challenge.ws_url) {
        try {
          validateWebSocketUrl(
            result.challenge.ws_url,
            context.cfg.challengeUrl,
          );
          validatedWsUrl = result.challenge.ws_url;
        } catch (wsErr) {
          // Log but do not fail the flow. HTTP polling will be used as fallback.
          console.warn(
            "[AgeGate] ws_url validation failed, falling back to HTTP polling:",
            wsErr,
          );
        }
      }

      // Return shape expected by machine
      return {
        challenge: result.challenge,
        deepLink: result.deepLink,
        pollingUrl: result.pollingUrl,
        qrPayload: result.qrPayload,
        wsUrl: validatedWsUrl,
        // Don't pass code_verifier to context, it stays in sessionStorage only
      };
    } catch (err) {
      if (err instanceof AgeGateError) throw err;

      console.error("[AgeGate] Unexpected error in fetchChallenge:", err);
      throw new AgeGateError(
        `Unexpected error: ${err}`,
        ERROR_MESSAGES.NETWORK_ERROR,
        "FETCH_UNEXPECTED",
        err,
      );
    }
  },

  /**
   * Poll for verification status via HTTP (with optional WebSocket race).
   *
   * // SECURITY: On proof_ok_waiting_for_redeem, retrieves the PKCE
   * // code_verifier from sessionStorage and calls the redeem endpoint.
   * // The verifier is cleared immediately after successful redemption.
   */
  async pollStatus(context: GateContext): Promise<{
    isValid: boolean;
    message: string;
    state?: string;
    source?: string;
  }> {
    if (!context.cfg || !context.challenge) {
      throw new AgeGateError(
        "Configuration or challenge missing",
        ERROR_MESSAGES.MISSING_CONFIG,
        "POLL_NO_CONFIG",
      );
    }

    try {
      // Use session_id (provii-verifier's ID) NOT challenge_id (provii-verifier's ID)
      const sid =
        context.challenge.session_id || context.challenge.challenge_id;

      // ── WebSocket push notification (first poll only, desktop only) ──
      // On mobile, the user taps a deep link to open the wallet app, which
      // backgrounds the browser tab. iOS/Android kill the WebSocket when the
      // tab is hidden, so it will never receive the notification. Skip WS
      // entirely on mobile and use aggressive HTTP polling instead.
      if (
        context.wsUrl &&
        !isMobile() &&
        !machineCtx.wsFailed &&
        !machineCtx.wsManager
      ) {
        try {
          machineCtx.wsManager = new WebSocketManager(context.wsUrl, sid);
          machineCtx.wsPromise = machineCtx.wsManager
            .waitForNotification()
            .then(async (_notification) => {
              // WebSocket notification received. Redeem immediately.
              // Show confirming status in the UI before the redeem round-trip
              if (context.cfg) {
                showConfirmingStatus(context.cfg.mountElementId);
              }

              const code_verifier = pkceManager.getVerifier(sid);
              if (!code_verifier) {
                throw new Error(
                  "PKCE verifier not found after WebSocket notification",
                );
              }
              if (!context.cfg) {
                throw new Error(
                  "Configuration not available for challenge redemption",
                );
              }
              await redeemChallenge(
                sid,
                code_verifier,
                context.cfg,
                DEFAULT_TIMEOUT,
              );
              pkceManager.clearVerifier(sid);
              return {
                isValid: true,
                message: "verified",
                source: "websocket",
              };
            })
            .catch((err) => {
              // WebSocket failed. Not a problem: HTTP polling takes over.
              // WebSocket failed; HTTP polling takes over.
              machineCtx.wsFailed = true;
              if (machineCtx.wsManager?.wasConnected) {
                machineCtx.wsWasConnected = true;
              }
              if (machineCtx.wsManager) {
                machineCtx.wsManager.close();
                machineCtx.wsManager = null;
              }
              return null; // Signal that WS didn't produce a result
            });
        } catch {
          machineCtx.wsFailed = true;
          machineCtx.wsManager = null;
          machineCtx.wsPromise = null;
        }
      }

      // If the WebSocket has already resolved with a result, use it immediately.
      if (machineCtx.wsPromise) {
        const wsResult = await Promise.race([
          machineCtx.wsPromise,
          new Promise((resolve) => setTimeout(() => resolve(null), 0)),
        ]);
        if (isValidWsResult(wsResult)) {
          machineCtx.wsManager?.close();
          machineCtx.wsManager = null;
          machineCtx.wsPromise = null;
          return wsResult;
        }
      }

      // If WebSocket is connected and healthy, wait on it with a timeout.
      // No HTTP polling while WS is active. Saves money and reduces latency.
      // Falls back to HTTP only when WS has failed, disconnected, or timed out.
      if (
        machineCtx.wsManager &&
        !machineCtx.wsFailed &&
        machineCtx.wsPromise
      ) {
        const WS_MESSAGE_TIMEOUT_MS = 30_000;
        const wsResult = await Promise.race([
          machineCtx.wsPromise,
          new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), WS_MESSAGE_TIMEOUT_MS),
          ),
        ]);

        if (wsResult === null) {
          // WS message timeout or WS failed/closed. Fall back to HTTP polling.
          if (machineCtx.wsManager) {
            machineCtx.wsManager.close();
          }
          machineCtx.wsManager = null;
          machineCtx.wsPromise = null;
          machineCtx.wsFailed = true;
          // Fall through to HTTP polling below
        } else if (isValidWsResult(wsResult)) {
          machineCtx.wsManager?.close();
          machineCtx.wsManager = null;
          machineCtx.wsPromise = null;
          return wsResult;
        }
        // WS promise resolved with a non-valid result. Prevent re-entering WS wait.
        if (machineCtx.wsManager) {
          machineCtx.wsManager.close();
        }
        machineCtx.wsManager = null;
        machineCtx.wsPromise = null;
        machineCtx.wsFailed = true;
        // Fall through to HTTP polling.
      }

      // ── HTTP polling (used when WS is not available or has failed) ──
      // IMPORTANT: Use RP proxy endpoint if configured (recommended for production)
      let url: string;
      let isRpProxy = false;

      if (context.cfg.redeemMode === "rp-proxy" && context.cfg.pollUrl) {
        // RP proxy mode: poll through backend
        url = context.cfg.pollUrl;
        isRpProxy = true;
      } else {
        // Direct mode: poll verifier directly
        url =
          context.pollingUrl ||
          context.cfg.statusUrl.replace("{sid}", encodeURIComponent(sid));
      }

      const status = await pollStatusEndpoint(
        url,
        sid,
        isRpProxy,
        DEFAULT_TIMEOUT,
        context.cfg,
      );

      // Handle proof_ok_waiting_for_redeem state
      if (status.status === "proof_ok_waiting_for_redeem") {
        // Show confirming status in the UI before the redeem round-trip
        showConfirmingStatus(context.cfg.mountElementId);

        // Clean up WebSocket if still running
        if (machineCtx.wsManager) {
          machineCtx.wsManager.close();
          machineCtx.wsManager = null;
          machineCtx.wsPromise = null;
        }

        // SECURITY: Retrieve PKCE verifier via PKCEManager for redemption
        const code_verifier = pkceManager.getVerifier(sid);

        if (!code_verifier) {
          throw new AgeGateError(
            "PKCE verifier not found - this is expected if user cleared storage",
            ERROR_MESSAGES.VALIDATION_ERROR,
            "MISSING_PKCE_VERIFIER",
          );
        }

        // Call redeem endpoint with the locally stored code_verifier
        await redeemChallenge(sid, code_verifier, context.cfg, DEFAULT_TIMEOUT);

        // Clear stored verifier after successful redemption
        pkceManager.clearVerifier(sid);

        // Return verified status
        return { isValid: true, message: "verified" };
      }

      // Map v1 API states to machine expectations
      if (status.status === "verified") {
        // Clean up WebSocket
        if (machineCtx.wsManager) {
          machineCtx.wsManager.close();
          machineCtx.wsManager = null;
          machineCtx.wsPromise = null;
        }
        return { isValid: true, message: "verified" };
      }

      if (status.status === "failed" || status.status === "expired") {
        // Clean up WebSocket
        if (machineCtx.wsManager) {
          machineCtx.wsManager.close();
          machineCtx.wsManager = null;
          machineCtx.wsPromise = null;
        }
        return { isValid: false, message: status.status, state: status.status };
      }

      // Still pending. Show heartbeat reassurance after 20 seconds of polling.
      if (context.cfg && context.pollingStartTime) {
        const elapsedSincePollingStart = Date.now() - context.pollingStartTime;
        if (elapsedSincePollingStart > HEARTBEAT_THRESHOLD_MS) {
          showHeartbeatStatus(context.cfg.mountElementId);
        }
      }

      return { isValid: false, message: "pending", state: "pending" };
    } catch (err) {
      if (err instanceof AgeGateError) throw err;

      console.error("[AgeGate] Unexpected error in pollStatus:", err);
      throw new AgeGateError(
        `Unexpected error: ${err}`,
        ERROR_MESSAGES.NETWORK_ERROR,
        "POLL_UNEXPECTED",
        err,
      );
    }
  },
};
