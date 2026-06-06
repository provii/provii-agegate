/**
 * Integration tests for Session Manager
 */

import { SessionManager } from "../../src/core/session.js";
import type { SessionInfo } from "../../src/core/types.js";

describe("SessionManager Integration Tests", () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager("production", false);
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(
          /=.*/,
          "=;expires=" + new Date().toUTCString() + ";path=/;Secure",
        );
    });
  });

  describe("JWT parsing", () => {
    it("should parse valid JWT", () => {
      // Create a valid JWT (header.payload.signature)
      const payload = {
        sub: "session-123",
        origin: "https://example.com",

        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: "hosted.provii.app",
      };

      const encodedPayload = btoa(JSON.stringify(payload))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const jwt = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${encodedPayload}.signature`;

      // Set cookie
      document.cookie = `__Host-session=${jwt}; Secure; Path=/`;

      const session = manager.getSession();

      expect(session).not.toBeNull();
      expect(session?.sessionId).toBe("session-123");
      expect(session?.origin).toBe("https://example.com");
      expect(session?.origin).toBe("https://example.com");
    });

    it("should return null for missing cookie", () => {
      const session = manager.getSession();
      expect(session).toBeNull();
    });

    it("should return null for invalid JWT format", () => {
      document.cookie = "__Host-session=invalid-jwt; Secure; Path=/";

      const session = manager.getSession();
      expect(session).toBeNull();
    });

    it("should return null for malformed payload", () => {
      const jwt = "header.invalid-base64.signature";
      document.cookie = `__Host-session=${jwt}; Secure; Path=/`;

      const session = manager.getSession();
      expect(session).toBeNull();
    });
  });

  describe("hasSession", () => {
    it("should return true for valid non-expired session", () => {
      const payload = {
        sub: "session-123",
        origin: "https://example.com",

        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: "hosted.provii.app",
      };

      const encodedPayload = btoa(JSON.stringify(payload))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const jwt = `header.${encodedPayload}.signature`;
      document.cookie = `__Host-session=${jwt}; Secure; Path=/`;

      expect(manager.hasSession()).toBe(true);
    });

    it("should return false for expired session", () => {
      const payload = {
        sub: "session-123",
        origin: "https://example.com",

        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        iss: "hosted.provii.app",
      };

      const encodedPayload = btoa(JSON.stringify(payload))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const jwt = `header.${encodedPayload}.signature`;
      document.cookie = `__Host-session=${jwt}; Secure; Path=/`;

      expect(manager.hasSession()).toBe(false);
    });

    it("should return false for missing session", () => {
      expect(manager.hasSession()).toBe(false);
    });
  });

  describe("isExpired", () => {
    it("should detect expired sessions", () => {
      const expiredSession: SessionInfo = {
        sessionId: "session-123",
        origin: "https://example.com",

        issuedAt: Math.floor(Date.now() / 1000) - 7200,
        expiresAt: Math.floor(Date.now() / 1000) - 3600,
        issuer: "hosted.provii.app",
      };

      expect(manager.isExpired(expiredSession)).toBe(true);
    });

    it("should detect valid sessions", () => {
      const validSession: SessionInfo = {
        sessionId: "session-123",
        origin: "https://example.com",

        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        issuer: "hosted.provii.app",
      };

      expect(manager.isExpired(validSession)).toBe(false);
    });

    it("should return true when no session provided and no cookie", () => {
      expect(manager.isExpired()).toBe(true);
    });
  });

  describe("clearSession", () => {
    it("should clear session cookie", () => {
      document.cookie = "__Host-session=test-jwt; Secure; Path=/";

      manager.clearSession();

      const session = manager.getSession();
      expect(session).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("should handle JWT with missing claims", () => {
      const payload = {
        sub: "session-123",
        // Missing other required claims
      };

      const encodedPayload = btoa(JSON.stringify(payload))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const jwt = `header.${encodedPayload}.signature`;
      document.cookie = `__Host-session=${jwt}; Secure; Path=/`;

      const session = manager.getSession();
      expect(session).toBeNull();
    });

    it("should handle JWT with wrong claim types", () => {
      const payload = {
        sub: "session-123",
        origin: "https://example.com",
        iat: "not-a-number", // String instead of number
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: "hosted.provii.app",
      };

      const encodedPayload = btoa(JSON.stringify(payload))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const jwt = `header.${encodedPayload}.signature`;
      document.cookie = `__Host-session=${jwt}; Secure; Path=/`;

      const session = manager.getSession();
      expect(session).toBeNull();
    });

    it("should handle sessions expiring exactly now", () => {
      const now = Math.floor(Date.now() / 1000);
      const session: SessionInfo = {
        sessionId: "session-123",
        origin: "https://example.com",

        issuedAt: now - 3600,
        expiresAt: now,
        issuer: "hosted.provii.app",
      };

      // Should be considered expired
      expect(manager.isExpired(session)).toBe(true);
    });
  });
});
