// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT
/**
 * Full AgeGateConfig tests for mutation coverage
 * Focuses on validation, error paths, and edge cases
 */

import { AgeGateConfig } from "../src/agegate/AgeGateConfig.js";

// Test public key matching the required format: pk_test_<64 hex chars>
const TEST_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("AgeGateConfig - Full Validation", () => {
  // Set up test environment using jest-location-mock (configured in jest.config.cjs setupFilesAfterEnv)
  beforeEach(() => {
    window.location.href = "https://localhost/";
    // Mock console.warn to avoid noise from validation warnings
    jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Required fields validation", () => {
    it("throws error when options are null", () => {
      expect(() => new AgeGateConfig(null as any)).toThrow(
        "AgeGateOptions is required",
      );
    });

    it("throws error when options are undefined", () => {
      expect(() => new AgeGateConfig(undefined as any)).toThrow(
        "AgeGateOptions is required",
      );
    });

    it("throws error when contentUrl is missing", () => {
      expect(
        () =>
          new AgeGateConfig({
            publicKey: TEST_PUBLIC_KEY,
            environment: "sandbox" as const,
            challengeUrl: "/challenge",
            mountElementId: "mount",
          } as any),
      ).toThrow("contentUrl is required");
    });

    it("throws error when mountElementId is missing", () => {
      expect(
        () =>
          new AgeGateConfig({
            publicKey: TEST_PUBLIC_KEY,
            environment: "sandbox" as const,
            challengeUrl: "/challenge",
            contentUrl: "/content",
          } as any),
      ).toThrow("mountElementId is required");
    });

    it("throws error for empty mountElementId", () => {
      expect(
        () =>
          new AgeGateConfig({
            publicKey: TEST_PUBLIC_KEY,
            environment: "sandbox" as const,
            challengeUrl: "/challenge",
            contentUrl: "/content",
            mountElementId: "",
          }),
      ).toThrow();
    });

    it("rejects whitespace-only mountElementId", () => {
      expect(
        () =>
          new AgeGateConfig({
            publicKey: TEST_PUBLIC_KEY,
            environment: "sandbox" as const,
            challengeUrl: "/challenge",
            contentUrl: "/content",
            mountElementId: "   ",
          }),
      ).toThrow("mountElementId is required");
    });
  });

  describe("verifyingKeyId validation", () => {
    const baseConfig = {
      publicKey: TEST_PUBLIC_KEY,
      environment: "sandbox" as const,
      challengeUrl: "/challenge",
      contentUrl: "/content",
      mountElementId: "mount",
    };

    it("accepts verifyingKeyId of 0", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        verifyingKeyId: 0,
      });
      expect(config.verifyingKeyId).toBe(0);
    });

    it("accepts verifyingKeyId of 12", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        verifyingKeyId: 12,
      });
      expect(config.verifyingKeyId).toBe(12);
    });

    it("accepts verifyingKeyId of 9999999999", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        verifyingKeyId: 9999999999,
      });
      expect(config.verifyingKeyId).toBe(9999999999);
    });

    it("throws for verifyingKeyId < 0", () => {
      expect(
        () =>
          new AgeGateConfig({
            ...baseConfig,
            verifyingKeyId: -1,
          }),
      ).toThrow(/verifyingKeyId must be an integer/);
    });

    it("throws for verifyingKeyId > max", () => {
      expect(
        () =>
          new AgeGateConfig({
            ...baseConfig,
            verifyingKeyId: 10000000000,
          }),
      ).toThrow(/verifyingKeyId must be an integer/);
    });

    it("throws for non-integer verifyingKeyId", () => {
      expect(
        () =>
          new AgeGateConfig({
            ...baseConfig,
            verifyingKeyId: 12.5,
          }),
      ).toThrow(/verifyingKeyId must be an integer/);
    });
  });

  describe("pollInterval validation", () => {
    const baseConfig = {
      publicKey: TEST_PUBLIC_KEY,
      environment: "sandbox" as const,
      challengeUrl: "/challenge",
      contentUrl: "/content",
      mountElementId: "mount",
    };

    it("accepts minimum pollInterval of 500ms", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        pollInterval: 500,
      });
      expect(config.pollInterval).toBe(500);
    });

    it("accepts pollInterval of 2000ms", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        pollInterval: 2000,
      });
      expect(config.pollInterval).toBe(2000);
    });

    it("accepts maximum pollInterval of 60000ms", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        pollInterval: 60000,
      });
      expect(config.pollInterval).toBe(60000);
    });

    it("throws for pollInterval < 500ms", () => {
      expect(
        () =>
          new AgeGateConfig({
            ...baseConfig,
            pollInterval: 499,
          }),
      ).toThrow(/pollInterval must be ≥ 500 ms/);
    });

    it("throws for pollInterval > 60000ms", () => {
      expect(
        () =>
          new AgeGateConfig({
            ...baseConfig,
            pollInterval: 60001,
          }),
      ).toThrow(/pollInterval must be ≤ 60000 ms/);
    });

    it("throws for non-integer pollInterval", () => {
      expect(
        () =>
          new AgeGateConfig({
            ...baseConfig,
            pollInterval: 1000.5,
          }),
      ).toThrow("pollInterval must be an integer");
    });

    it("defaults to 3000ms when not specified", () => {
      const config = new AgeGateConfig(baseConfig);
      expect(config.pollInterval).toBe(3000);
    });
  });

  describe("URL length validation", () => {
    const baseConfig = {
      publicKey: TEST_PUBLIC_KEY,
      environment: "sandbox" as const,
      contentUrl: "/content",
      mountElementId: "mount",
    };

    it("accepts challengeUrl at exactly 2048 characters", () => {
      const longUrl =
        "https://example.com/" +
        "a".repeat(2048 - "https://example.com/".length);
      const config = new AgeGateConfig({
        ...baseConfig,
        challengeUrl: longUrl,
      });
      expect(config.challengeUrl.length).toBeLessThanOrEqual(2048);
    });

    it("throws for challengeUrl exceeding 2048 characters", () => {
      const tooLongUrl = "https://example.com/" + "a".repeat(2100);
      expect(
        () =>
          new AgeGateConfig({
            ...baseConfig,
            challengeUrl: tooLongUrl,
          }),
      ).toThrow(/challengeUrl exceeds maximum length/);
    });

    it("throws for statusUrl exceeding 2048 characters", () => {
      const tooLongUrl = "https://example.com/" + "a".repeat(2100) + "/{sid}";
      expect(
        () =>
          new AgeGateConfig({
            ...baseConfig,
            challengeUrl: "/challenge",
            statusUrl: tooLongUrl,
          }),
      ).toThrow(/statusUrl exceeds maximum length/);
    });

    it("throws for contentUrl exceeding 2048 characters", () => {
      const tooLongUrl = "/" + "a".repeat(2100);
      expect(
        () =>
          new AgeGateConfig({
            publicKey: TEST_PUBLIC_KEY,
            environment: "sandbox" as const,
            challengeUrl: "/challenge",
            mountElementId: "mount",
            contentUrl: tooLongUrl,
          }),
      ).toThrow(/contentUrl exceeds maximum length/);
    });

    it("throws for redeemUrl exceeding 2048 characters", () => {
      const tooLongUrl = "https://example.com/" + "a".repeat(2100);
      expect(
        () =>
          new AgeGateConfig({
            ...baseConfig,
            challengeUrl: "/challenge",
            redeemMode: "rp-proxy",
            redeemUrl: tooLongUrl,
          }),
      ).toThrow(/redeemUrl exceeds maximum length/);
    });
  });

  describe("statusUrl {sid} placeholder validation", () => {
    const baseConfig = {
      publicKey: TEST_PUBLIC_KEY,
      environment: "sandbox" as const,
      challengeUrl: "/challenge",
      contentUrl: "/content",
      mountElementId: "mount",
    };

    it("accepts statusUrl with one {sid} placeholder", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        statusUrl: "https://example.com/status/{sid}",
      });
      expect(config.statusUrl).toContain("{sid}");
    });

    it("throws for statusUrl without {sid} placeholder", () => {
      expect(
        () =>
          new AgeGateConfig({
            ...baseConfig,
            statusUrl: "https://example.com/status",
          }),
      ).toThrow("statusUrl must contain exactly one {sid} placeholder");
    });

    it("throws for statusUrl with multiple {sid} placeholders", () => {
      expect(
        () =>
          new AgeGateConfig({
            ...baseConfig,
            statusUrl: "https://example.com/{sid}/status/{sid}",
          }),
      ).toThrow(/statusUrl must contain at most one/);
    });

    it("accepts statusUrl with {sid} in path", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        statusUrl: "/api/v1/challenges/{sid}/status",
      });
      expect(config.statusUrl).toContain("{sid}");
    });

    it("handles URL-encoded {sid} placeholder", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        statusUrl: "https://example.com/status/%7Bsid%7D",
      });
      // Should decode %7B and %7D to { and }
      expect(config.statusUrl).toContain("{sid}");
    });
  });

  describe("redeemMode validation", () => {
    const baseConfig = {
      publicKey: TEST_PUBLIC_KEY,
      environment: "sandbox" as const,
      challengeUrl: "/challenge",
      contentUrl: "/content",
      mountElementId: "mount",
    };

    it("defaults to direct mode when not specified", () => {
      const config = new AgeGateConfig(baseConfig);
      expect(config.redeemMode).toBe("direct");
    });

    it("accepts rp-proxy mode with redeemUrl", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        redeemMode: "rp-proxy",
        redeemUrl: "https://mybackend.com/redeem",
      });
      expect(config.redeemMode).toBe("rp-proxy");
      expect(config.redeemUrl).toBe("https://mybackend.com/redeem");
    });

    it("throws for rp-proxy mode without redeemUrl", () => {
      expect(
        () =>
          new AgeGateConfig({
            ...baseConfig,
            redeemMode: "rp-proxy",
          }),
      ).toThrow("redeemUrl is required when using rp-proxy mode");
    });

    it("accepts direct mode without redeemUrl", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        redeemMode: "direct",
      });
      expect(config.redeemMode).toBe("direct");
      expect(config.redeemUrl).toBeUndefined();
    });
  });

  describe("URL normalization", () => {
    const baseConfig = {
      publicKey: TEST_PUBLIC_KEY,
      environment: "sandbox" as const,
      challengeUrl: "/challenge",
      mountElementId: "mount",
    };

    it("strips trailing slash from contentUrl", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        contentUrl: "/content/",
      });
      expect(config.contentUrl).toBe("https://localhost/content");
    });

    it("strips multiple trailing slashes from contentUrl", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        contentUrl: "/content///",
      });
      expect(config.contentUrl).toBe("https://localhost/content");
    });

    it("preserves double slashes in path (squashSlashes not applied to contentUrl)", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        contentUrl: "/content//page",
      });
      // contentUrl only collapses leading double slashes, not internal ones
      expect(config.contentUrl).toBe("https://localhost/content//page");
    });

    it("preserves single slash as contentUrl", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        contentUrl: "/",
      });
      expect(config.contentUrl).toBe("https://localhost/");
    });

    it("adds leading slash to contentUrl without one", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        contentUrl: "content",
      });
      expect(config.contentUrl).toBe("https://localhost/content");
    });

    it("collapses leading triple slashes", () => {
      const config = new AgeGateConfig({
        ...baseConfig,
        contentUrl: "///content",
      });
      expect(config.contentUrl).toBe("https://localhost/content");
    });
  });

  describe("Cross-origin validation", () => {
    it("throws for cross-origin absolute contentUrl", () => {
      expect(
        () =>
          new AgeGateConfig({
            publicKey: TEST_PUBLIC_KEY,
            environment: "sandbox" as const,
            challengeUrl: "/challenge",
            contentUrl: "https://evil.com/content",
            mountElementId: "mount",
          }),
      ).toThrow();
    });

    it("accepts same-origin absolute contentUrl", () => {
      const config = new AgeGateConfig({
        publicKey: TEST_PUBLIC_KEY,
        environment: "sandbox" as const,
        challengeUrl: "/challenge",
        contentUrl: "https://localhost/content",
        mountElementId: "mount",
      });
      expect(config.contentUrl).toBe("https://localhost/content");
    });

    it("accepts relative contentUrl", () => {
      const config = new AgeGateConfig({
        publicKey: TEST_PUBLIC_KEY,
        environment: "sandbox" as const,
        challengeUrl: "/challenge",
        contentUrl: "/content",
        mountElementId: "mount",
      });
      expect(config.contentUrl).toBe("https://localhost/content");
    });
  });

  describe("Default values", () => {
    const baseConfig = {
      publicKey: TEST_PUBLIC_KEY,
      environment: "sandbox" as const,
      challengeUrl: "/challenge",
      contentUrl: "/content",
      mountElementId: "mount",
    };

    it("uses default verifyingKeyId of 2031517468", () => {
      const config = new AgeGateConfig(baseConfig);
      expect(config.verifyingKeyId).toBe(2031517468);
    });

    it("uses default pollInterval of 3000ms", () => {
      const config = new AgeGateConfig(baseConfig);
      expect(config.pollInterval).toBe(3000);
    });

    it("uses default redeemMode of direct", () => {
      const config = new AgeGateConfig(baseConfig);
      expect(config.redeemMode).toBe("direct");
    });

    it("derives default statusUrl from challengeUrl", () => {
      const config = new AgeGateConfig({
        publicKey: TEST_PUBLIC_KEY,
        environment: "sandbox" as const,
        challengeUrl: "https://api.example.com/v1/challenge",
        contentUrl: "/content",
        mountElementId: "mount",
      });
      // Should have a statusUrl with {sid}
      expect(config.statusUrl).toContain("{sid}");
      expect(config.statusUrl).toContain("https://");
    });
  });

  describe("Element validation", () => {
    const baseConfig = {
      publicKey: TEST_PUBLIC_KEY,
      environment: "sandbox" as const,
      challengeUrl: "/challenge",
      contentUrl: "/content",
    };

    it("warns when mount element does not exist in DOM", () => {
      jest.clearAllMocks(); // Clear previous calls
      const consoleSpy = jest.spyOn(console, "warn");

      new AgeGateConfig({
        ...baseConfig,
        mountElementId: "non-existent-element",
      });

      // Should have warnings (at least one for missing element)
      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.map((call) => String(call[0]));
      expect(calls.some((msg) => msg.includes("non-existent-element"))).toBe(
        true,
      );
    });

    it("does not warn about missing element when it exists in DOM", () => {
      const element = document.createElement("div");
      element.id = "test-mount";
      document.body.appendChild(element);

      jest.clearAllMocks(); // Clear previous calls
      const consoleSpy = jest.spyOn(console, "warn");

      new AgeGateConfig({
        ...baseConfig,
        mountElementId: "test-mount",
      });

      // Check that no warning mentions the mount element
      const calls = consoleSpy.mock.calls.map((call) => String(call[0]));
      expect(calls.every((msg) => !msg.includes("test-mount"))).toBe(true);

      document.body.removeChild(element);
    });
  });
});
