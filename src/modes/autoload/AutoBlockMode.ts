// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Auto-block mode orchestrator class.
 *
 * Drives the complete age verification flow with minimal configuration:
 * check for an existing session, block the page with an accessible overlay if
 * needed, poll for wallet verification, redeem with PKCE, and emit lifecycle
 * events.
 *
 * Relocated verbatim from modes/autoload.ts; the self-executing IIFE and
 * initAutoBlock entry remain in autoload.ts so auto-init still fires on import.
 *
 * @module modes/autoload/AutoBlockMode
 */

import { HostedBackendClient, ApiError, truncId } from "../../core/api-client.js";
import { PKCEManager } from "../../core/pkce.js";
import { SessionManager } from "../../core/session.js";
import { SessionCache } from "../../core/session-cache.js";
import type {
  AutoBlockConfig,
  Challenge,
  StatusResponse,
  SDKEvent,
  EventHandler,
  VerifiedEventData,
  ErrorEventData,
  StatusUpdateEventData,
  UnavailableEventData,
} from "../../core/types.js";
import { DEFAULT_POLLING_CONFIG } from "../../core/types.js";
import { isMobile } from "../../utils/device.js";
import {
  buildMobileChallengeUI,
  buildDesktopChallengeUI,
  type ChallengeUIResult,
} from "../../ui/challenge-ui.js";
import { isValidHexColour } from "../config-parser.js";
import { getOrCreateShadowRoot, injectStyles } from "../../core/shadow-dom.js";
import {
  t,
  getLocale,
  isRTL,
  detectLocale,
  setStringOverrides,
} from "../../i18n/index.js";
import { installPreviewBridge } from "../preview-bridge.js";
import {
  resolveFailureMode,
  readCachedFailureMode,
} from "../../core/failure-mode.js";
import type {
  AgegateConfigPayload,
  QrDotStyle,
  QrEyeFrameStyle,
  QrEyeDotStyle,
} from "../bridge-schema.js";
import DOMPurify from "dompurify";
import { OVERLAY_STYLES } from "./overlay-styles.js";
import {
  resolveAccentGradientCss,
  resolveAccentGradientStops,
  applyCosmeticCssVars,
} from "./gradient.js";

// Extracted string literals to satisfy sonarjs/no-duplicate-string
const SESSION_EXPIRED_MESSAGE = "Session expired";
const OVERLAY_CONTENT_SELECTOR = ".provii-overlay-content";

/**
 * Auto-block mode class
 *
 * Orchestrates the complete age verification flow.
 */
export class AutoBlockMode {
  private readonly config: AutoBlockConfig;
  private readonly apiClient: HostedBackendClient;
  private readonly pkceManager: PKCEManager;
  private readonly sessionManager: SessionManager;
  private readonly eventHandlers: Map<SDKEvent, Set<EventHandler>>;

  private overlayElement: HTMLElement | null = null;
  private shadowHost: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private pollingIntervalId: number | null = null;
  private currentChallenge: Challenge | null = null;
  private pollingStartTime: number = 0;
  private currentPollingInterval: number =
    DEFAULT_POLLING_CONFIG.initialInterval;
  private previousFocus: HTMLElement | null = null;
  /** M-45: Consecutive polling error counter for circuit breaker. */
  private consecutivePollingErrors: number = 0;
  private heartbeatShown: boolean = false;
  /** Shared challenge UI result for the current overlay rendering */
  private challengeUI: ChallengeUIResult | null = null;
  /** Preview bridge disposer (cleanup on destroy). */
  private previewBridgeDisposer: (() => void) | null = null;
  /** Preview layout override: forces desktop or mobile UI in preview mode. */
  private previewLayout: "desktop" | "mobile" | "auto" = "auto";
  /** QR dot style for preview. */
  private qrDotStyle: QrDotStyle | undefined;
  /** QR eye frame style for preview. */
  private qrEyeFrameStyle: QrEyeFrameStyle | undefined;
  /** QR eye dot style for preview. */
  private qrEyeDotStyle: QrEyeDotStyle | undefined;
  /** QR embedded logo URL for preview. */
  private qrLogoUrl: string | undefined;
  /** QR flat foreground colour for preview. */
  private qrForeground: string | undefined;
  /** QR flat background colour for preview. */
  private qrBackground: string | undefined;
  /**
   * Last-applied motion duration in the preview. Tracked so the bridge
   * can detect a real change and replay the entrance animation (the
   * --ag-motion-duration var alone is only read on (re)mount).
   */
  private previewMotionDuration: number | undefined;

  constructor(config: AutoBlockConfig) {
    this.config = config;

    // W10-3.2: register caller-supplied locale string overrides before any
    // UI rendering. setStringOverrides(null) resets the global map when the
    // option is absent so repeated instantiations don't leak overrides.
    setStringOverrides(config.strings ?? null);

    // Hydrate QR-style instance fields from the script-tag / programmatic
    // config so the production code path matches what the preview bridge
    // already supports. Without this, `data-qr-*` attributes parse fine
    // but `buildChallengeUI` still skips passing qrStyleOptions on the
    // production path because the `previewMode` gate (see line ~944) was
    // the only condition that read these fields.
    this.qrDotStyle = config.qrDotStyle;
    this.qrEyeFrameStyle = config.qrEyeFrameStyle;
    this.qrEyeDotStyle = config.qrEyeDotStyle;
    this.qrLogoUrl = config.qrLogoUrl;
    this.qrForeground = config.qrForeground;
    this.qrBackground = config.qrBackground;
    this.previewMotionDuration = config.motionDuration;

    // Initialise core components
    // Pass environment to HostedBackendClient for automatic endpoint selection
    // apiEndpoint takes precedence if explicitly provided
    this.apiClient = new HostedBackendClient({
      publicKey: config.publicKey,
      environment: config.environment,
      apiEndpoint: config.apiEndpoint,
      debug: config.debug,
      // Pass through so the client keys the failure-mode cache the same way the
      // read in handleUnavailable does: by (publicKey, onUnavailable).
      onUnavailable: config.onUnavailable ?? null,
    });

    this.pkceManager = new PKCEManager(config.debug);
    this.sessionManager = new SessionManager(config.environment, config.debug);
    this.eventHandlers = new Map();

    this.log("Auto-block mode initialised", { config });
  }

  /**
   * Initialise auto-block mode.
   *
   * Main entry point. In preview mode, renders a canned challenge UI
   * with no network calls. Otherwise checks for an existing session
   * and blocks the page with the verification overlay when no valid
   * session is found.
   */
  async initialise(): Promise<void> {
    this.log("Initialising");

    try {
      if (this.config.previewMode) {
        this.log("Preview mode enabled, rendering canned UI");
        this.showPreviewOverlay();
        return;
      }
      await this.checkAndBlock();
    } catch (error) {
      // Could not start verification at all: treat as an availability
      // failure and apply the integrator's onUnavailable policy.
      this.handleUnavailable("initialization_failed", error);
    }
  }

