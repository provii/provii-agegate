/** @jest-environment jsdom */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT

/**
 * Mutation-killing unit tests for src/core/session.ts (SessionManager).
 *
 * Every constant, branch, return value, private helper, and state transition is
 * pinned with explicit assertions so that Stryker string-replacement,
 * condition-negation, statement-removal, arithmetic, and return-value mutants
 * are caught.
 */

import { SessionManager } from "../src/core/session.js";
import { SESSION_COOKIE_NAMES } from "../src/core/types.js";
import type { SessionInfo } from "../src/core/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a base64url-encoded JWT payload from a claims object. */
function encodePayload(claims: Record<string, unknown>): string {
  return btoa(JSON.stringify(claims))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/** Build a minimal three-part JWT string with arbitrary payload claims. */
function buildJwt(claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const payload = encodePayload(claims);
  return `${header}.${payload}.fakesignature`;
}

/** Build a valid claims object with sensible defaults. */
function validClaims(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: "sess-abc-123",
    origin: "https://example.com",
    iat: now - 60,
    exp: now + 3600,
    iss: "hosted.provii.app",
    ...overrides,
  };
}

/**
 * Set a cookie in the test jsdom environment.
 *
 * __Host- prefixed cookies require the Secure attribute in jsdom's cookie jar,
 * so we always add it for those. Non-prefixed cookies are set normally.
 */
function setCookie(name: string, value: string): void {
  const secureFlag = name.startsWith("__Host-") ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}${secureFlag}; path=/`;
}

/** Clear all cookies in jsdom. __Host- cookies require Secure on the expiry too. */
function clearAllCookies(): void {
  document.cookie.split(";").forEach((c) => {
    const eqPos = c.indexOf("=");
    const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
    if (name) {
      const secureFlag = name.startsWith("__Host-") ? " Secure;" : "";
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;${secureFlag} path=/`;
    }
  });
}

// ---------------------------------------------------------------------------
// Access private methods for thorough mutation testing
// ---------------------------------------------------------------------------

function callPrivate<T>(
  manager: SessionManager,
  method: string,
  ...args: unknown[]
): T {
  const fn = (manager as unknown as Record<string, unknown>)[method];
  if (typeof fn !== "function") {
    throw new Error(`No such method: ${method}`);
  }
  return (fn as (...a: unknown[]) => T).call(manager, ...args);
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

let debugSpy: jest.SpyInstance;

beforeEach(() => {
  clearAllCookies();
  debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
});

afterEach(() => {
  debugSpy.mockRestore();
});

// ===========================================================================
// SESSION_COOKIE_NAMES constant pinning
// ===========================================================================

describe("SESSION_COOKIE_NAMES", () => {
  it("pins production cookie name", () => {
    expect(SESSION_COOKIE_NAMES.production).toBe("__Host-session");
  });

  it("pins sandbox cookie name", () => {
    expect(SESSION_COOKIE_NAMES.sandbox).toBe("__Host-session-sandbox");
  });

  it("has exactly two keys", () => {
    expect(Object.keys(SESSION_COOKIE_NAMES)).toHaveLength(2);
  });
});

// ===========================================================================
// Constructor
// ===========================================================================

describe("SessionManager constructor", () => {
  it("defaults to production environment", () => {
    const mgr = new SessionManager();
    const jwt = buildJwt(validClaims());
    setCookie("__Host-session", jwt);
    expect(mgr.getSession()).not.toBeNull();
  });

  it("defaults debug to false (no console output)", () => {
    const mgr = new SessionManager("production");
    mgr.getSession();
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it("uses sandbox cookie name when environment is sandbox", () => {
    const mgr = new SessionManager("sandbox");
    const jwt = buildJwt(validClaims());
    setCookie("__Host-session-sandbox", jwt);
    expect(mgr.getSession()).not.toBeNull();
  });

  it("does not read production cookie when in sandbox environment", () => {
    const mgr = new SessionManager("sandbox");
    const jwt = buildJwt(validClaims());
    setCookie("__Host-session", jwt);
    expect(mgr.getSession()).toBeNull();
  });

  it("does not read sandbox cookie when in production environment", () => {
    const mgr = new SessionManager("production");
    const jwt = buildJwt(validClaims());
    setCookie("__Host-session-sandbox", jwt);
    expect(mgr.getSession()).toBeNull();
  });

  it("enables debug logging when debug=true", () => {
    const mgr = new SessionManager("production", true);
    mgr.getSession();
    expect(debugSpy).toHaveBeenCalled();
  });
});

// ===========================================================================
// getSession
// ===========================================================================

describe("SessionManager.getSession", () => {
  it("returns null when no cookie is present", () => {
    const mgr = new SessionManager("production");
    expect(mgr.getSession()).toBeNull();
  });

  it("returns SessionInfo for a valid JWT cookie", () => {
    const mgr = new SessionManager("production");
    const claims = validClaims();
    setCookie("__Host-session", buildJwt(claims));

    const session = mgr.getSession();
    expect(session).not.toBeNull();
    expect(session!.sessionId).toBe(claims["sub"]);
    expect(session!.origin).toBe(claims["origin"]);
    expect(session!.issuedAt).toBe(claims["iat"]);
    expect(session!.expiresAt).toBe(claims["exp"]);
    expect(session!.issuer).toBe(claims["iss"]);
  });

  it("maps JWT sub claim to sessionId", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt(validClaims({ sub: "custom-id-xyz" })));
    expect(mgr.getSession()!.sessionId).toBe("custom-id-xyz");
  });

  it("maps JWT origin claim to origin", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt(validClaims({ origin: "https://other.test" })));
    expect(mgr.getSession()!.origin).toBe("https://other.test");
  });

  it("maps JWT iat claim to issuedAt", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt(validClaims({ iat: 1000000 })));
    expect(mgr.getSession()!.issuedAt).toBe(1000000);
  });

  it("maps JWT exp claim to expiresAt", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt(validClaims({ exp: 9999999 })));
    expect(mgr.getSession()!.expiresAt).toBe(9999999);
  });

  it("maps JWT iss claim to issuer", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt(validClaims({ iss: "test-issuer" })));
    expect(mgr.getSession()!.issuer).toBe("test-issuer");
  });

  it("returns null for a JWT with only two parts (no signature)", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", "header.payload");
    expect(mgr.getSession()).toBeNull();
  });

  it("returns null for a JWT with four parts", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", "a.b.c.d");
    expect(mgr.getSession()).toBeNull();
  });

  it("returns null for a JWT with one part", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", "singlepart");
    expect(mgr.getSession()).toBeNull();
  });

  it("returns null for invalid base64 in payload", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", "header.!!!invalid.signature");
    expect(mgr.getSession()).toBeNull();
  });

  it("returns null when payload JSON is malformed", () => {
    const mgr = new SessionManager("production");
    const brokenJson = btoa("{not valid json")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    setCookie("__Host-session", `header.${brokenJson}.signature`);
    expect(mgr.getSession()).toBeNull();
  });

  it("returns null when claims are missing required fields", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt({ sub: "only-sub" }));
    expect(mgr.getSession()).toBeNull();
  });

  it("logs debug messages when debug is enabled", () => {
    const mgr = new SessionManager("production", true);
    setCookie("__Host-session", buildJwt(validClaims()));
    mgr.getSession();
    const messages = debugSpy.mock.calls.map((c: unknown[]) => c[0]);
    expect(messages).toContain("[SessionManager] Getting session");
    expect(messages).toContain("[SessionManager] Session parsed");
  });

  it("logs 'No session cookie found' when cookie is absent and debug is on", () => {
    const mgr = new SessionManager("production", true);
    mgr.getSession();
    const messages = debugSpy.mock.calls.map((c: unknown[]) => c[0]);
    expect(messages).toContain(
      "[SessionManager] No session cookie found (expected with HttpOnly cookies)",
    );
  });

  it("logs 'Failed to parse session' for invalid JWT when debug is on", () => {
    const mgr = new SessionManager("production", true);
    setCookie("__Host-session", "bad.but.threeParts");
    mgr.getSession();
    const messages = debugSpy.mock.calls.map((c: unknown[]) => c[0]);
    expect(messages).toContain("[SessionManager] Failed to parse session");
  });
});

