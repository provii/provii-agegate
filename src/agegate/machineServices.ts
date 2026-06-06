// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * State machine services and actions for the AgeGate XState machine.
 *
 * Implements the v1 hosted backend API integration with RFC 7636 PKCE:
 * - Challenge creation with PKCE code_challenge (S256)
 * - Adaptive HTTP polling with WebSocket push notification fallback
 * - PKCE redemption flow (RP proxy or direct mode)
 * - QR code and deep-link rendering for desktop and mobile
 *
 * SECURITY: The code_verifier is NEVER included in QR payloads or deep links.
 * It is stored only in sessionStorage and sent exclusively during redemption.
 *
 * @module machineServices
 */

import { renderQrToCanvas } from "../utils/qr.js";
import { isMobile } from "../utils/device.js";
import {
  fetchWithTimeout,
  fetchWithRetry,
  safeReadJson,
} from "../utils/fetchWithTimeout.js";
import { bytesToB64urlStrict } from "../utils/base64.js";
import { StyledQR } from "../ui/StyledQR.js";
import {
  buildMobileChallengeUI,
  buildDesktopChallengeUI,
  type ChallengeUIResult,
} from "../ui/challenge-ui.js";
import { WebSocketManager } from "./WebSocketManager.js";
import { PKCEManager } from "../core/pkce.js";
import { cacheServerFailureMode } from "../core/failure-mode.js";
import {
  getOrCreateShadowRoot,
  getShadowRoot,
  injectStyles,
} from "../core/shadow-dom.js";
import { t, getLocale, isRTL } from "../i18n/index.js";
import { AgeGateError } from "../errors/AgeGateError.js";
import type { GateContext } from "./AgeGateMachine.js";
import type {
  CreateChallengeResponse,
  StatusResponse,
  QRPayload,
  RedeemRequest,
} from "../api/v1.js";
import type { AgeGateConfig } from "./AgeGateConfig.js";

/**
 * Per-instance machine context. Groups all mutable module-level state so that
 * each AgeGate instance starts with a clean slate and no stale references
 * leak across instances.
 */
interface MachineContext {
  styledQRInstance: StyledQR | null;
  wsManager: WebSocketManager | null;
  wsFailed: boolean;
  /** True when the WS was successfully connected before it died (e.g. tab backgrounded). */
  wsWasConnected: boolean;
  wsPromise: Promise<unknown> | null;
  visibilityCleanup: (() => void) | null;
  /** Cleanup for the mobile visibility-change business-logic handler */
  mobileVisibilityCleanup: (() => void) | null;
  /** Shared challenge UI result for cleanup */
  challengeUI: ChallengeUIResult | null;
}

let machineCtx: MachineContext = {
  styledQRInstance: null,
  wsManager: null,
  wsFailed: false,
  wsWasConnected: false,
  wsPromise: null,
  visibilityCleanup: null,
  mobileVisibilityCleanup: null,
  challengeUI: null,
};

/**
 * Reset mutable machine state for a new AgeGate instance.
 *
 * Called at the start of each new AgeGate constructor to prevent stale
 * WebSocket connections, QR instances, or event listeners from a previous
 * instance leaking into the new one.
 */
export function resetMachineContext(): void {
  // Tear down any surviving WebSocket
  if (machineCtx.wsManager) {
    machineCtx.wsManager.close();
  }

  // Tear down any surviving styled QR
  if (machineCtx.styledQRInstance) {
    machineCtx.styledQRInstance.destroy();
  }

  // Remove the visibility listener from the previous instance
  if (machineCtx.visibilityCleanup) {
    machineCtx.visibilityCleanup();
  }

  // Remove the mobile business-logic visibility handler
  if (machineCtx.mobileVisibilityCleanup) {
    machineCtx.mobileVisibilityCleanup();
  }

  // Clean up the shared challenge UI
  if (machineCtx.challengeUI) {
    machineCtx.challengeUI.destroy();
  }

  machineCtx = {
    styledQRInstance: null,
    wsManager: null,
    wsFailed: false,
    wsWasConnected: false,
    wsPromise: null,
    visibilityCleanup: null,
    mobileVisibilityCleanup: null,
    challengeUI: null,
  };
}

/**
 * Attach a visibilitychange listener that detects iOS Safari closing the
 * WebSocket while the tab is backgrounded. Returns a cleanup function that
 * removes the listener.
 */
export function attachVisibilityFallback(): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  const handler = () => {
    if (
      document.visibilityState === "visible" &&
      machineCtx.wsManager &&
      !machineCtx.wsManager.isConnected
    ) {
      machineCtx.wsFailed = true;
      machineCtx.wsWasConnected = true;
      machineCtx.wsManager.close();
      machineCtx.wsManager = null;
      machineCtx.wsPromise = null;
    }
  };

  document.addEventListener("visibilitychange", handler);

  const cleanup = () => {
    document.removeEventListener("visibilitychange", handler);
  };

  machineCtx.visibilityCleanup = cleanup;
  return cleanup;
}

/** Whether the WebSocket was connected then lost (e.g. tab backgrounded). */
export function wasWsConnected(): boolean {
  return machineCtx.wsWasConnected;
}

/* -------------------------------------------------------------------------- */
/*                          Error Types & Constants                           */
/* -------------------------------------------------------------------------- */