  /**
   * Render the overlay with a canned challenge for preview/demo purposes.
   * Makes zero network requests and parks the UI in the "waiting" state
   * indefinitely. A small dismissable banner is added so viewers know
   * the widget is not performing real verification.
   */
  private showPreviewOverlay(): void {
    const cannedChallenge: Challenge = {
      sessionId: "preview-session",
      challengeId: "preview-challenge",
      qrCodeUrl: "data:image/svg+xml,<svg/>",
      // 12 digits are required by buildDesktopChallengeUI (SSRF-065 short
      // code validation). Preview mode uses a visually-neutral canned
      // sequence so the formatted code reads "0000 0000 0000".
      challengeCode: "000000000000",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      deepLink: "proviiwallet://verify?d=preview",
      status: "pending",
    };

    this.currentChallenge = cannedChallenge;

    // Show the overlay shell first, then populate with challenge UI
    this.showOverlay(t("initialisingVerification"));
    this.updateOverlayWithChallenge(cannedChallenge);

    // Inject a dismissable preview banner inside the overlay content
    if (this.shadowRoot) {
      const content = this.shadowRoot.querySelector(OVERLAY_CONTENT_SELECTOR);
      if (content) {
        const banner = document.createElement("div");
        banner.className = "provii-preview-banner";
        banner.setAttribute("role", "status");

        const bannerText = document.createElement("span");
        bannerText.textContent = "Preview mode, no verification occurs";

        const dismissBtn = document.createElement("button");
        dismissBtn.setAttribute("aria-label", "Dismiss preview banner");
        dismissBtn.textContent = "\u00d7";
        dismissBtn.className = "provii-preview-banner-dismiss";
        dismissBtn.addEventListener("click", () => {
          banner.remove();
        });

        banner.appendChild(bannerText);
        banner.appendChild(dismissBtn);
        content.insertBefore(banner, content.firstChild);
      }
    }

    // Auto-install the preview bridge so the parent styler frame can
    // push config changes into the live preview via postMessage.
    //
    // Origin derivation priority:
    //   1. data-preview-origin attribute: comma-separated list of explicit
    //      origins supplied by the embedding docs page. Each entry was
    //      validated by parsePreviewOriginAttr before being stored on the
    //      config; wildcards are rejected at parse time.
    //   2. document.referrer: available when Referrer-Policy permits it.
    //      Extracted as a URL origin so only the scheme+host+port is used.
    //
    // When neither source yields any entries, the bridge is installed with
    // an empty allowlist and a warning is emitted. No messages will be
    // accepted until the embedding page is updated to supply
    // data-preview-origin.
    const allowedOrigins: string[] = [];

    if (this.config.previewOrigin) {
      // Priority 1: explicit attribute, already validated by config-parser.
      for (const entry of this.config.previewOrigin.split(",")) {
        const trimmed = entry.trim();
        if (trimmed) allowedOrigins.push(trimmed);
      }
    } else {
      // Priority 2: derive from referrer when no explicit list is provided.
      const parentOrigin = document.referrer
        ? (() => {
            try {
              return new URL(document.referrer).origin;
            } catch {
              return null;
            }
          })()
        : null;

      if (parentOrigin) {
        allowedOrigins.push(parentOrigin);
      } else {
        console.warn(
          "[Provii Age Gate] Preview bridge: no allowed origins available. " +
            "Add data-preview-origin to the script tag to enable postMessage.",
        );
      }
    }

    this.previewBridgeDisposer = installPreviewBridge({
      allowedOrigins,
      target: {
        update: (partial: Partial<AgegateConfigPayload>) => {
          this.applyPreviewConfig(partial);
        },
      },
      root: this.shadowHost ?? undefined,
    });
  }

