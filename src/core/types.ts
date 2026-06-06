// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Core TypeScript types and interfaces for the Provii Age Gate SDK.
 *
 * Defines all request/response types, configuration interfaces, session
 * structures, polling configuration, and SDK event types used across
 * auto-block, manual, and headless integration modes.
 *
 * @module core/types
 */

/**
 * Environment type for API endpoints
 */
export type Environment = "production" | "sandbox";

/**
 * What the SDK should do when the Provii backend cannot return a
 * verification verdict because it is unreachable, erroring, or exhausted
 * its retry budget (an availability failure, NOT a genuine "underage" or
 * "failed" verdict).
 *
 * The relying party owns this decision; the SDK never picks for you.
 *
 * - 'block'  Keep the gate up and show the retry prompt (fail closed).
 *            Safest for compliance: no one passes while Provii is down,
 *            but Provii becomes a hard dependency on your page.
 * - 'allow'  Treat the unavailability as a pass and reveal the content
 *            (fail open). Provii never breaks your page, but unverified
 *            users reach gated content during the outage. You accept the
 *            compliance risk for that window.
 * - 'defer'  Hand control back to you: the SDK emits an `unavailable`
 *            event (autoload) and calls `onUnavailableHandler` (manual
 *            mode), then stays blocked so you can route to a fallback
 *            age-verification provider or your own logic.
 *
 * IMPORTANT: this only ever fires on an availability failure. A real
 * "underage"/"failed" verdict from the verifier always blocks regardless
 * of this setting; cryptographic rejections are never failed open.
 */
export type UnavailableAction = "block" | "allow" | "defer";

/**
 * Session states from the hosted backend
 */
export type SessionState =
  | "pending" // Waiting for user verification
  | "proof_ok" // Proof verified, ready to redeem
  | "proof_ok_waiting_for_redeem" // Proof verified, waiting for redemption
  | "verified" // Session redeemed, cookie set
  | "expired" // Session expired
  | "revoked" // Session revoked
  | "failed"; // Verification failed

/**
 * API client configuration
 */
export interface ClientConfig {
  /** Public key for authentication */
  publicKey: string;

  /**
   * Environment for age verification (default: 'production')
   * - 'production': Uses https://hosted.provii.app
   * - 'sandbox': Uses https://sandbox-hosted.provii.app
   */
  environment?: "production" | "sandbox";

  /** Hosted backend API endpoint (overrides environment if provided) */
  apiEndpoint?: string;

  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;

  /** Enable debug logging */
  debug?: boolean;

  /** Custom fetch implementation (for testing) */
  fetchImpl?: typeof fetch;

  /**
   * The integrator's `onUnavailable` override, if any (null when unset).
   * Threaded through only so the server-failure-mode cache can be keyed by
   * `(publicKey, onUnavailable)`, matching the read side that resolves the
   * effective mode during an outage. The client itself does not act on it.
   */
  onUnavailable?: UnavailableAction | null;
}

/**
 * Challenge creation parameters
 */
export interface ChallengeParams {
  /** PKCE code challenge (base64url, 43-128 chars) */
  codeChallenge: string;

  /** PKCE challenge method (always "S256") */
  codeChallengeMethod: "S256";

  /** Origin of the requesting site */
  origin: string;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Challenge response from POST /v1/hosted/challenge
 */
export interface Challenge {
  /** Unique session identifier (UUID v4) */
  sessionId: string;

  /** Challenge ID for issuer service */
  challengeId: string;

  /** QR code URL for wallet app */
  qrCodeUrl: string;

  /** Human-readable challenge code */
  challengeCode: string;

  /** When the challenge expires (Unix seconds) */
  expiresAt: number;

  /** Deep link URL for opening the wallet app directly (custom scheme) */
  deepLink: string;

  /** Current status */
  status: SessionState;

  /** Epoch day cutoff for age calculation (from server) */
  cutoffDays?: number;

  /** "over_age" or "under_age" (from server) */
  proofDirection?: string;

