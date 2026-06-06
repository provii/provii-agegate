/**
 * Comprehensive tests for qr.ts
 * Tests all QR generation functions, error paths, and edge cases
 */

import { QRError, renderQrToCanvas } from "../src/utils/qr.js";

// Mock QRCode library
jest.mock("qrcode", () => ({
  toCanvas: jest.fn(),
}));

import QRCode from "qrcode";

describe("qr.ts - Comprehensive Coverage", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("QRError class", () => {
    it("creates error with all properties", () => {
      const err = new QRError("Tech message", "User message", "TEST_CODE", {
        detail: "test",
      });

      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(QRError);
      expect(err.message).toBe("Tech message");
      expect(err.userMessage).toBe("User message");
      expect(err.code).toBe("TEST_CODE");
      expect(err.details).toEqual({ detail: "test" });
      expect(err.name).toBe("QRError");
    });

    it("works with instanceof checks", () => {
      const err = new QRError("msg", "user", "CODE");

      expect(err instanceof QRError).toBe(true);
      expect(err instanceof Error).toBe(true);
    });
  });

  describe("renderQrToCanvas", () => {
    let mockCanvas: HTMLCanvasElement;

    beforeEach(() => {
      // Use a real canvas element to avoid JSDOM internal-slot errors
      // (e.g. "get nodeType called on an object that is not a valid instance of Node")
      mockCanvas = document.createElement("canvas");
    });

    describe("input validation", () => {
      it("throws QRError for null canvas", async () => {
        await expect(renderQrToCanvas(null as any, "test")).rejects.toThrow(
          QRError,
        );

        try {
          await renderQrToCanvas(null as any, "test");
        } catch (err: any) {
          expect(err.code).toBe("INVALID_CANVAS");
          expect(err.userMessage).toContain("Unable to generate QR code");
        }
      });

      it("throws QRError for non-canvas element", async () => {
        const notCanvas = document.createElement("div");

        await expect(
          renderQrToCanvas(notCanvas as any, "test"),
        ).rejects.toThrow(QRError);

        try {
          await renderQrToCanvas(notCanvas as any, "test");
        } catch (err: any) {
          expect(err.code).toBe("INVALID_CANVAS");
        }
      });

      it("throws QRError for empty text", async () => {
        await expect(renderQrToCanvas(mockCanvas, "")).rejects.toThrow(QRError);

        try {
          await renderQrToCanvas(mockCanvas, "");
        } catch (err: any) {
          expect(err.code).toBe("INVALID_TEXT_INPUT");
          expect(err.userMessage).toBe(
            "Invalid QR code data. Please try again.",
          );
        }
      });

      it("throws QRError for non-string text", async () => {
        await expect(renderQrToCanvas(mockCanvas, 123 as any)).rejects.toThrow(
          QRError,
        );

        try {
          await renderQrToCanvas(mockCanvas, null as any);
        } catch (err: any) {
          expect(err.code).toBe("INVALID_TEXT_INPUT");
        }
      });

      it("throws QRError for text exceeding max size", async () => {
        const hugeText = "a".repeat(2049);

        await expect(renderQrToCanvas(mockCanvas, hugeText)).rejects.toThrow(
          QRError,
        );

        try {
          await renderQrToCanvas(mockCanvas, hugeText);
        } catch (err: any) {
          expect(err.code).toBe("TEXT_TOO_LARGE");
          expect(err.userMessage).toBe(
            "Data too large for QR code. Please try with less data.",
          );
          expect(err.details).toHaveProperty("size", 2049);
          expect(err.details).toHaveProperty("maxSize", 2048);
        }
      });
    });

    describe("successful rendering", () => {
      beforeEach(() => {
        (QRCode.toCanvas as jest.Mock).mockResolvedValue(undefined);
      });

      it("renders with default options", async () => {
        await renderQrToCanvas(mockCanvas, "test data");

        expect(QRCode.toCanvas).toHaveBeenCalledWith(
          mockCanvas,
          "test data",
          expect.objectContaining({
            errorCorrectionLevel: "M",
            margin: 1,
            width: 256,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          }),
        );
      });

      it("renders with custom error correction level L", async () => {
        await renderQrToCanvas(mockCanvas, "test", {
          errorCorrectionLevel: "L",
        });

        expect(QRCode.toCanvas).toHaveBeenCalledWith(
          mockCanvas,
          "test",
          expect.objectContaining({ errorCorrectionLevel: "L" }),
        );
      });

      it("renders with custom error correction level Q", async () => {
        await renderQrToCanvas(mockCanvas, "test", {
          errorCorrectionLevel: "Q",
        });

        expect(QRCode.toCanvas).toHaveBeenCalledWith(
          mockCanvas,
          "test",
          expect.objectContaining({ errorCorrectionLevel: "Q" }),
        );
      });

      it("renders with custom error correction level H", async () => {
        await renderQrToCanvas(mockCanvas, "test", {
          errorCorrectionLevel: "H",
        });

        expect(QRCode.toCanvas).toHaveBeenCalledWith(
          mockCanvas,
          "test",
          expect.objectContaining({ errorCorrectionLevel: "H" }),
        );
      });

      it("renders with custom margin", async () => {
        await renderQrToCanvas(mockCanvas, "test", { margin: 4 });

        expect(QRCode.toCanvas).toHaveBeenCalledWith(
          mockCanvas,
          "test",
          expect.objectContaining({ margin: 4 }),
        );
      });

      it("renders with margin 0", async () => {
        await renderQrToCanvas(mockCanvas, "test", { margin: 0 });

        expect(QRCode.toCanvas).toHaveBeenCalledWith(
          mockCanvas,
          "test",
          expect.objectContaining({ margin: 0 }),
        );
      });

      it("renders with custom width", async () => {
        await renderQrToCanvas(mockCanvas, "test", { width: 512 });

        expect(QRCode.toCanvas).toHaveBeenCalledWith(
          mockCanvas,
          "test",
          expect.objectContaining({ width: 512 }),
        );
      });

      it("renders with all custom options", async () => {
        await renderQrToCanvas(mockCanvas, "test", {
          errorCorrectionLevel: "H",
          margin: 2,
          width: 300,
        });

        expect(QRCode.toCanvas).toHaveBeenCalledWith(
          mockCanvas,
          "test",
          expect.objectContaining({
            errorCorrectionLevel: "H",
            margin: 2,
            width: 300,
          }),
        );
      });
    });

    describe("error handling and retry logic", () => {
      it('retries with Low error correction when "too long" error occurs', async () => {
        // Capture a snapshot of the errorCorrectionLevel at each call because
        // the production code mutates the same qrOptions object in-place before
        // the retry. Jest records argument references, so by assertion time the
        // first call's recorded options object has already been mutated to 'L'.
        const capturedErrorLevels: string[] = [];
        const tooLongError = new Error("Data too long");
        (QRCode.toCanvas as jest.Mock).mockImplementation(
          (_canvas: unknown, _text: unknown, opts: Record<string, unknown>) => {
            capturedErrorLevels.push(opts["errorCorrectionLevel"] as string);
            if (capturedErrorLevels.length === 1) {
              return Promise.reject(tooLongError);
            }
            return Promise.resolve(undefined);
          },
        );

        await renderQrToCanvas(mockCanvas, "test", {
          errorCorrectionLevel: "H",
        });

        expect(QRCode.toCanvas).toHaveBeenCalledTimes(2);
        expect(capturedErrorLevels[0]).toBe("H");
        expect(capturedErrorLevels[1]).toBe("L");
      });

      it("does not retry if already using Low error correction", async () => {
        const error = new Error("Data too long");
        (QRCode.toCanvas as jest.Mock).mockRejectedValueOnce(error);

        await expect(
          renderQrToCanvas(mockCanvas, "test", { errorCorrectionLevel: "L" }),
        ).rejects.toThrow(QRError);

        expect(QRCode.toCanvas).toHaveBeenCalledTimes(1);

        // Verify the error code by catching the rejection directly
        (QRCode.toCanvas as jest.Mock).mockRejectedValueOnce(
          new Error("Data too long"),
        );
        const thrown = await renderQrToCanvas(mockCanvas, "test2", {
          errorCorrectionLevel: "L",
        })
          .then(() => {
            throw new Error("Expected rejection");
          })
          .catch((err: unknown) => err);
        expect((thrown as QRError).code).toBe("QR_GENERATION_FAILED");
      });

      it("throws QRError if retry also fails", async () => {
        const error1 = new Error("Data too long");
        const error2 = new Error("Still too long");
        (QRCode.toCanvas as jest.Mock)
          .mockRejectedValueOnce(error1)
          .mockRejectedValueOnce(error2);

        const thrown = await renderQrToCanvas(mockCanvas, "test", {
          errorCorrectionLevel: "M",
        })
          .then(() => {
            throw new Error("Expected rejection");
          })
          .catch((err: unknown) => err);
        expect(thrown).toBeInstanceOf(QRError);
        expect((thrown as QRError).code).toBe("QR_GENERATION_FAILED");

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[qr] Retry also failed:",
          error2,
        );
      });

      it('throws QRError for non-"too long" errors without retry', async () => {
        const error = new Error("Some other error");
        (QRCode.toCanvas as jest.Mock).mockRejectedValueOnce(error);

        const thrown = await renderQrToCanvas(mockCanvas, "test")
          .then(() => {
            throw new Error("Expected rejection");
          })
          .catch((err: unknown) => err);
        expect(thrown).toBeInstanceOf(QRError);
        expect((thrown as QRError).code).toBe("QR_GENERATION_FAILED");
        expect((thrown as QRError).details).toBe(error);

        expect(QRCode.toCanvas).toHaveBeenCalledTimes(1);
      });

    });
  });
});
