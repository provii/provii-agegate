// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Configuration parser for auto-block mode.
 *
 * Reads `data-*` attributes from the SDK script tag and validates them into
 * an {@link AutoBlockConfig}. Performs strict format checks on the public key,
 * environment, style preset, and API endpoint URL before the SDK starts any
 * network requests.
 *
 * @module modes/config-parser
 */

import type { AutoBlockConfig, UnavailableAction } from "../core/types.js";
import type { LocaleStrings } from "../i18n/types.js";
import { detectLocale } from "../i18n/index.js";
import DOMPurify from "dompurify";

/**
 * DOMPurify configuration for SVG content.
 * Allows SVG elements and filters while blocking script injection vectors.
 * Mirrors the config in challenge-ui.ts and bridge-schema.ts for consistency.
 */
const SVG_PURIFY_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS: ["script"] as string[],
  FORBID_ATTR: ["onerror", "onload", "onclick"] as string[],
};

/**
 * Config error class
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Parse configuration from script tag data attributes
 *
 * Supported attributes:
 * - data-public-key (required)
 * - data-environment ("production" | "sandbox") - defaults to "production"
 * - data-style ("modern" | "minimal" | "custom")
 * - data-api-endpoint (optional override - takes precedence over environment)
 * - data-allow-close (boolean)
 * - data-debug (boolean)
 * - data-on-unavailable ("block" | "allow" | "defer"): failure-mode policy
 *   when Provii is unreachable. Required choice; invalid values throw,
 *   absent fails closed at failure time (never a silent "allow")
 * - data-custom-styles (CSS string if style="custom")
 * - data-csp-nonce (string, nonce for injected style elements under strict CSP)
 * - data-lang (BCP 47 language tag for i18n, e.g. "fr", "de", "ja")
 * - data-strings (JSON string containing {key:value} string overrides, W10-3.2)
 * - data-logo-url (HTTPS URL of a brand logo image, W10-3.4)
 * - data-logo-svg (inline SVG markup; wins over URL)
 * - data-accent-gradient (W10-3.5: "#hex,#hex,#hex" tuple or full CSS value)
 * - data-privacy-policy-url (W10-3.6: https:// link rendered in the footer)
 * - data-preview-mode ("true" to enable preview mode; skips all network calls)
 * - data-theme ("light" | "dark" | "auto"; overrides prefers-color-scheme)
 * - data-container-radius (px, 0-64; maps to --ag-radius-container)
 * - data-button-radius (px, 0-64; maps to --ag-radius-button)
 * - data-font-family (font stack; maps to --ag-font-family, sanitised)
 * - data-motion-duration (ms, 0-2000; maps to --ag-motion-duration)
 * - data-backdrop-opacity (0-100; maps to --ag-overlay-backdrop alpha)
 * - data-gradient-angle (deg, 0-360; recomputes --ag-accent-gradient)
 * - data-qr-foreground (#rrggbb; QR dot/frame colour, also --ag-qr-fg)
 * - data-qr-background (#rrggbb; QR canvas colour, also --ag-qr-bg)
 * - data-qr-dot-style (dots | rounded | classy | classy-rounded | square | extra-rounded)
 * - data-qr-eye-frame-style (dot | square | extra-rounded)
 * - data-qr-eye-dot-style (dot | square)
 * - data-qr-logo-url (https:// URL embedded in QR centre)
 * - data-button-text-colour (#rrggbb; CTA text colour, --ag-button-text)
 * - data-preview-origin (comma-separated origins for preview postMessage bridge)
 *
 * @param scriptTag The script element
 * @returns Parsed configuration
 * @throws ConfigError if validation fails
 */
