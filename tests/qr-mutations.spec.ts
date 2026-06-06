/** @jest-environment jsdom */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT

/**
 * Mutation-testing-focused tests for src/utils/qr.ts
 *
 * Pins every string literal, constant, conditional, comparison, default value,
 * and error code so Stryker mutants are caught. Avoids duplicating the existing
 * qr.full.spec.ts tests.
 */

import { QRError, renderQrToCanvas } from "../src/utils/qr.js";

jest.mock("qrcode", () => ({
  toCanvas: jest.fn(),
}));

import QRCode from "qrcode";

describe("qr.ts mutation tests", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    canvas = document.createElement("canvas");
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  /* ------------------------------------------------------------------ */
  /*  QRError class , pin all properties                                 */
  /* ------------------------------------------------------------------ */

  describe("QRError property pinning", () => {
    it("name property is exactly 'QRError'", () => {
      const err = new QRError("m", "u", "c");
      expect(err.name).toBe("QRError");
      expect(err.name).not.toBe("Error");
    });

    it("message property is set from first arg", () => {
      const err = new QRError("technical", "user", "CODE");
      expect(err.message).toBe("technical");
    });

    it("userMessage property is set from second arg", () => {
      const err = new QRError("technical", "user-facing", "CODE");
      expect(err.userMessage).toBe("user-facing");
    });

    it("code property is set from third arg", () => {
      const err = new QRError("m", "u", "MY_CODE");
      expect(err.code).toBe("MY_CODE");
    });

    it("details is undefined when omitted", () => {
      const err = new QRError("m", "u", "c");
      expect(err.details).toBeUndefined();
    });

    it("details carries the fourth arg", () => {
      const detail = { foo: "bar" };
      const err = new QRError("m", "u", "c", detail);
      expect(err.details).toBe(detail);
    });

    it("is instanceof Error", () => {
      expect(new QRError("m", "u", "c")).toBeInstanceOf(Error);
    });

    it("is instanceof QRError", () => {
      expect(new QRError("m", "u", "c")).toBeInstanceOf(QRError);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Constants , MAX_QR_DATA_SIZE = 2048                                */
  /* ------------------------------------------------------------------ */

  describe("MAX_QR_DATA_SIZE boundary", () => {
    beforeEach(() => {
      (QRCode.toCanvas as jest.Mock).mockResolvedValue(undefined);
    });

    it("accepts text of exactly 2048 characters", async () => {
      const text = "x".repeat(2048);
      await expect(renderQrToCanvas(canvas, text)).resolves.toBeUndefined();
    });

    it("rejects text of exactly 2049 characters", async () => {
      const text = "x".repeat(2049);
      await expect(renderQrToCanvas(canvas, text)).rejects.toThrow(QRError);
    });

    it("rejects text of 2050 characters", async () => {
      const text = "x".repeat(2050);
      try {
        await renderQrToCanvas(canvas, text);
        fail("should have thrown");
      } catch (err: unknown) {
        expect((err as QRError).code).toBe("TEXT_TOO_LARGE");
      }
    });

    it("size error details.size equals the actual text length", async () => {
      const text = "x".repeat(2049);
      try {
        await renderQrToCanvas(canvas, text);
        fail("should have thrown");
      } catch (err: unknown) {
        const details = (err as QRError).details as Record<string, number>;
        expect(details["size"]).toBe(2049);
      }
    });

    it("size error details.maxSize is exactly 2048", async () => {
      const text = "x".repeat(2049);
      try {
        await renderQrToCanvas(canvas, text);
        fail("should have thrown");
      } catch (err: unknown) {
        const details = (err as QRError).details as Record<string, number>;
        expect(details["maxSize"]).toBe(2048);
      }
    });
  });

  /* ------------------------------------------------------------------ */
  /*  DEFAULT_QR_SIZE = 256                                              */
  /* ------------------------------------------------------------------ */

  describe("DEFAULT_QR_SIZE", () => {
    beforeEach(() => {
      (QRCode.toCanvas as jest.Mock).mockResolvedValue(undefined);
    });

    it("default width is exactly 256 when no width option provided", async () => {
      await renderQrToCanvas(canvas, "test");
      const opts = (QRCode.toCanvas as jest.Mock).mock.calls[0][2];
      expect(opts.width).toBe(256);
    });

    it("custom width overrides default 256", async () => {
      await renderQrToCanvas(canvas, "test", { width: 128 });
      const opts = (QRCode.toCanvas as jest.Mock).mock.calls[0][2];
      expect(opts.width).toBe(128);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Default option values                                              */
  /* ------------------------------------------------------------------ */

  describe("default option values", () => {
    beforeEach(() => {
      (QRCode.toCanvas as jest.Mock).mockResolvedValue(undefined);
    });

    it("default errorCorrectionLevel is 'M'", async () => {
      await renderQrToCanvas(canvas, "test");
      const opts = (QRCode.toCanvas as jest.Mock).mock.calls[0][2];
      expect(opts.errorCorrectionLevel).toBe("M");
    });

    it("default margin is 1", async () => {
      await renderQrToCanvas(canvas, "test");
      const opts = (QRCode.toCanvas as jest.Mock).mock.calls[0][2];
      expect(opts.margin).toBe(1);
    });

    it("margin 0 is respected (not replaced by default)", async () => {
      await renderQrToCanvas(canvas, "test", { margin: 0 });
      const opts = (QRCode.toCanvas as jest.Mock).mock.calls[0][2];
      expect(opts.margin).toBe(0);
    });

    it("colour dark is '#000000'", async () => {
      await renderQrToCanvas(canvas, "test");
      const opts = (QRCode.toCanvas as jest.Mock).mock.calls[0][2];
      expect(opts.color.dark).toBe("#000000");
    });

    it("colour light is '#FFFFFF'", async () => {
      await renderQrToCanvas(canvas, "test");
      const opts = (QRCode.toCanvas as jest.Mock).mock.calls[0][2];
      expect(opts.color.light).toBe("#FFFFFF");
    });
  });

  /* ------------------------------------------------------------------ */
  /*  USER_MESSAGES string pinning                                       */
  /* ------------------------------------------------------------------ */

  describe("USER_MESSAGES string values", () => {
    it("INVALID_INPUT message is pinned", async () => {
      try {
        await renderQrToCanvas(canvas, "");
      } catch (err: unknown) {
        expect((err as QRError).userMessage).toBe("Invalid QR code data. Please try again.");
      }
    });

    it("CANVAS_ERROR message is pinned", async () => {
      try {
        await renderQrToCanvas(null as unknown as HTMLCanvasElement, "test");
      } catch (err: unknown) {
        expect((err as QRError).userMessage).toBe("Unable to generate QR code display. Please try again.");
      }
    });

    it("SIZE_EXCEEDED message is pinned", async () => {
      try {
        await renderQrToCanvas(canvas, "x".repeat(2049));
      } catch (err: unknown) {
        expect((err as QRError).userMessage).toBe("Data too large for QR code. Please try with less data.");
      }
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Error code string pinning                                          */
  /* ------------------------------------------------------------------ */

  describe("error code pinning", () => {
    it("null canvas produces INVALID_CANVAS", async () => {
      try {
        await renderQrToCanvas(null as unknown as HTMLCanvasElement, "test");
        fail("should have thrown");
      } catch (err: unknown) {
        expect((err as QRError).code).toBe("INVALID_CANVAS");
      }
    });

    it("non-canvas element produces INVALID_CANVAS", async () => {
      const div = document.createElement("div");
      try {
        await renderQrToCanvas(div as unknown as HTMLCanvasElement, "test");
        fail("should have thrown");
      } catch (err: unknown) {
        expect((err as QRError).code).toBe("INVALID_CANVAS");
      }
    });

    it("empty text produces INVALID_TEXT_INPUT", async () => {
      try {
        await renderQrToCanvas(canvas, "");
        fail("should have thrown");
      } catch (err: unknown) {
        expect((err as QRError).code).toBe("INVALID_TEXT_INPUT");
      }
    });

    it("null text produces INVALID_TEXT_INPUT", async () => {
      try {
        await renderQrToCanvas(canvas, null as unknown as string);
        fail("should have thrown");
      } catch (err: unknown) {
        expect((err as QRError).code).toBe("INVALID_TEXT_INPUT");
      }
    });

    it("oversized text produces TEXT_TOO_LARGE", async () => {
      try {
        await renderQrToCanvas(canvas, "x".repeat(3000));
        fail("should have thrown");
      } catch (err: unknown) {
        expect((err as QRError).code).toBe("TEXT_TOO_LARGE");
      }
    });

    it("render failure produces QR_GENERATION_FAILED", async () => {
      (QRCode.toCanvas as jest.Mock).mockRejectedValueOnce(new Error("fail"));
      try {
        await renderQrToCanvas(canvas, "test");
        fail("should have thrown");
      } catch (err: unknown) {
        expect((err as QRError).code).toBe("QR_GENERATION_FAILED");
      }
    });

  });

  /* ------------------------------------------------------------------ */
  /*  Canvas validation , instanceof check                               */
  /* ------------------------------------------------------------------ */

  describe("canvas instanceof check", () => {
    it("accepts a real HTMLCanvasElement", async () => {
      (QRCode.toCanvas as jest.Mock).mockResolvedValue(undefined);
      await expect(renderQrToCanvas(canvas, "data")).resolves.toBeUndefined();
    });

    it("rejects undefined canvas", async () => {
      await expect(renderQrToCanvas(undefined as unknown as HTMLCanvasElement, "test")).rejects.toThrow(QRError);
    });

    it("rejects a number masquerading as canvas", async () => {
      await expect(renderQrToCanvas(42 as unknown as HTMLCanvasElement, "test")).rejects.toThrow(QRError);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Text validation , typeof and truthiness                            */
  /* ------------------------------------------------------------------ */

  describe("text validation", () => {
    it("rejects numeric text", async () => {
      try {
        await renderQrToCanvas(canvas, 123 as unknown as string);
        fail("should have thrown");
      } catch (err: unknown) {
        expect((err as QRError).code).toBe("INVALID_TEXT_INPUT");
      }
    });

    it("rejects boolean text", async () => {
      try {
        await renderQrToCanvas(canvas, true as unknown as string);
        fail("should have thrown");
      } catch (err: unknown) {
        expect((err as QRError).code).toBe("INVALID_TEXT_INPUT");
      }
    });

    it("rejects undefined text", async () => {
      try {
        await renderQrToCanvas(canvas, undefined as unknown as string);
        fail("should have thrown");
      } catch (err: unknown) {
        expect((err as QRError).code).toBe("INVALID_TEXT_INPUT");
      }
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Retry logic , "too long" substring check                           */
  /* ------------------------------------------------------------------ */

  describe("retry logic conditions", () => {
    it("retries when error message contains 'too long' (case sensitive)", async () => {
      (QRCode.toCanvas as jest.Mock)
        .mockRejectedValueOnce(new Error("Data too long for version"))
        .mockResolvedValueOnce(undefined);
      await renderQrToCanvas(canvas, "test");
      expect(QRCode.toCanvas).toHaveBeenCalledTimes(2);
    });

    it("does NOT retry when error message does not contain 'too long'", async () => {
      (QRCode.toCanvas as jest.Mock).mockRejectedValueOnce(new Error("some other error"));
      await expect(renderQrToCanvas(canvas, "test")).rejects.toThrow(QRError);
      expect(QRCode.toCanvas).toHaveBeenCalledTimes(1);
    });

    it("does NOT retry when already at errorCorrectionLevel 'L'", async () => {
      (QRCode.toCanvas as jest.Mock).mockRejectedValueOnce(new Error("too long"));
      await expect(renderQrToCanvas(canvas, "test", { errorCorrectionLevel: "L" })).rejects.toThrow(QRError);
      expect(QRCode.toCanvas).toHaveBeenCalledTimes(1);
    });

    it("retry sets errorCorrectionLevel to 'L'", async () => {
      const capturedLevels: string[] = [];
      (QRCode.toCanvas as jest.Mock).mockImplementation(
        (_c: unknown, _t: unknown, opts: Record<string, unknown>) => {
          capturedLevels.push(opts["errorCorrectionLevel"] as string);
          if (capturedLevels.length === 1) return Promise.reject(new Error("too long"));
          return Promise.resolve(undefined);
        },
      );
      await renderQrToCanvas(canvas, "test", { errorCorrectionLevel: "H" });
      expect(capturedLevels[1]).toBe("L");
    });

    it("on retry success, function returns without throwing", async () => {
      (QRCode.toCanvas as jest.Mock)
        .mockRejectedValueOnce(new Error("too long"))
        .mockResolvedValueOnce(undefined);
      await expect(renderQrToCanvas(canvas, "test")).resolves.toBeUndefined();
    });

    it("on retry failure, throws QR_GENERATION_FAILED", async () => {
      (QRCode.toCanvas as jest.Mock)
        .mockRejectedValueOnce(new Error("too long"))
        .mockRejectedValueOnce(new Error("still too long"));
      try {
        await renderQrToCanvas(canvas, "test");
        fail("should have thrown");
      } catch (err: unknown) {
        expect((err as QRError).code).toBe("QR_GENERATION_FAILED");
      }
    });

    it("retry failure logs to console.error with correct prefix", async () => {
      const retryErr = new Error("still too long");
      (QRCode.toCanvas as jest.Mock)
        .mockRejectedValueOnce(new Error("too long"))
        .mockRejectedValueOnce(retryErr);
      try {
        await renderQrToCanvas(canvas, "test");
      } catch {
        // expected
      }
      expect(consoleErrorSpy).toHaveBeenCalledWith("[qr] Retry also failed:", retryErr);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Error message extraction , instanceof Error branch                 */
  /* ------------------------------------------------------------------ */

  describe("error message extraction", () => {
    it("uses .message from Error instances", async () => {
      (QRCode.toCanvas as jest.Mock).mockRejectedValueOnce(new Error("specific msg"));
      try {
        await renderQrToCanvas(canvas, "test");
        fail("should have thrown");
      } catch (err: unknown) {
        expect((err as QRError).message).toContain("specific msg");
      }
    });

    it("uses String() for non-Error throw values", async () => {
      (QRCode.toCanvas as jest.Mock).mockRejectedValueOnce("string-error");
      try {
        await renderQrToCanvas(canvas, "test");
        fail("should have thrown");
      } catch (err: unknown) {
        expect((err as QRError).message).toContain("string-error");
      }
    });

    it("uses String() for numeric throw values", async () => {
      (QRCode.toCanvas as jest.Mock).mockRejectedValueOnce(42);
      try {
        await renderQrToCanvas(canvas, "test");
        fail("should have thrown");
      } catch (err: unknown) {
        expect((err as QRError).message).toContain("42");
      }
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Console logging , error messages                                   */
  /* ------------------------------------------------------------------ */

  describe("console.error messages", () => {
    it("logs QRCode library error with correct prefix", async () => {
      const err = new Error("lib error");
      (QRCode.toCanvas as jest.Mock).mockRejectedValueOnce(err);
      try {
        await renderQrToCanvas(canvas, "test");
      } catch {
        // expected
      }
      expect(consoleErrorSpy).toHaveBeenCalledWith("[qr] QRCode library error:", err);
    });

    it("logs size exceeded with correct format", async () => {
      try {
        await renderQrToCanvas(canvas, "x".repeat(2049));
      } catch {
        // expected
      }
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[qr] Text too large: 2049 bytes (max: 2048)"),
      );
    });

  });

  /* ------------------------------------------------------------------ */
  /*  QRError re-throw passthrough                                       */
  /* ------------------------------------------------------------------ */

  describe("QRError passthrough in outer catch", () => {
    it("re-throws QRError without wrapping in another QRError", async () => {
      try {
        await renderQrToCanvas(canvas, "");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(QRError);
        // The code should be from the inner throw, not RENDER_UNEXPECTED
        expect((err as QRError).code).toBe("INVALID_TEXT_INPUT");
      }
    });

  });

  /* ------------------------------------------------------------------ */
  /*  QR_GENERATION_FAILED carries details                               */
  /* ------------------------------------------------------------------ */

  describe("QR_GENERATION_FAILED details", () => {
    it("carries the original error as details", async () => {
      const origErr = new Error("original");
      (QRCode.toCanvas as jest.Mock).mockRejectedValueOnce(origErr);
      try {
        await renderQrToCanvas(canvas, "test");
        fail("should have thrown");
      } catch (err: unknown) {
        expect((err as QRError).details).toBe(origErr);
      }
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Options pass-through to QRCode.toCanvas                            */
  /* ------------------------------------------------------------------ */

  describe("options pass-through", () => {
    beforeEach(() => {
      (QRCode.toCanvas as jest.Mock).mockResolvedValue(undefined);
    });

    it("passes canvas element as first arg", async () => {
      await renderQrToCanvas(canvas, "test");
      expect((QRCode.toCanvas as jest.Mock).mock.calls[0][0]).toBe(canvas);
    });

    it("passes text as second arg", async () => {
      await renderQrToCanvas(canvas, "my-data");
      expect((QRCode.toCanvas as jest.Mock).mock.calls[0][1]).toBe("my-data");
    });

    it("errorCorrectionLevel 'Q' is passed through", async () => {
      await renderQrToCanvas(canvas, "test", { errorCorrectionLevel: "Q" });
      const opts = (QRCode.toCanvas as jest.Mock).mock.calls[0][2];
      expect(opts.errorCorrectionLevel).toBe("Q");
    });

    it("errorCorrectionLevel 'H' is passed through", async () => {
      await renderQrToCanvas(canvas, "test", { errorCorrectionLevel: "H" });
      const opts = (QRCode.toCanvas as jest.Mock).mock.calls[0][2];
      expect(opts.errorCorrectionLevel).toBe("H");
    });

    it("margin is passed through via nullish coalescing (not ||)", async () => {
      await renderQrToCanvas(canvas, "test", { margin: 0 });
      const opts = (QRCode.toCanvas as jest.Mock).mock.calls[0][2];
      // margin: 0 must NOT be replaced by default 1
      expect(opts.margin).toBe(0);
    });

    it("custom width is passed through", async () => {
      await renderQrToCanvas(canvas, "test", { width: 1024 });
      const opts = (QRCode.toCanvas as jest.Mock).mock.calls[0][2];
      expect(opts.width).toBe(1024);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Size-exceeded error message format                                 */
  /* ------------------------------------------------------------------ */

  describe("size exceeded error message format", () => {
    it("technical message includes the actual char count", async () => {
      try {
        await renderQrToCanvas(canvas, "x".repeat(2049));
        fail("should have thrown");
      } catch (err: unknown) {
        expect((err as QRError).message).toBe("Text too large for QR code: 2049 chars");
      }
    });
  });
});
