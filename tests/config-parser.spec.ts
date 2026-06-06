/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.com"}
 */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT

// Direct unit tests for every exported and internal code path in
// config-parser.ts. Goal: kill every Stryker mutant by asserting
// exact attribute names, default values, coerced types, regex
// boundaries, and both branches of every conditional.

import {
  parseConfig,
  findScriptTag,
  isValidHexColour,
  ConfigError,
} from "../src/modes/config-parser.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_PK_LIVE =
  "pk_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const VALID_PK_TEST =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/** Build a script element with the given data-* attributes and attach to DOM. */
function mkScript(attrs: Record<string, string>): HTMLScriptElement {
  const s = document.createElement("script");
  for (const [k, v] of Object.entries(attrs)) {
    s.setAttribute(k, v);
  }
  document.body.appendChild(s);
  return s;
}

/** Shorthand for a minimal valid script tag (production, valid pk). */
function mkValid(extra: Record<string, string> = {}): HTMLScriptElement {
  return mkScript({ "data-public-key": VALID_PK_TEST, ...extra });
}

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
});

// ===========================================================================
// isValidHexColour (exported)
// ===========================================================================

describe("isValidHexColour", () => {
  it.each([
    "#abc",
    "#ABC",
    "#aAbBcC",
    "#000",
    "#fff",
    "#000000",
    "#FFFFFF",
    "#1e3a6e",
  ])("accepts %s", (value) => {
    expect(isValidHexColour(value)).toBe(true);
  });

  it.each([
    "",
    "abc",
    "#ab",
    "#abcd",
    "#abcde",
    "#abcdefg",
    "#ggg",
    "#GGGGGG",
    "rgb(0,0,0)",
    "#1234567",
    "123456",
    " #abc",
    "#abc ",
  ])("rejects %s", (value) => {
    expect(isValidHexColour(value)).toBe(false);
  });
});

// ===========================================================================
// ConfigError
// ===========================================================================

describe("ConfigError", () => {
  it("has name property set to ConfigError", () => {
    const err = new ConfigError("boom");
    expect(err.name).toBe("ConfigError");
    expect(err.message).toBe("boom");
    expect(err).toBeInstanceOf(Error);
  });
});

// ===========================================================================
// parseConfig: public key validation
// ===========================================================================

describe("parseConfig public key", () => {
  it("throws when data-public-key is missing", () => {
    const s = mkScript({});
    expect(() => parseConfig(s)).toThrow(ConfigError);
    expect(() => parseConfig(s)).toThrow("data-public-key is required");
  });

  it("throws when data-public-key is empty string", () => {
    const s = mkScript({ "data-public-key": "" });
    expect(() => parseConfig(s)).toThrow("data-public-key is required");
  });

  it("throws when data-public-key is whitespace only", () => {
    const s = mkScript({ "data-public-key": "   " });
    expect(() => parseConfig(s)).toThrow("data-public-key is required");
  });

  it("throws for pk_ prefix with wrong mode segment", () => {
    const s = mkScript({ "data-public-key": "pk_staging_" + "a".repeat(64) });
    expect(() => parseConfig(s)).toThrow(
      "data-public-key must be in format pk_live_xxx or pk_test_xxx",
    );
  });

  it("throws for pk_test_ with fewer than 64 hex chars", () => {
    const s = mkScript({ "data-public-key": "pk_test_" + "a".repeat(63) });
    expect(() => parseConfig(s)).toThrow("pk_live_xxx or pk_test_xxx");
  });

  it("throws for pk_test_ with more than 64 hex chars", () => {
    const s = mkScript({ "data-public-key": "pk_test_" + "a".repeat(65) });
    expect(() => parseConfig(s)).toThrow("pk_live_xxx or pk_test_xxx");
  });

  it("throws for pk_test_ with uppercase hex", () => {
    // Regex is lowercase only: /^pk_(live|test)_[a-f0-9]{64}$/
    const s = mkScript({ "data-public-key": "pk_test_" + "A".repeat(64) });
    expect(() => parseConfig(s)).toThrow("pk_live_xxx or pk_test_xxx");
  });

  it("accepts a valid pk_test_ key", () => {
    const s = mkValid();
    const cfg = parseConfig(s);
    expect(cfg.publicKey).toBe(VALID_PK_TEST);
  });

  it("accepts a valid pk_live_ key", () => {
    const s = mkScript({ "data-public-key": VALID_PK_LIVE });
    const cfg = parseConfig(s);
    expect(cfg.publicKey).toBe(VALID_PK_LIVE);
  });

  it("skips public key validation in preview mode", () => {
    const s = mkScript({
      "data-public-key": "not_a_valid_key",
      "data-preview-mode": "true",
    });
    // Should not throw despite invalid key
    const cfg = parseConfig(s);
    expect(cfg.publicKey).toBe("not_a_valid_key");
    expect(cfg.previewMode).toBe(true);
  });

  it("skips all validation in preview mode (no key at all)", () => {
    const s = mkScript({ "data-preview-mode": "true" });
    const cfg = parseConfig(s);
    expect(cfg.publicKey).toBe("");
    expect(cfg.previewMode).toBe(true);
  });
});

// ===========================================================================
// parseConfig: environment
// ===========================================================================

describe("parseConfig environment", () => {
  it('defaults to "production" when attribute absent', () => {
    const s = mkValid();
    expect(parseConfig(s).environment).toBe("production");
  });

  it('accepts "production"', () => {
    const s = mkValid({ "data-environment": "production" });
    expect(parseConfig(s).environment).toBe("production");
  });

  it('accepts "sandbox"', () => {
    const s = mkValid({ "data-environment": "sandbox" });
    expect(parseConfig(s).environment).toBe("sandbox");
  });

  it("throws for invalid environment value", () => {
    const s = mkValid({ "data-environment": "staging" });
    expect(() => parseConfig(s)).toThrow(ConfigError);
    expect(() => parseConfig(s)).toThrow(
      'data-environment must be "production" or "sandbox"',
    );
  });

  it("throws for capitalised environment value", () => {
    const s = mkValid({ "data-environment": "Production" });
    expect(() => parseConfig(s)).toThrow(ConfigError);
  });
});

// ===========================================================================
// parseConfig: style
// ===========================================================================

