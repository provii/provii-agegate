/**
 * @jest-environment jsdom
 */

import { ar } from "../src/i18n/locales/ar.js";
import { de } from "../src/i18n/locales/de.js";
import { es } from "../src/i18n/locales/es.js";
import { fr } from "../src/i18n/locales/fr.js";
import { hi } from "../src/i18n/locales/hi.js";
import { it as itLocale } from "../src/i18n/locales/it.js";
import { ja } from "../src/i18n/locales/ja.js";
import { ko } from "../src/i18n/locales/ko.js";
import { nl } from "../src/i18n/locales/nl.js";
import { pl } from "../src/i18n/locales/pl.js";
import { pt } from "../src/i18n/locales/pt.js";
import { ru } from "../src/i18n/locales/ru.js";
import { tr } from "../src/i18n/locales/tr.js";
import { zh } from "../src/i18n/locales/zh.js";

describe("ar locale pinned values", () => {
  it("headerTitle through scanQrInstruction", () => {
    expect(ar.headerTitle).toBe("\u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0639\u0645\u0631");
    expect(ar.headerSubtitle).toBe("\u062a\u062d\u0642\u0642 \u0645\u0646 \u0639\u0645\u0631\u0643 \u0628\u062e\u0635\u0648\u0635\u064a\u0629");
    expect(ar.headerSubtitlePreparing).toBe("\u062c\u0627\u0631\u064d \u0625\u0639\u062f\u0627\u062f \u0627\u0644\u062a\u062d\u0642\u0642 \u0627\u0644\u0622\u0645\u0646...");
    expect(ar.verifyOverAge).toBe("\u062a\u062d\u0642\u0642 \u0645\u0646 \u0623\u0646 \u0639\u0645\u0631\u0643 {age} \u0633\u0646\u0629 \u0623\u0648 \u0623\u0643\u062b\u0631");
    expect(ar.verifyUnderAge).toBe("\u062a\u062d\u0642\u0642 \u0645\u0646 \u0623\u0646 \u0639\u0645\u0631\u0643 \u0623\u0642\u0644 \u0645\u0646 {age} \u0633\u0646\u0629");
    expect(ar.verifyButtonLabel).toBe("\u062a\u062d\u0642\u0642 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 Provii Wallet");
    expect(ar.verifyButtonAriaLabel).toBe("\u062a\u062d\u0642\u0642 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 Provii Wallet (\u064a\u0641\u062a\u062d \u0627\u0644\u062a\u0637\u0628\u064a\u0642)");
    expect(ar.verifyButtonOpening).toBe("\u062c\u0627\u0631\u064d \u0641\u062a\u062d Provii Wallet...");
    expect(ar.verifyButtonChecking).toBe("\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u062d\u0642\u0642...");
    expect(ar.mobileStatusTap).toBe("\u0627\u0646\u0642\u0631 \u0644\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0639\u0645\u0631\u0643 \u0628\u0623\u0645\u0627\u0646");
    expect(ar.scanQrInstruction).toBe("\u0627\u0645\u0633\u062d \u0631\u0645\u0632 QR \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 Provii Wallet \u0644\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0639\u0645\u0631\u0643");
  });

  it("qrCodeAriaLabel through poweredBy", () => {
    expect(ar.qrCodeAriaLabel).toBe("\u0631\u0645\u0632 QR \u0644\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0639\u0645\u0631");
    expect(ar.shortCodeLabel).toBe("\u0623\u0648 \u0623\u062f\u062e\u0644 \u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u064a\u062f\u0648\u064a\u064b\u0627:");
    expect(ar.verificationCodeAriaPrefix).toBe("\u0631\u0645\u0632 \u0627\u0644\u062a\u062d\u0642\u0642:");
    expect(ar.qrToggleLabel).toBe("\u0623\u0648 \u0627\u0645\u0633\u062d \u0628\u062c\u0647\u0627\u0632 \u0622\u062e\u0631:");
    expect(ar.showQrCode).toBe("\u0625\u0638\u0647\u0627\u0631 \u0631\u0645\u0632 QR");
    expect(ar.hideQrCode).toBe("\u0625\u062e\u0641\u0627\u0621 \u0631\u0645\u0632 QR");
    expect(ar.qrCodeUnavailable).toBe("\u0631\u0645\u0632 QR \u063a\u064a\u0631 \u0645\u062a\u0627\u062d");
    expect(ar.timeNotice).toBe("\u0644\u062f\u064a\u0643 5 \u062f\u0642\u0627\u0626\u0642 \u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062a\u062d\u0642\u0642. \u0625\u0630\u0627 \u0627\u0646\u062a\u0647\u0649 \u0627\u0644\u0648\u0642\u062a\u060c \u0633\u062a\u062d\u062a\u0627\u062c \u0625\u0644\u0649 \u0628\u062f\u0621 \u062a\u062d\u0642\u0642 \u062c\u062f\u064a\u062f.");
    expect(ar.needHelp).toBe("\u0647\u0644 \u062a\u062d\u062a\u0627\u062c \u0645\u0633\u0627\u0639\u062f\u0629\u061f");
    expect(ar.needHelpAriaLabel).toBe("\u0647\u0644 \u062a\u062d\u062a\u0627\u062c \u0645\u0633\u0627\u0639\u062f\u0629 \u0641\u064a \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0639\u0645\u0631\u061f (\u064a\u0641\u062a\u062d \u0641\u064a \u0639\u0644\u0627\u0645\u0629 \u062a\u0628\u0648\u064a\u0628 \u062c\u062f\u064a\u062f\u0629)");
    expect(ar.poweredBy).toBe("\u0628\u062f\u0639\u0645 \u0645\u0646");
  });

  it("footerSubtitle through errorTitle", () => {
    expect(ar.footerSubtitle).toBe("\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0639\u0645\u0631 \u064a\u062d\u0641\u0638 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629");
    expect(ar.privacyPolicyLinkLabel).toBe("\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629");
    expect(ar.loading).toBe("\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u062d\u0645\u064a\u0644...");
    expect(ar.initialisingVerification).toBe("\u062c\u0627\u0631\u064d \u062a\u0647\u064a\u0626\u0629 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0639\u0645\u0631...");
    expect(ar.completingVerification).toBe("\u062c\u0627\u0631\u064d \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062a\u062d\u0642\u0642...");
    expect(ar.stillWaiting).toBe("\u0644\u0627 \u064a\u0632\u0627\u0644 \u0641\u064a \u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062a\u062d\u0642\u0642...");
    expect(ar.proofReceivedConfirming).toBe("\u062a\u0645 \u0627\u0633\u062a\u0644\u0627\u0645 \u0627\u0644\u0625\u062b\u0628\u0627\u062a\u060c \u062c\u0627\u0631\u064d \u0627\u0644\u062a\u0623\u0643\u064a\u062f...");
    expect(ar.verificationTimedOut).toBe("\u0627\u0646\u062a\u0647\u062a \u0645\u0647\u0644\u0629 \u0627\u0644\u062a\u062d\u0642\u0642. \u064a\u0631\u062c\u0649 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0635\u0641\u062d\u0629 \u0644\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.");
    expect(ar.sessionExpired).toBe("\u0627\u0646\u062a\u0647\u062a \u062c\u0644\u0633\u0629 \u0627\u0644\u062a\u062d\u0642\u0642. \u064a\u0631\u062c\u0649 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0635\u0641\u062d\u0629 \u0644\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.");
    expect(ar.somethingWentWrong).toBe("\u062d\u062f\u062b \u062e\u0637\u0623 \u0645\u0627. \u064a\u0631\u062c\u0649 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0635\u0641\u062d\u0629 \u0644\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.");
    expect(ar.errorTitle).toBe("\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0639\u0645\u0631");
  });

  it("tryAgain through closeVerification", () => {
    expect(ar.tryAgain).toBe("\u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649");
    expect(ar.sandboxTesting).toBe("\u0627\u062e\u062a\u0628\u0627\u0631 \u0627\u0644\u0628\u064a\u0626\u0629 \u0627\u0644\u062a\u062c\u0631\u064a\u0628\u064a\u0629");
    expect(ar.simulatePass).toBe("\u2713 \u0645\u062d\u0627\u0643\u0627\u0629 \u0627\u0644\u0646\u062c\u0627\u062d");
    expect(ar.simulateFail).toBe("\u2717 \u0645\u062d\u0627\u0643\u0627\u0629 \u0627\u0644\u0641\u0634\u0644");
    expect(ar.simulatePassAriaLabel).toBe("\u0645\u062d\u0627\u0643\u0627\u0629 \u0627\u0644\u062a\u062d\u0642\u0642 \u0627\u0644\u0646\u0627\u062c\u062d \u0645\u0646 \u0627\u0644\u0639\u0645\u0631");
    expect(ar.simulateFailAriaLabel).toBe("\u0645\u062d\u0627\u0643\u0627\u0629 \u0641\u0634\u0644 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0639\u0645\u0631");
    expect(ar.simulating).toBe("\u062c\u0627\u0631\u064d \u0627\u0644\u0645\u062d\u0627\u0643\u0627\u0629...");
    expect(ar.timeoutHint).toBe("\u062a\u0623\u0643\u062f \u0645\u0646 \u0623\u0646 Provii Wallet \u0645\u0641\u062a\u0648\u062d \u0648\u062c\u0627\u0647\u0632");
    expect(ar.leaveSite).toBe("\u063a\u0627\u062f\u0631 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639");
    expect(ar.ageVerificationRegion).toBe("\u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0639\u0645\u0631");
    expect(ar.closeVerification).toBe("\u0625\u063a\u0644\u0627\u0642 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0639\u0645\u0631");
  });

});