export function parseConfig(scriptTag: HTMLScriptElement): AutoBlockConfig {
  // Get data attributes (IV-712: runtime narrowing instead of unsafe `as` casts)
  const publicKey = scriptTag.dataset["publicKey"] || "";
  const rawEnvironment = scriptTag.dataset["environment"];
  const rawStyle = scriptTag.dataset["style"];
  const apiEndpoint = scriptTag.dataset["apiEndpoint"];
  const allowCloseStr = scriptTag.dataset["allowClose"];
  const debugStr = scriptTag.dataset["debug"];

  // Failure-mode policy when Provii is unavailable. The integrator is
  // expected to choose explicitly; an invalid value throws, an absent value
  // is left undefined and resolved to the safe 'block' default at failure
  // time (never a silent 'allow').
  const rawOnUnavailable = scriptTag.dataset["onUnavailable"];
  if (
    rawOnUnavailable !== undefined &&
    !["block", "allow", "defer"].includes(rawOnUnavailable)
  ) {
    throw new ConfigError(
      'data-on-unavailable must be "block", "allow", or "defer"',
    );
  }
  const onUnavailable = rawOnUnavailable as UnavailableAction | undefined;
  const customStyles = scriptTag.dataset["customStyles"];
  const cspNonce = scriptTag.dataset["cspNonce"];
  const lang = scriptTag.dataset["lang"];
  const strings = parseStringsOption(scriptTag);

  // Brand colour override. Parsed as a single hex colour; invalid values
  // are silently ignored so the theme default applies.
  const rawBrandColor = scriptTag.dataset["brandColor"];
  const brandColor =
    rawBrandColor && isValidHexColour(rawBrandColor)
      ? rawBrandColor
      : undefined;

  // W10-3.4: brand logo sources. SVG wins over URL if both are provided
  // (AutoBlockMode emits the warning so consumers of parseConfig alone
  // aren't spammed).
  const logoUrl = scriptTag.dataset["logoUrl"];
  const rawLogoSvg = scriptTag.dataset["logoSvg"];
  const logoSvg =
    rawLogoSvg !== undefined && rawLogoSvg.trim() !== ""
      ? DOMPurify.sanitize(rawLogoSvg, {
          ...SVG_PURIFY_CONFIG,
          RETURN_DOM: false,
          RETURN_DOM_FRAGMENT: false,
        })
      : undefined;
  if (logoUrl !== undefined && !isValidLogoUrl(logoUrl)) {
    throw new ConfigError(
      "data-logo-url must be an https:// or data:image/ URL (SVG data URIs are not permitted)",
    );
  }
  const accentGradient = parseAccentGradientAttr(
    scriptTag.dataset["accentGradient"],
  );
  const privacyPolicyUrl = parsePrivacyPolicyUrlAttr(
    scriptTag.dataset["privacyPolicyUrl"],
  );
  const previewMode = parseBoolean(scriptTag.dataset["previewMode"]);

  // Cosmetic / structural knobs that previously lived only on the
  // postMessage preview-bridge code path. Reading them here lands them
  // on the production script-tag path too so a styler-produced snippet
  // matches the styler preview when pasted into a real site.
  const theme = parseThemeAttr(scriptTag.dataset["theme"]);
  const containerRadius = parseNumberAttr(
    scriptTag.dataset["containerRadius"],
    "data-container-radius",
    0,
    64,
  );
  const buttonRadius = parseNumberAttr(
    scriptTag.dataset["buttonRadius"],
    "data-button-radius",
    0,
    64,
  );
  const fontFamily = parseFontFamilyAttr(scriptTag.dataset["fontFamily"]);
  const motionDuration = parseNumberAttr(
    scriptTag.dataset["motionDuration"],
    "data-motion-duration",
    0,
    2000,
  );
  const backdropOpacity = parseNumberAttr(
    scriptTag.dataset["backdropOpacity"],
    "data-backdrop-opacity",
    0,
    100,
  );
  const gradientAngle = parseNumberAttr(
    scriptTag.dataset["gradientAngle"],
    "data-gradient-angle",
    0,
    360,
  );
  const qrForeground = parseHexAttr(
    scriptTag.dataset["qrForeground"],
    "data-qr-foreground",
  );
  const qrBackground = parseHexAttr(
    scriptTag.dataset["qrBackground"],
    "data-qr-background",
  );
  const qrDotStyle = parseEnumAttr(
    scriptTag.dataset["qrDotStyle"],
    "data-qr-dot-style",
    QR_DOT_STYLE_VALUES,
  ) as AutoBlockConfig["qrDotStyle"];
  const qrEyeFrameStyle = parseEnumAttr(
    scriptTag.dataset["qrEyeFrameStyle"],
    "data-qr-eye-frame-style",
    QR_EYE_FRAME_STYLE_VALUES,
  ) as AutoBlockConfig["qrEyeFrameStyle"];
  const qrEyeDotStyle = parseEnumAttr(
    scriptTag.dataset["qrEyeDotStyle"],
    "data-qr-eye-dot-style",
    QR_EYE_DOT_STYLE_VALUES,
  ) as AutoBlockConfig["qrEyeDotStyle"];
  const qrLogoUrl = parseHttpsUrlAttr(
    scriptTag.dataset["qrLogoUrl"],
    "data-qr-logo-url",
  );
  const buttonTextColour = parseHexAttr(
    scriptTag.dataset["buttonTextColour"],
    "data-button-text-colour",
  );

  // Comma-separated list of allowed origins for the preview postMessage
  // bridge. Each entry is validated as a URL origin or the literal "null"
  // (opaque sandbox origin). Wildcards ("*") are rejected so callers
  // cannot accidentally open the bridge to all origins.
  const previewOrigin = parsePreviewOriginAttr(
    scriptTag.dataset["previewOrigin"],
  );

  // Detect and set locale before any UI rendering.
  // The fallback chain is: data-lang > html[lang] > navigator.language > "en"
  detectLocale(lang);

  // Validate environment with type guard before assignment
  if (rawEnvironment !== undefined && !isValidEnvironment(rawEnvironment)) {
    throw new ConfigError('data-environment must be "production" or "sandbox"');
  }
  const environment: "production" | "sandbox" | undefined = rawEnvironment as
    | "production"
    | "sandbox"
    | undefined;

  // Validate style with type guard before assignment
  if (rawStyle !== undefined && !isValidStyle(rawStyle)) {
    throw new ConfigError(
      'data-style must be "modern", "minimal", or "custom"',
    );
  }
  const style: "modern" | "minimal" | "custom" | undefined = rawStyle as
    | "modern"
    | "minimal"
    | "custom"
    | undefined;

  // Build config with validated values
  const config: AutoBlockConfig = {
    publicKey,
    environment: environment || "production",
    style: style || "modern",
    apiEndpoint,
    allowClose: parseBoolean(allowCloseStr),
    debug: parseBoolean(debugStr),
    customStyles,
    cspNonce,
    ...(onUnavailable ? { onUnavailable } : {}),
    ...(strings ? { strings } : {}),
    ...(brandColor ? { brandColor } : {}),
    ...(logoUrl ? { logoUrl } : {}),
    ...(logoSvg ? { logoSvg } : {}),
    ...(accentGradient !== undefined ? { accentGradient } : {}),
    ...(privacyPolicyUrl ? { privacyPolicyUrl } : {}),
    previewMode,
    ...(theme !== undefined ? { theme } : {}),
    ...(containerRadius !== undefined ? { containerRadius } : {}),
    ...(buttonRadius !== undefined ? { buttonRadius } : {}),
    ...(fontFamily !== undefined ? { fontFamily } : {}),
    ...(motionDuration !== undefined ? { motionDuration } : {}),
    ...(backdropOpacity !== undefined ? { backdropOpacity } : {}),
    ...(gradientAngle !== undefined ? { gradientAngle } : {}),
    ...(qrForeground !== undefined ? { qrForeground } : {}),
    ...(qrBackground !== undefined ? { qrBackground } : {}),
    ...(qrDotStyle !== undefined ? { qrDotStyle } : {}),
    ...(qrEyeFrameStyle !== undefined ? { qrEyeFrameStyle } : {}),
    ...(qrEyeDotStyle !== undefined ? { qrEyeDotStyle } : {}),
    ...(qrLogoUrl !== undefined ? { qrLogoUrl } : {}),
    ...(buttonTextColour !== undefined ? { buttonTextColour } : {}),
    ...(previewOrigin !== undefined ? { previewOrigin } : {}),
  };

  // Validate config (skip in preview mode since credentials are not needed)
  if (!previewMode) {
    validateConfig(config);
  }

  return config;
}

