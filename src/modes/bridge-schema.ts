// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Typed postMessage bridge schema for the styler ⇄ preview iframe
 * channel.
 *
 * Mirror of provii-docs/src/lib/styler-bridge-schema.ts. Both ends of
 * the bridge validate on send and on receive; invalid messages are
 * rejected with a structured error the caller can log. Kept as a
 * zero-dep hand-rolled validator so provii-agegate does not grow a
 * dependency on Zod.
 */

import DOMPurify from "dompurify";

export const AGEGATE_CONFIG_MESSAGE_TYPE = "agegate-config" as const;
export const AGEGATE_CONFIG_MESSAGE_VERSION = 1 as const;

export type StylerDir = "ltr" | "rtl";

/** Dot shape for the QR code body modules. */
export type QrDotStyle =
  | "dots"
  | "rounded"
  | "classy"
  | "classy-rounded"
  | "square"
  | "extra-rounded";

/** Shape of the three large corner frames (eye frames). */
export type QrEyeFrameStyle = "dot" | "square" | "extra-rounded";

/** Shape of the inner dot inside each corner frame. */
export type QrEyeDotStyle = "dot" | "square";

const QR_DOT_STYLES: ReadonlySet<string> = new Set([
  "dots",
  "rounded",
  "classy",
  "classy-rounded",
  "square",
  "extra-rounded",
]);

const QR_EYE_FRAME_STYLES: ReadonlySet<string> = new Set([
  "dot",
  "square",
  "extra-rounded",
]);

const QR_EYE_DOT_STYLES: ReadonlySet<string> = new Set(["dot", "square"]);

/** Strict hex colour, six digits, leading `#`. */
const HEX_REGEX = /^#[0-9a-f]{6}$/i;

/** HTTPS URL only, no data:, javascript:, blob: etc. */
function isHttpsUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export interface AgegateConfigPayload {
  readonly brandColour: string;
  readonly accentGradient: readonly [string, string, string];
  readonly logoUrl?: string;
  readonly logoSvg?: string;
  readonly locale: string;
  readonly containerRadius: number;
  readonly buttonRadius: number;
  readonly fontFamily: string;
  readonly motionDuration: number;
  readonly privacyPolicyUrl?: string;
  readonly strings: Readonly<Record<string, string>>;
  readonly dir: StylerDir;
  /** QR code background colour (default #ffffff). */
  readonly qrBackground?: string;
  /** CTA button text colour (default white). */
  readonly buttonTextColour?: string;
  /** Modal backdrop opacity 0-100 (default 95). */
  readonly backdropOpacity?: number;
  /** Accent gradient angle in degrees (default 135). */
  readonly gradientAngle?: number;
  /**
   * Force desktop or mobile layout in preview mode. When `"auto"` or
   * absent, the SDK falls back to `isMobile()` UA detection. Preview
   * mode only; ignored in production verification flows.
   */
  readonly previewLayout?: "desktop" | "mobile" | "auto";
  /** QR code foreground colour (default uses accent gradient). */
  readonly qrForeground?: string;
  /** QR dot shape (default "dots"). */
  readonly qrDotStyle?: QrDotStyle;
  /** QR eye frame shape (default "extra-rounded"). */
  readonly qrEyeFrameStyle?: QrEyeFrameStyle;
  /** QR eye inner dot shape (default "square"). */
  readonly qrEyeDotStyle?: QrEyeDotStyle;
  /** HTTPS URL of an image to embed in the QR code centre. */
  readonly qrLogoUrl?: string;
  /**
   * Preview surface theme. `"light"` or `"dark"` maps to the
   * `data-agegate-theme` attribute on the shadow host; `"auto"` (or
   * absent) lets the SDK honour the user's `prefers-color-scheme`.
   */
  readonly theme?: "light" | "dark" | "auto";
}