describe("de locale pinned values", () => {
  it("headerTitle through scanQrInstruction", () => {
    expect(de.headerTitle).toBe("Altersverifizierung");
    expect(de.headerSubtitle).toBe("Verifizieren Sie Ihr Alter vertraulich");
    expect(de.headerSubtitlePreparing).toBe("Sichere Verifizierung wird vorbereitet...");
    expect(de.verifyOverAge).toBe("Best\u00e4tigen Sie, dass Sie {age} oder \u00e4lter sind");
    expect(de.verifyUnderAge).toBe("Best\u00e4tigen Sie, dass Sie unter {age} sind");
    expect(de.verifyButtonLabel).toBe("Mit Provii Wallet verifizieren");
    expect(de.verifyButtonAriaLabel).toBe("Mit Provii Wallet verifizieren (\u00f6ffnet die App)");
    expect(de.verifyButtonOpening).toBe("Provii Wallet wird ge\u00f6ffnet...");
    expect(de.verifyButtonChecking).toBe("Verifizierung wird \u00fcberpr\u00fcft...");
    expect(de.mobileStatusTap).toBe("Tippen, um Ihr Alter sicher zu verifizieren");
    expect(de.scanQrInstruction).toBe("Scannen Sie den QR-Code mit Provii Wallet, um Ihr Alter zu verifizieren");
  });

  it("qrCodeAriaLabel through poweredBy", () => {
    expect(de.qrCodeAriaLabel).toBe("QR-Code f\u00fcr die Altersverifizierung");
    expect(de.shortCodeLabel).toBe("Oder geben Sie diesen Code manuell ein:");
    expect(de.verificationCodeAriaPrefix).toBe("Verifizierungscode:");
    expect(de.qrToggleLabel).toBe("Oder mit einem anderen Ger\u00e4t scannen:");
    expect(de.showQrCode).toBe("QR-Code anzeigen");
    expect(de.hideQrCode).toBe("QR-Code ausblenden");
    expect(de.qrCodeUnavailable).toBe("QR-Code nicht verf\u00fcgbar");
    expect(de.timeNotice).toBe("Sie haben 5 Minuten Zeit, um die Verifizierung abzuschlie\u00dfen. Bei Zeit\u00fcberschreitung m\u00fcssen Sie eine neue Verifizierung starten.");
    expect(de.needHelp).toBe("Hilfe ben\u00f6tigt?");
    expect(de.needHelpAriaLabel).toBe("Hilfe bei der Altersverifizierung? (\u00f6ffnet neuen Tab)");
    expect(de.poweredBy).toBe("Betrieben von");
  });

  it("footerSubtitle through errorTitle", () => {
    expect(de.footerSubtitle).toBe("Datenschutzfreundliche Altersverifizierung");
    expect(de.privacyPolicyLinkLabel).toBe("Datenschutzerkl\u00e4rung");
    expect(de.loading).toBe("Wird geladen...");
    expect(de.initialisingVerification).toBe("Altersverifizierung wird initialisiert...");
    expect(de.completingVerification).toBe("Verifizierung wird abgeschlossen...");
    expect(de.stillWaiting).toBe("Warte noch auf Verifizierung...");
    expect(de.proofReceivedConfirming).toBe("Nachweis erhalten, Best\u00e4tigung l\u00e4uft...");
    expect(de.verificationTimedOut).toBe("Verifizierung abgelaufen. Bitte laden Sie die Seite neu.");
    expect(de.sessionExpired).toBe("Verifizierungssitzung abgelaufen. Bitte laden Sie die Seite neu.");
    expect(de.somethingWentWrong).toBe("Etwas ist schiefgelaufen. Bitte laden Sie die Seite neu.");
    expect(de.errorTitle).toBe("Fehler bei der Altersverifizierung");
  });

  it("tryAgain through closeVerification", () => {
    expect(de.tryAgain).toBe("Erneut versuchen");
    expect(de.sandboxTesting).toBe("Sandbox-Test");
    expect(de.simulatePass).toBe("\u2713 Erfolg simulieren");
    expect(de.simulateFail).toBe("\u2717 Fehlschlag simulieren");
    expect(de.simulatePassAriaLabel).toBe("Erfolgreiche Altersverifizierung simulieren");
    expect(de.simulateFailAriaLabel).toBe("Fehlgeschlagene Altersverifizierung simulieren");
    expect(de.simulating).toBe("Wird simuliert...");
    expect(de.timeoutHint).toBe("Stellen Sie sicher, dass Provii Wallet ge\u00f6ffnet und bereit ist");
    expect(de.leaveSite).toBe("Seite verlassen");
    expect(de.ageVerificationRegion).toBe("Altersverifizierung");
    expect(de.closeVerification).toBe("Altersverifizierung schlie\u00dfen");
  });

});

describe("es locale pinned values", () => {
  it("headerTitle through scanQrInstruction", () => {
    expect(es.headerTitle).toBe("Verificaci\u00f3n de edad");
    expect(es.headerSubtitle).toBe("Verifica tu edad de forma privada");
    expect(es.headerSubtitlePreparing).toBe("Preparando verificaci\u00f3n segura...");
    expect(es.verifyOverAge).toBe("Verifica que tienes {age} a\u00f1os o m\u00e1s");
    expect(es.verifyUnderAge).toBe("Verifica que tienes menos de {age} a\u00f1os");
    expect(es.verifyButtonLabel).toBe("Verificar con Provii Wallet");
    expect(es.verifyButtonAriaLabel).toBe("Verificar con Provii Wallet (abre la aplicaci\u00f3n)");
    expect(es.verifyButtonOpening).toBe("Abriendo Provii Wallet...");
    expect(es.verifyButtonChecking).toBe("Comprobando verificaci\u00f3n...");
    expect(es.mobileStatusTap).toBe("Toca para verificar tu edad de forma segura");
    expect(es.scanQrInstruction).toBe("Escanea el c\u00f3digo QR con Provii Wallet para verificar tu edad");
  });

  it("qrCodeAriaLabel through poweredBy", () => {
    expect(es.qrCodeAriaLabel).toBe("C\u00f3digo QR para la verificaci\u00f3n de edad");
    expect(es.shortCodeLabel).toBe("O introduce este c\u00f3digo manualmente:");
    expect(es.verificationCodeAriaPrefix).toBe("C\u00f3digo de verificaci\u00f3n:");
    expect(es.qrToggleLabel).toBe("O escanea con otro dispositivo:");
    expect(es.showQrCode).toBe("Mostrar c\u00f3digo QR");
    expect(es.hideQrCode).toBe("Ocultar c\u00f3digo QR");
    expect(es.qrCodeUnavailable).toBe("C\u00f3digo QR no disponible");
    expect(es.timeNotice).toBe("Tienes 5 minutos para completar la verificaci\u00f3n. Si se acaba el tiempo, tendr\u00e1s que iniciar una nueva verificaci\u00f3n.");
    expect(es.needHelp).toBe("\u00bfNecesitas ayuda?");
    expect(es.needHelpAriaLabel).toBe("\u00bfNecesitas ayuda con la verificaci\u00f3n de edad? (abre en nueva pesta\u00f1a)");
    expect(es.poweredBy).toBe("Desarrollado por");
  });

  it("footerSubtitle through errorTitle", () => {
    expect(es.footerSubtitle).toBe("Verificaci\u00f3n de edad que preserva la privacidad");
    expect(es.privacyPolicyLinkLabel).toBe("Pol\u00edtica de privacidad");
    expect(es.loading).toBe("Cargando...");
    expect(es.initialisingVerification).toBe("Iniciando verificaci\u00f3n de edad...");
    expect(es.completingVerification).toBe("Completando verificaci\u00f3n...");
    expect(es.stillWaiting).toBe("A\u00fan esperando la verificaci\u00f3n...");
    expect(es.proofReceivedConfirming).toBe("Prueba recibida, confirmando verificaci\u00f3n...");
    expect(es.verificationTimedOut).toBe("La verificaci\u00f3n ha expirado. Actualiza la p\u00e1gina para intentarlo de nuevo.");
    expect(es.sessionExpired).toBe("La sesi\u00f3n de verificaci\u00f3n ha expirado. Actualiza la p\u00e1gina para intentarlo de nuevo.");
    expect(es.somethingWentWrong).toBe("Algo sali\u00f3 mal. Actualiza la p\u00e1gina para intentarlo de nuevo.");
    expect(es.errorTitle).toBe("Error de verificaci\u00f3n de edad");
  });

  it("tryAgain through closeVerification", () => {
    expect(es.tryAgain).toBe("Intentar de nuevo");
    expect(es.sandboxTesting).toBe("Pruebas en sandbox");
    expect(es.simulatePass).toBe("\u2713 Simular \u00e9xito");
    expect(es.simulateFail).toBe("\u2717 Simular fallo");
    expect(es.simulatePassAriaLabel).toBe("Simular verificaci\u00f3n de edad exitosa");
    expect(es.simulateFailAriaLabel).toBe("Simular verificaci\u00f3n de edad fallida");
    expect(es.simulating).toBe("Simulando...");
    expect(es.timeoutHint).toBe("Aseg\u00farate de que Provii Wallet est\u00e9 abierto y listo");
    expect(es.leaveSite).toBe("Abandonar este sitio");
    expect(es.ageVerificationRegion).toBe("Verificaci\u00f3n de edad");
    expect(es.closeVerification).toBe("Cerrar verificaci\u00f3n de edad");
  });

});

describe("fr locale pinned values", () => {
  it("headerTitle through scanQrInstruction", () => {
    expect(fr.headerTitle).toBe("V\u00e9rification de l\u2019\u00e2ge");
    expect(fr.headerSubtitle).toBe("V\u00e9rifiez votre \u00e2ge en toute confidentialit\u00e9");
    expect(fr.headerSubtitlePreparing).toBe("Pr\u00e9paration de la v\u00e9rification s\u00e9curis\u00e9e...");
    expect(fr.verifyOverAge).toBe("V\u00e9rifiez que vous avez {age} ans ou plus");
    expect(fr.verifyUnderAge).toBe("V\u00e9rifiez que vous avez moins de {age} ans");
    expect(fr.verifyButtonLabel).toBe("V\u00e9rifier avec Provii Wallet");
    expect(fr.verifyButtonAriaLabel).toBe("V\u00e9rifier avec Provii Wallet (ouvre l\u2019application)");
    expect(fr.verifyButtonOpening).toBe("Ouverture de Provii Wallet...");
    expect(fr.verifyButtonChecking).toBe("V\u00e9rification en cours...");
    expect(fr.mobileStatusTap).toBe("Appuyez pour v\u00e9rifier votre \u00e2ge en toute s\u00e9curit\u00e9");
    expect(fr.scanQrInstruction).toBe("Scannez le code QR avec Provii Wallet pour v\u00e9rifier votre \u00e2ge");
  });

  it("qrCodeAriaLabel through poweredBy", () => {
    expect(fr.qrCodeAriaLabel).toBe("Code QR pour la v\u00e9rification de l\u2019\u00e2ge");
    expect(fr.shortCodeLabel).toBe("Ou entrez ce code manuellement :");
    expect(fr.verificationCodeAriaPrefix).toBe("Code de v\u00e9rification :");
    expect(fr.qrToggleLabel).toBe("Ou scannez avec un autre appareil :");
    expect(fr.showQrCode).toBe("Afficher le code QR");
    expect(fr.hideQrCode).toBe("Masquer le code QR");
    expect(fr.qrCodeUnavailable).toBe("Code QR indisponible");
    expect(fr.timeNotice).toBe("Vous disposez de 5 minutes pour terminer la v\u00e9rification. Si le temps est \u00e9coul\u00e9, vous devrez recommencer.");
    expect(fr.needHelp).toBe("Besoin d\u2019aide ?");
    expect(fr.needHelpAriaLabel).toBe("Besoin d\u2019aide pour la v\u00e9rification de l\u2019\u00e2ge ? (ouvre un nouvel onglet)");
    expect(fr.poweredBy).toBe("Propuls\u00e9 par");
  });

  it("footerSubtitle through errorTitle", () => {
    expect(fr.footerSubtitle).toBe("V\u00e9rification de l\u2019\u00e2ge respectueuse de la vie priv\u00e9e");
    expect(fr.privacyPolicyLinkLabel).toBe("Politique de confidentialit\u00e9");
    expect(fr.loading).toBe("Chargement...");
    expect(fr.initialisingVerification).toBe("Initialisation de la v\u00e9rification de l\u2019\u00e2ge...");
    expect(fr.completingVerification).toBe("Finalisation de la v\u00e9rification...");
    expect(fr.stillWaiting).toBe("Toujours en attente de v\u00e9rification...");
    expect(fr.proofReceivedConfirming).toBe("Preuve re\u00e7ue, confirmation en cours...");
    expect(fr.verificationTimedOut).toBe("La v\u00e9rification a expir\u00e9. Veuillez actualiser la page pour r\u00e9essayer.");
    expect(fr.sessionExpired).toBe("La session de v\u00e9rification a expir\u00e9. Veuillez actualiser la page pour r\u00e9essayer.");
    expect(fr.somethingWentWrong).toBe("Une erreur s\u2019est produite. Veuillez actualiser la page pour r\u00e9essayer.");
    expect(fr.errorTitle).toBe("Erreur de v\u00e9rification de l\u2019\u00e2ge");
  });

  it("tryAgain through closeVerification", () => {
    expect(fr.tryAgain).toBe("R\u00e9essayer");
    expect(fr.sandboxTesting).toBe("Test en bac \u00e0 sable");
    expect(fr.simulatePass).toBe("\u2713 Simuler la r\u00e9ussite");
    expect(fr.simulateFail).toBe("\u2717 Simuler l\u2019\u00e9chec");
    expect(fr.simulatePassAriaLabel).toBe("Simuler une v\u00e9rification d\u2019\u00e2ge r\u00e9ussie");
    expect(fr.simulateFailAriaLabel).toBe("Simuler une v\u00e9rification d\u2019\u00e2ge \u00e9chou\u00e9e");
    expect(fr.simulating).toBe("Simulation...");
    expect(fr.timeoutHint).toBe("Assurez-vous que Provii Wallet est ouvert et pr\u00eat");
    expect(fr.leaveSite).toBe("Quitter ce site");
    expect(fr.ageVerificationRegion).toBe("V\u00e9rification de l\u2019\u00e2ge");
    expect(fr.closeVerification).toBe("Fermer la v\u00e9rification de l\u2019\u00e2ge");
  });

});