describe("parseConfig style", () => {
  it('defaults to "modern" when attribute absent', () => {
    const s = mkValid();
    expect(parseConfig(s).style).toBe("modern");
  });

  it.each(["modern", "minimal", "custom"] as const)(
    'accepts "%s"',
    (style) => {
      const extra: Record<string, string> = { "data-style": style };
      if (style === "custom") {
        extra["data-custom-styles"] = ".foo { color: red; }";
      }
      const s = mkValid(extra);
      expect(parseConfig(s).style).toBe(style);
    },
  );

  it("throws for invalid style value", () => {
    const s = mkValid({ "data-style": "fancy" });
    expect(() => parseConfig(s)).toThrow(ConfigError);
    expect(() => parseConfig(s)).toThrow(
      'data-style must be "modern", "minimal", or "custom"',
    );
  });

  it('throws when style="custom" but data-custom-styles is missing', () => {
    const s = mkValid({ "data-style": "custom" });
    expect(() => parseConfig(s)).toThrow(
      'data-custom-styles is required when style="custom"',
    );
  });

  it('passes when style="custom" and data-custom-styles is present', () => {
    const s = mkValid({
      "data-style": "custom",
      "data-custom-styles": ".bar { display: none; }",
    });
    const cfg = parseConfig(s);
    expect(cfg.style).toBe("custom");
    expect(cfg.customStyles).toBe(".bar { display: none; }");
  });
});

// ===========================================================================
// parseConfig: apiEndpoint
// ===========================================================================

describe("parseConfig apiEndpoint", () => {
  it("is undefined when attribute absent", () => {
    const s = mkValid();
    expect(parseConfig(s).apiEndpoint).toBeUndefined();
  });

  it("accepts an allowed HTTPS domain", () => {
    const s = mkValid({
      "data-api-endpoint": "https://hosted.provii.app",
    });
    expect(parseConfig(s).apiEndpoint).toBe(
      "https://hosted.provii.app",
    );
  });

  it("accepts the sandbox allowed domain", () => {
    const s = mkValid({
      "data-api-endpoint": "https://sandbox-hosted.provii.app",
    });
    expect(parseConfig(s).apiEndpoint).toBe(
      "https://sandbox-hosted.provii.app",
    );
  });

  it("throws for non-HTTPS URL", () => {
    const s = mkValid({
      "data-api-endpoint": "http://hosted.provii.app",
    });
    expect(() => parseConfig(s)).toThrow(ConfigError);
    expect(() => parseConfig(s)).toThrow(
      "data-api-endpoint must be a valid HTTPS URL",
    );
  });

  it("throws for HTTPS URL on disallowed domain", () => {
    const s = mkValid({
      "data-api-endpoint": "https://evil.example.com",
    });
    expect(() => parseConfig(s)).toThrow(ConfigError);
    expect(() => parseConfig(s)).toThrow("is not a recognised Provii API endpoint");
  });

  it("throws for garbage string that is not a URL", () => {
    const s = mkValid({ "data-api-endpoint": "not a url at all" });
    expect(() => parseConfig(s)).toThrow(ConfigError);
    expect(() => parseConfig(s)).toThrow(
      "data-api-endpoint must be a valid HTTPS URL",
    );
  });

  it("skips apiEndpoint validation in preview mode", () => {
    const s = mkScript({
      "data-preview-mode": "true",
      "data-api-endpoint": "https://evil.example.com",
    });
    const cfg = parseConfig(s);
    expect(cfg.apiEndpoint).toBe("https://evil.example.com");
  });
});

// ===========================================================================
// parseConfig: boolean attributes (allowClose, debug, previewMode)
// ===========================================================================

describe("parseConfig boolean parsing", () => {
  describe("allowClose", () => {
    it("defaults to false when absent", () => {
      expect(parseConfig(mkValid()).allowClose).toBe(false);
    });

    it.each(["true", "TRUE", "True", "1", "yes", "YES", "on", "ON"])(
      'parses "%s" as true',
      (val) => {
        const s = mkValid({ "data-allow-close": val });
        expect(parseConfig(s).allowClose).toBe(true);
      },
    );

    it.each(["false", "0", "no", "off", "maybe", ""])(
      'parses "%s" as false',
      (val) => {
        const s = mkValid({ "data-allow-close": val });
        expect(parseConfig(s).allowClose).toBe(false);
      },
    );
  });

  describe("debug", () => {
    it("defaults to false when absent", () => {
      expect(parseConfig(mkValid()).debug).toBe(false);
    });

    it('parses "true" as true', () => {
      const s = mkValid({ "data-debug": "true" });
      expect(parseConfig(s).debug).toBe(true);
    });

    it('parses "false" as false', () => {
      const s = mkValid({ "data-debug": "false" });
      expect(parseConfig(s).debug).toBe(false);
    });
  });

  describe("previewMode", () => {
    it("defaults to false when absent", () => {
      expect(parseConfig(mkValid()).previewMode).toBe(false);
    });

    it('parses "true" as true', () => {
      const s = mkValid({ "data-preview-mode": "true" });
      // Preview mode skips validation; need no pk
      expect(parseConfig(s).previewMode).toBe(true);
    });

    it('parses "1" as true', () => {
      const s = mkScript({
        "data-public-key": "",
        "data-preview-mode": "1",
      });
      expect(parseConfig(s).previewMode).toBe(true);
    });

    it('parses "yes" as true', () => {
      const s = mkScript({ "data-preview-mode": "yes" });
      expect(parseConfig(s).previewMode).toBe(true);
    });

    it('parses "on" as true', () => {
      const s = mkScript({ "data-preview-mode": "on" });
      expect(parseConfig(s).previewMode).toBe(true);
    });

    it("handles whitespace-padded truthy values", () => {
      const s = mkScript({ "data-preview-mode": "  true  " });
      expect(parseConfig(s).previewMode).toBe(true);
    });
  });
});

// ===========================================================================
// parseConfig: cspNonce
// ===========================================================================

describe("parseConfig cspNonce", () => {
  it("is undefined when attribute absent", () => {
    expect(parseConfig(mkValid()).cspNonce).toBeUndefined();
  });

  it("passes through the nonce string verbatim", () => {
    const s = mkValid({ "data-csp-nonce": "abc123" });
    expect(parseConfig(s).cspNonce).toBe("abc123");
  });
});

// ===========================================================================
// parseConfig: brandColor
// ===========================================================================

describe("parseConfig brandColor", () => {
  it("is excluded from config when absent", () => {
    const cfg = parseConfig(mkValid());
    expect("brandColor" in cfg).toBe(false);
  });

  it("accepts a valid 6-digit hex colour", () => {
    const s = mkValid({ "data-brand-color": "#ff6600" });
    expect(parseConfig(s).brandColor).toBe("#ff6600");
  });

  it("accepts a valid 3-digit hex colour", () => {
    const s = mkValid({ "data-brand-color": "#f60" });
    expect(parseConfig(s).brandColor).toBe("#f60");
  });

  it("silently ignores an invalid colour (no throw)", () => {
    const s = mkValid({ "data-brand-color": "red" });
    const cfg = parseConfig(s);
    expect("brandColor" in cfg).toBe(false);
  });

  it("silently ignores rgb() format", () => {
    const s = mkValid({ "data-brand-color": "rgb(255,0,0)" });
    const cfg = parseConfig(s);
    expect("brandColor" in cfg).toBe(false);
  });
});

// ===========================================================================
// parseConfig: logoUrl
// ===========================================================================

