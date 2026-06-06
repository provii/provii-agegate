// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Strict base64url encoding and decoding (RFC 4648 Section 5).
 *
 * All functions enforce the unpadded base64url alphabet `[A-Za-z0-9_-]`
 * and reject standard base64 characters (`+`, `/`, `=`) as well as
 * whitespace. This prevents accidental acceptance of non-URL-safe input.
 *
 * @module utils/base64
 */

/**
 * Structured error for base64url encoding/decoding failures.
 *
 * Carries a `userMessage` safe for display and a `code` for programmatic
 * handling.
 */
class Base64Error extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "Base64Error";
  }
}

/* -------------------------------------------------------------------------- */
/*                              Constants                                     */
/* -------------------------------------------------------------------------- */

const USER_MESSAGES = {
  INVALID_INPUT: "Invalid data format. Please try again.",
  DECODE_FAILED: "Unable to decode data. The data may be corrupted.",
  ENCODE_FAILED: "Unable to encode data. Please try again.",
  INVALID_BASE64URL: "Invalid base64url format.",
} as const;

/* -------------------------------------------------------------------------- */
/*                    STRICT Base64URL Validation Functions                   */
/* -------------------------------------------------------------------------- */

/**
 * Strictly encode bytes to base64url - no padding
 * @param bytes - Uint8Array to encode
 * @returns Base64url encoded string without padding
 */
export function bytesToB64urlStrict(bytes: Uint8Array): string {
  try {
    // Input validation
    if (!bytes) {
      throw new Base64Error(
        "Empty bytes input",
        USER_MESSAGES.INVALID_INPUT,
        "EMPTY_BYTES",
      );
    }

    // Cross-realm-safe Uint8Array detection. `instanceof Uint8Array` returns
    // false when the value originates in a different realm (e.g. Node's
    // util.TextEncoder under JSDOM), so we use Object.prototype.toString
    // which inspects the [[StringTag]] without realm coupling.
    if (Object.prototype.toString.call(bytes) !== "[object Uint8Array]") {
      throw new Base64Error(
        `Invalid bytes input type: ${typeof bytes}`,
        USER_MESSAGES.INVALID_INPUT,
        "INVALID_BYTES_TYPE",
        { actualType: typeof bytes },
      );
    }

    // Convert to binary string
    let bin = "";
    for (const byte of bytes) {
      bin += String.fromCharCode(byte);
    }

    // Encode to base64 and convert to base64url (no padding)
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (err) {
    if (err instanceof Base64Error) throw err;

    console.error("[base64url] Strict encode failed:", err);
    throw new Base64Error(
      `Failed to encode strict base64url: ${err}`,
      USER_MESSAGES.ENCODE_FAILED,
      "STRICT_ENCODE_FAILED",
      err,
    );
  }
}
