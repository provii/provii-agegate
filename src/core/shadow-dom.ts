// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Shadow DOM utilities for encapsulating age gate UI.
 *
 * Uses closed shadow roots so the internal DOM is invisible to the host
 * page. A WeakMap tracks shadow roots since `element.shadowRoot` returns
 * null for closed mode.
 */

import { DEFAULT_THEME_CSS } from "../styles/theme.js";

/** WeakMap to track closed shadow roots (element.shadowRoot returns null for closed) */
const shadowRoots = new WeakMap<HTMLElement, ShadowRoot>();

/**
 * Get or create a closed shadow root on the given element.
 * If one already exists (tracked via WeakMap), return it.
 *
 * Sets `data-agegate-mount=""` on the host the first time a shadow is
 * attached. Closed shadow roots are invisible to standard query
 * selectors (host.shadowRoot returns null), so this attribute is the
 * one observable signal a test or integrator can use to confirm the
 * SDK actually attached its UI to the mount element. Integrators
 * relying on the marker should treat it as informational only; the
 * shadow content itself stays encapsulated.
 */
export function getOrCreateShadowRoot(
  host: HTMLElement,
  cspNonce?: string,
): ShadowRoot {
  const existing = shadowRoots.get(host);
  if (existing) return existing;

  const shadow = host.attachShadow({ mode: "closed" });
  shadowRoots.set(host, shadow);

  // Light-DOM marker so closed-shadow rendering is observable from the
  // host page. Empty value is enough; the existence of the attribute is
  // what tests and integrators key off.
  host.setAttribute("data-agegate-mount", "");

  // Inject the default theme
  injectStyles(shadow, DEFAULT_THEME_CSS, cspNonce);

  return shadow;
}

/**
 * Inject CSS text into a shadow root as a <style> element.
 */
export function injectStyles(
  shadowRoot: ShadowRoot,
  cssText: string,
  cspNonce?: string,
): HTMLStyleElement {
  const style = document.createElement("style");
  if (cspNonce) {
    style.setAttribute("nonce", cspNonce);
  }
  style.textContent = cssText;
  shadowRoot.appendChild(style);
  return style;
}

/**
 * Get the shadow root for an element, or null if none exists.
 */
export function getShadowRoot(host: HTMLElement): ShadowRoot | null {
  return shadowRoots.get(host) ?? null;
}
