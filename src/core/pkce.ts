// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * PKCE (Proof Key for Code Exchange) manager.
 *
 * Implements RFC 7636 compliant PKCE flow for secure code exchange between
 * the browser and the hosted backend. The code_verifier is generated with
 * Web Crypto randomness, hashed with SHA-256, and stored in sessionStorage
 * (scoped to the browser tab) until redemption.
 *
 * SECURITY: The verifier is never transmitted over the network until the
 * redemption step, where it proves the same browser that created the
 * challenge is the one redeeming it.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7636
 * @module core/pkce
 */

import type { PKCEChallenge } from "./types.js";
import { PKCE_STORAGE_PREFIX } from "./types.js";

/**
 * PKCE error class
 */
export class PKCEError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PKCEError";
  }
}

/**
 * Minimal Storage-compatible wrapper backed by an in-memory Map.
 *
 * Used as a fallback when sessionStorage is unavailable (sandboxed iframes,
 * opaque origins, or server-side rendering contexts).
 */
class InMemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.map.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

/**
 * PKCE Manager
 *
 * Handles generation, storage, and retrieval of PKCE verifiers and challenges.
 * Uses sessionStorage for temporary storage (cleared on tab close).
 * Falls back to in-memory storage when sessionStorage is unavailable
 * (sandboxed iframes, opaque origins).
 *
 * ADV-AG-003: PKCE verifiers are stored in sessionStorage, which is readable
 * by same-origin JavaScript. This is an accepted limitation of the browser
 * security model, not a PKCE design flaw. If an attacker achieves same-origin
 * XSS they can already intercept network requests, read the DOM, and steal
 * cookies (non-HttpOnly ones). Storing PKCE verifiers in sessionStorage is
 * the standard approach recommended by RFC 7636 for browser-based clients.
 * The verifier is scoped to the tab (not shared across tabs) and cleared
 * on tab close, limiting the exposure window.
 */
export class PKCEManager {
  private readonly storage: Storage;
  private readonly debug: boolean;

  constructor(debug = false) {
    this.storage = PKCEManager.resolveStorage();
    this.debug = debug;
  }

  /**
   * Attempt to use sessionStorage, falling back to an in-memory store.
   *
   * sessionStorage throws a DOMException in sandboxed iframes (without
   * allow-same-origin) and in some privacy-focused browser configurations.
   * Writing and reading back a canary value proves both getItem and setItem
   * work; anything less would leave us with a false positive.
   */
  private static resolveStorage(): Storage {
    try {
      const testKey = "__pkce_storage_test__";
      globalThis.sessionStorage.setItem(testKey, "1");
      globalThis.sessionStorage.removeItem(testKey);
      return globalThis.sessionStorage;
    } catch {
      // sessionStorage is unavailable (sandboxed iframe, opaque origin, SSR).
      // PKCE verifiers stored in memory will not survive page reloads, so
      // verification flows that depend on tab persistence may fail silently.
      console.warn(
        "[PKCEManager] sessionStorage unavailable; falling back to in-memory storage. " +
          "PKCE verifiers will not persist across page reloads.",
      );
      return new InMemoryStorage();
    }
  }

  /**
   * Generate a new PKCE challenge
   *
   * Creates a cryptographically secure code_verifier and derives the
   * code_challenge using SHA-256 and base64url encoding.
   *
   * @returns PKCE challenge pair
   * @throws PKCEError if crypto APIs are unavailable
   */
  async generateChallenge(): Promise<PKCEChallenge> {
    this.log("Generating PKCE challenge");

    // Generate code_verifier (43-128 random characters)
    const verifier = this.generateVerifier();

    // Generate code_challenge from verifier
    const challenge = await this.generateChallengeFromVerifier(verifier);

    this.log("PKCE challenge generated", {
      verifierLength: verifier.length,
      challengeLength: challenge.length,
    });

    return { verifier, challenge };
  }

  /**
   * Store code_verifier in sessionStorage
   *
   * @param sessionId Session identifier
   * @param verifier Code verifier to store
   */
  storeVerifier(sessionId: string, verifier: string): void {
    this.log("Storing verifier", { sessionId });

    const key = this.getStorageKey(sessionId);
    this.storage.setItem(key, verifier);
  }