/**
 * Validate configuration
 *
 * @param config Configuration to validate
 * @throws ConfigError if invalid
 */
function validateConfig(config: Partial<AutoBlockConfig>): void {
  // Validate public key
  if (!config.publicKey || config.publicKey.trim() === "") {
    throw new ConfigError("data-public-key is required");
  }

  if (!isValidPublicKey(config.publicKey)) {
    throw new ConfigError(
      "data-public-key must be in format pk_live_xxx or pk_test_xxx (64 hex chars)",
    );
  }

  // Validate environment
  if (
    config.environment &&
    !["production", "sandbox"].includes(config.environment)
  ) {
    throw new ConfigError('data-environment must be "production" or "sandbox"');
  }

  // Validate style
  if (config.style && !["modern", "minimal", "custom"].includes(config.style)) {
    throw new ConfigError(
      'data-style must be "modern", "minimal", or "custom"',
    );
  }

  // Validate API endpoint if provided
  if (config.apiEndpoint && !isValidUrl(config.apiEndpoint)) {
    throw new ConfigError("data-api-endpoint must be a valid HTTPS URL");
  }

  // In auto-block mode, restrict API endpoint to known Provii domains (AA-031)
  if (config.apiEndpoint) {
    const ALLOWED_API_DOMAINS: ReadonlyArray<string> = [
      "hosted.provii.app",
      "sandbox-hosted.provii.app",
    ];
    try {
      const parsedEndpoint = new URL(config.apiEndpoint);
      if (!ALLOWED_API_DOMAINS.includes(parsedEndpoint.hostname)) {
        throw new ConfigError(
          `data-api-endpoint domain "${parsedEndpoint.hostname}" is not a recognised Provii API endpoint. ` +
            `Allowed domains: ${ALLOWED_API_DOMAINS.join(", ")}`,
        );
      }
    } catch (urlError: unknown) {
      if (urlError instanceof ConfigError) {
        throw urlError;
      }
      throw new ConfigError("data-api-endpoint must be a valid HTTPS URL");
    }
  }

  // Validate custom styles if style is custom
  if (config.style === "custom" && !config.customStyles) {
    throw new ConfigError('data-custom-styles is required when style="custom"');
  }
}