describe("parseConfig logoUrl", () => {
  it("is excluded from config when absent", () => {
    const cfg = parseConfig(mkValid());
    expect("logoUrl" in cfg).toBe(false);
  });

  it("accepts an https URL", () => {
    const url = "https://cdn.example.com/logo.png";
    const s = mkValid({ "data-logo-url": url });
    expect(parseConfig(s).logoUrl).toBe(url);
  });

  it("accepts a data:image/ URI", () => {
    const uri = "data:image/png;base64,iVBOR";
    const s = mkValid({ "data-logo-url": uri });
    expect(parseConfig(s).logoUrl).toBe(uri);
  });

  it("rejects data:image/svg+xml URI", () => {
    const uri = "data:image/svg+xml;base64,PHN2Zy8+";
    const s = mkValid({ "data-logo-url": uri });
    expect(() => parseConfig(s)).toThrow("SVG data URIs are not permitted");
  });

  it("throws for http URL", () => {
    const s = mkValid({ "data-logo-url": "http://cdn.example.com/logo.png" });
    expect(() => parseConfig(s)).toThrow(ConfigError);
    expect(() => parseConfig(s)).toThrow(
      "data-logo-url must be an https:// or data:image/ URL",
    );
  });

  it("throws for javascript: URL", () => {
    const s = mkValid({ "data-logo-url": "javascript:alert(1)" });
    expect(() => parseConfig(s)).toThrow(ConfigError);
  });

  it("throws for a relative path", () => {
    const s = mkValid({ "data-logo-url": "/images/logo.png" });
    expect(() => parseConfig(s)).toThrow(ConfigError);
  });

  it("throws for a data: URI that is not image/*", () => {
    const s = mkValid({ "data-logo-url": "data:text/html;base64,PHA+" });
    expect(() => parseConfig(s)).toThrow(ConfigError);
  });
});

// ===========================================================================
// parseConfig: logoSvg
// ===========================================================================

describe("parseConfig logoSvg", () => {
  it("is excluded from config when absent", () => {
    expect("logoSvg" in parseConfig(mkValid())).toBe(false);
  });

  it("passes through SVG markup", () => {
    const svg = '<svg viewBox="0 0 10 10"><rect></rect></svg>';
    const s = mkValid({ "data-logo-svg": svg });
    expect(parseConfig(s).logoSvg).toBe(svg);
  });
});

// ===========================================================================
// parseConfig: accentGradient
// ===========================================================================

describe("parseConfig accentGradient", () => {
  it("is excluded from config when absent", () => {
    expect("accentGradient" in parseConfig(mkValid())).toBe(false);
  });

  it("parses a comma-separated hex triple into a tuple", () => {
    const s = mkValid({
      "data-accent-gradient": "#111111, #222222, #333333",
    });
    expect(parseConfig(s).accentGradient).toEqual([
      "#111111",
      "#222222",
      "#333333",
    ]);
  });

  it("handles triple without spaces", () => {
    const s = mkValid({
      "data-accent-gradient": "#aaa,#bbb,#ccc",
    });
    expect(parseConfig(s).accentGradient).toEqual(["#aaa", "#bbb", "#ccc"]);
  });

  it("passes through linear-gradient() verbatim", () => {
    const val = "linear-gradient(90deg, red, blue)";
    const s = mkValid({ "data-accent-gradient": val });
    expect(parseConfig(s).accentGradient).toBe(val);
  });

  it("passes through radial-gradient() verbatim", () => {
    const val = "radial-gradient(circle, #fff, #000)";
    const s = mkValid({ "data-accent-gradient": val });
    expect(parseConfig(s).accentGradient).toBe(val);
  });

  it("passes through conic-gradient() verbatim", () => {
    const val = "conic-gradient(from 90deg, red, blue)";
    const s = mkValid({ "data-accent-gradient": val });
    expect(parseConfig(s).accentGradient).toBe(val);
  });

  it("warns and returns undefined for two-colour tuple", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-accent-gradient": "#111, #222" });
    expect(parseConfig(s).accentGradient).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("three hex colours"),
    );
  });

  it("warns and returns undefined for four-colour tuple", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-accent-gradient": "#111, #222, #333, #444" });
    expect(parseConfig(s).accentGradient).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("warns and returns undefined for invalid hex in triple", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({
      "data-accent-gradient": "#111111, notahex, #333333",
    });
    expect(parseConfig(s).accentGradient).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("returns undefined for empty or whitespace-only value", () => {
    const s1 = mkValid({ "data-accent-gradient": "" });
    expect("accentGradient" in parseConfig(s1)).toBe(false);
    document.body.innerHTML = "";
    const s2 = mkValid({ "data-accent-gradient": "   " });
    expect("accentGradient" in parseConfig(s2)).toBe(false);
  });
});

// ===========================================================================
// parseConfig: privacyPolicyUrl
// ===========================================================================

describe("parseConfig privacyPolicyUrl", () => {
  it("is excluded from config when absent", () => {
    expect("privacyPolicyUrl" in parseConfig(mkValid())).toBe(false);
  });

  it("accepts valid https URL", () => {
    const url = "https://example.com/privacy";
    const s = mkValid({ "data-privacy-policy-url": url });
    expect(parseConfig(s).privacyPolicyUrl).toBe(url);
  });

  it("warns and returns undefined for http URL", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({
      "data-privacy-policy-url": "http://example.com/privacy",
    });
    expect(parseConfig(s).privacyPolicyUrl).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("must use https://"),
    );
  });

  it("warns and returns undefined for invalid URL", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-privacy-policy-url": "not a url" });
    expect(parseConfig(s).privacyPolicyUrl).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("not a valid URL"),
    );
  });

  it("warns and returns undefined for javascript: URL", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({
      "data-privacy-policy-url": "javascript:alert(1)",
    });
    expect(parseConfig(s).privacyPolicyUrl).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("returns undefined for empty or whitespace-only value", () => {
    const s = mkValid({ "data-privacy-policy-url": "   " });
    expect("privacyPolicyUrl" in parseConfig(s)).toBe(false);
  });
});

// ===========================================================================
// parseConfig: theme
// ===========================================================================

describe("parseConfig theme", () => {
  it("is excluded from config when absent", () => {
    expect("theme" in parseConfig(mkValid())).toBe(false);
  });

  it.each(["light", "dark", "auto"] as const)('accepts "%s"', (val) => {
    const s = mkValid({ "data-theme": val });
    expect(parseConfig(s).theme).toBe(val);
  });

  it("normalises to lowercase", () => {
    const s = mkValid({ "data-theme": "DARK" });
    expect(parseConfig(s).theme).toBe("dark");
  });

  it("warns and returns undefined for invalid value", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-theme": "sepia" });
    expect(parseConfig(s).theme).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("data-theme must be"),
    );
  });
});