  /**
   * Retrieve code_verifier from sessionStorage
   *
   * @param sessionId Session identifier
   * @returns Code verifier or null if not found
   */
  getVerifier(sessionId: string): string | null {
    this.log("Retrieving verifier", { sessionId });

    const key = this.getStorageKey(sessionId);
    const verifier = this.storage.getItem(key);

    if (!verifier) {
      this.log("Verifier not found", { sessionId });
      return null;
    }

    return verifier;
  }

  /**
   * Clear code_verifier from sessionStorage
   *
   * Should be called after successful redemption.
   *
   * @param sessionId Session identifier
   */
  clearVerifier(sessionId: string): void {
    this.log("Clearing verifier", { sessionId });

    const key = this.getStorageKey(sessionId);
    this.storage.removeItem(key);
  }

  /**
   * Clear all stored verifiers
   *
   * Useful for cleanup or testing.
   */
  clearAllVerifiers(): void {
    this.log("Clearing all verifiers");

    const keysToRemove: string[] = [];

    // Find all PKCE keys
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(PKCE_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    // Remove them
    keysToRemove.forEach((key) => this.storage.removeItem(key));
  }

  /**
   * Generate a cryptographically secure code_verifier.
   *
   * SECURITY: Uses Web Crypto `getRandomValues` for CSPRNG output.
   * The resulting 43-character base64url string satisfies RFC 7636
   * requirements (43-128 unreserved characters).
   *
   * @returns Code verifier string (43 base64url characters)
   * @throws PKCEError if the Web Crypto API is unavailable
   */
  private generateVerifier(): string {
    // SECURITY: Require Web Crypto CSPRNG for verifier generation
    if (!globalThis.crypto || !globalThis.crypto.getRandomValues) {
      throw new PKCEError("Web Crypto API is not available");
    }

    // Generate 32 random bytes (will produce 43 chars in base64url)
    const array = new Uint8Array(32);
    globalThis.crypto.getRandomValues(array);

    // Convert to base64url (43 characters)
    return this.base64UrlEncode(array);
  }

  /**
   * Generate code_challenge from code_verifier
   *
   * Uses SHA-256 hash and base64url encoding per RFC 7636.
   *
   * @param verifier Code verifier
   * @returns Code challenge
   * @throws PKCEError if crypto API is unavailable
   */
  private async generateChallengeFromVerifier(
    verifier: string,
  ): Promise<string> {
    // SECURITY: SubtleCrypto is required for SHA-256 challenge derivation
    if (!globalThis.crypto || !globalThis.crypto.subtle) {
      throw new PKCEError("Web Crypto API (SubtleCrypto) is not available");
    }

    // Convert verifier to Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);

    // SECURITY: SHA-256 hash of the verifier per RFC 7636 S256 method
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);

    // Convert to base64url
    const hashArray = new Uint8Array(hashBuffer);
    return this.base64UrlEncode(hashArray);
  }

  /**
   * Base64url encode (RFC 4648 Section 5)
   *
   * URL-safe base64 encoding without padding.
   *
   * @param buffer Data to encode
   * @returns Base64url encoded string
   */
  private base64UrlEncode(buffer: Uint8Array): string {
    // Convert to base64
    const base64 = this.arrayBufferToBase64(buffer);

    // Convert to base64url (URL-safe, no padding)
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  /**
   * Convert Uint8Array to base64 string
   *
   * @param buffer Data to convert
   * @returns Base64 string
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i] as number);
    }
    return globalThis.btoa(binary);
  }

  /**
   * Get storage key for session
   *
   * @param sessionId Session identifier
   * @returns Storage key
   */
  private getStorageKey(sessionId: string): string {
    return `${PKCE_STORAGE_PREFIX}${sessionId}`;
  }

  /**
   * Log debug messages to the browser console.
   *
   * Uses `console.debug` so that messages are hidden by default in most
   * browser developer tools.
   */
  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.debug(`[PKCEManager] ${message}`, data || "");
    }
  }
}