describe("hi locale pinned values", () => {
  it("headerTitle through scanQrInstruction", () => {
    expect(hi.headerTitle).toBe("\u0906\u092f\u0941 \u0938\u0924\u094d\u092f\u093e\u092a\u0928");
    expect(hi.headerSubtitle).toBe("\u0917\u094b\u092a\u0928\u0940\u092f\u0924\u093e \u0938\u0947 \u0905\u092a\u0928\u0940 \u0906\u092f\u0941 \u0938\u0924\u094d\u092f\u093e\u092a\u093f\u0924 \u0915\u0930\u0947\u0902");
    expect(hi.headerSubtitlePreparing).toBe("\u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924 \u0938\u0924\u094d\u092f\u093e\u092a\u0928 \u0924\u0948\u092f\u093e\u0930 \u0915\u093f\u092f\u093e \u091c\u093e \u0930\u0939\u093e \u0939\u0948...");
    expect(hi.verifyOverAge).toBe("\u0938\u0924\u094d\u092f\u093e\u092a\u093f\u0924 \u0915\u0930\u0947\u0902 \u0915\u093f \u0906\u092a\u0915\u0940 \u0906\u092f\u0941 {age} \u0935\u0930\u094d\u0937 \u092f\u093e \u0905\u0927\u093f\u0915 \u0939\u0948");
    expect(hi.verifyUnderAge).toBe("\u0938\u0924\u094d\u092f\u093e\u092a\u093f\u0924 \u0915\u0930\u0947\u0902 \u0915\u093f \u0906\u092a\u0915\u0940 \u0906\u092f\u0941 {age} \u0935\u0930\u094d\u0937 \u0938\u0947 \u0915\u092e \u0939\u0948");
    expect(hi.verifyButtonLabel).toBe("Provii Wallet \u0938\u0947 \u0938\u0924\u094d\u092f\u093e\u092a\u093f\u0924 \u0915\u0930\u0947\u0902");
    expect(hi.verifyButtonAriaLabel).toBe("Provii Wallet \u0938\u0947 \u0938\u0924\u094d\u092f\u093e\u092a\u093f\u0924 \u0915\u0930\u0947\u0902 (\u0910\u092a \u0916\u094b\u0932\u0924\u093e \u0939\u0948)");
    expect(hi.verifyButtonOpening).toBe("Provii Wallet \u0916\u094b\u0932\u093e \u091c\u093e \u0930\u0939\u093e \u0939\u0948...");
    expect(hi.verifyButtonChecking).toBe("\u0938\u0924\u094d\u092f\u093e\u092a\u0928 \u091c\u093e\u0901\u091a\u093e \u091c\u093e \u0930\u0939\u093e \u0939\u0948...");
    expect(hi.mobileStatusTap).toBe("\u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924 \u0930\u0942\u092a \u0938\u0947 \u0905\u092a\u0928\u0940 \u0906\u092f\u0941 \u0938\u0924\u094d\u092f\u093e\u092a\u093f\u0924 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u091f\u0948\u092a \u0915\u0930\u0947\u0902");
    expect(hi.scanQrInstruction).toBe("\u0905\u092a\u0928\u0940 \u0906\u092f\u0941 \u0938\u0924\u094d\u092f\u093e\u092a\u093f\u0924 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f Provii Wallet \u0938\u0947 QR \u0915\u094b\u0921 \u0938\u094d\u0915\u0948\u0928 \u0915\u0930\u0947\u0902");
  });

  it("qrCodeAriaLabel through poweredBy", () => {
    expect(hi.qrCodeAriaLabel).toBe("\u0906\u092f\u0941 \u0938\u0924\u094d\u092f\u093e\u092a\u0928 \u0915\u0947 \u0932\u093f\u090f QR \u0915\u094b\u0921");
    expect(hi.shortCodeLabel).toBe("\u092f\u093e \u092f\u0939 \u0915\u094b\u0921 \u092e\u0948\u0928\u094d\u092f\u0941\u0905\u0932 \u0930\u0942\u092a \u0938\u0947 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902:");
    expect(hi.verificationCodeAriaPrefix).toBe("\u0938\u0924\u094d\u092f\u093e\u092a\u0928 \u0915\u094b\u0921:");
    expect(hi.qrToggleLabel).toBe("\u092f\u093e \u0915\u093f\u0938\u0940 \u0905\u0928\u094d\u092f \u0921\u093f\u0935\u093e\u0907\u0938 \u0938\u0947 \u0938\u094d\u0915\u0948\u0928 \u0915\u0930\u0947\u0902:");
    expect(hi.showQrCode).toBe("QR \u0915\u094b\u0921 \u0926\u093f\u0916\u093e\u090f\u0902");
    expect(hi.hideQrCode).toBe("QR \u0915\u094b\u0921 \u091b\u0941\u092a\u093e\u090f\u0902");
    expect(hi.qrCodeUnavailable).toBe("QR \u0915\u094b\u0921 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902");
    expect(hi.timeNotice).toBe("\u0938\u0924\u094d\u092f\u093e\u092a\u0928 \u092a\u0942\u0930\u093e \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0906\u092a\u0915\u0947 \u092a\u093e\u0938 5 \u092e\u093f\u0928\u091f \u0939\u0948\u0902\u0964 \u092f\u0926\u093f \u0938\u092e\u092f \u0938\u092e\u093e\u092a\u094d\u0924 \u0939\u094b \u091c\u093e\u0924\u093e \u0939\u0948, \u0924\u094b \u0906\u092a\u0915\u094b \u0928\u092f\u093e \u0938\u0924\u094d\u092f\u093e\u092a\u0928 \u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u093e \u0939\u094b\u0917\u093e\u0964");
    expect(hi.needHelp).toBe("\u0938\u0939\u093e\u092f\u0924\u093e \u091a\u093e\u0939\u093f\u090f?");
    expect(hi.needHelpAriaLabel).toBe("\u0906\u092f\u0941 \u0938\u0924\u094d\u092f\u093e\u092a\u0928 \u092e\u0947\u0902 \u0938\u0939\u093e\u092f\u0924\u093e \u091a\u093e\u0939\u093f\u090f? (\u0928\u090f \u091f\u0948\u092c \u092e\u0947\u0902 \u0916\u0941\u0932\u0924\u093e \u0939\u0948)");
    expect(hi.poweredBy).toBe("\u0926\u094d\u0935\u093e\u0930\u093e \u0938\u0902\u091a\u093e\u0932\u093f\u0924:");
  });

  it("footerSubtitle through errorTitle", () => {
    expect(hi.footerSubtitle).toBe("\u0917\u094b\u092a\u0928\u0940\u092f\u0924\u093e \u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924 \u0906\u092f\u0941 \u0938\u0924\u094d\u092f\u093e\u092a\u0928");
    expect(hi.privacyPolicyLinkLabel).toBe("\u0917\u094b\u092a\u0928\u0940\u092f\u0924\u093e \u0928\u0940\u0924\u093f");
    expect(hi.loading).toBe("\u0932\u094b\u0921 \u0939\u094b \u0930\u0939\u093e \u0939\u0948...");
    expect(hi.initialisingVerification).toBe("\u0906\u092f\u0941 \u0938\u0924\u094d\u092f\u093e\u092a\u0928 \u0906\u0930\u0902\u092d \u0939\u094b \u0930\u0939\u093e \u0939\u0948...");
    expect(hi.completingVerification).toBe("\u0938\u0924\u094d\u092f\u093e\u092a\u0928 \u092a\u0942\u0930\u093e \u0939\u094b \u0930\u0939\u093e \u0939\u0948...");
    expect(hi.stillWaiting).toBe("\u0905\u092d\u0940 \u092d\u0940 \u0938\u0924\u094d\u092f\u093e\u092a\u0928 \u0915\u0940 \u092a\u094d\u0930\u0924\u0940\u0915\u094d\u0937\u093e \u0939\u0948...");
    expect(hi.proofReceivedConfirming).toBe("\u092a\u094d\u0930\u092e\u093e\u0923 \u092a\u094d\u0930\u093e\u092a\u094d\u0924, \u092a\u0941\u0937\u094d\u091f\u093f \u0939\u094b \u0930\u0939\u0940 \u0939\u0948...");
    expect(hi.verificationTimedOut).toBe("\u0938\u0924\u094d\u092f\u093e\u092a\u0928 \u0915\u093e \u0938\u092e\u092f \u0938\u092e\u093e\u092a\u094d\u0924 \u0939\u094b \u0917\u092f\u093e\u0964 \u092a\u0941\u0928\u0903 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u092a\u0947\u091c \u0930\u093f\u092b\u094d\u0930\u0947\u0936 \u0915\u0930\u0947\u0902\u0964");
    expect(hi.sessionExpired).toBe("\u0938\u0924\u094d\u092f\u093e\u092a\u0928 \u0938\u0924\u094d\u0930 \u0938\u092e\u093e\u092a\u094d\u0924 \u0939\u094b \u0917\u092f\u093e\u0964 \u092a\u0941\u0928\u0903 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u092a\u0947\u091c \u0930\u093f\u092b\u094d\u0930\u0947\u0936 \u0915\u0930\u0947\u0902\u0964");
    expect(hi.somethingWentWrong).toBe("\u0915\u0941\u091b \u0917\u0932\u0924 \u0939\u094b \u0917\u092f\u093e\u0964 \u092a\u0941\u0928\u0903 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u092a\u0947\u091c \u0930\u093f\u092b\u094d\u0930\u0947\u0936 \u0915\u0930\u0947\u0902\u0964");
    expect(hi.errorTitle).toBe("\u0906\u092f\u0941 \u0938\u0924\u094d\u092f\u093e\u092a\u0928 \u0924\u094d\u0930\u0941\u091f\u093f");
  });

  it("tryAgain through closeVerification", () => {
    expect(hi.tryAgain).toBe("\u092a\u0941\u0928\u0903 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0947\u0902");
    expect(hi.sandboxTesting).toBe("\u0938\u0948\u0902\u0921\u092c\u0949\u0915\u094d\u0938 \u092a\u0930\u0940\u0915\u094d\u0937\u0923");
    expect(hi.simulatePass).toBe("\u2713 \u0938\u092b\u0932\u0924\u093e \u0905\u0928\u0941\u0915\u0930\u0923");
    expect(hi.simulateFail).toBe("\u2717 \u0935\u093f\u092b\u0932\u0924\u093e \u0905\u0928\u0941\u0915\u0930\u0923");
    expect(hi.simulatePassAriaLabel).toBe("\u0938\u092b\u0932 \u0906\u092f\u0941 \u0938\u0924\u094d\u092f\u093e\u092a\u0928 \u0915\u093e \u0905\u0928\u0941\u0915\u0930\u0923");
    expect(hi.simulateFailAriaLabel).toBe("\u0935\u093f\u092b\u0932 \u0906\u092f\u0941 \u0938\u0924\u094d\u092f\u093e\u092a\u0928 \u0915\u093e \u0905\u0928\u0941\u0915\u0930\u0923");
    expect(hi.simulating).toBe("\u0905\u0928\u0941\u0915\u0930\u0923 \u0939\u094b \u0930\u0939\u093e \u0939\u0948...");
    expect(hi.timeoutHint).toBe("\u0938\u0941\u0928\u093f\u0936\u094d\u091a\u093f\u0924 \u0915\u0930\u0947\u0902 \u0915\u093f Provii Wallet \u0916\u0941\u0932\u093e \u0914\u0930 \u0924\u0948\u092f\u093e\u0930 \u0939\u0948");
    expect(hi.leaveSite).toBe("\u0907\u0938 \u0938\u093e\u0907\u091f \u0915\u094b \u091b\u094b\u0921\u093c\u0947\u0902");
    expect(hi.ageVerificationRegion).toBe("\u0906\u092f\u0941 \u0938\u0924\u094d\u092f\u093e\u092a\u0928");
    expect(hi.closeVerification).toBe("\u0906\u092f\u0941 \u0938\u0924\u094d\u092f\u093e\u092a\u0928 \u092c\u0902\u0926 \u0915\u0930\u0947\u0902");
  });

});

