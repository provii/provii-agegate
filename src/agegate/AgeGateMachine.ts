// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * XState state machine definition for the AgeGate verification flow.
 *
 * Manages the full lifecycle of a verification session: idle, fetching a
 * challenge, rendering the QR/deep-link, adaptive polling for status
 * changes, timeout handling, and final redirection on success.
 *
 * Polling uses an adaptive strategy that adjusts interval based on
 * elapsed time and current challenge state, with jitter to prevent
 * thundering herd problems across concurrent sessions.
 *
 * @module AgeGateMachine
 */
import { createMachine, assign } from "xstate";
import type { AgeGateConfig } from "./AgeGateConfig.js";
import type { CreateChallengeResponse, QRPayload } from "../api/v1.js";
import { wasWsConnected } from "./machineServices.js";
import { isRetryableFetchError } from "../utils/fetchWithTimeout.js";

// Re-exported from its new shared home so existing importers (and the machine
// below) keep using `isRetryableFetchError` from this module unchanged.
export { isRetryableFetchError } from "../utils/fetchWithTimeout.js";

/* -------------------------------------------------------------------------- */
/*  State transition guard                                           */
/*                                                                            */
/*  Defines the set of valid (state, event) pairs. Any send() call whose     */
/*  (state, event) tuple is absent from this map is an invalid transition     */
/*  and will be rejected with a console.warn before the event reaches the     */
/*  machine interpreter. XState v5 silently drops unhandled events, which     */
/*  hides programming errors. This guard makes them visible.                  */
/* -------------------------------------------------------------------------- */

/** Every (state, event-type) pair the machine is designed to handle. */
const VALID_TRANSITIONS: Readonly<Record<string, ReadonlyArray<string>>> = {
  idle: ["FETCH"],
  fetching: [], // driven by invoke (onDone / onError), no external events
  fetchingRetryWait: [], // delayed auto-retry of a transient challenge-create failure
  rendered: [], // always-transition to waiting, no external events
  polling: ["USER_RETRY"],
  waiting: ["USER_RETRY"],
  timeout: ["USER_RETRY"],
  failed: ["USER_RETRY"],
  verified: [], // final state, no events accepted
} as const;

/**
 * Check whether sending `eventType` while the machine is in `currentState`
 * is a valid transition. Returns true if the transition is valid, false
 * otherwise. Callers should log/warn on false and skip the send.
 */
export function isValidTransition(
  currentState: string,
  eventType: string,
): boolean {
  const allowedEvents = VALID_TRANSITIONS[currentState];
  if (!allowedEvents) {
    // Unknown state, reject defensively
    return false;
  }
  return allowedEvents.includes(eventType);
}

/** Shared context carried through every state of the age gate machine. */
export interface GateContext {
  cfg?: AgeGateConfig;
  challenge?: CreateChallengeResponse;
  currentPollInterval?: number;
  deepLink?: string;
  qrPayload?: QRPayload;
  networkRetries?: number;
  /** Auto-retry attempts for a transient challenge-create (fetching) failure. */
  fetchRetries?: number;
  negativeRetries?: number;
  totalAttempts?: number;
  lastErrorType?: "network" | "negative" | "fatal" | "timeout";
  lastPollState?: string;
  pollingUrl?: string;
  error?: unknown;
  userMessage?: string;
  /** Whether this is the first poll cycle for the current challenge. */
  isFirstPoll?: boolean;
  /** Timestamp (ms) when polling started, used for adaptive interval calculation. */
  pollingStartTime?: number;
  /** WebSocket URL for push notifications (from challenge response). */
  wsUrl?: string;
  /** True when the WS was connected then lost (tab backgrounded). Triggers aggressive polling. */
  wsWasConnected?: boolean;
  /**
   * True when the terminal state was reached because Provii could not be
   * reached or did not return a verdict (challenge creation failed, or the
   * network-retry budget was exhausted) - an AVAILABILITY failure.
   *
   * False for every genuine-verdict terminal (expired, verifier "failed",
   * negative-retry exhaustion) and for the user-ran-out-of-time timeout.
   * Only when this is true may the configured fail-open/defer action apply;
   * a real rejection is never failed open. See AgeGate.resolveUnavailable.
   */
  serviceUnavailable?: boolean;
}

/** Result shape returned by the pollStatus machine service. */
export interface PollResult {
  isValid: boolean;
  message: string;
  state?: string;
  source?: string;
}

