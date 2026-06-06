/* AgeGateConfig.extra.spec.ts
   Extra tests to harden AgeGateConfig mutation‑coverage */

import { AgeGateConfig } from "../src/agegate/AgeGateConfig.js";

// Test public key matching the required format: pk_test_<64 hex chars>
const TEST_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const common = {
  publicKey: TEST_PUBLIC_KEY,
  environment: "sandbox" as const,
  mountElementId: "age‑gate",
  // keep the page origin in JSDOM ("http://localhost/")
};

/* ------------------------------------------------------------------ */
/* 1. whitespace‑only statusUrl ⇒ use the derived default              */
/*    ── Kills: 12 & 13 (lost .trim())                                 */
it("derives statusUrl when statusUrl is only whitespace", () => {
  const cfg = new AgeGateConfig({
    ...common,
    challengeUrl: "/challenge",
    contentUrl: "/protected",
    statusUrl: "   ", // only spaces
  });

  expect(cfg.statusUrl).toBe("https://localhost/challenge/{sid}");
});

/* ------------------------------------------------------------------ */
/* 2. encoded {sid} is normalised to raw braces                        */
/*    ── Kills: 17 (replacement dropped {sid})                         */
it("normalises %7Bsid%7D back to {sid}", () => {
  const cfg = new AgeGateConfig({
    ...common,
    challengeUrl: "/gate",
    contentUrl: "/protected",
    statusUrl: "/api/%7Bsid%7D/details",
  });

  expect(cfg.statusUrl).toBe("https://localhost/api/{sid}/details");
});

/* ------------------------------------------------------------------ */
/* 3. mixed raw + encoded placeholders ⇒ throws                        */
/*    ── Kills: 14, 15 & 16 (dupe‑count regex & +/- arithmetic)        */
it("rejects statusUrl containing BOTH raw and encoded {sid}", () => {
  expect(
    () =>
      new AgeGateConfig({
        ...common,
        challengeUrl: "/gate",
        contentUrl: "/protected",
        statusUrl: "/check/{sid}/%7Bsid%7D",
      }),
  ).toThrow("statusUrl must contain at most one {sid} placeholder");
});

/* ------------------------------------------------------------------ */
/* 4. double slashes inside path are collapsed but                ░░   */
/*    the preceding character is preserved                            */
/*    ── Kills: 1, 2 & 4 (squashSlashes regex & empty replacement)     */
it('collapses "//" inside the path without deleting the preceding char', () => {
  const cfg = new AgeGateConfig({
    ...common,
    challengeUrl: "/gate",
    contentUrl: "/protected",
    statusUrl: "/foo//bar/{sid}",
  });

  expect(cfg.statusUrl).toBe("https://localhost/foo/bar/{sid}");
});

/* ------------------------------------------------------------------ */
/* 5. contentUrl == "/" keeps its trailing slash                       */
/*    ── Kills: 3 (stripTrailingSlash special‑case)                    */
it('leaves the solitary "/" in contentUrl intact', () => {
  const cfg = new AgeGateConfig({
    ...common,
    challengeUrl: "/gate",
    contentUrl: "/", // root
  });

  expect(cfg.contentUrl).toBe("https://localhost/");
});

/* ------------------------------------------------------------------ */
/* 6. inner double slash inside contentUrl *is not* collapsed          */
/*    ── Kills: 18 & 19 (cleanedContent regex anchor & replacement)    */
it('preserves inner "//" segments in contentUrl', () => {
  const cfg = new AgeGateConfig({
    ...common,
    challengeUrl: "/gate",
    contentUrl: "/assets//img",
  });

  expect(cfg.contentUrl).toBe("https://localhost/assets//img");
});

/* ------------------------------------------------------------------ */
/* 7. "/foo/http://bar" is treated as *relative* (anchor ^ matters)    */
/*    ── Kills: 7 (absolute‑URL regex lost ^)                          */
it("does not mistake an embedded scheme in the path for an absolute URL", () => {
  const cfg = new AgeGateConfig({
    ...common,
    challengeUrl: "/foo/http://bar", // relative
    contentUrl: "/protected",
  });

  expect(cfg.challengeUrl).toBe("https://localhost/foo/http://bar");
});

/* ------------------------------------------------------------------ */
/* 8. A real absolute URL is correctly recognised                      */
/*    ── Kills: 8 & 9 (first‑char inverted / char‑class trimmed)       */
it("recognises an absolute challengeUrl that starts with a letter", () => {
  const cfg = new AgeGateConfig({
    ...common,
    challengeUrl: "https://example.com",
    contentUrl: "/protected",
  });

  expect(cfg.challengeUrl).toBe("https://example.com/");
});

/* ------------------------------------------------------------------ */
/* 9. surrounding spaces are trimmed off an explicit statusUrl         */
/*    (covers the variant where .trim() on supplied string was removed)*/
/*    ── Further assurance against 12 & 13                             */
it("trims leading & trailing spaces from an explicit statusUrl", () => {
  const cfg = new AgeGateConfig({
    ...common,
    challengeUrl: "/gate",
    contentUrl: "/protected",
    statusUrl: "   /status/{sid}   ",
  });

  expect(cfg.statusUrl).toBe("https://localhost/status/{sid}");
});
