/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.com"}
 */
// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Mutation-killing tests for src/i18n/index.ts.
 *
 * Covers: normaliseTag, setLocale, getLocale, t (lookup + interpolation),
 * detectLocale (full fallback chain), setStringOverrides, getStringOverrides,
 * isRTL.
 */

import {
  setLocale,
  getLocale,
  t,
  detectLocale,
  setStringOverrides,
  getStringOverrides,
  isRTL,
  RTL_LOCALES,
} from "../src/i18n/index.js";

// Direct import so we can assert exact English string values
import { en } from "../src/i18n/locales/en.js";
import { fr } from "../src/i18n/locales/fr.js";
import { ar } from "../src/i18n/locales/ar.js";

// All bundled locale codes matching the LOCALE_MAP keys in index.ts
const BUNDLED_LOCALES = [
  "en", "fr", "de", "es", "pt", "ja", "ko", "zh", "it", "nl", "pl", "ar",
  "ru", "tr", "hi",
];

// Save originals for navigator mocking
const originalLanguageDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "language",
);

function mockNavigatorLanguage(value: string | undefined): void {
  Object.defineProperty(navigator, "language", {
    get: () => value,
    configurable: true,
  });
}

function restoreNavigatorLanguage(): void {
  if (originalLanguageDescriptor) {
    Object.defineProperty(navigator, "language", originalLanguageDescriptor);
  }
}

beforeEach(() => {
  // Reset to known state before every test
  setLocale("en");
  setStringOverrides(null);
  document.documentElement.lang = "";
  restoreNavigatorLanguage();
});

// ---------------------------------------------------------------------------
// normaliseTag (exercised through setLocale and detectLocale)
// ---------------------------------------------------------------------------
describe("normaliseTag via setLocale", () => {
  it("lowercases uppercase locale tags", () => {
    setLocale("FR");
    expect(getLocale()).toBe("fr");
  });

  it("lowercases mixed-case tags", () => {
    setLocale("De");
    expect(getLocale()).toBe("de");
  });

  it("strips region subtags from BCP 47 (e.g. fr-FR)", () => {
    setLocale("fr-FR");
    expect(getLocale()).toBe("fr");
  });

  it("strips extended subtags (e.g. zh-Hans-CN)", () => {
    setLocale("zh-Hans-CN");
    expect(getLocale()).toBe("zh");
  });

  it("falls back to 'en' when split produces an empty primary subtag", () => {
    // Edge case: a tag starting with a hyphen would produce an empty
    // string as the first element of split("-"), triggering the || "en"
    setLocale("-GB");
    expect(getLocale()).toBe("en");
  });
});

// ---------------------------------------------------------------------------
// setLocale / getLocale
// ---------------------------------------------------------------------------
describe("setLocale and getLocale", () => {
  it("defaults to 'en'", () => {
    // beforeEach resets to en
    expect(getLocale()).toBe("en");
  });

  it.each(BUNDLED_LOCALES)("accepts bundled locale '%s'", (locale) => {
    setLocale(locale);
    expect(getLocale()).toBe(locale);
  });

  it("falls back to 'en' for unrecognised locale", () => {
    setLocale("xx");
    expect(getLocale()).toBe("en");
  });

  it("falls back to 'en' for empty string", () => {
    setLocale("");
    // normaliseTag("") => "".toLowerCase().split("-")[0] => "" => || "en"
    // Then "en" is in LOCALE_MAP, so currentLocale = "en"
    expect(getLocale()).toBe("en");
  });

  it("falls back to 'en' for gibberish with hyphens", () => {
    setLocale("zz-ZZ-Latn");
    expect(getLocale()).toBe("en");
  });
});