describe("it locale pinned values", () => {
  it("headerTitle through scanQrInstruction", () => {
    expect(itLocale.headerTitle).toBe("Verifica dell\u2019et\u00e0");
    expect(itLocale.headerSubtitle).toBe("Verifica la tua et\u00e0 in modo privato");
    expect(itLocale.headerSubtitlePreparing).toBe("Preparazione della verifica sicura...");
    expect(itLocale.verifyOverAge).toBe("Verifica di avere {age} anni o pi\u00f9");
    expect(itLocale.verifyUnderAge).toBe("Verifica di avere meno di {age} anni");
    expect(itLocale.verifyButtonLabel).toBe("Verifica con Provii Wallet");
    expect(itLocale.verifyButtonAriaLabel).toBe("Verifica con Provii Wallet (apre l\u2019app)");
    expect(itLocale.verifyButtonOpening).toBe("Apertura di Provii Wallet...");
    expect(itLocale.verifyButtonChecking).toBe("Verifica in corso...");
    expect(itLocale.mobileStatusTap).toBe("Tocca per verificare la tua et\u00e0 in sicurezza");
    expect(itLocale.scanQrInstruction).toBe("Scansiona il codice QR con Provii Wallet per verificare la tua et\u00e0");
  });

  it("qrCodeAriaLabel through poweredBy", () => {
    expect(itLocale.qrCodeAriaLabel).toBe("Codice QR per la verifica dell\u2019et\u00e0");
    expect(itLocale.shortCodeLabel).toBe("Oppure inserisci questo codice manualmente:");
    expect(itLocale.verificationCodeAriaPrefix).toBe("Codice di verifica:");
    expect(itLocale.qrToggleLabel).toBe("Oppure scansiona con un altro dispositivo:");
    expect(itLocale.showQrCode).toBe("Mostra codice QR");
    expect(itLocale.hideQrCode).toBe("Nascondi codice QR");
    expect(itLocale.qrCodeUnavailable).toBe("Codice QR non disponibile");
    expect(itLocale.timeNotice).toBe("Hai 5 minuti per completare la verifica. Se il tempo scade, dovrai avviare una nuova verifica.");
    expect(itLocale.needHelp).toBe("Hai bisogno di aiuto?");
    expect(itLocale.needHelpAriaLabel).toBe("Hai bisogno di aiuto con la verifica dell\u2019et\u00e0? (apre in una nuova scheda)");
    expect(itLocale.poweredBy).toBe("Realizzato da");
  });

  it("footerSubtitle through errorTitle", () => {
    expect(itLocale.footerSubtitle).toBe("Verifica dell\u2019et\u00e0 rispettosa della privacy");
    expect(itLocale.privacyPolicyLinkLabel).toBe("Informativa sulla privacy");
    expect(itLocale.loading).toBe("Caricamento...");
    expect(itLocale.initialisingVerification).toBe("Inizializzazione della verifica dell\u2019et\u00e0...");
    expect(itLocale.completingVerification).toBe("Completamento della verifica...");
    expect(itLocale.stillWaiting).toBe("Ancora in attesa della verifica...");
    expect(itLocale.proofReceivedConfirming).toBe("Prova ricevuta, conferma in corso...");
    expect(itLocale.verificationTimedOut).toBe("La verifica \u00e8 scaduta. Aggiorna la pagina per riprovare.");
    expect(itLocale.sessionExpired).toBe("La sessione di verifica \u00e8 scaduta. Aggiorna la pagina per riprovare.");
    expect(itLocale.somethingWentWrong).toBe("Qualcosa \u00e8 andato storto. Aggiorna la pagina per riprovare.");
    expect(itLocale.errorTitle).toBe("Errore di verifica dell\u2019et\u00e0");
  });

  it("tryAgain through closeVerification", () => {
    expect(itLocale.tryAgain).toBe("Riprova");
    expect(itLocale.sandboxTesting).toBe("Test in sandbox");
    expect(itLocale.simulatePass).toBe("\u2713 Simula successo");
    expect(itLocale.simulateFail).toBe("\u2717 Simula fallimento");
    expect(itLocale.simulatePassAriaLabel).toBe("Simula verifica dell\u2019et\u00e0 riuscita");
    expect(itLocale.simulateFailAriaLabel).toBe("Simula verifica dell\u2019et\u00e0 non riuscita");
    expect(itLocale.simulating).toBe("Simulazione...");
    expect(itLocale.timeoutHint).toBe("Assicurati che Provii Wallet sia aperto e pronto");
    expect(itLocale.leaveSite).toBe("Lascia questo sito");
    expect(itLocale.ageVerificationRegion).toBe("Verifica dell\u2019et\u00e0");
    expect(itLocale.closeVerification).toBe("Chiudi verifica dell\u2019et\u00e0");
  });

});