/**
 * Find the script tag for auto-block mode
 *
 * Looks for the script tag with data-public-key attribute.
 *
 * @returns Script element or null if not found
 */
export function findScriptTag(): HTMLScriptElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  // Try document.currentScript first (most reliable)
  const currentScript = document.currentScript as HTMLScriptElement | null;
  if (currentScript && currentScript.dataset["publicKey"]) {
    return currentScript;
  }

  // Fallback: Search all script tags
  const scripts = document.querySelectorAll(
    "script[data-public-key]",
  ) as NodeListOf<HTMLScriptElement>;

  if (scripts.length === 0) {
    return null;
  }

  if (scripts.length > 1) {
    console.warn(
      "[Provii Age Gate] Multiple script tags found with data-public-key. Using first one.",
    );
  }

  return scripts[0] || null;
}

/**
 * Read caller-supplied string overrides from the script tag (W10-3.2).
 *
 * Two input shapes are accepted:
 *   1. `data-strings` attribute on the main script tag containing a JSON
 *      object of `{ localeKey: "override" }`.
 *   2. A sibling `<script type="application/json" data-agegate-strings>`
 *      element in the same parent, whose textContent is the JSON object.
 *      The sibling form is preferred for anything beyond trivial overrides
 *      because HTML attributes require escaping quotes.
 *
 * Invalid JSON or non-string values are discarded with a console warning
 * rather than thrown, so a malformed override does not block verification.
 */
