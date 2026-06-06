// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Zero-dependency i18n system for provii-agegate.
 *
 * Bundles all supported locale strings statically (no lazy loading).
 * Provides a `t(key)` function for translation lookups, `setLocale()`
 * and `getLocale()` for runtime control, and a `detectLocale()` helper
 * that implements the fallback chain:
 *   1. Explicit `data-lang` attribute on the script tag
 *   2. `document.documentElement.lang`
 *   3. `navigator.language`
 *   4. `"en"` (fallback)
 *
 * @module i18n
 */

import type { LocaleStrings } from "./types.js";
export { RTL_LOCALES } from "./types.js";
export type { LocaleStrings } from "./types.js";

// Static locale imports (bundled into the IIFE)
import { en } from "./locales/en.js";
import { fr } from "./locales/fr.js";
import { de } from "./locales/de.js";
import { es } from "./locales/es.js";
import { pt } from "./locales/pt.js";
import { ja } from "./locales/ja.js";
import { ko } from "./locales/ko.js";
import { zh } from "./locales/zh.js";
import { it } from "./locales/it.js";
import { nl } from "./locales/nl.js";
import { pl } from "./locales/pl.js";
import { ar } from "./locales/ar.js";
import { ru } from "./locales/ru.js";
import { tr } from "./locales/tr.js";
import { hi } from "./locales/hi.js";

/**
 * All bundled locale maps, keyed by BCP 47 language subtag.
 * English is the fallback for any missing key or unrecognised locale.
 */
const LOCALE_MAP: Readonly<Record<string, LocaleStrings>> = {
  en,
  fr,
  de,
  es,
  pt,
  ja,
  ko,
  zh,
  it,
  nl,
  pl,
  ar,
  ru,
  tr,
  hi,
};

/** Currently active locale code (defaults to "en"). */
let currentLocale = "en";

/**
 * Caller-supplied string overrides. When set, keys present here win over
 * whatever the active locale map or the English fallback provides. Unset
 * keys fall through to the normal lookup chain.
 *
 * Set via {@link setStringOverrides}, cleared by passing `null`. Used by
 * AgeGateOptions.strings / AutoBlockConfig.strings (W10-3.2).
 */
let stringOverrides: Partial<LocaleStrings> | null = null;

/**
 * Install or clear caller-provided string overrides. Subsequent calls
 * to {@link t} check the overrides map first and fall back to the
 * active locale only for keys that are absent or undefined.
 */
export function setStringOverrides(
  overrides: Partial<LocaleStrings> | null | undefined,
): void {
  if (!overrides) {
    stringOverrides = null;
    return;
  }
  // Copy to prevent later mutation by the caller bleeding into the SDK.
  stringOverrides = { ...overrides };
}

/** Expose the current overrides map (read-only view) for tests. */
export function getStringOverrides(): Readonly<Partial<LocaleStrings>> | null {
  return stringOverrides ? { ...stringOverrides } : null;
}

/**
 * Normalise a BCP 47 tag (e.g. "fr-FR", "zh-Hans-CN") to a base
 * language subtag ("fr", "zh") that matches our bundled locales.
 */
function normaliseTag(tag: string): string {
  // Lowercase, take the primary subtag before any hyphen
  return tag.toLowerCase().split("-")[0] || "en";
}

/**
 * Returns true if the given locale code has a bundled translation.
 */
function isSupported(locale: string): boolean {
  return Object.hasOwn(LOCALE_MAP, normaliseTag(locale));
}

/**
 * List all bundled locale codes.
 */
function supportedLocales(): readonly string[] {
  return Object.keys(LOCALE_MAP);
}

/**
 * Set the active locale. If the locale is not bundled, silently
 * falls back to English.
 */
export function setLocale(locale: string): void {
  const normalised = normaliseTag(locale);
  currentLocale = Object.hasOwn(LOCALE_MAP, normalised) ? normalised : "en";
}

/**
 * Get the currently active locale code.
 */
export function getLocale(): string {
  return currentLocale;
}

/**
 * Translate a key using the active locale. Falls back to English
 * if the key is missing in the current locale (should not happen
 * when all locale files implement LocaleStrings fully).
 *
 * Supports `{placeholder}` interpolation via an optional params map.
 */
export function t(
  key: keyof LocaleStrings,
  params?: Readonly<Record<string, string | number>>,
): string {
  const strings = LOCALE_MAP[currentLocale] ?? en;
  // Caller overrides (W10-3.2) win over the locale pack, which itself
  // wins over the English fallback. Missing keys collapse to the key
  // string so the UI still renders something readable.
  const override = stringOverrides?.[key];
  let value: string =
    (typeof override === "string" ? override : undefined) ??
    strings[key] ??
    en[key] ??
    key;

  if (params) {
    for (const [placeholder, replacement] of Object.entries(params)) {
      value = value.replace(
        new RegExp(`\\{${placeholder}\\}`, "g"),
        String(replacement),
      );
    }
  }

  return value;
}

/**
 * Detect the best locale from the environment using the fallback chain.
 *
 * Priority:
 *   1. `explicitLang` parameter (from `data-lang` attribute)
 *   2. `document.documentElement.lang`
 *   3. `navigator.language`
 *   4. `"en"`
 *
 * Returns the normalised locale code that was selected and sets it
 * as the active locale.
 */
export function detectLocale(explicitLang?: string): string {
  // 1. Explicit data-lang attribute
  if (explicitLang && explicitLang.trim().length > 0) {
    const normalised = normaliseTag(explicitLang.trim());
    if (Object.hasOwn(LOCALE_MAP, normalised)) {
      setLocale(normalised);
      return normalised;
    }
  }

  // 2. Page language from <html lang="...">
  if (typeof document !== "undefined") {
    const htmlLang = document.documentElement.lang;
    if (htmlLang && htmlLang.trim().length > 0) {
      const normalised = normaliseTag(htmlLang.trim());
      if (Object.hasOwn(LOCALE_MAP, normalised)) {
        setLocale(normalised);
        return normalised;
      }
    }
  }

  // 3. Browser language preference
  if (typeof navigator !== "undefined" && navigator.language) {
    const normalised = normaliseTag(navigator.language);
    if (Object.hasOwn(LOCALE_MAP, normalised)) {
      setLocale(normalised);
      return normalised;
    }
  }

  // 4. Default fallback
  setLocale("en");
  return "en";
}

/**
 * Check whether the current locale uses right-to-left text direction.
 */
export function isRTL(): boolean {
  // Inline check rather than importing RTL_LOCALES to avoid circular
  // reference concerns during tree-shaking.
  const rtlCodes = new Set(["ar", "he", "fa", "ur"]);
  return rtlCodes.has(currentLocale);
}
