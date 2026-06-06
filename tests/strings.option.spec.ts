/**
 * W10-3.2: caller-supplied string overrides.
 *
 * Covers the i18n runtime hook, AgeGateOptions/AutoBlockConfig wiring,
 * and the config-parser paths that emit the field from data-strings
 * and the sibling application/json script.
 *
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.com"}
 */

import {
  t,
  setLocale,
  setStringOverrides,
  getStringOverrides,
} from "../src/i18n/index.js";
import { AgeGateConfig } from "../src/agegate/AgeGateConfig.js";
import { parseConfig } from "../src/modes/config-parser.js";

const TEST_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const HTML_DEFAULTS = {
  lang: "en",
};

beforeEach(() => {
  document.documentElement.lang = HTML_DEFAULTS.lang;
  setLocale("en");
  setStringOverrides(null);
  document.body.innerHTML = "";
});

describe("i18n string overrides (W10-3.2)", () => {
  it("applies caller-supplied overrides over the active locale", () => {
    const before = t("verifyButtonLabel");
    setStringOverrides({ verifyButtonLabel: "Open my wallet" });
    expect(t("verifyButtonLabel")).toBe("Open my wallet");
    expect(t("verifyButtonLabel")).not.toBe(before);
  });

  it("leaves unspecified keys alone", () => {
    const headerBefore = t("headerTitle");
    setStringOverrides({ verifyButtonLabel: "Go" });
    expect(t("headerTitle")).toBe(headerBefore);
  });

  it("overrides beat the active locale pack", () => {
    setLocale("fr");
    const fr = t("verifyButtonLabel");
    setStringOverrides({ verifyButtonLabel: "Open it" });
    expect(t("verifyButtonLabel")).toBe("Open it");
    expect(t("verifyButtonLabel")).not.toBe(fr);
  });

  it("clears overrides when passed null", () => {
    setStringOverrides({ verifyButtonLabel: "X" });
    setStringOverrides(null);
    expect(getStringOverrides()).toBeNull();
  });

  it("supports placeholder interpolation on overridden strings", () => {
    setStringOverrides({ verifyOverAge: "At least {age}+ please" });
    expect(t("verifyOverAge", { age: 18 })).toBe("At least 18+ please");
  });
});

describe("AgeGateConfig strings option", () => {
  const mountEl = () => {
    const d = document.createElement("div");
    d.id = "mount";
    document.body.appendChild(d);
    return d;
  };

  it("installs overrides on construction", () => {
    mountEl();
    new AgeGateConfig({
      publicKey: TEST_PUBLIC_KEY,
      environment: "sandbox" as const,
      contentUrl: "/content",
      mountElementId: "mount",
      strings: { loading: "Hang on…" },
    });
    expect(t("loading")).toBe("Hang on…");
  });

  it("clears overrides when option omitted", () => {
    mountEl();
    new AgeGateConfig({
      publicKey: TEST_PUBLIC_KEY,
      environment: "sandbox" as const,
      contentUrl: "/content",
      mountElementId: "mount",
      strings: { loading: "Hang on…" },
    });
    new AgeGateConfig({
      publicKey: TEST_PUBLIC_KEY,
      environment: "sandbox" as const,
      contentUrl: "/content",
      mountElementId: "mount",
    });
    expect(getStringOverrides()).toBeNull();
  });
});

describe("config-parser strings attribute (W10-3.2)", () => {
  function buildScript(
    attrs: Record<string, string>,
    sibling?: HTMLElement,
  ): HTMLScriptElement {
    const wrap = document.createElement("div");
    const s = document.createElement("script");
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    wrap.appendChild(s);
    if (sibling) wrap.appendChild(sibling);
    document.body.appendChild(wrap);
    return s;
  }

  it("emits strings from data-strings JSON attribute", () => {
    const s = buildScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-strings": JSON.stringify({ headerTitle: "Age check" }),
    });
    const cfg = parseConfig(s);
    expect(cfg.strings).toEqual({ headerTitle: "Age check" });
  });

  it("reads strings from a sibling application/json script", () => {
    const sibling = document.createElement("script");
    sibling.type = "application/json";
    sibling.setAttribute("data-agegate-strings", "");
    sibling.textContent = JSON.stringify({
      headerTitle: "Prove it",
      verifyButtonLabel: "Go",
    });
    const s = buildScript({ "data-public-key": TEST_PUBLIC_KEY, "data-environment": "sandbox" }, sibling);
    const cfg = parseConfig(s);
    expect(cfg.strings).toEqual({
      headerTitle: "Prove it",
      verifyButtonLabel: "Go",
    });
  });

  it("ignores malformed JSON rather than throwing", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = buildScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-strings": "{ not: json",
    });
    const cfg = parseConfig(s);
    expect(cfg.strings).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("discards non-string values defensively", () => {
    const s = buildScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-strings": JSON.stringify({
        headerTitle: "ok",
        tryAgain: 7,
        loading: "",
      }),
    });
    const cfg = parseConfig(s);
    expect(cfg.strings).toEqual({ headerTitle: "ok" });
  });

  it("omits the field when no overrides are present", () => {
    const s = buildScript({ "data-public-key": TEST_PUBLIC_KEY, "data-environment": "sandbox" });
    const cfg = parseConfig(s);
    expect("strings" in cfg).toBe(false);
  });
});
