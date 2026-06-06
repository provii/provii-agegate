// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Public entry point for the AgeGate verification flow.
 *
 * Wraps the XState machine in a developer-friendly class with:
 * - Idempotent initialisation with parallel session check and challenge creation
 * - Automatic cleanup on page unload, navigation, and background timeouts
 * - State subscription for external UI integration
 * - Retry prompt rendering with accessible focus management
 *
 * // SECURITY: Session check uses credentials: 'include' to send HttpOnly
 * // cookies automatically. The server validates the cookie, not the client.
 *
 * @module AgeGate
 */
import { createActor } from "xstate";
import { fromPromise } from "xstate/actors";

import type { ActorRefFrom, SnapshotFrom } from "xstate";
import type { GateContext, GateEvent } from "./AgeGateMachine.js";

import { AgeGateConfig } from "./AgeGateConfig.js";
import { AgeGateMachine, isValidTransition } from "./AgeGateMachine.js";
import {
  machineServices,
  machineActions,
  resetMachineContext,
  attachVisibilityFallback,
} from "./machineServices.js";
import { fetchWithTimeout, safeReadJson } from "../utils/fetchWithTimeout.js";
import { getOrCreateShadowRoot, injectStyles } from "../core/shadow-dom.js";
import {
  resolveFailureMode,
  readCachedFailureMode,
} from "../core/failure-mode.js";
import type { SessionCheckResponse } from "../core/types.js";
import { t, getLocale, isRTL } from "../i18n/index.js";

/**
 * Narrow an unknown API response into a SessionCheckResponse.
 *
 * Only the `verified` boolean is required. Optional fields (`session`,
 * etc.) are not checked here because the caller only reads `verified`.
 */
function isSessionCheckResponse(data: unknown): data is SessionCheckResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "verified" in data &&
    typeof (data as Record<string, unknown>)["verified"] === "boolean"
  );
}

// Environment-specific API base URLs for session check
const ENVIRONMENT_API_BASES: Record<"production" | "sandbox", string> = {
  production: "https://hosted.provii.app/v1/hosted",
  sandbox: "https://sandbox-hosted.provii.app/v1/hosted",
};

type MachineActor = ActorRefFrom<typeof AgeGateMachine>;
type MachineSnapshot = SnapshotFrom<typeof AgeGateMachine>;
type RedirectFn = (url: string) => void;

/* Promote the async helpers to real X-State actors */
const actors = {
  fetchChallenge: fromPromise(
    async ({ input }: { input: { context: GateContext } }) => {
      return machineServices.fetchChallenge(input.context);
    },
  ),

  pollStatus: fromPromise(
    async ({ input }: { input: { context: GateContext } }) => {
      return machineServices.pollStatus(input.context);
    },
  ),
} as const;

/* ------------------------------------------------------------------ */

/**
 * Primary SDK class for browser-based age verification.
 *
 * Manages the full lifecycle: session check, challenge creation, QR/deep-link
 * rendering, adaptive status polling, PKCE redemption, and redirect on success.
 * Automatically cleans up event listeners and timers on disposal.
 */
export class AgeGate {
  private readonly cfg: AgeGateConfig;
  private readonly redirectFn: RedirectFn;
  private readonly actor: MachineActor;
  private initPromise?: Promise<void>;
  private disposed = false;
  private cleanupCallbacks: Array<() => void> = [];
  private visibilityTimeout?: ReturnType<typeof setTimeout>;
  private darkModeQuery?: MediaQueryList;

