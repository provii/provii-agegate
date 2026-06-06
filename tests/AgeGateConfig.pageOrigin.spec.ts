import { AgeGateConfig } from "../src/agegate/AgeGateConfig.js";

// Test public key matching the required format: pk_test_<64 hex chars>
const TEST_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/**
 * This test kills the mutant that changes
 *   `let pageOrigin = 'http://localhost'`
 * to an empty string.
 *
 * We make `window.location.href` invalid so the `new URL()` call in the
 * try‑block throws.  The constructor must then rely on the default
 * `'http://localhost'`.  If the mutant removes that default the second
 * `new URL()` call (building `challengeUrl`) will throw and the test fails.
 */
it('falls back to "http://localhost" when window.location.href is invalid', () => {
  // give the location.href a value that will make `new URL()` throw
  delete (window as any).location;
  (window as any).location = { href: "%%%not a url%%%" };

  // should construct without throwing and prefix the relative URL
  const cfg = new AgeGateConfig({
    publicKey: TEST_PUBLIC_KEY,
    environment: "sandbox" as const,
    mountElementId: "m",
    challengeUrl: "/rel",
    contentUrl: "/c",
  });

  expect(cfg.challengeUrl).toBe("https://localhost/rel");
});