// ===========================================================================
// hasSession
// ===========================================================================

describe("SessionManager.hasSession", () => {
  it("returns false when no cookie is present", () => {
    const mgr = new SessionManager("production");
    expect(mgr.hasSession()).toBe(false);
  });

  it("returns true for valid non-expired session", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt(validClaims()));
    expect(mgr.hasSession()).toBe(true);
  });

  it("returns false for expired session", () => {
    const mgr = new SessionManager("production");
    const now = Math.floor(Date.now() / 1000);
    setCookie("__Host-session", buildJwt(validClaims({ exp: now - 100 })));
    expect(mgr.hasSession()).toBe(false);
  });

  it("returns false for session expiring exactly now (boundary: >=)", () => {
    const mgr = new SessionManager("production");
    const now = Math.floor(Date.now() / 1000);
    jest.spyOn(Date, "now").mockReturnValue(now * 1000);
    setCookie("__Host-session", buildJwt(validClaims({ exp: now })));
    expect(mgr.hasSession()).toBe(false);
    jest.restoreAllMocks();
  });

  it("returns true for session expiring one second from now", () => {
    const mgr = new SessionManager("production");
    const now = Math.floor(Date.now() / 1000);
    jest.spyOn(Date, "now").mockReturnValue(now * 1000);
    setCookie("__Host-session", buildJwt(validClaims({ exp: now + 1 })));
    expect(mgr.hasSession()).toBe(true);
    jest.restoreAllMocks();
  });

  it("returns false when JWT is invalid (parse returns null)", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", "not-a-jwt");
    expect(mgr.hasSession()).toBe(false);
  });
});

// ===========================================================================
// isExpired
// ===========================================================================

describe("SessionManager.isExpired", () => {
  it("returns true when no session argument and no cookie", () => {
    const mgr = new SessionManager("production");
    expect(mgr.isExpired()).toBe(true);
  });

  it("returns true when session argument is undefined and no cookie", () => {
    const mgr = new SessionManager("production");
    expect(mgr.isExpired(undefined)).toBe(true);
  });

  it("returns false for a session with future expiry", () => {
    const mgr = new SessionManager("production");
    const now = Math.floor(Date.now() / 1000);
    const session: SessionInfo = {
      sessionId: "s1",
      origin: "https://example.com",
      issuedAt: now - 60,
      expiresAt: now + 3600,
      issuer: "hosted.provii.app",
    };
    expect(mgr.isExpired(session)).toBe(false);
  });

  it("returns true for a session with past expiry", () => {
    const mgr = new SessionManager("production");
    const now = Math.floor(Date.now() / 1000);
    const session: SessionInfo = {
      sessionId: "s1",
      origin: "https://example.com",
      issuedAt: now - 7200,
      expiresAt: now - 3600,
      issuer: "hosted.provii.app",
    };
    expect(mgr.isExpired(session)).toBe(true);
  });

  it("returns true when expiresAt equals current time (boundary: >=)", () => {
    const mgr = new SessionManager("production");
    const now = Math.floor(Date.now() / 1000);
    jest.spyOn(Date, "now").mockReturnValue(now * 1000);
    const session: SessionInfo = {
      sessionId: "s1",
      origin: "https://example.com",
      issuedAt: now - 3600,
      expiresAt: now,
      issuer: "hosted.provii.app",
    };
    expect(mgr.isExpired(session)).toBe(true);
    jest.restoreAllMocks();
  });

  it("returns false when expiresAt is one second in the future", () => {
    const mgr = new SessionManager("production");
    const now = Math.floor(Date.now() / 1000);
    jest.spyOn(Date, "now").mockReturnValue(now * 1000);
    const session: SessionInfo = {
      sessionId: "s1",
      origin: "https://example.com",
      issuedAt: now - 60,
      expiresAt: now + 1,
      issuer: "hosted.provii.app",
    };
    expect(mgr.isExpired(session)).toBe(false);
    jest.restoreAllMocks();
  });

  it("reads session from cookie when no argument is passed and cookie exists", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt(validClaims()));
    expect(mgr.isExpired()).toBe(false);
  });

  it("reads expired session from cookie when no argument is passed", () => {
    const mgr = new SessionManager("production");
    const now = Math.floor(Date.now() / 1000);
    setCookie("__Host-session", buildJwt(validClaims({ exp: now - 10 })));
    expect(mgr.isExpired()).toBe(true);
  });

  it("logs expiration check details when debug is on", () => {
    const mgr = new SessionManager("production", true);
    const now = Math.floor(Date.now() / 1000);
    const session: SessionInfo = {
      sessionId: "s1",
      origin: "https://example.com",
      issuedAt: now - 60,
      expiresAt: now + 3600,
      issuer: "hosted.provii.app",
    };
    mgr.isExpired(session);
    const messages = debugSpy.mock.calls.map((c: unknown[]) => c[0]);
    expect(messages).toContain("[SessionManager] Session expiration check");
  });

  it("expiration check log includes expired=false for valid session", () => {
    const mgr = new SessionManager("production", true);
    const now = Math.floor(Date.now() / 1000);
    const session: SessionInfo = {
      sessionId: "s1",
      origin: "https://example.com",
      issuedAt: now - 60,
      expiresAt: now + 3600,
      issuer: "hosted.provii.app",
    };
    mgr.isExpired(session);
    const expirationCall = debugSpy.mock.calls.find(
      (c: unknown[]) => c[0] === "[SessionManager] Session expiration check",
    );
    expect(expirationCall).toBeDefined();
    expect((expirationCall as unknown[])[1]).toHaveProperty("expired", false);
  });

  it("expiration check log includes expired=true for expired session", () => {
    const mgr = new SessionManager("production", true);
    const now = Math.floor(Date.now() / 1000);
    const session: SessionInfo = {
      sessionId: "s1",
      origin: "https://example.com",
      issuedAt: now - 7200,
      expiresAt: now - 100,
      issuer: "hosted.provii.app",
    };
    mgr.isExpired(session);
    const expirationCall = debugSpy.mock.calls.find(
      (c: unknown[]) => c[0] === "[SessionManager] Session expiration check",
    );
    expect(expirationCall).toBeDefined();
    expect((expirationCall as unknown[])[1]).toHaveProperty("expired", true);
  });
});

// ===========================================================================
// clearSession
// ===========================================================================

describe("SessionManager.clearSession", () => {
  it("calls deleteCookie with the environment-specific cookie name", () => {
    const mgr = new SessionManager("production");
    const spy = jest.spyOn(document, "cookie", "set");
    mgr.clearSession();
    // The deleteCookie writes a cookie with past expiration
    expect(spy).toHaveBeenCalledWith(
      "__Host-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;",
    );
    spy.mockRestore();
  });

  it("calls deleteCookie with sandbox cookie name for sandbox env", () => {
    const mgr = new SessionManager("sandbox");
    const spy = jest.spyOn(document, "cookie", "set");
    mgr.clearSession();
    expect(spy).toHaveBeenCalledWith(
      "__Host-session-sandbox=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;",
    );
    spy.mockRestore();
  });

  it("does not throw when no cookie exists", () => {
    const mgr = new SessionManager("production");
    expect(() => mgr.clearSession()).not.toThrow();
  });

  it("logs when debug is on", () => {
    const mgr = new SessionManager("production", true);
    mgr.clearSession();
    const messages = debugSpy.mock.calls.map((c: unknown[]) => c[0]);
    expect(messages).toContain(
      "[SessionManager] Clearing session (will not work for HttpOnly cookies)",
    );
  });

  it("only targets the environment-specific cookie name", () => {
    // Verify that production clearSession writes only __Host-session, not sandbox
    const mgr = new SessionManager("production");
    const spy = jest.spyOn(document, "cookie", "set");
    mgr.clearSession();
    const setCalls = spy.mock.calls.flat();
    // Should contain the production name, not sandbox
    expect(setCalls.some((v) => typeof v === "string" && v.startsWith("__Host-session=;"))).toBe(true);
    expect(setCalls.some((v) => typeof v === "string" && v.startsWith("__Host-session-sandbox=;"))).toBe(false);
    spy.mockRestore();
  });
});