const DEFAULT_TIMEOUT = 30_000;
const INIT_TIMEOUT = 60_000; // Longer timeout for initial challenge creation

// Extracted string literals to satisfy sonarjs/no-duplicate-string
const getVerifyButtonLabel = (): string => t("verifyButtonLabel");
const ARIA_DISABLED = "aria-disabled";

const ERROR_MESSAGES = {
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
interface WsVerificationResult {
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
function isValidWsResult(value: unknown): value is WsVerificationResult {
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
function isNonNullRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

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
const pkceManager = new PKCEManager();

// SECURITY: PKCE generation. The code_verifier MUST remain browser-local.
async function generatePKCE(): Promise<{
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
function validateWebSocketUrl(wsUrl: string, referenceApiUrl: string): void {
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
function safeRedirect(targetUrl: string): void {
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

/* -------------------------------------------------------------------------- */
/*                     Sandbox Proof Simulator (W3-frontend)                  */
/* -------------------------------------------------------------------------- */

/**
 * Submit a simulated proof outcome to the sandbox simulate-proof endpoint.
 *
 * Only works when `cfg.environment === "sandbox"`. Derives the endpoint URL
 * from cfg.challengeUrl by replacing the trailing `/challenge` segment with
 * `/sandbox/simulate-proof`.
 *
 * @throws AgeGateError on non-200 response or network failure
 */
async function simulateProof(
  challengeId: string,
  submitSecret: string,
  outcome: "verified" | "age_not_met",
  cfg: AgeGateConfig,
): Promise<void> {
  if (cfg.environment !== "sandbox") {
    throw new AgeGateError(
      "simulateProof is only available in sandbox environment",
      "Simulation is only available in sandbox mode",
      "SIMULATE_NOT_SANDBOX",
    );
  }

  const simulateUrl =
    cfg.challengeUrl.replace(/\/challenge$/, "") + "/sandbox/simulate-proof";

  const res = await fetchWithTimeout(
    simulateUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Public-Key": cfg.publicKey,
      },
      body: JSON.stringify({
        challenge_id: challengeId,
        submit_secret: submitSecret,
        outcome,
      }),
    },
    DEFAULT_TIMEOUT,
  );

  if (!res.ok) {
    let errorDetail = "";
    try {
      const errorText = await res.text();
      errorDetail = `: ${errorText}`;
    } catch {
      // Ignore read errors
    }
    throw new AgeGateError(
      `Simulate proof failed (${res.status})${errorDetail}`,
      "Simulation request failed. Please try again.",
      `SIMULATE_HTTP_${res.status}`,
    );
  }
}

/**
 * Inject sandbox-specific CSS into the shadow DOM.
 *
 * Prevents duplicate injection by checking for an existing style element
 * with a known id. Includes dark mode and reduced-motion overrides.
 */
function injectSandboxStyles(shadowRoot: ShadowRoot, cspNonce?: string): void {
  const styleId = "agegate-sandbox-styles";
  if (shadowRoot.querySelector(`#${styleId}`)) return;

  const style = document.createElement("style");
  style.id = styleId;
  if (cspNonce) {
    style.setAttribute("nonce", cspNonce);
  }
  style.textContent = `
    .agegate-sandbox-section {
      margin-top: 16px;
      padding: 12px 16px;
      border-top: 2px dashed var(--ag-border, #E5E7EB);
      text-align: center;
    }

    .agegate-sandbox-label {
      margin: 0 0 8px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--ag-text-muted, #6B7280);
    }

    .agegate-sandbox-buttons {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .agegate-sandbox-btn {
      min-height: 44px;
      min-width: 44px;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 600;
      border-width: 1px;
      border-style: solid;
      transition: opacity 0.15s ease;
    }

    .agegate-sandbox-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .agegate-sandbox-btn:focus-visible {
      outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start, #0091C7));
      outline-offset: 2px;
      box-shadow: var(--ag-focus-ring, 0 0 0 3px rgba(0, 145, 199, 0.4));
    }

    .agegate-sandbox-pass {
      background: #ecfdf5;
      color: #065f46;
      border-color: #6ee7b7;
    }

    .agegate-sandbox-fail {
      background: #fef2f2;
      color: #991b1b;
      border-color: #fca5a5;
    }

    @media (prefers-color-scheme: dark) {
      .agegate-sandbox-pass {
        background: #064e3b;
        color: #a7f3d0;
        border-color: #065f46;
      }

      .agegate-sandbox-fail {
        background: #7f1d1d;
        color: #fecaca;
        border-color: #991b1b;
      }

      .agegate-sandbox-section {
        border-top-color: var(--ag-border, #374151);
      }

      .agegate-sandbox-label {
        color: var(--ag-text-muted, #9CA3AF);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .agegate-sandbox-btn {
        transition: none;
      }
    }
  `;
  shadowRoot.appendChild(style);
}

/**
 * Render sandbox testing controls (Simulate Pass / Simulate Fail buttons)
 * below the main challenge UI. Only rendered when `cfg.environment === "sandbox"`.
 *
 * Appends to the `.content` element inside the shadow DOM so the buttons
 * appear below the QR code (desktop) or deep link button (mobile).
 */
function renderSandboxSimulator(
  shadowRoot: ShadowRoot,
  challenge: CreateChallengeResponse,
  cfg: AgeGateConfig,
  cspNonce?: string,
): void {
  if (cfg.environment !== "sandbox") return;

  // Build the sandbox section container
  const section = document.createElement("div");
  section.className = "agegate-sandbox-section";
  section.setAttribute("role", "region");
  section.setAttribute("aria-labelledby", "agegate-sandbox-heading");

  // Heading
  const heading = document.createElement("h3");
  heading.id = "agegate-sandbox-heading";
  heading.className = "agegate-sandbox-label";
  heading.textContent = t("sandboxTesting");
  section.appendChild(heading);

  // Button container
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "agegate-sandbox-buttons";

  // Pass button
  const passButton = document.createElement("button");
  passButton.type = "button";
  passButton.className = "agegate-sandbox-btn agegate-sandbox-pass";
  passButton.textContent = t("simulatePass");
  passButton.setAttribute("aria-label", t("simulatePassAriaLabel"));

  // Fail button
  const failButton = document.createElement("button");
  failButton.type = "button";
  failButton.className = "agegate-sandbox-btn agegate-sandbox-fail";
  failButton.textContent = t("simulateFail");
  failButton.setAttribute("aria-label", t("simulateFailAriaLabel"));

  const passOriginalText = passButton.textContent;
  const failOriginalText = failButton.textContent;

  /**
   * Handle a simulate button click. Disables both buttons, calls the
   * simulate endpoint, and updates the UI based on the result.
   */
  async function handleSimulate(
    outcome: "verified" | "age_not_met",
    clickedButton: HTMLButtonElement,
    originalText: string,
  ): Promise<void> {
    // Disable both buttons and show loading state
    passButton.disabled = true;
    failButton.disabled = true;
    clickedButton.setAttribute("aria-busy", "true");
    clickedButton.textContent = t("simulating");

    try {
      await simulateProof(
        challenge.challenge_id,
        challenge.submit_secret,
        outcome,
        cfg,
      );

      // Update button text on success
      clickedButton.textContent =
        outcome === "verified" ? "\u2713 Simulated" : "\u2717 Simulated";
      clickedButton.removeAttribute("aria-busy");

      // Update the existing aria-live status region so screen readers
      // announce the state change (WCAG 4.1.3 Status Messages)
      const statusRegion = shadowRoot.querySelector('[aria-live="polite"]');
      if (statusRegion) {
        const statusSpan = statusRegion.querySelector("span");
        if (statusSpan) {
          statusSpan.textContent = "Simulation submitted, verifying...";
        }
      }
    } catch (err) {
      // Re-enable buttons and restore original text on failure
      passButton.disabled = false;
      failButton.disabled = false;
      clickedButton.removeAttribute("aria-busy");
      clickedButton.textContent = originalText;
      console.error("[AgeGate] Simulation failed:", err);
    }
  }

  passButton.addEventListener("click", () => {
    handleSimulate("verified", passButton, passOriginalText);
  });

  failButton.addEventListener("click", () => {
    handleSimulate("age_not_met", failButton, failOriginalText);
  });

  buttonContainer.appendChild(passButton);
  buttonContainer.appendChild(failButton);
  section.appendChild(buttonContainer);

  // Append to the .content element inside the shadow DOM
  const contentElement = shadowRoot.querySelector(".content");
  if (contentElement) {
    contentElement.appendChild(section);
  }

  injectSandboxStyles(shadowRoot, cspNonce);
}

/* -------------------------------------------------------------------------- */
/*                          Deep-link & QR Rendering                          */
/* -------------------------------------------------------------------------- */

/**
 * Remove all child nodes from a shadow root except <style> elements.
 *
 * Theme and component styles injected via `injectStyles()` are preserved
 * so they do not need to be re-injected on every re-render.
 */
function clearShadowContent(shadowRoot: ShadowRoot): void {
  const childNodes = Array.from(shadowRoot.childNodes);
  for (const node of childNodes) {
    if (node instanceof HTMLStyleElement) continue;
    shadowRoot.removeChild(node);
  }
}

interface MobileContext {
  sessionId: string;
  statusUrl: string;
  contentUrl: string;
  cfg: AgeGateConfig;
  challenge: CreateChallengeResponse;
}

function renderMobileChallenge(
  container: HTMLElement,
  deepLink: string,
  qrPayload: QRPayload,
  mobileContext: MobileContext,
) {
  try {
    const shadowRoot = getOrCreateShadowRoot(
      container,
      mobileContext.cfg.cspNonce,
    );
    clearShadowContent(shadowRoot);

    // Build UI using the shared challenge builder
    const challenge = mobileContext.challenge;
    const ui = buildMobileChallengeUI(
      {
        shortCode: challenge.short_code || "",
        deepLink,
        qrPayload: JSON.stringify(qrPayload),
        cutoffDays: challenge.cutoff_days,
        proofDirection: challenge.proof_direction,
      },
      {
        cspNonce: mobileContext.cfg.cspNonce,
        isSandbox: mobileContext.cfg.environment === "sandbox",
      },
    );

    // Inject styles and mount the UI into shadow root
    injectStyles(shadowRoot, ui.styles, mobileContext.cfg.cspNonce);
    shadowRoot.appendChild(ui.root);

    // Light-DOM markers so the host page (and e2e tests, which can't
    // pierce the closed shadow root) can confirm which render mode the
    // SDK chose and what deep link it generated. The deep link is
    // already a proviiwallet:// URL the wallet app would receive on
    // tap, so exposing it here doesn't leak anything new.
    container.setAttribute("data-agegate-mode", "mobile");
    container.setAttribute("data-agegate-deep-link", deepLink);

    // ── Business logic wired onto the shared UI elements ──

    const btn = ui.elements.mobileBtn;

    // Handle page visibility change (user returning from wallet app).
    // The shared UI builder sets sessionStorage and updates button text
    // to "Checking...". This handler performs the actual status check,
    // PKCE redemption, and redirect. All AgeGate-specific logic.
    const visibilityHandler = async () => {
      if (document.visibilityState !== "visible") return;
      if (!btn) return;

      // Only act if the shared UI's CTA click handler set the pending flag
      // AND the shared visibility handler already updated the button to
      // "Checking..." state (clears the sessionStorage flag).
      // We detect this by checking if the button is aria-disabled.
      if (btn.getAttribute(ARIA_DISABLED) !== "true") return;

      try {
        let statusRes: Response;
        if (
          mobileContext.cfg?.redeemMode === "rp-proxy" &&
          mobileContext.cfg?.pollUrl
        ) {
          statusRes = await fetchWithTimeout(
            mobileContext.cfg.pollUrl,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                challengeId: mobileContext.sessionId,
              }),
            },
            10000,
          );
        } else {
          const statusUrl = mobileContext.statusUrl.replace(
            "{sid}",
            encodeURIComponent(mobileContext.sessionId),
          );
          statusRes = await fetchWithTimeout(
            statusUrl,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                "X-Public-Key": mobileContext.cfg?.publicKey ?? "",
              },
              credentials: "include",
              redirect: "error",
            },
            10000,
          );
        }

        if (!statusRes.ok) {
          throw new Error(`Status check failed: ${statusRes.status}`);
        }

        // Validate response shape (same checks as pollStatusEndpoint)
        const statusData = await safeReadJson<unknown>(statusRes);
        if (!isNonNullRecord(statusData)) {
          throw new Error("Invalid status response: not an object");
        }
        if (typeof statusData["status"] !== "string") {
          throw new Error("Invalid status response: missing status field");
        }
        if (typeof statusData["expires_at"] !== "string") {
          throw new Error("Invalid status response: missing expires_at field");
        }
        // All required fields validated above. The intermediate
        // Record<string, unknown> narrowing does not overlap with
        // StatusResponse, so we cast through unknown.
        const status = statusData as unknown as StatusResponse;

        if (status.status === "verified") {
          safeRedirect(mobileContext.contentUrl);
          return;
        }

        if (status.status === "proof_ok_waiting_for_redeem") {
          const code_verifier = pkceManager.getVerifier(
            mobileContext.sessionId,
          );

          if (!code_verifier) {
            throw new Error("PKCE verifier not found");
          }

          await redeemChallenge(
            mobileContext.sessionId,
            code_verifier,
            mobileContext.cfg,
            10000,
          );

          pkceManager.clearVerifier(mobileContext.sessionId);
          safeRedirect(mobileContext.contentUrl);
          return;
        }

        // Still pending. Reset UI, let XState polling continue
        resetMobileBtn(btn);
      } catch (err) {
        console.error("[AgeGate] Error checking verification status:", err);
        resetMobileBtn(btn);
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);

    // Store cleanup for the visibility listener
    machineCtx.mobileVisibilityCleanup = () => {
      document.removeEventListener("visibilitychange", visibilityHandler);
    };

    // Render sandbox simulator buttons (no-op outside sandbox)
    renderSandboxSimulator(
      shadowRoot,
      mobileContext.challenge,
      mobileContext.cfg,
      mobileContext.cfg.cspNonce,
    );

    // Store the UI result for cleanup
    machineCtx.challengeUI = ui;
  } catch (err) {
    console.error("[AgeGate] Failed to render mobile challenge:", err);
    throw new AgeGateError(
      "Failed to render mobile interface",
      ERROR_MESSAGES.MOUNT_ERROR,
      "RENDER_MOBILE_FAILED",
      err,
    );
  }
}

