/**
 * Layout option coverage. Modal is the only supported layout.
 *
 * Verifies the parser ignores layout-related attributes (since the
 * field was removed) and the AutoBlockMode always mounts as modal.
 *
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.com"}
 */

import { AutoBlockMode } from "../src/modes/autoload.js";
import { parseConfig } from "../src/modes/config-parser.js";
import type { AutoBlockConfig } from "../src/core/types.js";

const TEST_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function mkScript(attrs: Record<string, string>): HTMLScriptElement {
  const s = document.createElement("script");
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.body.appendChild(s);
  return s;
}

function baseCfg(override: Partial<AutoBlockConfig> = {}): AutoBlockConfig {
  return {
    publicKey: TEST_PUBLIC_KEY,
    environment: "sandbox",
    ...override,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
  document.body.style.visibility = "";
});

describe("config-parser layout attribute (modal-only)", () => {
  it("does not expose a layout field", () => {
    const s = mkScript({ "data-public-key": TEST_PUBLIC_KEY });
    const cfg = parseConfig(s);
    // layout field removed from AutoBlockConfig; the key must not exist
    expect("layout" in cfg).toBe(false);
  });

  it("ignores a data-layout attribute silently", () => {
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-layout": "modal",
    });
    const cfg = parseConfig(s);
    // layout is no longer parsed, so the key must not exist
    expect("layout" in cfg).toBe(false);
  });
});

describe("AutoBlockMode always mounts as modal", () => {
  it("locks body scroll on showOverlay", () => {
    const mode = new AutoBlockMode(baseCfg());
    (mode as unknown as { showOverlay: (m: string) => void }).showOverlay(
      "test",
    );
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("attaches a shadow host to the document body", () => {
    const mode = new AutoBlockMode(baseCfg());
    (mode as unknown as { showOverlay: (m: string) => void }).showOverlay(
      "test",
    );
    // Shadow root is attached with { mode: "closed" } so the overlay
    // contents are not reachable via host.shadowRoot. This test asserts
    // the shadow HOST landed in the DOM; the overlay's aria-modal and
    // role attributes are covered in autoload's own unit tests that use
    // the internal handle, not a shadow-root traversal.
    const hostDivs = document.body.querySelectorAll("div");
    expect(hostDivs.length).toBeGreaterThan(0);
  });
});