// ===========================================================================
// parseConfig: numeric attributes
// ===========================================================================

describe("parseConfig numeric attributes", () => {
  describe("containerRadius (0-64)", () => {
    it("is excluded from config when absent", () => {
      expect("containerRadius" in parseConfig(mkValid())).toBe(false);
    });

    it("parses a valid integer", () => {
      const s = mkValid({ "data-container-radius": "16" });
      expect(parseConfig(s).containerRadius).toBe(16);
    });

    it("accepts 0 (boundary min)", () => {
      const s = mkValid({ "data-container-radius": "0" });
      expect(parseConfig(s).containerRadius).toBe(0);
    });

    it("accepts 64 (boundary max)", () => {
      const s = mkValid({ "data-container-radius": "64" });
      expect(parseConfig(s).containerRadius).toBe(64);
    });

    it("warns and returns undefined for value below min", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const s = mkValid({ "data-container-radius": "-1" });
      expect(parseConfig(s).containerRadius).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("between 0 and 64"),
      );
    });

    it("warns and returns undefined for value above max", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const s = mkValid({ "data-container-radius": "65" });
      expect(parseConfig(s).containerRadius).toBeUndefined();
      expect(warn).toHaveBeenCalled();
    });

    it("warns and returns undefined for non-numeric", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const s = mkValid({ "data-container-radius": "abc" });
      expect(parseConfig(s).containerRadius).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("must be numeric"),
      );
    });

    it("returns undefined for empty string", () => {
      const s = mkValid({ "data-container-radius": "" });
      expect(parseConfig(s).containerRadius).toBeUndefined();
    });

    it("accepts a decimal value within range", () => {
      const s = mkValid({ "data-container-radius": "12.5" });
      expect(parseConfig(s).containerRadius).toBe(12.5);
    });

    it("warns for Infinity", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const s = mkValid({ "data-container-radius": "Infinity" });
      expect(parseConfig(s).containerRadius).toBeUndefined();
      expect(warn).toHaveBeenCalled();
    });
  });

  describe("buttonRadius (0-64)", () => {
    it("parses a valid value", () => {
      const s = mkValid({ "data-button-radius": "8" });
      expect(parseConfig(s).buttonRadius).toBe(8);
    });

    it("warns for out-of-range", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const s = mkValid({ "data-button-radius": "100" });
      expect(parseConfig(s).buttonRadius).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("data-button-radius"),
      );
    });
  });

  describe("motionDuration (0-2000)", () => {
    it("accepts 0", () => {
      const s = mkValid({ "data-motion-duration": "0" });
      expect(parseConfig(s).motionDuration).toBe(0);
    });

    it("accepts 2000", () => {
      const s = mkValid({ "data-motion-duration": "2000" });
      expect(parseConfig(s).motionDuration).toBe(2000);
    });

    it("warns for 2001", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const s = mkValid({ "data-motion-duration": "2001" });
      expect(parseConfig(s).motionDuration).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("between 0 and 2000"),
      );
    });
  });

  describe("backdropOpacity (0-100)", () => {
    it("accepts 50", () => {
      const s = mkValid({ "data-backdrop-opacity": "50" });
      expect(parseConfig(s).backdropOpacity).toBe(50);
    });

    it("accepts boundary 0", () => {
      const s = mkValid({ "data-backdrop-opacity": "0" });
      expect(parseConfig(s).backdropOpacity).toBe(0);
    });

    it("accepts boundary 100", () => {
      const s = mkValid({ "data-backdrop-opacity": "100" });
      expect(parseConfig(s).backdropOpacity).toBe(100);
    });

    it("warns for 101", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const s = mkValid({ "data-backdrop-opacity": "101" });
      expect(parseConfig(s).backdropOpacity).toBeUndefined();
      expect(warn).toHaveBeenCalled();
    });
  });

  describe("gradientAngle (0-360)", () => {
    it("accepts 135", () => {
      const s = mkValid({ "data-gradient-angle": "135" });
      expect(parseConfig(s).gradientAngle).toBe(135);
    });

    it("accepts boundary 0", () => {
      const s = mkValid({ "data-gradient-angle": "0" });
      expect(parseConfig(s).gradientAngle).toBe(0);
    });

    it("accepts boundary 360", () => {
      const s = mkValid({ "data-gradient-angle": "360" });
      expect(parseConfig(s).gradientAngle).toBe(360);
    });

    it("warns for 361", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const s = mkValid({ "data-gradient-angle": "361" });
      expect(parseConfig(s).gradientAngle).toBeUndefined();
      expect(warn).toHaveBeenCalled();
    });
  });
});

// ===========================================================================
// parseConfig: fontFamily
// ===========================================================================

describe("parseConfig fontFamily", () => {
  it("is excluded from config when absent", () => {
    expect("fontFamily" in parseConfig(mkValid())).toBe(false);
  });

  it("accepts a valid font stack", () => {
    const s = mkValid({ "data-font-family": "Inter, system-ui, sans-serif" });
    expect(parseConfig(s).fontFamily).toBe("Inter, system-ui, sans-serif");
  });

  it("accepts quoted font names", () => {
    const s = mkValid({ "data-font-family": "'Fira Code', monospace" });
    expect(parseConfig(s).fontFamily).toBe("'Fira Code', monospace");
  });

  it("accepts double-quoted font names", () => {
    const s = mkValid({ "data-font-family": '"Segoe UI", Arial' });
    expect(parseConfig(s).fontFamily).toBe('"Segoe UI", Arial');
  });

  it("warns and returns undefined for CSS injection attempt (semicolon)", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({
      "data-font-family": "Arial; } body { display:none; .",
    });
    expect(parseConfig(s).fontFamily).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("disallowed characters"),
    );
  });

  it("warns for braces", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-font-family": "Arial {color:red}" });
    expect(parseConfig(s).fontFamily).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("warns for angle brackets", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-font-family": "<script>alert(1)</script>" });
    expect(parseConfig(s).fontFamily).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("warns for colons", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-font-family": "font:sans-serif" });
    expect(parseConfig(s).fontFamily).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("returns undefined for empty string", () => {
    const s = mkValid({ "data-font-family": "" });
    expect("fontFamily" in parseConfig(s)).toBe(false);
  });

  it("returns undefined for whitespace-only string", () => {
    const s = mkValid({ "data-font-family": "   " });
    expect("fontFamily" in parseConfig(s)).toBe(false);
  });
});

// ===========================================================================
// parseConfig: hex colour attributes (strict 6-digit)
// ===========================================================================

describe("parseConfig strict hex attributes", () => {
  describe("qrForeground", () => {
    it("is excluded when absent", () => {
      expect("qrForeground" in parseConfig(mkValid())).toBe(false);
    });

    it("accepts a valid 6-digit hex and lowercases it", () => {
      const s = mkValid({ "data-qr-foreground": "#0091C7" });
      expect(parseConfig(s).qrForeground).toBe("#0091c7");
    });

    it("warns and returns undefined for 3-digit hex", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const s = mkValid({ "data-qr-foreground": "#fff" });
      expect(parseConfig(s).qrForeground).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("6-digit hex"),
      );
    });

    it("returns undefined for empty string", () => {
      const s = mkValid({ "data-qr-foreground": "" });
      expect("qrForeground" in parseConfig(s)).toBe(false);
    });

    it("returns undefined for whitespace", () => {
      const s = mkValid({ "data-qr-foreground": "   " });
      expect("qrForeground" in parseConfig(s)).toBe(false);
    });
  });

  describe("qrBackground", () => {
    it("accepts valid hex and lowercases", () => {
      const s = mkValid({ "data-qr-background": "#FFFFFF" });
      expect(parseConfig(s).qrBackground).toBe("#ffffff");
    });

    it("warns for invalid hex", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const s = mkValid({ "data-qr-background": "white" });
      expect(parseConfig(s).qrBackground).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("data-qr-background"),
      );
    });
  });

  describe("buttonTextColour", () => {
    it("accepts valid hex and lowercases", () => {
      const s = mkValid({ "data-button-text-colour": "#AABBCC" });
      expect(parseConfig(s).buttonTextColour).toBe("#aabbcc");
    });

    it("warns for invalid format", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const s = mkValid({ "data-button-text-colour": "rgb(0,0,0)" });
      expect(parseConfig(s).buttonTextColour).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("data-button-text-colour"),
      );
    });
  });
});

