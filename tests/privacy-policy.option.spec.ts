/**
 * W10-3.6: privacyPolicyUrl option coverage.
 *
 * Parser accepts https:// URLs and rejects anything else with a
 * console warning. The challenge UI builder renders the link in
 * the footer with target=_blank + rel="noopener noreferrer"
 * when a URL is supplied, and omits the element otherwise.
 *
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.com"}
 */

import { parseConfig } from "../src/modes/config-parser.js";
import {
  buildMobileChallengeUI,
  buildDesktopChallengeUI,
} from "../src/ui/challenge-ui.js";
import type { AutoBlockConfig } from "../src/core/types.js";

const TEST_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function mkScript(attrs: Record<string, string>): HTMLScriptElement {
  const s = document.createElement("script");
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.body.appendChild(s);
  return s;
}

function sampleData() {
  return {
    shortCode: "123456789012",
    deepLink: "proviiwallet://verify",
    qrPayload: JSON.stringify({ challenge_id: "c" }),
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
});

describe("config-parser privacyPolicyUrl (W10-3.6)", () => {
  it("accepts a valid https URL", () => {
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-privacy-policy-url": "https://example.com/privacy",
    });
    expect(parseConfig(s).privacyPolicyUrl).toBe("https://example.com/privacy");
  });

  it("rejects http with a warning", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-privacy-policy-url": "http://example.com/privacy",
    });
    expect(parseConfig(s).privacyPolicyUrl).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("rejects javascript: URLs", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-privacy-policy-url": "javascript:alert(1)",
    });
    expect(parseConfig(s).privacyPolicyUrl).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("rejects malformed URLs", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-environment": "sandbox",
      "data-privacy-policy-url": "not a url",
    });
    expect(parseConfig(s).privacyPolicyUrl).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("leaves privacyPolicyUrl undefined when attribute is absent", () => {
    const s = mkScript({ "data-public-key": TEST_PUBLIC_KEY, "data-environment": "sandbox" });
    expect(parseConfig(s).privacyPolicyUrl).toBeUndefined();
  });

  it("round-trips through AutoBlockConfig type", () => {
    const cfg: AutoBlockConfig = {
      publicKey: TEST_PUBLIC_KEY,
      privacyPolicyUrl: "https://example.com/privacy",
    };
    expect(cfg.privacyPolicyUrl).toBe("https://example.com/privacy");
  });
});

describe("challenge-ui privacyPolicyUrl wiring (W10-3.6)", () => {
  it("renders a privacy link on desktop when URL is supplied", () => {
    const ui = buildDesktopChallengeUI(sampleData(), {
      privacyPolicyUrl: "https://example.com/privacy",
    });
    const host = document.createElement("div");
    host.appendChild(ui.root);
    document.body.appendChild(host);

    const link = host.querySelector(
      "a.agegate-privacy-link",
    ) as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(link?.href).toBe("https://example.com/privacy");
    expect(link?.target).toBe("_blank");
    expect(link?.rel).toContain("noopener");
    expect(link?.rel).toContain("noreferrer");
  });

  it("renders a privacy link on mobile when URL is supplied", () => {
    const ui = buildMobileChallengeUI(sampleData(), {
      privacyPolicyUrl: "https://example.com/privacy",
    });
    const host = document.createElement("div");
    host.appendChild(ui.root);
    document.body.appendChild(host);

    const link = host.querySelector(
      "a.agegate-privacy-link",
    ) as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(link?.href).toBe("https://example.com/privacy");
  });

  it("omits the privacy link when no URL is configured", () => {
    const ui = buildDesktopChallengeUI(sampleData(), {});
    const host = document.createElement("div");
    host.appendChild(ui.root);
    document.body.appendChild(host);

    expect(host.querySelector("a.agegate-privacy-link")).toBeNull();
  });

  it("drops a non-https URL at the UI layer as belt-and-braces", () => {
    const ui = buildDesktopChallengeUI(sampleData(), {
      // Parser would already have warned; if something slipped through
      // the UI layer must not render an http:// link.
      privacyPolicyUrl: "http://example.com/privacy",
    });
    const host = document.createElement("div");
    host.appendChild(ui.root);
    document.body.appendChild(host);

    expect(host.querySelector("a.agegate-privacy-link")).toBeNull();
  });
});