function parseStringsOption(
  scriptTag: HTMLScriptElement,
): Partial<LocaleStrings> | undefined {
  let raw: string | undefined = scriptTag.dataset["strings"];
  if (!raw && scriptTag.parentElement) {
    const sibling = scriptTag.parentElement.querySelector<HTMLScriptElement>(
      'script[type="application/json"][data-agegate-strings]',
    );
    if (sibling?.textContent) {
      raw = sibling.textContent;
    }
  }
  if (!raw || !raw.trim()) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(
      "[Provii Age Gate] data-strings is not valid JSON; ignoring overrides.",
    );
    return undefined;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    console.warn(
      "[Provii Age Gate] data-strings must be a JSON object; ignoring overrides.",
    );
    return undefined;
  }

  const overrides: Partial<LocaleStrings> = {};
  for (const [key, value] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    if (typeof value === "string" && value.length > 0) {
      // Trust the caller's key set; i18n.t() simply ignores unknown keys.
      (overrides as Record<string, string>)[key] = value;
    }
  }
  return Object.keys(overrides).length > 0 ? overrides : undefined;
}

/**
 * Parse boolean from string
 *
 * Accepts: "true", "1", "yes", "on" (case-insensitive) as true
 * Everything else is false
 *
 * @param value String value
 * @returns Boolean value
 */
function parseBoolean(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase().trim();
  return ["true", "1", "yes", "on"].includes(normalized);
}

/**
 * Validate public key format (IV-711: strict validation matching AgeGateConfig)
 *
 * Must match pk_live_<64 hex chars> or pk_test_<64 hex chars>
 * This is consistent with AgeGateConfig's publicKeyPattern.
 *
 * @param key Public key
 * @returns True if valid
 */
const PUBLIC_KEY_PATTERN = /^pk_(live|test)_[a-f0-9]{64}$/;

function isValidPublicKey(key: string): boolean {
  return PUBLIC_KEY_PATTERN.test(key);
}

/**
 * Type guard for valid environment values
 */
function isValidEnvironment(
  value: string | undefined,
): value is "production" | "sandbox" {
  return value === "production" || value === "sandbox";
}

/**
 * Type guard for valid style values
 */
function isValidStyle(
  value: string | undefined,
): value is "modern" | "minimal" | "custom" {
  return value === "modern" || value === "minimal" || value === "custom";
}

/**
 * Validate logo URL (W10-3.4). Accepts https:// URLs and data: image URIs
 * (data:image/png, data:image/webp, etc). SVG data URIs are rejected as
 * defence in depth because they can carry `<script>` payloads. Everything
 * else is rejected to prevent javascript:, http:, or arbitrary scheme
 * payloads from landing in the brand slot.
 */
function isValidLogoUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("data:image/")) {
    const lowerUrl = url.toLowerCase();
    return !lowerUrl.startsWith("data:image/svg");
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const HEX_COLOUR_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

/** Validate a single hex colour (3 or 6 digits, `#` prefix). */
export function isValidHexColour(value: string): boolean {
  return typeof value === "string" && HEX_COLOUR_RE.test(value);
}

/**
 * Parse the data-accent-gradient attribute (W10-3.5).
 *
 * Accepts:
 * - A comma-delimited triple of hex colours, e.g.
 *   `"#1e3a6e, #7b3fa0, #c05525"`. Returned as the `[start, mid, end]`
 *   tuple form of AutoBlockConfig.accentGradient.
 * - A full CSS value starting with `linear-gradient(` or `radial-gradient(`.
 *   Returned verbatim and applied to --ag-accent-gradient at runtime.
 *
 * Malformed tuples emit a console warning and resolve to undefined so
 * the SDK falls back to the Provii default gradient rather than
 * throwing during initialisation.
 */
function parseAccentGradientAttr(
  raw: string | undefined,
): [string, string, string] | string | undefined {
  if (!raw || !raw.trim()) return undefined;
  const value = raw.trim();

  if (
    value.startsWith("linear-gradient(") ||
    value.startsWith("radial-gradient(") ||
    value.startsWith("conic-gradient(")
  ) {
    return value;
  }

  const parts = value.split(",").map((part) => part.trim());
  if (parts.length !== 3 || !parts.every(isValidHexColour)) {
    console.warn(
      "[Provii Age Gate] data-accent-gradient must be three hex colours " +
        'separated by commas (e.g. "#0091C7, #5B3DF5, #C23AD6") or a full ' +
        "CSS gradient value; ignoring.",
    );
    return undefined;
  }
  return [parts[0], parts[1], parts[2]] as [string, string, string];
}

/**
 * Parse the data-privacy-policy-url attribute (W10-3.6). Must be a
 * valid https:// URL. Anything else (http, javascript:, relative path,
 * empty string) is discarded with a console warning so the footer
 * renders without the link rather than failing initialisation.
 */
function parsePrivacyPolicyUrlAttr(
  raw: string | undefined,
): string | undefined {
  if (!raw || !raw.trim()) return undefined;
  const value = raw.trim();
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      console.warn(
        "[Provii Age Gate] data-privacy-policy-url must use https://; ignoring.",
      );
      return undefined;
    }
    return value;
  } catch {
    console.warn(
      "[Provii Age Gate] data-privacy-policy-url is not a valid URL; ignoring.",
    );
    return undefined;
  }
}

/**
 * Validate URL format
 *
 * Must be a valid HTTPS URL
 *
 * @param url URL string
 * @returns True if valid
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Cosmetic / structural attribute parsers (W12 styler-knob bridge parity).
// All functions here follow the same contract: invalid input emits a single
// console.warn and resolves to `undefined` so the SDK falls back to the
// theme default rather than throwing during initialisation. The styler
// produces these values; pasting a snippet should never break a page.
// ---------------------------------------------------------------------------

/**
 * Strict 6-digit hex regex used by the bridge schema; mirrored here so
 * the script-tag and postMessage paths agree on what counts as a valid
 * colour. The looser 3-or-6-digit form (`HEX_COLOUR_RE` above) is kept
 * for `data-brand-color` only because that attribute predates the
 * bridge-schema's strict rule and removing the 3-digit form would be
 * a breaking change for existing integrators.
 */
const STRICT_HEX_RE = /^#[0-9a-fA-F]{6}$/;

const QR_DOT_STYLE_VALUES = [
  "dots",
  "rounded",
  "classy",
  "classy-rounded",
  "square",
  "extra-rounded",
] as const;

const QR_EYE_FRAME_STYLE_VALUES = ["dot", "square", "extra-rounded"] as const;

const QR_EYE_DOT_STYLE_VALUES = ["dot", "square"] as const;

const THEME_VALUES = ["light", "dark", "auto"] as const;

function parseThemeAttr(
  raw: string | undefined,
): "light" | "dark" | "auto" | undefined {
  if (raw === undefined) return undefined;
  const value = raw.trim().toLowerCase();
  if ((THEME_VALUES as readonly string[]).includes(value)) {
    return value as "light" | "dark" | "auto";
  }
  console.warn(
    `[Provii Age Gate] data-theme must be "light", "dark", or "auto"; ignoring.`,
  );
  return undefined;
}