  /**
   * Apply a preview configuration payload to the rendered overlay.
   *
   * Cosmetic-only: updates CSS custom properties, layout class, locale
   * strings, logo, and privacy link. Idempotent; designed to be called
   * on every debounced form keystroke from the parent styler without
   * tearing down and rebuilding the DOM.
   */
  applyPreviewConfig(payload: Partial<AgegateConfigPayload>): void {
    this.log("Applying preview config", { locale: payload.locale });

    // CSS custom properties are handled by the bridge's applyCssVars()
    // which writes directly to the shadow host element (passed as
    // `root` at installation time). This method only handles structural
    // updates that require DOM mutations beyond CSS variables.

    // --- Logo replacement ---
    if (
      this.shadowRoot &&
      (payload.logoSvg !== undefined || payload.logoUrl !== undefined)
    ) {
      const logoEl = this.shadowRoot.querySelector(".logo");
      if (logoEl) {
        const hasSvg =
          typeof payload.logoSvg === "string" && payload.logoSvg.trim() !== "";
        const hasUrl =
          typeof payload.logoUrl === "string" && payload.logoUrl.trim() !== "";
        if (hasSvg && payload.logoSvg) {
          const sanitisedSvg = DOMPurify.sanitize(payload.logoSvg, {
            USE_PROFILES: { svg: true, svgFilters: true },
            FORBID_TAGS: ["script"],
            FORBID_ATTR: ["onerror", "onload", "onclick"],
          });
          logoEl.innerHTML = sanitisedSvg;
          // Persist so a later QR/viewport rebuild (which reconstructs the
          // header from this.config) keeps the logo instead of reverting to
          // the default shield.
          this.config.logoSvg = payload.logoSvg;
        } else if (hasUrl && payload.logoUrl) {
          logoEl.innerHTML = "";
          const img = document.createElement("img");
          img.setAttribute("src", payload.logoUrl);
          img.setAttribute("alt", "");
          img.setAttribute("aria-hidden", "true");
          logoEl.appendChild(img);
          this.config.logoUrl = payload.logoUrl;
        }
        // When neither is provided, keep the existing default logo
      }
    }

    // --- Privacy policy URL ---
    // The privacy link element is only created by createFooter() when a URL
    // was supplied at initial render. In preview mode the first render has
    // no URL, so the element does not exist. If an update arrives later,
    // update the href on the existing element OR create the element inside
    // the footer if it is missing. Honours the same https-only guard the
    // footer builder applies.
    if (this.shadowRoot && payload.privacyPolicyUrl !== undefined) {
      const url = payload.privacyPolicyUrl.trim();
      const existing = this.shadowRoot.querySelector<HTMLAnchorElement>(
        ".agegate-privacy-link",
      );
      let isHttps = false;
      if (url) {
        try {
          isHttps = new URL(url).protocol === "https:";
        } catch {
          isHttps = false;
        }
      }
      if (isHttps) {
        // Persist so a later rebuild (createFooter reads
        // this.config.privacyPolicyUrl) keeps the link instead of dropping it.
        this.config.privacyPolicyUrl = url;
      }
      if (existing) {
        if (isHttps) {
          existing.href = url;
          existing.parentElement?.removeAttribute("hidden");
        } else {
          existing.parentElement?.setAttribute("hidden", "");
        }
      } else if (isHttps) {
        const footer = this.shadowRoot.querySelector(".footer");
        if (footer) {
          const privacyP = document.createElement("p");
          privacyP.className = "footer-privacy";
          const privacyLink = document.createElement("a");
          privacyLink.href = url;
          privacyLink.target = "_blank";
          privacyLink.rel = "noopener noreferrer";
          privacyLink.className = "agegate-privacy-link";
          privacyLink.textContent = t("privacyPolicyLinkLabel");
          privacyLink.setAttribute(
            "aria-label",
            `${t("privacyPolicyLinkLabel")} (opens in new tab)`,
          );
          privacyP.appendChild(privacyLink);
          footer.appendChild(privacyP);
        }
      }
    }

    // --- Locale and string overrides ---
    const localeChanged =
      payload.locale !== undefined && payload.locale !== getLocale();
    if (localeChanged && payload.locale) {
      detectLocale(payload.locale);
    }
    // Apply string overrides from the payload
    if (payload.strings && Object.keys(payload.strings).length > 0) {
      setStringOverrides(payload.strings);
    }

    // Re-render text when locale or strings changed
    if (
      localeChanged ||
      (payload.strings && Object.keys(payload.strings).length > 0)
    ) {
      this.rerenderTextContent();
    }

    // --- Preview layout override ---
    let needsQrRebuild = false;
    if (
      payload.previewLayout !== undefined &&
      payload.previewLayout !== this.previewLayout &&
      this.config.previewMode &&
      this.currentChallenge
    ) {
      this.previewLayout = payload.previewLayout;
      needsQrRebuild = true;
    }

    // --- QR structural changes ---
    if (
      payload.qrDotStyle !== undefined &&
      payload.qrDotStyle !== this.qrDotStyle
    ) {
      this.qrDotStyle = payload.qrDotStyle;
      needsQrRebuild = true;
    }
    if (
      payload.qrEyeFrameStyle !== undefined &&
      payload.qrEyeFrameStyle !== this.qrEyeFrameStyle
    ) {
      this.qrEyeFrameStyle = payload.qrEyeFrameStyle;
      needsQrRebuild = true;
    }
    if (
      payload.qrEyeDotStyle !== undefined &&
      payload.qrEyeDotStyle !== this.qrEyeDotStyle
    ) {
      this.qrEyeDotStyle = payload.qrEyeDotStyle;
      needsQrRebuild = true;
    }
    if (
      payload.qrLogoUrl !== undefined &&
      payload.qrLogoUrl !== this.qrLogoUrl
    ) {
      this.qrLogoUrl = payload.qrLogoUrl;
      needsQrRebuild = true;
    }
    if (
      payload.qrForeground !== undefined &&
      payload.qrForeground !== this.qrForeground
    ) {
      this.qrForeground = payload.qrForeground;
      needsQrRebuild = true;
    }
    if (
      payload.qrBackground !== undefined &&
      payload.qrBackground !== this.qrBackground
    ) {
      this.qrBackground = payload.qrBackground;
      needsQrRebuild = true;
    }

    // --- Accent gradient → QR ---
    // The header/body gradient already updates via the --ag-accent-gradient
    // CSS var (applied by the bridge before this call). The QR canvas reads
    // its stops at construction, so recolouring needs a rebuild with the new
    // stops threaded through this.config (resolveAccentGradientStops reads it).
    if (payload.accentGradient !== undefined) {
      const prev = this.config.accentGradient;
      const next = payload.accentGradient;
      const changed =
        !Array.isArray(prev) ||
        prev.length !== 3 ||
        prev[0] !== next[0] ||
        prev[1] !== next[1] ||
        prev[2] !== next[2];
      if (changed) {
        this.config.accentGradient = [next[0], next[1], next[2]] as [
          string,
          string,
          string,
        ];
        needsQrRebuild = true;
      }
    }

    if (needsQrRebuild && this.config.previewMode && this.currentChallenge) {
      this.updateOverlayWithChallenge(this.currentChallenge);
    }

    // --- Motion duration ---
    // The --ag-motion-duration var is applied by the bridge, but the
    // .container slideUp animation only reads it on (re)mount. Replay it so
    // dragging the slider has a visible effect. A QR rebuild above already
    // remounts .container at the new duration, so only replay when no rebuild
    // happened.
    if (
      payload.motionDuration !== undefined &&
      payload.motionDuration !== this.previewMotionDuration
    ) {
      this.previewMotionDuration = payload.motionDuration;
      if (!needsQrRebuild) {
        this.replayEntranceAnimation();
      }
    }

    // --- Direction ---
    if (this.overlayElement) {
      if (payload.locale) {
        this.overlayElement.setAttribute("lang", payload.locale);
      }
      // Set dir based on current locale after potential locale change
      const dirValue = isRTL() ? "rtl" : "ltr";
      this.overlayElement.setAttribute("dir", dirValue);
    }
  }

  /**
   * Restart the `.container` entrance (slideUp) animation so a changed
   * `--ag-motion-duration` is observable in the live preview. Toggling
   * `animation` off, forcing a reflow, then clearing the inline value
   * lets the keyframe re-read the (already-updated) custom property.
   * No-op when the container is not mounted.
   */
  private replayEntranceAnimation(): void {
    const container = this.shadowRoot?.querySelector<HTMLElement>(".container");
    if (!container) return;
    container.style.animation = "none";
    // Force a synchronous reflow so the browser registers the removal
    // before we restore the stylesheet-driven animation.
    void container.offsetWidth;
    container.style.animation = "";
  }

