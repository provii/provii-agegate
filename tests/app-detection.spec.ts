/**
 * @jest-environment jsdom
 */
// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Mutation-killing tests for src/utils/device.ts (isMobile).
 *
 * The function under test is a single expression:
 *   typeof navigator !== "undefined" &&
 *   /iphone|ipad|android|ios/i.test(navigator.userAgent)
 *
 * Stryker mutations to kill:
 * Stryker mutations targeted: typeof guard removal, !== to === flip,
 * "undefined" string swap, individual regex alternative removal,
 * /i flag removal, && to || swap, constant true/false return,
 * return negation, regex wildcard replacement, method swap.
 */

import { isMobile } from "../src/utils/device.js";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

let originalUA: string;

beforeEach(() => {
  originalUA = navigator.userAgent;
});

afterEach(() => {
  Object.defineProperty(navigator, "userAgent", {
    value: originalUA,
    configurable: true,
  });
});

/** Override navigator.userAgent for the duration of a single call. */
function withUA(ua: string): boolean {
  Object.defineProperty(navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
  return isMobile();
}

/* ------------------------------------------------------------------ */
/* Regex alternative: "iphone"                                         */
/* ------------------------------------------------------------------ */

describe("isMobile , iphone detection", () => {
  it("returns true for an iPhone user-agent string", () => {
    expect(
      withUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"),
    ).toBe(true);
  });

  it("returns true when 'iphone' appears in lowercase", () => {
    expect(withUA("some-agent iphone rest")).toBe(true);
  });

  it("returns true when 'IPHONE' appears in uppercase", () => {
    expect(withUA("some-agent IPHONE rest")).toBe(true);
  });

  it("returns true when 'iPhone' appears in mixed case", () => {
    expect(withUA("iPhone")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Regex alternative: "ipad"                                           */
/* ------------------------------------------------------------------ */

describe("isMobile , ipad detection", () => {
  it("returns true for an iPad user-agent string", () => {
    expect(
      withUA(
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      ),
    ).toBe(true);
  });

  it("returns true when 'ipad' appears in lowercase", () => {
    expect(withUA("ipad")).toBe(true);
  });

  it("returns true when 'IPAD' appears in uppercase", () => {
    expect(withUA("IPAD")).toBe(true);
  });

  it("returns true when 'iPad' appears in mixed case", () => {
    expect(withUA("iPad")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Regex alternative: "android"                                        */
/* ------------------------------------------------------------------ */

describe("isMobile , android detection", () => {
  it("returns true for a typical Android user-agent string", () => {
    expect(
      withUA(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36",
      ),
    ).toBe(true);
  });

  it("returns true when 'android' appears in lowercase", () => {
    expect(withUA("android")).toBe(true);
  });

  it("returns true when 'ANDROID' appears in uppercase", () => {
    expect(withUA("ANDROID")).toBe(true);
  });

  it("returns true when 'Android' appears in mixed case", () => {
    expect(withUA("Android 14")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Regex alternative: "ios"                                            */
/* ------------------------------------------------------------------ */

describe("isMobile , ios detection", () => {
  it("returns true when 'ios' appears in the user-agent", () => {
    expect(withUA("CustomBrowser/1.0 (iOS 17)")).toBe(true);
  });

  it("returns true when 'ios' appears in lowercase", () => {
    expect(withUA("ios")).toBe(true);
  });

  it("returns true when 'IOS' appears in uppercase", () => {
    expect(withUA("IOS")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Desktop / non-mobile user-agents (false branch)                     */
/* ------------------------------------------------------------------ */

describe("isMobile , desktop user-agents return false", () => {
  it("returns false for a macOS Safari user-agent", () => {
    expect(
      withUA(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      ),
    ).toBe(false);
  });

  it("returns false for a Windows Chrome user-agent", () => {
    expect(
      withUA(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125",
      ),
    ).toBe(false);
  });

  it("returns false for a Linux Firefox user-agent", () => {
    expect(
      withUA("Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101"),
    ).toBe(false);
  });

  it("returns false for an empty user-agent string", () => {
    expect(withUA("")).toBe(false);
  });

  it("returns false for a user-agent that contains none of the mobile keywords", () => {
    expect(withUA("curl/8.5.0")).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* typeof navigator guard (SSR / Workers branch)                       */
/* ------------------------------------------------------------------ */

describe("isMobile , navigator unavailable (SSR guard)", () => {
  it("returns false when navigator is undefined", () => {
    // Temporarily remove navigator from the global scope to simulate SSR
    const savedNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      value: undefined,
      configurable: true,
    });

    try {
      expect(isMobile()).toBe(false);
    } finally {
      Object.defineProperty(globalThis, "navigator", {
        value: savedNavigator,
        configurable: true,
      });
    }
  });
});

/* ------------------------------------------------------------------ */
/* Return type strictness                                              */
/* ------------------------------------------------------------------ */

describe("isMobile , return type", () => {
  it("returns a boolean true, not a truthy non-boolean", () => {
    const result = withUA("iPhone");
    expect(result).toBe(true);
    expect(typeof result).toBe("boolean");
  });

  it("returns a boolean false, not a falsy non-boolean", () => {
    const result = withUA("Desktop Chrome");
    expect(result).toBe(false);
    expect(typeof result).toBe("boolean");
  });
});

/* ------------------------------------------------------------------ */
/* Edge cases that catch subtle regex mutations                        */
/* ------------------------------------------------------------------ */

describe("isMobile , edge cases for regex mutation killing", () => {
  it("does not match 'phone' without the leading 'i'", () => {
    // Kills mutation that removes 'i' from 'iphone' in the regex
    expect(withUA("phone")).toBe(false);
  });

  it("does not match 'pad' without the leading 'i'", () => {
    // Kills mutation that removes 'i' from 'ipad' in the regex
    expect(withUA("pad")).toBe(false);
  });

  it("does not match 'andro' without the trailing 'id'", () => {
    // Kills mutation that truncates 'android'
    expect(withUA("andro")).toBe(false);
  });

  it("does not match 'ndroid' without the leading 'a'", () => {
    // Kills mutation that strips first char from 'android'
    expect(withUA("ndroid")).toBe(false);
  });

  it("matches when the keyword is embedded inside a longer token", () => {
    // Regex has no word boundaries, so substring matches succeed
    expect(withUA("MyAppOnAndroid/2.0")).toBe(true);
  });

  it("matches the substring 'ios' inside a larger word", () => {
    // "bios" contains "ios" as a substring
    expect(withUA("bios")).toBe(true);
  });
});