/** Reset mobile CTA button to default state */
function resetMobileBtn(btn: HTMLAnchorElement): void {
  btn.textContent = getVerifyButtonLabel();
  btn.style.background = "";
  btn.style.color = "";
  btn.style.pointerEvents = "";
  btn.removeAttribute(ARIA_DISABLED);
}

async function renderDesktopChallenge(
  container: HTMLElement,
  qrPayload: QRPayload,
  challenge: CreateChallengeResponse,
  cfg: AgeGateConfig,
) {
  const cspNonce = cfg.cspNonce;
  try {
    const shadowRoot = getOrCreateShadowRoot(container, cspNonce);
    clearShadowContent(shadowRoot);

    // Clean up any existing QR instance
    if (machineCtx.styledQRInstance) {
      machineCtx.styledQRInstance.destroy();
      machineCtx.styledQRInstance = null;
    }

    // Build UI using the shared challenge builder
    const ui = buildDesktopChallengeUI(
      {
        shortCode: challenge.short_code,
        deepLink: "", // Desktop doesn't use deep links
        qrPayload: JSON.stringify(qrPayload),
        cutoffDays: challenge.cutoff_days,
        proofDirection: challenge.proof_direction,
      },
      {
        cspNonce,
        isSandbox: cfg.environment === "sandbox",
      },
    );

    // Inject styles and mount the UI into shadow root
    injectStyles(shadowRoot, ui.styles, cspNonce);
    shadowRoot.appendChild(ui.root);

    // Light-DOM marker (mirrors renderMobileChallenge). Tests and host
    // pages can wait for this attribute to flip from absent to "desktop"
    // without piercing the closed shadow root.
    container.setAttribute("data-agegate-mode", "desktop");

    // Track the StyledQR instance from the UI builder for lifecycle management
    if (ui.styledQR) {
      machineCtx.styledQRInstance = ui.styledQR;
    }

    // Render sandbox simulator buttons (no-op outside sandbox)
    renderSandboxSimulator(shadowRoot, challenge, cfg, cspNonce);

    // Store the UI result for cleanup
    machineCtx.challengeUI = ui;
  } catch (err) {
    console.error("[AgeGate] Failed to render desktop challenge:", err);

    // Fallback to basic QR if styled version fails
    try {
      const shadowRootFallback = getOrCreateShadowRoot(container, cspNonce);
      clearShadowContent(shadowRootFallback);
      const canvas = document.createElement("canvas");
      shadowRootFallback.appendChild(canvas);
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", t("qrCodeAriaLabel"));

      const json = JSON.stringify(qrPayload);
      await renderQrToCanvas(canvas, json);
    } catch (fallbackErr) {
      console.error("[AgeGate] Fallback QR also failed:", fallbackErr);
    }

    throw new AgeGateError(
      "Failed to render desktop interface",
      ERROR_MESSAGES.MOUNT_ERROR,
      "RENDER_DESKTOP_FAILED",
      err,
    );
  }
}

