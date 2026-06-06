// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Provii AgeGate preview bridge.
 *
 * Runs inside the preview iframe hosted by the provii-docs styler
 * widget. Listens for typed `agegate-config` messages from the parent
 * frame, validates every field with the shared hand-rolled schema,
 * and applies structural updates via `AgeGate.update(...)` or
 * cosmetic updates by writing CSS custom properties on the host
 * document's root. Respects `prefers-reduced-motion` by short-
 * circuiting the motion-duration variable to 0.
 *
 * The origin allowlist is supplied at installation time. When the
 * iframe is loaded with `sandbox="allow-scripts"` (no allow-same-
 * origin), its origin is the opaque "null" string and no stored
 * allowlist alone can substitute for the browser's sandbox rules.
 * The bridge therefore accepts either:
 *   - an exact-match origin in the allowlist, or
 *   - a caller-supplied "trust parent frame" flag that only the
 *     styler hands to the preview bundle via a meta tag.
 *
 * The bridge never reads cookies or storage; structural updates are
 * mediated through the AgeGate public API exclusively.
 */

import type { AgeGate } from "../agegate/AgeGate.js";
import {
  parseConfigMessage,
  type AgegateConfigPayload,
} from "./bridge-schema.js";

/** Minimal structural surface the bridge needs from an AgeGate instance. */
export interface PreviewBridgeTarget {
  update(partial: Partial<AgegateConfigPayload>): void;
}

export interface PreviewBridgeOptions {
  readonly allowedOrigins: readonly string[];
  readonly target?: PreviewBridgeTarget | AgeGate | null;
  readonly root?: HTMLElement | null;
  readonly documentOverride?: Document | null;
  readonly windowOverride?: Window | null;
}

type StructuralKey =
  | "logoUrl"
  | "logoSvg"
  | "locale"
  | "privacyPolicyUrl"
  | "strings"
  | "previewLayout"
  | "qrDotStyle"
  | "qrEyeFrameStyle"
  | "qrEyeDotStyle"
  | "qrLogoUrl"
  | "qrForeground"
  | "qrBackground"
  // accentGradient is cosmetic for the header/body (applied as a CSS var)
  // but STRUCTURAL for the QR canvas, which reads its stops at construction
  // and must be torn down and rebuilt to recolour. motionDuration is a CSS
  // var too, but the .container entrance animation only reads it on (re)mount,
  // so a change must re-trigger that animation to be observable.
  | "accentGradient"
  | "motionDuration";

/**
 * Keys that require a full AgeGate re-render. Cosmetic keys flow as
 * CSS variables on `root` so the preview updates without tearing down
 * the widget on every keystroke.
 */
const STRUCTURAL_KEYS: ReadonlySet<StructuralKey> = new Set<StructuralKey>([
  "logoUrl",
  "logoSvg",
  "locale",
  "privacyPolicyUrl",
  "strings",
  "previewLayout",
  "qrDotStyle",
  "qrEyeFrameStyle",
  "qrEyeDotStyle",
  "qrLogoUrl",
  "qrForeground",
  "qrBackground",
  "accentGradient",
  "motionDuration",
]);

interface InternalState {
  readonly options: PreviewBridgeOptions;
  handler: ((event: MessageEvent) => void) | null;
  lastConfig: AgegateConfigPayload | null;
}

/**
 * Install the message listener. Returns a disposer that detaches the
 * listener and clears state.
 */
export function installPreviewBridge(
  options: PreviewBridgeOptions,
): () => void {
  const windowRef = options.windowOverride ?? window;
  const documentRef = options.documentOverride ?? document;

  const state: InternalState = {
    options,
    handler: null,
    lastConfig: null,
  };

  const handler = (event: MessageEvent): void => {
    if (!isAllowedOrigin(event.origin, options.allowedOrigins)) {
      return;
    }
    const parsed = parseConfigMessage(event.data);
    if (!parsed.ok) {
      // Validation failure: warn so integrators see schema drift in
      // the browser console without needing debug-level filtering.
      console.warn("[agegate-preview-bridge] rejected message", parsed.reason);
      return;
    }
    const config = parsed.value.config;
    applyConfig(config, state, windowRef, documentRef);
    state.lastConfig = config;
  };

  state.handler = handler;
  windowRef.addEventListener("message", handler);

  return () => {
    if (state.handler) {
      windowRef.removeEventListener("message", state.handler);
      state.handler = null;
    }
  };
}

/**
 * Exact-match origin check. `null` (opaque origin) must be opted into
 * explicitly by the caller via a literal "null" entry in the
 * allowlist. Trailing slashes are stripped so callers can supply
 * either `"https://example.com"` or `"https://example.com/"`.
 *
 * Wildcard entries in the allowlist are skipped rather than treated as
 * a pass-all shortcut. The allowlist is populated by parsePreviewOriginAttr
 * which already rejects wildcards at parse time; this guard ensures that
 * any wildcard somehow injected at runtime is also inert.
 */
function isAllowedOrigin(origin: string, allowed: readonly string[]): boolean {
  if (!origin) return false;
  const normalised = origin.replace(/\/+$/, "");
  for (const candidate of allowed) {
    if (candidate === "*") continue;
    if (candidate.replace(/\/+$/, "") === normalised) return true;
  }
  return false;
}

