/**
 * DOMPurify SVG sanitisation tests (HIGH-3).
 *
 * Verifies that DOMPurify strips event handlers and script elements from
 * SVG input before it reaches innerHTML in challenge-ui.ts and
 * bridge-schema.ts.
 *
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.com"}
 */

import DOMPurify from "dompurify";
import { buildDesktopChallengeUI } from "../src/ui/challenge-ui.js";
import { parseConfigMessage } from "../src/modes/bridge-schema.js";

const ATTACK_SVG =
  '<svg onload="alert(1)"><script>alert(1)</script><circle cx="5" cy="5" r="4"/></svg>';

const NESTED_EVENT_SVG =
  '<svg><circle cx="5" cy="5" r="4" onerror="alert(1)" onclick="alert(2)"/></svg>';

describe("DOMPurify SVG sanitisation (HIGH-3)", () => {
  it("strips onload, script, and event handlers from raw SVG", () => {
    const result = DOMPurify.sanitize(ATTACK_SVG, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ["script"],
      FORBID_ATTR: ["onerror", "onload", "onclick"],
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
    });

    expect(result).not.toContain("onload");
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
    // The safe circle element should survive
    expect(result).toContain("circle");
  });

  it("strips nested event handlers from SVG attributes", () => {
    const result = DOMPurify.sanitize(NESTED_EVENT_SVG, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ["script"],
      FORBID_ATTR: ["onerror", "onload", "onclick"],
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
    });

    expect(result).not.toContain("onerror");
    expect(result).not.toContain("onclick");
    expect(result).toContain("circle");
  });

  it("challenge-ui sanitises logoSvg via DOMPurify", () => {
    const data = {
      shortCode: "123456789012",
      deepLink: "proviiwallet://verify?d=x",
      qrPayload: "{}",
    };

    const ui = buildDesktopChallengeUI(data, { logoSvg: ATTACK_SVG });
    const host = document.createElement("div");
    host.appendChild(ui.root);
    const logoHtml = host.querySelector(".logo")?.innerHTML ?? "";

    expect(logoHtml).not.toContain("onload");
    expect(logoHtml).not.toContain("<script");
    expect(logoHtml).not.toContain("alert");
    expect(logoHtml).toContain("circle");
    ui.destroy();
  });

  it("bridge-schema sanitises logoSvg via DOMPurify (defence in depth)", () => {
    // Use an SVG that passes the regex gate (no script, no onX=, no javascript:)
    // but contains a <foreignObject> with embedded HTML that DOMPurify should strip.
    const sneakySvg =
      '<svg><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><div>injected</div></body></foreignObject><circle cx="5" cy="5" r="4"/></svg>';

    const message = {
      type: "agegate-config",
      version: 1,
      config: {
        brandColour: "#ff0000",
        accentGradient: ["#ff0000", "#00ff00", "#0000ff"],
        layout: "modal",
        locale: "en",
        containerRadius: 8,
        buttonRadius: 4,
        fontFamily: "Inter, sans-serif",
        motionDuration: 300,
        strings: {},
        dir: "ltr",
        logoSvg: sneakySvg,
      },
    };

    const result = parseConfigMessage(message);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const svgValue = result.value.config.logoSvg;
      expect(svgValue).toBeDefined();
      // DOMPurify should strip the foreignObject body content
      expect(svgValue).not.toContain("injected");
      // The safe circle element should survive
      expect(svgValue).toContain("circle");
    }
  });

  it("bridge-schema rejects script tags before DOMPurify", () => {
    const message = {
      type: "agegate-config",
      version: 1,
      config: {
        brandColour: "#ff0000",
        accentGradient: ["#ff0000", "#00ff00", "#0000ff"],
        layout: "modal",
        locale: "en",
        containerRadius: 8,
        buttonRadius: 4,
        fontFamily: "Inter, sans-serif",
        motionDuration: 300,
        strings: {},
        dir: "ltr",
        logoSvg: ATTACK_SVG,
      },
    };

    const result = parseConfigMessage(message);
    // The regex pre-check should reject this before DOMPurify even runs
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("rejected unsafe markup");
    }
  });
});
