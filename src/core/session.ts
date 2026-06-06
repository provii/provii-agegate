// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Client-side session manager for JWT cookie parsing and validation.
 *
 * With the default HttpOnly cookie configuration, cookies cannot be read
 * client-side via `document.cookie`. Session validation should therefore be
 * done via the server-side `/session/check` endpoint, which uses
 * `credentials: 'include'` to send the HttpOnly cookie automatically.
 *
 * This SessionManager is provided for scenarios where non-HttpOnly cookies
 * are configured, or for reference purposes. Signature verification is
 * always performed server-side.
 *
 * @module core/session
 */

import type { SessionInfo, Environment } from "./types.js";
import { SESSION_COOKIE_NAMES } from "./types.js";

/**
 * Session error class
 */
class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionError";
  }
}

/**
 * Session Manager
 *
 * Provides methods to check for existing sessions, parse JWT tokens,
 * and validate session expiration.
 *
 * Note: With HttpOnly cookies (the default), client-side cookie reading
 * will not work. Use the server-side /session/check endpoint instead.
 */
export class SessionManager {
  private readonly debug: boolean;
  private readonly cookieName: string;

  constructor(environment: Environment = "production", debug = false) {
    this.debug = debug;
    this.cookieName = SESSION_COOKIE_NAMES[environment];
  }

  /**
   * Check if user has a valid session
   *
   * Looks for the session cookie and validates it's not expired.
   * Does NOT verify signature (server does that).
   *
   * @returns True if valid session exists
   */
  hasSession(): boolean {
    const session = this.getSession();
    if (!session) {
      return false;
    }

    return !this.isExpired(session);
  }

  /**
   * Get session information from cookie
   *
   * Parses the JWT cookie and extracts claims.
   * Does NOT verify signature (server does that).
   *
   * @returns Session info or null if no session
   */
  getSession(): SessionInfo | null {
    this.log("Getting session");

    // Get cookie (Note: HttpOnly cookies cannot be read client-side)
    const cookieValue = this.getCookie(this.cookieName);
    if (!cookieValue) {
      this.log("No session cookie found (expected with HttpOnly cookies)");
      return null;
    }

    // Parse JWT
    try {
      const session = this.parseJWT(cookieValue);
      this.log("Session parsed", {
        sessionId: session.sessionId,
        expiresAt: new Date(session.expiresAt * 1000).toISOString(),
      });
      return session;
    } catch (error) {
      this.log("Failed to parse session", { error });
      return null;
    }
  }

  /**
   * Check if session is expired (client-side check only)
   *
   * @param session Session info (optional, will get current session if not provided)
   * @returns True if expired
   */
  isExpired(session?: SessionInfo): boolean {
    const info = session || this.getSession();
    if (!info) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const expired = now >= info.expiresAt;

    this.log("Session expiration check", {
      expired,
      expiresAt: new Date(info.expiresAt * 1000).toISOString(),
      now: new Date(now * 1000).toISOString(),
    });

    return expired;
  }

  /**
   * Clear session cookie
   *
   * Note: This only clears the cookie client-side and will NOT work for
   * HttpOnly cookies. For proper logout with HttpOnly cookies, call the
   * server-side logout endpoint instead.
   */
  clearSession(): void {
    this.log("Clearing session (will not work for HttpOnly cookies)");
    this.deleteCookie(this.cookieName);
  }

  /**
   * Parse JWT and extract claims
   *
   * NOTE: This does NOT verify the signature. Signature verification
   * is done server-side. This is only for extracting claims for UX.
   *
   * @param token JWT token
   * @returns Session info
   * @throws SessionError if token is invalid
   */
  private parseJWT(token: string): SessionInfo {
    // Split JWT into parts
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new SessionError("Invalid JWT format");
    }

    // Decode payload (second part)
    const payload = parts[1];
    if (!payload) {
      throw new SessionError("Missing JWT payload");
    }

    // Base64url decode
    const decoded = this.base64UrlDecode(payload);

    // Parse JSON
    let claims: unknown;
    try {
      claims = JSON.parse(decoded);
    } catch {
      throw new SessionError("Invalid JWT payload JSON");
    }

    // Validate claims
    if (!this.isValidClaims(claims)) {
      throw new SessionError("Invalid JWT claims");
    }

    // Extract session info
    return {
      sessionId: claims.sub,
      origin: claims.origin,
      issuedAt: claims.iat,
      expiresAt: claims.exp,
      issuer: claims.iss,
    };
  }

  /**
   * Validate JWT claims structure
   *
   * @param claims Claims object
   * @returns True if valid
   */
  private isValidClaims(claims: unknown): claims is {
    sub: string;
    origin: string;
    iat: number;
    exp: number;
    iss: string;
  } {
    if (typeof claims !== "object" || claims === null) {
      return false;
    }

    const c = claims as Record<string, unknown>;

    return (
      typeof c["sub"] === "string" &&
      typeof c["origin"] === "string" &&
      typeof c["iat"] === "number" &&
      typeof c["exp"] === "number" &&
      typeof c["iss"] === "string"
    );
  }

  /**
   * Base64url decode
   *
   * @param str Base64url encoded string
   * @returns Decoded string
   */
  private base64UrlDecode(str: string): string {
    // Convert base64url to base64
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");

    // Add padding
    const pad = base64.length % 4;
    if (pad) {
      base64 += "=".repeat(4 - pad);
    }

    // Decode base64
    const decoded = globalThis.atob(base64);
    return decoded;
  }

  /**
   * Get cookie value by name
   *
   * @param name Cookie name
   * @returns Cookie value or null
   */
  private getCookie(name: string): string | null {
    if (typeof document === "undefined") {
      return null;
    }

    // document.cookie throws DOMException in sandboxed iframes that lack
    // the allow-same-origin flag. Return null (no session) rather than
    // crashing the initialisation flow.
    let rawCookies: string;
    try {
      rawCookies = document.cookie;
    } catch {
      this.log("document.cookie inaccessible (sandboxed iframe)");
      return null;
    }

    const cookies = rawCookies.split(";");
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split("=");
      if (key === name && value) {
        return decodeURIComponent(value);
      }
    }

    return null;
  }

  /**
   * Delete cookie by name
   *
   * @param name Cookie name
   */
  private deleteCookie(name: string): void {
    if (typeof document === "undefined") {
      return;
    }

    // Set cookie with past expiration date. Silently skip in sandboxed
    // iframes where document.cookie is inaccessible.
    try {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    } catch {
      // Sandboxed iframe without allow-same-origin.
    }
  }

  /**
   * Log debug messages to the browser console.
   *
   * Uses `console.debug` so that messages are hidden by default in most
   * browser developer tools.
   */
  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.debug(`[SessionManager] ${message}`, data || "");
    }
  }
}
