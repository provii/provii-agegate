// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * State machine services and actions for the AgeGate XState machine.
 *
 * Implements the v1 hosted backend API integration with RFC 7636 PKCE:
 * - Challenge creation with PKCE code_challenge (S256)
 * - Adaptive HTTP polling with WebSocket push notification fallback
 * - PKCE redemption flow (RP proxy or direct mode)
 * - QR code and deep-link rendering for desktop and mobile
 *
 * SECURITY: The code_verifier is NEVER included in QR payloads or deep links.
 * It is stored only in sessionStorage and sent exclusively during redemption.
 *
 * This module is a barrel: the implementation now lives in the `./machine/`
 * submodules. The public surface is the same five symbols consumers (AgeGate,
 * AgeGateMachine) and tests have always imported from this path, so the
 * `jest.mock("../src/agegate/machineServices.js", ...)` interception and the
 * `import * as ... from ".../machineServices.js"` suites keep working
 * unchanged.
 *
 * @module machineServices
 */

export {
  resetMachineContext,
  attachVisibilityFallback,
  wasWsConnected,
} from "./machine/context.js";
export { machineActions } from "./machine/actions.js";
export { machineServices } from "./machine/services.js";
