// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Resolution of the effective failure mode (block / allow / defer) from the
 * three possible sources, in precedence order.
 *
 * Background: the failure mode can be configured server-side per origin (the
 * source of truth, recorded by Provii) and delivered to the SDK in the
 * challenge response. The integrator can also set it client-side via
 * `onUnavailable` / `data-on-unavailable`. Because the verifier is unreachable
 * during an outage, the server value must be cached so it survives the outage
 * (see {@link cacheServerFailureMode}).
 *
 * Enforcement still happens in the browser (the SDK applies the resolved mode);
 * this module only decides WHICH mode applies.
 *
 * @module core/failure-mode
 */

import type { UnavailableAction } from "./types.js";

/** Server-configured failure mode delivered in the challenge response. */
export interface ServerFailureMode {
  /** The mode set on the origin policy, or null when not configured. */
  mode: UnavailableAction | null;
  /** When true, the integrator's client-side choice is ignored (governance lock). */
  locked: boolean;
}

export interface ResolveFailureModeArgs {
  /** Server policy from THIS session's challenge response, if it succeeded. */
  server?: ServerFailureMode | null;
  /** The integrator's explicit `onUnavailable` / `data-on-unavailable`, if any. */
  attribute?: UnavailableAction | null;
  /** Last-known server mode from cache, used when the response is unavailable. */
  cachedServerMode?: UnavailableAction | null;
}

/**
 * Resolve the effective failure mode. Precedence:
 *
 * 1. A locked server mode wins outright (governance: the integrator cannot
 *    override a policy Provii has locked for a high-risk customer).
 * 2. Otherwise the integrator's explicit choice wins (flexibility).
 * 3. Otherwise the server default applies (this session, else the cached value
 *    so it still applies during an outage).
 * 4. Otherwise fail closed with `block` - the only safe default.
 */
export function resolveFailureMode(
  args: ResolveFailureModeArgs,
): UnavailableAction {
  const { server, attribute, cachedServerMode } = args;

  // 1. Locked server policy overrides everything.
  if (server && server.mode && server.locked) {
    return server.mode;
  }
  // 2. Integrator's explicit choice.
  if (attribute) {
    return attribute;
  }
  // 3. Server default: live value first, then the cached value (outage path).
  if (server && server.mode) {
    return server.mode;
  }
  if (cachedServerMode) {
    return cachedServerMode;
  }
  // 4. Safe default.
  return "block";
}

const CACHE_PREFIX = "provii_failure_mode_";

/**
 * Sentinel used in the cache key when the integrator set no `onUnavailable`
 * override. Keeps the key shape stable and distinct from any real mode value.
 */
const NO_ATTRIBUTE = "_";

function isUnavailableAction(value: unknown): value is UnavailableAction {
  return value === "block" || value === "allow" || value === "defer";
}

/**
 * Build the localStorage key for a cached server mode.
 *
 * The key is namespaced by BOTH the public key and the integrator's
 * `onUnavailable` override. The override is part of the key (not just the
 * public key) because the resolved effective mode depends on it: when the
 * server is unlocked, the integrator override wins over the server default
 * (see {@link resolveFailureMode}). Two pages on the same origin that ship
 * different `onUnavailable` values therefore have different effective
 * behaviour, and must not read each other's cached server mode during an
 * outage. Namespacing on both isolates them.
 *
 * @param publicKey - The integration's public key (origin identity).
 * @param attribute - The integrator's `onUnavailable` override, or null/absent.
 */
function cacheKey(
  publicKey: string,
  attribute?: UnavailableAction | null,
): string {
  return `${CACHE_PREFIX}${publicKey}_${attribute ?? NO_ATTRIBUTE}`;
}

/**
 * Persist the server-configured failure mode so it survives an outage, when the
 * challenge response can no longer be fetched (see {@link readCachedFailureMode}
 * for the read side and {@link resolveFailureMode} for how the cached value is
 * applied).
 *
 * The entry is keyed by `(publicKey, onUnavailable)` so that multiple
 * integrations on one browser, and two configurations of the same integration
 * with different `onUnavailable` overrides, do not collide.
 *
 * If the integrator's `onUnavailable` override conflicts with the server mode
 * being cached (for example the integrator forces `allow` while the server
 * policy is `block`), a one-line warning is emitted. This surfaces a likely
 * misconfiguration without changing behaviour: precedence is still decided by
 * {@link resolveFailureMode} (a locked server policy always wins; an unlocked
 * server policy yields to the integrator). Never throws.
 *
 * @param publicKey - The integration's public key.
 * @param mode - The server-configured failure mode to persist.
 * @param attribute - The integrator's `onUnavailable` override, if any. Used
 *   both as part of the cache key and to detect a conflicting override.
 */
export function cacheServerFailureMode(
  publicKey: string,
  mode: UnavailableAction,
  attribute?: UnavailableAction | null,
): void {
  if (attribute && attribute !== mode) {
    // Not necessarily an error: an unlocked server lets the integrator win on
    // purpose. But a silent mismatch is a frequent source of "why did the gate
    // allow during the outage" confusion, so make it visible.
    console.warn(
      `[AgeGate] onUnavailable override "${attribute}" differs from the ` +
        `server failure mode "${mode}". The override takes precedence unless ` +
        `the server policy is locked.`,
    );
  }
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(cacheKey(publicKey, attribute), mode);
    }
  } catch {
    // localStorage unavailable (private mode, disabled): degrade silently.
  }
}

/**
 * Read the last-known server mode from cache, or null. Must be read with the
 * same `attribute` it was written with (see {@link cacheKey}). Never throws.
 *
 * @param publicKey - The integration's public key.
 * @param attribute - The integrator's `onUnavailable` override, if any.
 */
export function readCachedFailureMode(
  publicKey: string,
  attribute?: UnavailableAction | null,
): UnavailableAction | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const value = localStorage.getItem(cacheKey(publicKey, attribute));
    return isUnavailableAction(value) ? value : null;
  } catch {
    return null;
  }
}
