// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * QR code rendering utilities for Provii Wallet verification.
 *
 * Wraps the `qrcode` library with input size validation, sensible defaults,
 * and automatic fallback to lower error correction when the payload is large.
 *
 * @module utils/qr
 */

import QRCode from "qrcode";

/**
 * Structured error for QR code generation failures.
 *
 * Carries a `userMessage` safe for display and a `code` for programmatic
 * handling.
 */
export class QRError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "QRError";
  }
}

/* -------------------------------------------------------------------------- */
/*                              Constants                                     */
/* -------------------------------------------------------------------------- */

const MAX_QR_DATA_SIZE = 2048; // 2KB practical limit for reliable scanning
const DEFAULT_QR_SIZE = 256; // Default pixel size

const USER_MESSAGES = {
  INVALID_INPUT: "Invalid QR code data. Please try again.",
  CANVAS_ERROR: "Unable to generate QR code display. Please try again.",
  SIZE_EXCEEDED: "Data too large for QR code. Please try with less data.",
} as const;

/* -------------------------------------------------------------------------- */
/*                               Public API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Render a QR code onto a canvas element
 * @param canvas - HTML canvas element to render into
 * @param text - Text/JSON to encode in the QR
 * @param options - Optional QR code options
 */
export const renderQrToCanvas = async (
  canvas: HTMLCanvasElement,
  text: string,
  options?: {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    width?: number;
  },
): Promise<void> => {
  try {
    // Validate inputs
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new QRError(
        "Invalid canvas element",
        USER_MESSAGES.CANVAS_ERROR,
        "INVALID_CANVAS",
      );
    }

    if (!text || typeof text !== "string") {
      throw new QRError(
        "Invalid text input for QR code",
        USER_MESSAGES.INVALID_INPUT,
        "INVALID_TEXT_INPUT",
      );
    }

    // Check size limits
    if (text.length > MAX_QR_DATA_SIZE) {
      console.error(
        `[qr] Text too large: ${text.length} bytes (max: ${MAX_QR_DATA_SIZE})`,
      );
      throw new QRError(
        `Text too large for QR code: ${text.length} chars`,
        USER_MESSAGES.SIZE_EXCEEDED,
        "TEXT_TOO_LARGE",
        { size: text.length, maxSize: MAX_QR_DATA_SIZE },
      );
    }

    // Prepare QR options with sensible defaults
    const qrOptions = {
      errorCorrectionLevel: options?.errorCorrectionLevel || "M",
      margin: options?.margin ?? 1,
      width: options?.width || DEFAULT_QR_SIZE,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    };

    // Generate the QR code
    try {
      await QRCode.toCanvas(canvas, text, qrOptions);
    } catch (renderErr: unknown) {
      console.error("[qr] QRCode library error:", renderErr);

      // Try with lower error correction if it failed due to size
      const renderMessage =
        renderErr instanceof Error ? renderErr.message : String(renderErr);
      if (
        renderMessage.includes("too long") &&
        qrOptions.errorCorrectionLevel !== "L"
      ) {
        qrOptions.errorCorrectionLevel = "L";

        try {
          await QRCode.toCanvas(canvas, text, qrOptions);
          return;
        } catch (retryErr: unknown) {
          console.error("[qr] Retry also failed:", retryErr);
        }
      }

      throw new QRError(
        `QR code generation failed: ${renderMessage}`,
        USER_MESSAGES.CANVAS_ERROR,
        "QR_GENERATION_FAILED",
        renderErr,
      );
    }
  } catch (err) {
    if (err instanceof QRError) throw err;

    console.error("[qr] Unexpected error:", err);
    throw new QRError(
      `Unexpected error: ${err}`,
      USER_MESSAGES.CANVAS_ERROR,
      "RENDER_UNEXPECTED",
      err,
    );
  }
};