  constructor(
    options: AgeGateConfig | ConstructorParameters<typeof AgeGateConfig>[0],
    redirect: RedirectFn = (url) => {
      if (typeof window !== "undefined") window.location.href = url;
    },
  ) {
    this.cfg =
      options instanceof AgeGateConfig ? options : new AgeGateConfig(options);
    this.redirectFn = redirect;

    // INIT-094: Reset mutable module-level singletons so no stale WS
    // connections or QR instances leak from a previous AgeGate instance.
    resetMachineContext();

    // INIT-093: Attach the per-instance visibilitychange listener that
    // detects iOS Safari closing the WebSocket while backgrounded.
    // The returned cleanup function is stored for disposal.
    const visibilityCleanup = attachVisibilityFallback();
    this.cleanupCallbacks.push(visibilityCleanup);

    const machine = AgeGateMachine.provide({
      actors,
      actions: {
        ...machineActions,
        redirect: ({ context }) => {
          if (context.cfg) {
            this.redirectFn(context.cfg.contentUrl);
          } else {
            console.error("[AgeGate] redirect called without cfg");
          }
        },

        // New actions for user feedback
        notifyTimeout: ({ context }) => {
          // If this timeout was an availability failure (Provii unreachable),
          // apply the integrator's onUnavailable policy first. allow/defer
          // may take over; otherwise fall through to the blocking prompt.
          if (this.applyUnavailablePolicy(context, "verifier_unreachable")) {
            return;
          }
          this.showRetryPrompt(
            context.userMessage ||
              "Your verification session expired after 5 minutes. Your previous session has been discarded. Please refresh the page to start a new verification.",
            "timeout",
          );
        },

        notifyFailure: ({ context }) => {
          if (this.applyUnavailablePolicy(context, "challenge_create_failed")) {
            return;
          }
          this.showRetryPrompt(
            context.userMessage ||
              "Verification could not be completed. Please ensure you have Provii Wallet installed and open, then refresh this page to try again. If the problem continues, visit provii.app/help for assistance.",
            "error",
          );
        },
      },
    });

    this.actor = createActor(machine).start();

    // Reflect state-machine transitions to data-agegate-state on the
    // mount element so host pages and tests have a light-DOM signal for
    // every state change. The closed shadow root hides the rendered
    // alert/error text from the host page, so this mirror is the only
    // way external observers can wait for "expired" / "failed" / etc.
    // without piercing the shadow.
    const stateSub = this.actor.subscribe((snap: MachineSnapshot) => {
      if (typeof document === "undefined") return;
      const mount = document.getElementById(this.cfg.mountElementId);
      if (!mount) return;
      const stateValue =
        typeof snap.value === "string"
          ? snap.value
          : Object.keys(snap.value as Record<string, unknown>)[0];
      if (stateValue) {
        mount.setAttribute("data-agegate-state", stateValue);
      }
    });
    this.cleanupCallbacks.push(() => stateSub.unsubscribe());

    // Apply colour theme to the mount element
    this.applyTheme();

    // Auto-cleanup on page unload
    this.setupAutoCleanup();
  }

  /**
   * Send an event to the machine only if the current state
   * accepts that event type. Logs a warning and drops the event when
   * the transition is invalid, making programming errors visible
   * instead of silently discarded by XState v5.
   *
   * Falls through to a direct send if the actor snapshot cannot be
   * read (e.g. actor not yet started).
   */
  private guardedSend(event: GateEvent): void {
    try {
      const currentState = this.getState();
      if (!isValidTransition(currentState, event.type)) {
        console.warn(
          `[AgeGate] Rejected invalid transition: event "${event.type}" is not accepted in state "${currentState}"`,
        );
        return;
      }
    } catch {
      // Actor snapshot not available yet (early init or mocked).
      // Fall through to the send; XState will drop it if unhandled.
    }
    this.actor.send(event);
  }

  /**
   * Apply the configured colour theme to the mount element.
   *
   * For 'light' or 'dark', sets the data-agegate-theme attribute directly.
   * For 'auto', detects the system preference via matchMedia and listens
   * for changes so the theme updates if the user toggles dark mode.
   */
  private applyTheme(): void {
    if (typeof document === "undefined") return;

    const mount = document.getElementById(this.cfg.mountElementId);
    if (!mount) return;

    const theme = this.cfg.theme;

    if (theme === "light" || theme === "dark") {
      mount.setAttribute("data-agegate-theme", theme);
      return;
    }

    // Auto mode: detect system preference and listen for changes
    if (typeof window !== "undefined" && window.matchMedia) {
      this.darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");

      const applySystemTheme = (isDark: boolean) => {
        if (mount) {
          mount.setAttribute("data-agegate-theme", isDark ? "dark" : "light");
        }
      };

      // Set initial value
      applySystemTheme(this.darkModeQuery.matches);

      // Listen for system preference changes
      const handler = (event: MediaQueryListEvent) => {
        applySystemTheme(event.matches);
      };

      this.darkModeQuery.addEventListener("change", handler);
      this.cleanupCallbacks.push(() => {
        this.darkModeQuery?.removeEventListener("change", handler);
      });
    }
  }