function renderErrorState(
  mountId: string,
  err: Error | AgeGateError,
  cspNonce?: string,
) {
  try {
    const mount = document.getElementById(mountId);
    if (!mount) {
      console.error("[AgeGate] Mount element not found for error display");
      return;
    }

    const shadowRoot = getOrCreateShadowRoot(mount, cspNonce);
    clearShadowContent(shadowRoot);

    const userMessage =
      err instanceof AgeGateError
        ? err.userMessage
        : ERROR_MESSAGES.VALIDATION_ERROR;
    const errorCode =
      err instanceof AgeGateError && err.code ? `(${err.code})` : "";

    // Build error UI programmatically (no innerHTML interpolation)
    const errorAlertDiv = document.createElement("div");
    errorAlertDiv.setAttribute("role", "alert");
    errorAlertDiv.setAttribute("lang", getLocale());
    if (isRTL()) errorAlertDiv.setAttribute("dir", "rtl");
    errorAlertDiv.className = "agegate-error-alert";

    const errorTitleEl = document.createElement("h2");
    errorTitleEl.id = "agegate-error-title";
    errorTitleEl.textContent = t("errorTitle");
    errorAlertDiv.appendChild(errorTitleEl);

    const errorMsgEl = document.createElement("p");
    errorMsgEl.className = "agegate-error-message";
    errorMsgEl.id = "agegate-error-msg";
    errorMsgEl.textContent = userMessage;
    errorAlertDiv.appendChild(errorMsgEl);

    if (errorCode) {
      const errorCodeEl = document.createElement("p");
      errorCodeEl.className = "agegate-error-details";
      errorCodeEl.id = "agegate-error-code";
      errorCodeEl.setAttribute("aria-hidden", "true");
      errorCodeEl.textContent = errorCode;
      errorAlertDiv.appendChild(errorCodeEl);
    }

    const errorRetryBtn = document.createElement("button");
    errorRetryBtn.className = "retry-button agegate-error-retry";
    errorRetryBtn.id = "agegate-error-retry-btn";
    errorRetryBtn.textContent = t("tryAgain");
    errorAlertDiv.appendChild(errorRetryBtn);

    const errorHelpContainer = document.createElement("p");
    errorHelpContainer.className = "agegate-help-link-container";
    const errorHelpLink = document.createElement("a");
    errorHelpLink.href = "https://provii.app/help";
    errorHelpLink.target = "_blank";
    errorHelpLink.rel = "noopener";
    errorHelpLink.className = "agegate-help-link";
    errorHelpLink.id = "agegate-error-help";
    errorHelpLink.textContent = t("needHelp");
    errorHelpLink.setAttribute("aria-label", t("needHelpAriaLabel"));
    errorHelpContainer.appendChild(errorHelpLink);
    errorAlertDiv.appendChild(errorHelpContainer);

    shadowRoot.appendChild(errorAlertDiv);

    // CH-169: Use addEventListener instead of inline onclick to avoid requiring unsafe-inline in CSP
    errorRetryBtn.addEventListener("click", () => {
      window.location.reload();
    });

    injectMachineServiceStyles(shadowRoot, cspNonce);
  } catch (renderErr) {
    console.error("[AgeGate] Failed to render error state:", renderErr);
  }
}