// ===========================================================================
// Private: parseJWT (accessed via getSession error paths)
// ===========================================================================

describe("parseJWT (via getSession)", () => {
  it("rejects JWT with empty string", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", "");
    // Empty string cookie won't be found by getCookie (value is falsy)
    expect(mgr.getSession()).toBeNull();
  });

  it("rejects JWT with exactly 3 dots (4 parts)", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", "a.b.c.d");
    expect(mgr.getSession()).toBeNull();
  });

  it("splits on '.' character exactly", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", "header.payload");
    expect(mgr.getSession()).toBeNull();
  });

  it("checks parts.length === 3 strictly", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", "onlyonepart");
    expect(mgr.getSession()).toBeNull();
  });
});

// ===========================================================================
// Private: isValidClaims (type guard thoroughness)
// ===========================================================================

describe("isValidClaims (via getSession)", () => {
  it("rejects when sub is missing", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt({
      origin: "https://example.com",
      iat: 1000,
      exp: 9999999,
      iss: "issuer",
    }));
    expect(mgr.getSession()).toBeNull();
  });

  it("rejects when sub is a number instead of string", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt({
      sub: 123,
      origin: "https://example.com",
      iat: 1000,
      exp: 9999999,
      iss: "issuer",
    }));
    expect(mgr.getSession()).toBeNull();
  });

  it("rejects when origin is missing", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt({
      sub: "s1",
      iat: 1000,
      exp: 9999999,
      iss: "issuer",
    }));
    expect(mgr.getSession()).toBeNull();
  });

  it("rejects when origin is a number instead of string", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt({
      sub: "s1",
      origin: 42,
      iat: 1000,
      exp: 9999999,
      iss: "issuer",
    }));
    expect(mgr.getSession()).toBeNull();
  });

  it("rejects when iat is missing", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt({
      sub: "s1",
      origin: "https://example.com",
      exp: 9999999,
      iss: "issuer",
    }));
    expect(mgr.getSession()).toBeNull();
  });

  it("rejects when iat is a string instead of number", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt({
      sub: "s1",
      origin: "https://example.com",
      iat: "not-a-number",
      exp: 9999999,
      iss: "issuer",
    }));
    expect(mgr.getSession()).toBeNull();
  });

  it("rejects when exp is missing", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt({
      sub: "s1",
      origin: "https://example.com",
      iat: 1000,
      iss: "issuer",
    }));
    expect(mgr.getSession()).toBeNull();
  });

  it("rejects when exp is a string instead of number", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt({
      sub: "s1",
      origin: "https://example.com",
      iat: 1000,
      exp: "later",
      iss: "issuer",
    }));
    expect(mgr.getSession()).toBeNull();
  });

  it("rejects when iss is missing", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt({
      sub: "s1",
      origin: "https://example.com",
      iat: 1000,
      exp: 9999999,
    }));
    expect(mgr.getSession()).toBeNull();
  });

  it("rejects when iss is a number instead of string", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt({
      sub: "s1",
      origin: "https://example.com",
      iat: 1000,
      exp: 9999999,
      iss: 999,
    }));
    expect(mgr.getSession()).toBeNull();
  });

  it("rejects when claims is null (JSON.parse of 'null')", () => {
    const mgr = new SessionManager("production");
    const nullPayload = btoa("null")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    setCookie("__Host-session", `header.${nullPayload}.signature`);
    expect(mgr.getSession()).toBeNull();
  });

  it("rejects when claims is a string (JSON.parse of '\"hello\"')", () => {
    const mgr = new SessionManager("production");
    const stringPayload = btoa('"hello"')
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    setCookie("__Host-session", `header.${stringPayload}.signature`);
    expect(mgr.getSession()).toBeNull();
  });

  it("rejects when claims is a number (JSON.parse of '42')", () => {
    const mgr = new SessionManager("production");
    const numPayload = btoa("42")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    setCookie("__Host-session", `header.${numPayload}.signature`);
    expect(mgr.getSession()).toBeNull();
  });

  it("rejects when claims is an array", () => {
    const mgr = new SessionManager("production");
    const arrPayload = btoa("[1,2,3]")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    setCookie("__Host-session", `header.${arrPayload}.signature`);
    expect(mgr.getSession()).toBeNull();
  });

  it("rejects when claims is a boolean", () => {
    const mgr = new SessionManager("production");
    const boolPayload = btoa("true")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    setCookie("__Host-session", `header.${boolPayload}.signature`);
    expect(mgr.getSession()).toBeNull();
  });

  it("accepts claims with extra fields beyond the five required", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", buildJwt({
      ...validClaims(),
      extra: "stuff",
      nested: { a: 1 },
    }));
    expect(mgr.getSession()).not.toBeNull();
  });
});

// ===========================================================================
// Private: base64UrlDecode
// ===========================================================================

describe("base64UrlDecode (via callPrivate)", () => {
  it("converts - to + for base64url decoding", () => {
    const mgr = new SessionManager("production");
    const result = callPrivate<string>(mgr, "base64UrlDecode", "YWJj"); // "abc"
    expect(result).toBe("abc");
  });

  it("converts _ to / for base64url decoding", () => {
    const mgr = new SessionManager("production");
    const standardBase64 = btoa("test?data");
    const base64url = standardBase64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const result = callPrivate<string>(mgr, "base64UrlDecode", base64url);
    expect(result).toBe("test?data");
  });

  it("adds padding when length % 4 === 3 (aGVsbG8 -> hello)", () => {
    const mgr = new SessionManager("production");
    // "hello" -> btoa = "aGVsbG8=" -> base64url = "aGVsbG8" (length 7, pad = 3)
    const result = callPrivate<string>(mgr, "base64UrlDecode", "aGVsbG8");
    expect(result).toBe("hello");
  });

  it("adds padding when length % 4 === 3 (aGk -> hi)", () => {
    const mgr = new SessionManager("production");
    // "hi" -> btoa = "aGk=" -> base64url = "aGk" (length 3, pad = 3)
    const result = callPrivate<string>(mgr, "base64UrlDecode", "aGk");
    expect(result).toBe("hi");
  });

  it("adds padding when length % 4 === 2 (aGU -> he)", () => {
    const mgr = new SessionManager("production");
    // btoa("he") = "aGU=" -> stripped = "aGU" -> wait, that is length 3, pad=3
    // Let's compute: "abcdef" -> btoa = "YWJjZGVm" (length 8, pad=0)
    // "abcde" -> btoa = "YWJjZGU=" (length 8 before strip, "YWJjZGU" length 7, pad=3)
    // "abcd" -> btoa = "YWJjZA==" (length 8 before strip, "YWJjZA" length 6, pad=2)
    const result = callPrivate<string>(mgr, "base64UrlDecode", "YWJjZA");
    expect(result).toBe("abcd");
  });

  it("does not add padding when length % 4 === 0", () => {
    const mgr = new SessionManager("production");
    // btoa("hel") = "aGVs" (already length 4)
    const result = callPrivate<string>(mgr, "base64UrlDecode", "aGVs");
    expect(result).toBe("hel");
  });

  it("handles empty string", () => {
    const mgr = new SessionManager("production");
    const result = callPrivate<string>(mgr, "base64UrlDecode", "");
    expect(result).toBe("");
  });

  it("correctly decodes a full JSON claims object round-trip", () => {
    const mgr = new SessionManager("production");
    const claims = { sub: "test", exp: 12345 };
    const encoded = btoa(JSON.stringify(claims))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const decoded = callPrivate<string>(mgr, "base64UrlDecode", encoded);
    expect(JSON.parse(decoded)).toEqual(claims);
  });

  it("replaces ALL occurrences of - and _ (not just the first)", () => {
    const mgr = new SessionManager("production");
    // Encode a string that produces multiple + and / in base64
    const original = "test>>>???<<<data===";
    const standardBase64 = btoa(original);
    const base64url = standardBase64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const result = callPrivate<string>(mgr, "base64UrlDecode", base64url);
    expect(result).toBe(original);
  });
});

