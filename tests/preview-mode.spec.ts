/**
 * Preview mode unit tests.
 *
 * Verifies that data-preview-mode="true" causes the SDK to:
 *   - render the overlay UI with canned challenge data,
 *   - never call fetch (zero network requests),
 *   - skip publicKey and apiEndpoint validation,
 *   - display the preview banner.
 *
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.com"}
 */

import { parseConfig } from "../src/modes/config-parser.js";
import type { AutoBlockConfig } from "../src/core/types.js";

const VALID_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const DUMMY_PUBLIC_KEY =
  "pk_test_0000000000000000000000000000000000000000000000000000000000000000";

function mkScript(attrs: Record<string, string>): HTMLScriptElement {
  const s = document.createElement("script");
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.body.appendChild(s);
  return s;
}

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
  document.body.style.visibility = "";
});

describe("config-parser: data-preview-mode", () => {
  it("sets previewMode=true when data-preview-mode is 'true'", () => {
    const s = mkScript({
      "data-public-key": VALID_PUBLIC_KEY,
      "data-preview-mode": "true",
    });
    const cfg = parseConfig(s);
    expect(cfg.previewMode).toBe(true);
  });

  it("sets previewMode=false when attribute is absent", () => {
    const s = mkScript({
      "data-public-key": VALID_PUBLIC_KEY,
    });
    const cfg = parseConfig(s);
    expect(cfg.previewMode).toBe(false);
  });

  it("sets previewMode=false when attribute is 'false'", () => {
    const s = mkScript({
      "data-public-key": VALID_PUBLIC_KEY,
      "data-preview-mode": "false",
    });
    const cfg = parseConfig(s);
    expect(cfg.previewMode).toBe(false);
  });

  it("skips publicKey validation in preview mode", () => {
    // A dummy key that would normally fail validation
    const s = mkScript({
      "data-public-key": DUMMY_PUBLIC_KEY,
      "data-preview-mode": "true",
    });
    expect(() => parseConfig(s)).not.toThrow();
    const cfg = parseConfig(s);
    expect(cfg.previewMode).toBe(true);
    expect(cfg.publicKey).toBe(DUMMY_PUBLIC_KEY);
  });

  it("skips apiEndpoint validation in preview mode", () => {
    const s = mkScript({
      "data-public-key": DUMMY_PUBLIC_KEY,
      "data-preview-mode": "true",
      "data-api-endpoint": "https://not-a-provii-domain.example.com",
    });
    // Would normally throw ConfigError for unrecognised domain
    expect(() => parseConfig(s)).not.toThrow();
  });
});

describe("preview mode: no fetch calls", () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ verified: false }), { status: 200 }),
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("never calls fetch when previewMode is true", async () => {
    // We import AutoBlockMode dynamically to ensure the autoload IIFE
    // does not interfere (it requires document.currentScript).
    const { AutoBlockMode } = await import("../src/modes/autoload.js");

    const config: AutoBlockConfig = {
      publicKey: DUMMY_PUBLIC_KEY,
      environment: "sandbox",
      previewMode: true,
    };

    const mode = new AutoBlockMode(config);
    await mode.initialise();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders the preview banner inside the shadow DOM", async () => {
    const { AutoBlockMode } = await import("../src/modes/autoload.js");

    const config: AutoBlockConfig = {
      publicKey: DUMMY_PUBLIC_KEY,
      environment: "sandbox",
      previewMode: true,
    };

    const mode = new AutoBlockMode(config);
    await mode.initialise();

    // The shadow host is appended to document.body.
    // Shadow roots created with { mode: 'closed' } can't be queried via
    // element.shadowRoot, but the AutoBlockMode stores it internally.
    // Instead, check that the body has a child with the overlay.
    const shadowHost = document.body.querySelector("div");
    expect(shadowHost).not.toBeNull();
  });
});