  /**
   * Re-render all visible text strings inside the overlay after a
   * locale change or string override update. Walks the existing DOM
   * and updates textContent in place.
   */
  private rerenderTextContent(): void {
    if (!this.shadowRoot) return;

    // Update heading
    const heading = this.shadowRoot.querySelector("h2");
    if (heading) heading.textContent = t("headerTitle");

    // Update subtitle
    const subtitleEl = this.challengeUI?.elements.subtitle;
    if (subtitleEl) subtitleEl.textContent = t("headerSubtitle");

    // Update status message
    const statusEl = this.challengeUI?.elements.statusMessage;
    if (statusEl) {
      const span = statusEl.querySelector("span");
      if (span) {
        // Desktop shows scanQrInstruction, mobile shows mobileStatusTap
        span.textContent = this.resolveIsMobile()
          ? t("mobileStatusTap")
          : t("scanQrInstruction");
      }
    }

    // Short code label
    const shortCodeLabel = this.shadowRoot.querySelector(
      ".agegate-shortcode-label",
    );
    if (shortCodeLabel) shortCodeLabel.textContent = t("shortCodeLabel");

    // Mobile CTA button
    const mobileBtn = this.challengeUI?.elements.mobileBtn;
    if (mobileBtn && mobileBtn.getAttribute("aria-disabled") !== "true") {
      mobileBtn.textContent = t("verifyButtonLabel");
    }

    // QR toggle label and button
    const qrToggleLabel = this.shadowRoot.querySelector(
      ".agegate-qr-toggle-label",
    );
    if (qrToggleLabel) qrToggleLabel.textContent = t("qrToggleLabel");
    const showQrBtn = this.shadowRoot.querySelector("#agegate-show-qr");
    if (showQrBtn) showQrBtn.textContent = t("showQrCode");

    // Time notice
    const timeNotice = this.shadowRoot.querySelector(".agegate-time-notice");
    if (timeNotice) timeNotice.textContent = t("timeNotice");

    // Help link
    const helpLink = this.shadowRoot.querySelector(".agegate-help-link");
    if (helpLink) helpLink.textContent = t("needHelp");

    // Footer
    const footerSubtitle = this.shadowRoot.querySelector(".footer-subtitle");
    if (footerSubtitle) footerSubtitle.textContent = t("footerSubtitle");
    const poweredByP = this.shadowRoot.querySelector(".footer p:first-child");
    if (poweredByP) {
      const linkEl = poweredByP.querySelector("a");
      if (linkEl) {
        // Rebuild: "Powered by " + link
        poweredByP.textContent = "";
        poweredByP.appendChild(document.createTextNode(`${t("poweredBy")} `));
        poweredByP.appendChild(linkEl);
      }
    }

    // Privacy policy link text
    const privacyLink = this.shadowRoot.querySelector(".agegate-privacy-link");
    if (privacyLink) privacyLink.textContent = t("privacyPolicyLinkLabel");

    // Overlay-level accessible name
    if (this.overlayElement) {
      this.overlayElement.setAttribute(
        "aria-label",
        t("ageVerificationRegion"),
      );
    }
  }

  /**
   * Check session and block if needed
   */
  async checkAndBlock(): Promise<void> {
    this.log("Checking for existing session");

    // Layer 1: Instant client-side cache check
    if (SessionCache.isValid()) {
      this.log("Valid session cache found, skipping API check");
      // Optionally trigger background revalidation
      this.backgroundRevalidate().catch((error) => {
        this.log("Background revalidation failed", { error });
      });
      return;
    }

    // Layer 2: Check for session cookie
    if (this.sessionManager.hasSession()) {
      this.log("Valid session cookie found, allowing access");

      // Cache the session for next time
      const session = this.sessionManager.getSession();
      if (session) {
        SessionCache.set({
          sessionId: session.sessionId,
          verifiedAt: session.issuedAt,
          expiresAt: session.expiresAt,
          origin: session.origin,
        });
      }

      return;
    }

    this.log("No valid session, blocking access");

    // Clear any stale cache
    SessionCache.clear();

    // Show overlay and start verification
    await this.blockAndVerify();
  }

  /**
   * Background revalidation of cached session
   *
   * Optionally checks with the server to ensure the cached session is still valid.
   * This runs in the background and doesn't block page load.
   * If the session is invalid, it clears the cache for next time.
   */
  private async backgroundRevalidate(): Promise<void> {
    this.log("Starting background revalidation");

    try {
      // Check if session cookie still exists and is valid
      if (!this.sessionManager.hasSession()) {
        this.log(
          "Background revalidation: No session cookie found, clearing cache",
        );
        SessionCache.clear();
        return;
      }

      // Optionally, we could make an API call here to verify with server
      // For now, we just ensure the cookie matches the cache
      const session = this.sessionManager.getSession();
      const cached = SessionCache.get();

      if (!session || !cached) {
        SessionCache.clear();
        return;
      }

      // Verify session IDs match
      if (session.sessionId !== cached.sessionId) {
        this.log("Background revalidation: Session mismatch, clearing cache");
        SessionCache.clear();
        return;
      }

      this.log("Background revalidation: Session valid");
    } catch (error) {
      this.log("Background revalidation error", { error });
      // Don't clear cache on errors - network might be temporarily down
    }
  }

  /**
   * Block access and start verification flow
   */
  private async blockAndVerify(): Promise<void> {
    try {
      // 1. Show loading overlay
      this.showOverlay(t("initialisingVerification"));

      // 2. Generate PKCE challenge
      this.log("Generating PKCE challenge");
      const pkce = await this.pkceManager.generateChallenge();

      // 3. Create verification challenge
      this.log("Creating verification challenge");
      const challenge = await this.apiClient.createChallenge({
        codeChallenge: pkce.challenge,
        codeChallengeMethod: "S256",
        origin: window.location.origin,
      });

      this.currentChallenge = challenge;

      // 4. Store PKCE verifier
      this.pkceManager.storeVerifier(challenge.sessionId, pkce.verifier);

      // 5. Update overlay with QR code
      this.updateOverlayWithChallenge(challenge);

      // 6. Start polling
      this.startPolling(challenge.sessionId);
    } catch (error) {
      // PKCE/challenge creation failed: Provii is unreachable. Availability
      // failure, so apply the onUnavailable policy rather than hard-blocking.
      this.handleUnavailable("verification_failed", error);
    }
  }

  /**
   * Start polling for verification status
   */
  private startPolling(sessionId: string): void {
    this.log("Starting status polling", { sessionId: truncId(sessionId) });

    this.pollingStartTime = Date.now();
    this.currentPollingInterval = DEFAULT_POLLING_CONFIG.initialInterval;
    this.consecutivePollingErrors = 0;
    this.heartbeatShown = false;

    // Poll immediately
    this.pollStatus(sessionId);

    // Set up interval
    this.pollingIntervalId = window.setInterval(() => {
      this.pollStatus(sessionId);
    }, this.currentPollingInterval);
  }

