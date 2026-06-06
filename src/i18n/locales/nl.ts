// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

import type { LocaleStrings } from "../types.js";

/** Dutch (Nederlands) */
export const nl: LocaleStrings = {
  headerTitle: "Leeftijdsverificatie",
  headerSubtitle: "Verifieer uw leeftijd priv\u00e9",
  headerSubtitlePreparing: "Veilige verificatie wordt voorbereid...",

  verifyOverAge: "Verifieer dat u {age} jaar of ouder bent",
  verifyUnderAge: "Verifieer dat u jonger bent dan {age} jaar",

  verifyButtonLabel: "Verifieer met Provii Wallet",
  verifyButtonAriaLabel: "Verifieer met Provii Wallet (opent de app)",
  verifyButtonOpening: "Provii Wallet wordt geopend...",
  verifyButtonChecking: "Verificatie wordt gecontroleerd...",
  mobileStatusTap: "Tik om uw leeftijd veilig te verifi\u00ebren",

  scanQrInstruction:
    "Scan de QR-code met Provii Wallet om uw leeftijd te verifi\u00ebren",
  qrCodeAriaLabel: "QR-code voor leeftijdsverificatie",
  shortCodeLabel: "Of voer deze code handmatig in:",
  verificationCodeAriaPrefix: "Verificatiecode:",

  qrToggleLabel: "Of scan met een ander apparaat:",
  showQrCode: "QR-code tonen",
  hideQrCode: "QR-code verbergen",
  qrCodeUnavailable: "QR-code niet beschikbaar",

  timeNotice:
    "U heeft 5 minuten om de verificatie te voltooien. Als de tijd verstrijkt, moet u een nieuwe verificatie starten.",

  needHelp: "Hulp nodig?",
  needHelpAriaLabel:
    "Hulp nodig bij leeftijdsverificatie? (opent in nieuw tabblad)",

  poweredBy: "Mogelijk gemaakt door",
  footerSubtitle: "Privacyvriendelijke leeftijdsverificatie",
  privacyPolicyLinkLabel: "Privacybeleid",

  loading: "Laden...",
  initialisingVerification:
    "Leeftijdsverificatie wordt ge\u00efnitialiseerd...",
  completingVerification: "Verificatie wordt afgerond...",

  stillWaiting: "Nog steeds wachtend op verificatie...",
  proofReceivedConfirming: "Bewijs ontvangen, bevestiging loopt...",
  verificationTimedOut:
    "Verificatie verlopen. Vernieuw de pagina om het opnieuw te proberen.",
  sessionExpired:
    "Verificatiesessie verlopen. Vernieuw de pagina om het opnieuw te proberen.",
  somethingWentWrong:
    "Er is iets misgegaan. Vernieuw de pagina om het opnieuw te proberen.",

  errorTitle: "Fout bij leeftijdsverificatie",
  tryAgain: "Opnieuw proberen",

  sandboxTesting: "Sandbox-test",
  simulatePass: "\u2713 Succes simuleren",
  simulateFail: "\u2717 Fout simuleren",
  simulatePassAriaLabel: "Succesvolle leeftijdsverificatie simuleren",
  simulateFailAriaLabel: "Mislukte leeftijdsverificatie simuleren",
  simulating: "Simuleren...",

  timeoutHint: "Zorg ervoor dat Provii Wallet geopend en gereed is",

  leaveSite: "Verlaat deze site",

  ageVerificationRegion: "Leeftijdsverificatie",
  closeVerification: "Leeftijdsverificatie sluiten",
};