  /**
   * Server-configured outage failure mode for this origin, mapped from the
   * challenge response. Undefined when the origin policy leaves it unset.
   */
  failureMode?: UnavailableAction;

  /** When true, the integrator's onUnavailable choice is ignored (governance lock). */
  failureModeLocked?: boolean;
}

/**
 * Status response from GET /v1/hosted/status/:session_id
 */
export interface StatusResponse {
  /** Session ID */
  sessionId: string;

  /** Current session state */
  state: SessionState;

  /** Whether verification is complete */
  complete: boolean;

  /** When session was created (Unix seconds) */
  createdAt: number;

  /** When session expires (Unix seconds) */
  expiresAt: number;

  /** Whether proof has been verified */
  proofVerified: boolean;

  /** When to poll again (Unix seconds, only for pending) */
  pollAfter?: number;

  /** Remaining status checks before rate limit */
  remainingChecks: number;

  /** Error message if applicable */
  error?: string;
}

/**
 * Session redemption response from POST /v1/hosted/redeem/:session_id
 */
export interface RedeemResponse {
  /** Session status (should be "verified") */
  status: string;

  /** When verification completed (Unix seconds) */
  verifiedAt: number;

  /** When the session expires (Unix seconds) */
  expiresAt: number;
}

/**
 * Session check response from GET /v1/hosted/session/check
 */
export interface SessionCheckResponse {
  /** Whether user has a valid session */
  verified: boolean;

  /** Session details if verified */
  session?: {
    /** Session ID */
    sessionId: string;

    /** When session expires */
    expiresAt: number;
  };
}

/**
 * PKCE challenge pair
 */
export interface PKCEChallenge {
  /** Code verifier (43-128 random chars) */
  verifier: string;

  /** SHA-256 hash of verifier (base64url) */
  challenge: string;
}

/**
 * Parsed session information from JWT
 */
export interface SessionInfo {
  /** Session ID */
  sessionId: string;

  /** Origin that created the session */
  origin: string;

  /** When token was issued (Unix seconds) */
  issuedAt: number;

  /** When token expires (Unix seconds) */
  expiresAt: number;

  /** JWT issuer */
  issuer: string;
}

// Forward type-only import avoids bundling the full i18n module here; the
// types file stays dependency-light.
import type { LocaleStrings } from "../i18n/types.js";

/**
 * Auto-block mode configuration (parsed from script tag)
 */
export interface AutoBlockConfig {
  /** Public key (required) */
  publicKey: string;

  /**
   * Environment for age verification (default: 'production')
   * - 'production': Uses https://hosted.provii.app
   * - 'sandbox': Uses https://sandbox-hosted.provii.app
   */
  environment?: "production" | "sandbox";

  /** UI style preset */
  style?: "modern" | "minimal" | "custom";

  /** Custom API endpoint override (takes precedence over environment) */
  apiEndpoint?: string;

  /**
   * What to do when the Provii backend cannot return a verdict because it
   * is unreachable, erroring, or has exhausted its retry budget (an
   * availability failure, not an "underage"/"failed" verdict).
   *
   * Set via the `data-on-unavailable` attribute. You are expected to choose
   * one of 'block', 'allow', or 'defer' explicitly. When omitted, the SDK
   * fails closed ('block') and logs a console error, because silently
   * letting users through during an outage is never a safe default.
   *
   * See {@link UnavailableAction}.
   */
  onUnavailable?: UnavailableAction;

  /** Allow users to close the gate (default: false) */
  allowClose?: boolean;

  /** Enable debug logging */
  debug?: boolean;

  /** Custom styles (if style='custom') */
  customStyles?: string;

  /**
   * CSP nonce for injected style elements.
   *
   * When provided, all `<style>` elements created by the SDK will include
   * a `nonce` attribute with this value, allowing the SDK to work under
   * `style-src 'nonce-<value>'` Content Security Policy rules.
   */
  cspNonce?: string;

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
   * When supplied via a script tag, use a sibling
   * `<script type="application/json" data-agegate-strings>{...}</script>`
   * element. Individual entries can also be set via `data-strings-<key>`
   * attributes on the main script tag for very light overrides.
   */
  strings?: Partial<LocaleStrings>;