export interface AgegateConfigMessage {
  readonly type: typeof AGEGATE_CONFIG_MESSAGE_TYPE;
  readonly version: typeof AGEGATE_CONFIG_MESSAGE_VERSION;
  readonly config: AgegateConfigPayload;
}

type ParseResult<T> = { ok: true; value: T } | { ok: false; reason: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseHex(raw: unknown, field: string): ParseResult<string> {
  if (typeof raw !== "string") {
    return { ok: false, reason: `${field}: expected a string hex colour` };
  }
  const trimmed = raw.trim().toLowerCase();
  if (!HEX_REGEX.test(trimmed)) {
    return { ok: false, reason: `${field}: expected /^#[0-9a-f]{6}$/i` };
  }
  return { ok: true, value: trimmed };
}

function parseDir(raw: unknown): ParseResult<StylerDir> {
  if (raw === "ltr" || raw === "rtl") {
    return { ok: true, value: raw };
  }
  return { ok: false, reason: "dir: expected 'ltr' or 'rtl'" };
}

function parseLocale(raw: unknown): ParseResult<string> {
  if (typeof raw !== "string") {
    return { ok: false, reason: "locale: expected string" };
  }
  // Accept BCP 47 subtags like "en", "zh", "zh-Hans", "fr-FR".
  if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/i.test(raw)) {
    return { ok: false, reason: "locale: expected BCP 47 tag" };
  }
  return { ok: true, value: raw };
}

function parsePositiveInt(
  raw: unknown,
  field: string,
  max: number,
): ParseResult<number> {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return { ok: false, reason: `${field}: expected finite number` };
  }
  if (raw < 0 || raw > max) {
    return { ok: false, reason: `${field}: expected 0..${max}` };
  }
  if (!Number.isInteger(raw)) {
    return { ok: false, reason: `${field}: expected integer` };
  }
  return { ok: true, value: raw };
}

function parseOptionalHttpsUrl(
  raw: unknown,
  field: string,
): ParseResult<string | undefined> {
  if (raw === undefined || raw === "" || raw === null) {
    return { ok: true, value: undefined };
  }
  if (typeof raw !== "string" || !isHttpsUrl(raw)) {
    return { ok: false, reason: `${field}: expected https URL` };
  }
  return { ok: true, value: raw };
}

function parseOptionalString(
  raw: unknown,
  field: string,
  maxLength: number,
): ParseResult<string | undefined> {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: undefined };
  }
  if (typeof raw !== "string") {
    return { ok: false, reason: `${field}: expected string` };
  }
  if (raw.length > maxLength) {
    return {
      ok: false,
      reason: `${field}: exceeds max length ${maxLength}`,
    };
  }
  return { ok: true, value: raw };
}

