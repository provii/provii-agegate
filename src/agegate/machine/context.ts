// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Per-instance machine context: the single mutable module-level state for the
 * AgeGate XState machine, plus the helpers that read, reset, and attach
 * listeners against it.
 *
 * This module is the sole home of the `machineCtx` singleton. Sibling machine
 * modules import the helpers here (and `cleanupStyledQR`/`clearShadowContent`)
 * rather than touching the singleton object directly where possible.
 *
 * @module machine/context
 */

import { StyledQR } from "../../ui/StyledQR.js";
import { WebSocketManager } from "../WebSocketManager.js";
import { type ChallengeUIResult } from "../../ui/challenge-ui.js";

/**
 * Per-instance machine context. Groups all mutable module-level state so that
 * each AgeGate instance starts with a clean slate and no stale references
 * leak across instances.
 */
export interface MachineContext {
  styledQRInstance: StyledQR | null;
  wsManager: WebSocketManager | null;
  wsFailed: boolean;
  /** True when the WS was successfully connected before it died (e.g. tab backgrounded). */
  wsWasConnected: boolean;
  wsPromise: Promise<unknown> | null;
  visibilityCleanup: (() => void) | null;
  /** Cleanup for the mobile visibility-change business-logic handler */
  mobileVisibilityCleanup: (() => void) | null;
  /** Shared challenge UI result for cleanup */
  challengeUI: ChallengeUIResult | null;
}

export let machineCtx: MachineContext = {
  styledQRInstance: null,
  wsManager: null,
  wsFailed: false,
  wsWasConnected: false,
  wsPromise: null,
  visibilityCleanup: null,
  mobileVisibilityCleanup: null,
  challengeUI: null,
};

/**
 * Reset mutable machine state for a new AgeGate instance.
 *
 * Called at the start of each new AgeGate constructor to prevent stale
 * WebSocket connections, QR instances, or event listeners from a previous
 * instance leaking into the new one.
 */
export function resetMachineContext(): void {
  // Tear down any surviving WebSocket
  if (machineCtx.wsManager) {
    machineCtx.wsManager.close();
  }

  // Tear down any surviving styled QR
  if (machineCtx.styledQRInstance) {
    machineCtx.styledQRInstance.destroy();
  }

  // Remove the visibility listener from the previous instance
  if (machineCtx.visibilityCleanup) {
    machineCtx.visibilityCleanup();
  }

  // Remove the mobile business-logic visibility handler
  if (machineCtx.mobileVisibilityCleanup) {
    machineCtx.mobileVisibilityCleanup();
  }

  // Clean up the shared challenge UI
  if (machineCtx.challengeUI) {
    machineCtx.challengeUI.destroy();
  }

  machineCtx = {
    styledQRInstance: null,
    wsManager: null,
    wsFailed: false,
    wsWasConnected: false,
    wsPromise: null,
    visibilityCleanup: null,
    mobileVisibilityCleanup: null,
    challengeUI: null,
  };
}

/**
 * Attach a visibilitychange listener that detects iOS Safari closing the
 * WebSocket while the tab is backgrounded. Returns a cleanup function that
 * removes the listener.
 */
export function attachVisibilityFallback(): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  const handler = () => {
    if (
      document.visibilityState === "visible" &&
      machineCtx.wsManager &&
      !machineCtx.wsManager.isConnected
    ) {
      machineCtx.wsFailed = true;
      machineCtx.wsWasConnected = true;
      machineCtx.wsManager.close();
      machineCtx.wsManager = null;
      machineCtx.wsPromise = null;
    }
  };

  document.addEventListener("visibilitychange", handler);

  const cleanup = () => {
    document.removeEventListener("visibilitychange", handler);
  };

  machineCtx.visibilityCleanup = cleanup;
  return cleanup;
}

/** Whether the WebSocket was connected then lost (e.g. tab backgrounded). */
export function wasWsConnected(): boolean {
  return machineCtx.wsWasConnected;
}

/**
 * Remove all child nodes from a shadow root except <style> elements.
 *
 * Theme and component styles injected via `injectStyles()` are preserved
 * so they do not need to be re-injected on every re-render.
 */
export function clearShadowContent(shadowRoot: ShadowRoot): void {
  const childNodes = Array.from(shadowRoot.childNodes);
  for (const node of childNodes) {
    if (node instanceof HTMLStyleElement) continue;
    shadowRoot.removeChild(node);
  }
}

export function cleanupStyledQR(): void {
  if (machineCtx.styledQRInstance) {
    machineCtx.styledQRInstance.destroy();
    machineCtx.styledQRInstance = null;
  }
}
