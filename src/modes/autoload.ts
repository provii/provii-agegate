// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Auto-block integration mode.
 *
 * Main entry point for auto-block mode. Orchestrates the complete age
 * verification flow with minimal configuration: parse config from a script
 * tag's data attributes, check for an existing session, block the page with
 * an accessible overlay if needed, poll for wallet verification, redeem with
 * PKCE, and emit lifecycle events.
 *
 * The AutoBlockMode class now lives in ./autoload/AutoBlockMode.ts and is
 * re-exported here. This module keeps the self-executing IIFE + initAutoBlock
 * entry so importing it still auto-initialises the overlay (the side-effect
 * pinned in package.json `sideEffects`).
 *
 * @module modes/autoload
 */

import { parseConfig, findScriptTag, ConfigError } from "./config-parser.js";
import { AutoBlockMode } from "./autoload/AutoBlockMode.js";

export { AutoBlockMode } from "./autoload/AutoBlockMode.js";

/**
 * Auto-initialise when the script tag loads.
 *
 * SECURITY (H-23): Singleton guard prevents duplicate initialisation when the
 * script is included more than once (e.g. SPA hot-reload, duplicate tags).
 * Without this, each extra inclusion would create another overlay, polling
 * loop, and challenge, wasting server-side rate limit quota.
 */
(async () => {
  // Only run in browser
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  // SECURITY (H-23): Prevent double-initialisation
  const windowRecord = window as unknown as Record<string, unknown>;
  if (windowRecord["__proviiAutoBlockInitialised"]) {
    return;
  }
  windowRecord["__proviiAutoBlockInitialised"] = true;

  // Wait for DOM to be ready.
  // Use { once: true } so the listener auto-removes after firing.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAutoBlock, {
      once: true,
    });
  } else {
    await initAutoBlock();
  }
})();

/**
 * Initialise auto-block mode from script tag data attributes.
 */
async function initAutoBlock(): Promise<void> {
  try {
    // Find script tag
    const scriptTag = findScriptTag();
    if (!scriptTag) {
      console.warn(
        "[Provii Age Gate] Script tag not found. Auto-block mode not initialised.",
      );
      return;
    }

    // Parse config
    const config = parseConfig(scriptTag);

    // Create and initialise auto-block mode
    const autoBlock = new AutoBlockMode(config);
    await autoBlock.initialise();

    // Expose to window for manual control if needed
    (window as unknown as { ProviiAgeGate: AutoBlockMode }).ProviiAgeGate =
      autoBlock;
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error("[Provii Age Gate] Configuration error:", error.message);
    } else {
      console.error("[Provii Age Gate] Initialisation failed");
    }
  }
}
