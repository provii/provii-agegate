// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

import type { LocaleStrings } from "../types.js";

/** German (Deutsch) */
export const de: LocaleStrings = {
  headerTitle: "Altersverifizierung",
  headerSubtitle: "Verifizieren Sie Ihr Alter vertraulich",
  headerSubtitlePreparing: "Sichere Verifizierung wird vorbereitet...",

  verifyOverAge: "Best\u00e4tigen Sie, dass Sie {age} oder \u00e4lter sind",
  verifyUnderAge: "Best\u00e4tigen Sie, dass Sie unter {age} sind",

  verifyButtonLabel: "Mit Provii Wallet verifizieren",
  verifyButtonAriaLabel: "Mit Provii Wallet verifizieren (\u00f6ffnet die App)",
  verifyButtonOpening: "Provii Wallet wird ge\u00f6ffnet...",
  verifyButtonChecking: "Verifizierung wird \u00fcberpr\u00fcft...",
  mobileStatusTap: "Tippen, um Ihr Alter sicher zu verifizieren",

  scanQrInstruction:
    "Scannen Sie den QR-Code mit Provii Wallet, um Ihr Alter zu verifizieren",
  qrCodeAriaLabel: "QR-Code f\u00fcr die Altersverifizierung",
  shortCodeLabel: "Oder geben Sie diesen Code manuell ein:",
  verificationCodeAriaPrefix: "Verifizierungscode:",

  qrToggleLabel: "Oder mit einem anderen Ger\u00e4t scannen:",
  showQrCode: "QR-Code anzeigen",
  hideQrCode: "QR-Code ausblenden",
  qrCodeUnavailable: "QR-Code nicht verf\u00fcgbar",

  timeNotice:
    "Sie haben 5 Minuten Zeit, um die Verifizierung abzuschlie\u00dfen. Bei Zeit\u00fcberschreitung m\u00fcssen Sie eine neue Verifizierung starten.",

  needHelp: "Hilfe ben\u00f6tigt?",
  needHelpAriaLabel:
    "Hilfe bei der Altersverifizierung? (\u00f6ffnet neuen Tab)",

  poweredBy: "Betrieben von",
  footerSubtitle: "Datenschutzfreundliche Altersverifizierung",
  privacyPolicyLinkLabel: "Datenschutzerkl\u00e4rung",

  loading: "Wird geladen...",
  initialisingVerification: "Altersverifizierung wird initialisiert...",
  completingVerification: "Verifizierung wird abgeschlossen...",

  stillWaiting: "Warte noch auf Verifizierung...",
  proofReceivedConfirming: "Nachweis erhalten, Best\u00e4tigung l\u00e4uft...",
  verificationTimedOut:
    "Verifizierung abgelaufen. Bitte laden Sie die Seite neu.",
  sessionExpired:
    "Verifizierungssitzung abgelaufen. Bitte laden Sie die Seite neu.",
  somethingWentWrong:
    "Etwas ist schiefgelaufen. Bitte laden Sie die Seite neu.",

  errorTitle: "Fehler bei der Altersverifizierung",
  tryAgain: "Erneut versuchen",

  sandboxTesting: "Sandbox-Test",
  simulatePass: "\u2713 Erfolg simulieren",
  simulateFail: "\u2717 Fehlschlag simulieren",
  simulatePassAriaLabel: "Erfolgreiche Altersverifizierung simulieren",
  simulateFailAriaLabel: "Fehlgeschlagene Altersverifizierung simulieren",
  simulating: "Wird simuliert...",

  timeoutHint:
    "Stellen Sie sicher, dass Provii Wallet ge\u00f6ffnet und bereit ist",

  leaveSite: "Seite verlassen",

  ageVerificationRegion: "Altersverifizierung",
  closeVerification: "Altersverifizierung schlie\u00dfen",
};
