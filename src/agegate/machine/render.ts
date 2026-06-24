// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Deep-link & QR rendering for the AgeGate machine: the mobile and desktop
 * challenge renderers, the error-state renderer, and the in-flow status
 * feedback (confirming / heartbeat) helpers.
 *
 * @module machine/render
 */

import { renderQrToCanvas } from "../../utils/qr.js";
import {
  fetchWithTimeout,
  safeReadJson,
} from "../../utils/fetchWithTimeout.js";
import {
  buildMobileChallengeUI,
  buildDesktopChallengeUI,
} from "../../ui/challenge-ui.js";
import {
  getOrCreateShadowRoot,
  getShadowRoot,
  injectStyles,
} from "../../core/shadow-dom.js";
import { t, getLocale, isRTL } from "../../i18n/index.js";
import { AgeGateError } from "../../errors/AgeGateError.js";
import type {
  CreateChallengeResponse,
  StatusResponse,
  QRPayload,
} from "../../api/v1.js";
import type { AgeGateConfig } from "../AgeGateConfig.js";
import { machineCtx, clearShadowContent } from "./context.js";
import {
  ERROR_MESSAGES,
  ARIA_DISABLED,
  getVerifyButtonLabel,
  isNonNullRecord,
} from "./constants.js";
import { safeRedirect, pkceManager } from "./security.js";
import { redeemChallenge } from "./api.js";
import { injectMachineServiceStyles } from "./styles.js";
import { renderSandboxSimulator } from "./sandbox-simulator.js";

export interface MobileContext {
  sessionId: string;
  statusUrl: string;
  contentUrl: string;
  cfg: AgeGateConfig;
  challenge: CreateChallengeResponse;
}

export function renderMobileChallenge(
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

export async function renderDesktopChallenge(
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

export function renderErrorState(
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
export function showConfirmingStatus(mountElementId: string): void {
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
export function showHeartbeatStatus(mountElementId: string): void {
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
