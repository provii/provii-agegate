// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Synchronous XState actions for the AgeGate machine: skeleton render,
 * challenge render, and redirect.
 *
 * @module machine/actions
 */

import { isMobile } from "../../utils/device.js";
import { getOrCreateShadowRoot } from "../../core/shadow-dom.js";
import { t, getLocale, isRTL } from "../../i18n/index.js";
import { AgeGateError } from "../../errors/AgeGateError.js";
import type { GateContext } from "../AgeGateMachine.js";
import { clearShadowContent, cleanupStyledQR } from "./context.js";
import { ERROR_MESSAGES } from "./constants.js";
import { safeRedirect } from "./security.js";
import {
  type MobileContext,
  renderMobileChallenge,
  renderDesktopChallenge,
  renderErrorState,
} from "./render.js";

/* -------------------------------------------------------------------------- */
/*                               Machine ACTIONS                              */
/* -------------------------------------------------------------------------- */

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
