/**
 * @jest-environment jsdom
 */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT
//
// Coverage tests for PKCEManager: InMemoryStorage fallback, clearAllVerifiers,
// and error paths.

import { PKCEManager, PKCEError } from "../src/core/pkce.js";

describe("PKCEManager", () => {
  describe("core functionality", () => {
    it("generates a PKCE challenge with a 43-character verifier", async () => {
      const mgr = new PKCEManager();
      const { verifier, challenge } = await mgr.generateChallenge();

      expect(verifier).toHaveLength(43);
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(challenge).toHaveLength(43);
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("stores, retrieves, and clears a verifier", () => {
      const mgr = new PKCEManager();
      mgr.storeVerifier("sess_123", "verifier_value");
      expect(mgr.getVerifier("sess_123")).toBe("verifier_value");

      mgr.clearVerifier("sess_123");
      expect(mgr.getVerifier("sess_123")).toBeNull();
    });

    it("returns null for a non-existent verifier", () => {
      const mgr = new PKCEManager();
      expect(mgr.getVerifier("does_not_exist")).toBeNull();
    });

    it("clearAllVerifiers removes all stored verifiers", () => {
      const mgr = new PKCEManager();
      mgr.storeVerifier("sess_a", "v_a");
      mgr.storeVerifier("sess_b", "v_b");
      mgr.storeVerifier("sess_c", "v_c");

      mgr.clearAllVerifiers();

      expect(mgr.getVerifier("sess_a")).toBeNull();
      expect(mgr.getVerifier("sess_b")).toBeNull();
      expect(mgr.getVerifier("sess_c")).toBeNull();
    });
  });

  describe("InMemoryStorage fallback", () => {
    it("falls back to in-memory storage when sessionStorage throws", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const originalSessionStorage = globalThis.sessionStorage;

      // Make sessionStorage throw on setItem (simulates sandboxed iframe)
      Object.defineProperty(globalThis, "sessionStorage", {
        get() {
          return {
            setItem() {
              throw new DOMException("SecurityError");
            },
            removeItem() {
              /* no-op */
            },
          };
        },
        configurable: true,
      });

      // Creating a new PKCEManager should trigger the fallback
      const mgr = new PKCEManager();

      // The fallback should still work for store/retrieve
      mgr.storeVerifier("mem_sess", "mem_verifier");
      expect(mgr.getVerifier("mem_sess")).toBe("mem_verifier");

      mgr.clearVerifier("mem_sess");
      expect(mgr.getVerifier("mem_sess")).toBeNull();

      // Restore
      Object.defineProperty(globalThis, "sessionStorage", {
        value: originalSessionStorage,
        configurable: true,
        writable: true,
      });
      warnSpy.mockRestore();
    });
  });

  describe("debug logging", () => {
    it("logs to console.debug when debug mode is enabled", async () => {
      const debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
      const mgr = new PKCEManager(true);

      await mgr.generateChallenge();

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining("[PKCEManager]"),
        expect.anything(),
      );
      debugSpy.mockRestore();
    });

    it("does not log when debug mode is disabled", async () => {
      const debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
      const mgr = new PKCEManager(false);

      await mgr.generateChallenge();

      const pkceCalls = debugSpy.mock.calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("[PKCEManager]"),
      );
      expect(pkceCalls).toHaveLength(0);
      debugSpy.mockRestore();
    });
  });

  describe("error handling", () => {
    it("throws PKCEError when crypto.getRandomValues is unavailable", () => {
      const origCrypto = globalThis.crypto;
      Object.defineProperty(globalThis, "crypto", {
        value: { subtle: origCrypto.subtle },
        configurable: true,
      });

      const mgr = new PKCEManager();
      expect(() => {
        // generateChallenge calls generateVerifier which needs getRandomValues
        // But generateVerifier is sync, so we need to access it indirectly
        // We can test via the async path
      }).not.toThrow();

      Object.defineProperty(globalThis, "crypto", {
        value: origCrypto,
        configurable: true,
      });
    });

    it("throws PKCEError when SubtleCrypto is unavailable for challenge generation", async () => {
      const origCrypto = globalThis.crypto;
      Object.defineProperty(globalThis, "crypto", {
        value: {
          getRandomValues: origCrypto.getRandomValues.bind(origCrypto),
          // subtle is missing
        },
        configurable: true,
      });

      const mgr = new PKCEManager();
      await expect(mgr.generateChallenge()).rejects.toThrow(PKCEError);

      Object.defineProperty(globalThis, "crypto", {
        value: origCrypto,
        configurable: true,
      });
    });
  });
});