function parseFontFamily(raw: unknown): ParseResult<string> {
  if (typeof raw !== "string" || raw.length === 0) {
    return { ok: false, reason: "fontFamily: expected non-empty string" };
  }
  // Disallow characters that enable CSS injection: `;`, `{`, `}`, `<`, `>`,
  // newlines, backticks. Integrators can still supply comma-separated
  // stacks like `Inter, system-ui, sans-serif`.
  if (/[;{}<>`\n\r]/.test(raw)) {
    return {
      ok: false,
      reason: "fontFamily: contains disallowed characters",
    };
  }
  if (raw.length > 200) {
    return { ok: false, reason: "fontFamily: exceeds 200 chars" };
  }
  return { ok: true, value: raw };
}

function parseStrings(
  raw: unknown,
): ParseResult<Readonly<Record<string, string>>> {
  if (!isPlainObject(raw)) {
    return { ok: false, reason: "strings: expected object" };
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key)) {
      return { ok: false, reason: `strings.${key}: invalid key` };
    }
    if (typeof value !== "string") {
      return { ok: false, reason: `strings.${key}: expected string` };
    }
    if (value.length > 500) {
      return { ok: false, reason: `strings.${key}: exceeds 500 chars` };
    }
    out[key] = value;
  }
  return { ok: true, value: out };
}

/**
 * Validate and narrow an unknown value into an AgegateConfigMessage.
 * Used on both sides of the bridge.
 */
export function parseConfigMessage(
  raw: unknown,
): ParseResult<AgegateConfigMessage> {
  if (!isPlainObject(raw)) {
    return { ok: false, reason: "message: expected object" };
  }
  if (raw["type"] !== AGEGATE_CONFIG_MESSAGE_TYPE) {
    return { ok: false, reason: "type: expected 'agegate-config'" };
  }
  if (raw["version"] !== AGEGATE_CONFIG_MESSAGE_VERSION) {
    return { ok: false, reason: "version: expected 1" };
  }
  const cfgRaw = raw["config"];
  if (!isPlainObject(cfgRaw)) {
    return { ok: false, reason: "config: expected object" };
  }

  const brand = parseHex(cfgRaw["brandColour"], "brandColour");
  if (!brand.ok) return brand;

  const gradient = cfgRaw["accentGradient"];
  if (!Array.isArray(gradient) || gradient.length !== 3) {
    return {
      ok: false,
      reason: "accentGradient: expected tuple of 3 hex colours",
    };
  }
  const stop1 = parseHex(gradient[0], "accentGradient[0]");
  if (!stop1.ok) return stop1;
  const stop2 = parseHex(gradient[1], "accentGradient[1]");
  if (!stop2.ok) return stop2;
  const stop3 = parseHex(gradient[2], "accentGradient[2]");
  if (!stop3.ok) return stop3;

  // layout field is intentionally ignored: modal is the only supported
  // mode. Existing payloads that include a layout key are accepted
  // (unknown-field strip) so provii-docs messages keep round-tripping.
  const dir = parseDir(cfgRaw["dir"]);
  if (!dir.ok) return dir;
  const locale = parseLocale(cfgRaw["locale"]);
  if (!locale.ok) return locale;

  const logoUrl = parseOptionalHttpsUrl(cfgRaw["logoUrl"], "logoUrl");
  if (!logoUrl.ok) return logoUrl;
  const privacyPolicyUrl = parseOptionalHttpsUrl(
    cfgRaw["privacyPolicyUrl"],
    "privacyPolicyUrl",
  );
  if (!privacyPolicyUrl.ok) return privacyPolicyUrl;

  // Length ceiling + regex pre-check, then DOMPurify sanitisation for
  // defence in depth. The regex rejects obvious attack payloads early;
  // DOMPurify handles edge cases the regex cannot catch.
  const logoSvg = parseOptionalString(cfgRaw["logoSvg"], "logoSvg", 8192);
  if (!logoSvg.ok) return logoSvg;
  if (
    typeof logoSvg.value === "string" &&
    /<script|javascript:|on[a-z]+=/i.test(logoSvg.value)
  ) {
    return { ok: false, reason: "logoSvg: rejected unsafe markup" };
  }
  // Sanitise SVG via DOMPurify even after the regex gate above.
  const sanitisedLogoSvg: typeof logoSvg =
    logoSvg.value != null
      ? {
          ok: true,
          value: DOMPurify.sanitize(logoSvg.value, {
            USE_PROFILES: { svg: true, svgFilters: true },
            FORBID_TAGS: ["script"],
            FORBID_ATTR: ["onerror", "onload", "onclick"],
          }),
        }
      : logoSvg;

  const containerRadius = parsePositiveInt(
    cfgRaw["containerRadius"],
    "containerRadius",
    64,
  );
  if (!containerRadius.ok) return containerRadius;
  const buttonRadius = parsePositiveInt(
    cfgRaw["buttonRadius"],
    "buttonRadius",
    64,
  );
  if (!buttonRadius.ok) return buttonRadius;
  const motionDuration = parsePositiveInt(
    cfgRaw["motionDuration"],
    "motionDuration",
    2000,
  );
  if (!motionDuration.ok) return motionDuration;

  const fontFamily = parseFontFamily(cfgRaw["fontFamily"]);
  if (!fontFamily.ok) return fontFamily;

  const strings = parseStrings(cfgRaw["strings"] ?? {});
  if (!strings.ok) return strings;

  // Optional new cosmetic fields (backwards compatible: absent = default).
  const qrBackground =
    cfgRaw["qrBackground"] !== undefined
      ? parseHex(cfgRaw["qrBackground"], "qrBackground")
      : ({ ok: true, value: undefined } as ParseResult<string | undefined>);
  if (!qrBackground.ok) return qrBackground;

  const buttonTextColour =
    cfgRaw["buttonTextColour"] !== undefined
      ? parseHex(cfgRaw["buttonTextColour"], "buttonTextColour")
      : ({ ok: true, value: undefined } as ParseResult<string | undefined>);
  if (!buttonTextColour.ok) return buttonTextColour;

  const backdropOpacity =
    cfgRaw["backdropOpacity"] !== undefined
      ? parsePositiveInt(cfgRaw["backdropOpacity"], "backdropOpacity", 100)
      : ({ ok: true, value: undefined } as ParseResult<number | undefined>);
  if (!backdropOpacity.ok) return backdropOpacity;

  const gradientAngle =
    cfgRaw["gradientAngle"] !== undefined
      ? parsePositiveInt(cfgRaw["gradientAngle"], "gradientAngle", 360)
      : ({ ok: true, value: undefined } as ParseResult<number | undefined>);
  if (!gradientAngle.ok) return gradientAngle;

  // Preview layout override. Only "desktop", "mobile", and "auto" are valid.
  const previewLayoutRaw = cfgRaw["previewLayout"];
  let previewLayoutValue: "desktop" | "mobile" | "auto" | undefined;
  if (previewLayoutRaw !== undefined) {
    if (
      previewLayoutRaw !== "desktop" &&
      previewLayoutRaw !== "mobile" &&
      previewLayoutRaw !== "auto"
    ) {
      return {
        ok: false,
        reason: "previewLayout: expected 'desktop', 'mobile', or 'auto'",
      };
    }
    previewLayoutValue = previewLayoutRaw;
  }

  // QR foreground colour (optional hex).
  const qrForeground =
    cfgRaw["qrForeground"] !== undefined
      ? parseHex(cfgRaw["qrForeground"], "qrForeground")
      : ({ ok: true, value: undefined } as ParseResult<string | undefined>);
  if (!qrForeground.ok) return qrForeground;

  // QR dot style enum.
  let qrDotStyleValue: QrDotStyle | undefined;
  if (cfgRaw["qrDotStyle"] !== undefined) {
    if (
      typeof cfgRaw["qrDotStyle"] !== "string" ||
      !QR_DOT_STYLES.has(cfgRaw["qrDotStyle"])
    ) {
      return { ok: false, reason: "qrDotStyle: invalid value" };
    }
    qrDotStyleValue = cfgRaw["qrDotStyle"] as QrDotStyle;
  }

  // QR eye frame style enum.
  let qrEyeFrameStyleValue: QrEyeFrameStyle | undefined;
  if (cfgRaw["qrEyeFrameStyle"] !== undefined) {
    if (
      typeof cfgRaw["qrEyeFrameStyle"] !== "string" ||
      !QR_EYE_FRAME_STYLES.has(cfgRaw["qrEyeFrameStyle"])
    ) {
      return { ok: false, reason: "qrEyeFrameStyle: invalid value" };
    }
    qrEyeFrameStyleValue = cfgRaw["qrEyeFrameStyle"] as QrEyeFrameStyle;
  }

  // QR eye dot style enum.
  let qrEyeDotStyleValue: QrEyeDotStyle | undefined;
  if (cfgRaw["qrEyeDotStyle"] !== undefined) {
    if (
      typeof cfgRaw["qrEyeDotStyle"] !== "string" ||
      !QR_EYE_DOT_STYLES.has(cfgRaw["qrEyeDotStyle"])
    ) {
      return { ok: false, reason: "qrEyeDotStyle: invalid value" };
    }
    qrEyeDotStyleValue = cfgRaw["qrEyeDotStyle"] as QrEyeDotStyle;
  }

  // QR embedded logo URL (optional HTTPS).
  const qrLogoUrl = parseOptionalHttpsUrl(cfgRaw["qrLogoUrl"], "qrLogoUrl");
  if (!qrLogoUrl.ok) return qrLogoUrl;

  // Theme override: "light" | "dark" | "auto".
  const themeRaw = cfgRaw["theme"];
  let themeValue: "light" | "dark" | "auto" | undefined;
  if (themeRaw !== undefined) {
    if (themeRaw !== "light" && themeRaw !== "dark" && themeRaw !== "auto") {
      return {
        ok: false,
        reason: "theme: expected 'light', 'dark', or 'auto'",
      };
    }
    themeValue = themeRaw;
  }

  const config: AgegateConfigPayload = {
    brandColour: brand.value,
    accentGradient: [stop1.value, stop2.value, stop3.value],
    locale: locale.value,
    containerRadius: containerRadius.value,
    buttonRadius: buttonRadius.value,
    fontFamily: fontFamily.value,
    motionDuration: motionDuration.value,
    strings: strings.value,
    dir: dir.value,
    ...(logoUrl.value !== undefined ? { logoUrl: logoUrl.value } : {}),
    ...(sanitisedLogoSvg.value !== undefined
      ? { logoSvg: sanitisedLogoSvg.value }
      : {}),
    ...(privacyPolicyUrl.value !== undefined
      ? { privacyPolicyUrl: privacyPolicyUrl.value }
      : {}),
    ...(qrBackground.value !== undefined
      ? { qrBackground: qrBackground.value }
      : {}),
    ...(buttonTextColour.value !== undefined
      ? { buttonTextColour: buttonTextColour.value }
      : {}),
    ...(backdropOpacity.value !== undefined
      ? { backdropOpacity: backdropOpacity.value }
      : {}),
    ...(gradientAngle.value !== undefined
      ? { gradientAngle: gradientAngle.value }
      : {}),
    ...(previewLayoutValue !== undefined
      ? { previewLayout: previewLayoutValue }
      : {}),
    ...(qrForeground.value !== undefined
      ? { qrForeground: qrForeground.value }
      : {}),
    ...(qrDotStyleValue !== undefined ? { qrDotStyle: qrDotStyleValue } : {}),
    ...(qrEyeFrameStyleValue !== undefined
      ? { qrEyeFrameStyle: qrEyeFrameStyleValue }
      : {}),
    ...(qrEyeDotStyleValue !== undefined
      ? { qrEyeDotStyle: qrEyeDotStyleValue }
      : {}),
    ...(qrLogoUrl.value !== undefined ? { qrLogoUrl: qrLogoUrl.value } : {}),
    ...(themeValue !== undefined ? { theme: themeValue } : {}),
  };

  return {
    ok: true,
    value: {
      type: AGEGATE_CONFIG_MESSAGE_TYPE,
      version: AGEGATE_CONFIG_MESSAGE_VERSION,
      config,
    },
  };
}

/**
 * Build a config message from a trusted caller-supplied payload. The
 * returned object still needs to pass parseConfigMessage on the
 * receiving end; build-time validation catches drift before the
 * message leaves the styler.
 */
export function buildConfigMessage(
  config: AgegateConfigPayload,
): AgegateConfigMessage {
  return {
    type: AGEGATE_CONFIG_MESSAGE_TYPE,
    version: AGEGATE_CONFIG_MESSAGE_VERSION,
    config,
  };
}