  /**
   * HTTPS URL of a brand logo to render inside the header circle
   * (W10-3.4). Rendered as an `<img>` with decorative `alt=""`. Ignored
   * when {@link logoSvg} is also supplied.
   */
  logoUrl?: string;

  /**
   * Inline SVG markup to render inside the header circle (W10-3.4).
   * Takes precedence over {@link logoUrl}; when both are set a console
   * warning is emitted and the URL is ignored.
   *
   * Sanitised via DOMPurify at the config-parser boundary (AG-U9).
   * Script tags and event-handler attributes are stripped before the
   * value is stored. Downstream render sites apply a second sanitisation
   * pass as defence in depth.
   */
  logoSvg?: string;

  /**
   * Brand colour override. Applied to `--ag-accent-start` on the shadow
   * host, controlling CTA borders, focus rings, footer links, spinners,
   * badge text, short code colour, and other accent-derived tokens.
   *
   * Must be a valid hex colour (`#rrggbb` or `#rgb`). Invalid values
   * are ignored with a console warning and the theme default is kept.
   */
  brandColor?: string;

  /**
   * Brand accent gradient override (W10-3.5).
   *
   * Two shapes are accepted:
   * - A `[start, mid, end]` tuple of hex colours (`#rrggbb` or `#rgb`).
   *   The tuple is used as the stops of the default 135deg linear
   *   gradient and is forwarded to the styled QR renderer.
   * - A raw CSS value (`"linear-gradient(...)"`), applied directly to
   *   `--ag-accent-gradient`. The QR code attempts to extract three hex
   *   colours from the string; when extraction fails the QR falls back
   *   to the Provii default triple rather than rendering an unbranded
   *   canvas.
   *
   * Invalid hex inputs on the tuple variant are rejected with a warning
   * and the default gradient is kept.
   */
  accentGradient?: [string, string, string] | string;

  /**
   * Optional privacy policy URL (W10-3.6). When provided, a small
   * footer link is rendered next to the "Powered by Provii Wallet"
   * row. The URL must be https:// (or a data:image URI is rejected).
   * Invalid inputs are ignored with a console warning so the gate
   * still renders.
   */
  privacyPolicyUrl?: string;

  /**
   * When true, the SDK renders its overlay UI with a canned challenge
   * and makes zero network requests. Intended for documentation sites
   * and style previews where the widget is shown as a visual demo
   * only. The overlay stays in the "waiting for scan" state
   * indefinitely and displays a small dismissable banner reading
   * "Preview mode, no verification occurs".
   *
   * In preview mode, publicKey validation, apiEndpoint validation,
   * and the SSRF domain allowlist are all skipped so the widget can
   * render without valid credentials.
   *
   * @default false
   */
  previewMode?: boolean;

  /**
   * Force the preview overlay to render as desktop or mobile layout
   * regardless of the actual user agent. Only effective in preview
   * mode. When set to `"auto"` or omitted, `isMobile()` UA detection
   * is used as before.
   *
   * The styler posts this value over the bridge so users can preview
   * the mobile CTA button (and its `verifyButtonLabel` override)
   * without needing a real mobile device.
   *
   * @default 'auto'
   */
  previewLayout?: "desktop" | "mobile" | "auto";

  /**
   * Container corner radius in pixels. Maps to `--ag-radius-container`.
   * Range 0-64. Invalid values fall back to the theme default (16px).
   */
  containerRadius?: number;

  /**
   * Button corner radius in pixels. Maps to `--ag-radius-button`.
   * Range 0-64. Invalid values fall back to the theme default (12px).
   */
  buttonRadius?: number;

  /**
   * Font family stack. Applied to `--ag-font-family`. Stripped of any
   * `;{}<>` to block CSS-injection through the font-family value;
   * malformed input falls back to the Manrope-led system stack.
   */
  fontFamily?: string;

  /**
   * Motion duration in milliseconds. Maps to `--ag-motion-duration` as
   * `Nms`. Range 0-2000. The SDK clamps to 0 when
   * `prefers-reduced-motion: reduce` matches.
   */
  motionDuration?: number;

