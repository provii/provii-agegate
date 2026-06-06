/**
 * Deep link scheme validation tests (AG-U32 / ).
 *
 * Confirms that buildMobileChallengeUI rejects deep link URLs with
 * unexpected schemes before they reach DOM sinks (href attribute and
 * window.location assignment).
 *
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.com"}
 */

import {
  buildMobileChallengeUI,
  buildDesktopChallengeUI,
} from "../src/ui/challenge-ui.js";

/* ─────── Valid baseline data ─────── */

const validData = {
  shortCode: "123456789012",
  deepLink: "proviiwallet://verify?d=valid",
  qrPayload: "{}",
};

/* ─────── Scheme validation on mobile UI (href + location sinks) ─────── */

describe("assertDeepLinkScheme (AG-U32)", () => {
  it("accepts proviiwallet:// deep links", () => {
    const ui = buildMobileChallengeUI(validData);
    const host = document.createElement("div");
    host.appendChild(ui.root);

    const btn = host.querySelector("#agegate-mobile-btn") as HTMLAnchorElement;
    expect(btn).not.toBeNull();
    expect(btn.getAttribute("href")).toBe("proviiwallet://verify?d=valid");

    ui.destroy();
  });

  it("rejects javascript: scheme", () => {
    expect(() =>
      buildMobileChallengeUI({
        ...validData,
        deepLink: "javascript:alert(1)",
      }),
    ).toThrow('expected "proviiwallet:" prefix');
  });

  it("rejects data: scheme", () => {
    expect(() =>
      buildMobileChallengeUI({
        ...validData,
        deepLink: "data:text/html,<script>alert(1)</script>",
      }),
    ).toThrow('expected "proviiwallet:" prefix');
  });

  it("rejects https: scheme", () => {
    expect(() =>
      buildMobileChallengeUI({
        ...validData,
        deepLink: "https://evil.com",
      }),
    ).toThrow('expected "proviiwallet:" prefix');
  });

  it("rejects http: scheme", () => {
    expect(() =>
      buildMobileChallengeUI({
        ...validData,
        deepLink: "http://evil.com/redirect",
      }),
    ).toThrow('expected "proviiwallet:" prefix');
  });

  it("rejects empty string", () => {
    expect(() =>
      buildMobileChallengeUI({
        ...validData,
        deepLink: "",
      }),
    ).toThrow('expected "proviiwallet:" prefix');
  });

  it("rejects scheme that is a prefix-of proviiwallet but not proviiwallet:", () => {
    // "proviiwalletfake://" starts with "proviiwallet" but NOT "proviiwallet:"
    // (the colon matters), so this must be rejected.
    expect(() =>
      buildMobileChallengeUI({
        ...validData,
        deepLink: "proviiwalletfake://verify?d=x",
      }),
    ).toThrow('expected "proviiwallet:" prefix');
  });
});

/* ─────── Desktop UI does not use deep link sinks but should still
           accept valid data without error ─────── */

describe("buildDesktopChallengeUI baseline (AG-U32 regression)", () => {
  it("builds successfully with valid deep link", () => {
    const ui = buildDesktopChallengeUI(validData);
    expect(ui.root).toBeDefined();
    ui.destroy();
  });
});