  /**
   * Setup automatic cleanup to prevent memory leaks.
   *
   * All addEventListener calls are guarded against non-browser environments
   * (SSR, Web Workers, Cloudflare Workers) where window or document may not
   * exist.
   */
  private setupAutoCleanup(): void {
    if (typeof window !== "undefined") {
      // Cleanup on page unload
      const unloadHandler = () => {
        this.dispose();
      };

      window.addEventListener("beforeunload", unloadHandler);
      window.addEventListener("pagehide", unloadHandler);

      this.cleanupCallbacks.push(() => {
        window.removeEventListener("beforeunload", unloadHandler);
        window.removeEventListener("pagehide", unloadHandler);
      });

      // Cleanup on navigation (for SPAs using the Navigation API)
      const windowWithNav = window as unknown as { navigation?: EventTarget };
      if (windowWithNav.navigation) {
        const navHandler = () => {
          this.dispose();
        };

        try {
          windowWithNav.navigation.addEventListener("navigate", navHandler);
          this.cleanupCallbacks.push(() => {
            try {
              windowWithNav.navigation?.removeEventListener(
                "navigate",
                navHandler,
              );
            } catch {
              // Ignore removal errors
            }
          });
        } catch {
          // Navigation API might not be fully supported
        }
      }

      // Cleanup on history navigation (back/forward)
      const popstateHandler = () => {
        this.dispose();
      };

      window.addEventListener("popstate", popstateHandler);
      this.cleanupCallbacks.push(() => {
        window.removeEventListener("popstate", popstateHandler);
      });
    }

    if (typeof document !== "undefined") {
      // Cleanup on visibility change (mobile backgrounding)
      let hiddenTime = 0;
      const visibilityHandler = () => {
        if (document.hidden) {
          hiddenTime = Date.now();

          // Set a timeout to dispose after 5 minutes in background
          this.visibilityTimeout = setTimeout(
            () => {
              this.showRetryPrompt(
                "Your verification session expired because this page was in the background for more than 5 minutes. Any verification in progress has been lost. Please refresh the page to start a new verification.",
                "timeout",
              );
              this.dispose();
            },
            5 * 60 * 1000,
          );
        } else {
          // Clear the timeout if page becomes visible again
          if (this.visibilityTimeout) {
            clearTimeout(this.visibilityTimeout);
            this.visibilityTimeout = undefined;
          }

          // If it was hidden for too long, the state may be stale.
          // The adaptive polling logic in AgeGateMachine handles this.
        }
      };

      document.addEventListener("visibilitychange", visibilityHandler);
      this.cleanupCallbacks.push(() => {
        document.removeEventListener("visibilitychange", visibilityHandler);
        if (this.visibilityTimeout) {
          clearTimeout(this.visibilityTimeout);
        }
      });
    }
  }