function injectMachineServiceStyles(
  shadowRoot: ShadowRoot,
  cspNonce?: string,
): void {
  const styleId = "agegate-ms-styles";
  if (shadowRoot.querySelector(`#${styleId}`)) return;
  const style = document.createElement("style");
  style.id = styleId;
  if (cspNonce) {
    style.setAttribute("nonce", cspNonce);
  }
  style.textContent = `
    /* Focus styles using theme-aware CSS variables */
    #agegate-mobile-btn:focus-visible,
    #agegate-show-qr:focus-visible,
    #agegate-retry-btn:focus-visible,
    .retry-button:focus-visible {
      outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start, #0091C7));
      outline-offset: 2px;
      box-shadow: var(--ag-focus-ring, 0 0 0 3px rgba(0, 145, 199, 0.4));
    }
    [role="alert"] button:focus-visible {
      outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start, #0091C7));
      outline-offset: 2px;
      box-shadow: var(--ag-focus-ring, 0 0 0 3px rgba(0, 145, 199, 0.4));
    }
    a[href*="provii.app/help"]:focus-visible,
    .footer a:focus-visible {
      outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start, #0091C7));
      outline-offset: 2px;
      border-radius: 2px;
    }

    /* Mobile CTA button */
    .agegate-mobile-cta {
      min-height: 48px;
      display: inline-block;
    }

    /* Time notice */
    .agegate-time-notice {
      margin: 8px 0 0;
      color: var(--ag-text-muted, #6B7280);
      font-size: 0.75rem;
      text-align: center;
    }

    /* QR toggle section */
    .agegate-qr-toggle-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--ag-border, #E5E7EB);
      text-align: center;
    }

    .agegate-qr-toggle-label {
      margin: 0 0 12px;
      color: var(--ag-text-secondary, #6B7280);
      font-size: 0.8125rem;
    }

    .agegate-qr-toggle-btn {
      min-height: 44px;
    }

    /* QR container visibility */
    .agegate-qr-container-hidden {
      display: none;
    }

    #agegate-qr-container {
      margin-top: 20px;
      text-align: center;
    }

    /* QR canvas */
    .agegate-qr-canvas {
      display: block;
      width: 200px;
      height: 200px;
      max-width: 100%;
      margin: 0 auto;
      border-radius: 8px;
      box-shadow: var(--ag-qr-shadow, 0 4px 20px rgba(0, 0, 0, 0.08));
      background: var(--ag-qr-bg, #FFFFFF);
      padding: 8px;
    }

    /* Help link */
    .agegate-help-link-container {
      margin: 16px 0 0;
      font-size: 0.8125rem;
      text-align: center;
    }

    .agegate-help-link-container-tight {
      margin-top: 8px;
    }

    .agegate-help-link {
      color: var(--ag-accent-start, #0091C7);
      display: inline-block;
      padding: 12px 8px;
      min-height: 44px;
    }

    /* Footer link */
    .agegate-footer-link {
      display: inline-block;
      padding: 4px 8px;
      min-height: 44px;
    }

    /* Short code section */
    .agegate-short-code {
      margin-top: 16px;
      text-align: center;
    }

    .agegate-shortcode-label {
      margin: 0 0 8px;
      color: var(--ag-text-secondary, #6B7280);
      font-size: 0.8125rem;
    }

    .agegate-shortcode-value {
      margin: 0;
      color: var(--ag-accent-start, #0091C7);
      font-size: 1.125rem;
      font-weight: 700;
      font-family: 'SF Mono', Monaco, monospace;
      letter-spacing: 2px;
    }

    @media screen and (max-width: 359px) {
      .agegate-shortcode-value {
        font-size: 0.9375rem;
      }
    }

    /* Skeleton loading gate */
    .agegate-skeleton-gate {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
    }

    /* Error state */
    .agegate-error-alert {
      text-align: center;
      padding: 20px;
      color: var(--ag-text, #1F2937);
    }

    .agegate-error-message {
      margin: 20px 0;
      color: var(--ag-text-secondary, #6B7280);
    }

    .agegate-error-details {
      color: var(--ag-text-muted, #6B7280);
      font-size: 0.75rem;
      margin: 10px 0;
    }

    .agegate-error-retry {
      background: var(--ag-accent-gradient);
      border: none;
      color: #fff;
      padding: 12px 24px;
      min-height: 44px;
      border-radius: var(--ag-radius-button);
      cursor: pointer;
      margin-top: 20px;
      font-size: 1rem;
      font-weight: 700;
    }

    /* Confirming status feedback (proof received, redeeming) */
    .agegate-status-confirming {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .agegate-pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ag-accent-start, #0091C7);
      animation: agegate-pulse 1.2s ease-in-out infinite;
    }

    @keyframes agegate-pulse {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
    }

    @media (prefers-reduced-motion: reduce) {
      .agegate-pulse-dot {
        animation: none;
        opacity: 1;
        transform: none;
      }
    }

    /* QR code fade-in transition */
    .gate-container {
      opacity: 0;
      transition: opacity 0.3s ease-in;
    }
    .gate-container.agegate-visible {
      opacity: 1;
    }
    /* Skeleton loading gate must remain visible (has its own spinner) */
    .agegate-skeleton-gate {
      opacity: 1;
      transition: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .gate-container {
        opacity: 1;
        transition: none;
      }
    }
  `;
  shadowRoot.appendChild(style);
}

