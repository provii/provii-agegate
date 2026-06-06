/**
 * @jest-environment jsdom
 */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT

/**
 * Mutation-killing tests for src/core/types.ts runtime exports
 *
 * Targets surviving Stryker mutants in all six runtime exports:
 *  - DEFAULT_RETRY_CONFIG: every numeric property
 *  - ENVIRONMENT_API_ENDPOINTS: both URL strings
 *  - DEFAULT_CLIENT_CONFIG: every property value
 *  - SESSION_COOKIE_NAMES: both cookie name strings
 *  - PKCE_STORAGE_PREFIX: the prefix string
 *  - DEFAULT_POLLING_CONFIG: every numeric property
 *
 * Each assertion pins a single literal value so Stryker cannot replace,
 * remove, or alter any constant without breaking at least one test.
 */

import {
  DEFAULT_RETRY_CONFIG,
  ENVIRONMENT_API_ENDPOINTS,
  DEFAULT_CLIENT_CONFIG,
  SESSION_COOKIE_NAMES,
  PKCE_STORAGE_PREFIX,
  DEFAULT_POLLING_CONFIG,
} from "../src/core/types.js";

// ---------------------------------------------------------------------------
// 1. DEFAULT_RETRY_CONFIG
// ---------------------------------------------------------------------------

