// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Accent-gradient and cosmetic CSS-variable helpers for auto-block mode.
 *
 * Extracted as free functions (taking the AutoBlockConfig they need) from the
 * AutoBlockMode class so the gradient resolution and the styler-knob CSS-var
 * application can be reused and tested in isolation.
 *
 * @module modes/autoload/gradient
 */

import { isValidHexColour } from "../config-parser.js";
import type { AutoBlockConfig } from "../../core/types.js";

/**
 * Resolve an optional caller-supplied accent gradient into a CSS value
 * suitable for `--ag-accent-gradient`. Returns null when no override
 * is configured. Hex tuples are rejected with a warning (not thrown)
 * so a typo in the script tag does not break verification.
 */
export function resolveAccentGradientCss(config: AutoBlockConfig): string | null {
  const override = config.accentGradient;
  if (!override) return null;
  if (typeof override === "string") return override;
  if (!Array.isArray(override) || override.length !== 3) {
    console.warn(
      "[Provii Age Gate] accentGradient array must be [start, mid, end]; ignoring.",
    );
    return null;
  }
  const [start, mid, end] = override;
  if (
    !isValidHexColour(start) ||
    !isValidHexColour(mid) ||
    !isValidHexColour(end)
  ) {
    console.warn(
      "[Provii Age Gate] accentGradient entries must be #rrggbb or #rgb hex colours; ignoring.",
    );
    return null;
  }
  return `linear-gradient(135deg, ${start} 0%, ${mid} 50%, ${end} 100%)`;
}

/**
 * If accentGradient is configured as a tuple, expose it to the StyledQR
 * renderer which takes hex strings rather than a CSS gradient value.
 */
export function resolveAccentGradientStops(
  config: AutoBlockConfig,
): readonly [string, string, string] | null {
  const override = config.accentGradient;
  if (!Array.isArray(override) || override.length !== 3) return null;
  if (
    !isValidHexColour(override[0]) ||
    !isValidHexColour(override[1]) ||
    !isValidHexColour(override[2])
  ) {
    return null;
  }
  return override as readonly [string, string, string];
}

/**
 * Apply the cosmetic styler knobs as CSS custom properties on the
 * shadow host. Mirrors `applyCssVars` in modes/preview-bridge.ts so a
 * snippet pasted into a real site renders the same as the styler
 * preview. Each property is only set when the corresponding config
 * option is present so the theme defaults remain intact when the
 * caller has nothing to override.
 *
 * `gradientAngle` rebuilds the `--ag-accent-gradient` custom property
 * because the angle is a structural part of the gradient definition,
 * not a separate variable. The accent stops come from
 * `accentGradient` (validated tuple) when present, otherwise from the
 * resolved-by-`createOverlay` value already on the shadow host.
 *
 * `theme` maps to `data-agegate-theme` on the shadow host, mirroring
 * the preview bridge's same approach. The SDK's :host CSS reads that
 * attribute to force the light/dark palette regardless of the user's
 * `prefers-color-scheme`.
 */
export function applyCosmeticCssVars(
  shadowHost: HTMLElement,
  config: AutoBlockConfig,
): void {
  const style = shadowHost.style;
  const cfg = config;

  if (cfg.containerRadius !== undefined) {
    style.setProperty(
      "--ag-radius-container",
      `${String(cfg.containerRadius)}px`,
    );
  }
  if (cfg.buttonRadius !== undefined) {
    style.setProperty("--ag-radius-button", `${String(cfg.buttonRadius)}px`);
  }
  if (cfg.fontFamily !== undefined) {
    style.setProperty("--ag-font-family", cfg.fontFamily);
  }
  if (cfg.motionDuration !== undefined) {
    // Honour prefers-reduced-motion at apply-time, same as the bridge.
    let effective = cfg.motionDuration;
    try {
      if (
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        effective = 0;
      }
    } catch {
      // Some test runners don't implement matchMedia; ignore and use the
      // configured value verbatim.
    }
    style.setProperty("--ag-motion-duration", `${String(effective)}ms`);
  }
  if (cfg.backdropOpacity !== undefined) {
    const alpha = (cfg.backdropOpacity / 100).toFixed(2);
    style.setProperty("--ag-overlay-backdrop", `rgba(0, 0, 0, ${alpha})`);
  }
  if (cfg.qrForeground !== undefined) {
    style.setProperty("--ag-qr-fg", cfg.qrForeground);
  }
  if (cfg.qrBackground !== undefined) {
    style.setProperty("--ag-qr-bg", cfg.qrBackground);
  }
  if (cfg.buttonTextColour !== undefined) {
    style.setProperty("--ag-button-text", cfg.buttonTextColour);
  }
  if (cfg.gradientAngle !== undefined) {
    const stops = resolveAccentGradientStops(config);
    if (stops) {
      style.setProperty(
        "--ag-accent-gradient",
        `linear-gradient(${String(cfg.gradientAngle)}deg, ${stops[0]} 0%, ${stops[1]} 50%, ${stops[2]} 100%)`,
      );
    }
  }
  if (cfg.theme === "light" || cfg.theme === "dark") {
    shadowHost.setAttribute("data-agegate-theme", cfg.theme);
  }
}