/* -------------------------------------------------------------------------- */
/*                  Status Feedback (proof received indicator)                */
/* -------------------------------------------------------------------------- */

/**
 * Update the desktop QR scan instruction to show that a proof has been
 * received and verification is being confirmed. Renders a pulsing dot
 * animation next to the message (respects prefers-reduced-motion).
 *
 * Works inside the closed shadow DOM by looking up the mount element
 * via cfg.mountElementId and retrieving its shadow root from the WeakMap.
 *
 * No-ops silently if the mount element, shadow root, or instruction
 * element cannot be found (e.g. mobile flow, destroyed UI).
 */
function showConfirmingStatus(mountElementId: string): void {
  try {
    const mount = document.getElementById(mountElementId);
    if (!mount) return;

    const shadowRoot = getShadowRoot(mount);
    if (!shadowRoot) return;

    const instructionElement = shadowRoot.querySelector(
      "#agegate-scan-instruction",
    );
    if (!instructionElement) return;

    // Also update the aria-live polite status region on mobile
    const mobileStatusRegion = shadowRoot.querySelector('[aria-live="polite"]');

    // Build the confirming status with optional pulse dot
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const confirmingText = t("proofReceivedConfirming");

    // Clear existing content
    instructionElement.innerHTML = "";

    const wrapper = document.createElement("span");
    wrapper.className = "agegate-status-confirming";

    if (!prefersReducedMotion) {
      const dot = document.createElement("span");
      dot.className = "agegate-pulse-dot";
      dot.setAttribute("aria-hidden", "true");
      wrapper.appendChild(dot);
    }

    const textNode = document.createElement("span");
    textNode.textContent = confirmingText;
    wrapper.appendChild(textNode);

    instructionElement.appendChild(wrapper);

    // Update mobile status region if it exists and is separate from
    // the desktop instruction element
    if (mobileStatusRegion && mobileStatusRegion !== instructionElement) {
      const mobileSpan = mobileStatusRegion.querySelector("span");
      if (mobileSpan) {
        mobileSpan.textContent = confirmingText;
      }
    }
  } catch (err) {
    // Non-critical UI feedback. Log and continue.
    // Non-critical UI feedback; swallow silently.
  }
}