function parseNumberAttr(
  raw: string | undefined,
  attr: string,
  min: number,
  max: number,
): number | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    console.warn(`[Provii Age Gate] ${attr} must be numeric; ignoring.`);
    return undefined;
  }
  if (value < min || value > max) {
    console.warn(
      `[Provii Age Gate] ${attr} must be between ${String(min)} and ${String(max)}; ignoring.`,
    );
    return undefined;
  }
  return value;
}

/**
 * Sanitise a font-family stack supplied by the styler. CSS-injection
 * is blocked by stripping any character outside the documented allow
 * list (letters, digits, space, comma, dash, underscore, full stop,
 * single + double quote). Brace, semicolon, colon, angle bracket etc.
 * are rejected so a value like `Arial; } body { display:none; .` can
 * never escape the `--ag-font-family` CSS-var binding.
 */
function parseFontFamilyAttr(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  if (!/^[A-Za-z0-9 ,\-_.'"]+$/.test(trimmed)) {
    console.warn(
      `[Provii Age Gate] data-font-family contains disallowed characters; ignoring.`,
    );
    return undefined;
  }
  return trimmed;
}

function parseHexAttr(
  raw: string | undefined,
  attr: string,
): string | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  if (!STRICT_HEX_RE.test(trimmed)) {
    console.warn(
      `[Provii Age Gate] ${attr} must be a 6-digit hex colour (e.g. "#0091C7"); ignoring.`,
    );
    return undefined;
  }
  return trimmed.toLowerCase();
}

function parseEnumAttr<T extends string>(
  raw: string | undefined,
  attr: string,
  values: readonly T[],
): T | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "") return undefined;
  if ((values as readonly string[]).includes(trimmed)) {
    return trimmed as T;
  }
  console.warn(
    `[Provii Age Gate] ${attr} must be one of ${values.join(" | ")}; ignoring.`,
  );
  return undefined;
}

function parseHttpsUrlAttr(
  raw: string | undefined,
  attr: string,
): string | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      console.warn(`[Provii Age Gate] ${attr} must use https://; ignoring.`);
      return undefined;
    }
    return trimmed;
  } catch {
    console.warn(`[Provii Age Gate] ${attr} is not a valid URL; ignoring.`);
    return undefined;
  }
}

/**
 * Parse the data-preview-origin attribute.
 *
 * Accepts a comma-separated list of entries. Each entry must be either:
 *   - A valid URL whose `origin` property equals the entry (i.e. it must
 *     be an origin, not a full URL with path), or
 *   - The literal string "null" (opaque sandbox origin).
 *
 * Wildcards ("*") are silently dropped rather than passed through so
 * callers cannot accidentally open the bridge to all origins. Invalid
 * entries emit a console warning and are excluded from the list.
 *
 * Returns the raw attribute string when at least one valid entry was
 * found, or `undefined` when the attribute is absent or every entry
 * was invalid.
 */
function parsePreviewOriginAttr(raw: string | undefined): string | undefined {
  if (!raw || !raw.trim()) return undefined;

  const valid: string[] = [];
  for (const part of raw.split(",")) {
    const entry = part.trim();
    if (!entry) continue;
    if (entry === "*") {
      console.warn(
        '[Provii Age Gate] data-preview-origin: wildcard "*" is not permitted; skipping.',
      );
      continue;
    }
    if (entry === "null") {
      valid.push(entry);
      continue;
    }
    try {
      const parsed = new URL(entry);
      if (parsed.origin === entry || parsed.origin + "/" === entry) {
        valid.push(parsed.origin);
      } else {
        console.warn(
          `[Provii Age Gate] data-preview-origin: "${entry}" is not a bare origin; skipping.`,
        );
      }
    } catch {
      console.warn(
        `[Provii Age Gate] data-preview-origin: "${entry}" is not a valid URL; skipping.`,
      );
    }
  }

  if (valid.length === 0) return undefined;
  return valid.join(",");
}
