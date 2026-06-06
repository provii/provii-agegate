/**
 * Integration tests for PKCE Manager
 */

import { PKCEManager } from "../../src/core/pkce.js";

describe("PKCEManager Integration Tests", () => {
  let manager: PKCEManager;

  beforeEach(() => {
    manager = new PKCEManager(false);
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  describe("generateChallenge", () => {
    it("should generate valid PKCE challenge", async () => {
      const pkce = await manager.generateChallenge();

      expect(pkce.verifier).toBeDefined();
      expect(pkce.challenge).toBeDefined();
      expect(pkce.verifier.length).toBeGreaterThanOrEqual(43);
      expect(pkce.verifier.length).toBeLessThanOrEqual(128);
      expect(pkce.challenge.length).toBe(43); // SHA-256 in base64url
    });

    it("should generate unique verifiers", async () => {
      const pkce1 = await manager.generateChallenge();
      const pkce2 = await manager.generateChallenge();

      expect(pkce1.verifier).not.toBe(pkce2.verifier);
      expect(pkce1.challenge).not.toBe(pkce2.challenge);
    });

    it("should generate valid base64url characters", async () => {
      const pkce = await manager.generateChallenge();

      // Base64url should only contain [A-Za-z0-9-_]
      const validChars = /^[A-Za-z0-9\-_]+$/;
      expect(validChars.test(pkce.verifier)).toBe(true);
      expect(validChars.test(pkce.challenge)).toBe(true);

      // Should not contain padding
      expect(pkce.verifier.includes("=")).toBe(false);
      expect(pkce.challenge.includes("=")).toBe(false);
    });

    it("should generate RFC 7636 compliant verifiers", async () => {
      const pkce = await manager.generateChallenge();

      // Verifier: 43-128 chars, unreserved characters only
      expect(pkce.verifier.length).toBeGreaterThanOrEqual(43);
      expect(pkce.verifier.length).toBeLessThanOrEqual(128);
      expect(/^[A-Za-z0-9\-._~]+$/.test(pkce.verifier)).toBe(true);

      // Challenge: 43 chars, base64url characters only
      expect(pkce.challenge.length).toBe(43);
      expect(/^[A-Za-z0-9\-_]+$/.test(pkce.challenge)).toBe(true);
    });
  });

  describe("storeVerifier and getVerifier", () => {
    it("should store and retrieve verifier", async () => {
      const sessionId = "session-123";
      const verifier = "test-verifier-123";

      manager.storeVerifier(sessionId, verifier);
      const retrieved = manager.getVerifier(sessionId);

      expect(retrieved).toBe(verifier);
    });

    it("should return null for non-existent verifier", () => {
      const retrieved = manager.getVerifier("non-existent");

      expect(retrieved).toBeNull();
    });

    it("should store multiple verifiers", async () => {
      manager.storeVerifier("session-1", "verifier-1");
      manager.storeVerifier("session-2", "verifier-2");
      manager.storeVerifier("session-3", "verifier-3");

      expect(manager.getVerifier("session-1")).toBe("verifier-1");
      expect(manager.getVerifier("session-2")).toBe("verifier-2");
      expect(manager.getVerifier("session-3")).toBe("verifier-3");
    });

    it("should use sessionStorage", () => {
      const sessionId = "session-test";
      const verifier = "verifier-test";

      manager.storeVerifier(sessionId, verifier);

      // Check sessionStorage directly
      const key = `provii_pkce_${sessionId}`;
      expect(sessionStorage.getItem(key)).toBe(verifier);
    });
  });

  describe("clearVerifier", () => {
    it("should clear stored verifier", () => {
      const sessionId = "session-123";
      manager.storeVerifier(sessionId, "verifier-123");

      manager.clearVerifier(sessionId);
      const retrieved = manager.getVerifier(sessionId);

      expect(retrieved).toBeNull();
    });

    it("should not affect other verifiers", () => {
      manager.storeVerifier("session-1", "verifier-1");
      manager.storeVerifier("session-2", "verifier-2");

      manager.clearVerifier("session-1");

      expect(manager.getVerifier("session-1")).toBeNull();
      expect(manager.getVerifier("session-2")).toBe("verifier-2");
    });
  });

  describe("clearAllVerifiers", () => {
    it("should clear all verifiers", () => {
      manager.storeVerifier("session-1", "verifier-1");
      manager.storeVerifier("session-2", "verifier-2");
      manager.storeVerifier("session-3", "verifier-3");

      manager.clearAllVerifiers();

      expect(manager.getVerifier("session-1")).toBeNull();
      expect(manager.getVerifier("session-2")).toBeNull();
      expect(manager.getVerifier("session-3")).toBeNull();
    });

    it("should not affect other sessionStorage items", () => {
      sessionStorage.setItem("other-key", "other-value");
      manager.storeVerifier("session-1", "verifier-1");

      manager.clearAllVerifiers();

      expect(sessionStorage.getItem("other-key")).toBe("other-value");
      expect(manager.getVerifier("session-1")).toBeNull();
    });
  });

  describe("RFC 7636 compliance", () => {
    it("should meet minimum security requirements", async () => {
      // Generate 100 challenges to test randomness
      const challenges = await Promise.all(
        Array.from({ length: 100 }, () => manager.generateChallenge()),
      );

      // All should be unique
      const verifiers = challenges.map((c) => c.verifier);
      const uniqueVerifiers = new Set(verifiers);
      expect(uniqueVerifiers.size).toBe(100);

      // All should be valid format
      for (const pkce of challenges) {
        expect(pkce.verifier.length).toBeGreaterThanOrEqual(43);
        expect(pkce.verifier.length).toBeLessThanOrEqual(128);
        expect(/^[A-Za-z0-9\-._~]+$/.test(pkce.verifier)).toBe(true);
        expect(pkce.challenge.length).toBe(43);
        expect(/^[A-Za-z0-9\-_]+$/.test(pkce.challenge)).toBe(true);
      }
    });

    it("should use SHA-256 for challenge generation", async () => {
      const pkce = await manager.generateChallenge();

      // SHA-256 hash in base64url is always 43 characters
      expect(pkce.challenge.length).toBe(43);
    });
  });
});