/* -------------------------------------------------------------------------- */
/*             Heartbeat Status (long-wait reassurance text)                  */
/* -------------------------------------------------------------------------- */

/** Threshold in milliseconds before showing heartbeat status text. */
const HEARTBEAT_THRESHOLD_MS = 20_000;

/**
 * Update the scan instruction text to reassure the user that verification
 * is still in progress after an extended wait. Only updates once by checking
 * whether the instruction text still contains the original "Scan the" phrasing.
 *
 * Updates the aria-live region so screen readers announce the change.
 *
 * No-ops silently if the mount element, shadow root, or instruction element
 * cannot be found (e.g. mobile flow, destroyed UI).
 */
function showHeartbeatStatus(mountElementId: string): void {
  try {
    const mountEl = document.getElementById(mountElementId);
    if (!mountEl) return;
    const shadowRoot = getShadowRoot(mountEl);
    if (!shadowRoot) return;
    const instruction = shadowRoot.querySelector("#agegate-scan-instruction");
    if (!instruction) return;
    // Only update if still showing the original scan instruction
    // Check if still showing the original scan instruction (works across locales
    // by comparing against the localised scan QR instruction text)
    if (instruction.textContent?.includes(t("scanQrInstruction").slice(0, 8))) {
      const span = instruction.querySelector("span");
      if (span) {
        span.textContent = t("stillWaiting");
      }
    }
  } catch {
    // Non-critical, never break the flow
  }
}

/* -------------------------------------------------------------------------- */
/*                        Start Challenge (v1 API)                            */
/* -------------------------------------------------------------------------- */