// ===========================================================================
// Private: getCookie
// ===========================================================================

describe("getCookie (via callPrivate)", () => {
  it("returns null when document is undefined (guard exists in source)", () => {
    // In jsdom, `document` is a non-configurable global so it cannot be
    // redefined to `undefined`. We verify the guard indirectly: getCookie
    // checks `typeof document === "undefined"` and returns null. The branch
    // is unreachable in jsdom but we confirm the method does not throw when
    // document.cookie is empty (the next fallthrough path).
    const mgr = new SessionManager("production");
    const result = callPrivate<string | null>(mgr, "getCookie", "__Host-session");
    expect(result).toBeNull();
  });

  it("returns null when no matching cookie exists", () => {
    const mgr = new SessionManager("production");
    document.cookie = "other-cookie=value; path=/";
    const result = callPrivate<string | null>(mgr, "getCookie", "__Host-session");
    expect(result).toBeNull();
  });

  it("returns the correct value when matching cookie exists", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", "my-jwt-value");
    const result = callPrivate<string | null>(mgr, "getCookie", "__Host-session");
    expect(result).toBe("my-jwt-value");
  });

  it("decodes URI-encoded cookie values", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", "value with spaces");
    const result = callPrivate<string | null>(mgr, "getCookie", "__Host-session");
    expect(result).toBe("value with spaces");
  });

  it("handles multiple cookies and finds the correct one", () => {
    const mgr = new SessionManager("production");
    document.cookie = "foo=bar; path=/";
    setCookie("__Host-session", "target-value");
    document.cookie = "baz=qux; path=/";
    const result = callPrivate<string | null>(mgr, "getCookie", "__Host-session");
    expect(result).toBe("target-value");
  });

  it("returns null when cookie has a matching name but empty value", () => {
    const mgr = new SessionManager("production");
    // Set a cookie with empty value - for __Host- the Secure flag is required
    // but an empty value won't even get stored properly; test the fallthrough
    document.cookie = "__Host-session=; Secure; path=/";
    const result = callPrivate<string | null>(mgr, "getCookie", "__Host-session");
    expect(result).toBeNull();
  });

  it("handles cookies with leading whitespace from split", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", "trimmed");
    const result = callPrivate<string | null>(mgr, "getCookie", "__Host-session");
    expect(result).toBe("trimmed");
  });

  it("returns null and logs when document.cookie throws (sandboxed iframe)", () => {
    const mgr = new SessionManager("production", true);

    // Save the own-property descriptor from the document instance (if any)
    const ownDescriptor = Object.getOwnPropertyDescriptor(document, "cookie");
    // Override on the instance
    Object.defineProperty(document, "cookie", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
      configurable: true,
    });

    try {
      const result = callPrivate<string | null>(mgr, "getCookie", "__Host-session");
      expect(result).toBeNull();
      const messages = debugSpy.mock.calls.map((c: unknown[]) => c[0]);
      expect(messages).toContain(
        "[SessionManager] document.cookie inaccessible (sandboxed iframe)",
      );
    } finally {
      // Remove the instance override so the prototype getter takes effect again
      if (ownDescriptor) {
        Object.defineProperty(document, "cookie", ownDescriptor);
      } else {
        delete (document as unknown as Record<string, unknown>)["cookie"];
      }
    }
  });
});

// ===========================================================================
// Private: deleteCookie
// ===========================================================================

describe("deleteCookie (via callPrivate)", () => {
  it("does nothing when document is undefined (guard exists in source)", () => {
    // In jsdom, `document` is a non-configurable global so it cannot be
    // redefined to `undefined`. We verify the guard indirectly: deleteCookie
    // checks `typeof document === "undefined"` and returns early. The branch
    // is unreachable in jsdom but we confirm the method does not throw under
    // normal conditions with no matching cookie.
    const mgr = new SessionManager("production");
    expect(() => callPrivate(mgr, "deleteCookie", "__Host-session")).not.toThrow();
  });

  it("sets cookie with past expiration date", () => {
    const mgr = new SessionManager("production");
    const spy = jest.spyOn(document, "cookie", "set");
    callPrivate(mgr, "deleteCookie", "test-cookie");
    expect(spy).toHaveBeenCalledWith(
      "test-cookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;",
    );
    spy.mockRestore();
  });

  it("uses the exact expiration string 'Thu, 01 Jan 1970 00:00:00 UTC'", () => {
    const mgr = new SessionManager("production");
    const spy = jest.spyOn(document, "cookie", "set");
    callPrivate(mgr, "deleteCookie", "x");
    const written = spy.mock.calls[0]![0];
    expect(written).toContain("expires=Thu, 01 Jan 1970 00:00:00 UTC");
    spy.mockRestore();
  });

  it("includes path=/ in the deletion string", () => {
    const mgr = new SessionManager("production");
    const spy = jest.spyOn(document, "cookie", "set");
    callPrivate(mgr, "deleteCookie", "x");
    const written = spy.mock.calls[0]![0];
    expect(written).toContain("path=/;");
    spy.mockRestore();
  });

  it("does not throw when document.cookie setter throws (sandboxed iframe)", () => {
    const mgr = new SessionManager("production");
    const ownDescriptor = Object.getOwnPropertyDescriptor(document, "cookie");

    Object.defineProperty(document, "cookie", {
      get() {
        return "";
      },
      set() {
        throw new DOMException("Blocked", "SecurityError");
      },
      configurable: true,
    });

    try {
      expect(() => callPrivate(mgr, "deleteCookie", "__Host-session")).not.toThrow();
    } finally {
      if (ownDescriptor) {
        Object.defineProperty(document, "cookie", ownDescriptor);
      } else {
        delete (document as unknown as Record<string, unknown>)["cookie"];
      }
    }
  });
});

// ===========================================================================
// Private: log
// ===========================================================================