  /**
   * Apply the integrator's configured failure-mode policy when an
   * AVAILABILITY failure occurs (Provii unreachable, or the network-retry
   * budget exhausted). Returns true when the policy fully handled the
   * failure (so the caller must NOT also show the blocking prompt), false
   * to fall through to the normal fail-closed retry prompt.
   *
   * Safety: this is a no-op unless `context.serviceUnavailable` is true, so
   * a genuine verifier rejection (underage / failed proof) can never be
   * failed open here. An unset policy fails closed and logs an error; the
   * dangerous "silent allow" outcome is structurally impossible.
   */
  private applyUnavailablePolicy(
    context: GateContext,
    reason: string,
  ): boolean {
    if (!context.serviceUnavailable) return false;

    // Resolve the effective mode: a locked server policy wins, else the
    // integrator's onUnavailable, else the server default (live from this
    // session's challenge, else the cached value so it survives the outage),
    // else the safe "block" default.
    const serverModeRaw = context.challenge?.failure_mode;
    const serverMode =
      serverModeRaw === "block" ||
      serverModeRaw === "allow" ||
      serverModeRaw === "defer"
        ? serverModeRaw
        : null;
    const cachedServerMode = readCachedFailureMode(
      this.cfg.publicKey,
      this.cfg.onUnavailable ?? null,
    );
    const action = resolveFailureMode({
      server: {
        mode: serverMode,
        locked: context.challenge?.failure_mode_locked ?? false,
      },
      attribute: this.cfg.onUnavailable ?? null,
      cachedServerMode,
    });
    const noPolicyAnywhere =
      !this.cfg.onUnavailable && !serverMode && !cachedServerMode;
    const code =
      context.error instanceof Error ? context.error.name : undefined;

    // Mirror the decision to the light DOM so host pages and tests can
    // observe how the gate degraded without piercing the shadow root.
    if (typeof document !== "undefined") {
      const mount = document.getElementById(this.cfg.mountElementId);
      mount?.setAttribute("data-agegate-unavailable", action);
    }

    if (action === "allow") {
      // Fail open: treat the unavailability as a pass and reveal content.
      this.redirectFn(this.cfg.contentUrl);
      return true;
    }

    if (action === "defer") {
      // Hand control to the integrator (e.g. route to a fallback provider).
      // The gate stays blocked until they navigate away, so a no-op handler
      // degrades to 'block' (safe).
      try {
        this.cfg.onUnavailableHandler?.({ reason, code });
      } catch (err) {
        console.error("[AgeGate] onUnavailableHandler threw:", err);
      }
      return false;
    }

    // 'block' or unset. An unset policy must never silently allow: fail
    // closed and shout so the missing decision is impossible to miss.
    if (noPolicyAnywhere) {
      console.error(
        "[AgeGate] Provii was unreachable and onUnavailable is not set. " +
          "Failing closed (blocking the user). Set onUnavailable to " +
          "'block', 'allow', or 'defer'. See " +
          "https://docs.provii.app/guides/resilience-and-failover",
      );
    }
    return false;
  }

  /**
   * Show retry prompt to user with proper styling
   */
  private showRetryPrompt(
    message: string,
    type: "timeout" | "error" = "error",
  ): void {
    const mount = this.cfg
      ? document.getElementById(this.cfg.mountElementId)
      : null;
    if (!mount) {
      console.error("[AgeGate] Mount element not found for retry prompt");
      return;
    }

    const shadowRoot = getOrCreateShadowRoot(mount, this.cfg.cspNonce);

    // Mirror the retry prompt to light-DOM attributes so host pages and
    // tests can observe failure / timeout state without piercing the
    // closed shadow root. The message is the same text that ends up in
    // the in-shadow alert; nothing additional is leaked.
    mount.setAttribute("data-agegate-prompt", type);
    mount.setAttribute("data-agegate-message", message);

    // Clear shadow content but preserve <style> elements
    const childNodes = Array.from(shadowRoot.childNodes);
    for (const node of childNodes) {
      if (node instanceof HTMLStyleElement) continue;
      shadowRoot.removeChild(node);
    }

    const iconTypeClass =
      type === "timeout" ? "agegate-icon-timeout" : "agegate-icon-error";

    const iconPathD =
      type === "timeout"
        ? "M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
        : "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z";

    // Build retry/error UI programmatically (no innerHTML interpolation)
    const alertDiv = document.createElement("div");
    alertDiv.setAttribute("role", "alert");
    alertDiv.setAttribute("lang", getLocale());
    if (isRTL()) alertDiv.setAttribute("dir", "rtl");
    alertDiv.className = "agegate-retry-alert";

    const svgNS = "http://www.w3.org/2000/svg";
    const svgEl = document.createElementNS(svgNS, "svg");
    svgEl.setAttribute("aria-hidden", "true");
    svgEl.setAttribute("class", `agegate-retry-icon ${iconTypeClass}`);
    svgEl.setAttribute("viewBox", "0 0 20 20");
    svgEl.setAttribute("fill", "currentColor");
    const pathEl = document.createElementNS(svgNS, "path");
    pathEl.setAttribute("fill-rule", "evenodd");
    pathEl.setAttribute("d", iconPathD);
    pathEl.setAttribute("clip-rule", "evenodd");
    svgEl.appendChild(pathEl);
    alertDiv.appendChild(svgEl);

    const h2El = document.createElement("h2");
    h2El.className = "agegate-retry-heading";
    h2El.id = "agegate-retry-heading";
    alertDiv.appendChild(h2El);

    const pMsg = document.createElement("p");
    pMsg.className = "agegate-retry-message";
    pMsg.id = "agegate-retry-msg";
    alertDiv.appendChild(pMsg);

    const btnEl = document.createElement("button");
    btnEl.id = "agegate-retry-btn";
    btnEl.className = "agegate-retry-button";
    alertDiv.appendChild(btnEl);

    if (type === "timeout") {
      const hintP = document.createElement("p");
      hintP.className = "agegate-retry-hint";
      hintP.id = "agegate-retry-hint";
      alertDiv.appendChild(hintP);
    }

    const helpContainer = document.createElement("p");
    helpContainer.className = "agegate-retry-help-container";
    const helpLink = document.createElement("a");
    helpLink.href = "https://provii.app/help";
    helpLink.target = "_blank";
    helpLink.rel = "noopener";
    helpLink.className = "agegate-retry-help-link";
    helpContainer.appendChild(helpLink);
    alertDiv.appendChild(helpContainer);

    shadowRoot.appendChild(alertDiv);

    // Set localised text via textContent (XSS safe, no innerHTML)
    h2El.textContent =
      type === "timeout"
        ? (t("verificationTimedOut").split(".")[0] ?? t("verificationTimedOut"))
        : t("errorTitle");
    pMsg.textContent = message;
    btnEl.textContent = t("tryAgain");
    helpLink.textContent = t("needHelp");
    helpLink.setAttribute("aria-label", t("needHelpAriaLabel"));
    const hintEl = shadowRoot.querySelector("#agegate-retry-hint");
    if (hintEl) {
      hintEl.textContent = t("timeoutHint");
    }

    // Inject styles programmatically so the nonce can be applied (CH-170/CH-172)
    this.injectRetryStyles(shadowRoot);

    // Apply entrance animation if motion is allowed
    const animContainer = shadowRoot.querySelector(
      '[role="alert"]',
    ) as HTMLElement;
    if (
      animContainer &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      animContainer.style.animation = "fadeIn 0.3s ease-in";
    }

    // Add click handler and focus management
    const retryBtn = shadowRoot.querySelector("#agegate-retry-btn");
    if (retryBtn instanceof HTMLElement) {
      retryBtn.addEventListener("click", () => {
        this.userRetry();
      });
      // Move focus to retry button so screen reader users know the state changed
      retryBtn.focus();
    }
  }

