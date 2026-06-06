/** @jest-environment jsdom */
// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Survivor-killing tests for StyledQR.ts
 *
 * Targets the 20 mutants (out of 159) that survived the initial
 * StyledQR-mutations.spec.ts test suite. Focuses on:
 *
 *   - CJS/ESM interop typeof guard and ternary branch (lines 31-36)
 *   - parseQrBgToken / parseQrFgToken null+typeof guards, trim, try/catch
 *   - parseAccentGradientToken regex match, length < 3 boundary, indices
 *   - MutationObserver callback conditional (canvas && !hasAttribute)
 *   - update() container null guard
 *   - destroy() innerHTML = "" string literal
 *   - initialData default parameter ""
 *   - HEX_TRIPLE_RE regex pattern survival
 */

import { StyledQR } from "../src/ui/StyledQR.js";

// -------------------------------------------------------------------
// Module-level mock: default export is NOT a function (forces the
// fallback branch in the CJS/ESM interop ternary at lines 31-36).
// The mock returns a jest.fn() directly, so `QRCodeStylingLib` itself
// is the constructor. The interop code sees `.default` is not a
// function and falls through to the else branch.
// -------------------------------------------------------------------
jest.mock("qr-code-styling", () => jest.fn());

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockQRConstructor: jest.Mock = require("qr-code-styling");

/* ---------- helpers ---------- */

function makeMockQRInstance() {
  return { append: jest.fn(), update: jest.fn() };
}

function getConstructorOptions(): Record<string, unknown> {
  return mockQRConstructor.mock.calls[0][0];
}

function makeAppendingMock() {
  const inst = makeMockQRInstance();
  inst.append.mockImplementation((el: HTMLElement) => {
    const canvas = document.createElement("canvas");
    el.appendChild(canvas);
  });
  return inst;
}

/**
 * Creates an element attached to document.body with a CSS custom property.
 * Must be attached for getComputedStyle to return values in jsdom.
 */
function containerWithCssVar(varName: string, value: string): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  el.style.setProperty(varName, value);
  return el;
}

/* ---------- test suite ---------- */

