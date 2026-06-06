// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Browser-side session cache backed by localStorage.
 *
 * Caches non-sensitive session metadata (session ID, timestamps, origin) for
 * instant client-side validation. This saves 100-300ms on page load for
 * returning users by avoiding an API round-trip to `/session/check`.
 *
 * The cache never stores JWT tokens, PKCE verifiers, or any secret material.
 *
 * @module core/session-cache
 */

/** Non-sensitive session metadata stored in the cache. */
interface CachedSession {
  sessionId: string;
  verifiedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
  origin: string;
}

const CACHE_KEY = "provii_session_cache";
const CACHE_VERSION = 1;

/**
 * Session Cache Manager
 *
 * Provides instant client-side session validation by caching non-sensitive
 * session metadata in localStorage. This allows returning users to skip
 * the API verification call on page load.
 */
export class SessionCache {
  /**
   * Check if there's a valid cached session
   *
   * Validates:
   * - Cache exists and is parseable
   * - Cache version matches
   * - Session has not expired
   * - Origin matches current page
   *
   * ST-AG-005: This cache is a UX optimisation only. It relies on
   * client-side Date.now() and localStorage, both of which are
   * under the user's control. The server ALWAYS validates session
   * state independently via the /session/check endpoint and HttpOnly
   * cookies. A tampered or stale cache can only affect the client-side
   * "skip the loading spinner" fast path, never the security decision.
   *
   * @returns True if cache appears valid (server still authoritative)
   */
  static isValid(): boolean {
    const cached = this.get();
    if (!cached) return false;

    // Check expiration (client-side estimate; server is authoritative)
    if (Date.now() > cached.expiresAt * 1000) {
      this.clear();
      return false;
    }

    // Check origin matches current page
    if (
      typeof window !== "undefined" &&
      cached.origin !== window.location.origin
    ) {
      this.clear();
      return false;
    }

    return true;
  }

  /**
   * Store session in cache
   *
   * Caches non-sensitive session data to localStorage. Only stores:
   * - Session ID (public identifier)
   * - Timestamps (public metadata)
   * - Origin (public metadata)
   *
   * NEVER caches:
   * - JWT tokens
   * - PKCE verifiers
   * - Any secrets or credentials
   *
   * @param session Session data to cache
   */
  static set(session: CachedSession): void {
    try {
      const data = {
        version: CACHE_VERSION,
        ...session,
        cachedAt: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage might be disabled or full
      console.warn("[SessionCache] Failed to cache session:", e);
    }
  }

  /**
   * Get cached session
   *
   * Retrieves cached session data if available. Returns null if:
   * - No cache exists
   * - Cache is corrupted/unparseable
   * - Cache version mismatch
   *
   * @returns Cached session data or null
   */
  static get(): CachedSession | null {
    try {
      const data = localStorage.getItem(CACHE_KEY);
      if (!data) return null;

      const raw: unknown = JSON.parse(data);

      // Guard against prototype pollution from crafted localStorage values.
      // Copy only known fields onto a null-prototype object.
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        this.clear();
        return null;
      }

      const source = raw as Record<string, unknown>;
      if (source["version"] !== CACHE_VERSION) {
        this.clear();
        return null;
      }

      if (
        typeof source["sessionId"] !== "string" ||
        typeof source["verifiedAt"] !== "number" ||
        typeof source["expiresAt"] !== "number" ||
        typeof source["origin"] !== "string" ||
        !Number.isFinite(source["expiresAt"]) ||
        !Number.isFinite(source["verifiedAt"])
      ) {
        this.clear();
        return null;
      }

      // Build a clean object with no inherited prototype properties
      const safe: CachedSession = Object.assign(Object.create(null), {
        sessionId: source["sessionId"],
        verifiedAt: source["verifiedAt"],
        expiresAt: source["expiresAt"],
        origin: source["origin"],
      });

      return safe;
    } catch {
      // Parse error or localStorage unavailable
      return null;
    }
  }

  /**
   * Clear cached session
   *
   * Removes session cache from localStorage. Safe to call even if
   * localStorage is unavailable or cache doesn't exist.
   */
  static clear(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // localStorage might be disabled
    }
  }

  /**
   * Get remaining validity time in seconds
   *
   * Useful for UI indicators or background revalidation timing.
   *
   * @returns Remaining seconds until expiration, or 0 if no cache
   */
  static getRemainingTime(): number {
    const cached = this.get();
    if (!cached) return 0;
    return Math.max(0, cached.expiresAt - Math.floor(Date.now() / 1000));
  }
}
