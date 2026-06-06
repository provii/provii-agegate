// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Lightweight user-agent detection helpers.
 *
 * Zero dependencies. Used to choose between QR code display and deep-link
 * behaviour in the verification overlay.
 *
 * @module utils/device
 */

/**
 * Returns `true` when the current user-agent indicates a mobile device
 * (iPhone, iPad, Android, or generic iOS).
 *
 * Returns `false` in environments where `navigator` is not available
 * (SSR, Web Workers, Cloudflare Workers).
 */
export const isMobile = (): boolean =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|android|ios/i.test(navigator.userAgent);