function applyConfig(
  config: AgegateConfigPayload,
  state: InternalState,
  windowRef: Window,
  documentRef: Document,
): void {
  const structuralChanged = state.lastConfig
    ? anyStructuralChange(config, state.lastConfig)
    : true;

  // Cosmetic updates route through CSS variables every time; they are
  // cheap and the preview honours them regardless of whether a full
  // AgeGate.update is also dispatched.
  const host = state.options.root ?? documentRef.documentElement;
  applyCssVars(config, host, windowRef);

  // Theme override: map the styler's Light/Dark surface radios to the
  // `data-agegate-theme` attribute the SDK's :host CSS watches. "auto"
  // or absent removes the attribute so the browser's
  // `prefers-color-scheme` media query drives the fallback path.
  if (config.theme === "light" || config.theme === "dark") {
    host.setAttribute("data-agegate-theme", config.theme);
  } else {
    host.removeAttribute("data-agegate-theme");
  }

  if (structuralChanged && state.options.target) {
    const updatePayload: Partial<AgegateConfigPayload> = {
      locale: config.locale,
      strings: config.strings,
      // Forwarded so the target can recolour the QR canvas (accentGradient)
      // and replay the entrance animation (motionDuration); both are also
      // applied as CSS vars above for the header/body and reduced-motion path.
      accentGradient: config.accentGradient,
      motionDuration: config.motionDuration,
      ...(config.logoUrl !== undefined ? { logoUrl: config.logoUrl } : {}),
      ...(config.logoSvg !== undefined ? { logoSvg: config.logoSvg } : {}),
      ...(config.privacyPolicyUrl !== undefined
        ? { privacyPolicyUrl: config.privacyPolicyUrl }
        : {}),
      ...(config.previewLayout !== undefined
        ? { previewLayout: config.previewLayout }
        : {}),
      ...(config.qrDotStyle !== undefined
        ? { qrDotStyle: config.qrDotStyle }
        : {}),
      ...(config.qrEyeFrameStyle !== undefined
        ? { qrEyeFrameStyle: config.qrEyeFrameStyle }
        : {}),
      ...(config.qrEyeDotStyle !== undefined
        ? { qrEyeDotStyle: config.qrEyeDotStyle }
        : {}),
      ...(config.qrLogoUrl !== undefined
        ? { qrLogoUrl: config.qrLogoUrl }
        : {}),
      ...(config.qrForeground !== undefined
        ? { qrForeground: config.qrForeground }
        : {}),
      ...(config.qrBackground !== undefined
        ? { qrBackground: config.qrBackground }
        : {}),
    };
    try {
      (state.options.target as PreviewBridgeTarget).update(updatePayload);
    } catch (error) {
      console.warn("[agegate-preview-bridge] target.update() threw", error);
    }
  }

  documentRef.documentElement.setAttribute("dir", config.dir);
  documentRef.documentElement.setAttribute("lang", config.locale);
}

function anyStructuralChange(
  next: AgegateConfigPayload,
  previous: AgegateConfigPayload,
): boolean {
  for (const key of STRUCTURAL_KEYS) {
    if (key === "strings") {
      if (!shallowEqualStrings(next.strings, previous.strings)) return true;
    } else if (key === "accentGradient") {
      // accentGradient is a fresh array on every parsed message, so a
      // reference (`!==`) check would flag every cosmetic keystroke as
      // structural and rebuild the QR each time. Compare by value instead.
      if (!equalGradient(next.accentGradient, previous.accentGradient)) {
        return true;
      }
    } else if (next[key] !== previous[key]) {
      return true;
    }
  }
  return false;
}

function equalGradient(
  a: readonly [string, string, string],
  b: readonly [string, string, string],
): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function shallowEqualStrings(
  a: Readonly<Record<string, string>>,
  b: Readonly<Record<string, string>>,
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function applyCssVars(
  config: AgegateConfigPayload,
  host: HTMLElement,
  windowRef: Window,
): void {
  const prefersReducedMotion = (() => {
    try {
      return (
        windowRef.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
        false
      );
    } catch {
      return false;
    }
  })();

  const style = host.style;

  // Brand colour maps to --ag-accent-start, the token the theme uses for
  // CTA borders, text accents, footer links, focus outlines, spinners,
  // retry buttons, badge text, and short code colour.
  style.setProperty("--ag-accent-start", config.brandColour);

  // Accent gradient: composite string consumed by .header and body
  // background, plus individual stops for --ag-accent-mid and
  // --ag-accent-end (footer link hover, dark-mode variants).
  const gradientAngle = config.gradientAngle ?? 135;
  style.setProperty(
    "--ag-accent-gradient",
    `linear-gradient(${String(gradientAngle)}deg, ${config.accentGradient[0]} 0%, ${config.accentGradient[1]} 50%, ${config.accentGradient[2]} 100%)`,
  );
  style.setProperty("--ag-accent-mid", config.accentGradient[1]);
  style.setProperty("--ag-accent-end", config.accentGradient[2]);

  style.setProperty("--ag-radius-container", `${config.containerRadius}px`);
  style.setProperty("--ag-radius-button", `${config.buttonRadius}px`);
  style.setProperty("--ag-font-family", config.fontFamily);
  const effectiveDuration = prefersReducedMotion ? 0 : config.motionDuration;
  style.setProperty("--ag-motion-duration", `${String(effectiveDuration)}ms`);

  // New cosmetic controls: QR colours, button text, backdrop opacity.
  if (config.qrForeground !== undefined) {
    style.setProperty("--ag-qr-fg", config.qrForeground);
  }
  if (config.qrBackground !== undefined) {
    style.setProperty("--ag-qr-bg", config.qrBackground);
  }
  if (config.buttonTextColour !== undefined) {
    style.setProperty("--ag-button-text", config.buttonTextColour);
  }
  if (config.backdropOpacity !== undefined) {
    const alpha = (config.backdropOpacity / 100).toFixed(2);
    style.setProperty("--ag-overlay-backdrop", `rgba(0, 0, 0, ${alpha})`);
  }
}

export type { AgegateConfigPayload } from "./bridge-schema.js";