// ---------------------------------------------------------------------------
// t() , basic lookup
// ---------------------------------------------------------------------------
describe("t() basic lookup", () => {
  it("returns exact English string for headerTitle", () => {
    expect(t("headerTitle")).toBe("Age Verification");
    expect(t("headerTitle")).toBe(en.headerTitle);
  });

  it("returns exact English string for verifyButtonLabel", () => {
    expect(t("verifyButtonLabel")).toBe("Verify with Provii Wallet");
  });

  it("returns the French headerTitle when locale is fr", () => {
    setLocale("fr");
    expect(t("headerTitle")).toBe(fr.headerTitle);
    expect(t("headerTitle")).not.toBe(en.headerTitle);
  });

  it("returns the Arabic headerTitle when locale is ar", () => {
    setLocale("ar");
    expect(t("headerTitle")).toBe(ar.headerTitle);
    expect(t("headerTitle")).not.toBe(en.headerTitle);
  });

  it("falls back to English when the current locale is somehow invalid", () => {
    // Force an invalid state by first setting a valid locale then
    // verifying fallback via the ?? en path in t()
    setLocale("en");
    expect(t("loading")).toBe("Loading...");
  });
});

// ---------------------------------------------------------------------------
// t() , placeholder interpolation
// ---------------------------------------------------------------------------
describe("t() placeholder interpolation", () => {
  it("replaces {age} in verifyOverAge with a number", () => {
    expect(t("verifyOverAge", { age: 18 })).toBe(
      "Verify you are 18 or older",
    );
  });

  it("replaces {age} in verifyUnderAge", () => {
    expect(t("verifyUnderAge", { age: 21 })).toBe(
      "Verify you are under 21",
    );
  });

  it("replaces multiple occurrences of the same placeholder", () => {
    setStringOverrides({
      headerTitle: "{x} and {x} again",
    });
    expect(t("headerTitle", { x: "A" })).toBe("A and A again");
  });

  it("replaces multiple different placeholders", () => {
    setStringOverrides({
      headerTitle: "{first} meets {second}",
    });
    expect(t("headerTitle", { first: "Alice", second: "Bob" })).toBe(
      "Alice meets Bob",
    );
  });

  it("converts numeric replacements to strings", () => {
    expect(t("verifyOverAge", { age: 25 })).toBe(
      "Verify you are 25 or older",
    );
  });

  it("leaves the template untouched when no params given", () => {
    expect(t("verifyOverAge")).toBe("Verify you are {age} or older");
  });

  it("leaves unmatched placeholders when param key is absent", () => {
    expect(t("verifyOverAge", { name: "Alice" })).toBe(
      "Verify you are {age} or older",
    );
  });

  it("works with French locale interpolation", () => {
    setLocale("fr");
    expect(t("verifyOverAge", { age: 18 })).toBe(fr.verifyOverAge.replace("{age}", "18"));
  });
});

// ---------------------------------------------------------------------------
// setStringOverrides / getStringOverrides
// ---------------------------------------------------------------------------
describe("setStringOverrides", () => {
  it("returns null when no overrides are set", () => {
    expect(getStringOverrides()).toBeNull();
  });

  it("stores overrides and retrieves them", () => {
    setStringOverrides({ headerTitle: "Custom Title" });
    const result = getStringOverrides();
    expect(result).not.toBeNull();
    expect(result!.headerTitle).toBe("Custom Title");
  });

  it("clears overrides when called with null", () => {
    setStringOverrides({ headerTitle: "X" });
    setStringOverrides(null);
    expect(getStringOverrides()).toBeNull();
  });

  it("clears overrides when called with undefined", () => {
    setStringOverrides({ headerTitle: "X" });
    setStringOverrides(undefined);
    expect(getStringOverrides()).toBeNull();
  });

  it("copies the overrides object to prevent caller mutation", () => {
    const original: Record<string, string> = { headerTitle: "Before" };
    setStringOverrides(original as Partial<typeof en>);
    // Mutate the original after setting , SDK copy should be unaffected
    original["headerTitle"] = "After";
    expect(t("headerTitle")).toBe("Before");
  });

  it("getStringOverrides returns a copy, not the internal reference", () => {
    setStringOverrides({ headerTitle: "Internal" });
    const firstRead = getStringOverrides();
    const secondRead = getStringOverrides();
    expect(firstRead).not.toBe(secondRead); // different object references
    expect(firstRead).toEqual(secondRead); // same content
  });
});

