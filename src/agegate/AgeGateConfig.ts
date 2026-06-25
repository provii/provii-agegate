// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Hardened configuration object for the AgeGate SDK.
 *
 * Security features:
 * - Normalises all URLs to absolute, same-origin forms
 * - Performs strict validation on every user-supplied option
 * - Enforces HTTPS on all API endpoints (localhost exempted for development)
 * - Supports domain allowlists (SSRF-064) to restrict outbound requests
 * - Defaults to the production v1 API at https://hosted.provii.app/v1/
 *
 * @module AgeGateConfig
 *
 * @example
 * ```typescript
 * const config = new AgeGateConfig({
 *   contentUrl: '/restricted-content',
 *   mountElementId: 'age-gate-mount',
 *   publicKey: 'pk_live_abc...',
 * });
 * ```
 */

import { detectLocale, setStringOverrides } from "../i18n/index.js";
import type { LocaleStrings } from "../i18n/index.js";
import type { UnavailableAction } from "../core/types.js";

/* ─────────── helpers ─────────── */

/** Collapse duplicate `/` except after a URI scheme (`://`). */
const squashSlashes = (url: string): string =>
  url.replace(/(^|[^:])\/{2,}/g, "$1/");

/** Remove trailing slashes (`/path/` → `/path`). */
const stripTrailingSlash = (path: string): string =>
  path !== "/" ? path.replace(/\/+$/u, "") : path;

/**
 * Returns true when the URL is a localhost address (safe for development without HTTPS).
 * Matches http://localhost, http://127.0.0.1, and http://[::1].
 */
const isLocalhostUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
};

/**
 * Enforce HTTPS on an absolute URL. Throws if the URL uses plain HTTP
 * and is not targeting localhost. Relative URLs (no scheme) are allowed
 * because they inherit the page origin.
 */
const enforceHttps = (url: string, parameterName: string): void => {
  if (url.toLowerCase().startsWith("http://") && !isLocalhostUrl(url)) {
    throw new Error(
      `${parameterName} must use HTTPS. ` +
        `Plain HTTP is only permitted for localhost during development.`,
    );
  }
};

/**
 * Validate that a URL's hostname appears in the allowed domains list.
 * Relative URLs are always permitted (they resolve to same-origin).
 */
const enforceDomainAllowlist = (
  url: string,
  parameterName: string,
  allowedDomains: readonly string[],
): void => {
  // Relative URLs are inherently same-origin, so always allowed
  const ABS_CHECK = /^[a-z][a-z0-9+.+-]*:\/\//i;
  if (!ABS_CHECK.test(url)) return;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const normalisedAllowed = allowedDomains.map((d) => d.toLowerCase());
    if (!normalisedAllowed.includes(hostname)) {
      throw new Error(
        `${parameterName} domain "${hostname}" is not in the allowed domains list. ` +
          `Allowed: ${normalisedAllowed.join(", ")}`,
      );
    }
  } catch (err) {
    // Re-throw our own errors; swallow URL parse failures (handled elsewhere)
    if (
      err instanceof Error &&
      err.message.includes("not in the allowed domains list")
    ) {
      throw err;
    }
  }
};

/**
 * Default domain allowlist applied when the integrator does not supply
 * an explicit `allowedDomains` option. Limits outbound API requests to
 * the Provii hosted endpoints, preventing SSRF via misconfigured URLs.
 */
const DEFAULT_ALLOWED_DOMAINS: readonly string[] = [
  "hosted.provii.app",
  "sandbox-hosted.provii.app",
];

/* ─────────── constants ─────────── */

// Valid environments
type Environment = "production" | "sandbox";

// Environment-specific hosted backend URLs
const ENVIRONMENT_URLS: Record<
  Environment,
  { apiBase: string; challenge: string; status: string }
> = {
  production: {
    apiBase: "https://hosted.provii.app/v1/hosted",
    challenge: "https://hosted.provii.app/v1/hosted/challenge",
    status: "https://hosted.provii.app/v1/hosted/status/{sid}",
  },
  sandbox: {
    apiBase: "https://sandbox-hosted.provii.app/v1/hosted",
    challenge: "https://sandbox-hosted.provii.app/v1/hosted/challenge",
    status: "https://sandbox-hosted.provii.app/v1/hosted/status/{sid}",
  },
};

