// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Shared challenge UI builder for both AgeGate (manual mode) and
 * AutoBlockMode (CDN script tag mode).
 *
 * Produces a DOM tree with branded styling (gradient CTA, StyledQR,
 * theme variables, dark mode, QR toggle) without any business logic.
 * Callers mount the returned fragment into their own shadow root and
 * wire PKCE, status polling, simulation, and redirect logic around the
 * exposed element references.
 *
 * @module ui/challenge-ui
 */

import DOMPurify from "dompurify";
import { StyledQR, type QrStyleOptions } from "./StyledQR.js";
import { renderQrToCanvas } from "../utils/qr.js";
import { t, getLocale, isRTL } from "../i18n/index.js";

/**
 * DOMPurify configuration for SVG content.
 * Allows SVG elements and filters while blocking script injection vectors.
 */
const SVG_PURIFY_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS: ["script"] as string[],
  FORBID_ATTR: ["onerror", "onload", "onclick"] as string[],
};

/* ─────────────────────── Types ─────────────────────── */

interface ChallengeUIData {
  /** 12-digit short code for manual entry */
  shortCode: string;
  /** Deep link URL (proviiwallet://verify?d=...) */
  deepLink: string;
  /** JSON string for QR code payload */
  qrPayload: string;
  /** Epoch day cutoff for age description (optional) */
  cutoffDays?: number;
  /** "over_age" or "under_age" (optional) */
  proofDirection?: string;
}

interface ChallengeUIOptions {
  /** CSP nonce for inline style elements */
  cspNonce?: string;
  /** Whether to render sandbox simulator mount point */
  isSandbox?: boolean;
  /**
   * Brand logo URL rendered inside the header circle (W10-3.4).
   * Ignored when {@link logoSvg} is also supplied.
   */
  logoUrl?: string;
  /**
   * Inline SVG markup rendered inside the header circle (W10-3.4).
   * Takes precedence over {@link logoUrl}.
   */
  logoSvg?: string;
  /**
   * Caller-supplied privacy policy URL rendered in the footer (W10-3.6).
   */
  privacyPolicyUrl?: string;
  /**
   * Explicit three-stop accent gradient used by the StyledQR renderer
   * (W10-3.5). When omitted, StyledQR falls back to reading
   * `--ag-accent-gradient` from the container and ultimately the Provii
   * default triple.
   */
  accentGradientStops?: readonly [string, string, string];
  /**
   * Structural QR styling options: dot shape, eye frame shape, eye dot
   * shape, and embedded logo URL. Passed through to StyledQR.
   */
  qrStyleOptions?: QrStyleOptions;
}

export interface ChallengeUIResult {
  /** Document fragment containing the full UI tree */
  root: DocumentFragment;
  /** CSS text to inject into the shadow root */
  styles: string;
  /** Direct references to interactive/updatable elements */
  elements: {
    /** Mobile deep link CTA button (mobile only) */
    mobileBtn: HTMLAnchorElement | null;
    /** QR code container (desktop: StyledQR rendered here; mobile: toggle target) */
    qrContainer: HTMLElement | null;
    /** Status message region (aria-live) */
    statusMessage: HTMLElement | null;
    /** Short code display element (desktop only) */
    shortCodeDisplay: HTMLElement | null;
    /** Subtitle element for age description */
    subtitle: HTMLElement | null;
    /** Mount point for sandbox simulator buttons (if isSandbox) */
    sandboxSection: HTMLElement | null;
  };
  /** StyledQR instance (desktop only, for lifecycle management) */
  styledQR: StyledQR | null;
  /** Remove document-level listeners (visibilitychange, etc.) */
  destroy: () => void;
}

/* ─────────────────── Constants ─────────────────── */

const getVerifyButtonLabel = (): string => t("verifyButtonLabel");
const QR_HIDDEN_CLASS = "agegate-qr-container-hidden";
const ARIA_DISABLED = "aria-disabled";

/* ─────────────────── Helpers ─────────────────── */

/**
 * Derive a human-readable age requirement string from cutoff_days.
 * Returns null if data is missing or invalid.
 */