  /**
   * Poll verification status
   */
  private async pollStatus(sessionId: string): Promise<void> {
    try {
      // Check timeout
      const elapsed = Date.now() - this.pollingStartTime;
      if (elapsed > DEFAULT_POLLING_CONFIG.timeout) {
        this.stopPolling();
        this.handleTimeout();
        return;
      }

      // Poll status
      const status = await this.apiClient.pollStatus(sessionId);

      // Reset consecutive error counter on any successful response
      this.consecutivePollingErrors = 0;

      this.log("Status received", {
        state: status.state,
        complete: status.complete,
      });

      // Emit status update event
      this.emit("statusUpdate", {
        sessionId,
        status: status.state,
        proofVerified: status.proofVerified,
      } as StatusUpdateEventData);

      // Handle based on state
      if (status.state === "proof_ok") {
        this.log("Proof verified, redeeming session");
        this.stopPolling();
        this.updateInstructionText(t("proofReceivedConfirming"), "Confirming");
        await this.redeemSession(sessionId);
      } else if (status.state === "verified") {
        this.log("Session already verified");
        this.stopPolling();
        this.handleVerified(sessionId, status);
      } else if (status.state === "expired") {
        this.log(SESSION_EXPIRED_MESSAGE);
        this.stopPolling();
        this.handleExpired();
      } else if (status.state === "revoked") {
        this.log("Session revoked");
        this.stopPolling();
        this.handleError(
          "session_revoked",
          new Error(status.error || "Session revoked"),
        );
      } else if (status.state === "pending") {
        // Show heartbeat after 20 seconds to confirm system is alive
        const elapsed = Date.now() - this.pollingStartTime;
        if (elapsed > 20_000 && !this.heartbeatShown) {
          this.heartbeatShown = true;
          this.updateInstructionText(t("stillWaiting"), "Checking");
        }
        // Continue polling with backoff
        this.updatePollingInterval();
      }
    } catch (error) {
      this.consecutivePollingErrors++;
      this.log("Polling error", {
        error,
        consecutiveErrors: this.consecutivePollingErrors,
      });

      // M-44: If the server returned a 429 with Retry-After, use it as
      // the next poll interval instead of the default backoff strategy.
      if (error instanceof ApiError && error.retryAfterMs) {
        this.log("Honouring Retry-After header", {
          retryAfterMs: error.retryAfterMs,
        });
        this.currentPollingInterval = error.retryAfterMs;
        if (this.pollingIntervalId !== null) {
          clearInterval(this.pollingIntervalId);
          this.pollingIntervalId = window.setInterval(() => {
            if (this.currentChallenge) {
              this.pollStatus(this.currentChallenge.sessionId);
            }
          }, this.currentPollingInterval);
        }
      }

      // M-45: Circuit breaker. After 5 consecutive errors, stop polling
      // and transition to an error state to avoid hammering a degraded
      // backend indefinitely.
      const maxConsecutiveErrors = 5;
      if (this.consecutivePollingErrors >= maxConsecutiveErrors) {
        this.log("Circuit breaker triggered after consecutive errors", {
          count: this.consecutivePollingErrors,
        });
        this.stopPolling();
        // Repeated polling errors against a degraded backend: availability
        // failure, so apply the onUnavailable policy.
        this.handleUnavailable(
          "polling_circuit_breaker",
          new Error(
            `Polling stopped after ${this.consecutivePollingErrors} consecutive errors`,
          ),
        );
      }
    }
  }

  /**
   * Redeem verified session
   */
  private async redeemSession(sessionId: string): Promise<void> {
    try {
      this.updateOverlayStatus(t("completingVerification"));

      // Get PKCE verifier
      const verifier = this.pkceManager.getVerifier(sessionId);
      if (!verifier) {
        throw new Error("PKCE verifier not found");
      }

      // Redeem session
      const result = await this.apiClient.redeemSession(sessionId, verifier);

      this.log("Session redeemed", { verifiedAt: result.verifiedAt });

      // Clear PKCE verifier
      this.pkceManager.clearVerifier(sessionId);

      // Handle successful verification
      this.handleVerified(sessionId, {
        sessionId,
        state: "verified",
        complete: true,
        createdAt: 0,
        expiresAt: result.expiresAt,
        proofVerified: true,
        remainingChecks: 0,
      });
    } catch (error) {
      this.handleError("redemption_failed", error);
    }
  }

  /**
   * Handle successful verification
   */
  private handleVerified(sessionId: string, status: StatusResponse): void {
    this.log("Verification successful");

    // Cache the session for instant future validation
    SessionCache.set({
      sessionId,
      verifiedAt: Math.floor(Date.now() / 1000),
      expiresAt: status.expiresAt,
      origin: window.location.origin,
    });

    // Hide overlay
    this.hideOverlay();

    // Emit verified event
    this.emit("verified", {
      sessionId,
      verifiedAt: Date.now(),
    } as VerifiedEventData);
  }

  /**
   * Handle timeout
   */
  private handleTimeout(): void {
    this.log("Verification timeout");

    this.updateOverlayStatus(t("verificationTimedOut"), true);

    this.emit("timeout", { message: "Verification timed out" });
  }

  /**
   * Handle expired session
   */
  private handleExpired(): void {
    this.log(SESSION_EXPIRED_MESSAGE);

    // Clear cache on expiration
    SessionCache.clear();

    this.updateOverlayStatus(t("sessionExpired"), true);

    this.emit("expired", { message: SESSION_EXPIRED_MESSAGE });
  }

  /**
   * Handle errors
   *
   * Displays a generic message to the user and emits a safe error event.
   * The specific error.message is only written to the debug log so that
   * internal details (stack traces, server text) never reach the overlay
   * or external event consumers.
   */
  private handleError(code: string, error: unknown): void {
    const debugMessage =
      error instanceof Error ? error.message : "Unknown error";
    this.log("Error", { code, message: debugMessage });

    // Clear cache on verification failure
    SessionCache.clear();

    // Generic overlay text. Never forward error.message to the UI.
    this.updateOverlayStatus(t("somethingWentWrong"), true);

    this.emit("error", {
      code,
      message: "Verification error",
      details: error instanceof ApiError ? error.code : undefined,
    } as ErrorEventData);
  }

