// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Type definitions for the i18n locale string system.
 *
 * Every locale file must implement the full LocaleStrings interface.
 * The keys are flat (no nesting) for simplicity and tree-shaking.
 *
 * @module i18n/types
 */

/**
 * All user-facing strings in the provii-agegate SDK.
 *
 * Grouped logically by UI region. Each locale file exports a
 * complete implementation of this interface.
 */
export interface LocaleStrings {
  // Header
  readonly headerTitle: string;
  readonly headerSubtitle: string;
  readonly headerSubtitlePreparing: string;

  // Age requirement descriptions (contain {age} placeholder)
  readonly verifyOverAge: string;
  readonly verifyUnderAge: string;

  // Mobile CTA
  readonly verifyButtonLabel: string;
  readonly verifyButtonAriaLabel: string;
  readonly verifyButtonOpening: string;
  readonly verifyButtonChecking: string;
  readonly mobileStatusTap: string;

  // Desktop QR
  readonly scanQrInstruction: string;
  readonly qrCodeAriaLabel: string;
  readonly shortCodeLabel: string;
  readonly verificationCodeAriaPrefix: string;

  // QR toggle (mobile)
  readonly qrToggleLabel: string;
  readonly showQrCode: string;
  readonly hideQrCode: string;
  readonly qrCodeUnavailable: string;

  // Time notice
  readonly timeNotice: string;

  // Help link
  readonly needHelp: string;
  readonly needHelpAriaLabel: string;

  // Footer
  readonly poweredBy: string;
  readonly footerSubtitle: string;
  readonly privacyPolicyLinkLabel: string;

  // Overlay loading
  readonly loading: string;
  readonly initialisingVerification: string;
  readonly completingVerification: string;

  // Status messages
  readonly stillWaiting: string;
  readonly proofReceivedConfirming: string;
  readonly verificationTimedOut: string;
  readonly sessionExpired: string;
  readonly somethingWentWrong: string;

  // Error state
  readonly errorTitle: string;
  readonly tryAgain: string;

  // Sandbox
  readonly sandboxTesting: string;
  readonly simulatePass: string;
  readonly simulateFail: string;
  readonly simulatePassAriaLabel: string;
  readonly simulateFailAriaLabel: string;
  readonly simulating: string;

  // Retry hint
  readonly timeoutHint: string;

  // Escape hatch
  readonly leaveSite: string;

  // Accessibility
  readonly ageVerificationRegion: string;
  readonly closeVerification: string;
}

/**
 * Set of locale codes that use right-to-left text direction.
 */
export const RTL_LOCALES: ReadonlySet<string> = new Set([
  "ar",
  "he",
  "fa",
  "ur",
]);