// ===========================================================================
// parseConfig: QR enum attributes
// ===========================================================================

describe("parseConfig QR enum attributes", () => {
  describe("qrDotStyle", () => {
    it("is excluded when absent", () => {
      expect("qrDotStyle" in parseConfig(mkValid())).toBe(false);
    });

    it.each([
      "dots",
      "rounded",
      "classy",
      "classy-rounded",
      "square",
      "extra-rounded",
    ])('accepts "%s"', (val) => {
      const s = mkValid({ "data-qr-dot-style": val });
      expect(parseConfig(s).qrDotStyle).toBe(val);
    });

    it("normalises to lowercase", () => {
      const s = mkValid({ "data-qr-dot-style": "DOTS" });
      expect(parseConfig(s).qrDotStyle).toBe("dots");
    });

    it("warns for invalid value", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const s = mkValid({ "data-qr-dot-style": "triangles" });
      expect(parseConfig(s).qrDotStyle).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("data-qr-dot-style"),
      );
    });

    it("returns undefined for empty string", () => {
      const s = mkValid({ "data-qr-dot-style": "" });
      expect("qrDotStyle" in parseConfig(s)).toBe(false);
    });
  });

  describe("qrEyeFrameStyle", () => {
    it.each(["dot", "square", "extra-rounded"])('accepts "%s"', (val) => {
      const s = mkValid({ "data-qr-eye-frame-style": val });
      expect(parseConfig(s).qrEyeFrameStyle).toBe(val);
    });

    it("warns for invalid value", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const s = mkValid({ "data-qr-eye-frame-style": "rounded" });
      expect(parseConfig(s).qrEyeFrameStyle).toBeUndefined();
      expect(warn).toHaveBeenCalled();
    });
  });

  describe("qrEyeDotStyle", () => {
    it.each(["dot", "square"])('accepts "%s"', (val) => {
      const s = mkValid({ "data-qr-eye-dot-style": val });
      expect(parseConfig(s).qrEyeDotStyle).toBe(val);
    });

    it("warns for invalid value", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const s = mkValid({ "data-qr-eye-dot-style": "circle" });
      expect(parseConfig(s).qrEyeDotStyle).toBeUndefined();
      expect(warn).toHaveBeenCalled();
    });
  });
});

// ===========================================================================
// parseConfig: qrLogoUrl (HTTPS only)
// ===========================================================================

describe("parseConfig qrLogoUrl", () => {
  it("is excluded when absent", () => {
    expect("qrLogoUrl" in parseConfig(mkValid())).toBe(false);
  });

  it("accepts an https URL", () => {
    const url = "https://cdn.example.com/qr-logo.png";
    const s = mkValid({ "data-qr-logo-url": url });
    expect(parseConfig(s).qrLogoUrl).toBe(url);
  });

  it("warns for http URL", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-qr-logo-url": "http://cdn.example.com/qr.png" });
    expect(parseConfig(s).qrLogoUrl).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("must use https://"),
    );
  });

  it("warns for invalid URL", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-qr-logo-url": "not-a-url" });
    expect(parseConfig(s).qrLogoUrl).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("not a valid URL"),
    );
  });

  it("returns undefined for empty string", () => {
    const s = mkValid({ "data-qr-logo-url": "" });
    expect("qrLogoUrl" in parseConfig(s)).toBe(false);
  });
});

// ===========================================================================
// parseConfig: previewOrigin
// ===========================================================================

describe("parseConfig previewOrigin", () => {
  it("is excluded when absent", () => {
    expect("previewOrigin" in parseConfig(mkValid())).toBe(false);
  });

  it("accepts a valid origin", () => {
    const s = mkValid({
      "data-preview-mode": "true",
      "data-preview-origin": "https://docs.provii.app",
    });
    const cfg = parseConfig(s);
    expect(cfg.previewOrigin).toBe("https://docs.provii.app");
  });

  it("accepts multiple comma-separated origins", () => {
    const s = mkValid({
      "data-preview-mode": "true",
      "data-preview-origin":
        "https://docs.provii.app,https://localhost:4321",
    });
    const cfg = parseConfig(s);
    // URL constructor normalises; the parser returns parsed.origin
    expect(cfg.previewOrigin).toContain("https://docs.provii.app");
    expect(cfg.previewOrigin).toContain("https://localhost:4321");
  });

  it('accepts the literal "null" for opaque sandbox origins', () => {
    const s = mkValid({
      "data-preview-mode": "true",
      "data-preview-origin": "null",
    });
    expect(parseConfig(s).previewOrigin).toBe("null");
  });

  it('silently drops wildcard "*" with a warning', () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({
      "data-preview-mode": "true",
      "data-preview-origin": "*",
    });
    expect(parseConfig(s).previewOrigin).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('wildcard "*" is not permitted'),
    );
  });

  it("drops wildcard but keeps valid origins in same list", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({
      "data-preview-mode": "true",
      "data-preview-origin": "https://example.com,*,null",
    });
    const cfg = parseConfig(s);
    expect(cfg.previewOrigin).toContain("https://example.com");
    expect(cfg.previewOrigin).toContain("null");
    expect(cfg.previewOrigin).not.toContain("*");
    expect(warn).toHaveBeenCalled();
  });

  it("warns for origin with path component", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({
      "data-preview-mode": "true",
      "data-preview-origin": "https://example.com/some/path",
    });
    expect(parseConfig(s).previewOrigin).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("not a bare origin"),
    );
  });

  it("warns for non-URL string", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({
      "data-preview-mode": "true",
      "data-preview-origin": "not-a-url",
    });
    expect(parseConfig(s).previewOrigin).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("not a valid URL"),
    );
  });

  it("returns undefined for empty or whitespace-only", () => {
    const s = mkValid({
      "data-preview-mode": "true",
      "data-preview-origin": "   ",
    });
    expect("previewOrigin" in parseConfig(s)).toBe(false);
  });

  it("accepts an origin with a trailing slash", () => {
    // The parser checks `parsed.origin + "/" === entry` to handle
    // trailing slashes gracefully
    const s = mkValid({
      "data-preview-mode": "true",
      "data-preview-origin": "https://example.com/",
    });
    // Should normalise to the origin without trailing slash
    expect(parseConfig(s).previewOrigin).toBe("https://example.com");
  });
});