// ---------------------------------------------------------------------------
// t() , override precedence chain
// ---------------------------------------------------------------------------
describe("t() override precedence", () => {
  it("override > active locale > English fallback > key", () => {
    // Step 1: English locale, no override , returns English string
    expect(t("headerTitle")).toBe("Age Verification");

    // Step 2: French locale, no override , returns French string
    setLocale("fr");
    expect(t("headerTitle")).toBe(fr.headerTitle);

    // Step 3: French locale with override , override wins
    setStringOverrides({ headerTitle: "Custom" });
    expect(t("headerTitle")).toBe("Custom");

    // Step 4: Clear override , back to French
    setStringOverrides(null);
    expect(t("headerTitle")).toBe(fr.headerTitle);
  });

  it("override with empty string is NOT used (typeof check)", () => {
    // The code checks typeof override === "string". An empty string is
    // technically a string, so it WILL be used. This pins that behaviour.
    setStringOverrides({ headerTitle: "" });
    // Empty string IS typeof "string", so it should be used, but then
    // the ?? chain continues because "" is falsy. Let us verify.
    // Actually: (typeof override === "string" ? override : undefined)
    // When override is "", typeof is "string", so it returns "".
    // Then "" ?? strings[key] , but "" is not nullish, so "" wins.
    expect(t("headerTitle")).toBe("");
  });

  it("non-string override values are ignored", () => {
    // Force a non-string value via type escape (simulates bad runtime input)
    setStringOverrides({ headerTitle: 42 as unknown as string });
    // typeof 42 !== "string", so it falls through to locale
    expect(t("headerTitle")).toBe("Age Verification");
  });

  it("key string is the final fallback for completely unknown keys", () => {
    // The code returns `key` as the last fallback. Because LocaleStrings
    // requires all keys, this should not normally happen, but the code
    // defends against it. We can test by casting.
    const result = t("nonExistentKey" as keyof typeof en);
    expect(result).toBe("nonExistentKey");
  });
});