async function startChallenge(cfg: AgeGateConfig): Promise<{
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

async function pollStatusEndpoint(
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
async function redeemChallenge(
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

/* -------------------------------------------------------------------------- */
/*                               Machine ACTIONS                              */
/* -------------------------------------------------------------------------- */
function cleanupStyledQR(): void {
  if (machineCtx.styledQRInstance) {
    machineCtx.styledQRInstance.destroy();
    machineCtx.styledQRInstance = null;
  }
}

// Update machineActions
export const machineActions = {
  renderSkeleton: ({ context }: { context: GateContext }) => {
    try {
      if (!context.cfg) return;
      const mount = document.getElementById(context.cfg.mountElementId);
      if (!mount) return;

      const shadowRoot = getOrCreateShadowRoot(mount, context.cfg.cspNonce);
      clearShadowContent(shadowRoot);

      // Show a branded loading skeleton immediately while the challenge API call is in-flight.
      // This replaces the blank screen users see during the ~200ms (warm) to ~2s (cold) fetch.
      // Built programmatically to eliminate innerHTML interpolation.
      const svgNS = "http://www.w3.org/2000/svg";

      const skelRegion = document.createElement("div");
      skelRegion.className = "container";
      skelRegion.setAttribute("lang", getLocale());
      if (isRTL()) skelRegion.setAttribute("dir", "rtl");
      skelRegion.setAttribute("role", "region");
      skelRegion.setAttribute("aria-label", t("ageVerificationRegion"));
      skelRegion.id = "agegate-skeleton-region";

      const skelHeader = document.createElement("div");
      skelHeader.className = "header";

      const skelLogoDiv = document.createElement("div");
      skelLogoDiv.className = "logo";
      const skelSvg = document.createElementNS(svgNS, "svg");
      skelSvg.setAttribute("aria-hidden", "true");
      skelSvg.setAttribute("viewBox", "0 0 24 24");
      skelSvg.setAttribute("fill", "none");
      skelSvg.setAttribute("stroke", "currentColor");
      skelSvg.setAttribute("stroke-width", "2");
      skelSvg.setAttribute("stroke-linecap", "round");
      skelSvg.setAttribute("stroke-linejoin", "round");
      const skelPath1 = document.createElementNS(svgNS, "path");
      skelPath1.setAttribute(
        "d",
        "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
      );
      const skelPath2 = document.createElementNS(svgNS, "path");
      skelPath2.setAttribute("d", "M9 12l2 2 4-4");
      skelSvg.appendChild(skelPath1);
      skelSvg.appendChild(skelPath2);
      skelLogoDiv.appendChild(skelSvg);
      skelHeader.appendChild(skelLogoDiv);

      const skelTitle = document.createElement("h2");
      skelTitle.id = "agegate-skeleton-title";
      skelTitle.textContent = t("headerTitle");
      skelHeader.appendChild(skelTitle);

      const skelSub = document.createElement("p");
      skelSub.id = "agegate-skeleton-subtitle";
      skelSub.textContent = t("headerSubtitlePreparing");
      skelHeader.appendChild(skelSub);
      skelRegion.appendChild(skelHeader);

      const skelContent = document.createElement("div");
      skelContent.className = "content";
      const skelGateContainer = document.createElement("div");
      skelGateContainer.className = "gate-container agegate-skeleton-gate";
      skelGateContainer.setAttribute("aria-busy", "true");
      const skelGateLoading = document.createElement("div");
      skelGateLoading.className = "gate-loading";
      skelGateLoading.setAttribute("aria-hidden", "true");
      const skelSpinner = document.createElement("div");
      skelSpinner.className = "spinner";
      skelSpinner.setAttribute("aria-hidden", "true");
      skelGateLoading.appendChild(skelSpinner);
      skelGateContainer.appendChild(skelGateLoading);
      skelContent.appendChild(skelGateContainer);
      skelRegion.appendChild(skelContent);

      const skelFooterDiv = document.createElement("div");
      skelFooterDiv.className = "footer";
      const skelFooterP = document.createElement("p");
      skelFooterP.id = "agegate-skeleton-footer";
      const poweredText = document.createTextNode(`${t("poweredBy")} `);
      skelFooterP.appendChild(poweredText);
      const footerLink = document.createElement("a");
      footerLink.href = "https://provii.app";
      footerLink.target = "_blank";
      footerLink.rel = "noopener";
      footerLink.setAttribute("aria-label", "Provii Wallet (opens in new tab)");
      footerLink.className = "agegate-footer-link";
      footerLink.textContent = "Provii Wallet";
      skelFooterP.appendChild(footerLink);
      skelFooterDiv.appendChild(skelFooterP);

      const skelFooterSub = document.createElement("p");
      skelFooterSub.className = "footer-subtitle";
      skelFooterSub.id = "agegate-skeleton-footer-sub";
      skelFooterSub.textContent = t("footerSubtitle");
      skelFooterDiv.appendChild(skelFooterSub);
      skelRegion.appendChild(skelFooterDiv);

      shadowRoot.appendChild(skelRegion);
    } catch (err) {
      // Skeleton render failed (non-critical). Verification flow continues.
    }
  },

  renderChallenge: ({ context }: { context: GateContext }) => {
    try {
      // Clean up any previous QR before rendering new one
      cleanupStyledQR();

      const { cfg, challenge, deepLink, qrPayload } = context;

      if (!cfg || !challenge || !deepLink || !qrPayload) {
        throw new AgeGateError(
          "Missing required context",
          ERROR_MESSAGES.MISSING_CONFIG,
          "MISSING_CONTEXT",
        );
      }

      const mount = document.getElementById(cfg.mountElementId);
      if (!mount) {
        throw new AgeGateError(
          `Mount element not found: ${cfg.mountElementId}`,
          ERROR_MESSAGES.MOUNT_ERROR,
          "MOUNT_NOT_FOUND",
        );
      }

      // Shadow root content is cleared inside each render function
      // via clearShadowContent() before new UI is appended.

      if (isMobile()) {
        // Build mobile context for visibility change handler
        const sessionId = challenge.session_id || challenge.challenge_id;
        const mobileContext: MobileContext = {
          sessionId,
          statusUrl: cfg.statusUrl,
          contentUrl: cfg.contentUrl,
          cfg,
          challenge,
        };
        renderMobileChallenge(mount, deepLink, qrPayload, mobileContext);
      } else {
        renderDesktopChallenge(mount, qrPayload, challenge, cfg);
      }
    } catch (err) {
      console.error("[AgeGate] Failed to render challenge:", err);

      if (context.cfg) {
        renderErrorState(
          context.cfg.mountElementId,
          err instanceof Error ? err : new Error(String(err)),
          context.cfg.cspNonce,
        );
      }
    }
  },

  redirect: ({ context }: { context: GateContext }) => {
    try {
      // Clean up QR on redirect
      cleanupStyledQR();

      if (!context.cfg) {
        console.error("[AgeGate] Missing config for redirect");
        return;
      }

      safeRedirect(context.cfg.contentUrl);
    } catch (err) {
      console.error("[AgeGate] Redirect failed:", err);
    }
  },
};

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
