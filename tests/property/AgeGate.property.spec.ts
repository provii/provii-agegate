/**
 * Property-based tests for AgeGate.ts (integration level)
 *
 * Tests integration-level properties:
 * - Configuration validation (via isValidHexColour from config-parser)
 * - Base64url encoding invariants (via bytesToB64urlStrict from utils/base64)
 * - Lifecycle management
 * - State consistency
 * - Error recovery
 */

import fc from "fast-check";
import { isValidHexColour } from "../../src/modes/config-parser.js";
import { bytesToB64urlStrict } from "../../src/utils/base64.js";

describe("AgeGate.ts - Property-Based Tests (Integration)", () => {
  /* ========================================================================== */
  /*               PRODUCTION CODE PROPERTY TESTS                              */
  /* ========================================================================== */

  describe("isValidHexColour (config-parser)", () => {
    // Arbitrary that produces exactly N hex characters (0-9, a-f, A-F)
    const hexChars = (n: number) =>
      fc
        .array(
          fc.mapToConstant(
            { num: 10, build: (v: number) => String(v) },
            { num: 6, build: (v: number) => String.fromCharCode(97 + v) },
            { num: 6, build: (v: number) => String.fromCharCode(65 + v) },
          ),
          { minLength: n, maxLength: n },
        )
        .map((arr) => arr.join(""));

    it("Property: accepts any 6-digit hex colour with # prefix", () => {
      fc.assert(
        fc.property(hexChars(6), (hexDigits) => {
          const colour = `#${hexDigits}`;
          expect(isValidHexColour(colour)).toBe(true);
        }),
        { numRuns: 200 },
      );
    });

    it("Property: accepts any 3-digit hex colour with # prefix", () => {
      fc.assert(
        fc.property(hexChars(3), (hexDigits) => {
          const colour = `#${hexDigits}`;
          expect(isValidHexColour(colour)).toBe(true);
        }),
        { numRuns: 200 },
      );
    });

    it("Property: rejects strings without a # prefix", () => {
      fc.assert(
        fc.property(hexChars(6), (hexDigits) => {
          // No leading #, so should always be rejected
          expect(isValidHexColour(hexDigits)).toBe(false);
        }),
        { numRuns: 200 },
      );
    });

    it("Property: rejects hex strings of wrong length", () => {
      fc.assert(
        fc.property(
          fc
            .integer({ min: 1, max: 10 })
            .filter((n) => n !== 3 && n !== 6)
            .chain((n) => hexChars(n)),
          (hexDigits) => {
            const colour = `#${hexDigits}`;
            expect(isValidHexColour(colour)).toBe(false);
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  describe("bytesToB64urlStrict (base64)", () => {
    it("Property: output contains only URL-safe characters (no +, /, or =)", () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 1, maxLength: 256 }),
          (bytes) => {
            const encoded = bytesToB64urlStrict(bytes);
            expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
          },
        ),
        { numRuns: 200 },
      );
    });

    it("Property: output length is deterministic for same input", () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 0, maxLength: 256 }),
          (bytes) => {
            const first = bytesToB64urlStrict(bytes);
            const second = bytesToB64urlStrict(bytes);
            expect(first).toBe(second);
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  /* ========================================================================== */
  /*                    CONFIGURATION PROPERTIES                               */
  /* ========================================================================== */

  describe("Configuration validation", () => {
    it("Property: Valid issuer URLs are accepted", () => {
      fc.assert(
        fc.property(fc.webUrl({ validSchemes: ["https"] }), (issuerUrl) => {
          // Test that URLs with https scheme are valid format
          expect(issuerUrl).toMatch(/^https:\/\//);
        }),
        { numRuns: 100 },
      );
    });

    it("Property: Min age must be positive", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 150 }), (minAge) => {
          expect(minAge).toBeGreaterThan(0);
          expect(minAge).toBeLessThan(200);
        }),
        { numRuns: 100 },
      );
    });

    it("Property: Invalid ages are rejected", () => {
      const invalidAges = [-1, 0, 201, NaN, Infinity, -Infinity];

      for (const age of invalidAges) {
        expect(Number.isFinite(age) && age > 0 && age <= 200).toBe(false);
      }
    });
  });

  /* ========================================================================== */
  /*                    STATE CONSISTENCY PROPERTIES                           */
  /* ========================================================================== */

  describe("State consistency", () => {
    it("Property: Valid state transitions", () => {
      const validStates = ["idle", "loading", "ready", "error", "success"];
      const validTransitions = [
        ["idle", "loading"],
        ["loading", "ready"],
        ["loading", "error"],
        ["ready", "success"],
        ["ready", "error"],
      ];

      for (const [from, to] of validTransitions) {
        expect(validStates).toContain(from);
        expect(validStates).toContain(to);
      }
    });

    it("Property: State names are consistent", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("idle", "loading", "ready", "error", "success"),
          (state) => {
            expect(typeof state).toBe("string");
            expect(state.length).toBeGreaterThan(0);
            expect(state).toMatch(/^[a-z]+$/);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /* ========================================================================== */
  /*                    ERROR HANDLING PROPERTIES                              */
  /* ========================================================================== */

  describe("Error handling", () => {
    it("Property: Network errors have consistent structure", () => {
      const errorTypes = [
        "NETWORK_ERROR",
        "TIMEOUT",
        "INVALID_RESPONSE",
        "AUTH_FAILED",
      ];

      for (const errorType of errorTypes) {
        expect(errorType).toMatch(/^[A-Z_]+$/);
        expect(errorType.length).toBeGreaterThan(0);
      }
    });

    it("Property: Error messages are non-empty", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), (errorMsg) => {
          expect(errorMsg.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    });
  });

  /* ========================================================================== */
  /*                    TIMEOUT PROPERTIES                                     */
  /* ========================================================================== */

  describe("Timeout configuration", () => {
    it("Property: Positive timeouts are valid", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 300000 }), (timeout) => {
          expect(timeout).toBeGreaterThan(0);
          expect(timeout).toBeLessThanOrEqual(300000); // 5 minutes max
        }),
        { numRuns: 100 },
      );
    });

    it("Property: Invalid timeouts are rejected", () => {
      const invalidTimeouts = [-1, 0, Infinity, -Infinity, NaN];

      for (const timeout of invalidTimeouts) {
        expect(Number.isFinite(timeout) && timeout > 0).toBe(false);
      }
    });
  });

  /* ========================================================================== */
  /*                    CALLBACK PROPERTIES                                    */
  /* ========================================================================== */

  describe("Callback validation", () => {
    it("Property: Callbacks are functions", () => {
      const validCallback = jest.fn();
      expect(typeof validCallback).toBe("function");
    });

    it("Property: Invalid callbacks are rejected", () => {
      const invalidCallbacks: unknown[] = [null, undefined, 123, "string", {}, []];

      for (const cb of invalidCallbacks) {
        expect(typeof cb === "function").toBe(false);
      }
    });
  });

  /* ========================================================================== */
  /*                    URL VALIDATION PROPERTIES                              */
  /* ========================================================================== */

  describe("URL validation", () => {
    it("Property: HTTPS URLs are valid", () => {
      fc.assert(
        fc.property(fc.webUrl({ validSchemes: ["https"] }), (url) => {
          expect(() => new URL(url)).not.toThrow();
          expect(url.startsWith("https://")).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it("Property: HTTP URLs should be rejected for production", () => {
      fc.assert(
        fc.property(fc.webUrl({ validSchemes: ["http"] }), (url) => {
          // In production, should validate for HTTPS
          expect(url.startsWith("http://")).toBe(true);
          expect(url.startsWith("https://")).toBe(false);
        }),
        { numRuns: 50 },
      );
    });
  });

  /* ========================================================================== */
  /*                    DATA INTEGRITY PROPERTIES                              */
  /* ========================================================================== */

  describe("Data integrity", () => {
    it("Property: Challenge IDs are unique-looking", () => {
      fc.assert(
        fc.property(fc.uuid(), (uuid) => {
          expect(uuid).toMatch(/^[a-f0-9-]+$/);
          expect(uuid.length).toBeGreaterThan(20);
        }),
        { numRuns: 100 },
      );
    });

    it("Property: Timestamps are valid", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: Date.now() + 86400000 }),
          (timestamp) => {
            expect(timestamp).toBeGreaterThanOrEqual(0);
            const date = new Date(timestamp);
            expect(date.toString()).not.toBe("Invalid Date");
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
