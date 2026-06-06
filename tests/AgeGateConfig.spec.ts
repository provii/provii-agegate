/**
 * Unified deterministic tests for src/agegate/AgeGateConfig.ts
 * (Property‑based coverage lives under /property)
 *
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.com"}
 */

import { AgeGateConfig } from "../src/agegate/AgeGateConfig.js";

/* ------------------------------------------------------------------ */
/* utilities                                                          */
/* ------------------------------------------------------------------ */
const HTTPS_ORIGIN = "https://example.com";

// Test public key matching the required format: pk_test_<64 hex chars>
const TEST_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/* shorthand builder */
const make = (
  o: Partial<ConstructorParameters<typeof AgeGateConfig>[0]> = {},
) =>
  new AgeGateConfig({
    publicKey: TEST_PUBLIC_KEY,
    environment: "sandbox" as const,
    challengeUrl: "/age/challenge/",
    contentUrl: "/content/",
    mountElementId: "mount",
    ...o,
  });

/* ------------------------------------------------------------------ */
/* contentUrl normalisation                                           */
/* ------------------------------------------------------------------ */
describe("contentUrl normalisation", () => {
  it.each([
    ["trailing slash", "/content/", "https://example.com/content"],
    ["multiple trailing ///", "/content///", "https://example.com/content"],
    ["missing leading slash", "article", "https://example.com/article"],
    [
      "too many leading slashes",
      "///deep/path",
      "https://example.com/deep/path",
    ],
  ])("normalises %s", (_, input, expected) => {
    expect(make({ contentUrl: input }).contentUrl).toBe(expected);
  });
});

/* ------------------------------------------------------------------ */
/* pollInterval guard                                                 */
/* ------------------------------------------------------------------ */
describe("pollInterval constraints", () => {
  it("throws when < 500 ms", () => {
    // ✅ FIXED: Updated to match actual error message
    expect(() => make({ pollInterval: 100 })).toThrow(
      "pollInterval must be ≥ 500 ms",
    );
  });

  it("accepts ≥ 500 ms", () => {
    expect(() => make({ pollInterval: 750 })).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* statusUrl derivation / override                                    */
/* ------------------------------------------------------------------ */
describe("statusUrl logic", () => {
  it("honours explicit override – even with {sid} in hostname", () => {
    const explicit = "https://{sid}.alt/status/{sid}";
    expect(make({ statusUrl: explicit }).statusUrl).toBe(explicit);
  });
});