describe("DEFAULT_RETRY_CONFIG", () => {
  it("has maxRetries set to 3", () => {
    expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
  });

  it("has maxRetries strictly greater than 2", () => {
    expect(DEFAULT_RETRY_CONFIG.maxRetries).toBeGreaterThan(2);
  });

  it("has maxRetries strictly less than 4", () => {
    expect(DEFAULT_RETRY_CONFIG.maxRetries).toBeLessThan(4);
  });

  it("has initialDelay set to 1000", () => {
    expect(DEFAULT_RETRY_CONFIG.initialDelay).toBe(1000);
  });

  it("has initialDelay not equal to 0", () => {
    expect(DEFAULT_RETRY_CONFIG.initialDelay).not.toBe(0);
  });

  it("has maxDelay set to 10000", () => {
    expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(10000);
  });

  it("has maxDelay strictly greater than initialDelay", () => {
    expect(DEFAULT_RETRY_CONFIG.maxDelay).toBeGreaterThan(
      DEFAULT_RETRY_CONFIG.initialDelay,
    );
  });

  it("has backoffMultiplier set to 2", () => {
    expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
  });

  it("has backoffMultiplier strictly greater than 1", () => {
    expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBeGreaterThan(1);
  });

  it("has exactly four properties", () => {
    expect(Object.keys(DEFAULT_RETRY_CONFIG)).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 2. ENVIRONMENT_API_ENDPOINTS
// ---------------------------------------------------------------------------

describe("ENVIRONMENT_API_ENDPOINTS", () => {
  it("has production set to https://hosted.provii.app", () => {
    expect(ENVIRONMENT_API_ENDPOINTS.production).toBe(
      "https://hosted.provii.app",
    );
  });

  it("has production endpoint starting with https://", () => {
    expect(ENVIRONMENT_API_ENDPOINTS.production).toMatch(/^https:\/\//);
  });

  it("has production endpoint containing 'hosted'", () => {
    expect(ENVIRONMENT_API_ENDPOINTS.production).toContain("hosted");
  });

  it("has sandbox set to https://sandbox-hosted.provii.app", () => {
    expect(ENVIRONMENT_API_ENDPOINTS.sandbox).toBe(
      "https://sandbox-hosted.provii.app",
    );
  });

  it("has sandbox endpoint containing 'sandbox'", () => {
    expect(ENVIRONMENT_API_ENDPOINTS.sandbox).toContain("sandbox");
  });

  it("has production and sandbox endpoints that differ", () => {
    expect(ENVIRONMENT_API_ENDPOINTS.production).not.toBe(
      ENVIRONMENT_API_ENDPOINTS.sandbox,
    );
  });

  it("has exactly two keys", () => {
    expect(Object.keys(ENVIRONMENT_API_ENDPOINTS)).toHaveLength(2);
  });

  it("has keys 'production' and 'sandbox'", () => {
    expect(Object.keys(ENVIRONMENT_API_ENDPOINTS).sort()).toEqual([
      "production",
      "sandbox",
    ]);
  });
});

// ---------------------------------------------------------------------------
// 3. DEFAULT_CLIENT_CONFIG
// ---------------------------------------------------------------------------

describe("DEFAULT_CLIENT_CONFIG", () => {
  it("has environment set to 'production'", () => {
    expect(DEFAULT_CLIENT_CONFIG.environment).toBe("production");
  });

  it("does not have environment set to 'sandbox'", () => {
    expect(DEFAULT_CLIENT_CONFIG.environment).not.toBe("sandbox");
  });

  it("has apiEndpoint matching the production endpoint", () => {
    expect(DEFAULT_CLIENT_CONFIG.apiEndpoint).toBe(
      "https://hosted.provii.app",
    );
  });

  it("has apiEndpoint equal to ENVIRONMENT_API_ENDPOINTS.production", () => {
    expect(DEFAULT_CLIENT_CONFIG.apiEndpoint).toBe(
      ENVIRONMENT_API_ENDPOINTS.production,
    );
  });

  it("has timeout set to 10000", () => {
    expect(DEFAULT_CLIENT_CONFIG.timeout).toBe(10000);
  });

  it("has timeout greater than 0", () => {
    expect(DEFAULT_CLIENT_CONFIG.timeout).toBeGreaterThan(0);
  });

  it("has debug set to false", () => {
    expect(DEFAULT_CLIENT_CONFIG.debug).toBe(false);
  });

  it("has debug strictly equal to false, not a falsy substitute", () => {
    expect(DEFAULT_CLIENT_CONFIG.debug).not.toBeUndefined();
    expect(DEFAULT_CLIENT_CONFIG.debug).not.toBeNull();
    expect(DEFAULT_CLIENT_CONFIG.debug).not.toBe(0);
    expect(DEFAULT_CLIENT_CONFIG.debug).not.toBe("");
  });

  it("has exactly four properties", () => {
    expect(Object.keys(DEFAULT_CLIENT_CONFIG)).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 4. SESSION_COOKIE_NAMES
// ---------------------------------------------------------------------------

describe("SESSION_COOKIE_NAMES", () => {
  it("has production set to '__Host-session'", () => {
    expect(SESSION_COOKIE_NAMES.production).toBe("__Host-session");
  });

  it("has production cookie starting with '__Host-'", () => {
    expect(SESSION_COOKIE_NAMES.production).toMatch(/^__Host-/);
  });

  it("has sandbox set to '__Host-session-sandbox'", () => {
    expect(SESSION_COOKIE_NAMES.sandbox).toBe("__Host-session-sandbox");
  });

  it("has sandbox cookie containing 'sandbox'", () => {
    expect(SESSION_COOKIE_NAMES.sandbox).toContain("sandbox");
  });

  it("has sandbox cookie that is longer than production cookie", () => {
    expect(SESSION_COOKIE_NAMES.sandbox.length).toBeGreaterThan(
      SESSION_COOKIE_NAMES.production.length,
    );
  });

  it("has production and sandbox cookie names that differ", () => {
    expect(SESSION_COOKIE_NAMES.production).not.toBe(
      SESSION_COOKIE_NAMES.sandbox,
    );
  });

  it("has exactly two keys", () => {
    expect(Object.keys(SESSION_COOKIE_NAMES)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 5. PKCE_STORAGE_PREFIX
// ---------------------------------------------------------------------------

describe("PKCE_STORAGE_PREFIX", () => {
  it("equals 'provii_pkce_'", () => {
    expect(PKCE_STORAGE_PREFIX).toBe("provii_pkce_");
  });

  it("starts with 'provii_'", () => {
    expect(PKCE_STORAGE_PREFIX).toMatch(/^provii_/);
  });

  it("ends with an underscore", () => {
    expect(PKCE_STORAGE_PREFIX).toMatch(/_$/);
  });

  it("contains 'pkce'", () => {
    expect(PKCE_STORAGE_PREFIX).toContain("pkce");
  });

  it("has length 12", () => {
    expect(PKCE_STORAGE_PREFIX).toHaveLength(12);
  });

  it("is a non-empty string", () => {
    expect(PKCE_STORAGE_PREFIX.length).toBeGreaterThan(0);
  });

  it("is not an empty string", () => {
    expect(PKCE_STORAGE_PREFIX).not.toBe("");
  });
});

// ---------------------------------------------------------------------------
// 6. DEFAULT_POLLING_CONFIG
// ---------------------------------------------------------------------------

describe("DEFAULT_POLLING_CONFIG", () => {
  it("has initialInterval set to 3000", () => {
    expect(DEFAULT_POLLING_CONFIG.initialInterval).toBe(3000);
  });

  it("has initialInterval greater than 2000 (server rate-limit alignment)", () => {
    expect(DEFAULT_POLLING_CONFIG.initialInterval).toBeGreaterThan(2000);
  });

  it("has initialInterval not equal to 500 (the old unsafe value)", () => {
    expect(DEFAULT_POLLING_CONFIG.initialInterval).not.toBe(500);
  });

  it("has maxInterval set to 10000", () => {
    expect(DEFAULT_POLLING_CONFIG.maxInterval).toBe(10000);
  });

  it("has maxInterval strictly greater than initialInterval", () => {
    expect(DEFAULT_POLLING_CONFIG.maxInterval).toBeGreaterThan(
      DEFAULT_POLLING_CONFIG.initialInterval,
    );
  });

  it("has backoffMultiplier set to 1.3", () => {
    expect(DEFAULT_POLLING_CONFIG.backoffMultiplier).toBe(1.3);
  });

  it("has backoffMultiplier strictly greater than 1", () => {
    expect(DEFAULT_POLLING_CONFIG.backoffMultiplier).toBeGreaterThan(1);
  });

  it("has backoffMultiplier strictly less than 2", () => {
    expect(DEFAULT_POLLING_CONFIG.backoffMultiplier).toBeLessThan(2);
  });

  it("has timeout set to 300000 (5 minutes)", () => {
    expect(DEFAULT_POLLING_CONFIG.timeout).toBe(300000);
  });

  it("has timeout equal to 5 * 60 * 1000", () => {
    expect(DEFAULT_POLLING_CONFIG.timeout).toBe(5 * 60 * 1000);
  });

  it("has timeout strictly greater than maxInterval", () => {
    expect(DEFAULT_POLLING_CONFIG.timeout).toBeGreaterThan(
      DEFAULT_POLLING_CONFIG.maxInterval,
    );
  });

  it("has exactly four properties", () => {
    expect(Object.keys(DEFAULT_POLLING_CONFIG)).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 7. Cross-constant consistency checks
//    These kill mutants that swap values between related constants.
// ---------------------------------------------------------------------------

describe("cross-constant consistency", () => {
  it("DEFAULT_CLIENT_CONFIG.apiEndpoint uses the production URL, not sandbox", () => {
    expect(DEFAULT_CLIENT_CONFIG.apiEndpoint).not.toBe(
      ENVIRONMENT_API_ENDPOINTS.sandbox,
    );
  });

  it("DEFAULT_CLIENT_CONFIG.timeout matches DEFAULT_RETRY_CONFIG.maxDelay", () => {
    // Both are 10000; if Stryker swaps one it breaks the other test
    expect(DEFAULT_CLIENT_CONFIG.timeout).toBe(
      DEFAULT_RETRY_CONFIG.maxDelay,
    );
  });

  it("DEFAULT_RETRY_CONFIG.maxDelay equals DEFAULT_POLLING_CONFIG.maxInterval", () => {
    expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(
      DEFAULT_POLLING_CONFIG.maxInterval,
    );
  });

  it("DEFAULT_POLLING_CONFIG.backoffMultiplier differs from DEFAULT_RETRY_CONFIG.backoffMultiplier", () => {
    // 1.3 vs 2
    expect(DEFAULT_POLLING_CONFIG.backoffMultiplier).not.toBe(
      DEFAULT_RETRY_CONFIG.backoffMultiplier,
    );
  });

  it("SESSION_COOKIE_NAMES.sandbox includes SESSION_COOKIE_NAMES.production as a prefix", () => {
    expect(SESSION_COOKIE_NAMES.sandbox).toMatch(
      new RegExp(`^${SESSION_COOKIE_NAMES.production}`),
    );
  });
});