// ===========================================================================
// parseConfig: strings (data-strings and sibling script)
// ===========================================================================

describe("parseConfig strings", () => {
  it("is excluded when attribute absent", () => {
    expect("strings" in parseConfig(mkValid())).toBe(false);
  });

  it("parses valid JSON from data-strings attribute", () => {
    const s = mkValid({
      "data-strings": JSON.stringify({ headerTitle: "Custom Title" }),
    });
    expect(parseConfig(s).strings).toEqual({ headerTitle: "Custom Title" });
  });

  it("reads from sibling application/json script when data-strings absent", () => {
    const wrapper = document.createElement("div");
    const mainScript = document.createElement("script");
    mainScript.setAttribute("data-public-key", VALID_PK_TEST);
    wrapper.appendChild(mainScript);

    const siblingScript = document.createElement("script");
    siblingScript.type = "application/json";
    siblingScript.setAttribute("data-agegate-strings", "");
    siblingScript.textContent = JSON.stringify({
      verifyButtonLabel: "Open wallet",
    });
    wrapper.appendChild(siblingScript);

    document.body.appendChild(wrapper);
    const cfg = parseConfig(mainScript);
    expect(cfg.strings).toEqual({ verifyButtonLabel: "Open wallet" });
  });

  it("prefers data-strings over sibling script", () => {
    const wrapper = document.createElement("div");
    const mainScript = document.createElement("script");
    mainScript.setAttribute("data-public-key", VALID_PK_TEST);
    mainScript.setAttribute(
      "data-strings",
      JSON.stringify({ headerTitle: "From attribute" }),
    );
    wrapper.appendChild(mainScript);

    const siblingScript = document.createElement("script");
    siblingScript.type = "application/json";
    siblingScript.setAttribute("data-agegate-strings", "");
    siblingScript.textContent = JSON.stringify({
      headerTitle: "From sibling",
    });
    wrapper.appendChild(siblingScript);

    document.body.appendChild(wrapper);
    const cfg = parseConfig(mainScript);
    expect(cfg.strings).toEqual({ headerTitle: "From attribute" });
  });

  it("warns and returns undefined for invalid JSON", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-strings": "{ broken json" });
    expect(parseConfig(s).strings).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("not valid JSON"),
    );
  });

  it("warns and returns undefined for JSON array", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-strings": '["foo", "bar"]' });
    expect(parseConfig(s).strings).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("must be a JSON object"),
    );
  });

  it("warns and returns undefined for JSON primitive (string)", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-strings": '"just a string"' });
    expect(parseConfig(s).strings).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("must be a JSON object"),
    );
  });

  it("warns and returns undefined for JSON null", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-strings": "null" });
    expect(parseConfig(s).strings).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("must be a JSON object"),
    );
  });

  it("discards non-string values in the object", () => {
    const s = mkValid({
      "data-strings": JSON.stringify({
        headerTitle: "Good",
        loading: 42,
        tryAgain: true,
        errorTitle: null,
      }),
    });
    expect(parseConfig(s).strings).toEqual({ headerTitle: "Good" });
  });

  it("discards empty string values", () => {
    const s = mkValid({
      "data-strings": JSON.stringify({
        headerTitle: "",
        loading: "Please wait",
      }),
    });
    expect(parseConfig(s).strings).toEqual({ loading: "Please wait" });
  });

  it("returns undefined when all values are non-string or empty", () => {
    const s = mkValid({
      "data-strings": JSON.stringify({ a: 1, b: false, c: "" }),
    });
    expect("strings" in parseConfig(s)).toBe(false);
  });

  it("returns undefined for empty string attribute", () => {
    const s = mkValid({ "data-strings": "" });
    expect("strings" in parseConfig(s)).toBe(false);
  });

  it("returns undefined for whitespace-only attribute", () => {
    const s = mkValid({ "data-strings": "   " });
    expect("strings" in parseConfig(s)).toBe(false);
  });
});

// ===========================================================================
// parseConfig: full config object shape
// ===========================================================================

