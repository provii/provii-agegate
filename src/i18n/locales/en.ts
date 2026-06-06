// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

import type { LocaleStrings } from "../types.js";

/**
 * English (source of truth). All other locale files must have
 * identical keys with translated values.
 */
export const en: LocaleStrings = {
  // Header
  headerTitle: "Age Verification",
  headerSubtitle: "Verify your age privately",
  headerSubtitlePreparing: "Preparing secure verification...",

  // Age requirement
  verifyOverAge: "Verify you are {age} or older",
  verifyUnderAge: "Verify you are under {age}",

  // Mobile CTA
  verifyButtonLabel: "Verify with Provii Wallet",
  verifyButtonAriaLabel: "Verify with Provii Wallet (opens app)",
  verifyButtonOpening: "Opening Provii Wallet...",
  verifyButtonChecking: "Checking verification...",
  mobileStatusTap: "Tap to verify your age securely",

  // Desktop QR
  scanQrInstruction: "Scan the QR code with Provii Wallet to verify your age",
  qrCodeAriaLabel: "QR code for age verification",
  shortCodeLabel: "Or enter this code manually:",
  verificationCodeAriaPrefix: "Verification code:",

  // QR toggle (mobile)
  qrToggleLabel: "Or scan with another device:",
  showQrCode: "Show QR Code",
  hideQrCode: "Hide QR Code",
  qrCodeUnavailable: "QR code unavailable",

  // Time notice
  timeNotice:
    "You have 5 minutes to complete verification. If time runs out, you will need to start a new verification.",

  // Help link
  needHelp: "Need help?",
  needHelpAriaLabel: "Need help with age verification? (opens in new tab)",

  // Footer
  poweredBy: "Powered by",
  footerSubtitle: "Privacy preserving age verification",
  privacyPolicyLinkLabel: "Privacy policy",

  // Overlay loading
  loading: "Loading...",
  initialisingVerification: "Initialising age verification...",
  completingVerification: "Completing verification...",

  // Status messages
  stillWaiting: "Still waiting for verification...",
  proofReceivedConfirming: "Proof received, confirming verification...",
  verificationTimedOut:
    "Verification timed out. Please refresh the page to try again.",
  sessionExpired:
    "Verification session expired. Please refresh the page to try again.",
  somethingWentWrong:
    "Something went wrong. Please refresh the page to try again.",

  // Error state
  errorTitle: "Age Verification Error",
  tryAgain: "Try Again",

  // Sandbox
  sandboxTesting: "Sandbox Testing",
  simulatePass: "\u2713 Simulate Pass",
  simulateFail: "\u2717 Simulate Fail",
  simulatePassAriaLabel: "Simulate successful age verification",
  simulateFailAriaLabel: "Simulate failed age verification",
  simulating: "Simulating...",

  // Retry hint
  timeoutHint: "Make sure Provii Wallet is open and ready",

  // Escape hatch
  leaveSite: "Leave this site",

  // Accessibility
  ageVerificationRegion: "Age verification",
  closeVerification: "Close age verification",
};