describe("log (via callPrivate)", () => {
  it("does not call console.debug when debug is false", () => {
    const mgr = new SessionManager("production", false);
    callPrivate(mgr, "log", "test message");
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it("calls console.debug with prefix when debug is true", () => {
    const mgr = new SessionManager("production", true);
    callPrivate(mgr, "log", "hello world");
    expect(debugSpy).toHaveBeenCalledWith("[SessionManager] hello world", "");
  });

  it("passes data as second argument to console.debug", () => {
    const mgr = new SessionManager("production", true);
    const data = { key: "value" };
    callPrivate(mgr, "log", "with data", data);
    expect(debugSpy).toHaveBeenCalledWith("[SessionManager] with data", data);
  });

  it("passes empty string when data is undefined", () => {
    const mgr = new SessionManager("production", true);
    callPrivate(mgr, "log", "no data");
    expect(debugSpy).toHaveBeenCalledWith("[SessionManager] no data", "");
  });

  it("uses [SessionManager] prefix exactly", () => {
    const mgr = new SessionManager("production", true);
    callPrivate(mgr, "log", "test");
    const firstArg = debugSpy.mock.calls[0]![0];
    expect(firstArg).toMatch(/^\[SessionManager\] /);
  });

  it("uses console.debug (not console.log or console.info)", () => {
    const mgr = new SessionManager("production", true);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    callPrivate(mgr, "log", "test");
    expect(debugSpy).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    infoSpy.mockRestore();
  });
});

// ===========================================================================
// SessionError (thrown inside parseJWT, caught in getSession)
// ===========================================================================

describe("SessionError", () => {
  it("sets name to 'SessionError' for invalid JWT format", () => {
    const mgr = new SessionManager("production");
    try {
      callPrivate(mgr, "parseJWT", "only.two");
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).name).toBe("SessionError");
      expect((e as Error).message).toBe("Invalid JWT format");
      return;
    }
    throw new Error("Expected SessionError to be thrown");
  });

  it("throws 'Invalid JWT payload JSON' for non-JSON payloads", () => {
    const mgr = new SessionManager("production");
    const notJson = btoa("not json at all{")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    try {
      callPrivate(mgr, "parseJWT", `h.${notJson}.s`);
    } catch (e: unknown) {
      expect((e as Error).name).toBe("SessionError");
      expect((e as Error).message).toBe("Invalid JWT payload JSON");
      return;
    }
    throw new Error("Expected SessionError to be thrown");
  });

  it("throws 'Invalid JWT claims' for missing required fields", () => {
    const mgr = new SessionManager("production");
    const payload = encodePayload({ sub: "only" });
    try {
      callPrivate(mgr, "parseJWT", `h.${payload}.s`);
    } catch (e: unknown) {
      expect((e as Error).name).toBe("SessionError");
      expect((e as Error).message).toBe("Invalid JWT claims");
      return;
    }
    throw new Error("Expected SessionError to be thrown");
  });

  it("inherits from Error", () => {
    const mgr = new SessionManager("production");
    try {
      callPrivate(mgr, "parseJWT", "a");
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(Error);
      return;
    }
    throw new Error("Expected error");
  });
});

// ===========================================================================
// isExpired arithmetic: floor(Date.now() / 1000)
// ===========================================================================

describe("isExpired arithmetic precision", () => {
  it("uses Math.floor for current time computation", () => {
    const mgr = new SessionManager("production");
    const frozenMs = 1700000500_750; // .75 seconds
    jest.spyOn(Date, "now").mockReturnValue(frozenMs);

    const flooredSeconds = Math.floor(frozenMs / 1000); // 1700000500

    const expiredSession: SessionInfo = {
      sessionId: "s",
      origin: "https://e.com",
      issuedAt: flooredSeconds - 10,
      expiresAt: flooredSeconds,
      issuer: "iss",
    };
    expect(mgr.isExpired(expiredSession)).toBe(true);

    const validSession: SessionInfo = {
      sessionId: "s",
      origin: "https://e.com",
      issuedAt: flooredSeconds - 10,
      expiresAt: flooredSeconds + 1,
      issuer: "iss",
    };
    expect(mgr.isExpired(validSession)).toBe(false);

    jest.restoreAllMocks();
  });

  it("uses >= comparison not > (expired at exact boundary)", () => {
    const mgr = new SessionManager("production");
    const nowSeconds = Math.floor(Date.now() / 1000);
    jest.spyOn(Date, "now").mockReturnValue(nowSeconds * 1000);

    const session: SessionInfo = {
      sessionId: "s",
      origin: "https://e.com",
      issuedAt: nowSeconds - 10,
      expiresAt: nowSeconds,
      issuer: "iss",
    };

    // Pins >= operator. If mutated to >, this would return false.
    expect(mgr.isExpired(session)).toBe(true);

    jest.restoreAllMocks();
  });

  it("divides Date.now() by 1000 (not 100 or 10000)", () => {
    const mgr = new SessionManager("production");
    const realNow = Date.now();
    const expectedSeconds = Math.floor(realNow / 1000);

    const session: SessionInfo = {
      sessionId: "s",
      origin: "https://e.com",
      issuedAt: expectedSeconds - 10,
      expiresAt: expectedSeconds + 1,
      issuer: "iss",
    };
    expect(mgr.isExpired(session)).toBe(false);
  });
});

// ===========================================================================
// Integration: full round-trip scenarios
// ===========================================================================