  /**
   * Handle an AVAILABILITY failure: Provii could not return a verdict
   * because it was unreachable, errored, or exhausted its retry budget.
   *
   * Distinct from {@link handleError}, which is for genuine rejections
   * (revoked/redeem failures) that always block. This applies the
   * integrator's `data-on-unavailable` policy:
   *
   * - 'allow'  reveal the page (fail open).
   * - 'block'  keep the page blocked (fail closed).
   * - 'defer'  keep the page blocked and emit `unavailable` so the
   *            integrator's handler can route to a fallback provider.
   * - unset    fail closed and log an error (never a silent allow).
   *
   * Always emits the `unavailable` event so integrators can observe how the
   * gate degraded regardless of the chosen action.
   */
  private handleUnavailable(reason: string, error: unknown): void {
    // Resolve the effective failure mode in precedence: a locked server
    // policy, then the integrator's data-on-unavailable, then the server
    // default (live value this session, else the cached value so it still
    // applies during the outage), else the safe "block" default.
    const attribute = this.config.onUnavailable ?? null;
    const serverMode = this.currentChallenge?.failureMode ?? null;
    const cachedServerMode = readCachedFailureMode(
      this.config.publicKey,
      attribute,
    );
    const action = resolveFailureMode({
      server: {
        mode: serverMode,
        locked: this.currentChallenge?.failureModeLocked ?? false,
      },
      attribute,
      cachedServerMode,
    });
    // Force-explicit nag fires only when the mode was configured NOWHERE
    // (no attribute, no server value, no cache); the resolver still returns
    // "block" in that case so the page stays safe.
    const noPolicyAnywhere = !attribute && !serverMode && !cachedServerMode;
    const code = error instanceof ApiError ? error.code : undefined;
    this.log("Service unavailable", { reason, action, code });

    // An outage is not a verification result; never leave a stale session.
    SessionCache.clear();

    this.emit("unavailable", {
      action,
      reason,
      ...(code ? { code } : {}),
    } as UnavailableEventData);

    if (action === "allow") {
      // Fail open: the relying party chose availability over compliance for
      // the outage window. Reveal the page by removing the overlay.
      this.hideOverlay();
      return;
    }

    if (action === "defer") {
      // The integrator drives the fallback via the `unavailable` event
      // (e.g. redirect to a secondary provider). Keep the page blocked as
      // the safe backstop until they navigate away.
      this.updateOverlayStatus(t("somethingWentWrong"), true);
      return;
    }

    if (noPolicyAnywhere) {
      // An unset policy must never silently allow. Fail closed and shout so
      // the missing decision is impossible to miss in production.
      console.error(
        "[Provii Age Gate] Provii was unreachable and data-on-unavailable " +
          "is not set. Failing closed (blocking the page). Set " +
          'data-on-unavailable to "block", "allow", or "defer". See ' +
          "https://docs.provii.app/guides/resilience-and-failover",
      );
    }

    // 'block' or unset: behaviour is byte-identical to the previous
    // handleError path. Emit the legacy `error` event too so existing
    // integrators that detect outages via on('error', ...) keep working,
    // then show the blocking prompt.
    this.emit("error", {
      code: reason,
      message: "Verification error",
      details: code,
    } as ErrorEventData);
    this.updateOverlayStatus(t("somethingWentWrong"), true);
  }

  /**
   * Update polling interval with backoff
   */
  private updatePollingInterval(): void {
    const newInterval = Math.min(
      this.currentPollingInterval * DEFAULT_POLLING_CONFIG.backoffMultiplier,
      DEFAULT_POLLING_CONFIG.maxInterval,
    );

    if (newInterval !== this.currentPollingInterval) {
      this.currentPollingInterval = newInterval;
      this.log("Updating polling interval", { interval: newInterval });

      // Restart interval with new timing
      if (this.pollingIntervalId !== null) {
        clearInterval(this.pollingIntervalId);
        this.pollingIntervalId = window.setInterval(() => {
          if (this.currentChallenge) {
            this.pollStatus(this.currentChallenge.sessionId);
          }
        }, this.currentPollingInterval);
      }
    }
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollingIntervalId !== null) {
      this.log("Stopping polling");
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
  }

  /**
   * Show the full-viewport modal overlay. Inert-masks the background
   * and locks scroll so the verification gate blocks the page until
   * the user completes (or dismisses) the flow.
   */
  private showOverlay(message: string): void {
    if (typeof document === "undefined") {
      return;
    }

    // Store current focus for restoration
    this.previousFocus = document.activeElement as HTMLElement;

    // Create overlay if it doesn't exist
    if (!this.overlayElement) {
      this.overlayElement = this.createOverlay();
      document.body.appendChild(this.shadowHost as HTMLElement);
    }

    // Prevent background scroll while overlay is shown
    document.body.style.overflow = "hidden";
    // Restore body visibility (the CF edge Worker hides it initially)
    document.body.style.visibility = "visible";
    // Set inert on background content
    Array.from(document.body.children).forEach((child) => {
      if (child !== this.shadowHost && child instanceof HTMLElement) {
        child.setAttribute("inert", "");
      }
    });

    this.updateOverlayStatus(message);

    // Move focus into overlay
    const content = this.shadowRoot?.querySelector(
      OVERLAY_CONTENT_SELECTOR,
    ) as HTMLElement | null;
    if (content) {
      content.setAttribute("tabindex", "-1");
      content.focus();
    }
  }

  /**
   * Update overlay with challenge details using the shared branded UI builder.
   *
   * Delegates visual rendering to buildMobileChallengeUI/buildDesktopChallengeUI
   * (from ui/challenge-ui.ts), which produce the same branded UI as the manual
   * AgeGate class: gradient CTA button, StyledQR, theme variables, dark mode,
   * QR toggle on mobile, visibility change handler.
   */
  private updateOverlayWithChallenge(challenge: Challenge): void {
    if (!this.shadowRoot) {
      return;
    }

    const content = this.shadowRoot.querySelector(OVERLAY_CONTENT_SELECTOR);
    if (!content) {
      return;
    }

    // Clean up previous challenge UI
    if (this.challengeUI) {
      this.challengeUI.destroy();
      this.challengeUI = null;
    }

    const uiData = {
      shortCode: challenge.challengeCode,
      deepLink: challenge.deepLink,
      qrPayload: JSON.stringify({ challenge_id: challenge.challengeId }),
      cutoffDays: challenge.cutoffDays,
      proofDirection: challenge.proofDirection,
    };

    const accentStops = this.resolveAccentGradientStops();
    // Build QR style options from instance state. Constructor hydrates
    // these from `config` (script-tag or programmatic), and the preview
    // bridge mutates them via update(). Either way, an explicit value
    // here lands in the QR module via uiOptions.qrStyleOptions.
    const qrStyleOptions =
      this.qrDotStyle ||
      this.qrEyeFrameStyle ||
      this.qrEyeDotStyle ||
      this.qrLogoUrl ||
      this.qrForeground ||
      this.qrBackground
        ? {
            ...(this.qrDotStyle ? { dotStyle: this.qrDotStyle } : {}),
            ...(this.qrEyeFrameStyle
              ? { eyeFrameStyle: this.qrEyeFrameStyle }
              : {}),
            ...(this.qrEyeDotStyle ? { eyeDotStyle: this.qrEyeDotStyle } : {}),
            ...(this.qrLogoUrl ? { logoUrl: this.qrLogoUrl } : {}),
            ...(this.qrForeground ? { fgColour: this.qrForeground } : {}),
            ...(this.qrBackground ? { bgColour: this.qrBackground } : {}),
          }
        : undefined;

    const uiOptions = {
      cspNonce: this.config.cspNonce,
      isSandbox: this.config.environment === "sandbox",
      logoUrl: this.config.logoUrl,
      logoSvg: this.config.logoSvg,
      ...(accentStops ? { accentGradientStops: accentStops } : {}),
      ...(this.config.privacyPolicyUrl
        ? { privacyPolicyUrl: this.config.privacyPolicyUrl }
        : {}),
      ...(qrStyleOptions ? { qrStyleOptions } : {}),
    };

    const mobile = this.resolveIsMobile();
    const ui = mobile
      ? buildMobileChallengeUI(uiData, uiOptions)
      : buildDesktopChallengeUI(uiData, uiOptions);

    // Inject the challenge styles into the overlay's shadow root
    injectStyles(this.shadowRoot, ui.styles, this.config.cspNonce);

    // Clear overlay content and mount the branded UI
    content.innerHTML = "";

    // Add close button at the overlay level (outside the challenge UI)
    if (this.config.allowClose) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "provii-close-button";
      closeBtn.setAttribute("aria-label", t("closeVerification"));
      closeBtn.innerHTML = '<span aria-hidden="true">\u00d7</span>';
      closeBtn.addEventListener("click", () => {
        this.hideOverlay();
        this.stopPolling();
        this.emit("closed", {});
      });
      content.appendChild(closeBtn);
    }