/** Union of events the age gate machine can receive. */
export type GateEvent =
  | { type: "FETCH"; cfg: AgeGateConfig }
  | { type: "FETCH_FAIL" }
  | { type: "POLL_OK" }
  | {
      type: "POLL_FAIL";
      reason?: string;
      errorType?: "network" | "negative" | "fatal" | "timeout";
    }
  | { type: "RESET_RETRIES" }
  | { type: "USER_RETRY" };

/**
 * Adaptive polling configuration.
 *
 * Starts with slower intervals while the user retrieves their phone, then
 * increases frequency as time progresses and they are likely engaged.
 * Respects the server rate limit of 20 checks per minute (3 s minimum).
 */
const ADAPTIVE_POLLING_CONFIG = {
  // Phase 1: First 15 seconds - slow polling (user getting phone, opening app)
  EARLY_PHASE_DURATION: 15000, // 15 seconds
  EARLY_INTERVAL: 5000, // 5s polling - user still getting ready

  // Phase 2: 15-45 seconds - moderate polling (user scanning/verifying)
  MID_PHASE_DURATION: 45000, // 45 seconds total
  MID_INTERVAL: 4000, // 4s polling - user likely engaged

  // Phase 3: 45+ seconds - faster polling (user should be done soon)
  LATE_INTERVAL: 3000, // 3s polling (minimum to avoid rate limit)

  // Proof detected - poll quickly since verification is imminent
  PROOF_DETECTED_INTERVAL: 1500, // 1.5s when proof_ok state

  // WebSocket was connected then lost (tab backgrounded). User likely
  // completed verification while away, so poll aggressively on return.
  WS_FALLBACK_INTERVAL: 1000, // 1s - user probably already verified

  // Limits
  MAX_NETWORK_RETRIES: 5, // Network error retry limit
  // Challenge-create (the FIRST request, most exposed to a cold isolate)
  // auto-retry: absorbs transient 5xx / timeout / network (notably cold-start
  // 500s) before declaring the service unavailable and triggering the
  // block/allow/defer failure-mode. The create carries an Idempotency-Key so
  // the retry is safe.
  MAX_FETCH_RETRIES: 2, // up to 2 retries (3 attempts total) on challenge-create
  FETCH_RETRY_BASE_MS: 600, // base backoff, grows exponentially per attempt
  MAX_NEGATIVE_RETRIES: 3, // Negative response limit
  MAX_TOTAL_ATTEMPTS: 60, // Total polling attempts (5 minutes at ~4s avg = 75)
  JITTER_FACTOR: 0.15, // Add 15% random jitter to prevent thundering herd

  // Backoff for network errors (including rate limit 429)
  BACKOFF_FACTOR: 1.5, // Backoff multiplier for errors
  MAX_INTERVAL: 15000, // Max interval cap (15 seconds)
} as const;

/**
 * Calculate the adaptive polling interval based on elapsed time and the
 * current challenge state. Returns the base interval in milliseconds
 * before jitter is applied.
 */
function calculatePollingInterval(
  elapsedMs: number,
  currentState?: string,
  wsWasConnected?: boolean,
): number {
  // If proof is detected, poll aggressively
  if (
    currentState === "proof_ok" ||
    currentState === "proof_ok_waiting_for_redeem"
  ) {
    return ADAPTIVE_POLLING_CONFIG.PROOF_DETECTED_INTERVAL;
  }

  // WebSocket was connected then lost (tab backgrounded). The user likely
  // completed verification while away, so poll aggressively on return.
  if (wsWasConnected) {
    return ADAPTIVE_POLLING_CONFIG.WS_FALLBACK_INTERVAL;
  }

  // Early phase: aggressive polling (first 10 seconds)
  if (elapsedMs < ADAPTIVE_POLLING_CONFIG.EARLY_PHASE_DURATION) {
    return ADAPTIVE_POLLING_CONFIG.EARLY_INTERVAL;
  }

  // Mid phase: moderate polling (10-30 seconds)
  if (elapsedMs < ADAPTIVE_POLLING_CONFIG.MID_PHASE_DURATION) {
    return ADAPTIVE_POLLING_CONFIG.MID_INTERVAL;
  }

  // Late phase: conservative polling (30+ seconds)
  return ADAPTIVE_POLLING_CONFIG.LATE_INTERVAL;
}

/** Apply random jitter to an interval to prevent thundering herd problems. */
function addJitter(interval: number): number {
  const jitter = interval * ADAPTIVE_POLLING_CONFIG.JITTER_FACTOR;
  return Math.round(interval + (Math.random() * jitter * 2 - jitter));
}