describe("ja locale pinned values", () => {
  it("headerTitle through scanQrInstruction", () => {
    expect(ja.headerTitle).toBe("\u5e74\u9f62\u78ba\u8a8d");
    expect(ja.headerSubtitle).toBe("\u30d7\u30e9\u30a4\u30d0\u30b7\u30fc\u3092\u5b88\u3063\u3066\u5e74\u9f62\u3092\u78ba\u8a8d");
    expect(ja.headerSubtitlePreparing).toBe("\u5b89\u5168\u306a\u78ba\u8a8d\u3092\u6e96\u5099\u4e2d...");
    expect(ja.verifyOverAge).toBe("{age}\u6b73\u4ee5\u4e0a\u3067\u3042\u308b\u3053\u3068\u3092\u78ba\u8a8d");
    expect(ja.verifyUnderAge).toBe("{age}\u6b73\u672a\u6e80\u3067\u3042\u308b\u3053\u3068\u3092\u78ba\u8a8d");
    expect(ja.verifyButtonLabel).toBe("Provii Wallet\u3067\u78ba\u8a8d");
    expect(ja.verifyButtonAriaLabel).toBe("Provii Wallet\u3067\u78ba\u8a8d\uff08\u30a2\u30d7\u30ea\u3092\u958b\u304f\uff09");
    expect(ja.verifyButtonOpening).toBe("Provii Wallet\u3092\u958b\u3044\u3066\u3044\u307e\u3059...");
    expect(ja.verifyButtonChecking).toBe("\u78ba\u8a8d\u4e2d...");
    expect(ja.mobileStatusTap).toBe("\u30bf\u30c3\u30d7\u3057\u3066\u5b89\u5168\u306b\u5e74\u9f62\u3092\u78ba\u8a8d");
    expect(ja.scanQrInstruction).toBe("Provii Wallet\u3067QR\u30b3\u30fc\u30c9\u3092\u30b9\u30ad\u30e3\u30f3\u3057\u3066\u5e74\u9f62\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044");
  });

  it("qrCodeAriaLabel through poweredBy", () => {
    expect(ja.qrCodeAriaLabel).toBe("\u5e74\u9f62\u78ba\u8a8d\u7528QR\u30b3\u30fc\u30c9");
    expect(ja.shortCodeLabel).toBe("\u307e\u305f\u306f\u3053\u306e\u30b3\u30fc\u30c9\u3092\u624b\u52d5\u3067\u5165\u529b\uff1a");
    expect(ja.verificationCodeAriaPrefix).toBe("\u78ba\u8a8d\u30b3\u30fc\u30c9\uff1a");
    expect(ja.qrToggleLabel).toBe("\u307e\u305f\u306f\u5225\u306e\u30c7\u30d0\u30a4\u30b9\u3067\u30b9\u30ad\u30e3\u30f3\uff1a");
    expect(ja.showQrCode).toBe("QR\u30b3\u30fc\u30c9\u3092\u8868\u793a");
    expect(ja.hideQrCode).toBe("QR\u30b3\u30fc\u30c9\u3092\u975e\u8868\u793a");
    expect(ja.qrCodeUnavailable).toBe("QR\u30b3\u30fc\u30c9\u3092\u5229\u7528\u3067\u304d\u307e\u305b\u3093");
    expect(ja.timeNotice).toBe("\u78ba\u8a8d\u306e\u5b8c\u4e86\u307e\u3067\u306b5\u5206\u9593\u3042\u308a\u307e\u3059\u3002\u6642\u9593\u5207\u308c\u306e\u5834\u5408\u306f\u3001\u65b0\u3057\u3044\u78ba\u8a8d\u3092\u958b\u59cb\u3059\u308b\u5fc5\u8981\u304c\u3042\u308a\u307e\u3059\u3002");
    expect(ja.needHelp).toBe("\u30d8\u30eb\u30d7\u304c\u5fc5\u8981\u3067\u3059\u304b\uff1f");
    expect(ja.needHelpAriaLabel).toBe("\u5e74\u9f62\u78ba\u8a8d\u306b\u3064\u3044\u3066\u30d8\u30eb\u30d7\u304c\u5fc5\u8981\u3067\u3059\u304b\uff1f\uff08\u65b0\u3057\u3044\u30bf\u30d6\u3067\u958b\u304f\uff09");
    expect(ja.poweredBy).toBe("\u63d0\u4f9b\uff1a");
  });

  it("footerSubtitle through errorTitle", () => {
    expect(ja.footerSubtitle).toBe("\u30d7\u30e9\u30a4\u30d0\u30b7\u30fc\u4fdd\u8b77\u306e\u5e74\u9f62\u78ba\u8a8d");
    expect(ja.privacyPolicyLinkLabel).toBe("\u30d7\u30e9\u30a4\u30d0\u30b7\u30fc\u30dd\u30ea\u30b7\u30fc");
    expect(ja.loading).toBe("\u8aad\u307f\u8fbc\u307f\u4e2d...");
    expect(ja.initialisingVerification).toBe("\u5e74\u9f62\u78ba\u8a8d\u3092\u521d\u671f\u5316\u4e2d...");
    expect(ja.completingVerification).toBe("\u78ba\u8a8d\u3092\u5b8c\u4e86\u3057\u3066\u3044\u307e\u3059...");
    expect(ja.stillWaiting).toBe("\u307e\u3060\u78ba\u8a8d\u3092\u5f85\u3063\u3066\u3044\u307e\u3059...");
    expect(ja.proofReceivedConfirming).toBe("\u8a3c\u660e\u3092\u53d7\u4fe1\u3001\u78ba\u8a8d\u4e2d...");
    expect(ja.verificationTimedOut).toBe("\u78ba\u8a8d\u304c\u30bf\u30a4\u30e0\u30a2\u30a6\u30c8\u3057\u307e\u3057\u305f\u3002\u30da\u30fc\u30b8\u3092\u66f4\u65b0\u3057\u3066\u3084\u308a\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
    expect(ja.sessionExpired).toBe("\u78ba\u8a8d\u30bb\u30c3\u30b7\u30e7\u30f3\u304c\u671f\u9650\u5207\u308c\u3067\u3059\u3002\u30da\u30fc\u30b8\u3092\u66f4\u65b0\u3057\u3066\u3084\u308a\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
    expect(ja.somethingWentWrong).toBe("\u554f\u984c\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002\u30da\u30fc\u30b8\u3092\u66f4\u65b0\u3057\u3066\u3084\u308a\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
    expect(ja.errorTitle).toBe("\u5e74\u9f62\u78ba\u8a8d\u30a8\u30e9\u30fc");
  });

  it("tryAgain through closeVerification", () => {
    expect(ja.tryAgain).toBe("\u3084\u308a\u76f4\u3059");
    expect(ja.sandboxTesting).toBe("\u30b5\u30f3\u30c9\u30dc\u30c3\u30af\u30b9\u30c6\u30b9\u30c8");
    expect(ja.simulatePass).toBe("\u2713 \u6210\u529f\u3092\u30b7\u30df\u30e5\u30ec\u30fc\u30c8");
    expect(ja.simulateFail).toBe("\u2717 \u5931\u6557\u3092\u30b7\u30df\u30e5\u30ec\u30fc\u30c8");
    expect(ja.simulatePassAriaLabel).toBe("\u5e74\u9f62\u78ba\u8a8d\u6210\u529f\u3092\u30b7\u30df\u30e5\u30ec\u30fc\u30c8");
    expect(ja.simulateFailAriaLabel).toBe("\u5e74\u9f62\u78ba\u8a8d\u5931\u6557\u3092\u30b7\u30df\u30e5\u30ec\u30fc\u30c8");
    expect(ja.simulating).toBe("\u30b7\u30df\u30e5\u30ec\u30fc\u30c8\u4e2d...");
    expect(ja.timeoutHint).toBe("Provii Wallet\u304c\u958b\u3044\u3066\u6e96\u5099\u304c\u3067\u304d\u3066\u3044\u308b\u3053\u3068\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044");
    expect(ja.leaveSite).toBe("\u3053\u306e\u30b5\u30a4\u30c8\u3092\u96e2\u308c\u308b");
    expect(ja.ageVerificationRegion).toBe("\u5e74\u9f62\u78ba\u8a8d");
    expect(ja.closeVerification).toBe("\u5e74\u9f62\u78ba\u8a8d\u3092\u9589\u3058\u308b");
  });

});

describe("ko locale pinned values", () => {
  it("headerTitle through scanQrInstruction", () => {
    expect(ko.headerTitle).toBe("\uc5f0\ub839 \ud655\uc778");
    expect(ko.headerSubtitle).toBe("\uac1c\uc778\uc815\ubcf4\ub97c \ubcf4\ud638\ud558\uba70 \uc5f0\ub839\uc744 \ud655\uc778\ud558\uc138\uc694");
    expect(ko.headerSubtitlePreparing).toBe("\uc548\uc804\ud55c \ud655\uc778\uc744 \uc900\ube44 \uc911...");
    expect(ko.verifyOverAge).toBe("{age}\uc138 \uc774\uc0c1\uc784\uc744 \ud655\uc778\ud558\uc138\uc694");
    expect(ko.verifyUnderAge).toBe("{age}\uc138 \ubbf8\ub9cc\uc784\uc744 \ud655\uc778\ud558\uc138\uc694");
    expect(ko.verifyButtonLabel).toBe("Provii Wallet\uc73c\ub85c \ud655\uc778");
    expect(ko.verifyButtonAriaLabel).toBe("Provii Wallet\uc73c\ub85c \ud655\uc778 (\uc571 \uc5f4\uae30)");
    expect(ko.verifyButtonOpening).toBe("Provii Wallet \uc5ec\ub294 \uc911...");
    expect(ko.verifyButtonChecking).toBe("\ud655\uc778 \uc911...");
    expect(ko.mobileStatusTap).toBe("\ud0ed\ud558\uc5ec \uc548\uc804\ud558\uac8c \uc5f0\ub839 \ud655\uc778");
    expect(ko.scanQrInstruction).toBe("Provii Wallet\uc73c\ub85c QR \ucf54\ub4dc\ub97c \uc2a4\uce94\ud558\uc5ec \uc5f0\ub839\uc744 \ud655\uc778\ud558\uc138\uc694");
  });

  it("qrCodeAriaLabel through poweredBy", () => {
    expect(ko.qrCodeAriaLabel).toBe("\uc5f0\ub839 \ud655\uc778\uc6a9 QR \ucf54\ub4dc");
    expect(ko.shortCodeLabel).toBe("\ub610\ub294 \uc774 \ucf54\ub4dc\ub97c \uc9c1\uc811 \uc785\ub825\ud558\uc138\uc694:");
    expect(ko.verificationCodeAriaPrefix).toBe("\ud655\uc778 \ucf54\ub4dc:");
    expect(ko.qrToggleLabel).toBe("\ub610\ub294 \ub2e4\ub978 \uae30\uae30\ub85c \uc2a4\uce94:");
    expect(ko.showQrCode).toBe("QR \ucf54\ub4dc \ubcf4\uae30");
    expect(ko.hideQrCode).toBe("QR \ucf54\ub4dc \uc228\uae30\uae30");
    expect(ko.qrCodeUnavailable).toBe("QR \ucf54\ub4dc \uc0ac\uc6a9 \ubd88\uac00");
    expect(ko.timeNotice).toBe("\ud655\uc778\uc744 \uc644\ub8cc\ud558\ub294 \ub370 5\ubd84\uc774 \uc8fc\uc5b4\uc9d1\ub2c8\ub2e4. \uc2dc\uac04\uc774 \ucd08\uacfc\ub418\uba74 \uc0c8\ub85c\uc6b4 \ud655\uc778\uc744 \uc2dc\uc791\ud574\uc57c \ud569\ub2c8\ub2e4.");
    expect(ko.needHelp).toBe("\ub3c4\uc6c0\uc774 \ud544\uc694\ud558\uc2e0\uac00\uc694?");
    expect(ko.needHelpAriaLabel).toBe("\uc5f0\ub839 \ud655\uc778\uc5d0 \ub3c4\uc6c0\uc774 \ud544\uc694\ud558\uc2e0\uac00\uc694? (\uc0c8 \ud0ed\uc5d0\uc11c \uc5f4\uae30)");
    expect(ko.poweredBy).toBe("\uc81c\uacf5:");
  });

  it("footerSubtitle through errorTitle", () => {
    expect(ko.footerSubtitle).toBe("\uac1c\uc778\uc815\ubcf4 \ubcf4\ud638 \uc5f0\ub839 \ud655\uc778");
    expect(ko.privacyPolicyLinkLabel).toBe("\uac1c\uc778\uc815\ubcf4 \ucc98\ub9ac\ubc29\uce68");
    expect(ko.loading).toBe("\ub85c\ub529 \uc911...");
    expect(ko.initialisingVerification).toBe("\uc5f0\ub839 \ud655\uc778 \ucd08\uae30\ud654 \uc911...");
    expect(ko.completingVerification).toBe("\ud655\uc778 \uc644\ub8cc \uc911...");
    expect(ko.stillWaiting).toBe("\uc544\uc9c1 \ud655\uc778\uc744 \uae30\ub2e4\ub9ac\uace0 \uc788\uc2b5\ub2c8\ub2e4...");
    expect(ko.proofReceivedConfirming).toBe("\uc99d\uba85 \uc218\uc2e0, \ud655\uc778 \uc911...");
    expect(ko.verificationTimedOut).toBe("\ud655\uc778 \uc2dc\uac04\uc774 \ucd08\uacfc\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \ud398\uc774\uc9c0\ub97c \uc0c8\ub85c\uace0\uce68\ud558\uc5ec \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.");
    expect(ko.sessionExpired).toBe("\ud655\uc778 \uc138\uc158\uc774 \ub9cc\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \ud398\uc774\uc9c0\ub97c \uc0c8\ub85c\uace0\uce68\ud558\uc5ec \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.");
    expect(ko.somethingWentWrong).toBe("\ubb38\uc81c\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4. \ud398\uc774\uc9c0\ub97c \uc0c8\ub85c\uace0\uce68\ud558\uc5ec \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.");
    expect(ko.errorTitle).toBe("\uc5f0\ub839 \ud655\uc778 \uc624\ub958");
  });

  it("tryAgain through closeVerification", () => {
    expect(ko.tryAgain).toBe("\ub2e4\uc2dc \uc2dc\ub3c4");
    expect(ko.sandboxTesting).toBe("\uc0cc\ub4dc\ubc15\uc2a4 \ud14c\uc2a4\ud2b8");
    expect(ko.simulatePass).toBe("\u2713 \uc131\uacf5 \uc2dc\ubbac\ub808\uc774\uc158");
    expect(ko.simulateFail).toBe("\u2717 \uc2e4\ud328 \uc2dc\ubbac\ub808\uc774\uc158");
    expect(ko.simulatePassAriaLabel).toBe("\uc5f0\ub839 \ud655\uc778 \uc131\uacf5 \uc2dc\ubbac\ub808\uc774\uc158");
    expect(ko.simulateFailAriaLabel).toBe("\uc5f0\ub839 \ud655\uc778 \uc2e4\ud328 \uc2dc\ubbac\ub808\uc774\uc158");
    expect(ko.simulating).toBe("\uc2dc\ubbac\ub808\uc774\uc158 \uc911...");
    expect(ko.timeoutHint).toBe("Provii Wallet\uc774 \uc5f4\ub824 \uc788\uace0 \uc900\ube44\ub418\uc5c8\ub294\uc9c0 \ud655\uc778\ud558\uc138\uc694");
    expect(ko.leaveSite).toBe("\uc774 \uc0ac\uc774\ud2b8 \ub5a0\ub098\uae30");
    expect(ko.ageVerificationRegion).toBe("\uc5f0\ub839 \ud655\uc778");
    expect(ko.closeVerification).toBe("\uc5f0\ub839 \ud655\uc778 \ub2eb\uae30");
  });

});

describe("nl locale pinned values", () => {
  it("headerTitle through scanQrInstruction", () => {
    expect(nl.headerTitle).toBe("Leeftijdsverificatie");
    expect(nl.headerSubtitle).toBe("Verifieer uw leeftijd priv\u00e9");
    expect(nl.headerSubtitlePreparing).toBe("Veilige verificatie wordt voorbereid...");
    expect(nl.verifyOverAge).toBe("Verifieer dat u {age} jaar of ouder bent");
    expect(nl.verifyUnderAge).toBe("Verifieer dat u jonger bent dan {age} jaar");
    expect(nl.verifyButtonLabel).toBe("Verifieer met Provii Wallet");
    expect(nl.verifyButtonAriaLabel).toBe("Verifieer met Provii Wallet (opent de app)");
    expect(nl.verifyButtonOpening).toBe("Provii Wallet wordt geopend...");
    expect(nl.verifyButtonChecking).toBe("Verificatie wordt gecontroleerd...");
    expect(nl.mobileStatusTap).toBe("Tik om uw leeftijd veilig te verifi\u00ebren");
    expect(nl.scanQrInstruction).toBe("Scan de QR-code met Provii Wallet om uw leeftijd te verifi\u00ebren");
  });

  it("qrCodeAriaLabel through poweredBy", () => {
    expect(nl.qrCodeAriaLabel).toBe("QR-code voor leeftijdsverificatie");
    expect(nl.shortCodeLabel).toBe("Of voer deze code handmatig in:");
    expect(nl.verificationCodeAriaPrefix).toBe("Verificatiecode:");
    expect(nl.qrToggleLabel).toBe("Of scan met een ander apparaat:");
    expect(nl.showQrCode).toBe("QR-code tonen");
    expect(nl.hideQrCode).toBe("QR-code verbergen");
    expect(nl.qrCodeUnavailable).toBe("QR-code niet beschikbaar");
    expect(nl.timeNotice).toBe("U heeft 5 minuten om de verificatie te voltooien. Als de tijd verstrijkt, moet u een nieuwe verificatie starten.");
    expect(nl.needHelp).toBe("Hulp nodig?");
    expect(nl.needHelpAriaLabel).toBe("Hulp nodig bij leeftijdsverificatie? (opent in nieuw tabblad)");
    expect(nl.poweredBy).toBe("Mogelijk gemaakt door");
  });

  it("footerSubtitle through errorTitle", () => {
    expect(nl.footerSubtitle).toBe("Privacyvriendelijke leeftijdsverificatie");
    expect(nl.privacyPolicyLinkLabel).toBe("Privacybeleid");
    expect(nl.loading).toBe("Laden...");
    expect(nl.initialisingVerification).toBe("Leeftijdsverificatie wordt ge\u00efnitialiseerd...");
    expect(nl.completingVerification).toBe("Verificatie wordt afgerond...");
    expect(nl.stillWaiting).toBe("Nog steeds wachtend op verificatie...");
    expect(nl.proofReceivedConfirming).toBe("Bewijs ontvangen, bevestiging loopt...");
    expect(nl.verificationTimedOut).toBe("Verificatie verlopen. Vernieuw de pagina om het opnieuw te proberen.");
    expect(nl.sessionExpired).toBe("Verificatiesessie verlopen. Vernieuw de pagina om het opnieuw te proberen.");
    expect(nl.somethingWentWrong).toBe("Er is iets misgegaan. Vernieuw de pagina om het opnieuw te proberen.");
    expect(nl.errorTitle).toBe("Fout bij leeftijdsverificatie");
  });

  it("tryAgain through closeVerification", () => {
    expect(nl.tryAgain).toBe("Opnieuw proberen");
    expect(nl.sandboxTesting).toBe("Sandbox-test");
    expect(nl.simulatePass).toBe("\u2713 Succes simuleren");
    expect(nl.simulateFail).toBe("\u2717 Fout simuleren");
    expect(nl.simulatePassAriaLabel).toBe("Succesvolle leeftijdsverificatie simuleren");
    expect(nl.simulateFailAriaLabel).toBe("Mislukte leeftijdsverificatie simuleren");
    expect(nl.simulating).toBe("Simuleren...");
    expect(nl.timeoutHint).toBe("Zorg ervoor dat Provii Wallet geopend en gereed is");
    expect(nl.leaveSite).toBe("Verlaat deze site");
    expect(nl.ageVerificationRegion).toBe("Leeftijdsverificatie");
    expect(nl.closeVerification).toBe("Leeftijdsverificatie sluiten");
  });

});

describe("pl locale pinned values", () => {
  it("headerTitle through scanQrInstruction", () => {
    expect(pl.headerTitle).toBe("Weryfikacja wieku");
    expect(pl.headerSubtitle).toBe("Zweryfikuj sw\u00f3j wiek prywatnie");
    expect(pl.headerSubtitlePreparing).toBe("Przygotowywanie bezpiecznej weryfikacji...");
    expect(pl.verifyOverAge).toBe("Potwierd\u017a, \u017ce masz {age} lat lub wi\u0119cej");
    expect(pl.verifyUnderAge).toBe("Potwierd\u017a, \u017ce masz mniej ni\u017c {age} lat");
    expect(pl.verifyButtonLabel).toBe("Zweryfikuj za pomoc\u0105 Provii Wallet");
    expect(pl.verifyButtonAriaLabel).toBe("Zweryfikuj za pomoc\u0105 Provii Wallet (otwiera aplikacj\u0119)");
    expect(pl.verifyButtonOpening).toBe("Otwieranie Provii Wallet...");
    expect(pl.verifyButtonChecking).toBe("Sprawdzanie weryfikacji...");
    expect(pl.mobileStatusTap).toBe("Dotknij, aby bezpiecznie zweryfikowa\u0107 sw\u00f3j wiek");
    expect(pl.scanQrInstruction).toBe("Zeskanuj kod QR za pomoc\u0105 Provii Wallet, aby zweryfikowa\u0107 sw\u00f3j wiek");
  });

  it("qrCodeAriaLabel through poweredBy", () => {
    expect(pl.qrCodeAriaLabel).toBe("Kod QR do weryfikacji wieku");
    expect(pl.shortCodeLabel).toBe("Lub wprowad\u017a ten kod r\u0119cznie:");
    expect(pl.verificationCodeAriaPrefix).toBe("Kod weryfikacyjny:");
    expect(pl.qrToggleLabel).toBe("Lub zeskanuj innym urz\u0105dzeniem:");
    expect(pl.showQrCode).toBe("Poka\u017c kod QR");
    expect(pl.hideQrCode).toBe("Ukryj kod QR");
    expect(pl.qrCodeUnavailable).toBe("Kod QR niedost\u0119pny");
    expect(pl.timeNotice).toBe("Masz 5 minut na uko\u0144czenie weryfikacji. Je\u015bli czas up\u0142ynie, b\u0119dziesz musia\u0142 rozpocz\u0105\u0107 now\u0105 weryfikacj\u0119.");
    expect(pl.needHelp).toBe("Potrzebujesz pomocy?");
    expect(pl.needHelpAriaLabel).toBe("Potrzebujesz pomocy z weryfikacj\u0105 wieku? (otwiera now\u0105 kart\u0119)");
    expect(pl.poweredBy).toBe("Obs\u0142ugiwane przez");
  });

  it("footerSubtitle through errorTitle", () => {
    expect(pl.footerSubtitle).toBe("Weryfikacja wieku chroni\u0105ca prywatno\u015b\u0107");
    expect(pl.privacyPolicyLinkLabel).toBe("Polityka prywatno\u015bci");
    expect(pl.loading).toBe("\u0141adowanie...");
    expect(pl.initialisingVerification).toBe("Inicjalizacja weryfikacji wieku...");
    expect(pl.completingVerification).toBe("Ko\u0144czenie weryfikacji...");
    expect(pl.stillWaiting).toBe("Nadal oczekiwanie na weryfikacj\u0119...");
    expect(pl.proofReceivedConfirming).toBe("Dow\u00f3d otrzymany, potwierdzanie...");
    expect(pl.verificationTimedOut).toBe("Weryfikacja wygas\u0142a. Od\u015bwie\u017c stron\u0119, aby spr\u00f3bowa\u0107 ponownie.");
    expect(pl.sessionExpired).toBe("Sesja weryfikacji wygas\u0142a. Od\u015bwie\u017c stron\u0119, aby spr\u00f3bowa\u0107 ponownie.");
    expect(pl.somethingWentWrong).toBe("Co\u015b posz\u0142o nie tak. Od\u015bwie\u017c stron\u0119, aby spr\u00f3bowa\u0107 ponownie.");
    expect(pl.errorTitle).toBe("B\u0142\u0105d weryfikacji wieku");
  });

  it("tryAgain through closeVerification", () => {
    expect(pl.tryAgain).toBe("Spr\u00f3buj ponownie");
    expect(pl.sandboxTesting).toBe("Test w piaskownicy");
    expect(pl.simulatePass).toBe("\u2713 Symuluj sukces");
    expect(pl.simulateFail).toBe("\u2717 Symuluj niepowodzenie");
    expect(pl.simulatePassAriaLabel).toBe("Symuluj pomy\u015bln\u0105 weryfikacj\u0119 wieku");
    expect(pl.simulateFailAriaLabel).toBe("Symuluj nieudaną weryfikacj\u0119 wieku");
    expect(pl.simulating).toBe("Symulowanie...");
    expect(pl.timeoutHint).toBe("Upewnij si\u0119, \u017ce Provii Wallet jest otwarty i gotowy");
    expect(pl.leaveSite).toBe("Opu\u015b\u0107 t\u0119 stron\u0119");
    expect(pl.ageVerificationRegion).toBe("Weryfikacja wieku");
    expect(pl.closeVerification).toBe("Zamknij weryfikacj\u0119 wieku");
  });

});

describe("pt locale pinned values", () => {
  it("headerTitle through scanQrInstruction", () => {
    expect(pt.headerTitle).toBe("Verifica\u00e7\u00e3o de idade");
    expect(pt.headerSubtitle).toBe("Verifique sua idade de forma privada");
    expect(pt.headerSubtitlePreparing).toBe("Preparando verifica\u00e7\u00e3o segura...");
    expect(pt.verifyOverAge).toBe("Verifique que voc\u00ea tem {age} anos ou mais");
    expect(pt.verifyUnderAge).toBe("Verifique que voc\u00ea tem menos de {age} anos");
    expect(pt.verifyButtonLabel).toBe("Verificar com Provii Wallet");
    expect(pt.verifyButtonAriaLabel).toBe("Verificar com Provii Wallet (abre o aplicativo)");
    expect(pt.verifyButtonOpening).toBe("Abrindo Provii Wallet...");
    expect(pt.verifyButtonChecking).toBe("Verificando...");
    expect(pt.mobileStatusTap).toBe("Toque para verificar sua idade com seguran\u00e7a");
    expect(pt.scanQrInstruction).toBe("Escaneie o c\u00f3digo QR com Provii Wallet para verificar sua idade");
  });

  it("qrCodeAriaLabel through poweredBy", () => {
    expect(pt.qrCodeAriaLabel).toBe("C\u00f3digo QR para verifica\u00e7\u00e3o de idade");
    expect(pt.shortCodeLabel).toBe("Ou insira este c\u00f3digo manualmente:");
    expect(pt.verificationCodeAriaPrefix).toBe("C\u00f3digo de verifica\u00e7\u00e3o:");
    expect(pt.qrToggleLabel).toBe("Ou escaneie com outro dispositivo:");
    expect(pt.showQrCode).toBe("Mostrar c\u00f3digo QR");
    expect(pt.hideQrCode).toBe("Ocultar c\u00f3digo QR");
    expect(pt.qrCodeUnavailable).toBe("C\u00f3digo QR indispon\u00edvel");
    expect(pt.timeNotice).toBe("Voc\u00ea tem 5 minutos para concluir a verifica\u00e7\u00e3o. Se o tempo esgotar, ser\u00e1 necess\u00e1rio iniciar uma nova verifica\u00e7\u00e3o.");
    expect(pt.needHelp).toBe("Precisa de ajuda?");
    expect(pt.needHelpAriaLabel).toBe("Precisa de ajuda com a verifica\u00e7\u00e3o de idade? (abre em nova aba)");
    expect(pt.poweredBy).toBe("Desenvolvido por");
  });

  it("footerSubtitle through errorTitle", () => {
    expect(pt.footerSubtitle).toBe("Verifica\u00e7\u00e3o de idade com preserva\u00e7\u00e3o de privacidade");
    expect(pt.privacyPolicyLinkLabel).toBe("Pol\u00edtica de privacidade");
    expect(pt.loading).toBe("Carregando...");
    expect(pt.initialisingVerification).toBe("Iniciando verifica\u00e7\u00e3o de idade...");
    expect(pt.completingVerification).toBe("Concluindo verifica\u00e7\u00e3o...");
    expect(pt.stillWaiting).toBe("Ainda aguardando verifica\u00e7\u00e3o...");
    expect(pt.proofReceivedConfirming).toBe("Prova recebida, confirmando verifica\u00e7\u00e3o...");
    expect(pt.verificationTimedOut).toBe("A verifica\u00e7\u00e3o expirou. Atualize a p\u00e1gina para tentar novamente.");
    expect(pt.sessionExpired).toBe("A sess\u00e3o de verifica\u00e7\u00e3o expirou. Atualize a p\u00e1gina para tentar novamente.");
    expect(pt.somethingWentWrong).toBe("Algo deu errado. Atualize a p\u00e1gina para tentar novamente.");
    expect(pt.errorTitle).toBe("Erro na verifica\u00e7\u00e3o de idade");
  });

  it("tryAgain through closeVerification", () => {
    expect(pt.tryAgain).toBe("Tentar novamente");
    expect(pt.sandboxTesting).toBe("Teste em sandbox");
    expect(pt.simulatePass).toBe("\u2713 Simular sucesso");
    expect(pt.simulateFail).toBe("\u2717 Simular falha");
    expect(pt.simulatePassAriaLabel).toBe("Simular verifica\u00e7\u00e3o de idade bem-sucedida");
    expect(pt.simulateFailAriaLabel).toBe("Simular verifica\u00e7\u00e3o de idade mal-sucedida");
    expect(pt.simulating).toBe("Simulando...");
    expect(pt.timeoutHint).toBe("Certifique-se de que o Provii Wallet est\u00e1 aberto e pronto");
    expect(pt.leaveSite).toBe("Sair deste site");
    expect(pt.ageVerificationRegion).toBe("Verifica\u00e7\u00e3o de idade");
    expect(pt.closeVerification).toBe("Fechar verifica\u00e7\u00e3o de idade");
  });

});

describe("ru locale pinned values", () => {
  it("headerTitle through scanQrInstruction", () => {
    expect(ru.headerTitle).toBe("\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0432\u043e\u0437\u0440\u0430\u0441\u0442\u0430");
    expect(ru.headerSubtitle).toBe("\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0441\u0432\u043e\u0439 \u0432\u043e\u0437\u0440\u0430\u0441\u0442 \u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e");
    expect(ru.headerSubtitlePreparing).toBe("\u041f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0439 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438...");
    expect(ru.verifyOverAge).toBe("\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435, \u0447\u0442\u043e \u0432\u0430\u043c {age} \u043b\u0435\u0442 \u0438\u043b\u0438 \u0431\u043e\u043b\u044c\u0448\u0435");
    expect(ru.verifyUnderAge).toBe("\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435, \u0447\u0442\u043e \u0432\u0430\u043c \u043c\u0435\u043d\u044c\u0448\u0435 {age} \u043b\u0435\u0442");
    expect(ru.verifyButtonLabel).toBe("\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0441 Provii Wallet");
    expect(ru.verifyButtonAriaLabel).toBe("\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0441 Provii Wallet (\u043e\u0442\u043a\u0440\u044b\u0432\u0430\u0435\u0442 \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0435)");
    expect(ru.verifyButtonOpening).toBe("\u041e\u0442\u043a\u0440\u044b\u0432\u0430\u0435\u0442\u0441\u044f Provii Wallet...");
    expect(ru.verifyButtonChecking).toBe("\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430...");
    expect(ru.mobileStatusTap).toBe("\u041d\u0430\u0436\u043c\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c \u0432\u043e\u0437\u0440\u0430\u0441\u0442");
    expect(ru.scanQrInstruction).toBe("\u041e\u0442\u0441\u043a\u0430\u043d\u0438\u0440\u0443\u0439\u0442\u0435 QR-\u043a\u043e\u0434 \u0441 \u043f\u043e\u043c\u043e\u0449\u044c\u044e Provii Wallet \u0434\u043b\u044f \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f \u0432\u043e\u0437\u0440\u0430\u0441\u0442\u0430");
  });

  it("qrCodeAriaLabel through poweredBy", () => {
    expect(ru.qrCodeAriaLabel).toBe("QR-\u043a\u043e\u0434 \u0434\u043b\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0432\u043e\u0437\u0440\u0430\u0441\u0442\u0430");
    expect(ru.shortCodeLabel).toBe("\u0418\u043b\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u044d\u0442\u043e\u0442 \u043a\u043e\u0434 \u0432\u0440\u0443\u0447\u043d\u0443\u044e:");
    expect(ru.verificationCodeAriaPrefix).toBe("\u041a\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438:");
    expect(ru.qrToggleLabel).toBe("\u0418\u043b\u0438 \u043e\u0442\u0441\u043a\u0430\u043d\u0438\u0440\u0443\u0439\u0442\u0435 \u0434\u0440\u0443\u0433\u0438\u043c \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e\u043c:");
    expect(ru.showQrCode).toBe("\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c QR-\u043a\u043e\u0434");
    expect(ru.hideQrCode).toBe("\u0421\u043a\u0440\u044b\u0442\u044c QR-\u043a\u043e\u0434");
    expect(ru.qrCodeUnavailable).toBe("QR-\u043a\u043e\u0434 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d");
    expect(ru.timeNotice).toBe("\u0423 \u0432\u0430\u0441 \u0435\u0441\u0442\u044c 5 \u043c\u0438\u043d\u0443\u0442 \u0434\u043b\u044f \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438. \u0415\u0441\u043b\u0438 \u0432\u0440\u0435\u043c\u044f \u0438\u0441\u0442\u0435\u0447\u0451\u0442, \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e \u043d\u0430\u0447\u0430\u0442\u044c \u043d\u043e\u0432\u0443\u044e \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443.");
    expect(ru.needHelp).toBe("\u041d\u0443\u0436\u043d\u0430 \u043f\u043e\u043c\u043e\u0449\u044c?");
    expect(ru.needHelpAriaLabel).toBe("\u041d\u0443\u0436\u043d\u0430 \u043f\u043e\u043c\u043e\u0449\u044c \u0441 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u043e\u0439 \u0432\u043e\u0437\u0440\u0430\u0441\u0442\u0430? (\u043e\u0442\u043a\u0440\u043e\u0435\u0442\u0441\u044f \u0432 \u043d\u043e\u0432\u043e\u0439 \u0432\u043a\u043b\u0430\u0434\u043a\u0435)");
    expect(ru.poweredBy).toBe("\u041e\u0431\u0435\u0441\u043f\u0435\u0447\u0435\u043d\u043e");
  });

  it("footerSubtitle through errorTitle", () => {
    expect(ru.footerSubtitle).toBe("\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0432\u043e\u0437\u0440\u0430\u0441\u0442\u0430 \u0441 \u0437\u0430\u0449\u0438\u0442\u043e\u0439 \u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u0438");
    expect(ru.privacyPolicyLinkLabel).toBe("\u041f\u043e\u043b\u0438\u0442\u0438\u043a\u0430 \u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u0438");
    expect(ru.loading).toBe("\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...");
    expect(ru.initialisingVerification).toBe("\u0418\u043d\u0438\u0446\u0438\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0432\u043e\u0437\u0440\u0430\u0441\u0442\u0430...");
    expect(ru.completingVerification).toBe("\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438...");
    expect(ru.stillWaiting).toBe("\u0412\u0441\u0451 \u0435\u0449\u0451 \u043e\u0436\u0438\u0434\u0430\u0435\u043c \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443...");
    expect(ru.proofReceivedConfirming).toBe("\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u043e, \u0438\u0434\u0451\u0442 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430...");
    expect(ru.verificationTimedOut).toBe("\u0412\u0440\u0435\u043c\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0438\u0441\u0442\u0435\u043a\u043b\u043e. \u041e\u0431\u043d\u043e\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443, \u0447\u0442\u043e\u0431\u044b \u043f\u043e\u043f\u0440\u043e\u0431\u043e\u0432\u0430\u0442\u044c \u0441\u043d\u043e\u0432\u0430.");
    expect(ru.sessionExpired).toBe("\u0421\u0435\u0441\u0441\u0438\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0438\u0441\u0442\u0435\u043a\u043b\u0430. \u041e\u0431\u043d\u043e\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443, \u0447\u0442\u043e\u0431\u044b \u043f\u043e\u043f\u0440\u043e\u0431\u043e\u0432\u0430\u0442\u044c \u0441\u043d\u043e\u0432\u0430.");
    expect(ru.somethingWentWrong).toBe("\u0427\u0442\u043e-\u0442\u043e \u043f\u043e\u0448\u043b\u043e \u043d\u0435 \u0442\u0430\u043a. \u041e\u0431\u043d\u043e\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443, \u0447\u0442\u043e\u0431\u044b \u043f\u043e\u043f\u0440\u043e\u0431\u043e\u0432\u0430\u0442\u044c \u0441\u043d\u043e\u0432\u0430.");
    expect(ru.errorTitle).toBe("\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0432\u043e\u0437\u0440\u0430\u0441\u0442\u0430");
  });

  it("tryAgain through closeVerification", () => {
    expect(ru.tryAgain).toBe("\u041f\u043e\u043f\u0440\u043e\u0431\u043e\u0432\u0430\u0442\u044c \u0441\u043d\u043e\u0432\u0430");
    expect(ru.sandboxTesting).toBe("\u0422\u0435\u0441\u0442\u043e\u0432\u0430\u044f \u0441\u0440\u0435\u0434\u0430");
    expect(ru.simulatePass).toBe("\u2713 \u0421\u0438\u043c\u0443\u043b\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0443\u0441\u043f\u0435\u0445");
    expect(ru.simulateFail).toBe("\u2717 \u0421\u0438\u043c\u0443\u043b\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043e\u0448\u0438\u0431\u043a\u0443");
    expect(ru.simulatePassAriaLabel).toBe("\u0421\u0438\u043c\u0443\u043b\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0443\u0441\u043f\u0435\u0448\u043d\u0443\u044e \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443 \u0432\u043e\u0437\u0440\u0430\u0441\u0442\u0430");
    expect(ru.simulateFailAriaLabel).toBe("\u0421\u0438\u043c\u0443\u043b\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043d\u0435\u0443\u0434\u0430\u0447\u043d\u0443\u044e \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443 \u0432\u043e\u0437\u0440\u0430\u0441\u0442\u0430");
    expect(ru.simulating).toBe("\u0421\u0438\u043c\u0443\u043b\u044f\u0446\u0438\u044f...");
    expect(ru.timeoutHint).toBe("\u0423\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044c, \u0447\u0442\u043e Provii Wallet \u043e\u0442\u043a\u0440\u044b\u0442 \u0438 \u0433\u043e\u0442\u043e\u0432");
    expect(ru.leaveSite).toBe("\u041f\u043e\u043a\u0438\u043d\u0443\u0442\u044c \u0441\u0430\u0439\u0442");
    expect(ru.ageVerificationRegion).toBe("\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0432\u043e\u0437\u0440\u0430\u0441\u0442\u0430");
    expect(ru.closeVerification).toBe("\u0417\u0430\u043a\u0440\u044b\u0442\u044c \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443 \u0432\u043e\u0437\u0440\u0430\u0441\u0442\u0430");
  });

});

describe("tr locale pinned values", () => {
  it("headerTitle through scanQrInstruction", () => {
    expect(tr.headerTitle).toBe("Ya\u015f Do\u011frulama");
    expect(tr.headerSubtitle).toBe("Ya\u015f\u0131n\u0131z\u0131 gizli olarak do\u011frulay\u0131n");
    expect(tr.headerSubtitlePreparing).toBe("G\u00fcvenli do\u011frulama haz\u0131rlan\u0131yor...");
    expect(tr.verifyOverAge).toBe("{age} ya\u015f\u0131nda veya daha b\u00fcy\u00fck oldu\u011funuzu do\u011frulay\u0131n");
    expect(tr.verifyUnderAge).toBe("{age} ya\u015f\u0131ndan k\u00fc\u00e7\u00fck oldu\u011funuzu do\u011frulay\u0131n");
    expect(tr.verifyButtonLabel).toBe("Provii Wallet ile do\u011frula");
    expect(tr.verifyButtonAriaLabel).toBe("Provii Wallet ile do\u011frula (uygulamay\u0131 a\u00e7ar)");
    expect(tr.verifyButtonOpening).toBe("Provii Wallet a\u00e7\u0131l\u0131yor...");
    expect(tr.verifyButtonChecking).toBe("Do\u011frulama kontrol ediliyor...");
    expect(tr.mobileStatusTap).toBe("Ya\u015f\u0131n\u0131z\u0131 g\u00fcvenle do\u011frulamak i\u00e7in dokunun");
    expect(tr.scanQrInstruction).toBe("Ya\u015f\u0131n\u0131z\u0131 do\u011frulamak i\u00e7in Provii Wallet ile QR kodunu taray\u0131n");
  });

  it("qrCodeAriaLabel through poweredBy", () => {
    expect(tr.qrCodeAriaLabel).toBe("Ya\u015f do\u011frulama i\u00e7in QR kodu");
    expect(tr.shortCodeLabel).toBe("Veya bu kodu manuel olarak girin:");
    expect(tr.verificationCodeAriaPrefix).toBe("Do\u011frulama kodu:");
    expect(tr.qrToggleLabel).toBe("Veya ba\u015fka bir cihazla taray\u0131n:");
    expect(tr.showQrCode).toBe("QR kodunu g\u00f6ster");
    expect(tr.hideQrCode).toBe("QR kodunu gizle");
    expect(tr.qrCodeUnavailable).toBe("QR kodu kullan\u0131lam\u0131yor");
    expect(tr.timeNotice).toBe("Do\u011frulamay\u0131 tamamlamak i\u00e7in 5 dakikan\u0131z var. S\u00fcre dolarsa yeni bir do\u011frulama ba\u015flatman\u0131z gerekecek.");
    expect(tr.needHelp).toBe("Yard\u0131ma m\u0131 ihtiyac\u0131n\u0131z var?");
    expect(tr.needHelpAriaLabel).toBe("Ya\u015f do\u011frulamas\u0131 i\u00e7in yard\u0131ma m\u0131 ihtiyac\u0131n\u0131z var? (yeni sekmede a\u00e7\u0131l\u0131r)");
    expect(tr.poweredBy).toBe("Destekleyen:");
  });

  it("footerSubtitle through errorTitle", () => {
    expect(tr.footerSubtitle).toBe("Gizlili\u011fi koruyan ya\u015f do\u011frulama");
    expect(tr.privacyPolicyLinkLabel).toBe("Gizlilik politikas\u0131");
    expect(tr.loading).toBe("Y\u00fckleniyor...");
    expect(tr.initialisingVerification).toBe("Ya\u015f do\u011frulama ba\u015flat\u0131l\u0131yor...");
    expect(tr.completingVerification).toBe("Do\u011frulama tamamlan\u0131yor...");
    expect(tr.stillWaiting).toBe("Do\u011frulama hala bekleniyor...");
    expect(tr.proofReceivedConfirming).toBe("Kan\u0131t al\u0131nd\u0131, do\u011frulan\u0131yor...");
    expect(tr.verificationTimedOut).toBe("Do\u011frulama s\u00fcresi doldu. Tekrar denemek i\u00e7in sayfay\u0131 yenileyin.");
    expect(tr.sessionExpired).toBe("Do\u011frulama oturumu s\u00fcresi doldu. Tekrar denemek i\u00e7in sayfay\u0131 yenileyin.");
    expect(tr.somethingWentWrong).toBe("Bir \u015feyler ters gitti. Tekrar denemek i\u00e7in sayfay\u0131 yenileyin.");
    expect(tr.errorTitle).toBe("Ya\u015f Do\u011frulama Hatas\u0131");
  });

  it("tryAgain through closeVerification", () => {
    expect(tr.tryAgain).toBe("Tekrar Dene");
    expect(tr.sandboxTesting).toBe("Sandbox Testi");
    expect(tr.simulatePass).toBe("\u2713 Ba\u015far\u0131 Sim\u00fclasyonu");
    expect(tr.simulateFail).toBe("\u2717 Ba\u015far\u0131s\u0131zl\u0131k Sim\u00fclasyonu");
    expect(tr.simulatePassAriaLabel).toBe("Ba\u015far\u0131l\u0131 ya\u015f do\u011frulamas\u0131n\u0131 sim\u00fcle et");
    expect(tr.simulateFailAriaLabel).toBe("Ba\u015far\u0131s\u0131z ya\u015f do\u011frulamas\u0131n\u0131 sim\u00fcle et");
    expect(tr.simulating).toBe("Sim\u00fclasyon yap\u0131l\u0131yor...");
    expect(tr.timeoutHint).toBe("Provii Wallet'\u0131n a\u00e7\u0131k ve haz\u0131r oldu\u011fundan emin olun");
    expect(tr.leaveSite).toBe("Bu siteyi terk et");
    expect(tr.ageVerificationRegion).toBe("Ya\u015f do\u011frulama");
    expect(tr.closeVerification).toBe("Ya\u015f do\u011frulamay\u0131 kapat");
  });

});

describe("zh locale pinned values", () => {
  it("headerTitle through scanQrInstruction", () => {
    expect(zh.headerTitle).toBe("\u5e74\u9f84\u9a8c\u8bc1");
    expect(zh.headerSubtitle).toBe("\u79c1\u5bc6\u5730\u9a8c\u8bc1\u60a8\u7684\u5e74\u9f84");
    expect(zh.headerSubtitlePreparing).toBe("\u6b63\u5728\u51c6\u5907\u5b89\u5168\u9a8c\u8bc1...");
    expect(zh.verifyOverAge).toBe("\u9a8c\u8bc1\u60a8\u5df2\u5e74\u6ee1{age}\u5c81");
    expect(zh.verifyUnderAge).toBe("\u9a8c\u8bc1\u60a8\u672a\u6ee1{age}\u5c81");
    expect(zh.verifyButtonLabel).toBe("\u4f7f\u7528 Provii Wallet \u9a8c\u8bc1");
    expect(zh.verifyButtonAriaLabel).toBe("\u4f7f\u7528 Provii Wallet \u9a8c\u8bc1\uff08\u6253\u5f00\u5e94\u7528\uff09");
    expect(zh.verifyButtonOpening).toBe("\u6b63\u5728\u6253\u5f00 Provii Wallet...");
    expect(zh.verifyButtonChecking).toBe("\u6b63\u5728\u68c0\u67e5\u9a8c\u8bc1...");
    expect(zh.mobileStatusTap).toBe("\u70b9\u51fb\u4ee5\u5b89\u5168\u9a8c\u8bc1\u60a8\u7684\u5e74\u9f84");
    expect(zh.scanQrInstruction).toBe("\u4f7f\u7528 Provii Wallet \u626b\u63cfQR\u7801\u4ee5\u9a8c\u8bc1\u60a8\u7684\u5e74\u9f84");
  });

  it("qrCodeAriaLabel through poweredBy", () => {
    expect(zh.qrCodeAriaLabel).toBe("\u5e74\u9f84\u9a8c\u8bc1QR\u7801");
    expect(zh.shortCodeLabel).toBe("\u6216\u624b\u52a8\u8f93\u5165\u6b64\u4ee3\u7801\uff1a");
    expect(zh.verificationCodeAriaPrefix).toBe("\u9a8c\u8bc1\u7801\uff1a");
    expect(zh.qrToggleLabel).toBe("\u6216\u7528\u5176\u4ed6\u8bbe\u5907\u626b\u63cf\uff1a");
    expect(zh.showQrCode).toBe("\u663e\u793aQR\u7801");
    expect(zh.hideQrCode).toBe("\u9690\u85cfQR\u7801");
    expect(zh.qrCodeUnavailable).toBe("QR\u7801\u4e0d\u53ef\u7528");
    expect(zh.timeNotice).toBe("\u60a8\u6709 5 \u5206\u949f\u5b8c\u6210\u9a8c\u8bc1\u3002\u5982\u679c\u8d85\u65f6\uff0c\u60a8\u9700\u8981\u5f00\u59cb\u65b0\u7684\u9a8c\u8bc1\u3002");
    expect(zh.needHelp).toBe("\u9700\u8981\u5e2e\u52a9\uff1f");
    expect(zh.needHelpAriaLabel).toBe("\u9700\u8981\u5e74\u9f84\u9a8c\u8bc1\u5e2e\u52a9\uff1f\uff08\u5728\u65b0\u6807\u7b7e\u9875\u4e2d\u6253\u5f00\uff09");
    expect(zh.poweredBy).toBe("\u6280\u672f\u652f\u6301\uff1a");
  });

  it("footerSubtitle through errorTitle", () => {
    expect(zh.footerSubtitle).toBe("\u9690\u79c1\u4fdd\u62a4\u5e74\u9f84\u9a8c\u8bc1");
    expect(zh.privacyPolicyLinkLabel).toBe("\u9690\u79c1\u653f\u7b56");
    expect(zh.loading).toBe("\u52a0\u8f7d\u4e2d...");
    expect(zh.initialisingVerification).toBe("\u6b63\u5728\u521d\u59cb\u5316\u5e74\u9f84\u9a8c\u8bc1...");
    expect(zh.completingVerification).toBe("\u6b63\u5728\u5b8c\u6210\u9a8c\u8bc1...");
    expect(zh.stillWaiting).toBe("\u4ecd\u5728\u7b49\u5f85\u9a8c\u8bc1...");
    expect(zh.proofReceivedConfirming).toBe("\u5df2\u6536\u5230\u8bc1\u660e\uff0c\u6b63\u5728\u786e\u8ba4...");
    expect(zh.verificationTimedOut).toBe("\u9a8c\u8bc1\u8d85\u65f6\u3002\u8bf7\u5237\u65b0\u9875\u9762\u91cd\u8bd5\u3002");
    expect(zh.sessionExpired).toBe("\u9a8c\u8bc1\u4f1a\u8bdd\u5df2\u8fc7\u671f\u3002\u8bf7\u5237\u65b0\u9875\u9762\u91cd\u8bd5\u3002");
    expect(zh.somethingWentWrong).toBe("\u51fa\u4e86\u70b9\u95ee\u9898\u3002\u8bf7\u5237\u65b0\u9875\u9762\u91cd\u8bd5\u3002");
    expect(zh.errorTitle).toBe("\u5e74\u9f84\u9a8c\u8bc1\u9519\u8bef");
  });

  it("tryAgain through closeVerification", () => {
    expect(zh.tryAgain).toBe("\u91cd\u8bd5");
    expect(zh.sandboxTesting).toBe("\u6c99\u7bb1\u6d4b\u8bd5");
    expect(zh.simulatePass).toBe("\u2713 \u6a21\u62df\u6210\u529f");
    expect(zh.simulateFail).toBe("\u2717 \u6a21\u62df\u5931\u8d25");
    expect(zh.simulatePassAriaLabel).toBe("\u6a21\u62df\u5e74\u9f84\u9a8c\u8bc1\u6210\u529f");
    expect(zh.simulateFailAriaLabel).toBe("\u6a21\u62df\u5e74\u9f84\u9a8c\u8bc1\u5931\u8d25");
    expect(zh.simulating).toBe("\u6a21\u62df\u4e2d...");
    expect(zh.timeoutHint).toBe("\u8bf7\u786e\u4fdd Provii Wallet \u5df2\u6253\u5f00\u5e76\u51c6\u5907\u5c31\u7eea");
    expect(zh.leaveSite).toBe("\u79bb\u5f00\u6b64\u7f51\u7ad9");
    expect(zh.ageVerificationRegion).toBe("\u5e74\u9f84\u9a8c\u8bc1");
    expect(zh.closeVerification).toBe("\u5173\u95ed\u5e74\u9f84\u9a8c\u8bc1");
  });

});