describe("parseConfig default config shape", () => {
  it("produces the correct defaults for a minimal valid script tag", () => {
    const s = mkValid();
    const cfg = parseConfig(s);

    expect(cfg.publicKey).toBe(VALID_PK_TEST);
    expect(cfg.environment).toBe("production");
    expect(cfg.style).toBe("modern");
    expect(cfg.apiEndpoint).toBeUndefined();
    expect(cfg.allowClose).toBe(false);
    expect(cfg.debug).toBe(false);
    expect(cfg.customStyles).toBeUndefined();
    expect(cfg.cspNonce).toBeUndefined();
    expect(cfg.previewMode).toBe(false);

    // Optional fields should not exist as keys
    expect("strings" in cfg).toBe(false);
    expect("brandColor" in cfg).toBe(false);
    expect("logoUrl" in cfg).toBe(false);
    expect("logoSvg" in cfg).toBe(false);
    expect("accentGradient" in cfg).toBe(false);
    expect("privacyPolicyUrl" in cfg).toBe(false);
    expect("theme" in cfg).toBe(false);
    expect("containerRadius" in cfg).toBe(false);
    expect("buttonRadius" in cfg).toBe(false);
    expect("fontFamily" in cfg).toBe(false);
    expect("motionDuration" in cfg).toBe(false);
    expect("backdropOpacity" in cfg).toBe(false);
    expect("gradientAngle" in cfg).toBe(false);
    expect("qrForeground" in cfg).toBe(false);
    expect("qrBackground" in cfg).toBe(false);
    expect("qrDotStyle" in cfg).toBe(false);
    expect("qrEyeFrameStyle" in cfg).toBe(false);
    expect("qrEyeDotStyle" in cfg).toBe(false);
    expect("qrLogoUrl" in cfg).toBe(false);
    expect("buttonTextColour" in cfg).toBe(false);
    expect("previewOrigin" in cfg).toBe(false);
  });

  it("includes every optional field when all are populated", () => {
    const s = mkValid({
      "data-environment": "sandbox",
      "data-style": "minimal",
      "data-allow-close": "true",
      "data-debug": "true",
      "data-csp-nonce": "nonce123",
      "data-brand-color": "#ff0000",
      "data-logo-url": "https://example.com/logo.png",
      "data-logo-svg": "<svg></svg>",
      "data-accent-gradient": "#111111, #222222, #333333",
      "data-privacy-policy-url": "https://example.com/privacy",
      "data-preview-mode": "false",
      "data-theme": "dark",
      "data-container-radius": "20",
      "data-button-radius": "10",
      "data-font-family": "Inter, sans-serif",
      "data-motion-duration": "300",
      "data-backdrop-opacity": "80",
      "data-gradient-angle": "90",
      "data-qr-foreground": "#112233",
      "data-qr-background": "#ffffff",
      "data-qr-dot-style": "rounded",
      "data-qr-eye-frame-style": "square",
      "data-qr-eye-dot-style": "dot",
      "data-qr-logo-url": "https://example.com/qr-logo.png",
      "data-button-text-colour": "#aabbcc",
      "data-strings": JSON.stringify({ headerTitle: "Hi" }),
    });
    const cfg = parseConfig(s);

    expect(cfg.environment).toBe("sandbox");
    expect(cfg.style).toBe("minimal");
    expect(cfg.allowClose).toBe(true);
    expect(cfg.debug).toBe(true);
    expect(cfg.cspNonce).toBe("nonce123");
    expect(cfg.brandColor).toBe("#ff0000");
    expect(cfg.logoUrl).toBe("https://example.com/logo.png");
    expect(cfg.logoSvg).toBe("<svg></svg>");
    expect(cfg.accentGradient).toEqual(["#111111", "#222222", "#333333"]);
    expect(cfg.privacyPolicyUrl).toBe("https://example.com/privacy");
    expect(cfg.previewMode).toBe(false);
    expect(cfg.theme).toBe("dark");
    expect(cfg.containerRadius).toBe(20);
    expect(cfg.buttonRadius).toBe(10);
    expect(cfg.fontFamily).toBe("Inter, sans-serif");
    expect(cfg.motionDuration).toBe(300);
    expect(cfg.backdropOpacity).toBe(80);
    expect(cfg.gradientAngle).toBe(90);
    expect(cfg.qrForeground).toBe("#112233");
    expect(cfg.qrBackground).toBe("#ffffff");
    expect(cfg.qrDotStyle).toBe("rounded");
    expect(cfg.qrEyeFrameStyle).toBe("square");
    expect(cfg.qrEyeDotStyle).toBe("dot");
    expect(cfg.qrLogoUrl).toBe("https://example.com/qr-logo.png");
    expect(cfg.buttonTextColour).toBe("#aabbcc");
    expect(cfg.strings).toEqual({ headerTitle: "Hi" });
  });
});

// ===========================================================================
// findScriptTag
// ===========================================================================

describe("findScriptTag", () => {
  it("returns null when no script tags have data-public-key", () => {
    const s = document.createElement("script");
    document.body.appendChild(s);
    expect(findScriptTag()).toBeNull();
  });

  it("finds a script tag with data-public-key via querySelectorAll fallback", () => {
    // document.currentScript is null outside a script execution context
    const s = document.createElement("script");
    s.setAttribute("data-public-key", VALID_PK_TEST);
    document.body.appendChild(s);
    expect(findScriptTag()).toBe(s);
  });

  it("warns when multiple script tags have data-public-key and returns first", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s1 = document.createElement("script");
    s1.setAttribute("data-public-key", VALID_PK_TEST);
    document.body.appendChild(s1);

    const s2 = document.createElement("script");
    s2.setAttribute("data-public-key", VALID_PK_LIVE);
    document.body.appendChild(s2);

    const found = findScriptTag();
    expect(found).toBe(s1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Multiple script tags found"),
    );
  });

  it("returns null when document is undefined", () => {
    // Simulate no-document environment by overriding temporarily
    const origDocument = globalThis.document;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = undefined;
    try {
      expect(findScriptTag()).toBeNull();
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).document = origDocument;
    }
  });
});

// ===========================================================================
// parseConfig: dataset key names match the expected HTML attribute names
//
// These tests verify the parser reads the correct camelCase dataset
// keys. Stryker could mutate "publicKey" to "publickey" or similar;
// these assertions catch that.
// ===========================================================================

describe("parseConfig attribute name fidelity", () => {
  it("reads data-public-key via dataset.publicKey", () => {
    const s = document.createElement("script");
    s.dataset["publicKey"] = VALID_PK_TEST;
    document.body.appendChild(s);
    expect(parseConfig(s).publicKey).toBe(VALID_PK_TEST);
  });

  it("reads data-environment via dataset.environment", () => {
    const s = document.createElement("script");
    s.dataset["publicKey"] = VALID_PK_TEST;
    s.dataset["environment"] = "sandbox";
    document.body.appendChild(s);
    expect(parseConfig(s).environment).toBe("sandbox");
  });

  it("reads data-allow-close via dataset.allowClose", () => {
    const s = document.createElement("script");
    s.dataset["publicKey"] = VALID_PK_TEST;
    s.dataset["allowClose"] = "true";
    document.body.appendChild(s);
    expect(parseConfig(s).allowClose).toBe(true);
  });

  it("reads data-debug via dataset.debug", () => {
    const s = document.createElement("script");
    s.dataset["publicKey"] = VALID_PK_TEST;
    s.dataset["debug"] = "1";
    document.body.appendChild(s);
    expect(parseConfig(s).debug).toBe(true);
  });

  it("reads data-custom-styles via dataset.customStyles", () => {
    const s = document.createElement("script");
    s.dataset["publicKey"] = VALID_PK_TEST;
    s.dataset["style"] = "custom";
    s.dataset["customStyles"] = ".x { color: blue; }";
    document.body.appendChild(s);
    expect(parseConfig(s).customStyles).toBe(".x { color: blue; }");
  });

  it("reads data-csp-nonce via dataset.cspNonce", () => {
    const s = document.createElement("script");
    s.dataset["publicKey"] = VALID_PK_TEST;
    s.dataset["cspNonce"] = "xyz789";
    document.body.appendChild(s);
    expect(parseConfig(s).cspNonce).toBe("xyz789");
  });
});

// ===========================================================================
// Edge case: ConfigError rethrown vs URL parse error in apiEndpoint
// ===========================================================================

describe("parseConfig apiEndpoint domain vs URL error distinction", () => {
  it("rethrows ConfigError from domain check rather than wrapping it", () => {
    // An HTTPS URL with a disallowed domain should throw the domain
    // ConfigError, not the generic "valid HTTPS URL" error.
    const s = mkValid({
      "data-api-endpoint": "https://attacker.example.com/v1",
    });
    try {
      parseConfig(s);
      // Fail if no error is thrown
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ConfigError);
      expect((err as ConfigError).message).toContain(
        "is not a recognised Provii API endpoint",
      );
    }
  });
});