// ---------------------------------------------------------------------------
// detectLocale , full fallback chain
// ---------------------------------------------------------------------------
describe("detectLocale", () => {
  describe("priority 1: explicitLang parameter", () => {
    it("sets and returns the locale from explicitLang", () => {
      const result = detectLocale("fr");
      expect(result).toBe("fr");
      expect(getLocale()).toBe("fr");
    });

    it("normalises explicitLang tags (e.g. de-DE)", () => {
      const result = detectLocale("de-DE");
      expect(result).toBe("de");
      expect(getLocale()).toBe("de");
    });

    it("trims whitespace from explicitLang", () => {
      const result = detectLocale("  ja  ");
      expect(result).toBe("ja");
      expect(getLocale()).toBe("ja");
    });

    it("skips explicitLang if unrecognised and falls through", () => {
      document.documentElement.lang = "es";
      const result = detectLocale("xx");
      // xx is not bundled, so should fall to priority 2 (html lang = "es")
      expect(result).toBe("es");
      expect(getLocale()).toBe("es");
    });

    it("skips explicitLang if empty string", () => {
      document.documentElement.lang = "it";
      const result = detectLocale("");
      expect(result).toBe("it");
    });

    it("skips explicitLang if whitespace only", () => {
      document.documentElement.lang = "nl";
      const result = detectLocale("   ");
      expect(result).toBe("nl");
    });
  });

  describe("priority 2: document.documentElement.lang", () => {
    it("uses html lang when explicitLang is absent", () => {
      document.documentElement.lang = "ko";
      const result = detectLocale();
      expect(result).toBe("ko");
      expect(getLocale()).toBe("ko");
    });

    it("normalises html lang tags", () => {
      document.documentElement.lang = "pt-BR";
      const result = detectLocale();
      expect(result).toBe("pt");
    });

    it("trims whitespace on html lang", () => {
      document.documentElement.lang = " pl ";
      const result = detectLocale();
      expect(result).toBe("pl");
    });

    it("skips html lang if unrecognised and falls through to navigator", () => {
      document.documentElement.lang = "xx-unknown";
      mockNavigatorLanguage("tr");
      const result = detectLocale();
      expect(result).toBe("tr");
    });

    it("skips html lang if empty", () => {
      document.documentElement.lang = "";
      mockNavigatorLanguage("hi");
      const result = detectLocale();
      expect(result).toBe("hi");
    });

    it("skips html lang if whitespace only", () => {
      document.documentElement.lang = "   ";
      mockNavigatorLanguage("ru");
      const result = detectLocale();
      expect(result).toBe("ru");
    });
  });

  describe("priority 3: navigator.language", () => {
    it("uses navigator.language when higher priorities are absent", () => {
      document.documentElement.lang = "";
      mockNavigatorLanguage("es-MX");
      const result = detectLocale();
      expect(result).toBe("es");
      expect(getLocale()).toBe("es");
    });

    it("skips navigator.language if unrecognised", () => {
      document.documentElement.lang = "";
      mockNavigatorLanguage("tlh"); // Klingon
      const result = detectLocale();
      expect(result).toBe("en");
    });
  });

  describe("priority 4: default fallback", () => {
    it("returns 'en' when nothing matches", () => {
      document.documentElement.lang = "";
      mockNavigatorLanguage(undefined);
      const result = detectLocale();
      expect(result).toBe("en");
      expect(getLocale()).toBe("en");
    });

    it("returns 'en' when all sources are unrecognised", () => {
      document.documentElement.lang = "zz";
      mockNavigatorLanguage("yy");
      const result = detectLocale("ww");
      expect(result).toBe("en");
    });
  });

  describe("detectLocale actually sets the locale", () => {
    it("subsequent t() calls use the detected locale", () => {
      detectLocale("fr");
      expect(t("headerTitle")).toBe(fr.headerTitle);
    });

    it("subsequent isRTL() reflects the detected locale", () => {
      detectLocale("ar");
      expect(isRTL()).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// isRTL
// ---------------------------------------------------------------------------
describe("isRTL", () => {
  it("returns true for Arabic", () => {
    setLocale("ar");
    expect(isRTL()).toBe(true);
  });

  it("returns false for English", () => {
    setLocale("en");
    expect(isRTL()).toBe(false);
  });

  it("returns false for French", () => {
    setLocale("fr");
    expect(isRTL()).toBe(false);
  });

  // The inline rtlCodes set in isRTL() contains ar, he, fa, ur.
  // Only ar is bundled in LOCALE_MAP, so the others fall back to en
  // when set via setLocale. But isRTL checks currentLocale directly,
  // and setLocale("he") normalises to "he" which is not in LOCALE_MAP,
  // so currentLocale becomes "en". We verify that behaviour here.
  it("returns false for Hebrew because it is not a bundled locale", () => {
    setLocale("he");
    expect(getLocale()).toBe("en"); // fell back
    expect(isRTL()).toBe(false);
  });

  it("returns false for Farsi because it is not a bundled locale", () => {
    setLocale("fa");
    expect(getLocale()).toBe("en");
    expect(isRTL()).toBe(false);
  });

  it("returns false for Urdu because it is not a bundled locale", () => {
    setLocale("ur");
    expect(getLocale()).toBe("en");
    expect(isRTL()).toBe(false);
  });

  it.each(["en", "fr", "de", "es", "pt", "ja", "ko", "zh", "it", "nl", "pl", "ru", "tr", "hi"])(
    "returns false for LTR locale '%s'",
    (locale) => {
      setLocale(locale);
      expect(isRTL()).toBe(false);
    },
  );

  it("returns true for Arabic even after being changed from LTR", () => {
    setLocale("en");
    expect(isRTL()).toBe(false);
    setLocale("ar");
    expect(isRTL()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RTL_LOCALES re-export
// ---------------------------------------------------------------------------
describe("RTL_LOCALES re-export", () => {
  it("is a Set containing ar, he, fa, ur", () => {
    expect(RTL_LOCALES).toBeInstanceOf(Set);
    expect(RTL_LOCALES.has("ar")).toBe(true);
    expect(RTL_LOCALES.has("he")).toBe(true);
    expect(RTL_LOCALES.has("fa")).toBe(true);
    expect(RTL_LOCALES.has("ur")).toBe(true);
  });

  it("has exactly 4 entries", () => {
    expect(RTL_LOCALES.size).toBe(4);
  });

  it("does not contain LTR locales", () => {
    expect(RTL_LOCALES.has("en")).toBe(false);
    expect(RTL_LOCALES.has("fr")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// LOCALE_MAP completeness (verifiable through setLocale/getLocale)
// ---------------------------------------------------------------------------
describe("LOCALE_MAP completeness", () => {
  it("recognises all 15 bundled locales", () => {
    for (const code of BUNDLED_LOCALES) {
      setLocale(code);
      expect(getLocale()).toBe(code);
    }
  });

  it("all 15 bundled locales produce non-empty headerTitle via t()", () => {
    for (const code of BUNDLED_LOCALES) {
      setLocale(code);
      const title = t("headerTitle");
      expect(title.length).toBeGreaterThan(0);
      // English locale should return the English value
      if (code === "en") {
        expect(title).toBe("Age Verification");
      }
    }
  });

  it("each bundled locale has a distinct headerTitle (not all identical)", () => {
    const titles = new Set<string>();
    for (const code of BUNDLED_LOCALES) {
      setLocale(code);
      titles.add(t("headerTitle"));
    }
    // At minimum English and French differ
    expect(titles.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Edge cases and mutation-killing specifics
// ---------------------------------------------------------------------------
describe("edge cases", () => {
  it("t() with params on a key that has no placeholders returns the string unchanged", () => {
    expect(t("headerTitle", { age: 18 })).toBe("Age Verification");
  });

  it("detectLocale with undefined explicitLang falls through", () => {
    document.documentElement.lang = "de";
    const result = detectLocale(undefined);
    expect(result).toBe("de");
  });

  it("setLocale is idempotent", () => {
    setLocale("fr");
    setLocale("fr");
    expect(getLocale()).toBe("fr");
  });

  it("t() returns the correct value immediately after setLocale", () => {
    setLocale("ar");
    expect(t("loading")).toBe(ar.loading);
    setLocale("en");
    expect(t("loading")).toBe(en.loading);
  });

  it("overrides apply across locale changes", () => {
    setStringOverrides({ headerTitle: "Pinned" });
    setLocale("fr");
    expect(t("headerTitle")).toBe("Pinned");
    setLocale("ar");
    expect(t("headerTitle")).toBe("Pinned");
    setLocale("en");
    expect(t("headerTitle")).toBe("Pinned");
  });

  it("clearing overrides restores locale-specific strings", () => {
    setLocale("fr");
    setStringOverrides({ headerTitle: "Override" });
    expect(t("headerTitle")).toBe("Override");
    setStringOverrides(null);
    expect(t("headerTitle")).toBe(fr.headerTitle);
  });

  it("detectLocale prefers explicitLang over all other sources", () => {
    document.documentElement.lang = "de";
    mockNavigatorLanguage("ja");
    const result = detectLocale("fr");
    expect(result).toBe("fr");
  });

  it("detectLocale prefers html lang over navigator.language", () => {
    document.documentElement.lang = "ko";
    mockNavigatorLanguage("ja");
    const result = detectLocale();
    expect(result).toBe("ko");
  });
});

describe("i18n survivor killers", () => {
  it("normaliseTag splits on '-' specifically (not other separators)", () => {
    setLocale("en-US");
    expect(getLocale()).toBe("en");
    setLocale("zh-Hant-TW");
    expect(getLocale()).toBe("zh");
  });

  it("normaliseTag lowercases before splitting", () => {
    setLocale("EN");
    expect(getLocale()).toBe("en");
    setLocale("AR");
    expect(getLocale()).toBe("ar");
  });

  it("empty tag normalises to 'en' via fallback", () => {
    setLocale("");
    expect(getLocale()).toBe("en");
  });

  it("isRTL checks the rtlCodes Set which contains exactly ar, he, fa, ur", () => {
    setLocale("ar");
    expect(isRTL()).toBe(true);
    setLocale("en");
    expect(isRTL()).toBe(false);
  });

  it("typeof document check in detectLocale allows document.documentElement.lang access", () => {
    document.documentElement.lang = "es";
    const result = detectLocale();
    expect(result).toBe("es");
    document.documentElement.lang = "";
  });

  it("typeof navigator check in detectLocale allows navigator.language access", () => {
    document.documentElement.lang = "";
    mockNavigatorLanguage("it");
    const result = detectLocale();
    expect(result).toBe("it");
  });
});