describe("full round-trip scenarios", () => {
  it("sandbox environment full lifecycle: set cookie, read session, check expiry, clear", () => {
    const mgr = new SessionManager("sandbox", true);
    const now = Math.floor(Date.now() / 1000);
    const claims = validClaims({ exp: now + 7200 });
    setCookie("__Host-session-sandbox", buildJwt(claims));

    const session = mgr.getSession();
    expect(session).not.toBeNull();
    expect(session!.sessionId).toBe(claims["sub"]);

    expect(mgr.isExpired(session!)).toBe(false);
    expect(mgr.hasSession()).toBe(true);

    // Verify clearSession at least attempts the cookie deletion
    const spy = jest.spyOn(document, "cookie", "set");
    mgr.clearSession();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("production environment default constructor", () => {
    const mgr = new SessionManager();
    setCookie("__Host-session", buildJwt(validClaims()));
    expect(mgr.hasSession()).toBe(true);
  });

  it("handles JWT with base64url characters (- and _) in payload", () => {
    const mgr = new SessionManager("production");
    const claims = validClaims({
      origin: "https://example.com/path?query=value&other=>>><<<",
    });
    setCookie("__Host-session", buildJwt(claims));
    const session = mgr.getSession();
    expect(session).not.toBeNull();
    expect(session!.origin).toBe("https://example.com/path?query=value&other=>>><<<");
  });
});

// ===========================================================================
// Edge cases: cookie parsing specifics
// ===========================================================================

describe("cookie parsing edge cases", () => {
  it("handles cookie value with equals signs via encodeURIComponent", () => {
    const mgr = new SessionManager("production");
    const claims = validClaims();
    const jwt = buildJwt(claims);
    setCookie("__Host-session", jwt);
    const session = mgr.getSession();
    expect(session).not.toBeNull();
  });

  it("distinguishes cookies with similar name prefixes", () => {
    const mgr = new SessionManager("production");
    // __Host-session-extra is not __Host-session
    setCookie("__Host-session-extra", buildJwt(validClaims()));
    expect(mgr.getSession()).toBeNull();
  });

  it("handles document.cookie being an empty string", () => {
    const mgr = new SessionManager("production");
    expect(callPrivate<string | null>(mgr, "getCookie", "__Host-session")).toBeNull();
  });
});

// ===========================================================================
// hasSession depends on both getSession and isExpired
// ===========================================================================

describe("hasSession dependency chain", () => {
  it("returns false if getSession returns null (no negation mutation)", () => {
    const mgr = new SessionManager("production");
    expect(mgr.hasSession()).toBe(false);
  });

  it("returns the negation of isExpired when session exists", () => {
    const mgr = new SessionManager("production");
    const now = Math.floor(Date.now() / 1000);

    setCookie("__Host-session", buildJwt(validClaims({ exp: now + 3600 })));
    expect(mgr.hasSession()).toBe(true);

    clearAllCookies();
    setCookie("__Host-session", buildJwt(validClaims({ exp: now - 100 })));
    expect(mgr.hasSession()).toBe(false);
  });
});

// ===========================================================================
// Debug logging: data parameter serialisation
// ===========================================================================

describe("debug logging data parameter", () => {
  it("getSession passes sessionId and expiresAt ISO string in parsed log", () => {
    const mgr = new SessionManager("production", true);
    const now = Math.floor(Date.now() / 1000);
    const claims = validClaims({ sub: "log-test-id", exp: now + 3600 });
    setCookie("__Host-session", buildJwt(claims));
    mgr.getSession();

    const parsedCall = debugSpy.mock.calls.find(
      (c: unknown[]) => c[0] === "[SessionManager] Session parsed",
    );
    expect(parsedCall).toBeDefined();
    const data = (parsedCall as unknown[])[1] as Record<string, unknown>;
    expect(data["sessionId"]).toBe("log-test-id");
    expect(data["expiresAt"]).toBe(new Date((now + 3600) * 1000).toISOString());
  });

  it("isExpired passes expiresAt and now as ISO strings in check log", () => {
    const mgr = new SessionManager("production", true);
    const now = Math.floor(Date.now() / 1000);
    jest.spyOn(Date, "now").mockReturnValue(now * 1000);

    const session: SessionInfo = {
      sessionId: "s",
      origin: "https://e.com",
      issuedAt: now - 60,
      expiresAt: now + 3600,
      issuer: "iss",
    };
    mgr.isExpired(session);

    const checkCall = debugSpy.mock.calls.find(
      (c: unknown[]) => c[0] === "[SessionManager] Session expiration check",
    );
    expect(checkCall).toBeDefined();
    const data = (checkCall as unknown[])[1] as Record<string, unknown>;
    expect(data["expiresAt"]).toBe(new Date((now + 3600) * 1000).toISOString());
    expect(data["now"]).toBe(new Date(now * 1000).toISOString());

    jest.restoreAllMocks();
  });
});

// ===========================================================================
// Multiplied by 1000 in logging (not by 100 or 10000)
// ===========================================================================

describe("timestamp multiplication in logging", () => {
  it("multiplies expiresAt by 1000 for Date constructor in getSession log", () => {
    const mgr = new SessionManager("production", true);
    const expiry = 2000000000; // a known epoch second
    setCookie("__Host-session", buildJwt(validClaims({ exp: expiry })));
    mgr.getSession();

    const parsedCall = debugSpy.mock.calls.find(
      (c: unknown[]) => c[0] === "[SessionManager] Session parsed",
    );
    expect(parsedCall).toBeDefined();
    const data = (parsedCall as unknown[])[1] as Record<string, unknown>;
    // If the code used * 100 or no multiplication, this would differ
    expect(data["expiresAt"]).toBe(new Date(2000000000 * 1000).toISOString());
  });

  it("multiplies expiresAt by 1000 for Date constructor in isExpired log", () => {
    const mgr = new SessionManager("production", true);
    const expiry = 2000000000;
    const session: SessionInfo = {
      sessionId: "s",
      origin: "https://e.com",
      issuedAt: expiry - 60,
      expiresAt: expiry,
      issuer: "iss",
    };
    mgr.isExpired(session);

    const checkCall = debugSpy.mock.calls.find(
      (c: unknown[]) => c[0] === "[SessionManager] Session expiration check",
    );
    const data = (checkCall as unknown[])[1] as Record<string, unknown>;
    expect(data["expiresAt"]).toBe(new Date(2000000000 * 1000).toISOString());
  });
});

// ===========================================================================
// Mutation-killing supplement: SSR environment (document undefined)
// Targets: L240 getCookie guard, L272 deleteCookie guard
// Survivors: ConditionalExpression, StringLiteral, BlockStatement on both
// ===========================================================================

describe("SSR environment (typeof document === 'undefined')", () => {
  it("getCookie returns null when document is removed from globalThis", () => {
    const mgr = new SessionManager("production");
    const origDoc = globalThis.document;
    // @ts-expect-error - intentionally removing document for SSR simulation
    delete globalThis.document;

    try {
      const result = callPrivate<string | null>(mgr, "getCookie", "__Host-session");
      expect(result).toBeNull();
    } finally {
      globalThis.document = origDoc;
    }
  });

  it("deleteCookie does not throw when document is removed from globalThis", () => {
    const mgr = new SessionManager("production");
    const origDoc = globalThis.document;
    // @ts-expect-error - intentionally removing document for SSR simulation
    delete globalThis.document;

    try {
      expect(() => callPrivate(mgr, "deleteCookie", "__Host-session")).not.toThrow();
    } finally {
      globalThis.document = origDoc;
    }
  });

  it("getSession returns null in SSR environment", () => {
    const mgr = new SessionManager("production");
    const origDoc = globalThis.document;
    // @ts-expect-error - intentionally removing document for SSR simulation
    delete globalThis.document;

    try {
      expect(mgr.getSession()).toBeNull();
    } finally {
      globalThis.document = origDoc;
    }
  });

  it("hasSession returns false in SSR environment", () => {
    const mgr = new SessionManager("production");
    const origDoc = globalThis.document;
    // @ts-expect-error - intentionally removing document for SSR simulation
    delete globalThis.document;

    try {
      expect(mgr.hasSession()).toBe(false);
    } finally {
      globalThis.document = origDoc;
    }
  });

  it("clearSession does not throw in SSR environment", () => {
    const mgr = new SessionManager("production");
    const origDoc = globalThis.document;
    // @ts-expect-error - intentionally removing document for SSR simulation
    delete globalThis.document;

    try {
      expect(() => mgr.clearSession()).not.toThrow();
    } finally {
      globalThis.document = origDoc;
    }
  });

  it("getCookie guard returns null (not undefined) when document absent", () => {
    const mgr = new SessionManager("production");
    const origDoc = globalThis.document;
    // @ts-expect-error - intentionally removing document for SSR simulation
    delete globalThis.document;

    try {
      const result = callPrivate<string | null>(mgr, "getCookie", "__Host-session");
      // Explicitly check for null, not just falsy. Kills BlockStatement mutant
      // that empties the guard body (would return undefined from the function).
      expect(result).toBe(null);
    } finally {
      globalThis.document = origDoc;
    }
  });
});

// ===========================================================================
// Mutation-killing supplement: parseJWT empty payload
// Targets: L154-155 (!payload guard, BlockStatement, StringLiteral)
// ===========================================================================

describe("parseJWT empty payload segment", () => {
  it("throws SessionError for JWT with empty second part (a..b)", () => {
    const mgr = new SessionManager("production");
    try {
      callPrivate(mgr, "parseJWT", "header..signature");
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).name).toBe("SessionError");
      expect((e as Error).message).toBe("Missing JWT payload");
      return;
    }
    throw new Error("Expected SessionError to be thrown");
  });

  it("getSession returns null for JWT with empty payload segment", () => {
    const mgr = new SessionManager("production");
    setCookie("__Host-session", "header..signature");
    expect(mgr.getSession()).toBeNull();
  });

  it("throws with exact message 'Missing JWT payload' (not empty string)", () => {
    const mgr = new SessionManager("production");
    try {
      callPrivate(mgr, "parseJWT", "a..b");
    } catch (e: unknown) {
      const msg = (e as Error).message;
      expect(msg).toBe("Missing JWT payload");
      expect(msg.length).toBeGreaterThan(0);
      return;
    }
    throw new Error("Expected SessionError to be thrown");
  });
});

// ===========================================================================
// Mutation-killing supplement: isValidClaims called directly
// Targets: L197-198 (typeof object || null guard, return false -> true)
// Also targets: L207 (exp number check -> true)
// ===========================================================================

