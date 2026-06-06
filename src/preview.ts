// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Preview-only entry point for the provii-agegate SDK.
 *
 * Exports the preview bridge used by the provii-docs styler widget in
 * ESM mode. Separated from the main index to keep `installPreviewBridge`
 * out of the CDN IIFE bundle (esbuild tree-shakes this away when the
 * subpath is not imported).
 *
 * @module preview
 */

export {
  installPreviewBridge,
  type PreviewBridgeOptions,
  type PreviewBridgeTarget,
} from "./modes/preview-bridge.js";
