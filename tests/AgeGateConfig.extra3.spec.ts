/**
 * @jest-environment ./tests/jest-environment-jsdom-configurable.cjs
 */

/* AgeGateConfig.extra3.spec.ts
   Knocks out the remaining AgeGateConfig survivors                */

import { AgeGateConfig } from "../src/agegate/AgeGateConfig.js";

declare const reconfigureJSDOM: (options: { url: string }) => void;

/**
 * Uses JSDOM's reconfigure() to change window.location URL.
 * This avoids the non-configurable property error from Object.defineProperty.
 */
const resetLoc = (href = "https://localhost/"): void => {
  reconfigureJSDOM({ url: href });
};

// Test public key matching the required format: pk_test_<64 hex chars>
const TEST_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/* constant props we don't vary */
const common = { publicKey: TEST_PUBLIC_KEY, environment: "sandbox" as const, mountElementId: "m" };

describe("AgeGateConfig - final edge-cases", () => {
  /* ------------------------------------------------------------------
     1: squashSlashes must **not** touch the "://" in a full URL
        kills regex-anchor mutant (/[^:]/ without ^)
  ------------------------------------------------------------------ */
  it('keeps the "://" sequence intact in an absolute statusUrl', () => {
    resetLoc(); // localhost origin

    const cfg = new AgeGateConfig({
      ...common,
      challengeUrl: "/ch",
      contentUrl: "/c",
      statusUrl: "http://localhost/foo//bar/{sid}",
    });

    expect(cfg.statusUrl).toBe("http://localhost/foo/bar/{sid}");
  });

  /* ------------------------------------------------------------------
     2: A bare "/" contentUrl must preserve the trailing slash,
        regardless of current page origin
        kills stripTrailingSlash conditional mutants
  ------------------------------------------------------------------ */
  it("retains the trailing slash for root-path contentUrl", () => {
    resetLoc("https://example.net/"); // non-localhost origin

    const cfg = new AgeGateConfig({
      ...common,
      challengeUrl: "/ch",
      contentUrl: "/", // root
    });

    expect(cfg.contentUrl).toBe("https://example.net/");
  });

  /* ------------------------------------------------------------------
     3: Leading "//" in contentUrl is collapsed *once*, not removed
        kills replacement-string mutant that returns "" instead of "/"
  ------------------------------------------------------------------ */
  it('converts a "//" prefix in contentUrl to a single "/"', () => {
    resetLoc();

    const cfg = new AgeGateConfig({
      ...common,
      challengeUrl: "/ch",
      contentUrl: "//double", // note TWO slashes
    });

    expect(cfg.contentUrl).toBe("https://localhost/double");
  });

  /* ------------------------------------------------------------------
     4: statusUrl with leading/trailing spaces must trim **and**
        remain relative, ensuring the `.trim()` call is intact
        kills mutant that removed `.trim()` on line 58
  ------------------------------------------------------------------ */
  it("trims whitespace around a relative statusUrl", () => {
    resetLoc();

    const cfg = new AgeGateConfig({
      ...common,
      challengeUrl: "/ch",
      contentUrl: "/c",
      statusUrl: "   / spaced /{sid}   ",
    });

    expect(cfg.statusUrl).toBe("https://localhost/ spaced /{sid}");
  });
});