function describeAgeRequirement(data: {
  cutoffDays?: number;
  proofDirection?: string;
}): string | null {
  if (typeof data.cutoffDays !== "number" || data.cutoffDays <= 0) {
    return null;
  }
  const todayEpochDays = Math.floor(Date.now() / 86_400_000);
  const ageDays = todayEpochDays - data.cutoffDays;
  const ageYears = Math.floor(ageDays / 365.25);
  if (ageYears < 1 || ageYears > 150) return null;

  if (data.proofDirection === "under_age") {
    return t("verifyUnderAge", { age: ageYears });
  }
  return t("verifyOverAge", { age: ageYears });
}

/**
 * Validate that a deep link URL uses the expected `proviiwallet:` scheme.
 * Rejects `javascript:`, `data:`, `https:`, and any other unexpected
 * protocol before the value reaches DOM sinks (href attribute or
 * window.location assignment).
 */
function assertDeepLinkScheme(url: string): string {
  const ALLOWED_SCHEME = "proviiwallet:";
  if (!url.startsWith(ALLOWED_SCHEME)) {
    throw new Error(
      `Deep link has unexpected scheme: expected "${ALLOWED_SCHEME}" prefix`,
    );
  }
  return url;
}

/* ─────────────── Shared HTML fragments ─────────────── */

/**
 * Default shield-and-tick SVG shown inside the header circle when no
 * caller-provided logo is supplied.
 */
