/**
 * @jest-environment jsdom
 */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT
//
// Coverage tests for SessionCache: isValid(), set(), getRemainingTime(),
// and error-handling paths in get() and clear().

import { SessionCache } from "../src/core/session-cache.js";

const CACHE_KEY = "provii_session_cache";

function validCacheEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 1,
    sessionId: "sess_xyz789",
    verifiedAt: Math.floor(Date.now() / 1000) - 120,
    expiresAt: Math.floor(Date.now() / 1000) + 7200,
    origin: window.location.origin,
    cachedAt: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// isValid()
// ---------------------------------------------------------------------------

describe("SessionCache.isValid", () => {
  it("returns false when there is no cached entry", () => {
    expect(SessionCache.isValid()).toBe(false);
  });

  it("returns true for a valid, non-expired, same-origin entry", () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(validCacheEntry()));
    expect(SessionCache.isValid()).toBe(true);
  });

  it("returns false and clears when the entry is expired", () => {
    const expired = validCacheEntry({
      expiresAt: Math.floor(Date.now() / 1000) - 60,
    });
    localStorage.setItem(CACHE_KEY, JSON.stringify(expired));

    expect(SessionCache.isValid()).toBe(false);
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it("returns false and clears when the origin does not match", () => {
    const differentOrigin = validCacheEntry({ origin: "https://other-site.example.com" });
    localStorage.setItem(CACHE_KEY, JSON.stringify(differentOrigin));

    expect(SessionCache.isValid()).toBe(false);
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it("returns false when cached data is corrupted JSON", () => {
    localStorage.setItem(CACHE_KEY, "not-valid-json{{{");
    expect(SessionCache.isValid()).toBe(false);
  });

  it("returns false when version does not match", () => {
    const wrongVersion = validCacheEntry({ version: 999 });
    localStorage.setItem(CACHE_KEY, JSON.stringify(wrongVersion));
    expect(SessionCache.isValid()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// set()
// ---------------------------------------------------------------------------

describe("SessionCache.set", () => {
  it("stores a session entry in localStorage", () => {
    SessionCache.set({
      sessionId: "sess_set_test",
      verifiedAt: 1000,
      expiresAt: 9999999999,
      origin: "https://localhost",
    });

    const stored = localStorage.getItem(CACHE_KEY);
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.sessionId).toBe("sess_set_test");
    expect(parsed.version).toBe(1);
    expect(typeof parsed.cachedAt).toBe("number");
  });

  it("does not throw when localStorage.setItem throws (quota exceeded)", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new DOMException("QuotaExceededError");
    };

    expect(() =>
      SessionCache.set({
        sessionId: "sess_quota",
        verifiedAt: 1000,
        expiresAt: 9999999999,
        origin: "https://localhost",
      }),
    ).not.toThrow();

    localStorage.setItem = originalSetItem;
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// get() additional edge cases
// ---------------------------------------------------------------------------

describe("SessionCache.get edge cases", () => {
  it("returns null when localStorage is empty", () => {
    expect(SessionCache.get()).toBeNull();
  });

  it("returns null and clears for an array stored in cache", () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify([1, 2, 3]));
    expect(SessionCache.get()).toBeNull();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it("returns null for a null value stored", () => {
    localStorage.setItem(CACHE_KEY, "null");
    expect(SessionCache.get()).toBeNull();
  });

  it("handles localStorage.getItem throwing gracefully", () => {
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = () => {
      throw new Error("SecurityError");
    };

    expect(SessionCache.get()).toBeNull();

    localStorage.getItem = originalGetItem;
  });
});

// ---------------------------------------------------------------------------
// clear()
// ---------------------------------------------------------------------------

describe("SessionCache.clear", () => {
  it("removes the cache entry from localStorage", () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(validCacheEntry()));
    SessionCache.clear();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it("does not throw when localStorage.removeItem throws", () => {
    const originalRemoveItem = localStorage.removeItem;
    localStorage.removeItem = () => {
      throw new DOMException("SecurityError");
    };

    expect(() => SessionCache.clear()).not.toThrow();

    localStorage.removeItem = originalRemoveItem;
  });
});

// ---------------------------------------------------------------------------
// getRemainingTime()
// ---------------------------------------------------------------------------

describe("SessionCache.getRemainingTime", () => {
  it("returns 0 when there is no cached session", () => {
    expect(SessionCache.getRemainingTime()).toBe(0);
  });

  it("returns the remaining seconds for a valid session", () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem(CACHE_KEY, JSON.stringify(validCacheEntry({ expiresAt })));

    const remaining = SessionCache.getRemainingTime();
    // Should be close to 3600, allow 5 seconds tolerance for test execution time
    expect(remaining).toBeGreaterThan(3590);
    expect(remaining).toBeLessThanOrEqual(3600);
  });

  it("returns 0 for an expired session", () => {
    const expiresAt = Math.floor(Date.now() / 1000) - 60;
    localStorage.setItem(CACHE_KEY, JSON.stringify(validCacheEntry({ expiresAt })));

    expect(SessionCache.getRemainingTime()).toBe(0);
  });
});
