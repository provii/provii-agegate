/**
 * W10-3.4: logoUrl + logoSvg option coverage.
 *
 * Parser accepts both attributes, rejects non-https URLs, and runtime
 * logic renders an <img> or inline SVG with SVG winning when both are
 * supplied.
 *
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.com"}
 */

import { parseConfig, ConfigError } from "../src/modes/config-parser.js";
import { buildDesktopChallengeUI } from "../src/ui/challenge-ui.js";

const TEST_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const VALID_SHORT_CODE = "123456789012";

function mkScript(attrs: Record<string, string>): HTMLScriptElement {
  const s = document.createElement("script");
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.body.appendChild(s);
  return s;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("config-parser logo attributes (W10-3.4)", () => {
  it("accepts https logoUrl", () => {
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-logo-url": "https://cdn.example.com/brand.png",
    });
    expect(parseConfig(s).logoUrl).toBe("https://cdn.example.com/brand.png");
  });

  it("rejects data:image/svg+xml URI (defence in depth)", () => {
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-logo-url": "data:image/svg+xml;base64,PHN2Zy8+",
    });
    expect(() => parseConfig(s)).toThrow(ConfigError);
  });

  it("rejects SVG data URIs case-insensitively", () => {
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-logo-url": "data:image/SVG+xml;base64,PHN2Zy8+",
    });
    expect(() => parseConfig(s)).toThrow(ConfigError);

    const s2 = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-logo-url": "data:image/Svg+XML;base64,PHN2Zy8+",
    });
    expect(() => parseConfig(s2)).toThrow(ConfigError);
  });

  it("accepts data:image/png URI", () => {
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-logo-url": "data:image/png;base64,iVBORw0KGgo=",
    });
    expect(parseConfig(s).logoUrl).toMatch(/^data:image\/png/);
  });

  it("accepts data:image/webp URI", () => {
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-logo-url": "data:image/webp;base64,UklGR0AAAA==",
    });
    expect(parseConfig(s).logoUrl).toMatch(/^data:image\/webp/);
  });

  it("rejects http logoUrl", () => {
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-logo-url": "http://cdn.example.com/brand.png",
    });
    expect(() => parseConfig(s)).toThrow(ConfigError);
  });

  it("rejects javascript: logoUrl", () => {
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-logo-url": "javascript:alert(1)",
    });
    expect(() => parseConfig(s)).toThrow(ConfigError);
  });

  it("sanitises logoSvg through DOMPurify at the boundary", () => {
    const svg = "<svg viewBox='0 0 10 10'><circle cx='5' cy='5' r='4'/></svg>";
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-logo-svg": svg,
    });
    const result = parseConfig(s).logoSvg;
    // DOMPurify normalises quotes and self-closing tags but preserves content
    expect(result).toContain("circle");
    expect(result).toContain('viewBox="0 0 10 10"');
  });
});

describe("config-parser logoSvg sanitisation (AG-U9)", () => {
  it("strips script tags from logoSvg at the config boundary", () => {
    const maliciousSvg =
      '<svg><script>alert("xss")</script><circle cx="5" cy="5" r="4"/></svg>';
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-logo-svg": maliciousSvg,
    });
    const result = parseConfig(s).logoSvg;
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
    expect(result).toContain("circle");
  });

  it("strips onload event handlers from logoSvg", () => {
    const onloadSvg = '<svg onload="alert(1)"><rect width="10" height="10"/></svg>';
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-logo-svg": onloadSvg,
    });
    const result = parseConfig(s).logoSvg;
    expect(result).not.toContain("onload");
    expect(result).not.toContain("alert");
    expect(result).toContain("rect");
  });

  it("strips onerror and onclick from nested SVG elements", () => {
    const nestedEventsSvg =
      '<svg><circle cx="5" cy="5" r="4" onerror="alert(1)" onclick="alert(2)"/></svg>';
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-logo-svg": nestedEventsSvg,
    });
    const result = parseConfig(s).logoSvg;
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("alert");
    expect(result).toContain("circle");
  });

  it("returns undefined for empty or whitespace-only logoSvg", () => {
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-logo-svg": "   ",
    });
    expect(parseConfig(s).logoSvg).toBeUndefined();
  });

  it("preserves safe SVG content after sanitisation", () => {
    const safeSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L2 7v10l10 5 10-5V7z" fill="#333"/></svg>';
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-logo-svg": safeSvg,
    });
    const result = parseConfig(s).logoSvg;
    expect(result).toContain("path");
    expect(result).toContain('viewBox="0 0 24 24"');
    expect(result).toContain('fill="#333"');
  });
});

describe("challenge UI logo rendering (W10-3.4)", () => {
  const data = {
    shortCode: VALID_SHORT_CODE,
    deepLink: "proviiwallet://verify?d=x",
    qrPayload: "{}",
  };

  it("renders an <img> when logoUrl is supplied", () => {
    const ui = buildDesktopChallengeUI(data, {
      logoUrl: "https://cdn.example.com/brand.png",
    });
    const host = document.createElement("div");
    host.appendChild(ui.root);
    const img = host.querySelector(".logo img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://cdn.example.com/brand.png");
    expect(img?.getAttribute("alt")).toBe("");
    ui.destroy();
  });

  it("renders inline SVG when logoSvg is supplied", () => {
    const ui = buildDesktopChallengeUI(data, {
      logoSvg: "<svg data-test='custom'></svg>",
    });
    const host = document.createElement("div");
    host.appendChild(ui.root);
    const svg = host.querySelector(".logo svg[data-test='custom']");
    expect(svg).not.toBeNull();
    ui.destroy();
  });

  it("prefers SVG over URL and warns", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const ui = buildDesktopChallengeUI(data, {
      logoUrl: "https://cdn.example.com/brand.png",
      logoSvg: "<svg data-test='custom'></svg>",
    });
    const host = document.createElement("div");
    host.appendChild(ui.root);
    expect(host.querySelector(".logo img")).toBeNull();
    expect(host.querySelector(".logo svg")).not.toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    ui.destroy();
  });

  it("falls back to the default shield logo when nothing is provided", () => {
    const ui = buildDesktopChallengeUI(data, {});
    const host = document.createElement("div");
    host.appendChild(ui.root);
    expect(host.querySelector(".logo svg")).not.toBeNull();
    expect(host.querySelector(".logo img")).toBeNull();
    ui.destroy();
  });
});