  /**
   * Inject retry prompt styles with optional CSP nonce (CH-170/CH-172/CH-173)
   */
  private injectRetryStyles(shadowRoot: ShadowRoot): void {
    const styleId = "agegate-retry-styles";
    if (shadowRoot.querySelector(`#${styleId}`)) return;

    const style = document.createElement("style");
    style.id = styleId;
    if (this.cfg.cspNonce) {
      style.setAttribute("nonce", this.cfg.cspNonce);
    }
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        @keyframes fadeIn {
          from { opacity: 1; transform: none; }
          to { opacity: 1; transform: none; }
        }
      }
      .agegate-retry-alert {
        text-align: center;
        padding: 32px 20px;
        max-width: 400px;
        margin: 0 auto;
      }
      .agegate-retry-icon {
        width: 56px;
        height: 56px;
        margin: 0 auto 20px;
        display: block;
      }
      .agegate-icon-timeout { color: var(--ag-warning, #D97706); }
      .agegate-icon-error { color: var(--ag-error, #C62020); }
      .agegate-retry-heading {
        margin: 0 0 12px;
        color: var(--ag-text, #1F2937);
        font-size: 1.125rem;
        font-weight: 700;
      }
      .agegate-retry-message {
        margin: 0 0 24px;
        color: var(--ag-text-secondary, #6B7280);
        font-size: 0.9375rem;
        line-height: 1.5;
      }
      .agegate-retry-button {
        background: var(--ag-accent-gradient);
        border: none;
        color: #fff;
        padding: 12px 32px;
        min-height: 44px;
        border-radius: var(--ag-radius-button);
        cursor: pointer;
        font-size: 1rem;
        font-weight: 700;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .agegate-retry-hint {
        margin: 16px 0 0;
        color: var(--ag-text-muted, #6B7280);
        font-size: 0.8125rem;
      }
      .agegate-retry-help-container {
        margin: 16px 0 0;
        font-size: 0.8125rem;
        text-align: center;
      }
      .agegate-retry-help-link {
        color: var(--ag-accent-start, #007AA8);
        display: inline-block;
        padding: 12px 8px;
        min-height: 44px;
      }
      #agegate-retry-btn:focus-visible {
        outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start, #007AA8));
        outline-offset: 2px;
        box-shadow: var(--ag-focus-ring, 0 0 0 3px rgba(0, 145, 199, 0.4));
      }
      [role="alert"] a:focus-visible {
        outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start, #007AA8));
        outline-offset: 2px;
        border-radius: 2px;
      }
    `;
    shadowRoot.appendChild(style);
  }

  /**
   * User-initiated retry
   *
   * Reloads the page to start fresh with a new challenge.
   * This is more reliable than trying to resume polling with an expired challenge.
   */
  userRetry(): void {
    // Always reload the page to get a fresh challenge
    // Trying to resume polling with an expired/stale challenge leads to infinite loops
    window.location.reload();
  }

  /**
   * Check if user already has a valid session (HttpOnly cookie validated server-side)
   *
   * @returns Promise<SessionCheckResponse> - Session check result
   */
  private async checkExistingSession(): Promise<SessionCheckResponse> {
    const apiBase = ENVIRONMENT_API_BASES[this.cfg.environment];
    const sessionCheckUrl = `${apiBase}/session/check`;

    try {
      const res = await fetchWithTimeout(
        sessionCheckUrl,
        {
          method: "GET",
          headers: {
            "X-Public-Key": this.cfg.publicKey,
            Accept: "application/json",
          },
          // SECURITY: credentials: 'include' sends HttpOnly cookie automatically
          credentials: "include",
        },
        10000,
      ); // 10 second timeout

      if (!res.ok) {
        return { verified: false };
      }

      const data = await safeReadJson<unknown>(res);

      // Validate session check response shape before trusting it
      if (!isSessionCheckResponse(data)) {
        return { verified: false };
      }

      return data;
    } catch {
      // Session check failed - proceed with verification
      return { verified: false };
    }
  }

  /**
   * Start initialization (idempotent)
   *
   * This method first checks for an existing valid session cookie.
   * If the user is already verified, it redirects immediately without showing the age gate.
   * If no valid session exists, it starts the normal verification flow.
   */
  init(): Promise<void> {
    if (this.disposed) {
      return Promise.reject(new Error("AgeGate instance has been disposed"));
    }

    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      // PERFORMANCE: Fire session check and challenge creation in parallel.
      // Session check takes ~200ms, challenge creation takes ~200ms (warm) to ~2s (cold).
      // Running them in parallel saves the full session check time on every page load.
      // If session check returns verified, we redirect immediately and the challenge is discarded.

      // Start the verification flow immediately (don't wait for session check)
      const verificationPromise = new Promise<void>((resolve, reject) => {
        let settled = false;

        const sub = this.actor.subscribe((snap: MachineSnapshot) => {
          if (!settled && snap.matches("rendered")) {
            settled = true;
            sub.unsubscribe();
            resolve();
          } else if (!settled && snap.matches("failed")) {
            settled = true;
            sub.unsubscribe();
            const error =
              (snap.context as unknown as { error?: unknown }).error ??
              new Error("Age gate initialization failed");
            reject(error);
          }
        });

        // Guard the transition before sending. The machine
        // silently drops unhandled events in XState v5, but we want an
        // explicit warning when code attempts an invalid transition so
        // the programming error surfaces in logs.
        this.guardedSend({ type: "FETCH", cfg: this.cfg });

        // Timeout the initialisation after 330 seconds (slightly longer than the 300s
        // challenge lifetime). This gives the state machine time to reach its own timeout
        // state and show a retry prompt, rather than the init Promise killing everything.
        const initTimeoutId = setTimeout(() => {
          if (!settled) {
            settled = true;
            sub.unsubscribe();
            reject(new Error("Age gate initialization timed out"));
          }
        }, 330000);

        // Cancel the init timeout when the instance is disposed so it does not
        // fire after cleanup and reject into a dangling promise.
        this.cleanupCallbacks.push(() => {
          clearTimeout(initTimeoutId);
        });
      });

      // Check for existing session in parallel with challenge creation.
      // In rp-proxy mode, the developer manages sessions on their own backend,
      // so skip the provii-verifier session check entirely.
      let sessionCheck: SessionCheckResponse;
      if (this.cfg.redeemMode === "rp-proxy") {
        sessionCheck = { verified: false };
      } else {
        // The browser sends the HttpOnly cookie automatically, server validates it
        sessionCheck = await Promise.race([
          this.checkExistingSession(),
          // If session check takes longer than 3s, proceed with verification flow
          new Promise<SessionCheckResponse>((resolve) =>
            setTimeout(() => resolve({ verified: false }), 3000),
          ),
        ]);
      }

      // Guard: if dispose() was called while the session check was in flight,
      // bail out silently so we neither redirect nor hang on verificationPromise.
      if (this.disposed) {
        return;
      }

      if (sessionCheck.verified) {
        // User is already verified - redirect immediately (challenge creation is discarded)
        this.redirectFn(this.cfg.contentUrl);
        return;
      }

      // Guard: if dispose() was called between the session check completing
      // and this point, avoid returning a promise that may never resolve.
      if (this.disposed) {
        return;
      }

      return verificationPromise;
    })();

    return this.initPromise;
  }

  /**
   * Get the current state of the age gate
   */
  getState(): string {
    if (this.disposed) return "disposed";

    const snapshot = this.actor.getSnapshot();

    if (snapshot.matches("idle")) return "idle";
    if (snapshot.matches("fetching")) return "fetching";
    if (snapshot.matches("rendered")) return "rendered";
    if (snapshot.matches("polling")) return "polling";
    if (snapshot.matches("waiting")) return "waiting";
    if (snapshot.matches("timeout")) return "timeout";
    if (snapshot.matches("verified")) return "verified";
    if (snapshot.matches("failed")) return "failed";

    return "unknown";
  }

  /**
   * Get the current context
   */
  getContext(): Partial<GateContext> {
    if (this.disposed) {
      return {
        error: new Error("Instance disposed"),
        userMessage:
          "Your verification session expired because this page was inactive for more than 5 minutes. Any verification in progress has been lost. Please refresh the page to start a new verification.",
      };
    }

    const snapshot = this.actor.getSnapshot();
    const context = snapshot.context;

    return {
      currentPollInterval: context.currentPollInterval,
      networkRetries: context.networkRetries,
      negativeRetries: context.negativeRetries,
      totalAttempts: context.totalAttempts,
      lastErrorType: context.lastErrorType,
      lastPollState: context.lastPollState,
      serviceUnavailable: context.serviceUnavailable,
      error: context.error,
      userMessage: context.userMessage,
    };
  }

  /**
   * Manually trigger a retry
   */
  retry(): void {
    this.userRetry();
  }

  /**
   * Stop the age gate actor
   */
  stop(): void {
    this.dispose();
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;

    // Stop the actor
    try {
      this.actor.stop();
    } catch (err) {
      console.error("[AgeGate] Error stopping actor:", err);
    }

    // Clear visibility timeout
    if (this.visibilityTimeout) {
      clearTimeout(this.visibilityTimeout);
      this.visibilityTimeout = undefined;
    }

    // Run cleanup callbacks
    this.cleanupCallbacks.forEach((cleanup) => {
      try {
        cleanup();
      } catch (err) {
        console.error("[AgeGate] Cleanup error:", err);
      }
    });

    this.cleanupCallbacks = [];
  }

  /**
   * Check if instance is disposed
   */
  isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Subscribe to state changes
   * Returns an unsubscribe function
   */
  subscribe(
    callback: (state: string, context: Partial<GateContext>) => void,
  ): () => void {
    if (this.disposed) {
      console.warn("[AgeGate] Cannot subscribe - instance disposed");
      return () => {};
    }

    const sub = this.actor.subscribe((_snapshot) => {
      if (!this.disposed) {
        callback(this.getState(), this.getContext());
      }
    });

    // Return unsubscribe function
    return () => {
      try {
        sub.unsubscribe();
      } catch (err) {
        // Ignore unsubscribe errors
      }
    };
  }
}
