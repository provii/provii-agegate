/**
 * @jest-environment jsdom
 */

import { en } from "../src/i18n/locales/en.js";
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
import { RTL_LOCALES } from "../src/i18n/types.js";
import type { LocaleStrings } from "../src/i18n/types.js";

const ALL_LOCALES: Record<string, LocaleStrings> = {
  ar, de, en, es, fr, hi, it: itLocale, ja, ko, nl, pl, pt, ru, tr, zh,
};

const EN_KEYS = Object.keys(en) as (keyof LocaleStrings)[];

describe("locale integrity", () => {
  it("en has all required keys as non-empty strings", () => {
    for (const key of EN_KEYS) {
      expect(typeof en[key]).toBe("string");
      expect(en[key].length).toBeGreaterThan(0);
    }
  });

  it.each(Object.entries(ALL_LOCALES).filter(([code]) => code !== "en"))(
    "%s has every key that en has",
    (_code, locale) => {
      for (const key of EN_KEYS) {
        expect(typeof locale[key]).toBe("string");
        expect(locale[key].length).toBeGreaterThan(0);
      }
    },
  );

  it.each(Object.entries(ALL_LOCALES).filter(([code]) => code !== "en"))(
    "%s has no extra keys beyond en",
    (_code, locale) => {
      const localeKeys = Object.keys(locale);
      expect(localeKeys).toEqual(expect.arrayContaining(EN_KEYS));
      expect(localeKeys.length).toBe(EN_KEYS.length);
    },
  );

  it("{age} placeholder preserved in all locales", () => {
    for (const [_code, locale] of Object.entries(ALL_LOCALES)) {
      expect(locale.verifyOverAge).toContain("{age}");
      expect(locale.verifyUnderAge).toContain("{age}");
    }
  });
});

describe("en locale pinned values", () => {
  it("header strings", () => {
    expect(en.headerTitle).toBe("Age Verification");
    expect(en.headerSubtitle).toBe("Verify your age privately");
    expect(en.headerSubtitlePreparing).toBe(
      "Preparing secure verification...",
    );
  });

  it("age requirement strings", () => {
    expect(en.verifyOverAge).toBe("Verify you are {age} or older");
    expect(en.verifyUnderAge).toBe("Verify you are under {age}");
  });

  it("mobile CTA strings", () => {
    expect(en.verifyButtonLabel).toBe("Verify with Provii Wallet");
    expect(en.verifyButtonAriaLabel).toBe(
      "Verify with Provii Wallet (opens app)",
    );
    expect(en.verifyButtonOpening).toBe("Opening Provii Wallet...");
    expect(en.verifyButtonChecking).toBe("Checking verification...");
    expect(en.mobileStatusTap).toBe("Tap to verify your age securely");
  });

  it("desktop QR strings", () => {
    expect(en.scanQrInstruction).toBe(
      "Scan the QR code with Provii Wallet to verify your age",
    );
    expect(en.qrCodeAriaLabel).toBe("QR code for age verification");
    expect(en.shortCodeLabel).toBe("Or enter this code manually:");
    expect(en.verificationCodeAriaPrefix).toBe("Verification code:");
  });

  it("QR toggle strings", () => {
    expect(en.qrToggleLabel).toBe("Or scan with another device:");
    expect(en.showQrCode).toBe("Show QR Code");
    expect(en.hideQrCode).toBe("Hide QR Code");
    expect(en.qrCodeUnavailable).toBe("QR code unavailable");
  });

  it("footer and help strings", () => {
    expect(en.needHelp).toBe("Need help?");
    expect(en.poweredBy).toBe("Powered by");
    expect(en.footerSubtitle).toBe("Privacy preserving age verification");
    expect(en.privacyPolicyLinkLabel).toBe("Privacy policy");
  });

  it("overlay loading strings", () => {
    expect(en.loading).toBe("Loading...");
    expect(en.initialisingVerification).toBe(
      "Initialising age verification...",
    );
    expect(en.completingVerification).toBe("Completing verification...");
  });

  it("status message strings", () => {
    expect(en.stillWaiting).toBe("Still waiting for verification...");
    expect(en.proofReceivedConfirming).toBe(
      "Proof received, confirming verification...",
    );
    expect(en.verificationTimedOut).toContain("timed out");
    expect(en.sessionExpired).toContain("expired");
    expect(en.somethingWentWrong).toContain("went wrong");
  });

  it("error and retry strings", () => {
    expect(en.errorTitle).toBe("Age Verification Error");
    expect(en.tryAgain).toBe("Try Again");
    expect(en.timeoutHint).toBe("Make sure Provii Wallet is open and ready");
  });

  it("sandbox strings", () => {
    expect(en.sandboxTesting).toBe("Sandbox Testing");
    expect(en.simulatePass).toContain("Simulate Pass");
    expect(en.simulateFail).toContain("Simulate Fail");
    expect(en.simulating).toBe("Simulating...");
  });

  it("accessibility strings", () => {
    expect(en.ageVerificationRegion).toBe("Age verification");
    expect(en.closeVerification).toBe("Close age verification");
    expect(en.leaveSite).toBe("Leave this site");
    expect(en.timeNotice).toContain("5 minutes");
  });
});

describe("RTL_LOCALES", () => {
  it("contains ar", () => {
    expect(RTL_LOCALES.has("ar")).toBe(true);
  });

  it("contains he, fa, ur", () => {
    expect(RTL_LOCALES.has("he")).toBe(true);
    expect(RTL_LOCALES.has("fa")).toBe(true);
    expect(RTL_LOCALES.has("ur")).toBe(true);
  });

  it("does not contain LTR locales", () => {
    expect(RTL_LOCALES.has("en")).toBe(false);
    expect(RTL_LOCALES.has("de")).toBe(false);
    expect(RTL_LOCALES.has("fr")).toBe(false);
    expect(RTL_LOCALES.has("zh")).toBe(false);
    expect(RTL_LOCALES.has("ja")).toBe(false);
  });

  it("has exactly 4 entries", () => {
    expect(RTL_LOCALES.size).toBe(4);
  });
});
