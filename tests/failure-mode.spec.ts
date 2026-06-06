/**
 * @jest-environment jsdom
 */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT

/**
 * Tests for the server/integrator failure-mode resolution precedence.
 * Safety invariant: with no signal at all, the resolved mode is `block`.
 */

import {
  resolveFailureMode,
  cacheServerFailureMode,
  readCachedFailureMode,
} from "../src/core/failure-mode.js";

describe("resolveFailureMode precedence", () => {
  it("a LOCKED server mode overrides the integrator attribute", () => {
    expect(
      resolveFailureMode({
        server: { mode: "block", locked: true },
        attribute: "allow",
      }),
    ).toBe("block");
  });

  it("the integrator attribute wins when the server is unlocked", () => {
    expect(
      resolveFailureMode({
        server: { mode: "block", locked: false },
        attribute: "allow",
      }),
    ).toBe("allow");
  });

  it("the server default applies when the integrator set nothing", () => {
    expect(
      resolveFailureMode({
        server: { mode: "defer", locked: false },
        attribute: null,
      }),
    ).toBe("defer");
  });

  it("falls back to the CACHED server mode during an outage (no live server, no attribute)", () => {
    expect(
      resolveFailureMode({
        server: null,
        attribute: null,
        cachedServerMode: "allow",
      }),
    ).toBe("allow");
  });

  it("a live attribute still beats a stale cached server mode (server unlocked/absent)", () => {
    expect(
      resolveFailureMode({
        server: null,
        attribute: "defer",
        cachedServerMode: "allow",
      }),
    ).toBe("defer");
  });

  it("fails CLOSED with block when there is no signal at all", () => {
    expect(resolveFailureMode({})).toBe("block");
  });

  it("a null server mode does not count as a server signal", () => {
    expect(
      resolveFailureMode({ server: { mode: null, locked: true } }),
    ).toBe("block");
  });
});

describe("failure-mode cache", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a cached mode keyed by public key", () => {
    cacheServerFailureMode("pk_live_a", "allow");
    expect(readCachedFailureMode("pk_live_a")).toBe("allow");
    expect(readCachedFailureMode("pk_live_b")).toBeNull();
  });

  it("returns null for absent or corrupt cache entries", () => {
    expect(readCachedFailureMode("pk_missing")).toBeNull();
    // Legacy/foreign key shape is ignored; the keyed entry is what is read.
    localStorage.setItem("provii_failure_mode_pk_bad", "garbage");
    expect(readCachedFailureMode("pk_bad")).toBeNull();
  });
});

describe("M19: failure-mode cache keyed by (publicKey, onUnavailable)", () => {
  beforeEach(() => localStorage.clear());

  it("isolates entries by the onUnavailable attribute on the same public key", () => {
    cacheServerFailureMode("pk_a", "allow", "defer");
    cacheServerFailureMode("pk_a", "block", "allow");

    // Each (publicKey, attribute) pair has its own slot; they do not collide.
    expect(readCachedFailureMode("pk_a", "defer")).toBe("allow");
    expect(readCachedFailureMode("pk_a", "allow")).toBe("block");
  });

  it("the no-attribute slot is distinct from any attribute slot", () => {
    cacheServerFailureMode("pk_a", "allow"); // no attribute
    cacheServerFailureMode("pk_a", "block", "defer");

    expect(readCachedFailureMode("pk_a")).toBe("allow");
    expect(readCachedFailureMode("pk_a", "defer")).toBe("block");
    // Reading the no-attribute slot with an attribute misses (different key).
    expect(readCachedFailureMode("pk_a", "allow")).toBeNull();
  });

  it("a read with the wrong attribute does not see another attribute's value", () => {
    cacheServerFailureMode("pk_a", "allow", "defer");
    expect(readCachedFailureMode("pk_a", "block")).toBeNull();
    expect(readCachedFailureMode("pk_a")).toBeNull();
  });

  it("null and undefined attributes map to the same (no-override) slot", () => {
    cacheServerFailureMode("pk_a", "allow", null);
    expect(readCachedFailureMode("pk_a", undefined)).toBe("allow");
    expect(readCachedFailureMode("pk_a")).toBe("allow");
  });

  it("round-trips every concrete attribute value", () => {
    for (const attr of ["block", "allow", "defer"] as const) {
      cacheServerFailureMode("pk_r", "defer", attr);
      expect(readCachedFailureMode("pk_r", attr)).toBe("defer");
    }
  });
});

describe("M19: conflict warning when the override differs from the server mode", () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    localStorage.clear();
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it("warns when the integrator override conflicts with the server mode", () => {
    cacheServerFailureMode("pk_a", "block", "allow");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("allow");
    expect(warn.mock.calls[0][0]).toContain("block");
    // The server value is still what gets cached (precedence is decided later).
    expect(readCachedFailureMode("pk_a", "allow")).toBe("block");
  });

  it("does NOT warn when the override matches the server mode", () => {
    cacheServerFailureMode("pk_a", "allow", "allow");
    expect(warn).not.toHaveBeenCalled();
  });

  it("does NOT warn when there is no override", () => {
    cacheServerFailureMode("pk_a", "block");
    cacheServerFailureMode("pk_b", "block", null);
    expect(warn).not.toHaveBeenCalled();
  });

  it("still caches even when warning (localStorage write is not skipped)", () => {
    cacheServerFailureMode("pk_a", "defer", "block");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(readCachedFailureMode("pk_a", "block")).toBe("defer");
  });
});