    content.appendChild(ui.root);
    this.challengeUI = ui;

    // Wire mobile visibility handler for return-from-wallet
    if (mobile && ui.elements.mobileBtn) {
      const btn = ui.elements.mobileBtn;
      const visHandler = async () => {
        if (document.visibilityState !== "visible") return;
        // Only act if the shared UI's handler set the button to checking state
        if (btn.getAttribute("aria-disabled") !== "true") return;

        try {
          const sessionId = challenge.sessionId;
          const statusRes = await this.apiClient.pollStatus(sessionId);

          if (
            statusRes.state === "proof_ok" ||
            statusRes.state === "verified"
          ) {
            this.handleVerified(sessionId, statusRes);
            return;
          }

          // Still pending. Reset button, let polling continue
          btn.textContent = t("verifyButtonLabel");
          btn.style.background = "";
          btn.style.color = "";
          btn.style.pointerEvents = "";
          btn.removeAttribute("aria-disabled");
        } catch {
          // Reset button on error
          btn.textContent = t("verifyButtonLabel");
          btn.style.background = "";
          btn.style.color = "";
          btn.style.pointerEvents = "";
          btn.removeAttribute("aria-disabled");
        }
      };
      document.addEventListener("visibilitychange", visHandler);

      // Extend the UI's destroy to also clean up this handler
      const originalDestroy = ui.destroy;
      ui.destroy = () => {
        document.removeEventListener("visibilitychange", visHandler);
        originalDestroy();
      };
    }

