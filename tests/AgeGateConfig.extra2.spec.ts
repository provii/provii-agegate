/* AgeGateConfig.extra2.spec.ts
   Targets the REGEX + root-slash + fallback-origin survivors        */

import { AgeGateConfig } from "../src/agegate/AgeGateConfig.js";

// Test public key matching the required format: pk_test_<64 hex chars>
const TEST_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/* common options used in every case */
const base = {
  publicKey: TEST_PUBLIC_KEY,
  environment: "sandbox" as const,
  mountElementId: "age-mount",
};

/* ------------------------------------------------------------------ */
/* 1: leading "//" in statusUrl must be collapsed to single "/"       */
/*    kills the regex-anchor mutant at line 9                         */
it("collapses a *leading* double-slash in statusUrl", () => {
  const cfg = new AgeGateConfig({
    ...base,
    challengeUrl: "/gate",
    contentUrl: "/protected",
    statusUrl: "//foo//bar/{sid}",
  });

  expect(cfg.statusUrl).toBe("https://localhost/foo/bar/{sid}");
});

/* ------------------------------------------------------------------ */
/* 2: root "/" contentUrl keeps the slash                             */
/*    re-asserts root-slash guard mutant (still surviving)            */
it('preserves the solitary "/" when used as contentUrl', () => {
  const cfg = new AgeGateConfig({
    ...base,
    challengeUrl: "/gate",
    contentUrl: "/",
  });

  expect(cfg.contentUrl).toBe("https://localhost/");
});

/* ------------------------------------------------------------------ */
/* 3: hash is stripped but query is preserved in contentUrl           */
/*    kills hash string-literal mutant                                */
/*    NOTE: production code deliberately preserves the query string   */
/*    for success callbacks such as ?verified=true                    */
it("strips #hash but preserves ?query in contentUrl", () => {
  const cfg = new AgeGateConfig({
    ...base,
    challengeUrl: "/gate",
    contentUrl: "/page?foo=1#bar",
  });

  expect(cfg.contentUrl).toBe("https://localhost/page?foo=1");
});

/* ------------------------------------------------------------------ */
/* 4: fallback to "https://localhost" when window.origin === "null"   */
/*    kills pageOrigin "" mutant (line 39)                            */
it('falls back to https://localhost when location.origin is "null"', () => {
  /* Use jest-location-mock: setting href to a file:// URL causes
     origin to return "null", triggering the fallback branch */
  window.location.href = "file:///tmp/index.html";

  const cfg = new AgeGateConfig({
    ...base,
    challengeUrl: "/foo",
    contentUrl: "/bar",
  });

  expect(cfg.challengeUrl).toBe("https://localhost/foo");
});

/* ------------------------------------------------------------------ */
/* 5: collapse *exactly* the first two leading slashes in contentUrl  */
/*    but do not delete them altogether                               */
/*    kills replacement-string mutant at line 83                      */
it('converts "///triple" prefix to single "/" in contentUrl', () => {
  const cfg = new AgeGateConfig({
    ...base,
    challengeUrl: "/gate",
    contentUrl: "///triple",
  });

  expect(cfg.contentUrl).toBe("https://localhost/triple");
});