// ===========================================================================
// parseConfig: regex boundary tests for PUBLIC_KEY_PATTERN
// ===========================================================================

describe("PUBLIC_KEY_PATTERN regex boundaries", () => {
  it("rejects pk_live_ prefix with non-hex character g", () => {
    const key = "pk_live_" + "g" + "0".repeat(63);
    const s = mkScript({ "data-public-key": key });
    expect(() => parseConfig(s)).toThrow(ConfigError);
  });

  it("rejects key with trailing whitespace", () => {
    const s = mkScript({ "data-public-key": VALID_PK_TEST + " " });
    expect(() => parseConfig(s)).toThrow(ConfigError);
  });

  it("rejects key with leading whitespace", () => {
    const s = mkScript({ "data-public-key": " " + VALID_PK_TEST });
    expect(() => parseConfig(s)).toThrow(ConfigError);
  });

  it("rejects pk_ prefix alone without live or test", () => {
    const s = mkScript({ "data-public-key": "pk_" + "a".repeat(64) });
    expect(() => parseConfig(s)).toThrow(ConfigError);
  });

  it("accepts exactly 64 hex digits after pk_test_", () => {
    // Boundary: exactly 64 chars is the only accepted length
    const s = mkScript({ "data-public-key": "pk_test_" + "0".repeat(64) });
    expect(parseConfig(s).publicKey).toBe("pk_test_" + "0".repeat(64));
  });
});

// ===========================================================================
// parseConfig: the full interaction between previewMode and validation
// ===========================================================================

describe("parseConfig preview mode validation bypass", () => {
  it("skips all validateConfig checks when previewMode is true", () => {
    // This script tag has invalid values for almost everything that
    // validateConfig would check, but previewMode should bypass it all.
    const s = mkScript({
      "data-preview-mode": "true",
      "data-public-key": "invalid",
      "data-environment": "sandbox",
      "data-api-endpoint": "https://evil.example.com",
    });
    // Should not throw
    const cfg = parseConfig(s);
    expect(cfg.previewMode).toBe(true);
    expect(cfg.publicKey).toBe("invalid");
  });

  it("still validates environment and style even in preview mode", () => {
    // The environment and style type guards run BEFORE the previewMode
    // conditional. Invalid values for these should still throw.
    const s = mkScript({
      "data-preview-mode": "true",
      "data-environment": "invalid_env",
    });
    expect(() => parseConfig(s)).toThrow(
      'data-environment must be "production" or "sandbox"',
    );
  });

  it("still validates style in preview mode", () => {
    const s = mkScript({
      "data-preview-mode": "true",
      "data-style": "broken",
    });
    expect(() => parseConfig(s)).toThrow('data-style must be');
  });

  it("still validates logo URL in preview mode", () => {
    const s = mkScript({
      "data-preview-mode": "true",
      "data-logo-url": "http://insecure.com/logo.png",
    });
    expect(() => parseConfig(s)).toThrow(
      "data-logo-url must be an https:// or data:image/ URL",
    );
  });
});

// ===========================================================================
// STRICT_HEX_RE vs HEX_COLOUR_RE difference
//
// Brand colour uses the looser 3-or-6-digit regex, while QR/button
// attributes use strict 6-digit only. This tests the distinction.
// ===========================================================================

describe("strict vs loose hex handling", () => {
  it("brandColor accepts 3-digit hex", () => {
    const s = mkValid({ "data-brand-color": "#abc" });
    expect(parseConfig(s).brandColor).toBe("#abc");
  });

  it("qrForeground rejects 3-digit hex", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-qr-foreground": "#abc" });
    expect(parseConfig(s).qrForeground).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("qrBackground rejects 3-digit hex", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-qr-background": "#abc" });
    expect(parseConfig(s).qrBackground).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("buttonTextColour rejects 3-digit hex", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-button-text-colour": "#abc" });
    expect(parseConfig(s).buttonTextColour).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});

// ===========================================================================
// parseConfig: hex lowercasing in strict attributes
// ===========================================================================

describe("parseHexAttr lowercasing", () => {
  it("lowercases qrForeground", () => {
    const s = mkValid({ "data-qr-foreground": "#AABB11" });
    expect(parseConfig(s).qrForeground).toBe("#aabb11");
  });

  it("lowercases qrBackground", () => {
    const s = mkValid({ "data-qr-background": "#CCDDEE" });
    expect(parseConfig(s).qrBackground).toBe("#ccddee");
  });

  it("lowercases buttonTextColour", () => {
    const s = mkValid({ "data-button-text-colour": "#FF00FF" });
    expect(parseConfig(s).buttonTextColour).toBe("#ff00ff");
  });
});

// ===========================================================================
// findScriptTag: document.currentScript path
// ===========================================================================

describe("findScriptTag with document.currentScript", () => {
  it("returns currentScript when it has data-public-key", () => {
    const s = document.createElement("script");
    s.setAttribute("data-public-key", VALID_PK_TEST);
    document.body.appendChild(s);
    Object.defineProperty(document, "currentScript", {
      value: s,
      configurable: true,
    });
    try {
      expect(findScriptTag()).toBe(s);
    } finally {
      Object.defineProperty(document, "currentScript", {
        value: null,
        configurable: true,
      });
    }
  });

  it("falls through when currentScript lacks data-public-key", () => {
    const noKey = document.createElement("script");
    document.body.appendChild(noKey);
    Object.defineProperty(document, "currentScript", {
      value: noKey,
      configurable: true,
    });

    const withKey = document.createElement("script");
    withKey.setAttribute("data-public-key", VALID_PK_TEST);
    document.body.appendChild(withKey);

    try {
      expect(findScriptTag()).toBe(withKey);
    } finally {
      Object.defineProperty(document, "currentScript", {
        value: null,
        configurable: true,
      });
    }
  });
});

// ===========================================================================
// parseConfig: numeric attribute whitespace trimming
// ===========================================================================

describe("numeric attribute whitespace trimming", () => {
  it("trims leading and trailing whitespace from containerRadius", () => {
    const s = mkValid({ "data-container-radius": "  32  " });
    expect(parseConfig(s).containerRadius).toBe(32);
  });

  it("trims whitespace from motionDuration", () => {
    const s = mkValid({ "data-motion-duration": " 500 " });
    expect(parseConfig(s).motionDuration).toBe(500);
  });
});

// ===========================================================================
// parseConfig: NaN handling in numeric attributes
// ===========================================================================

describe("numeric attribute NaN handling", () => {
  it("rejects NaN for containerRadius", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkValid({ "data-container-radius": "NaN" });
    expect(parseConfig(s).containerRadius).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("must be numeric"),
    );
  });
});