describe("StyledQR survivor-killing tests", () => {
  let container: HTMLElement;
  let mockInstance: ReturnType<typeof makeMockQRInstance>;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement("div");
    mockInstance = makeMockQRInstance();
    mockQRConstructor.mockImplementation(() => mockInstance);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  /* ================================================================== */
  /*  CJS/ESM interop ternary (lines 31-36)                             */
  /*                                                                    */
  /*  The mock sets qr-code-styling to jest.fn() directly, so the       */
  /*  `.default` property is undefined (not a function). This exercises  */
  /*  the else branch. If Stryker mutates the typeof check or swaps     */
  /*  the ternary arms, construction will fail or produce wrong output. */
  /* ================================================================== */

  describe("CJS/ESM interop resolution", () => {
    it("resolves constructor when .default is not a function (else branch)", () => {
      // The mock has no .default property, so typeof ... .default !== "function".
      // The else branch should use QRCodeStylingLib directly as constructor.
      new StyledQR(container);
      expect(mockQRConstructor).toHaveBeenCalledTimes(1);
    });

    it("constructed instance has working append method from else branch", () => {
      new StyledQR(container);
      expect(mockInstance.append).toHaveBeenCalledWith(container);
    });

    it("constructed instance has working update method from else branch", () => {
      const qr = new StyledQR(container);
      qr.update("test");
      expect(mockInstance.update).toHaveBeenCalledWith({ data: "test" });
    });

    it("typeof check targets 'function' string exactly", () => {
      // If Stryker mutates "function" to "", the typeof guard breaks.
      // We verify construction works, meaning the string was correct.
      expect(() => new StyledQR(container)).not.toThrow();
      expect(mockQRConstructor).toHaveBeenCalled();
    });
  });

  /* ================================================================== */
  /*  parseQrBgToken , typeof getComputedStyle guard + trim + fallback  */
  /* ================================================================== */

  describe("parseQrBgToken edge cases", () => {
    it("returns #ffffff when element is null-like (not in DOM, empty computed style)", () => {
      // A detached element: getComputedStyle returns empty strings
      const detached = document.createElement("div");
      new StyledQR(detached);
      const bgOpts = getConstructorOptions()["backgroundOptions"] as Record<string, unknown>;
      expect(bgOpts["color"]).toBe("#ffffff");
    });

    it("trims whitespace from --ag-qr-bg value", () => {
      const el = containerWithCssVar("--ag-qr-bg", "  #ABCDEF  ");
      new StyledQR(el);
      const bgOpts = getConstructorOptions()["backgroundOptions"] as Record<string, unknown>;
      // After trim, value should be "#ABCDEF" (or the trimmed version)
      // The key point: if trim() is removed by Stryker, the value would
      // include leading/trailing whitespace, which would still be truthy
      // but different from the trimmed value.
      expect(typeof bgOpts["color"]).toBe("string");
      expect((bgOpts["color"] as string).trim()).toBe((bgOpts["color"] as string));
      el.remove();
    });

    it("falls back to #ffffff when --ag-qr-bg is whitespace-only", () => {
      const el = containerWithCssVar("--ag-qr-bg", "   ");
      new StyledQR(el);
      const bgOpts = getConstructorOptions()["backgroundOptions"] as Record<string, unknown>;
      // After trim, "   " becomes "", which is falsy, so fallback to #ffffff
      expect(bgOpts["color"]).toBe("#ffffff");
      el.remove();
    });

    it("uses CSS variable value over default when truthy", () => {
      const el = containerWithCssVar("--ag-qr-bg", "#333333");
      new StyledQR(el);
      const bgOpts = getConstructorOptions()["backgroundOptions"] as Record<string, unknown>;
      expect(bgOpts["color"]).toBe("#333333");
      expect(bgOpts["color"]).not.toBe("#ffffff");
      el.remove();
    });

    it("bgColour option takes precedence over CSS variable", () => {
      const el = containerWithCssVar("--ag-qr-bg", "#333333");
      new StyledQR(el, "", undefined, { bgColour: "#999999" });
      const bgOpts = getConstructorOptions()["backgroundOptions"] as Record<string, unknown>;
      expect(bgOpts["color"]).toBe("#999999");
      el.remove();
    });
  });

  /* ================================================================== */
  /*  parseQrFgToken , typeof getComputedStyle guard + trim + fallback  */
  /* ================================================================== */

  describe("parseQrFgToken edge cases", () => {
    it("uses gradient path when element is detached (fg token returns null)", () => {
      const detached = document.createElement("div");
      new StyledQR(detached);
      const dotsOpts = getConstructorOptions()["dotsOptions"] as Record<string, unknown>;
      expect(dotsOpts["gradient"]).toBeDefined();
      expect(dotsOpts["color"]).toBeUndefined();
    });

    it("trims whitespace from --ag-qr-fg value", () => {
      const el = containerWithCssVar("--ag-qr-fg", "  #AABB00  ");
      new StyledQR(el);
      const dotsOpts = getConstructorOptions()["dotsOptions"] as Record<string, unknown>;
      // If trim is removed, the value might still be truthy but include spaces
      const colourValue = dotsOpts["color"] as string;
      expect(colourValue).toBeDefined();
      expect(colourValue.trim()).toBe(colourValue);
      el.remove();
    });

    it("uses gradient when --ag-qr-fg is whitespace-only", () => {
      const el = containerWithCssVar("--ag-qr-fg", "   ");
      new StyledQR(el);
      const dotsOpts = getConstructorOptions()["dotsOptions"] as Record<string, unknown>;
      expect(dotsOpts["gradient"]).toBeDefined();
      expect(dotsOpts["color"]).toBeUndefined();
      el.remove();
    });

    it("flat fg colour propagates to cornersSquare when set via CSS var", () => {
      const el = containerWithCssVar("--ag-qr-fg", "#AABB00");
      new StyledQR(el);
      const csOpts = getConstructorOptions()["cornersSquareOptions"] as Record<string, unknown>;
      expect(csOpts["color"]).toBe("#AABB00");
      expect(csOpts["gradient"]).toBeUndefined();
      el.remove();
    });

    it("flat fg colour propagates to cornersDot when set via CSS var", () => {
      const el = containerWithCssVar("--ag-qr-fg", "#AABB00");
      new StyledQR(el);
      const cdOpts = getConstructorOptions()["cornersDotOptions"] as Record<string, unknown>;
      expect(cdOpts["color"]).toBe("#AABB00");
      el.remove();
    });

    it("fgColour option takes precedence over CSS variable", () => {
      const el = containerWithCssVar("--ag-qr-fg", "#AABB00");
      new StyledQR(el, "", undefined, { fgColour: "#FF0000" });
      const dotsOpts = getConstructorOptions()["dotsOptions"] as Record<string, unknown>;
      expect(dotsOpts["color"]).toBe("#FF0000");
      el.remove();
    });
  });

  /* ================================================================== */
  /*  parseAccentGradientToken , regex, length < 3, index access        */
  /* ================================================================== */

  describe("parseAccentGradientToken boundary conditions", () => {
    it("falls back to default when gradient has exactly 2 hex colours (< 3 boundary)", () => {
      const el = containerWithCssVar(
        "--ag-accent-gradient",
        "linear-gradient(135deg, #AA1111 0%, #BB2222 100%)",
      );
      new StyledQR(el);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      // Must be the default, not #AA1111/#BB2222
      expect(stops[0]!.color).toBe("#0091C7");
      expect(stops[1]!.color).toBe("#5B3DF5");
      expect(stops[2]!.color).toBe("#C23AD6");
      el.remove();
    });

    it("uses parsed gradient when exactly 3 hex colours present (boundary test)", () => {
      const el = containerWithCssVar(
        "--ag-accent-gradient",
        "linear-gradient(90deg, #111111 0%, #222222 50%, #333333 100%)",
      );
      new StyledQR(el);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[0]!.color).toBe("#111111");
      expect(stops[1]!.color).toBe("#222222");
      expect(stops[2]!.color).toBe("#333333");
      el.remove();
    });

    it("uses first three colours even when more than 3 are present", () => {
      const el = containerWithCssVar(
        "--ag-accent-gradient",
        "linear-gradient(90deg, #111111 0%, #222222 25%, #333333 50%, #444444 75%, #555555 100%)",
      );
      new StyledQR(el);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      // Should use matches[0], matches[1], matches[2] only
      expect(stops[0]!.color).toBe("#111111");
      expect(stops[1]!.color).toBe("#222222");
      expect(stops[2]!.color).toBe("#333333");
      el.remove();
    });

    it("falls back to default when regex matches null (no hex colours)", () => {
      const el = containerWithCssVar(
        "--ag-accent-gradient",
        "linear-gradient(90deg, red 0%, blue 50%, green 100%)",
      );
      new StyledQR(el);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[0]!.color).toBe("#0091C7");
      el.remove();
    });

    it("falls back to default when only 1 hex colour present", () => {
      const el = containerWithCssVar(
        "--ag-accent-gradient",
        "linear-gradient(90deg, #AA1111 0%, blue 50%, green 100%)",
      );
      new StyledQR(el);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[0]!.color).toBe("#0091C7");
      el.remove();
    });

    it("parsed gradient propagates to cornersSquare stops", () => {
      const el = containerWithCssVar(
        "--ag-accent-gradient",
        "linear-gradient(135deg, #AA1111 0%, #BB2222 50%, #CC3333 100%)",
      );
      new StyledQR(el);
      const csStops = ((getConstructorOptions()["cornersSquareOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      // cornersSquare uses gradientStart and gradientMid
      expect(csStops[0]!.color).toBe("#AA1111");
      expect(csStops[1]!.color).toBe("#BB2222");
      el.remove();
    });

    it("parsed gradient propagates to cornersDot colour (gradientEnd)", () => {
      const el = containerWithCssVar(
        "--ag-accent-gradient",
        "linear-gradient(135deg, #AA1111 0%, #BB2222 50%, #CC3333 100%)",
      );
      new StyledQR(el);
      const cdOpts = getConstructorOptions()["cornersDotOptions"] as Record<string, unknown>;
      expect(cdOpts["color"]).toBe("#CC3333");
      el.remove();
    });
  });

  /* ================================================================== */
  /*  MutationObserver callback , canvas && !hasAttribute("role")       */
  /* ================================================================== */

  describe("MutationObserver callback conditional logic", () => {
    let observerCallback: MutationCallback | null = null;
    let origObserver: typeof MutationObserver;

    beforeEach(() => {
      observerCallback = null;
      origObserver = globalThis.MutationObserver;
      globalThis.MutationObserver = class MockObserver {
        constructor(cb: MutationCallback) {
          observerCallback = cb;
        }
        observe() {}
        disconnect() {}
        takeRecords(): MutationRecord[] { return []; }
      } as unknown as typeof MutationObserver;
    });

    afterEach(() => {
      globalThis.MutationObserver = origObserver;
    });

    it("sets both role and aria-label when canvas has no role attribute", () => {
      new StyledQR(container);
      const canvas = document.createElement("canvas");
      container.appendChild(canvas);

      // canvas has no "role" attribute
      expect(canvas.hasAttribute("role")).toBe(false);
      observerCallback!([], {} as MutationObserver);

      expect(canvas.getAttribute("role")).toBe("img");
      expect(canvas.getAttribute("aria-label")).toBe("QR code for age verification");
    });

    it("does NOT overwrite role when canvas already has role attribute", () => {
      new StyledQR(container);
      const canvas = document.createElement("canvas");
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "custom label");
      container.appendChild(canvas);

      observerCallback!([], {} as MutationObserver);

      // The callback checks !canvas.hasAttribute("role"), so it should skip
      expect(canvas.getAttribute("aria-label")).toBe("custom label");
    });

    it("does NOT set attributes when canvas already has any role value", () => {
      new StyledQR(container);
      const canvas = document.createElement("canvas");
      canvas.setAttribute("role", "presentation");
      container.appendChild(canvas);

      observerCallback!([], {} as MutationObserver);

      // hasAttribute("role") returns true, so the !hasAttribute check is false
      expect(canvas.getAttribute("role")).toBe("presentation");
      expect(canvas.hasAttribute("aria-label")).toBe(false);
    });

    it("does nothing when container has no canvas element", () => {
      new StyledQR(container);
      // No canvas appended
      expect(() => observerCallback!([], {} as MutationObserver)).not.toThrow();
    });

    it("handles canvas being null (querySelector returns null)", () => {
      new StyledQR(container);
      // container is empty
      observerCallback!([], {} as MutationObserver);
      expect(container.querySelector("canvas")).toBeNull();
    });

    it("the && operator is not mutated to || (canvas falsy, no role set)", () => {
      // If && becomes ||, the callback would try to set attributes on a
      // null canvas (when no canvas exists) or skip when canvas exists.
      new StyledQR(container);
      // Case 1: no canvas at all, should not throw (if || mutant, would crash)
      expect(() => observerCallback!([], {} as MutationObserver)).not.toThrow();

      // Case 2: canvas without role, should set attributes
      const canvas = document.createElement("canvas");
      container.appendChild(canvas);
      observerCallback!([], {} as MutationObserver);
      expect(canvas.getAttribute("role")).toBe("img");
    });
  });

  /* ================================================================== */
  /*  update() , this.container null guard                              */
  /* ================================================================== */

  describe("update() container null guard", () => {
    it("applies ARIA attributes when container is not null", () => {
      mockQRConstructor.mockImplementation(() => makeAppendingMock());
      const qr = new StyledQR(container);
      const canvas = container.querySelector("canvas")!;
      canvas.removeAttribute("role");
      canvas.removeAttribute("aria-label");

      qr.update("updated-data");

      expect(canvas.getAttribute("role")).toBe("img");
      expect(canvas.getAttribute("aria-label")).toBe("QR code for age verification");
    });

    it("skips ARIA when container is null (destroy was called)", () => {
      mockQRConstructor.mockImplementation(() => makeAppendingMock());
      const qr = new StyledQR(container);

      // Simulate destroy setting container to null
      (qr as unknown as { container: HTMLElement | null }).container = null;

      // Should not throw, and should not try to querySelector on null
      expect(() => qr.update("data")).not.toThrow();
    });

    it("the if(this.container) guard is not removed by block-statement mutation", () => {
      mockQRConstructor.mockImplementation(() => makeAppendingMock());
      const qr = new StyledQR(container);
      const canvas = container.querySelector("canvas")!;
      canvas.removeAttribute("role");

      // If the entire if-block body is removed, role won't be re-applied
      qr.update("test");
      expect(canvas.getAttribute("role")).toBe("img");
    });

    it("update calls qr.update with data object regardless of container state", () => {
      const qr = new StyledQR(container);
      qr.update("payload");
      expect(mockInstance.update).toHaveBeenCalledWith({ data: "payload" });
    });

    it("update calls qr.update even after container nulled", () => {
      const qr = new StyledQR(container);
      (qr as unknown as { container: HTMLElement | null }).container = null;
      qr.update("payload");
      // qr.update should still be called (it's before the container guard)
      expect(mockInstance.update).toHaveBeenCalledWith({ data: "payload" });
    });
  });

  /* ================================================================== */
  /*  destroy() , innerHTML = "" string literal                         */
  /* ================================================================== */

  describe("destroy() innerHTML empty string", () => {
    it("sets container innerHTML to exactly empty string", () => {
      container.innerHTML = "<canvas></canvas><span>child</span>";
      const qr = new StyledQR(container);
      qr.destroy();
      expect(container.innerHTML).toBe("");
    });

    it("second destroy call does not throw (container already nulled internally)", () => {
      const qr = new StyledQR(container);
      qr.destroy();
      // After first destroy, this.container is still set (the code doesn't null it)
      // But observer is nulled. Second call should still clear innerHTML.
      expect(() => qr.destroy()).not.toThrow();
    });

    it("observer disconnect is called before container clear", () => {
      const disconnectSpy = jest.spyOn(MutationObserver.prototype, "disconnect");
      container.innerHTML = "<canvas></canvas>";
      const qr = new StyledQR(container);

      qr.destroy();

      expect(disconnectSpy).toHaveBeenCalled();
      expect(container.innerHTML).toBe("");
      disconnectSpy.mockRestore();
    });

    it("observer is set to null after disconnect (prevents double disconnect)", () => {
      const disconnectSpy = jest.spyOn(MutationObserver.prototype, "disconnect");
      const qr = new StyledQR(container);

      qr.destroy();
      const countAfterFirst = disconnectSpy.mock.calls.length;

      qr.destroy();
      // Should NOT call disconnect again
      expect(disconnectSpy.mock.calls.length).toBe(countAfterFirst);
      disconnectSpy.mockRestore();
    });
  });

  /* ================================================================== */
  /*  initialData default parameter = ""                                */
  /* ================================================================== */

  describe("initialData default parameter", () => {
    it("default data is empty string when no initialData argument", () => {
      new StyledQR(container);
      expect(getConstructorOptions()["data"]).toBe("");
    });

    it("default data is exactly empty string, not undefined", () => {
      new StyledQR(container);
      const data = getConstructorOptions()["data"];
      expect(data).toBeDefined();
      expect(data).not.toBeNull();
      expect(data).toBe("");
    });

    it("explicit initialData overrides the default", () => {
      new StyledQR(container, "explicit");
      expect(getConstructorOptions()["data"]).toBe("explicit");
    });

    it("explicit empty string is still empty string", () => {
      new StyledQR(container, "");
      expect(getConstructorOptions()["data"]).toBe("");
    });
  });

  /* ================================================================== */
  /*  Canvas ARIA after append (constructor, lines 285-289)             */
  /* ================================================================== */

  describe("canvas ARIA application after qr.append", () => {
    it("sets role='img' on canvas found after append", () => {
      mockQRConstructor.mockImplementation(() => makeAppendingMock());
      new StyledQR(container);
      const canvas = container.querySelector("canvas")!;
      expect(canvas.getAttribute("role")).toBe("img");
    });

    it("sets aria-label to exact string 'QR code for age verification'", () => {
      mockQRConstructor.mockImplementation(() => makeAppendingMock());
      new StyledQR(container);
      const canvas = container.querySelector("canvas")!;
      expect(canvas.getAttribute("aria-label")).toBe("QR code for age verification");
    });

    it("aria-label is not empty string", () => {
      mockQRConstructor.mockImplementation(() => makeAppendingMock());
      new StyledQR(container);
      const canvas = container.querySelector("canvas")!;
      expect(canvas.getAttribute("aria-label")).not.toBe("");
    });

    it("role is not empty string", () => {
      mockQRConstructor.mockImplementation(() => makeAppendingMock());
      new StyledQR(container);
      const canvas = container.querySelector("canvas")!;
      expect(canvas.getAttribute("role")).not.toBe("");
    });

    it("does not throw when append does not create a canvas", () => {
      // Default mock: append does nothing, no canvas in container
      new StyledQR(container);
      expect(container.querySelector("canvas")).toBeNull();
    });
  });

  /* ================================================================== */
  /*  fgColour: dotsOptions structure when flat colour is used           */
  /* ================================================================== */

  describe("fgColour dotsOptions structure (no gradient key)", () => {
    it("dotsOptions has only type and color when fgColour set, no gradient key at all", () => {
      new StyledQR(container, "", undefined, { fgColour: "#FF0000" });
      const dotsOpts = getConstructorOptions()["dotsOptions"] as Record<string, unknown>;
      expect(Object.keys(dotsOpts)).toContain("type");
      expect(Object.keys(dotsOpts)).toContain("color");
      expect(Object.keys(dotsOpts)).not.toContain("gradient");
    });

    it("cornersSquare has only type and color when fgColour set", () => {
      new StyledQR(container, "", undefined, { fgColour: "#FF0000" });
      const csOpts = getConstructorOptions()["cornersSquareOptions"] as Record<string, unknown>;
      expect(csOpts["type"]).toBe("extra-rounded");
      expect(csOpts["color"]).toBe("#FF0000");
      expect(csOpts["gradient"]).toBeUndefined();
    });

    it("cornersDot uses fgColour directly when set", () => {
      new StyledQR(container, "", undefined, { fgColour: "#FF0000" });
      const cdOpts = getConstructorOptions()["cornersDotOptions"] as Record<string, unknown>;
      expect(cdOpts["color"]).toBe("#FF0000");
      expect(cdOpts["type"]).toBe("square");
    });

    it("dot type preserved as default 'dots' when fgColour overrides gradient", () => {
      new StyledQR(container, "", undefined, { fgColour: "#123456" });
      const dotsOpts = getConstructorOptions()["dotsOptions"] as Record<string, unknown>;
      expect(dotsOpts["type"]).toBe("dots");
    });

    it("eye frame type preserved as default 'extra-rounded' when fgColour overrides gradient", () => {
      new StyledQR(container, "", undefined, { fgColour: "#123456" });
      const csOpts = getConstructorOptions()["cornersSquareOptions"] as Record<string, unknown>;
      expect(csOpts["type"]).toBe("extra-rounded");
    });

    it("eye dot type preserved as default 'square' when fgColour overrides gradient", () => {
      new StyledQR(container, "", undefined, { fgColour: "#123456" });
      const cdOpts = getConstructorOptions()["cornersDotOptions"] as Record<string, unknown>;
      expect(cdOpts["type"]).toBe("square");
    });
  });

  /* ================================================================== */
  /*  logoUrl imageOptions , pin every property value                   */
  /* ================================================================== */

  describe("logoUrl imageOptions property pinning", () => {
    it("hideBackgroundDots is exactly true, not false", () => {
      new StyledQR(container, "", undefined, { logoUrl: "https://example.com/logo.png" });
      const imgOpts = getConstructorOptions()["imageOptions"] as Record<string, unknown>;
      expect(imgOpts["hideBackgroundDots"]).toBe(true);
      expect(imgOpts["hideBackgroundDots"]).not.toBe(false);
    });

    it("imageSize is 0.3 not 0 or 1", () => {
      new StyledQR(container, "", undefined, { logoUrl: "https://example.com/logo.png" });
      const imgOpts = getConstructorOptions()["imageOptions"] as Record<string, unknown>;
      expect(imgOpts["imageSize"]).toBe(0.3);
      expect(imgOpts["imageSize"]).not.toBe(0);
      expect(imgOpts["imageSize"]).not.toBe(1);
    });

    it("margin is 4 not 0", () => {
      new StyledQR(container, "", undefined, { logoUrl: "https://example.com/logo.png" });
      const imgOpts = getConstructorOptions()["imageOptions"] as Record<string, unknown>;
      expect(imgOpts["margin"]).toBe(4);
      expect(imgOpts["margin"]).not.toBe(0);
    });

    it("crossOrigin is 'anonymous' not empty string", () => {
      new StyledQR(container, "", undefined, { logoUrl: "https://example.com/logo.png" });
      const imgOpts = getConstructorOptions()["imageOptions"] as Record<string, unknown>;
      expect(imgOpts["crossOrigin"]).toBe("anonymous");
      expect(imgOpts["crossOrigin"]).not.toBe("");
    });

    it("error correction is H (not Q) when logo is present", () => {
      new StyledQR(container, "", undefined, { logoUrl: "https://example.com/logo.png" });
      const qrOpts = getConstructorOptions()["qrOptions"] as Record<string, unknown>;
      expect(qrOpts["errorCorrectionLevel"]).toBe("H");
      expect(qrOpts["errorCorrectionLevel"]).not.toBe("Q");
    });

    it("image property matches logoUrl exactly", () => {
      const logoUrl = "https://cdn.example.com/brand/logo-2x.png";
      new StyledQR(container, "", undefined, { logoUrl });
      expect(getConstructorOptions()["image"]).toBe(logoUrl);
    });
  });

  /* ================================================================== */
  /*  logoUrl absent , no image/imageOptions properties                 */
  /* ================================================================== */

  describe("logoUrl absent , no image properties", () => {
    it("image property is not present when no logoUrl", () => {
      new StyledQR(container);
      expect(getConstructorOptions()["image"]).toBeUndefined();
    });

    it("imageOptions property is not present when no logoUrl", () => {
      new StyledQR(container);
      expect(getConstructorOptions()["imageOptions"]).toBeUndefined();
    });

    it("error correction stays at Q when no logoUrl", () => {
      new StyledQR(container);
      const qrOpts = getConstructorOptions()["qrOptions"] as Record<string, unknown>;
      expect(qrOpts["errorCorrectionLevel"]).toBe("Q");
    });

    it("error correction is Q when qrStyleOptions is provided but without logoUrl", () => {
      new StyledQR(container, "", undefined, { dotStyle: "rounded" });
      const qrOpts = getConstructorOptions()["qrOptions"] as Record<string, unknown>;
      expect(qrOpts["errorCorrectionLevel"]).toBe("Q");
    });
  });

  /* ================================================================== */
  /*  HEX_TRIPLE_RE , regex pattern pinning                            */
  /* ================================================================== */

  describe("HEX_TRIPLE_RE regex pinning", () => {
    it("matches 6-digit hex colours", () => {
      const el = containerWithCssVar(
        "--ag-accent-gradient",
        "linear-gradient(to right, #AABBCC 0%, #DDEEFF 50%, #112233 100%)",
      );
      new StyledQR(el);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[0]!.color).toBe("#AABBCC");
      expect(stops[1]!.color).toBe("#DDEEFF");
      expect(stops[2]!.color).toBe("#112233");
      el.remove();
    });

    it("matches 3-digit hex colours", () => {
      const el = containerWithCssVar(
        "--ag-accent-gradient",
        "linear-gradient(to right, #ABC 0%, #DEF 50%, #123 100%)",
      );
      new StyledQR(el);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[0]!.color).toBe("#ABC");
      expect(stops[1]!.color).toBe("#DEF");
      expect(stops[2]!.color).toBe("#123");
      el.remove();
    });

    it("does not match non-hex strings", () => {
      const el = containerWithCssVar(
        "--ag-accent-gradient",
        "linear-gradient(to right, red 0%, blue 50%, green 100%)",
      );
      new StyledQR(el);
      // Falls back to defaults because regex finds no hex matches
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[0]!.color).toBe("#0091C7");
      el.remove();
    });
  });

  /* ================================================================== */
  /*  Combination: multiple QrStyleOptions at once                      */
  /* ================================================================== */

  describe("combined QrStyleOptions", () => {
    it("all style overrides apply simultaneously", () => {
      new StyledQR(container, "combo-test", undefined, {
        dotStyle: "rounded",
        eyeFrameStyle: "dot",
        eyeDotStyle: "dot",
        fgColour: "#ABCDEF",
        bgColour: "#000000",
      });
      const opts = getConstructorOptions();
      const dotsOpts = opts["dotsOptions"] as Record<string, unknown>;
      const csOpts = opts["cornersSquareOptions"] as Record<string, unknown>;
      const cdOpts = opts["cornersDotOptions"] as Record<string, unknown>;
      const bgOpts = opts["backgroundOptions"] as Record<string, unknown>;

      expect(dotsOpts["type"]).toBe("rounded");
      expect(dotsOpts["color"]).toBe("#ABCDEF");
      expect(csOpts["type"]).toBe("dot");
      expect(csOpts["color"]).toBe("#ABCDEF");
      expect(cdOpts["type"]).toBe("dot");
      expect(cdOpts["color"]).toBe("#ABCDEF");
      expect(bgOpts["color"]).toBe("#000000");
    });

    it("style overrides with logo together", () => {
      new StyledQR(container, "logo-test", undefined, {
        dotStyle: "classy",
        logoUrl: "https://example.com/logo.png",
        fgColour: "#112233",
      });
      const opts = getConstructorOptions();
      expect((opts["dotsOptions"] as Record<string, unknown>)["type"]).toBe("classy");
      expect((opts["dotsOptions"] as Record<string, unknown>)["color"]).toBe("#112233");
      expect(opts["image"]).toBe("https://example.com/logo.png");
      expect((opts["qrOptions"] as Record<string, unknown>)["errorCorrectionLevel"]).toBe("H");
    });
  });

  /* ================================================================== */
  /*  Edge: update ARIA string values , pin exact strings               */
  /* ================================================================== */

  describe("update() ARIA string pinning", () => {
    it("update sets role to 'img' not empty string", () => {
      mockQRConstructor.mockImplementation(() => makeAppendingMock());
      const qr = new StyledQR(container);
      const canvas = container.querySelector("canvas")!;
      canvas.removeAttribute("role");
      canvas.removeAttribute("aria-label");

      qr.update("new-data");

      expect(canvas.getAttribute("role")).toBe("img");
      expect(canvas.getAttribute("role")).not.toBe("");
    });

    it("update sets aria-label to exact verification string", () => {
      mockQRConstructor.mockImplementation(() => makeAppendingMock());
      const qr = new StyledQR(container);
      const canvas = container.querySelector("canvas")!;
      canvas.removeAttribute("role");
      canvas.removeAttribute("aria-label");

      qr.update("new-data");

      expect(canvas.getAttribute("aria-label")).toBe("QR code for age verification");
      expect(canvas.getAttribute("aria-label")).not.toBe("");
    });
  });

  /* ================================================================== */
  /*  Pinning: getComputedStyle typeof check string "function"          */
  /* ================================================================== */

  describe("typeof getComputedStyle guard", () => {
    it("bg token uses CSS var from element when getComputedStyle resolves it", () => {
      // jsdom resolves inline custom properties even on detached elements.
      // This test confirms the bg token parser does read the value.
      const detached = document.createElement("div");
      detached.style.setProperty("--ag-qr-bg", "#FF0000");
      new StyledQR(detached);
      const bgOpts = getConstructorOptions()["backgroundOptions"] as Record<string, unknown>;
      expect(bgOpts["color"]).toBe("#FF0000");
    });

    it("bg token falls back to #ffffff when no CSS var is set on a plain element", () => {
      const plain = document.createElement("div");
      new StyledQR(plain);
      const bgOpts = getConstructorOptions()["backgroundOptions"] as Record<string, unknown>;
      expect(bgOpts["color"]).toBe("#ffffff");
    });

    it("fg token uses CSS var from element when getComputedStyle resolves it", () => {
      const detached = document.createElement("div");
      detached.style.setProperty("--ag-qr-fg", "#FF0000");
      new StyledQR(detached);
      const dotsOpts = getConstructorOptions()["dotsOptions"] as Record<string, unknown>;
      // Should use flat colour, not gradient
      expect(dotsOpts["color"]).toBe("#FF0000");
      expect(dotsOpts["gradient"]).toBeUndefined();
    });

    it("fg token falls back to gradient when no CSS var is set", () => {
      const plain = document.createElement("div");
      new StyledQR(plain);
      const dotsOpts = getConstructorOptions()["dotsOptions"] as Record<string, unknown>;
      expect(dotsOpts["gradient"]).toBeDefined();
      expect(dotsOpts["color"]).toBeUndefined();
    });

    it("accent gradient uses CSS var when getComputedStyle resolves it", () => {
      const detached = document.createElement("div");
      detached.style.setProperty(
        "--ag-accent-gradient",
        "linear-gradient(90deg, #AA0000 0%, #BB0000 50%, #CC0000 100%)",
      );
      new StyledQR(detached);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[0]!.color).toBe("#AA0000");
      expect(stops[1]!.color).toBe("#BB0000");
      expect(stops[2]!.color).toBe("#CC0000");
    });

    it("accent gradient falls back to default when no CSS var is set", () => {
      const plain = document.createElement("div");
      new StyledQR(plain);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[0]!.color).toBe("#0091C7");
    });
  });

  /* ================================================================== */
  /*  Pinning: MutationObserver.observe config values                   */
  /* ================================================================== */

  describe("MutationObserver.observe config object", () => {
    it("childList is true not false", () => {
      const observeSpy = jest.spyOn(MutationObserver.prototype, "observe");
      new StyledQR(container);
      const config = observeSpy.mock.calls[0]![1] as MutationObserverInit;
      expect(config.childList).toBe(true);
      expect(config.childList).not.toBe(false);
      observeSpy.mockRestore();
    });

    it("subtree is true not false", () => {
      const observeSpy = jest.spyOn(MutationObserver.prototype, "observe");
      new StyledQR(container);
      const config = observeSpy.mock.calls[0]![1] as MutationObserverInit;
      expect(config.subtree).toBe(true);
      expect(config.subtree).not.toBe(false);
      observeSpy.mockRestore();
    });

    it("observe is called on the container element specifically", () => {
      const observeSpy = jest.spyOn(MutationObserver.prototype, "observe");
      new StyledQR(container);
      expect(observeSpy.mock.calls[0]![0]).toBe(container);
      observeSpy.mockRestore();
    });
  });
});