  /**
   * Modal backdrop opacity in percent (0-100). Maps to
   * `--ag-overlay-backdrop` as `rgba(0,0,0,N)` with N=opacity/100.
   * Default 95.
   */
  backdropOpacity?: number;

  /**
   * Accent gradient angle in degrees (0-360). Default 135. Recomputes
   * `--ag-accent-gradient` using the current `accentGradient` stops.
   */
  gradientAngle?: number;

  /**
   * Flat foreground colour for the QR code (dots + corner frames).
   * Hex string `#rrggbb`. When omitted, the QR uses the accent
   * gradient. Maps to `--ag-qr-fg` and is also passed directly to the
   * QR renderer (computed-style lookup is unreliable for elements
   * inside detached DocumentFragments).
   */
  qrForeground?: string;

  /**
   * Flat background colour for the QR code. Hex string `#rrggbb`.
   * Default `#ffffff`. Maps to `--ag-qr-bg`.
   */
  qrBackground?: string;

  /**
   * QR dot shape preset. One of: `dots`, `rounded`, `classy`,
   * `classy-rounded`, `square`, `extra-rounded`. Default `dots`.
   */
  qrDotStyle?:
    | "dots"
    | "rounded"
    | "classy"
    | "classy-rounded"
    | "square"
    | "extra-rounded";

  /**
   * QR eye-frame shape preset. One of: `dot`, `square`, `extra-rounded`.
   * Default `extra-rounded`.
   */
  qrEyeFrameStyle?: "dot" | "square" | "extra-rounded";

  /**
   * QR inner-eye-dot shape preset. One of: `dot`, `square`. Default `square`.
   */
  qrEyeDotStyle?: "dot" | "square";

  /**
   * HTTPS URL of an image to embed in the QR centre. Auto-raises the
   * QR error correction to H to compensate for the image cutout.
   */
  qrLogoUrl?: string;

  /**
   * CTA button text colour (mobile primary, desktop secondary). Hex
   * string `#rrggbb`. Default `#ffffff`. Maps to `--ag-button-text`.
   */
  buttonTextColour?: string;

  /**
   * Explicit allowed origin(s) for the preview postMessage bridge.
   *
   * Comma-separated list of URL origins (e.g. `"https://docs.provii.app"`
   * or `"https://docs.provii.app,http://localhost:4321"`). When
   * present, these origins are used directly instead of deriving the
   * allowed origin from `document.referrer`. The literal string `"null"`
   * is accepted to allow opaque sandbox origins. Wildcards (`"*"`) are
   * rejected during parsing and never added to the allowlist.
   *
   * Only meaningful in preview mode. Ignored in normal verification flows.
   */
  previewOrigin?: string;
}

/**
 * Manual mode configuration
 */
interface ManualModeConfig {
  /** Public key (required) */
  publicKey: string;

  /** Environment ('production' or 'sandbox') */
  environment?: Environment;

  /** API endpoint override */
  apiEndpoint?: string;

  /** Enable debug logging */
  debug?: boolean;

  /** Request timeout in ms */
  timeout?: number;
}

/**
 * Headless mode configuration
 */
interface HeadlessConfig {
  /** API endpoint (default: https://hosted.provii.app) */
  apiEndpoint?: string;

  /** Enable debug logging */
  debug?: boolean;

  /** Request timeout in ms */
  timeout?: number;

  /** Custom fetch implementation */
  fetchImpl?: typeof fetch;
}

/**
 * Verification session for manual mode
 */
interface VerificationSession {
  /** Session ID for tracking */
  sessionId: string;

  /** Challenge ID */
  challengeId: string;

  /** QR code URL */
  qrCodeUrl: string;

  /** Deep link URL for opening the wallet app directly */
  deepLink: string;

  /** Human-readable code */
  challengeCode: string;

  /** Expiration timestamp */
  expiresAt: number;