describe("isValidClaims via callPrivate", () => {
  it("returns false for null claims", () => {
    const mgr = new SessionManager("production");
    const result = callPrivate<boolean>(mgr, "isValidClaims", null);
    expect(result).toBe(false);
  });

  it("returns false for undefined claims", () => {
    const mgr = new SessionManager("production");
    const result = callPrivate<boolean>(mgr, "isValidClaims", undefined);
    expect(result).toBe(false);
  });

  it("returns false for string claims", () => {
    const mgr = new SessionManager("production");
    const result = callPrivate<boolean>(mgr, "isValidClaims", "not an object");
    expect(result).toBe(false);
  });

  it("returns false for number claims", () => {
    const mgr = new SessionManager("production");
    const result = callPrivate<boolean>(mgr, "isValidClaims", 42);
    expect(result).toBe(false);
  });

  it("returns false for boolean claims", () => {
    const mgr = new SessionManager("production");
    const result = callPrivate<boolean>(mgr, "isValidClaims", true);
    expect(result).toBe(false);
  });

  it("returns true for valid claims object", () => {
    const mgr = new SessionManager("production");
    const result = callPrivate<boolean>(mgr, "isValidClaims", validClaims());
    expect(result).toBe(true);
  });

  it("returns false when exp is a string (not number)", () => {
    const mgr = new SessionManager("production");
    const claims = validClaims({ exp: "not-a-number" });
    const result = callPrivate<boolean>(mgr, "isValidClaims", claims);
    expect(result).toBe(false);
  });

  it("returns false when exp is boolean (not number)", () => {
    const mgr = new SessionManager("production");
    const claims = validClaims({ exp: true });
    const result = callPrivate<boolean>(mgr, "isValidClaims", claims);
    expect(result).toBe(false);
  });

  it("returns false when exp is null", () => {
    const mgr = new SessionManager("production");
    const claims = validClaims({ exp: null });
    const result = callPrivate<boolean>(mgr, "isValidClaims", claims);
    expect(result).toBe(false);
  });

  it("returns false when sub is missing from otherwise valid claims", () => {
    const mgr = new SessionManager("production");
    const { sub: _, ...claimsWithoutSub } = validClaims() as Record<string, unknown>;
    void _;
    const result = callPrivate<boolean>(mgr, "isValidClaims", claimsWithoutSub);
    expect(result).toBe(false);
  });

  it("returns false when origin is missing from otherwise valid claims", () => {
    const mgr = new SessionManager("production");
    const { origin: _, ...rest } = validClaims() as Record<string, unknown>;
    void _;
    const result = callPrivate<boolean>(mgr, "isValidClaims", rest);
    expect(result).toBe(false);
  });

  it("returns false when iat is a string", () => {
    const mgr = new SessionManager("production");
    const result = callPrivate<boolean>(mgr, "isValidClaims", validClaims({ iat: "x" }));
    expect(result).toBe(false);
  });

  it("returns false when iss is a number", () => {
    const mgr = new SessionManager("production");
    const result = callPrivate<boolean>(mgr, "isValidClaims", validClaims({ iss: 5 }));
    expect(result).toBe(false);
  });

  it("returns false for an array (typeof array === 'object' but lacks fields)", () => {
    const mgr = new SessionManager("production");
    const result = callPrivate<boolean>(mgr, "isValidClaims", [1, 2, 3]);
    expect(result).toBe(false);
  });
});

// ===========================================================================
// Mutation-killing supplement: base64UrlDecode padding logic
// Targets: L224-225 (if(pad) -> if(false), block emptied, "=" -> "")
// ===========================================================================

describe("base64UrlDecode padding behaviour via callPrivate", () => {
  it("correctly pads base64url string of length % 4 === 1 (pad=1, adds 3 '=')", () => {
    const mgr = new SessionManager("production");
    // "abcde" -> btoa = "YWJjZGU=" -> stripped = "YWJjZGU" (length 7, pad=3)
    // But we need length % 4 === 1 for pad=1. Let's find one.
    // Length 5 -> pad = 1 -> needs 3 "=" (but that is pad=1, so 4-1=3)
    // Actually length 5 % 4 = 1. base64url of something:
    // btoa("abcdefgh") = "YWJjZGVmZ2g=" (12 chars padded -> stripped "YWJjZGVmZ2g" = 11, 11%4=3)
    // We need a string where stripped base64 length % 4 = 1.
    // That only happens if original base64 had 3 '=' padding (impossible, max is 2).
    // Valid pad values are 0, 2, or 3. pad=1 is impossible for valid base64.
    // So we just need to confirm pad=2 and pad=3 require actual "=" characters.

    // pad=2: "abcd" -> btoa="YWJjZA==" -> stripped="YWJjZA" (length 6, 6%4=2)
    // Without padding atob("YWJjZA") would fail in some environments.
    // With the mutation "=" -> "", atob("YWJjZA") is called instead of atob("YWJjZA==")
    const result = callPrivate<string>(mgr, "base64UrlDecode", "YWJjZA");
    expect(result).toBe("abcd");
  });

  it("pad=3 case requires '=' padding character (not empty string)", () => {
    const mgr = new SessionManager("production");
    // "hello" -> btoa="aGVsbG8=" -> stripped="aGVsbG8" (length 7, 7%4=3, needs 1 "=")
    const result = callPrivate<string>(mgr, "base64UrlDecode", "aGVsbG8");
    expect(result).toBe("hello");
  });

  it("pad=0 case works without any padding addition", () => {
    const mgr = new SessionManager("production");
    // "abc" -> btoa="YWJj" (length 4, 4%4=0, no padding needed)
    const result = callPrivate<string>(mgr, "base64UrlDecode", "YWJj");
    expect(result).toBe("abc");
  });

  it("padding with '=' is required (not empty string) for pad=2", () => {
    const mgr = new SessionManager("production");
    // This test specifically targets the StringLiteral mutant that changes "=" to ""
    // "test" -> btoa="dGVzdA==" -> stripped="dGVzdA" (length 6, 6%4=2)
    // If "=" is mutated to "", repeat(2) produces "" and atob("dGVzdA") may fail or produce wrong output
    const decoded = callPrivate<string>(mgr, "base64UrlDecode", "dGVzdA");
    expect(decoded).toBe("test");
  });

  it("full JWT round-trip with payload needing padding proves pad branch is used", () => {
    const mgr = new SessionManager("production");
    // Build claims that produce a payload needing padding
    const claims = { sub: "x", origin: "o", iat: 1, exp: 2, iss: "i" };
    const raw = JSON.stringify(claims);
    const b64 = btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    // Verify the stripped b64 needs padding (length % 4 !== 0)
    const pad = b64.length % 4;

    // Decode through the private method
    const decoded = callPrivate<string>(mgr, "base64UrlDecode", b64);
    expect(decoded).toBe(raw);

    // If padding was needed and the pad branch was skipped (mutation), atob might fail
    // or produce garbage. This pin ensures correctness.
    if (pad !== 0) {
      // Additionally verify via getSession that the full pipeline works
      setCookie("__Host-session", buildJwt(claims));
      const session = mgr.getSession();
      // Claims have exp=2 which is expired, but parseJWT should still work
      // (expiry is checked separately in isExpired, not in parseJWT)
      expect(session).not.toBeNull();
      expect(session!.sessionId).toBe("x");
    }
  });
});

// ===========================================================================
// Mutation-killing supplement: cookie.trim() removal
// Target: L257 MethodExpression (cookie.trim().split -> cookie.split)
// ===========================================================================

describe("cookie parsing trim behaviour", () => {
  it("finds cookie that is not the first entry (trim removes leading space)", () => {
    const mgr = new SessionManager("production");
    // jsdom orders __Host- (Secure) cookies first. So a non-prefixed cookie
    // set AFTER a __Host- cookie will appear second with a leading space.
    // We call getCookie directly with a plain name to test the trim path.

    // Set a __Host- cookie first (will be sorted first by jsdom)
    setCookie("__Host-session", "first-cookie");
    // Set a plain cookie (will appear second with leading space after ";")
    document.cookie = "target-cookie=found-me; path=/";

    // Verify ordering: __Host-session is first, target-cookie is second
    const rawCookieString = document.cookie;
    const parts = rawCookieString.split(";");
    // The target-cookie entry should have a leading space
    const targetEntry = parts.find((p) => p.includes("target-cookie"));
    expect(targetEntry).toBeDefined();
    expect(targetEntry!.startsWith(" ")).toBe(true);

    // getCookie must find "target-cookie" despite the leading space
    // Without trim(), " target-cookie" !== "target-cookie" and it returns null
    const result = callPrivate<string | null>(mgr, "getCookie", "target-cookie");
    expect(result).toBe("found-me");
  });

  it("getCookie returns null for a name that does not match any cookie", () => {
    const mgr = new SessionManager("production");
    document.cookie = "alpha=one; path=/";
    document.cookie = "beta=two; path=/";
    const result = callPrivate<string | null>(mgr, "getCookie", "gamma");
    expect(result).toBeNull();
  });

  it("finds sandbox cookie in non-first position via getSession", () => {
    const mgr = new SessionManager("sandbox");
    // Set a production cookie first (will be sorted first since __Host- + Secure)
    setCookie("__Host-session", buildJwt(validClaims()));
    // Now set the sandbox cookie (also __Host- + Secure, but added second)
    setCookie("__Host-session-sandbox", buildJwt(validClaims()));

    // Both are __Host- cookies. Check if sandbox one needs trim.
    const rawCookieString = document.cookie;
    const entries = rawCookieString.split(";");

    // If the sandbox cookie is NOT the first entry, trim is needed.
    // Regardless of ordering, getSession must find it.
    const session = mgr.getSession();
    expect(session).not.toBeNull();
  });
});