/**
 * XState machine governing the age gate verification lifecycle.
 *
 * States: idle -> fetching -> rendered -> waiting/polling -> verified | failed | timeout
 */
export const AgeGateMachine = createMachine(
  {
    types: {} as { context: GateContext; events: GateEvent },
    id: "ageGate",
    initial: "idle",
    context: {},

    states: {
      idle: {
        on: {
          FETCH: {
            target: "fetching",
            actions: assign(({ event }) => ({
              cfg: event.cfg,
              currentPollInterval: ADAPTIVE_POLLING_CONFIG.EARLY_INTERVAL, // Start with fast polling
              networkRetries: 0,
              fetchRetries: 0,
              negativeRetries: 0,
              totalAttempts: 0,
              pollingStartTime: Date.now(), // Track when polling starts
              error: undefined,
              userMessage: undefined,
              serviceUnavailable: false, // Reset availability flag each cycle
              isFirstPoll: true, // Mark as first poll
            })),
          },
        },
      },

      fetching: {
        entry: "renderSkeleton",
        invoke: {
          src: "fetchChallenge",
          input: ({ context }) => ({ context }),
          onDone: {
            target: "rendered",
            actions: assign({
              challenge: ({ event }) => event.output.challenge,
              deepLink: ({ event }) => event.output.deepLink,
              pollingUrl: ({ event }) => event.output.pollingUrl,
              qrPayload: ({ event }) => event.output.qrPayload,
              wsUrl: ({ event }) => event.output.wsUrl,
            }),
          },
          onError: [
            // Transient failure (5xx incl. cold-start 500, timeout, network):
            // back off briefly and re-create the challenge, up to
            // MAX_FETCH_RETRIES, before giving up. Without this, the FIRST
            // request -- the one most exposed to a cold isolate -- would skip
            // straight to the failure-mode on a transient that a retry fixes.
            {
              guard: ({ context, event }) =>
                isRetryableFetchError((event as { error?: unknown }).error) &&
                (context.fetchRetries ?? 0) <
                  ADAPTIVE_POLLING_CONFIG.MAX_FETCH_RETRIES,
              target: "fetchingRetryWait",
              actions: assign({
                fetchRetries: ({ context }) => (context.fetchRetries ?? 0) + 1,
                lastErrorType: () => "network" as const,
                error: ({ event }) => (event as { error?: unknown }).error,
              }),
            },
            // Non-retryable (4xx), or the retry budget is exhausted: could not
            // create a challenge -> availability failure, so the configured
            // onUnavailable (block/allow/defer) action is eligible to apply.
            {
              target: "failed",
              actions: assign({
                error: ({ event }) => (event as { error?: unknown }).error,
                lastErrorType: () => "fatal" as const,
                serviceUnavailable: () => true,
                userMessage: () =>
                  "Unable to connect to the verification service. Please check your internet connection and refresh the page to try again.",
              }),
            },
          ],
        },
      },

      // Brief backoff between challenge-create attempts, then re-enter
      // `fetching` (which re-invokes fetchChallenge). Driven entirely by the
      // FETCH_RETRY_INTERVAL delayed transition; no external events.
      fetchingRetryWait: {
        after: {
          FETCH_RETRY_INTERVAL: "fetching",
        },
      },

      rendered: {
        entry: "renderChallenge",
        always: "waiting", // Go to waiting instead of polling
      },

      polling: {
        entry: assign({
          totalAttempts: ({ context }) => (context.totalAttempts ?? 0) + 1,
          isFirstPoll: () => false, // No longer first poll after executing
        }),

        invoke: {
          src: "pollStatus",
          input: ({ context }) => ({ context }),

          onDone: [
            // Success case
            {
              target: "verified",
              guard: ({ event }) => {
                const result = event.output as PollResult;
                return result.isValid === true;
              },
            },

            // Expired challenge
            {
              target: "failed",
              guard: ({ event }) => {
                const result = event.output as PollResult;
                return (
                  result.state === "expired" || result.message === "expired"
                );
              },
              actions: assign({
                error: () => new Error("Verification challenge has expired"),
                lastErrorType: () => "fatal" as const,
                lastPollState: ({ event }) =>
                  (event.output as PollResult).state || "expired",
                userMessage: () =>
                  "Your verification session expired after 5 minutes. Please refresh the page to start a new verification.",
              }),
            },

            // Failed verification
            {
              target: "failed",
              guard: ({ event }) => {
                const result = event.output as PollResult;
                return result.state === "failed" || result.message === "failed";
              },
              actions: assign({
                error: () => new Error("Verification failed"),
                lastErrorType: () => "fatal" as const,
                lastPollState: ({ event }) =>
                  (event.output as PollResult).state || "failed",
                userMessage: () =>
                  "Verification was not completed. Please ensure Provii Wallet is open and that you approved the age check request, then try again. If the problem persists, visit provii.app/help for assistance.",
              }),
            },

            // Timeout guard MUST evaluate before the pending
            // guard. Previously, a "pending" response always matched the
            // pending guard first, so totalAttempts could exceed
            // MAX_TOTAL_ATTEMPTS indefinitely without ever reaching the
            // timeout state.
            {
              target: "timeout",
              guard: ({ context }) =>
                (context.totalAttempts ?? 0) >=
                ADAPTIVE_POLLING_CONFIG.MAX_TOTAL_ATTEMPTS,
              actions: assign({
                error: () => new Error("Verification timed out"),
                lastErrorType: () => "timeout" as const,
                userMessage: () =>
                  "Your verification session expired after 5 minutes. Your previous session has been discarded. Please refresh the page to generate a new QR code and start again.",
              }),
            },

            // Negative retry guard MUST evaluate before the
            // pending guard for the same reason as the timeout guard.
            {
              target: "failed",
              guard: ({ context }) =>
                (context.negativeRetries ?? 0) >=
                ADAPTIVE_POLLING_CONFIG.MAX_NEGATIVE_RETRIES,
              actions: assign({
                error: () =>
                  new Error("Verification rejected after multiple attempts"),
                lastErrorType: () => "negative" as const,
                userMessage: () =>
                  "Verification could not be completed after several attempts. Please ensure Provii Wallet is open and that you have completed the age check in the app, then try again.",
              }),
            },

            // Still pending and within budget, use adaptive interval
            {
              target: "waiting",
              guard: ({ event }) => {
                const result = event.output as PollResult;
                return result.message === "pending";
              },
              actions: assign({
                networkRetries: () => 0,
                lastPollState: ({ event }) =>
                  (event.output as PollResult).state || "pending",
                currentPollInterval: ({ context, event }) => {
                  const elapsedMs =
                    Date.now() - (context.pollingStartTime ?? Date.now());
                  const state = (event.output as PollResult).state || "pending";
                  const baseInterval = calculatePollingInterval(
                    elapsedMs,
                    state,
                    wasWsConnected(),
                  );
                  return addJitter(baseInterval);
                },
              }),
            },

            // Negative response - continue with adaptive interval
            {
              target: "waiting",
              actions: assign({
                negativeRetries: ({ context }) =>
                  (context.negativeRetries ?? 0) + 1,
                lastErrorType: () => "negative" as const,
                currentPollInterval: ({ context }) => {
                  const elapsedMs =
                    Date.now() - (context.pollingStartTime ?? Date.now());
                  const baseInterval = calculatePollingInterval(
                    elapsedMs,
                    context.lastPollState,
                    wasWsConnected(),
                  );
                  return addJitter(baseInterval);
                },
              }),
            },
          ],

          onError: [
            // Too many network errors
            {
              target: "timeout",
              guard: ({ context }) =>
                (context.networkRetries ?? 0) >=
                ADAPTIVE_POLLING_CONFIG.MAX_NETWORK_RETRIES,
              actions: assign({
                error: ({ event }) => (event as { error?: unknown }).error,
                lastErrorType: () => "timeout" as const,
                // Network-retry budget exhausted: Provii is unreachable.
                // This is an availability failure (unlike the user-ran-out-of-
                // time timeout above), so onUnavailable is eligible to apply.
                serviceUnavailable: () => true,
                userMessage: () =>
                  "The verification service could not be reached after multiple attempts. This may be caused by an unstable internet connection or a temporary service disruption. Please check your connection, wait a moment, and refresh the page to try again.",
              }),
            },

            // Network error - retry with gentle backoff
            {
              target: "waiting",
              actions: assign({
                networkRetries: ({ context }) =>
                  (context.networkRetries ?? 0) + 1,
                lastErrorType: () => "network" as const,
                currentPollInterval: ({ context }) => {
                  const current =
                    context.currentPollInterval ??
                    ADAPTIVE_POLLING_CONFIG.LATE_INTERVAL;
                  const next = Math.floor(
                    current * ADAPTIVE_POLLING_CONFIG.BACKOFF_FACTOR,
                  );
                  const clamped = Math.min(
                    next,
                    ADAPTIVE_POLLING_CONFIG.MAX_INTERVAL,
                  );
                  return addJitter(clamped);
                },
              }),
            },
          ],
        },

        on: {
          USER_RETRY: {
            target: "polling",
            actions: assign({
              networkRetries: () => 0,
              negativeRetries: () => 0,
              currentPollInterval: ({ context }) => {
                const elapsedMs =
                  Date.now() - (context.pollingStartTime ?? Date.now());
                const baseInterval = calculatePollingInterval(
                  elapsedMs,
                  context.lastPollState,
                  wasWsConnected(),
                );
                return addJitter(baseInterval);
              },
            }),
          },
        },
      },

      waiting: {
        entry: assign({
          currentPollInterval: ({ context }) => {
            // For network errors, use gentle backoff
            if (context.lastErrorType === "network") {
              const current =
                context.currentPollInterval ??
                ADAPTIVE_POLLING_CONFIG.LATE_INTERVAL;
              const next = Math.floor(
                current * ADAPTIVE_POLLING_CONFIG.BACKOFF_FACTOR,
              );
              return Math.min(next, ADAPTIVE_POLLING_CONFIG.MAX_INTERVAL);
            }

            // Calculate elapsed time for adaptive polling
            const elapsedMs =
              Date.now() - (context.pollingStartTime ?? Date.now());
            const baseInterval = calculatePollingInterval(
              elapsedMs,
              context.lastPollState,
              wasWsConnected(),
            );

            // Add jitter and return
            return addJitter(baseInterval);
          },
        }),

        after: {
          POLL_INTERVAL: "polling",
        },

        on: {
          USER_RETRY: {
            target: "polling",
            actions: assign({
              networkRetries: () => 0,
              negativeRetries: () => 0,
              currentPollInterval: ({ context }) => {
                const elapsedMs =
                  Date.now() - (context.pollingStartTime ?? Date.now());
                const baseInterval = calculatePollingInterval(
                  elapsedMs,
                  context.lastPollState,
                  wasWsConnected(),
                );
                return addJitter(baseInterval);
              },
            }),
          },
        },
      },

      timeout: {
        entry: ["notifyTimeout"],
        on: {
          // M-43: Target 'fetching' instead of 'polling' so that a fresh
          // challenge is created. After a timeout the existing challenge is
          // stale or expired, so polling it again would produce immediate
          // failure or an expired response from the server.
          USER_RETRY: {
            target: "fetching",
            actions: assign({
              networkRetries: () => 0,
              fetchRetries: () => 0,
              negativeRetries: () => 0,
              totalAttempts: () => 0,
              pollingStartTime: () => Date.now(),
              currentPollInterval: () =>
                addJitter(ADAPTIVE_POLLING_CONFIG.EARLY_INTERVAL),
              lastPollState: () => undefined,
              error: () => undefined,
              userMessage: () => undefined,
              serviceUnavailable: () => false,
              isFirstPoll: () => true,
            }),
          },
        },
      },

      verified: {
        entry: "redirect",
        type: "final",
      },

      failed: {
        entry: ["notifyFailure"],
        on: {
          USER_RETRY: {
            target: "fetching",
            actions: assign({
              networkRetries: () => 0,
              fetchRetries: () => 0,
              negativeRetries: () => 0,
              totalAttempts: () => 0,
              pollingStartTime: () => Date.now(), // Reset polling start time
              currentPollInterval: () =>
                addJitter(ADAPTIVE_POLLING_CONFIG.EARLY_INTERVAL),
              lastPollState: () => undefined,
              error: () => undefined,
              userMessage: () => undefined,
              serviceUnavailable: () => false,
              isFirstPoll: () => true,
            }),
          },
        },
      },
    },
  },

  {
    delays: {
      POLL_INTERVAL: ({ context }) =>
        context.currentPollInterval ?? ADAPTIVE_POLLING_CONFIG.EARLY_INTERVAL,
      // Exponential backoff between challenge-create retries (~600ms, ~1200ms),
      // jittered + capped. fetchRetries is already incremented when this
      // resolves, so attempt 1 -> ~600ms, attempt 2 -> ~1200ms.
      FETCH_RETRY_INTERVAL: ({ context }) => {
        const attempt = Math.max(1, context.fetchRetries ?? 1);
        const base =
          ADAPTIVE_POLLING_CONFIG.FETCH_RETRY_BASE_MS *
          Math.pow(2, attempt - 1);
        return addJitter(Math.min(base, ADAPTIVE_POLLING_CONFIG.MAX_INTERVAL));
      },
    },
  },
);