  /** Stop polling function */
  stop: () => void;
}

/**
 * Event types for the SDK
 */
export type SDKEvent =
  | "verified" // Verification successful
  | "error" // Error occurred
  | "timeout" // Verification timed out
  | "statusUpdate" // Status polling update
  | "expired" // Session expired
  | "unavailable" // Provii backend unreachable; chosen failure mode applied
  | "closed"; // User closed the gate (if allowClose=true)

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (data: T) => void;

/**
 * Error event data
 */
export interface ErrorEventData {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Detailed error information */
  details?: unknown;
}

/**
 * Verified event data
 */
export interface VerifiedEventData {
  /** Session ID */
  sessionId: string;

  /** When verification completed */
  verifiedAt: number;
}

/**
 * Unavailable event data.
 *
 * Emitted when the Provii backend could not return a verdict (an
 * availability failure) and the configured {@link UnavailableAction} was
 * applied. Lets the integrator drive a fallback when `action === 'defer'`,
 * or simply observe how the SDK degraded.
 */
export interface UnavailableEventData {
  /** The failure-mode that was applied. */
  action: UnavailableAction;

  /** Short, non-sensitive reason code, e.g. "challenge_create_failed". */
  reason: string;

  /** Underlying error code when available (never raw error text). */
  code?: string;
}

/**
 * Status update event data
 */
export interface StatusUpdateEventData {
  /** Session ID */
  sessionId: string;

  /** Current status */
  status: SessionState;

  /** Whether proof is verified */
  proofVerified: boolean;
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  /** Error message */
  error: string;

  /** Error code (if available) */
  code?: string;

  /** Additional details */
  details?: unknown;
}

/**
 * Retry configuration for API client
 */
export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries: number;

  /** Initial delay in ms */
  initialDelay: number;

  /** Maximum delay in ms */
  maxDelay: number;

  /** Backoff multiplier */
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Default client configuration
 */
// Environment-specific hosted backend URLs
export const ENVIRONMENT_API_ENDPOINTS: Record<
  "production" | "sandbox",
  string
> = {
  production: "https://hosted.provii.app",
  sandbox: "https://sandbox-hosted.provii.app",
};

export const DEFAULT_CLIENT_CONFIG: Partial<ClientConfig> = {
  environment: "production",
  apiEndpoint: ENVIRONMENT_API_ENDPOINTS.production,
  timeout: 10000,
  debug: false,
};

/**
 * Session cookie names by environment
 *
 * Note: These cookies are HttpOnly and cannot be read by JavaScript.
 * Session validation is done server-side via the /session/check endpoint.
 * These constants are provided for reference and for scenarios where
 * non-HttpOnly cookies might be configured.
 */
export const SESSION_COOKIE_NAMES = {
  production: "__Host-session",
  sandbox: "__Host-session-sandbox",
} as const;

/**
 * SessionStorage key prefix for PKCE verifiers
 */
export const PKCE_STORAGE_PREFIX = "provii_pkce_";

/**
 * Polling configuration
 */
interface PollingConfig {
  /** Initial interval in ms (early phase aggressive polling) */
  initialInterval: number;

  /** Maximum interval in ms */
  maxInterval: number;

  /** Backoff multiplier for network errors */
  backoffMultiplier: number;

  /** Timeout in ms (5 minutes) */
  timeout: number;
}

/**
 * Default polling configuration
 * Uses adaptive polling strategy:
 * - Initial: 3000ms (aligned with server's 20/min rate limit floor)
 * - Backoff: 1.3x multiplier on errors
 * - Max: 10000ms ceiling
 * - proof_ok states: 300ms intervals (aggressive verification)
 *
 * SECURITY (H-22): initialInterval raised from 500ms to 3000ms so that the SDK
 * does not exhaust the hosted backend's per-session 20/min status polling quota
 * within the first 10 seconds.
 */
export const DEFAULT_POLLING_CONFIG: PollingConfig = {
  initialInterval: 3000, // Aligned with server 20/min rate limit
  maxInterval: 10000, // Maximum backoff interval
  backoffMultiplier: 1.3, // Gentle backoff for errors
  timeout: 300000, // 5 minutes total
};