// Security limits
const MAX_URL_LENGTH = 2048;
const MIN_POLL_INTERVAL = 500;
const MAX_POLL_INTERVAL = 60000;
const MIN_VERIFYING_KEY_ID = 0;
const MAX_VERIFYING_KEY_ID = 9999999999;
const DEFAULT_VERIFYING_KEY_ID = 914153247;

/* ─────────── types ─────────── */

export interface AgeGateOptions {
  /**
   * Environment for age verification.
   * - 'production': Live verification using production credentials (default)
   * - 'sandbox': Testing environment for development and integration testing
   *
   * When set, this automatically configures the correct API endpoints.
   * Explicit challengeUrl/statusUrl options override the environment setting.
   *
   * @default 'production'
   */
  environment?: "production" | "sandbox";

  /**
   * Public key for hosted backend authentication.
   * This key identifies your organisation and is required for hosted backend requests.
   * Format: pk_live_xxx for production, pk_test_xxx for sandbox.
   *
   * @required
   */
  publicKey: string;

  /**
   * URL endpoint for fetching age verification challenges.
   * Must use HTTPS in production (http://localhost is permitted for development).
   * If not provided, determined by the environment setting.
   * @default 'https://hosted.provii.app/v1/hosted/challenge' (production)
   */
  challengeUrl?: string;

  /**
   * URL users are redirected to after successful verification.
   * Must be same-origin as the hosting page for security.
   * @required
   */
  contentUrl: string;

  /**
   * DOM element ID where the age gate UI will be mounted.
   * @required
   */
  mountElementId: string;

  /**
   * URL endpoint for polling verification status.
   * Must contain exactly one {sid} placeholder.
   * Must use HTTPS in production (http://localhost is permitted for development).
   * @default 'https://hosted.provii.app/v1/hosted/status/{sid}'
   */
  statusUrl?: string;

  /**
   * URL for polling status via RP proxy (recommended for production).
   * Used when redeemMode is 'rp-proxy'.
   *
   * @example '/api/verify/poll' // RP proxy endpoint
   */
  pollUrl?: string;

  /**
   * Polling interval in milliseconds.
   * @minimum 500
   * @maximum 60000
   * @default 3000
   */
  pollInterval?: number;

  /**
   * Verifying key ID for the ZK circuit.
   * @minimum 0
   * @maximum 9999999999
   * @default 914153247
   */
  verifyingKeyId?: number;

  /**
   * URL for PKCE redemption endpoint.
   * Must use HTTPS in production (http://localhost is permitted for development).
   *
   * RECOMMENDED: Use your RP backend as proxy (e.g., '/api/complete-age-verification')
   * This allows server-side verification confirmation, session creation, and audit logging.
   *
   * DEFAULT: Direct to verifier API (for demos/testing only)
   * In production, you should proxy through your backend to maintain server-side state.
   *
   * @example '/api/complete-age-verification' // RP proxy (recommended)
   * @example 'https://verifier.example/v1/challenge/{challenge_id}/redeem' // Direct (testing only)
   */
  redeemUrl?: string;

  /**
   * Redemption mode for PKCE completion.
   *
   * - 'rp-proxy': RECOMMENDED - Your backend proxies to verifier, maintains session state
   * - 'direct': For demos only - Browser calls verifier directly
   *
   * @default 'direct' (will change to 'rp-proxy' in future versions)
   */
  redeemMode?: "rp-proxy" | "direct";

  /**
   * CSP nonce for injected style elements.
   *
   * When provided, all `<style>` elements created by the SDK will include
   * a `nonce` attribute with this value. This allows the SDK to function
   * under strict Content Security Policy rules that use
   * `style-src 'nonce-<value>'` instead of `'unsafe-inline'`.
   *
   * The nonce must be a base64 string generated server-side per request.
   *
   * @example 'abc123def456'
   */
  cspNonce?: string;

  /**
   * Optional list of allowed domains for API URLs.
   * When set, all configured URLs (challengeUrl, statusUrl, redeemUrl, pollUrl)
   * must have a hostname that matches one of these domains.
   * Relative URLs (same-origin) are always allowed.
   *
   * @example ['hosted.provii.app', 'sandbox-hosted.provii.app', 'api.example.com']
   */
  allowedDomains?: string[];

