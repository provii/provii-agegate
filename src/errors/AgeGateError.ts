// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Base error class for all provii-agegate SDK errors.
 *
 * Provides a structured error with:
 * - `message`: developer-facing detail (never shown to end users)
 * - `userMessage`: safe, localisation-ready string for display
 * - `code`: machine-readable error code for programmatic handling
 * - `details`: optional payload (response body, status code, etc.)
 *
 * Integrators can use `instanceof AgeGateError` to distinguish SDK errors
 * from generic runtime errors in their catch blocks.
 *
 * @module AgeGateError
 */

export class AgeGateError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AgeGateError";
  }
}