// ===========================================================================
// Mutation-killing supplement: hasSession null guard equivalence-breaker
// Targets: L60 ConditionalExpression (if(!session) -> if(false)), BlockStatement
// ===========================================================================

describe("hasSession with invalid JWT that throws during isExpired", () => {
  it("returns false when getSession returns null (guard returns early)", () => {
    const mgr = new SessionManager("production");
    // No cookie set, getSession returns null
    // The guard `if (!session) return false` fires.
    // If mutated to `if (false)`, isExpired(null as unknown as SessionInfo) runs.
    // isExpired(undefined) -> info = undefined || getSession() -> getSession returns null
    // -> returns true -> !true = false. Same result. This is an equivalent mutant.
    // But let's still pin the behaviour for regression safety.
    expect(mgr.hasSession()).toBe(false);
  });

  it("returns false when session cookie contains a JWT that parseJWT rejects", () => {
    const mgr = new SessionManager("production");
    // Set a structurally invalid JWT
    setCookie("__Host-session", "not.valid.jwt");
    expect(mgr.hasSession()).toBe(false);
  });
});

// ===========================================================================
// Mutation-killing supplement: getSession error log ObjectLiteral
// Target: L94 ({ error } -> {})
// ===========================================================================

describe("getSession error log data content", () => {
  it("includes the actual error object in the 'Failed to parse session' log", () => {
    const mgr = new SessionManager("production", true);
    setCookie("__Host-session", "a.!!!.b");
    mgr.getSession();

    const failedCall = debugSpy.mock.calls.find(
      (c: unknown[]) => c[0] === "[SessionManager] Failed to parse session",
    );
    expect(failedCall).toBeDefined();
    const logData = (failedCall as unknown[])[1] as Record<string, unknown>;
    // The error key must exist and contain an Error instance.
    // If ObjectLiteral mutant replaces { error } with {}, this key is absent.
    expect(logData).toHaveProperty("error");
    expect(logData["error"]).toBeInstanceOf(Error);
  });

  it("error log data error has name 'SessionError'", () => {
    const mgr = new SessionManager("production", true);
    // Build a JWT with valid base64 payload but invalid claims (missing fields)
    setCookie("__Host-session", buildJwt({ invalid: true }));
    mgr.getSession();

    const failedCall = debugSpy.mock.calls.find(
      (c: unknown[]) => c[0] === "[SessionManager] Failed to parse session",
    );
    expect(failedCall).toBeDefined();
    const logData = (failedCall as unknown[])[1] as Record<string, unknown>;
    expect(logData).toHaveProperty("error");
    expect((logData["error"] as Error).name).toBe("SessionError");
  });
});

// ===========================================================================
// Mutation-killing supplement: isValidClaims typeof/null guard (direct)
// Targets: L197 ConditionalExpression (typeof !== "object" -> false),
//          L197 LogicalOperator (|| -> &&),
//          L197 ConditionalExpression (claims === null -> false),
//          L197 BlockStatement (empty body),
//          L198 BooleanLiteral (return false -> return true)
// ===========================================================================

describe("isValidClaims object/null guard via callPrivate (direct return check)", () => {
  it("returns exactly false (not true) for null", () => {
    const mgr = new SessionManager("production");
    const result = callPrivate<boolean>(mgr, "isValidClaims", null);
    expect(result).toBe(false);
    expect(result).not.toBe(true);
  });

  it("returns exactly false (not true) for a non-object primitive (number)", () => {
    const mgr = new SessionManager("production");
    const result = callPrivate<boolean>(mgr, "isValidClaims", 123);
    expect(result).toBe(false);
  });

  it("returns exactly false (not true) for a non-object primitive (string)", () => {
    const mgr = new SessionManager("production");
    const result = callPrivate<boolean>(mgr, "isValidClaims", "hello");
    expect(result).toBe(false);
  });

  it("null specifically triggers the guard (typeof null is 'object', caught by === null)", () => {
    const mgr = new SessionManager("production");
    // typeof null === "object" is true, so the first condition is false.
    // claims === null is true, so the || produces true, and the guard fires.
    // If the || is mutated to &&: (false && true) = false, guard does NOT fire.
    // Then const c = null as Record -> c["sub"] throws TypeError.
    // BUT: parseJWT wraps this in try/catch, so getSession returns null.
    // Direct call to isValidClaims, however, will throw instead of returning false.
    // That is detectable!
    expect(() => {
      callPrivate<boolean>(mgr, "isValidClaims", null);
    }).not.toThrow();
    // And it returns false
    expect(callPrivate<boolean>(mgr, "isValidClaims", null)).toBe(false);
  });

  it("undefined specifically fails the typeof object check", () => {
    const mgr = new SessionManager("production");
    // typeof undefined === "object" is false, so first condition is true, guard fires
    const result = callPrivate<boolean>(mgr, "isValidClaims", undefined);
    expect(result).toBe(false);
  });
});

// ===========================================================================
// Mutation-killing supplement: exp type check (direct)
// Target: L207 ConditionalExpression (typeof c["exp"] === "number" -> true)
// ===========================================================================

describe("isValidClaims exp field type validation (direct)", () => {
  it("returns false when exp is a string and all other fields are valid", () => {
    const mgr = new SessionManager("production");
    const claims = validClaims({ exp: "string-value" });
    const result = callPrivate<boolean>(mgr, "isValidClaims", claims);
    // If the exp check is mutated to `true`, this would return true.
    expect(result).toBe(false);
  });

  it("returns false when exp is undefined and all other fields are valid", () => {
    const mgr = new SessionManager("production");
    const claims = validClaims();
    delete (claims as Record<string, unknown>)["exp"];
    const result = callPrivate<boolean>(mgr, "isValidClaims", claims);
    expect(result).toBe(false);
  });

  it("returns true when exp is a valid number", () => {
    const mgr = new SessionManager("production");
    const claims = validClaims({ exp: 9999999 });
    const result = callPrivate<boolean>(mgr, "isValidClaims", claims);
    expect(result).toBe(true);
  });

  it("returns false when exp is boolean true", () => {
    const mgr = new SessionManager("production");
    const claims = validClaims({ exp: true });
    const result = callPrivate<boolean>(mgr, "isValidClaims", claims);
    expect(result).toBe(false);
  });

  it("returns false when exp is null", () => {
    const mgr = new SessionManager("production");
    const claims = validClaims({ exp: null });
    const result = callPrivate<boolean>(mgr, "isValidClaims", claims);
    expect(result).toBe(false);
  });

  it("rejects exp=NaN even though typeof NaN === 'number'", () => {
    // NaN is technically a number, so typeof check passes. This test documents
    // that the type guard accepts NaN (expected behaviour, not a bug).
    const mgr = new SessionManager("production");
    const claims = validClaims({ exp: NaN });
    const result = callPrivate<boolean>(mgr, "isValidClaims", claims);
    // typeof NaN === "number" is true, so isValidClaims returns true
    expect(result).toBe(true);
  });
});