  /**
   * Colour theme for the age gate UI.
   *
   * - 'light': Force light theme regardless of system preference
   * - 'dark': Force dark theme regardless of system preference
   * - 'auto': Follow the user's system preference via prefers-color-scheme
   *
   * @default 'auto'
   */
  theme?: "light" | "dark" | "auto";

  /**
   * BCP 47 language tag for the UI (e.g. "fr", "de", "ja").
   *
   * When set, overrides the automatic locale detection chain
   * (html[lang], navigator.language). Falls back to "en" if
   * the specified locale is not bundled.
   */
  lang?: string;

  /**
   * Caller-supplied string overrides. Each key replaces the default
   * translation for that locale string. Missing keys continue to use
   * the active locale pack (and the English fallback) as normal.
   *
   * W10-3.2. Accepts any subset of {@link LocaleStrings}.
   *
   * @example
   * ```typescript
   * strings: { headerTitle: "Age check", verifyButtonLabel: "Open wallet" }
   * ```
   */
  strings?: Partial<LocaleStrings>;

  /**
   * What the gate should do when the Provii backend cannot return a
   * verdict because it is unreachable, erroring, or has exhausted its
   * retry budget (an availability failure, NOT a genuine "underage" or
   * "failed" verdict).
   *
   * You are expected to choose this explicitly: 'block' (fail closed),
   * 'allow' (fail open), or 'defer' (hand control to
   * {@link onUnavailableHandler} and stay blocked so you can route to a
   * fallback provider). When omitted, the gate fails closed and logs a
   * console error, because silently letting users through during an outage
   * is never a safe default. An invalid value throws.
   *
   * This never overrides a real verifier rejection: cryptographic
   * "underage"/"failed" verdicts always block regardless of this setting.
   *
   * See {@link UnavailableAction}.
   */
  onUnavailable?: UnavailableAction;

  /**
   * Callback invoked when an availability failure occurs and
   * {@link onUnavailable} is 'defer'. Use it to route the user to a
   * fallback age-verification provider or your own degraded flow. The gate
   * stays blocked until you navigate away, so a no-op handler is equivalent
   * to 'block'. Never receives raw error text.
   */
  onUnavailableHandler?: (info: { reason: string; code?: string }) => void;
}

/* ───────────────────────────────── */

export class AgeGateConfig {
  readonly environment: Environment;
  readonly publicKey: string;
  readonly challengeUrl: string;
  readonly statusUrl: string;
  readonly pollUrl?: string;
  readonly contentUrl: string;
  readonly mountElementId: string;
  readonly pollInterval: number;
  readonly verifyingKeyId: number;
  readonly redeemUrl?: string;
  readonly redeemMode: "rp-proxy" | "direct";
  readonly cspNonce?: string;
  readonly allowedDomains?: readonly string[];
  readonly theme: "light" | "dark" | "auto";
  readonly onUnavailable?: UnavailableAction;
  readonly onUnavailableHandler?: (info: {
    reason: string;
    code?: string;
  }) => void;