const DEFAULT_LOGO_SVG = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>`;

function createHeader(
  subtitleId: string,
  headingId?: string,
  logo?: { logoUrl?: string; logoSvg?: string },
): { header: HTMLElement; subtitle: HTMLElement; heading: HTMLElement } {
  const header = document.createElement("div");
  header.className = "header";
  const logoEl = document.createElement("div");
  logoEl.className = "logo";

  // W10-3.4: caller-supplied brand logo. Inline SVG takes precedence over
  // URL, and supplying both emits a warning. Empty strings are treated as
  // absent so integrators can clear a logo from a CMS without removing
  // the attribute entirely.
  const hasSvg =
    typeof logo?.logoSvg === "string" && logo.logoSvg.trim() !== "";
  const hasUrl =
    typeof logo?.logoUrl === "string" && logo.logoUrl.trim() !== "";
  if (hasSvg && hasUrl) {
    console.warn(
      "[Provii Age Gate] Both logoSvg and logoUrl were supplied; logoSvg wins.",
    );
  }
  if (hasSvg && logo?.logoSvg) {
    const sanitisedSvg = DOMPurify.sanitize(logo.logoSvg, {
      ...SVG_PURIFY_CONFIG,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
    });
    logoEl.innerHTML = sanitisedSvg;
  } else if (hasUrl && logo?.logoUrl) {
    const img = document.createElement("img");
    img.setAttribute("src", logo.logoUrl);
    img.setAttribute("alt", "");
    img.setAttribute("aria-hidden", "true");
    logoEl.appendChild(img);
  } else {
    logoEl.innerHTML = DEFAULT_LOGO_SVG;
  }
  header.appendChild(logoEl);

  const h2 = document.createElement("h2");
  h2.textContent = t("headerTitle");
  header.appendChild(h2);

  const p = document.createElement("p");
  p.id = subtitleId;
  p.textContent = t("headerSubtitle");
  header.appendChild(p);
  if (headingId) {
    h2.id = headingId;
  }
  return { header, subtitle: p, heading: h2 };
}

function createFooter(privacyPolicyUrl?: string): HTMLElement {
  const footer = document.createElement("div");
  footer.className = "footer";

  const poweredByP = document.createElement("p");
  const poweredByText = document.createTextNode(`${t("poweredBy")} `);
  poweredByP.appendChild(poweredByText);
  const link = document.createElement("a");
  link.href = "https://provii.app";
  link.target = "_blank";
  link.rel = "noopener";
  link.setAttribute("aria-label", "Provii Wallet (opens in new tab)");
  link.className = "agegate-footer-link";
  link.textContent = "Provii Wallet";
  poweredByP.appendChild(link);
  footer.appendChild(poweredByP);

  const subtitleP = document.createElement("p");
  subtitleP.className = "footer-subtitle";
  subtitleP.textContent = t("footerSubtitle");
  footer.appendChild(subtitleP);

  // W10-3.6: render optional privacy policy link. The URL is assumed
  // pre-validated upstream (parser or runtime guard). We still belt-and-brace
  // by only rendering when the value parses as https://.
  if (privacyPolicyUrl) {
    try {
      const parsed = new URL(privacyPolicyUrl);
      if (parsed.protocol === "https:") {
        const privacyP = document.createElement("p");
        privacyP.className = "footer-privacy";
        const privacyLink = document.createElement("a");
        privacyLink.href = privacyPolicyUrl;
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
    } catch {
      // Silently drop; upstream already warned.
    }
  }

  return footer;
}

function createTimeNotice(): HTMLElement {
  const timeNoticeP = document.createElement("p");
  timeNoticeP.className = "agegate-time-notice";
  timeNoticeP.textContent = t("timeNotice");
  return timeNoticeP;
}

function createHelpLink(): HTMLElement {
  const container = document.createElement("p");
  container.className = "agegate-help-link-container";
  const helpLink = document.createElement("a");
  helpLink.href = "https://provii.app/help";
  helpLink.target = "_blank";
  helpLink.rel = "noopener";
  helpLink.setAttribute("aria-label", t("needHelpAriaLabel"));
  helpLink.className = "agegate-help-link";
  helpLink.textContent = t("needHelp");
  container.appendChild(helpLink);
  return container;
}

function createSandboxSection(): HTMLElement {
  const section = document.createElement("div");
  section.className = "agegate-sandbox-section";
  return section;
}

/* ─────────────── Mobile Challenge UI ─────────────── */

export function buildMobileChallengeUI(
  data: ChallengeUIData,
  options: ChallengeUIOptions = {},
): ChallengeUIResult {
  const fragment = document.createDocumentFragment();
  const cleanupFns: Array<() => void> = [];

  // Container
  const container = document.createElement("div");
  container.className = "container";
  const detectedLocale = getLocale();
  container.setAttribute("lang", detectedLocale);
  if (isRTL()) {
    container.setAttribute("dir", "rtl");
  }
  container.setAttribute("role", "region");
  container.setAttribute("aria-label", t("ageVerificationRegion"));

  // Header (headingId used by AutoBlockMode for aria-labelledby on overlay dialog)
  const { header, subtitle } = createHeader(
    "agegate-age-subtitle-mobile",
    "provii-overlay-heading",
    { logoUrl: options.logoUrl, logoSvg: options.logoSvg },
  );
  container.appendChild(header);

  // Content
  const content = document.createElement("div");
  content.className = "content";

  // CTA button
  const gateContainer = document.createElement("div");
  gateContainer.className = "gate-container agegate-visible";
  const btn = document.createElement("a");
  btn.className = "agegate-link agegate-mobile-cta";
  btn.id = "agegate-mobile-btn";
  btn.textContent = getVerifyButtonLabel();
  btn.setAttribute("aria-label", t("verifyButtonAriaLabel"));
  // ST-AG-001: Set href via setAttribute, not innerHTML interpolation
  // AG-U32: Validate scheme before DOM assignment to prevent XSS via deep link
  btn.setAttribute("href", assertDeepLinkScheme(data.deepLink));
  gateContainer.appendChild(btn);
  content.appendChild(gateContainer);

  // Status message
  const statusMessage = document.createElement("div");
  statusMessage.className = "status-message status-info";
  statusMessage.setAttribute("role", "status");
  statusMessage.setAttribute("aria-live", "polite");
  const statusSpan = document.createElement("span");
  statusSpan.textContent = t("mobileStatusTap");
  statusMessage.appendChild(statusSpan);
  content.appendChild(statusMessage);

  // Time notice
  content.appendChild(createTimeNotice());

  // QR toggle section
  const qrToggleSection = document.createElement("div");
  qrToggleSection.className = "agegate-qr-toggle-section";
  const qrToggleLabel = document.createElement("p");
  qrToggleLabel.className = "agegate-qr-toggle-label";
  qrToggleLabel.textContent = t("qrToggleLabel");
  qrToggleSection.appendChild(qrToggleLabel);

  const showQrBtn = document.createElement("button");
  showQrBtn.id = "agegate-show-qr";
  showQrBtn.className = "retry-button agegate-qr-toggle-btn";
  showQrBtn.setAttribute("aria-expanded", "false");
  showQrBtn.setAttribute("aria-controls", "agegate-qr-container");
  showQrBtn.textContent = t("showQrCode");
  qrToggleSection.appendChild(showQrBtn);
  content.appendChild(qrToggleSection);

  // QR container (hidden initially)
  const qrContainer = document.createElement("div");
  qrContainer.id = "agegate-qr-container";
  qrContainer.className = QR_HIDDEN_CLASS;
  content.appendChild(qrContainer);

  // Help link
  content.appendChild(createHelpLink());

  // Sandbox section
  let sandboxSection: HTMLElement | null = null;
  if (options.isSandbox) {
    sandboxSection = createSandboxSection();
    content.appendChild(sandboxSection);
  }

  container.appendChild(content);

  // Footer
  container.appendChild(createFooter(options.privacyPolicyUrl));

  fragment.appendChild(container);

  // ── Event handlers ──

  // Prevent keyboard activation while aria-disabled
  btn.addEventListener("keydown", (e) => {
    if (
      btn.getAttribute(ARIA_DISABLED) === "true" &&
      (e.key === "Enter" || e.key === " ")
    ) {
      e.preventDefault();
    }
  });

  // Track timer IDs for cleanup on destroy
  let navigationFallbackTimer: ReturnType<typeof setTimeout> | undefined;
  let resetVisualTimer: ReturnType<typeof setTimeout> | undefined;

  // CTA click: visual feedback + sessionStorage flag
  btn.addEventListener("click", (e) => {
    // Respect aria-disabled for assistive tech that dispatches click directly
    if (btn.getAttribute(ARIA_DISABLED) === "true") {
      e.preventDefault();
      return;
    }
    try {
      sessionStorage.setItem("agegate_pending_verification", "true");
    } catch {
      // sessionStorage blocked
    }
    btn.style.opacity = "0.7";
    btn.textContent = t("verifyButtonOpening");

    // Programmatic navigation fallback (helps on some Android browsers)
    // AG-U32: Re-assert scheme before window.location assignment
    navigationFallbackTimer = setTimeout(() => {
      window.location.href = assertDeepLinkScheme(data.deepLink);
    }, 100);

    // Reset visual state if user cancels
    resetVisualTimer = setTimeout(() => {
      btn.textContent = getVerifyButtonLabel();
      btn.style.opacity = "1";
    }, 3000);
  });

  // Clean up timers on destroy
  cleanupFns.push(() => {
    if (navigationFallbackTimer !== undefined) {
      clearTimeout(navigationFallbackTimer);
    }
    if (resetVisualTimer !== undefined) {
      clearTimeout(resetVisualTimer);
    }
  });

  // QR toggle
  showQrBtn.addEventListener("click", async () => {
    const isHidden = qrContainer.classList.contains(QR_HIDDEN_CLASS);
    if (isHidden) {
      try {
        qrContainer.innerHTML = "";
        const qrCanvas = document.createElement("canvas");
        qrCanvas.className = "qr-canvas agegate-qr-canvas";
        qrCanvas.setAttribute("role", "img");
        qrCanvas.setAttribute("aria-label", t("qrCodeAriaLabel"));
        qrContainer.appendChild(qrCanvas);
        await renderQrToCanvas(qrCanvas, data.qrPayload, {
          width: 200,
          margin: 1,
        });
        qrContainer.classList.remove(QR_HIDDEN_CLASS);
        showQrBtn.textContent = t("hideQrCode");
        showQrBtn.setAttribute("aria-expanded", "true");
      } catch (err) {
        showQrBtn.textContent = t("qrCodeUnavailable");
        showQrBtn.disabled = true;
        showQrBtn.removeAttribute("aria-expanded");
        showQrBtn.removeAttribute("aria-controls");
      }
    } else {
      qrContainer.classList.add(QR_HIDDEN_CLASS);
      showQrBtn.textContent = t("showQrCode");
      showQrBtn.setAttribute("aria-expanded", "false");
    }
  });

  // Visibility change handler: detect return from wallet app
  const visibilityHandler = () => {
    if (document.visibilityState !== "visible") return;
    const isPending = sessionStorage.getItem("agegate_pending_verification");
    if (isPending !== "true") return;
    sessionStorage.removeItem("agegate_pending_verification");

    // Update button to "Checking..." state
    btn.textContent = t("verifyButtonChecking");
    btn.style.background = "var(--ag-success, #047857)";
    btn.style.color = "#ffffff";
    btn.style.pointerEvents = "none";
    btn.setAttribute(ARIA_DISABLED, "true");
  };
  document.addEventListener("visibilitychange", visibilityHandler);
  cleanupFns.push(() =>
    document.removeEventListener("visibilitychange", visibilityHandler),
  );

  // Update age description
  const ageDesc = describeAgeRequirement({
    cutoffDays: data.cutoffDays,
    proofDirection: data.proofDirection,
  });
  if (ageDesc && subtitle) {
    subtitle.textContent = ageDesc;
  }

  return {
    root: fragment,
    styles: getChallengeStyles(),
    elements: {
      mobileBtn: btn,
      qrContainer,
      statusMessage,
      shortCodeDisplay: null,
      subtitle,
      sandboxSection,
    },
    styledQR: null,
    destroy: () => {
      for (const fn of cleanupFns) {
        try {
          fn();
        } catch {
          /* ignore */
        }
      }
      cleanupFns.length = 0;
    },
  };
}

/* ─────────────── Desktop Challenge UI ─────────────── */

export function buildDesktopChallengeUI(
  data: ChallengeUIData,
  options: ChallengeUIOptions = {},
): ChallengeUIResult {
  const fragment = document.createDocumentFragment();

  // Validate short code format (SSRF-065)
  const DIGITS_ONLY = /^\d{12}$/;
  if (!DIGITS_ONLY.test(data.shortCode)) {
    throw new Error(
      `Invalid short_code: expected 12 digits, got "${data.shortCode.length}" chars`,
    );
  }
  const formattedShortCode = data.shortCode.replace(
    /(\d{4})(\d{4})(\d{4})/,
    "$1 $2 $3",
  );

  // Container
  const container = document.createElement("div");
  container.className = "container";
  const desktopLocale = getLocale();
  container.setAttribute("lang", desktopLocale);
  if (isRTL()) {
    container.setAttribute("dir", "rtl");
  }
  container.setAttribute("role", "region");
  container.setAttribute("aria-label", t("ageVerificationRegion"));

  // Header (headingId used by AutoBlockMode for aria-labelledby on overlay dialog)
  const { header, subtitle } = createHeader(
    "agegate-age-subtitle",
    "provii-overlay-heading",
    { logoUrl: options.logoUrl, logoSvg: options.logoSvg },
  );
  container.appendChild(header);

  // Content
  const content = document.createElement("div");
  content.className = "content";

  // QR container with loading spinner
  const qrContainer = document.createElement("div");
  qrContainer.className = "gate-container";
  qrContainer.id = "agegate-qr-container";
  qrContainer.setAttribute("aria-describedby", "agegate-scan-instruction");
  qrContainer.innerHTML = `
    <div class="gate-loading" aria-hidden="true">
      <div class="spinner" aria-hidden="true"></div>
    </div>
  `;
  content.appendChild(qrContainer);

  // Status message
  const statusMessage = document.createElement("div");
  statusMessage.className = "status-message status-info";
  statusMessage.id = "agegate-scan-instruction";
  statusMessage.setAttribute("role", "status");
  statusMessage.setAttribute("aria-live", "polite");
  const statusSpan = document.createElement("span");
  statusSpan.textContent = t("scanQrInstruction");
  statusMessage.appendChild(statusSpan);
  content.appendChild(statusMessage);

  // Short code section
  const shortCodeSection = document.createElement("div");
  shortCodeSection.className = "agegate-short-code";
  shortCodeSection.setAttribute("role", "region");
  shortCodeSection.setAttribute("aria-labelledby", "agegate-shortcode-label");
  const shortCodeLabel = document.createElement("p");
  shortCodeLabel.id = "agegate-shortcode-label";
  shortCodeLabel.className = "agegate-shortcode-label";
  shortCodeLabel.textContent = t("shortCodeLabel");
  shortCodeSection.appendChild(shortCodeLabel);
  const shortCodeDisplay = document.createElement("p");
  shortCodeDisplay.className = "agegate-shortcode-value";
  shortCodeDisplay.id = "agegate-shortcode-display";
  // SSRF-065: Set via textContent, not innerHTML
  shortCodeDisplay.textContent = formattedShortCode;
  // Screen readers should spell out individual digits, not read as a number
  shortCodeDisplay.setAttribute("role", "text");
  shortCodeDisplay.setAttribute(
    "aria-label",
    `${t("verificationCodeAriaPrefix")} ${data.shortCode.split("").join(", ")}`,
  );
  shortCodeSection.appendChild(shortCodeDisplay);
  content.appendChild(shortCodeSection);

  // Time notice
  content.appendChild(createTimeNotice());

  // Help link
  const helpLink = createHelpLink();
  helpLink.classList.add("agegate-help-link-container-tight");
  content.appendChild(helpLink);

  // Sandbox section
  let sandboxSection: HTMLElement | null = null;
  if (options.isSandbox) {
    sandboxSection = createSandboxSection();
    content.appendChild(sandboxSection);
  }

  container.appendChild(content);

  // Footer
  container.appendChild(createFooter(options.privacyPolicyUrl));

  fragment.appendChild(container);

  // Age description
  const ageDesc = describeAgeRequirement({
    cutoffDays: data.cutoffDays,
    proofDirection: data.proofDirection,
  });
  if (ageDesc && subtitle) {
    subtitle.textContent = ageDesc;
  }

  // Render StyledQR
  qrContainer.innerHTML = "";
  let styledQR: StyledQR | null = null;
  try {
    styledQR = new StyledQR(
      qrContainer,
      data.qrPayload,
      options.accentGradientStops,
      options.qrStyleOptions,
    );
  } catch (err) {
    // Fallback to basic QR canvas
    try {
      const canvas = document.createElement("canvas");
      canvas.className = "qr-canvas agegate-qr-canvas";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", t("qrCodeAriaLabel"));
      qrContainer.appendChild(canvas);
      renderQrToCanvas(canvas, data.qrPayload, { width: 200, margin: 1 }).catch(
        () => {
          /* QR render failed silently */
        },
      );
    } catch {
      /* fallback also failed */
    }
  }

  // Fade in QR container
  requestAnimationFrame(() => {
    qrContainer.classList.add("agegate-visible");
  });

  return {
    root: fragment,
    styles: getChallengeStyles(),
    elements: {
      mobileBtn: null,
      qrContainer,
      statusMessage,
      shortCodeDisplay,
      subtitle,
      sandboxSection,
    },
    styledQR,
    destroy: () => {
      if (styledQR) {
        try {
          styledQR.destroy();
        } catch {
          /* ignore */
        }
        styledQR = null;
      }
    },
  };
}

/* ─────────────── Challenge Styles ─────────────── */

/**
 * Returns the CSS text for challenge UI elements. This is injected into
 * the shadow root alongside the theme CSS (DEFAULT_THEME_CSS) which is
 * automatically injected by getOrCreateShadowRoot().
 */
function getChallengeStyles(): string {
  return `
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
      color: var(--ag-shortcode-color, var(--ag-accent-start, #0091C7));
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

    /* Confirming status (proof received, redeeming) */
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

    /* QR code fade-in transition. Duration tracks --ag-motion-duration so
       the Motion duration control also drives the gate fade, not just the
       container slideUp. Falls back to 0.3s when the var is unset. */
    .gate-container {
      opacity: 0;
      transition: opacity var(--ag-motion-duration, 0.3s) ease-in;
    }
    .gate-container.agegate-visible {
      opacity: 1;
    }
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

    /* Sandbox section (mount point for caller-provided buttons) */
    .agegate-sandbox-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 2px dashed var(--ag-border, #E5E7EB);
    }
  `;
}