    // Update dialog labelling
    if (this.overlayElement) {
      this.overlayElement.removeAttribute("aria-label");
      this.overlayElement.setAttribute(
        "aria-labelledby",
        "provii-overlay-heading",
      );
    }
  }

  /**
   * Update just the status text in the challenge UI without destroying it.
   * Used for heartbeat and confirming status during polling.
   */
  private updateInstructionText(
    message: string,
    _indicatorText?: string,
  ): void {
    const el = this.challengeUI?.elements.statusMessage;
    if (!el) return;
    const span = el.querySelector("span");
    if (span) {
      span.textContent = message;
    } else {
      el.textContent = message;
    }
  }

  private updateOverlayStatus(message: string, urgent: boolean = false): void {
    if (!this.overlayElement || !this.shadowRoot) {
      return;
    }

    // Destroy the challenge UI since we're replacing it with a status message
    if (this.challengeUI) {
      this.challengeUI.destroy();
      this.challengeUI = null;
    }

    // Restore the dialog's accessible name
    this.overlayElement.removeAttribute("aria-labelledby");
    this.overlayElement.setAttribute("aria-label", t("ageVerificationRegion"));

    const content = this.shadowRoot.querySelector(OVERLAY_CONTENT_SELECTOR);
    if (!content) {
      return;
    }

    // Build status UI programmatically (no innerHTML interpolation, XSS safe)
    content.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.setAttribute("role", urgent ? "alert" : "status");
    wrapper.setAttribute("aria-live", urgent ? "assertive" : "polite");

    const msg = document.createElement("p");
    msg.className = "provii-status-message";
    msg.textContent = message;
    wrapper.appendChild(msg);

    content.appendChild(wrapper);

    if (urgent) {
      const retryBtn = document.createElement("button");
      retryBtn.className = "provii-retry-button";
      retryBtn.textContent = t("tryAgain");
      retryBtn.addEventListener("click", () => {
        window.location.reload();
      });
      content.appendChild(retryBtn);
      requestAnimationFrame(() => retryBtn.focus());
    }
  }

  /**
   * Hide overlay
   */
  private hideOverlay(): void {
    // Clean up the challenge UI (removes visibility listeners, destroys StyledQR)
    if (this.challengeUI) {
      this.challengeUI.destroy();
      this.challengeUI = null;
    }

    // Restore background scroll
    document.body.style.overflow = "";

    if (this.shadowHost) {
      // Remove inert from background content
      Array.from(document.body.children).forEach((child) => {
        if (child instanceof HTMLElement && child.hasAttribute("inert")) {
          child.removeAttribute("inert");
        }
      });

      this.shadowHost.remove();
      this.shadowHost = null;
      this.shadowRoot = null;
      this.overlayElement = null;
    }
    if (this.previousFocus) {
      this.previousFocus.focus();
      this.previousFocus = null;
    }
  }

  /**
   * Determine whether the challenge UI should render as mobile. In
   * preview mode, `previewLayout` overrides the UA check so the styler
   * can toggle between desktop and mobile without a real device.
   */
  private resolveIsMobile(): boolean {
    if (this.config.previewMode && this.previewLayout !== "auto") {
      return this.previewLayout === "mobile";
    }
    return isMobile();
  }

  /**
   * Resolve an optional caller-supplied accent gradient into a CSS value
   * suitable for `--ag-accent-gradient`. Delegates to the extracted
   * gradient helper; kept as a thin method so the instance surface
   * (and existing private-method callers) is preserved.
   */
  private resolveAccentGradientCss(): string | null {
    return resolveAccentGradientCss(this.config);
  }

  /**
   * If accentGradient is configured as a tuple, expose it to the StyledQR
   * renderer which takes hex strings rather than a CSS gradient value.
   * Delegates to the extracted gradient helper.
   */
  private resolveAccentGradientStops():
    | readonly [string, string, string]
    | null {
    return resolveAccentGradientStops(this.config);
  }

  /**
   * Apply the cosmetic styler knobs as CSS custom properties on the
   * shadow host. Delegates to the extracted gradient helper.
   */
  private applyCosmeticCssVars(shadowHost: HTMLElement): void {
    applyCosmeticCssVars(shadowHost, this.config);
  }

  /**
   * Create overlay element
   */
  private createOverlay(): HTMLElement {
    // Create shadow host and closed shadow root
    const shadowHost = document.createElement("div");
    const shadowRoot = getOrCreateShadowRoot(shadowHost, this.config.cspNonce);

    // W10-3.5: apply caller-supplied accent gradient before any UI renders
    // so the CSS custom property is available to both theme CSS and the
    // StyledQR container lookup. Setting it on the shadow host inherits
    // into the shadow tree via CSS custom property inheritance.
    const accentCss = this.resolveAccentGradientCss();
    if (accentCss) {
      shadowHost.style.setProperty("--ag-accent-gradient", accentCss);
    }

    // Apply brand colour override to --ag-accent-start so all accent-derived
    // tokens (CTA borders, focus rings, spinners, badge text, short code) pick
    // it up. When brandColor is absent but accentGradient is a tuple, derive
    // --ag-accent-start from the first stop for consistency.
    if (this.config.brandColor && isValidHexColour(this.config.brandColor)) {
      shadowHost.style.setProperty("--ag-accent-start", this.config.brandColor);
    } else if (
      Array.isArray(this.config.accentGradient) &&
      this.config.accentGradient.length === 3
    ) {
      shadowHost.style.setProperty(
        "--ag-accent-start",
        this.config.accentGradient[0],
      );
    }

    // Apply the styler-knob cosmetic CSS vars on the same shadow host.
    // Mirrors `applyCssVars` in modes/preview-bridge.ts so a snippet
    // pasted into a real site renders the same as the styler preview.
    this.applyCosmeticCssVars(shadowHost);

    this.shadowHost = shadowHost;
    this.shadowRoot = shadowRoot;

    // Inject overlay-specific styles into the shadow root
    this.injectOverlayStyles();

    // Create the overlay element inside the shadow root
    const overlay = document.createElement("div");
    overlay.className = "provii-age-gate-overlay";
    const overlayLocale = getLocale();
    overlay.setAttribute("lang", overlayLocale);
    if (isRTL()) {
      overlay.setAttribute("dir", "rtl");
    }
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", t("ageVerificationRegion"));

    const overlayContent = document.createElement("div");
    overlayContent.className = "provii-overlay-content";
    const statusWrapper = document.createElement("div");
    statusWrapper.setAttribute("role", "status");
    statusWrapper.setAttribute("aria-live", "polite");
    statusWrapper.setAttribute("aria-atomic", "true");
    const loadingP = document.createElement("p");
    loadingP.textContent = t("loading");
    statusWrapper.appendChild(loadingP);
    overlayContent.appendChild(statusWrapper);
    overlay.appendChild(overlayContent);

    // Escape hatch link when allowClose is false
    if (!this.config.allowClose) {
      const escapeLink = document.createElement("a");
      escapeLink.href = "about:blank";
      escapeLink.className = "provii-escape-link";
      escapeLink.textContent = t("leaveSite");
      escapeLink.setAttribute("tabindex", "0");
      overlayContent.appendChild(escapeLink);
    }

    shadowRoot.appendChild(overlay);

    // Focus trap and keyboard handling
    overlay.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape" && this.config.allowClose) {
        this.hideOverlay();
        this.stopPolling();
        this.emit("closed", {});
        return;
      }
      if (e.key === "Tab") {
        const focusable = shadowRoot.querySelectorAll<HTMLElement>(
          'a[href], button, input, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) {
          // Prevent focus from escaping when no focusable elements
          // and inert is unsupported (Safari < 15.5)
          e.preventDefault();
          // Ensure content div is focusable as fallback
          const contentDiv = shadowRoot.querySelector(
            OVERLAY_CONTENT_SELECTOR,
          ) as HTMLElement;
          if (contentDiv) {
            contentDiv.setAttribute("tabindex", "-1");
            contentDiv.focus();
          }
          return;
        }
        const first = focusable.item(0);
        const last = focusable.item(focusable.length - 1);
        if (!first || !last) return;
        // In shadow DOM, activeElement on the shadow root gives the focused
        // element inside the shadow tree (document.activeElement returns the
        // host).
        const activeElementInShadow = shadowRoot.activeElement;
        if (e.shiftKey && activeElementInShadow === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && activeElementInShadow === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    return overlay;
  }

  /**
   * Inject overlay-specific CSS into the shadow root.
   *
   * The theme CSS is already injected by getOrCreateShadowRoot(). This
   * method adds the overlay layout styles (and any custom styles from
   * config) into the same shadow root so they are fully encapsulated.
   *
   * Applies CSP nonce to the style element when configured (CH-170/CH-173).
   */
  private injectOverlayStyles(): void {
    if (!this.shadowRoot) {
      return;
    }

    // Inject overlay-specific styles (getStyles() returns custom CSS when
    // style === "custom", otherwise the default overlay layout CSS).
    injectStyles(this.shadowRoot, this.getStyles(), this.config.cspNonce);
  }

  /**
   * Get CSS styles based on config
   */
  private getStyles(): string {
    if (this.config.style === "custom" && this.config.customStyles) {
      return this.config.customStyles;
    }

    // Overlay shell CSS only. Challenge content styling is provided by the
    // shared challenge-ui module (injected via injectStyles on render).
    return OVERLAY_STYLES;
  }

  /**
   * Dispose of all resources. Stops polling, removes the overlay,
   * clears the preview bridge, and releases event handlers. Safe to call
   * multiple times.
   */
  destroy(): void {
    this.stopPolling();
    this.hideOverlay();
    if (this.previewBridgeDisposer) {
      this.previewBridgeDisposer();
      this.previewBridgeDisposer = null;
    }
    this.eventHandlers.clear();
  }

  /**
   * Register event handler
   */
  on(event: SDKEvent, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(handler);
  }

  /**
   * Unregister event handler
   */
  off(event: SDKEvent, handler: EventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  /**
   * Emit event
   */
  private emit(event: SDKEvent, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[Provii Age Gate] Error in ${event} handler:`, error);
        }
      });
    }
  }

  /**
   * Log debug messages to the browser console.
   *
   * Uses `console.debug` so that messages are hidden by default in most
   * browser developer tools.
   */
  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
      console.debug(`[AutoBlockMode] ${message}`, data || "");
    }
  }
}
