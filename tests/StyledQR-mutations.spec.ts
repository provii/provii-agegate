/** @jest-environment jsdom */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT

/**
 * Mutation-testing-focused tests for StyledQR.ts
 *
 * Pins every string literal, constant, conditional, comparison, and default
 * value so Stryker mutants are caught. Avoids duplicating the existing
 * StyledQR.full.spec.ts tests.
 */

import { StyledQR } from "../src/ui/StyledQR.js";

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

function containerWithCssVar(
  varName: string,
  value: string,
): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  el.style.setProperty(varName, value);
  return el;
}

/* ---------- test suite ---------- */

describe("StyledQR mutation tests", () => {
  let container: HTMLElement;
  let mockInstance: ReturnType<typeof makeMockQRInstance>;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement("div");
    mockInstance = makeMockQRInstance();
    mockQRConstructor.mockImplementation(() => mockInstance);
  });

  afterEach(() => {
    // Clean up any elements appended to document.body
    document.body.innerHTML = "";
  });

  /* ------------------------------------------------------------------ */
  /*  DEFAULT_ACCENT_GRADIENT_STOPS , pin each hex exactly               */
  /* ------------------------------------------------------------------ */

  describe("default accent gradient stops", () => {
    it("first stop is exactly #0091C7", () => {
      new StyledQR(container);
      const opts = getConstructorOptions();
      const stops = (opts["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>;
      const colorStops = stops["colorStops"] as Array<{ offset: number; color: string }>;
      expect(colorStops[0]!.color).toBe("#0091C7");
    });

    it("second stop is exactly #5B3DF5", () => {
      new StyledQR(container);
      const opts = getConstructorOptions();
      const stops = (opts["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>;
      const colorStops = stops["colorStops"] as Array<{ offset: number; color: string }>;
      expect(colorStops[1]!.color).toBe("#5B3DF5");
    });

    it("third stop is exactly #C23AD6", () => {
      new StyledQR(container);
      const opts = getConstructorOptions();
      const stops = (opts["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>;
      const colorStops = stops["colorStops"] as Array<{ offset: number; color: string }>;
      expect(colorStops[2]!.color).toBe("#C23AD6");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Gradient offset values                                             */
  /* ------------------------------------------------------------------ */

  describe("dot gradient offsets", () => {
    it("first colour stop offset is 0", () => {
      new StyledQR(container);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ offset: number }>;
      expect(stops[0]!.offset).toBe(0);
    });

    it("middle colour stop offset is 0.5", () => {
      new StyledQR(container);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ offset: number }>;
      expect(stops[1]!.offset).toBe(0.5);
    });

    it("last colour stop offset is 1", () => {
      new StyledQR(container);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ offset: number }>;
      expect(stops[2]!.offset).toBe(1);
    });

    it("dot gradient has exactly three colour stops", () => {
      new StyledQR(container);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<unknown>;
      expect(stops).toHaveLength(3);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Dots gradient type and rotation                                    */
  /* ------------------------------------------------------------------ */

  describe("dot gradient structural values", () => {
    it("dots gradient type is 'linear'", () => {
      new StyledQR(container);
      const gradient = (getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>;
      expect(gradient["type"]).toBe("linear");
    });

    it("dots gradient rotation is 0", () => {
      new StyledQR(container);
      const gradient = (getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>;
      expect(gradient["rotation"]).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Corner square (eye frame) gradient                                 */
  /* ------------------------------------------------------------------ */

  describe("corners square gradient", () => {
    it("gradient type is linear", () => {
      new StyledQR(container);
      const gradient = (getConstructorOptions()["cornersSquareOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>;
      expect(gradient["type"]).toBe("linear");
    });

    it("gradient rotation is 180", () => {
      new StyledQR(container);
      const gradient = (getConstructorOptions()["cornersSquareOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>;
      expect(gradient["rotation"]).toBe(180);
    });

    it("first colour stop offset is 0", () => {
      new StyledQR(container);
      const stops = ((getConstructorOptions()["cornersSquareOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ offset: number }>;
      expect(stops[0]!.offset).toBe(0);
    });

    it("second colour stop offset is 1", () => {
      new StyledQR(container);
      const stops = ((getConstructorOptions()["cornersSquareOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ offset: number }>;
      expect(stops[1]!.offset).toBe(1);
    });

    it("first colour stop is gradientStart (#0091C7)", () => {
      new StyledQR(container);
      const stops = ((getConstructorOptions()["cornersSquareOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[0]!.color).toBe("#0091C7");
    });

    it("second colour stop is gradientMid (#5B3DF5)", () => {
      new StyledQR(container);
      const stops = ((getConstructorOptions()["cornersSquareOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[1]!.color).toBe("#5B3DF5");
    });

    it("has exactly two colour stops", () => {
      new StyledQR(container);
      const stops = ((getConstructorOptions()["cornersSquareOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<unknown>;
      expect(stops).toHaveLength(2);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Corner dot colour (gradientEnd)                                    */
  /* ------------------------------------------------------------------ */

  describe("corner dot default", () => {
    it("corner dot type defaults to 'square'", () => {
      new StyledQR(container);
      expect((getConstructorOptions()["cornersDotOptions"] as Record<string, unknown>)["type"]).toBe("square");
    });

    it("corner dot colour is gradientEnd (#C23AD6)", () => {
      new StyledQR(container);
      expect((getConstructorOptions()["cornersDotOptions"] as Record<string, unknown>)["color"]).toBe("#C23AD6");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Default style values (dotStyle, eyeFrameStyle, eyeDotStyle)        */
  /* ------------------------------------------------------------------ */

  describe("default QR style option values", () => {
    it("dot type defaults to 'dots'", () => {
      new StyledQR(container);
      expect((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["type"]).toBe("dots");
    });

    it("eye frame type defaults to 'extra-rounded'", () => {
      new StyledQR(container);
      expect((getConstructorOptions()["cornersSquareOptions"] as Record<string, unknown>)["type"]).toBe("extra-rounded");
    });

    it("eye dot type defaults to 'square'", () => {
      new StyledQR(container);
      expect((getConstructorOptions()["cornersDotOptions"] as Record<string, unknown>)["type"]).toBe("square");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  QrStyleOptions overrides                                           */
  /* ------------------------------------------------------------------ */

  describe("QrStyleOptions overrides", () => {
    it("dotStyle override propagates to dotsOptions.type", () => {
      new StyledQR(container, "", undefined, { dotStyle: "rounded" });
      expect((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["type"]).toBe("rounded");
    });

    it("eyeFrameStyle override propagates to cornersSquareOptions.type", () => {
      new StyledQR(container, "", undefined, { eyeFrameStyle: "dot" });
      expect((getConstructorOptions()["cornersSquareOptions"] as Record<string, unknown>)["type"]).toBe("dot");
    });

    it("eyeDotStyle override propagates to cornersDotOptions.type", () => {
      new StyledQR(container, "", undefined, { eyeDotStyle: "dot" });
      expect((getConstructorOptions()["cornersDotOptions"] as Record<string, unknown>)["type"]).toBe("dot");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  fgColour: flat foreground overrides gradient                       */
  /* ------------------------------------------------------------------ */

  describe("fgColour overrides gradient", () => {
    it("dotsOptions uses flat colour instead of gradient", () => {
      new StyledQR(container, "", undefined, { fgColour: "#FF0000" });
      const dotsOpts = getConstructorOptions()["dotsOptions"] as Record<string, unknown>;
      expect(dotsOpts["color"]).toBe("#FF0000");
      expect(dotsOpts["gradient"]).toBeUndefined();
    });

    it("cornersSquareOptions uses flat colour instead of gradient", () => {
      new StyledQR(container, "", undefined, { fgColour: "#00FF00" });
      const csOpts = getConstructorOptions()["cornersSquareOptions"] as Record<string, unknown>;
      expect(csOpts["color"]).toBe("#00FF00");
      expect(csOpts["gradient"]).toBeUndefined();
    });

    it("cornersDotOptions uses fgColour when supplied", () => {
      new StyledQR(container, "", undefined, { fgColour: "#0000FF" });
      const cdOpts = getConstructorOptions()["cornersDotOptions"] as Record<string, unknown>;
      expect(cdOpts["color"]).toBe("#0000FF");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  bgColour override                                                  */
  /* ------------------------------------------------------------------ */

  describe("bgColour override", () => {
    it("overrides the default #ffffff background", () => {
      new StyledQR(container, "", undefined, { bgColour: "#000000" });
      const bgOpts = getConstructorOptions()["backgroundOptions"] as Record<string, unknown>;
      expect(bgOpts["color"]).toBe("#000000");
    });

    it("default background is white (#ffffff)", () => {
      new StyledQR(container, "");
      const bgOpts = getConstructorOptions()["backgroundOptions"] as Record<string, unknown>;
      expect(bgOpts["color"]).toBe("#ffffff");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  accentGradient override (second constructor arg)                   */
  /* ------------------------------------------------------------------ */

  describe("accentGradient override", () => {
    it("uses supplied gradient for dotsOptions colour stops", () => {
      new StyledQR(container, "", ["#AA0000", "#BB0000", "#CC0000"]);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[0]!.color).toBe("#AA0000");
      expect(stops[1]!.color).toBe("#BB0000");
      expect(stops[2]!.color).toBe("#CC0000");
    });

    it("uses supplied gradient for cornersSquare colour stops", () => {
      new StyledQR(container, "", ["#AA0000", "#BB0000", "#CC0000"]);
      const stops = ((getConstructorOptions()["cornersSquareOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[0]!.color).toBe("#AA0000");
      expect(stops[1]!.color).toBe("#BB0000");
    });

    it("uses supplied gradient third colour for cornersDot", () => {
      new StyledQR(container, "", ["#AA0000", "#BB0000", "#CC0000"]);
      const cdOpts = getConstructorOptions()["cornersDotOptions"] as Record<string, unknown>;
      expect(cdOpts["color"]).toBe("#CC0000");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  logoUrl + error correction bump                                    */
  /* ------------------------------------------------------------------ */

  describe("logoUrl and error correction", () => {
    it("sets error correction to H when logoUrl is provided", () => {
      new StyledQR(container, "", undefined, { logoUrl: "https://example.com/logo.png" });
      const qrOpts = getConstructorOptions()["qrOptions"] as Record<string, unknown>;
      expect(qrOpts["errorCorrectionLevel"]).toBe("H");
    });

    it("sets error correction to Q when logoUrl is absent", () => {
      new StyledQR(container, "");
      const qrOpts = getConstructorOptions()["qrOptions"] as Record<string, unknown>;
      expect(qrOpts["errorCorrectionLevel"]).toBe("Q");
    });

    it("sets image property when logoUrl provided", () => {
      new StyledQR(container, "", undefined, { logoUrl: "https://example.com/logo.png" });
      expect(getConstructorOptions()["image"]).toBe("https://example.com/logo.png");
    });

    it("does not set image property when logoUrl is absent", () => {
      new StyledQR(container, "");
      expect(getConstructorOptions()["image"]).toBeUndefined();
    });

    it("does not set imageOptions when logoUrl is absent", () => {
      new StyledQR(container, "");
      expect(getConstructorOptions()["imageOptions"]).toBeUndefined();
    });

    it("sets imageOptions.hideBackgroundDots to true", () => {
      new StyledQR(container, "", undefined, { logoUrl: "https://example.com/logo.png" });
      const imgOpts = getConstructorOptions()["imageOptions"] as Record<string, unknown>;
      expect(imgOpts["hideBackgroundDots"]).toBe(true);
    });

    it("sets imageOptions.imageSize to 0.3", () => {
      new StyledQR(container, "", undefined, { logoUrl: "https://example.com/logo.png" });
      const imgOpts = getConstructorOptions()["imageOptions"] as Record<string, unknown>;
      expect(imgOpts["imageSize"]).toBe(0.3);
    });

    it("sets imageOptions.margin to 4", () => {
      new StyledQR(container, "", undefined, { logoUrl: "https://example.com/logo.png" });
      const imgOpts = getConstructorOptions()["imageOptions"] as Record<string, unknown>;
      expect(imgOpts["margin"]).toBe(4);
    });

    it("sets imageOptions.crossOrigin to 'anonymous'", () => {
      new StyledQR(container, "", undefined, { logoUrl: "https://example.com/logo.png" });
      const imgOpts = getConstructorOptions()["imageOptions"] as Record<string, unknown>;
      expect(imgOpts["crossOrigin"]).toBe("anonymous");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  QR dimension and type constants                                    */
  /* ------------------------------------------------------------------ */

  describe("dimension and type constants", () => {
    it("width is exactly 200", () => {
      new StyledQR(container);
      expect(getConstructorOptions()["width"]).toBe(200);
    });

    it("height is exactly 200", () => {
      new StyledQR(container);
      expect(getConstructorOptions()["height"]).toBe(200);
    });

    it("type is 'canvas'", () => {
      new StyledQR(container);
      expect(getConstructorOptions()["type"]).toBe("canvas");
    });

    it("qrOptions.typeNumber is 0", () => {
      new StyledQR(container);
      expect((getConstructorOptions()["qrOptions"] as Record<string, unknown>)["typeNumber"]).toBe(0);
    });

    it("qrOptions.mode is 'Byte'", () => {
      new StyledQR(container);
      expect((getConstructorOptions()["qrOptions"] as Record<string, unknown>)["mode"]).toBe("Byte");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  ARIA attributes on canvas                                          */
  /* ------------------------------------------------------------------ */

  describe("ARIA attributes on canvas", () => {
    it("sets role='img' on canvas after construction", () => {
      // Simulate qr-code-styling appending a canvas
      mockQRConstructor.mockImplementation(() => {
        const inst = makeMockQRInstance();
        inst.append.mockImplementation((el: HTMLElement) => {
          const canvas = document.createElement("canvas");
          el.appendChild(canvas);
        });
        return inst;
      });
      new StyledQR(container);
      const canvas = container.querySelector("canvas");
      expect(canvas).not.toBeNull();
      expect(canvas!.getAttribute("role")).toBe("img");
    });

    it("sets aria-label to exact expected string", () => {
      mockQRConstructor.mockImplementation(() => {
        const inst = makeMockQRInstance();
        inst.append.mockImplementation((el: HTMLElement) => {
          const canvas = document.createElement("canvas");
          el.appendChild(canvas);
        });
        return inst;
      });
      new StyledQR(container);
      const canvas = container.querySelector("canvas");
      expect(canvas!.getAttribute("aria-label")).toBe("QR code for age verification");
    });

    it("update re-applies role='img' to canvas", () => {
      mockQRConstructor.mockImplementation(() => {
        const inst = makeMockQRInstance();
        inst.append.mockImplementation((el: HTMLElement) => {
          const canvas = document.createElement("canvas");
          el.appendChild(canvas);
        });
        inst.update.mockImplementation(() => {
          // Library might replace canvas
        });
        return inst;
      });
      const qr = new StyledQR(container);
      const canvas = container.querySelector("canvas")!;
      // Remove attributes to simulate library re-render
      canvas.removeAttribute("role");
      canvas.removeAttribute("aria-label");
      qr.update("new-data");
      expect(canvas.getAttribute("role")).toBe("img");
      expect(canvas.getAttribute("aria-label")).toBe("QR code for age verification");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  MutationObserver setup                                             */
  /* ------------------------------------------------------------------ */

  describe("MutationObserver", () => {
    it("observes the container with childList: true", () => {
      const observeSpy = jest.spyOn(MutationObserver.prototype, "observe");
      new StyledQR(container);
      expect(observeSpy).toHaveBeenCalledWith(container, { childList: true, subtree: true });
      observeSpy.mockRestore();
    });

    it("observes the container with subtree: true", () => {
      const observeSpy = jest.spyOn(MutationObserver.prototype, "observe");
      new StyledQR(container);
      const callArgs = observeSpy.mock.calls[0]![1] as MutationObserverInit;
      expect(callArgs.subtree).toBe(true);
      observeSpy.mockRestore();
    });

    it("MutationObserver callback sets role on new canvas without role", () => {
      // We need to test the observer callback directly
      let observerCallback: MutationCallback | null = null;
      const origObserver = globalThis.MutationObserver;
      globalThis.MutationObserver = class MockObserver {
        constructor(cb: MutationCallback) {
          observerCallback = cb;
        }
        observe() {}
        disconnect() {}
        takeRecords(): MutationRecord[] { return []; }
      } as unknown as typeof MutationObserver;

      new StyledQR(container);

      // Simulate the library appending a canvas without ARIA attrs
      const canvas = document.createElement("canvas");
      container.appendChild(canvas);
      expect(canvas.hasAttribute("role")).toBe(false);

      // Fire the observer callback
      observerCallback!([], {} as MutationObserver);
      expect(canvas.getAttribute("role")).toBe("img");
      expect(canvas.getAttribute("aria-label")).toBe("QR code for age verification");

      globalThis.MutationObserver = origObserver;
    });

    it("MutationObserver callback does not set role when canvas already has it", () => {
      let observerCallback: MutationCallback | null = null;
      const origObserver = globalThis.MutationObserver;
      globalThis.MutationObserver = class MockObserver {
        constructor(cb: MutationCallback) {
          observerCallback = cb;
        }
        observe() {}
        disconnect() {}
        takeRecords(): MutationRecord[] { return []; }
      } as unknown as typeof MutationObserver;

      new StyledQR(container);

      const canvas = document.createElement("canvas");
      canvas.setAttribute("role", "presentation");
      container.appendChild(canvas);

      observerCallback!([], {} as MutationObserver);
      // Should NOT overwrite existing role
      expect(canvas.getAttribute("role")).toBe("presentation");

      globalThis.MutationObserver = origObserver;
    });

    it("MutationObserver callback does nothing when no canvas present", () => {
      let observerCallback: MutationCallback | null = null;
      const origObserver = globalThis.MutationObserver;
      globalThis.MutationObserver = class MockObserver {
        constructor(cb: MutationCallback) {
          observerCallback = cb;
        }
        observe() {}
        disconnect() {}
        takeRecords(): MutationRecord[] { return []; }
      } as unknown as typeof MutationObserver;

      new StyledQR(container);
      // No canvas in container, should not throw
      expect(() => observerCallback!([], {} as MutationObserver)).not.toThrow();

      globalThis.MutationObserver = origObserver;
    });
  });

  /* ------------------------------------------------------------------ */
  /*  destroy                                                            */
  /* ------------------------------------------------------------------ */

  describe("destroy disconnects observer", () => {
    it("calls observer.disconnect()", () => {
      const disconnectSpy = jest.spyOn(MutationObserver.prototype, "disconnect");
      const qr = new StyledQR(container);
      qr.destroy();
      expect(disconnectSpy).toHaveBeenCalled();
      disconnectSpy.mockRestore();
    });

    it("sets observer to null (second destroy skips disconnect)", () => {
      const disconnectSpy = jest.spyOn(MutationObserver.prototype, "disconnect");
      const qr = new StyledQR(container);
      qr.destroy();
      const callCountAfterFirst = disconnectSpy.mock.calls.length;
      qr.destroy();
      // disconnect should NOT be called again
      expect(disconnectSpy.mock.calls.length).toBe(callCountAfterFirst);
      disconnectSpy.mockRestore();
    });

    it("clears container innerHTML", () => {
      container.innerHTML = "<canvas></canvas><div></div>";
      const qr = new StyledQR(container);
      qr.destroy();
      expect(container.innerHTML).toBe("");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  update method                                                      */
  /* ------------------------------------------------------------------ */

  describe("update passes exact data", () => {
    it("passes the data string wrapped in an object", () => {
      const qr = new StyledQR(container);
      qr.update("https://example.com/verify?token=abc123");
      expect(mockInstance.update).toHaveBeenCalledWith({ data: "https://example.com/verify?token=abc123" });
    });

    it("update with empty string passes empty string not undefined", () => {
      const qr = new StyledQR(container);
      qr.update("");
      const callArg = mockInstance.update.mock.calls[0][0];
      expect(callArg).toHaveProperty("data");
      expect(callArg.data).toBe("");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  CSS variable parsing (parseQrBgToken / parseQrFgToken)             */
  /* ------------------------------------------------------------------ */

  describe("CSS variable parsing for --ag-qr-bg", () => {
    it("reads --ag-qr-bg from container when no bgColour override", () => {
      const el = containerWithCssVar("--ag-qr-bg", "#123456");
      new StyledQR(el);
      const bgOpts = getConstructorOptions()["backgroundOptions"] as Record<string, unknown>;
      expect(bgOpts["color"]).toBe("#123456");
      el.remove();
    });

    it("bgColour override takes precedence over --ag-qr-bg", () => {
      const el = containerWithCssVar("--ag-qr-bg", "#123456");
      new StyledQR(el, "", undefined, { bgColour: "#AABBCC" });
      const bgOpts = getConstructorOptions()["backgroundOptions"] as Record<string, unknown>;
      expect(bgOpts["color"]).toBe("#AABBCC");
      el.remove();
    });

    it("falls back to #ffffff when --ag-qr-bg is empty", () => {
      const el = containerWithCssVar("--ag-qr-bg", "");
      new StyledQR(el);
      const bgOpts = getConstructorOptions()["backgroundOptions"] as Record<string, unknown>;
      expect(bgOpts["color"]).toBe("#ffffff");
      el.remove();
    });
  });

  describe("CSS variable parsing for --ag-qr-fg", () => {
    it("uses --ag-qr-fg for flat colour when no fgColour override", () => {
      const el = containerWithCssVar("--ag-qr-fg", "#AABB00");
      new StyledQR(el);
      const dotsOpts = getConstructorOptions()["dotsOptions"] as Record<string, unknown>;
      expect(dotsOpts["color"]).toBe("#AABB00");
      expect(dotsOpts["gradient"]).toBeUndefined();
      el.remove();
    });

    it("fgColour override takes precedence over --ag-qr-fg", () => {
      const el = containerWithCssVar("--ag-qr-fg", "#AABB00");
      new StyledQR(el, "", undefined, { fgColour: "#FF0000" });
      const dotsOpts = getConstructorOptions()["dotsOptions"] as Record<string, unknown>;
      expect(dotsOpts["color"]).toBe("#FF0000");
      el.remove();
    });

    it("uses gradient when --ag-qr-fg is empty", () => {
      const el = containerWithCssVar("--ag-qr-fg", "");
      new StyledQR(el);
      const dotsOpts = getConstructorOptions()["dotsOptions"] as Record<string, unknown>;
      expect(dotsOpts["gradient"]).toBeDefined();
      expect(dotsOpts["color"]).toBeUndefined();
      el.remove();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  CSS variable parsing for --ag-accent-gradient                      */
  /* ------------------------------------------------------------------ */

  describe("CSS variable parsing for --ag-accent-gradient", () => {
    it("extracts three hex colours from a gradient declaration", () => {
      const el = containerWithCssVar("--ag-accent-gradient", "linear-gradient(135deg, #AA1111 0%, #BB2222 50%, #CC3333 100%)");
      new StyledQR(el);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[0]!.color).toBe("#AA1111");
      expect(stops[1]!.color).toBe("#BB2222");
      expect(stops[2]!.color).toBe("#CC3333");
      el.remove();
    });

    it("falls back to defaults when gradient has fewer than 3 hex colours", () => {
      const el = containerWithCssVar("--ag-accent-gradient", "linear-gradient(135deg, #AA1111 0%, #BB2222 100%)");
      new StyledQR(el);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[0]!.color).toBe("#0091C7");
      el.remove();
    });

    it("falls back to defaults when --ag-accent-gradient is empty", () => {
      const el = containerWithCssVar("--ag-accent-gradient", "");
      new StyledQR(el);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[0]!.color).toBe("#0091C7");
      el.remove();
    });

    it("explicit accentGradient arg takes precedence over CSS variable", () => {
      const el = containerWithCssVar("--ag-accent-gradient", "linear-gradient(135deg, #AA1111 0%, #BB2222 50%, #CC3333 100%)");
      new StyledQR(el, "", ["#DD0000", "#EE0000", "#FF0000"]);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[0]!.color).toBe("#DD0000");
      el.remove();
    });

    it("supports 3-char hex codes in --ag-accent-gradient", () => {
      const el = containerWithCssVar("--ag-accent-gradient", "linear-gradient(135deg, #A11 0%, #B22 50%, #C33 100%)");
      new StyledQR(el);
      const stops = ((getConstructorOptions()["dotsOptions"] as Record<string, unknown>)["gradient"] as Record<string, unknown>)["colorStops"] as Array<{ color: string }>;
      expect(stops[0]!.color).toBe("#A11");
      expect(stops[1]!.color).toBe("#B22");
      expect(stops[2]!.color).toBe("#C33");
      el.remove();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  parseQrBgToken / parseQrFgToken null-element guard                 */
  /* ------------------------------------------------------------------ */

  describe("null-element guard in CSS var parsers", () => {
    it("uses #ffffff background when container is detached (getComputedStyle returns empty)", () => {
      // An element not in the DOM will return empty from getComputedStyle
      const detached = document.createElement("div");
      new StyledQR(detached);
      const bgOpts = getConstructorOptions()["backgroundOptions"] as Record<string, unknown>;
      expect(bgOpts["color"]).toBe("#ffffff");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  update re-applies ARIA on container with canvas                    */
  /* ------------------------------------------------------------------ */

  describe("update re-applies ARIA when container has canvas", () => {
    it("re-applies ARIA on existing canvas after update", () => {
      // Use a real canvas append flow
      mockQRConstructor.mockImplementation(() => {
        const inst = makeMockQRInstance();
        inst.append.mockImplementation((el: HTMLElement) => {
          const c = document.createElement("canvas");
          el.appendChild(c);
        });
        return inst;
      });
      const qr = new StyledQR(container);
      const canvas = container.querySelector("canvas")!;
      canvas.removeAttribute("role");
      canvas.removeAttribute("aria-label");
      qr.update("test");
      expect(canvas.getAttribute("role")).toBe("img");
      expect(canvas.getAttribute("aria-label")).toBe("QR code for age verification");
    });

    it("update does not throw when container has no canvas", () => {
      const qr = new StyledQR(container);
      // container has no canvas child in this mock setup
      expect(() => qr.update("test")).not.toThrow();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Boundary: update after destroy                                     */
  /* ------------------------------------------------------------------ */

  describe("update after destroy", () => {
    it("does not throw and does not re-apply ARIA (container cleared)", () => {
      mockQRConstructor.mockImplementation(() => {
        const inst = makeMockQRInstance();
        inst.append.mockImplementation((el: HTMLElement) => {
          const c = document.createElement("canvas");
          el.appendChild(c);
        });
        return inst;
      });
      const qr = new StyledQR(container);
      qr.destroy();
      // container.innerHTML was cleared, so no canvas
      expect(() => qr.update("data")).not.toThrow();
    });
  });
});
