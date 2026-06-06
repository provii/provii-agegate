// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Single public entry point for the provii-agegate browser SDK.
 *
 * Re-exports all public types and classes. Adds a default export so
 * bundlers can expose it directly.
 *
 * AA-032-H2: window.AgeGate is no longer set on the global. Integrators
 * who need programmatic access import the ESM bundle from the CDN:
 *   import { AgeGate } from "https://cdn.provii.app/sdk/provii-agegate/v0.1.3/index.js";
 * The IIFE script tag remains the autoload path; it self-executes on
 * import via ./modes/autoload.js and does not need a global symbol.
 *
 * @module index
 */

import { AgeGate } from "./agegate/AgeGate.js";
export { AgeGate };
export { AgeGateError } from "./errors/AgeGateError.js";

export * from "./agegate/AgeGateConfig.js";
export { AgeGateMachine } from "./agegate/AgeGateMachine.js";
export type {
  GateContext,
  GateEvent,
  PollResult,
} from "./agegate/AgeGateMachine.js";
export { AutoBlockMode } from "./modes/autoload.js";
export type {
  AutoBlockConfig,
  SDKEvent,
  EventHandler,
  VerifiedEventData,
  ErrorEventData,
  StatusUpdateEventData,
} from "./core/types.js";
export type { ServerFailureMode } from "./core/failure-mode.js";
/* installPreviewBridge is available via the preview subpath export
   (src/preview.ts) to keep it out of the CDN IIFE bundle. */
export type {
  AgegateConfigMessage,
  AgegateConfigPayload,
  StylerDir,
} from "./modes/bridge-schema.js";

/* -------- auto-block mode (CDN script tag) -------- */
/* Importing autoload triggers its self-executing IIFE which detects
   <script data-public-key=”...”> and auto-initialises the overlay.
   Without the data attribute the import is inert.                   */
import "./modes/autoload.js";

/* -------- default export (ESM & CJS) -------- */
export default AgeGate;