  constructor(userOpts: AgeGateOptions) {
    /* -------------------------------------------------------------- */
    /* Validate required options first                                */
    /* -------------------------------------------------------------- */
    if (!userOpts) {
      throw new Error("AgeGateOptions is required");
    }

    const {
      environment,
      publicKey,
      challengeUrl: rawChallengeUrl,
      statusUrl: rawStatusUrl,
      pollUrl,
      contentUrl: rawContentUrl,
      mountElementId,
      pollInterval,
      verifyingKeyId,
      redeemUrl,
      redeemMode,
      cspNonce,
      allowedDomains,
      theme,
      lang,
      strings,
      onUnavailable,
      onUnavailableHandler,
    } = userOpts;

    // Set locale if lang option is provided (programmatic manual mode).
    // In autoload mode, detectLocale is called by the config parser instead.
    detectLocale(lang);

    // W10-3.2: install caller-provided string overrides. Passing undefined
    // clears any prior overrides so two AgeGate instances don't leak.
    setStringOverrides(strings ?? null);

    // Store and validate allowedDomains early so later URL checks can reference it
    if (allowedDomains !== undefined) {
      if (!Array.isArray(allowedDomains) || allowedDomains.length === 0) {
        throw new Error(
          "allowedDomains must be a non-empty array of domain strings",
        );
      }
      for (const domain of allowedDomains) {
        if (typeof domain !== "string" || domain.trim().length === 0) {
          throw new Error(
            "Each entry in allowedDomains must be a non-empty string",
          );
        }
      }
      this.allowedDomains = Object.freeze([...allowedDomains]);
    }

    // Validate and set theme (defaults to auto)
    if (theme && theme !== "light" && theme !== "dark" && theme !== "auto") {
      throw new Error("theme must be 'light', 'dark', or 'auto'");
    }
    this.theme = theme || "auto";

    /* -------------------------------------------------------------- */
    /* Failure-mode policy: what to do when Provii is UNAVAILABLE.     */
    /* The relying party must choose explicitly. An invalid value      */
    /* throws; an absent value is left undefined and resolved to the   */
    /* safe 'block' default at the point of failure (never a silent    */
    /* 'allow'). See resolveUnavailableAction() in AgeGate.            */
    /* -------------------------------------------------------------- */
    if (
      onUnavailable !== undefined &&
      onUnavailable !== "block" &&
      onUnavailable !== "allow" &&
      onUnavailable !== "defer"
    ) {
      throw new Error("onUnavailable must be 'block', 'allow', or 'defer'");
    }
    if (onUnavailableHandler !== undefined) {
      if (typeof onUnavailableHandler !== "function") {
        throw new Error("onUnavailableHandler must be a function");
      }
      this.onUnavailableHandler = onUnavailableHandler;
    }
    if (onUnavailable !== undefined) {
      this.onUnavailable = onUnavailable;
    } else if (
      typeof process !== "undefined" &&
      process.env?.["NODE_ENV"] !== "production"
    ) {
      // Mirror the redeemMode dev warning: surface the unmade choice during
      // development without breaking production bundles. The authoritative
      // fail-closed behaviour (and a louder error) happens at failure time.
      console.warn(
        "[AgeGateConfig] onUnavailable is not set. If Provii cannot be " +
          "reached, the gate will fail closed (block). Choose 'block', " +
          "'allow', or 'defer' explicitly. See " +
          "https://docs.provii.app/guides/resilience-and-failover",
      );
    }

    // Validate and set environment (defaults to production)
    if (
      environment &&
      environment !== "production" &&
      environment !== "sandbox"
    ) {
      throw new Error("environment must be 'production' or 'sandbox'");
    }
    this.environment = environment || "production";

    // Validate and set publicKey (required)
    if (!publicKey || publicKey.trim() === "") {
      throw new Error("publicKey is required");
    }
    // Validate publicKey format: pk_live_xxx or pk_test_xxx
    const publicKeyPattern = /^pk_(live|test)_[a-f0-9]{64}$/;
    if (!publicKeyPattern.test(publicKey)) {
      throw new Error(
        "publicKey must be in format pk_live_xxx or pk_test_xxx (64 hex chars)",
      );
    }
    this.publicKey = publicKey;

    // Validate that publicKey prefix matches environment.
    // pk_live_ keys are for production; pk_test_ keys are for sandbox.
    if (this.environment === "production" && publicKey.startsWith("pk_test_")) {
      throw new Error(
        "pk_test_ keys cannot be used in production environment. " +
          "Use pk_live_ or set environment to 'sandbox'.",
      );
    }
    if (this.environment === "sandbox" && publicKey.startsWith("pk_live_")) {
      throw new Error(
        "pk_live_ keys cannot be used in sandbox environment. " +
          "Use pk_test_ or set environment to 'production'.",
      );
    }

    if (!rawContentUrl || rawContentUrl.trim() === "") {
      throw new Error("contentUrl is required");
    }
    if (!mountElementId || mountElementId.trim() === "") {
      throw new Error("mountElementId is required and must not be blank");
    }
    // Reject mountElementId values containing characters invalid in
    // HTML id attributes. getElementById tolerates anything, but IDs with
    // whitespace or special chars are almost always a misconfiguration.
    if (/\s/.test(mountElementId)) {
      throw new Error("mountElementId must not contain whitespace");
    }

    /* -------------------------------------------------------------- */
    /* Validate DOM element exists                                    */
    /* -------------------------------------------------------------- */
    if (typeof document !== "undefined") {
      const element = document.getElementById(mountElementId);
      if (!element) {
        console.warn(
          `[AgeGateConfig] Element with ID '${mountElementId}' not found in DOM`,
        );
      }
    }

    /* -------------------------------------------------------------- */
    /* Validate and set verifying key ID                              */
    /* -------------------------------------------------------------- */
    if (verifyingKeyId !== undefined) {
      if (
        !Number.isInteger(verifyingKeyId) ||
        verifyingKeyId < MIN_VERIFYING_KEY_ID ||
        verifyingKeyId > MAX_VERIFYING_KEY_ID
      ) {
        throw new Error(
          `verifyingKeyId must be an integer between ${MIN_VERIFYING_KEY_ID} and ${MAX_VERIFYING_KEY_ID}`,
        );
      }
      this.verifyingKeyId = verifyingKeyId;
    } else {
      this.verifyingKeyId = DEFAULT_VERIFYING_KEY_ID;
    }

    /* -------------------------------------------------------------- */
    /* Set redemption mode and URL                                    */
    /* -------------------------------------------------------------- */
    // Default redemption mode is 'direct'. Integrations that front the
    // verifier with their own proxy set 'rp-proxy' and supply redeemUrl.
    this.redeemMode = redeemMode || "direct";

    if (this.redeemMode === "rp-proxy" && !redeemUrl) {
      throw new Error("redeemUrl is required when using rp-proxy mode");
    }

    if (redeemUrl) {
      // Validate URL length
      if (redeemUrl.length > MAX_URL_LENGTH) {
        throw new Error(
          `redeemUrl exceeds maximum length of ${MAX_URL_LENGTH} characters`,
        );
      }
      // Reject redeemUrl with dangerous schemes
      const redeemLower = redeemUrl.toLowerCase();
      if (
        redeemLower.startsWith("javascript:") ||
        redeemLower.startsWith("data:") ||
        redeemLower.startsWith("blob:") ||
        redeemLower.startsWith("file:") ||
        redeemLower.startsWith("vbscript:")
      ) {
        throw new Error(
          "redeemUrl must not use javascript:, data:, blob:, file:, or vbscript: schemes",
        );
      }
      this.redeemUrl = redeemUrl;
    }

    /* -------------------------------------------------------------- */
    /* Set CSP nonce (optional, for strict CSP environments)          */
    /* -------------------------------------------------------------- */
    if (cspNonce !== undefined) {
      if (typeof cspNonce !== "string" || cspNonce.length === 0) {
        throw new Error("cspNonce must be a non-empty string");
      }
      // Validate base64 format to reject malformed or adversarial nonce values
      if (!/^[A-Za-z0-9+/=]+$/.test(cspNonce)) {
        throw new Error("cspNonce must be a base64 string");
      }
      this.cspNonce = cspNonce;
    }

    /* -------------------------------------------------------------- */
    /* Set poll URL for RP proxy mode                                 */
    /* -------------------------------------------------------------- */
    if (pollUrl) {
      // Validate URL length
      if (pollUrl.length > MAX_URL_LENGTH) {
        throw new Error(
          `pollUrl exceeds maximum length of ${MAX_URL_LENGTH} characters`,
        );
      }
      // Reject pollUrl with dangerous schemes
      const pollLower = pollUrl.toLowerCase();
      if (
        pollLower.startsWith("javascript:") ||
        pollLower.startsWith("data:") ||
        pollLower.startsWith("blob:") ||
        pollLower.startsWith("file:") ||
        pollLower.startsWith("vbscript:")
      ) {
        throw new Error(
          "pollUrl must not use javascript:, data:, blob:, file:, or vbscript: schemes",
        );
      }
      this.pollUrl = pollUrl;
    }

    // Log recommendation in development
    if (
      typeof process !== "undefined" &&
      process.env?.["NODE_ENV"] !== "production"
    ) {
      if (this.redeemMode === "direct") {
        console.warn(
          "[AgeGateConfig] Using direct redemption mode. " +
            "For production, use rp-proxy mode with your backend endpoint to maintain server-side verification state.",
        );
      }
    }

    /* -------------------------------------------------------------- */
    /* Canonicalise page origin (JSDOM → http://localhost)            */
    /* -------------------------------------------------------------- */
    let pageOrigin = "http://localhost";
    try {
      pageOrigin = new URL(window.location.href).origin;
      if (pageOrigin === "null") pageOrigin = "http://localhost";
    } catch {
      /* ignored, keep default */
    }

    const ABS_RE = /^[a-z][a-z0-9+.+-]*:\/\//i;

    /* -------------------------------------------------------------- */
    /* challengeUrl → absolute (with environment-aware default)       */
    /* -------------------------------------------------------------- */
    // Use environment-specific URL if no explicit URL provided
    const envUrls = ENVIRONMENT_URLS[this.environment];
    const challengeInput = rawChallengeUrl?.trim() || envUrls.challenge;

    // Validate URL length
    if (challengeInput.length > MAX_URL_LENGTH) {
      throw new Error(
        `challengeUrl exceeds maximum length of ${MAX_URL_LENGTH} characters`,
      );
    }

    this.challengeUrl = ABS_RE.test(challengeInput)
      ? new URL(challengeInput).href
      : new URL(challengeInput, pageOrigin).href;

    /* -------------------------------------------------------------- */
    /* statusUrl (with v1 default)                                    */
    /* -------------------------------------------------------------- */
    const base = stripTrailingSlash(this.challengeUrl.replace(/[?#].*$/, ""));
    const derived = `${base}/{sid}`;

    let finalStatus: string;

    if (rawStatusUrl && rawStatusUrl.trim()) {
      const supplied = rawStatusUrl.trim().replace(/^\/{2,}/, "/");

      // Validate URL length
      if (supplied.length > MAX_URL_LENGTH) {
        throw new Error(
          `statusUrl exceeds maximum length of ${MAX_URL_LENGTH} characters`,
        );
      }

      const maybeAbs = ABS_RE.test(supplied)
        ? supplied // already absolute
        : pageOrigin + supplied; // make absolute

      /* Enforce <= 1 {sid} placeholder (raw *or* URI-encoded). */
      const afterHost = maybeAbs.replace(/^.*?:\/\/[^/]+/, "");
      const dupes =
        (afterHost.match(/\{sid\}/g) || []).length +
        (afterHost.match(/%7Bsid%7D/gi) || []).length;

      if (dupes === 0) {
        throw new Error("statusUrl must contain exactly one {sid} placeholder");
      }

      if (dupes > 1) {
        throw new Error(
          "statusUrl must contain at most one {sid} placeholder in the path",
        );
      }

      finalStatus = squashSlashes(maybeAbs).replace(/%7Bsid%7D/gi, "{sid}");
    } else {
      // Use environment-specific default if not provided
      finalStatus =
        rawStatusUrl === undefined ||
        rawStatusUrl === null ||
        rawStatusUrl === ""
          ? envUrls.status
          : derived;
    }

    this.statusUrl = finalStatus;

    /* -------------------------------------------------------------- */
    /* contentUrl (must be same-origin)                               */
    /* -------------------------------------------------------------- */
    const cleanedContent = rawContentUrl.replace(/^\/{2,}/, "/");

    // Validate URL length
    if (cleanedContent.length > MAX_URL_LENGTH) {
      throw new Error(
        `contentUrl exceeds maximum length of ${MAX_URL_LENGTH} characters`,
      );
    }

    const contentURL = ABS_RE.test(cleanedContent)
      ? new URL(cleanedContent)
      : new URL(cleanedContent, pageOrigin);

    // SECURITY: Enforce same-origin policy
    if (contentURL.origin !== pageOrigin) {
      throw new Error(
        `contentUrl must be same-origin as the hosting page. ` +
          `Expected origin: ${pageOrigin}, got: ${contentURL.origin}`,
      );
    }

    contentURL.pathname = stripTrailingSlash(contentURL.pathname);
    contentURL.hash = "";
    // Keep the query string - it's needed for success callbacks like ?verified=true
    // contentURL.search is preserved

    this.contentUrl =
      contentURL.origin + contentURL.pathname + contentURL.search;

    /* -------------------------------------------------------------- */
    /* Poll interval validation                                       */
    /* -------------------------------------------------------------- */
    this.mountElementId = mountElementId;

    if (pollInterval !== undefined) {
      if (!Number.isInteger(pollInterval)) {
        throw new Error("pollInterval must be an integer");
      }

      if (pollInterval < MIN_POLL_INTERVAL) {
        throw new Error(`pollInterval must be ≥ ${MIN_POLL_INTERVAL} ms`);
      }

      if (pollInterval > MAX_POLL_INTERVAL) {
        throw new Error(`pollInterval must be ≤ ${MAX_POLL_INTERVAL} ms`);
      }
    }

    this.pollInterval = pollInterval ?? 3_000;

    /* -------------------------------------------------------------- */
    /* SSRF-062/063: Enforce HTTPS on all API URLs                    */
    /* -------------------------------------------------------------- */
    enforceHttps(this.challengeUrl, "challengeUrl");
    enforceHttps(this.statusUrl, "statusUrl");
    if (this.redeemUrl) {
      enforceHttps(this.redeemUrl, "redeemUrl");
    }
    if (this.pollUrl) {
      enforceHttps(this.pollUrl, "pollUrl");
    }

    /* -------------------------------------------------------------- */
    /* SSRF-064: Enforce domain allowlist. When the integrator has    */
    /* explicitly set allowedDomains, enforce on all URLs. When they  */
    /* have not, apply the default Provii domains but only to URLs    */
    /* that were NOT explicitly overridden (environment defaults).    */
    /* Integrators who supply custom URLs without an allowedDomains   */
    /* have taken explicit responsibility for those endpoints.        */
    /* -------------------------------------------------------------- */
    const hasExplicitAllowlist = this.allowedDomains !== undefined;
    const effectiveAllowlist = this.allowedDomains ?? DEFAULT_ALLOWED_DOMAINS;

    // When no explicit allowlist: skip enforcement for integrator-supplied URLs.
    // statusUrl is derived from challengeUrl when not explicitly set, so it
    // follows the challengeUrl enforcement decision.
    const urlsAreDefaults = !rawChallengeUrl?.trim();
    const shouldEnforceChallenge = hasExplicitAllowlist || urlsAreDefaults;
    const shouldEnforceStatus =
      hasExplicitAllowlist || (urlsAreDefaults && !rawStatusUrl?.trim());
    const shouldEnforceRedeem = hasExplicitAllowlist || !redeemUrl;
    const shouldEnforcePoll = hasExplicitAllowlist || !pollUrl;

    if (shouldEnforceChallenge) {
      enforceDomainAllowlist(
        this.challengeUrl,
        "challengeUrl",
        effectiveAllowlist,
      );
    }
    if (shouldEnforceStatus) {
      enforceDomainAllowlist(this.statusUrl, "statusUrl", effectiveAllowlist);
    }
    if (this.redeemUrl && shouldEnforceRedeem) {
      enforceDomainAllowlist(this.redeemUrl, "redeemUrl", effectiveAllowlist);
    }
    if (this.pollUrl && shouldEnforcePoll) {
      enforceDomainAllowlist(this.pollUrl, "pollUrl", effectiveAllowlist);
    }
  }

  /**
   * Validate that this configuration is suitable for production use.
   * Throws on critical security issues (insecure HTTP).
   * Returns warnings for non-critical concerns.
   */
  validateForProduction(): string[] {
    const warnings: string[] = [];

    // SSRF-062/063: Throw (not warn) on insecure HTTP for API URLs.
    // Reuse enforceHttps which already handles case-insensitive scheme
    // matching and localhost exemption.
    enforceHttps(this.challengeUrl, "challengeUrl");
    enforceHttps(this.statusUrl, "statusUrl");
    if (this.redeemUrl) {
      enforceHttps(this.redeemUrl, "redeemUrl");
    }
    if (this.pollUrl) {
      enforceHttps(this.pollUrl, "pollUrl");
    }

    if (this.pollInterval < 1000) {
      warnings.push(
        `Poll interval of ${this.pollInterval}ms may be too aggressive`,
      );
    }

    if (this.verifyingKeyId === DEFAULT_VERIFYING_KEY_ID) {
      warnings.push(
        "Using default verifying key ID, consider configuring for your deployment",
      );
    }

    return warnings;
  }
}
