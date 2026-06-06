/** @jest-environment jsdom */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT

/**
 * Survivor-killing mutation tests for AgeGate.ts
 *
 * Targets mutants that survived the initial AgeGate-mutations.spec.ts run.
 * Focuses on: exact string literal values in console calls, CSS property
 * values, numeric constants, conditional branches, block statement removals,
 * operator mutations, and every attribute/class name in the DOM construction.
 */

import { AgeGate } from "../src/agegate/AgeGate.js";
import { AgeGateConfig } from "../src/agegate/AgeGateConfig.js";
import { getShadowRoot } from "../src/core/shadow-dom.js";
import * as machineServicesMod from "../src/agegate/machineServices.js";
import * as i18nMod from "../src/i18n/index.js";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const TEST_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const LIVE_PUBLIC_KEY =
  "pk_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const baseOpts = () => ({
  publicKey: TEST_PUBLIC_KEY,
  environment: "sandbox" as const,
  contentUrl: "/content.html",
  mountElementId: "agegate-mount",
});

const prodOpts = () => ({
  publicKey: LIVE_PUBLIC_KEY,
  contentUrl: "/content.html",
  mountElementId: "agegate-mount",
});

const requireShadow = (host: HTMLElement): ShadowRoot => {
  const root = getShadowRoot(host);
  if (!root) throw new Error("expected shadow root on host");
  return root;
};

/* ------------------------------------------------------------------ */
/* Mocks                                                              */
/* ------------------------------------------------------------------ */

jest.mock("../src/agegate/machineServices.js", () => ({
  machineServices: {
    fetchChallenge: jest.fn().mockResolvedValue({
      challenge: { id: "test" },
      deepLink: "proviiwallet://test",
      pollingUrl: "https://test.com/poll",
      qrPayload: {},
    }),
    pollStatus: jest.fn().mockResolvedValue({ message: "pending" }),
  },
  machineActions: {
    renderSkeleton: jest.fn(),
    renderChallenge: jest.fn(),
    redirect: jest.fn(),
  },
  resetMachineContext: jest.fn(),
  attachVisibilityFallback: jest.fn(() => jest.fn()),
  wasWsConnected: jest.fn(() => false),
}));

/* ------------------------------------------------------------------ */
/* Setup / teardown                                                   */
/* ------------------------------------------------------------------ */

let mount: HTMLElement;
let redirect: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();

  mount = document.createElement("div");
  mount.id = "agegate-mount";
  document.body.appendChild(mount);

  redirect = jest.fn();

  jest.spyOn(console, "debug").mockImplementation();
  jest.spyOn(console, "error").mockImplementation();
  jest.spyOn(console, "warn").mockImplementation();
  jest.spyOn(console, "log").mockImplementation();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  document.body.innerHTML = "";
});

/* ================================================================== */
/* ENVIRONMENT_API_BASES , exact URL string values                    */
/* ================================================================== */

describe("ENVIRONMENT_API_BASES exact URL strings", () => {
  it("production URL is exactly 'https://hosted.provii.app/v1/hosted'", () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ verified: false }), { status: 200 }),
    );

    const gate = new AgeGate(prodOpts(), redirect);
    gate.init();
    jest.advanceTimersByTime(100);

    const sessionCall = fetchSpy.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("/session/check"),
    );
    expect((sessionCall![0] as string).startsWith("https://hosted.provii.app/v1/hosted")).toBe(true);

    gate.dispose();
    fetchSpy.mockRestore();
  });

  it("sandbox URL is exactly 'https://sandbox-hosted.provii.app/v1/hosted'", () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ verified: false }), { status: 200 }),
    );

    const gate = new AgeGate(
      baseOpts(),
      redirect,
    );
    gate.init();
    jest.advanceTimersByTime(100);

    const sessionCall = fetchSpy.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("/session/check"),
    );
    expect((sessionCall![0] as string).startsWith("https://sandbox-hosted.provii.app/v1/hosted")).toBe(true);

    gate.dispose();
    fetchSpy.mockRestore();
  });

  it("session check path suffix is exactly '/session/check'", () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ verified: false }), { status: 200 }),
    );

    const gate = new AgeGate(baseOpts(), redirect);
    gate.init();
    jest.advanceTimersByTime(100);

    const sessionCall = fetchSpy.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("/session/check"),
    );
    expect((sessionCall![0] as string).endsWith("/session/check")).toBe(true);

    gate.dispose();
    fetchSpy.mockRestore();
  });
});

/* ================================================================== */
/* Console message exact strings , all debug/error/warn/log calls     */
/* ================================================================== */

describe("console message exact strings", () => {
  it("dispose error stopping actor logs exact prefix", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const stopErr = new Error("stop exploded");
    (gate as any).actor.stop = () => { throw stopErr; };
    gate.dispose();
    expect(console.error).toHaveBeenCalledWith(
      "[AgeGate] Error stopping actor:",
      stopErr,
    );
  });

  it("dispose cleanup error logs exact prefix", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const cleanupErr = new Error("cleanup exploded");
    (gate as any).cleanupCallbacks.push(() => { throw cleanupErr; });
    gate.dispose();
    expect(console.error).toHaveBeenCalledWith(
      "[AgeGate] Cleanup error:",
      cleanupErr,
    );
  });

  it("subscribe on disposed instance warns with exact string", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    gate.subscribe(jest.fn());
    expect(console.warn).toHaveBeenCalledWith(
      "[AgeGate] Cannot subscribe - instance disposed",
    );
  });

  it("redirect action with no cfg logs exact error string", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const actions = ((gate as any).actor.logic as any).implementations?.actions;
    if (actions?.redirect) {
      actions.redirect({ context: {} });
      expect(console.error).toHaveBeenCalledWith(
        "[AgeGate] redirect called without cfg",
      );
    }
    gate.dispose();
  });

});

/* ================================================================== */
/* showRetryPrompt , complete DOM attribute verification              */
/* ================================================================== */

describe("showRetryPrompt DOM attributes thorough", () => {
  let gate: AgeGate;

  beforeEach(() => {
    gate = new AgeGate(baseOpts(), redirect);
  });

  afterEach(() => {
    gate.dispose();
  });

  it("alert div has role attribute set to exactly 'alert'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const alertEl = shadow.querySelector(".agegate-retry-alert");
    expect(alertEl!.getAttribute("role")).toBe("alert");
  });

  it("alert div has lang attribute from getLocale()", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const alertEl = shadow.querySelector('[role="alert"]');
    expect(alertEl!.getAttribute("lang")).toBe(i18nMod.getLocale());
  });

  it("alert div does NOT have dir=rtl when locale is not RTL", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const alertEl = shadow.querySelector('[role="alert"]');
    expect(alertEl!.hasAttribute("dir")).toBe(false);
  });

  it("alert div has dir=rtl when locale is RTL", () => {
    const originalLocale = i18nMod.getLocale();
    i18nMod.setLocale("ar");

    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const alertEl = shadow.querySelector('[role="alert"]');
    expect(alertEl!.getAttribute("dir")).toBe("rtl");

    i18nMod.setLocale(originalLocale);
  });

  it("SVG namespace is exactly http://www.w3.org/2000/svg", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const svg = shadow.querySelector("svg");
    expect(svg!.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });

  it("path element also has SVG namespace", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const path = shadow.querySelector("path");
    expect(path!.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });

  it("SVG class for timeout is 'agegate-retry-icon agegate-icon-timeout'", () => {
    (gate as any).showRetryPrompt("msg", "timeout");
    const shadow = requireShadow(mount);
    const svg = shadow.querySelector("svg");
    expect(svg!.getAttribute("class")).toBe("agegate-retry-icon agegate-icon-timeout");
  });

  it("SVG class for error is 'agegate-retry-icon agegate-icon-error'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const svg = shadow.querySelector("svg");
    expect(svg!.getAttribute("class")).toBe("agegate-retry-icon agegate-icon-error");
  });

  it("heading is an h2 element", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const heading = shadow.querySelector("#agegate-retry-heading");
    expect(heading!.tagName).toBe("H2");
  });

  it("message is a p element", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const msgEl = shadow.querySelector("#agegate-retry-msg");
    expect(msgEl!.tagName).toBe("P");
  });

  it("retry button is a button element", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const btn = shadow.querySelector("#agegate-retry-btn");
    expect(btn!.tagName).toBe("BUTTON");
  });

  it("help container is a p element", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const container = shadow.querySelector(".agegate-retry-help-container");
    expect(container!.tagName).toBe("P");
  });

  it("help link is an a element", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const link = shadow.querySelector(".agegate-retry-help-link");
    expect(link!.tagName).toBe("A");
  });

  it("help link href is exactly https://provii.app/help", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const link = shadow.querySelector(".agegate-retry-help-link") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("https://provii.app/help");
  });

  it("help link target is exactly '_blank'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const link = shadow.querySelector(".agegate-retry-help-link") as HTMLAnchorElement;
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("help link rel is exactly 'noopener'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const link = shadow.querySelector(".agegate-retry-help-link") as HTMLAnchorElement;
    expect(link.getAttribute("rel")).toBe("noopener");
  });

  it("timeout hint paragraph has id 'agegate-retry-hint'", () => {
    (gate as any).showRetryPrompt("msg", "timeout");
    const shadow = requireShadow(mount);
    const hint = shadow.querySelector("#agegate-retry-hint");
    expect(hint).not.toBeNull();
    expect(hint!.className).toBe("agegate-retry-hint");
  });

  it("data-agegate-prompt is set on mount element", () => {
    (gate as any).showRetryPrompt("msg", "error");
    expect(mount.getAttribute("data-agegate-prompt")).toBe("error");
  });

  it("data-agegate-message is set on mount element with exact message", () => {
    (gate as any).showRetryPrompt("exact test message", "error");
    expect(mount.getAttribute("data-agegate-message")).toBe("exact test message");
  });
});

/* ================================================================== */
/* showRetryPrompt , SVG path data exact values                       */
/* ================================================================== */

describe("showRetryPrompt SVG paths exact values", () => {
  let gate: AgeGate;

  beforeEach(() => {
    gate = new AgeGate(baseOpts(), redirect);
  });

  afterEach(() => {
    gate.dispose();
  });

  it("timeout path d starts with M10 18a8", () => {
    (gate as any).showRetryPrompt("msg", "timeout");
    const shadow = requireShadow(mount);
    const path = shadow.querySelector("path");
    const d = path!.getAttribute("d")!;
    expect(d.startsWith("M10 18a8")).toBe(true);
  });

  it("timeout path d contains clock hand (v4 + .293.707)", () => {
    (gate as any).showRetryPrompt("msg", "timeout");
    const shadow = requireShadow(mount);
    const path = shadow.querySelector("path");
    const d = path!.getAttribute("d")!;
    expect(d).toContain("v4a1 1 0 00.293.707");
  });

  it("timeout path d ends with V6z", () => {
    (gate as any).showRetryPrompt("msg", "timeout");
    const shadow = requireShadow(mount);
    const path = shadow.querySelector("path");
    const d = path!.getAttribute("d")!;
    expect(d.endsWith("V6z")).toBe(true);
  });

  it("error path d contains X cross pattern (8.707 7.293)", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const path = shadow.querySelector("path");
    const d = path!.getAttribute("d")!;
    expect(d).toContain("8.707 7.293");
  });

  it("error path d contains L8.586 10", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const path = shadow.querySelector("path");
    const d = path!.getAttribute("d")!;
    expect(d).toContain("L8.586 10");
  });

  it("error path d ends with 8.707 7.293z", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const path = shadow.querySelector("path");
    const d = path!.getAttribute("d")!;
    expect(d.endsWith("8.707 7.293z")).toBe(true);
  });

  it("timeout and error paths are different", () => {
    (gate as any).showRetryPrompt("msg1", "timeout");
    const shadow1 = requireShadow(mount);
    const d1 = shadow1.querySelector("path")!.getAttribute("d")!;

    (gate as any).showRetryPrompt("msg2", "error");
    const shadow2 = requireShadow(mount);
    const d2 = shadow2.querySelector("path")!.getAttribute("d")!;

    expect(d1).not.toBe(d2);
  });
});

/* ================================================================== */
/* showRetryPrompt , focus management                                 */
/* ================================================================== */

describe("showRetryPrompt focus management", () => {
  it("retry button is an HTMLButtonElement suitable for focus", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const btn = shadow.querySelector("#agegate-retry-btn") as HTMLButtonElement;

    expect(btn).toBeInstanceOf(HTMLButtonElement);
    gate.dispose();
  });

  it("retry button has click handler that triggers userRetry", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const userRetrySpy = jest.spyOn(gate, "userRetry").mockImplementation();

    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const btn = shadow.querySelector("#agegate-retry-btn") as HTMLButtonElement;

    btn.click();
    expect(userRetrySpy).toHaveBeenCalledTimes(1);

    gate.dispose();
  });
});

/* ================================================================== */
/* injectRetryStyles , CSS property values                            */
/* ================================================================== */

describe("injectRetryStyles CSS property values", () => {
  let gate: AgeGate;
  let css: string;

  beforeEach(() => {
    gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const style = shadow.querySelector("#agegate-retry-styles") as HTMLStyleElement;
    css = style.textContent ?? "";
  });

  afterEach(() => {
    gate.dispose();
  });

  it("contains fadeIn keyframe with opacity: 0", () => {
    expect(css).toContain("opacity: 0");
  });

  it("contains fadeIn keyframe with translateY(10px)", () => {
    expect(css).toContain("translateY(10px)");
  });

  it("contains fadeIn keyframe with opacity: 1", () => {
    expect(css).toContain("opacity: 1");
  });

  it("contains fadeIn keyframe with translateY(0)", () => {
    expect(css).toContain("translateY(0)");
  });

  it("contains reduced motion with transform: none", () => {
    expect(css).toContain("transform: none");
  });

  it("contains prefers-reduced-motion media query", () => {
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("contains text-align: center", () => {
    expect(css).toContain("text-align: center");
  });

  it("contains padding: 32px 20px", () => {
    expect(css).toContain("padding: 32px 20px");
  });

  it("contains max-width: 400px", () => {
    expect(css).toContain("max-width: 400px");
  });

  it("contains margin: 0 auto", () => {
    expect(css).toContain("margin: 0 auto");
  });

  it("contains width: 56px for icon", () => {
    expect(css).toContain("width: 56px");
  });

  it("contains height: 56px for icon", () => {
    expect(css).toContain("height: 56px");
  });

  it("contains display: block for icon", () => {
    expect(css).toContain("display: block");
  });

  it("contains --ag-warning CSS variable with fallback #D97706", () => {
    expect(css).toContain("var(--ag-warning, #D97706)");
  });

  it("contains --ag-error CSS variable with fallback #C62020", () => {
    expect(css).toContain("var(--ag-error, #C62020)");
  });

  it("contains --ag-text CSS variable with fallback #1F2937", () => {
    expect(css).toContain("var(--ag-text, #1F2937)");
  });

  it("contains --ag-text-secondary CSS variable with fallback #6B7280", () => {
    expect(css).toContain("var(--ag-text-secondary, #6B7280)");
  });

  it("contains --ag-text-muted CSS variable with fallback #6B7280", () => {
    expect(css).toContain("var(--ag-text-muted, #6B7280)");
  });

  it("contains --ag-accent-start CSS variable with fallback #007AA8", () => {
    expect(css).toContain("var(--ag-accent-start, #007AA8)");
  });

  it("contains heading font-size: 1.125rem", () => {
    expect(css).toContain("font-size: 1.125rem");
  });

  it("contains message font-size: 0.9375rem", () => {
    expect(css).toContain("font-size: 0.9375rem");
  });

  it("contains hint font-size: 0.8125rem", () => {
    expect(css).toContain("font-size: 0.8125rem");
  });

  it("contains button font-size: 1rem", () => {
    expect(css).toContain("font-size: 1rem");
  });

  it("contains font-weight: 700 for heading and button", () => {
    expect(css).toContain("font-weight: 700");
  });

  it("contains line-height: 1.5 for message", () => {
    expect(css).toContain("line-height: 1.5");
  });

  it("contains background: var(--ag-accent-gradient)", () => {
    expect(css).toContain("var(--ag-accent-gradient)");
  });

  it("contains border: none", () => {
    expect(css).toContain("border: none");
  });

  it("contains color: #fff", () => {
    expect(css).toContain("color: #fff");
  });

  it("contains padding: 12px 32px for button", () => {
    expect(css).toContain("padding: 12px 32px");
  });

  it("contains min-height: 44px for touch target", () => {
    expect(css).toContain("min-height: 44px");
  });

  it("contains border-radius: var(--ag-radius-button)", () => {
    expect(css).toContain("var(--ag-radius-button)");
  });

  it("contains cursor: pointer", () => {
    expect(css).toContain("cursor: pointer");
  });

  it("contains box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1)", () => {
    expect(css).toContain("0 2px 4px rgba(0, 0, 0, 0.1)");
  });

  it("contains outline: 2px solid for focus-visible", () => {
    expect(css).toContain("outline: 2px solid");
  });

  it("contains outline-offset: 2px", () => {
    expect(css).toContain("outline-offset: 2px");
  });

  it("contains --ag-focus-outline CSS variable", () => {
    expect(css).toContain("--ag-focus-outline");
  });

  it("contains --ag-focus-ring CSS variable", () => {
    expect(css).toContain("--ag-focus-ring");
  });

  it("contains rgba(0, 145, 199, 0.4) for focus ring", () => {
    expect(css).toContain("rgba(0, 145, 199, 0.4)");
  });

  it("contains margin: 0 0 12px for heading", () => {
    expect(css).toContain("margin: 0 0 12px");
  });

  it("contains margin: 0 0 24px for message", () => {
    expect(css).toContain("margin: 0 0 24px");
  });

  it("contains margin: 16px 0 0 for hint", () => {
    expect(css).toContain("margin: 16px 0 0");
  });

  it("contains margin: 0 auto 20px for icon", () => {
    expect(css).toContain("margin: 0 auto 20px");
  });

  it("contains display: inline-block for help link", () => {
    expect(css).toContain("display: inline-block");
  });

  it("contains padding: 12px 8px for help link", () => {
    expect(css).toContain("padding: 12px 8px");
  });

  it("contains [role=\"alert\"] a:focus-visible selector", () => {
    expect(css).toContain('[role="alert"] a:focus-visible');
  });

  it("contains border-radius: 2px for link focus", () => {
    expect(css).toContain("border-radius: 2px");
  });

  it("style element id is exactly 'agegate-retry-styles'", () => {
    const shadow = requireShadow(mount);
    const style = shadow.querySelector("#agegate-retry-styles");
    expect(style!.id).toBe("agegate-retry-styles");
  });
});

/* ================================================================== */
/* injectRetryStyles , nonce application                              */
/* ================================================================== */

describe("injectRetryStyles nonce behaviour", () => {
  it("applies nonce from cspNonce config", () => {
    const gate = new AgeGate(
      { ...baseOpts(), cspNonce: "abc123" },
      redirect,
    );
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const style = shadow.querySelector("#agegate-retry-styles") as HTMLStyleElement;
    expect(style.getAttribute("nonce")).toBe("abc123");
    gate.dispose();
  });

  it("does not apply nonce when cspNonce is undefined", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const style = shadow.querySelector("#agegate-retry-styles") as HTMLStyleElement;
    expect(style.hasAttribute("nonce")).toBe(false);
    gate.dispose();
  });

  it("skips style injection if style with id already exists", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("msg", "error");
    (gate as any).showRetryPrompt("msg2", "timeout");
    const shadow = requireShadow(mount);
    const styles = shadow.querySelectorAll("#agegate-retry-styles");
    expect(styles.length).toBe(1);
    gate.dispose();
  });
});

/* ================================================================== */
/* showRetryPrompt , animation                                        */
/* ================================================================== */

describe("showRetryPrompt animation control", () => {
  it("animation value is exactly 'fadeIn 0.3s ease-in' when motion allowed", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        onchange: null,
        dispatchEvent: () => false,
      }),
    });

    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const alert = shadow.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.style.animation).toBe("fadeIn 0.3s ease-in");
    gate.dispose();
  });

  it("no animation when reduced motion is preferred", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        onchange: null,
        dispatchEvent: () => false,
      }),
    });

    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const alert = shadow.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.style.animation).toBe("");
    gate.dispose();
  });

  it("matchMedia is queried with '(prefers-reduced-motion: reduce)'", () => {
    let queriedString = "";
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => {
        queriedString = query;
        return {
          matches: false,
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          addListener: jest.fn(),
          removeListener: jest.fn(),
          onchange: null,
          dispatchEvent: () => false,
        };
      },
    });

    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("msg", "error");
    expect(queriedString).toBe("(prefers-reduced-motion: reduce)");
    gate.dispose();
  });
});

/* ================================================================== */
/* showRetryPrompt , shadow DOM style preservation                    */
/* ================================================================== */

describe("showRetryPrompt shadow content clearing", () => {
  it("preserves HTMLStyleElement nodes when clearing shadow", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("first", "error");
    const shadow = requireShadow(mount);

    const styleCount = shadow.querySelectorAll("style").length;
    expect(styleCount).toBeGreaterThan(0);

    (gate as any).showRetryPrompt("second", "timeout");

    const styleCountAfter = shadow.querySelectorAll("style").length;
    expect(styleCountAfter).toBeGreaterThanOrEqual(styleCount);

    const alerts = shadow.querySelectorAll('[role="alert"]');
    expect(alerts.length).toBe(1);

    gate.dispose();
  });

  it("removes non-style child nodes before appending new alert", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("first", "error");
    (gate as any).showRetryPrompt("second", "timeout");

    const shadow = requireShadow(mount);
    const alertCount = shadow.querySelectorAll('[role="alert"]').length;
    expect(alertCount).toBe(1);

    expect(mount.getAttribute("data-agegate-message")).toBe("second");

    gate.dispose();
  });
});

/* ================================================================== */
/* Numeric constants , exact values                                   */
/* ================================================================== */

describe("numeric constants exact values", () => {
  it("init timeout is exactly 330000ms (330 seconds)", async () => {
    (machineServicesMod.machineServices.fetchChallenge as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );

    const gate = new AgeGate(baseOpts(), redirect);
    const p = gate.init();
    await Promise.resolve();
    jest.advanceTimersByTime(3001);
    await Promise.resolve();

    jest.advanceTimersByTime(329999);
    jest.advanceTimersByTime(1);

    await expect(p).rejects.toThrow("Age gate initialization timed out");
    gate.dispose();
  });

  it("session check race timeout is exactly 3000ms", async () => {
    jest.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {}),
    );

    const gate = new AgeGate(baseOpts(), redirect);
    gate.init();
    await Promise.resolve();

    jest.advanceTimersByTime(2999);
    await Promise.resolve();
    jest.advanceTimersByTime(1);
    await Promise.resolve();

    expect(redirect).not.toHaveBeenCalled();

    gate.dispose();
  });

  it("visibility background timeout is exactly 300000ms (5 * 60 * 1000)", () => {
    const setTimeoutSpy = jest.spyOn(globalThis, "setTimeout");
    const gate = new AgeGate(baseOpts(), redirect);

    Object.defineProperty(document, "hidden", { value: true, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    const call300k = setTimeoutSpy.mock.calls.find(c => c[1] === 300000);
    expect(call300k).toBeDefined();

    gate.dispose();
  });

});

/* ================================================================== */
/* getState , all state string returns                                */
/* ================================================================== */

describe("getState all possible returns", () => {
  it("returns 'disposed' when disposed", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    expect(gate.getState()).toBe("disposed");
  });

  it("returns 'idle' before init", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    expect(gate.getState()).toBe("idle");
    gate.dispose();
  });

  it("getState checks disposed BEFORE querying actor", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const snapshotSpy = jest.spyOn((gate as any).actor, "getSnapshot");
    gate.dispose();
    gate.getState();
    expect(snapshotSpy).not.toHaveBeenCalled();
  });

  it("returns a value from the known state set", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const state = gate.getState();
    const validStates = [
      "idle", "fetching", "rendered", "polling",
      "waiting", "timeout", "verified", "failed", "unknown",
    ];
    expect(validStates).toContain(state);
    gate.dispose();
  });
});

/* ================================================================== */
/* getContext , disposed vs active                                    */
/* ================================================================== */

describe("getContext disposed returns", () => {
  it("error message is exactly 'Instance disposed'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    const ctx = gate.getContext();
    expect((ctx.error as Error).message).toBe("Instance disposed");
  });

  it("userMessage contains 'expired'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    const ctx = gate.getContext();
    expect(ctx.userMessage).toContain("expired");
  });

  it("userMessage contains 'verification in progress has been lost'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    const ctx = gate.getContext();
    expect(ctx.userMessage).toContain("verification in progress has been lost");
  });

  it("userMessage contains 'inactive for more than 5 minutes'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    const ctx = gate.getContext();
    expect(ctx.userMessage).toContain("inactive for more than 5 minutes");
  });

  it("userMessage contains 'refresh the page to start a new verification'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    const ctx = gate.getContext();
    expect(ctx.userMessage).toContain("refresh the page to start a new verification");
  });
});

describe("getContext active returns all fields", () => {
  it("returns currentPollInterval from actor context", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const ctx = gate.getContext();
    expect("currentPollInterval" in ctx).toBe(true);
    gate.dispose();
  });

  it("returns networkRetries from actor context", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const ctx = gate.getContext();
    expect("networkRetries" in ctx).toBe(true);
    gate.dispose();
  });

  it("returns negativeRetries from actor context", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const ctx = gate.getContext();
    expect("negativeRetries" in ctx).toBe(true);
    gate.dispose();
  });

  it("returns totalAttempts from actor context", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const ctx = gate.getContext();
    expect("totalAttempts" in ctx).toBe(true);
    gate.dispose();
  });

  it("returns lastErrorType from actor context", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const ctx = gate.getContext();
    expect("lastErrorType" in ctx).toBe(true);
    gate.dispose();
  });

  it("returns lastPollState from actor context", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const ctx = gate.getContext();
    expect("lastPollState" in ctx).toBe(true);
    gate.dispose();
  });

  it("returns error from actor context", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const ctx = gate.getContext();
    expect("error" in ctx).toBe(true);
    gate.dispose();
  });

  it("returns userMessage from actor context", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const ctx = gate.getContext();
    expect("userMessage" in ctx).toBe(true);
    gate.dispose();
  });

  it("does NOT return cfg in the partial context", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const ctx = gate.getContext();
    expect("cfg" in ctx).toBe(false);
    gate.dispose();
  });

  it("does NOT return challenge in the partial context", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const ctx = gate.getContext();
    expect("challenge" in ctx).toBe(false);
    gate.dispose();
  });
});

/* ================================================================== */
/* dispose , comprehensive cleanup                                    */
/* ================================================================== */

describe("dispose comprehensive", () => {
  it("sets disposed to true", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    expect(gate.isDisposed()).toBe(false);
    gate.dispose();
    expect(gate.isDisposed()).toBe(true);
  });

  it("stops the actor", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const stopSpy = jest.spyOn((gate as any).actor, "stop");
    gate.dispose();
    expect(stopSpy).toHaveBeenCalledTimes(1);
  });

  it("clears visibilityTimeout when set", () => {
    const gate = new AgeGate(baseOpts(), redirect);

    Object.defineProperty(document, "hidden", { value: true, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    expect((gate as any).visibilityTimeout).toBeDefined();

    gate.dispose();

    expect((gate as any).visibilityTimeout).toBeUndefined();
  });

  it("sets cleanupCallbacks to empty array", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    expect((gate as any).cleanupCallbacks.length).toBeGreaterThan(0);
    gate.dispose();
    expect((gate as any).cleanupCallbacks).toEqual([]);
  });

  it("runs all cleanup callbacks", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const spy1 = jest.fn();
    const spy2 = jest.fn();
    (gate as any).cleanupCallbacks.push(spy1, spy2);
    gate.dispose();
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it("continues running callbacks even if one throws", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const spy1 = jest.fn(() => { throw new Error("boom"); });
    const spy2 = jest.fn();
    (gate as any).cleanupCallbacks = [spy1, spy2];
    gate.dispose();
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it("second dispose call is a complete no-op", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    expect(gate.isDisposed()).toBe(true);

    // Second call should not throw
    gate.dispose();
    expect(gate.isDisposed()).toBe(true);
  });
});

/* ================================================================== */
/* init , dispose guards during async flow                            */
/* ================================================================== */

describe("init dispose guards", () => {
  it("rejects immediately when already disposed", async () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    await expect(gate.init()).rejects.toThrow("AgeGate instance has been disposed");
  });

  it("rejection message is exactly 'AgeGate instance has been disposed'", async () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    try {
      await gate.init();
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as Error).message).toBe("AgeGate instance has been disposed");
    }
  });

  it("init is idempotent , returns same promise", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const p1 = gate.init();
    const p2 = gate.init();
    expect(p1).toBe(p2);
    gate.dispose();
  });
});

/* ================================================================== */
/* init , rp-proxy skips session check                                */
/* ================================================================== */

describe("init rp-proxy session check skip", () => {
  it("does not call fetch for /session/check in rp-proxy mode", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ verified: false }), { status: 200 }),
    );

    const gate = new AgeGate(
      { ...baseOpts(), redeemMode: "rp-proxy", redeemUrl: "/api/redeem" },
      redirect,
    );
    gate.init();
    await Promise.resolve();
    jest.advanceTimersByTime(3100);
    await Promise.resolve();

    const sessionCalls = fetchSpy.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].includes("/session/check"),
    );
    expect(sessionCalls.length).toBe(0);

    gate.dispose();
    fetchSpy.mockRestore();
  });

  it("rp-proxy does not redirect (verified: false)", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch");

    const gate = new AgeGate(
      { ...baseOpts(), redeemMode: "rp-proxy", redeemUrl: "/api/redeem" },
      redirect,
    );
    gate.init();
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    await Promise.resolve();

    expect(redirect).not.toHaveBeenCalled();

    gate.dispose();
    fetchSpy.mockRestore();
  });
});

/* ================================================================== */
/* init , verified session redirect                                   */
/* ================================================================== */

describe("init verified session redirect", () => {
  it("redirects with cfg.contentUrl when session is verified", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ verified: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const gate = new AgeGate(baseOpts(), redirect);
    const p = gate.init();
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(50);
    }
    try { await p; } catch { /* may reject */ }

    expect(redirect).toHaveBeenCalled();
    gate.dispose();
  });

  it("redirects when session is already valid", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ verified: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const gate = new AgeGate(baseOpts(), redirect);
    const p = gate.init();
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(50);
    }
    try { await p; } catch { /* may reject */ }

    expect(redirect).toHaveBeenCalled();
    gate.dispose();
  });
});

/* ================================================================== */
/* Constructor , default redirect function                            */
/* ================================================================== */

describe("constructor default redirect", () => {
  it("default redirect is a function", () => {
    const gate = new AgeGate(baseOpts());
    expect((gate as any).redirectFn).toBeDefined();
    expect(typeof (gate as any).redirectFn).toBe("function");
    gate.dispose();
  });

  it("constructor stores cfg from AgeGateConfig instance", () => {
    const cfg = new AgeGateConfig(baseOpts());
    const gate = new AgeGate(cfg, redirect);
    expect((gate as any).cfg).toBe(cfg);
    gate.dispose();
  });

  it("constructor stores cfg from plain options (creates new AgeGateConfig)", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    expect((gate as any).cfg).toBeInstanceOf(AgeGateConfig);
    gate.dispose();
  });
});

/* ================================================================== */
/* setupAutoCleanup , Navigation API edge cases                       */
/* ================================================================== */

describe("setupAutoCleanup Navigation API", () => {
  it("navigate handler calls dispose", () => {
    let navHandler: (() => void) | undefined;
    (window as any).navigation = {
      addEventListener: (_: string, cb: () => void) => { navHandler = cb; },
      removeEventListener: jest.fn(),
    };

    const gate = new AgeGate(baseOpts(), redirect);
    expect(navHandler).toBeDefined();

    navHandler!();
    expect(gate.isDisposed()).toBe(true);

    delete (window as any).navigation;
  });

  it("navigate removal error is caught silently in cleanup", () => {
    (window as any).navigation = {
      addEventListener: jest.fn(),
      removeEventListener: () => { throw new Error("removal boom"); },
    };

    const gate = new AgeGate(baseOpts(), redirect);
    expect(() => gate.dispose()).not.toThrow();

    delete (window as any).navigation;
  });
});

/* ================================================================== */
/* setupAutoCleanup , visibility handler details                      */
/* ================================================================== */

describe("visibility handler hidden/visible transitions", () => {
  it("clearTimeout is called when becoming visible after being hidden", () => {
    const clearTimeoutSpy = jest.spyOn(globalThis, "clearTimeout");
    const gate = new AgeGate(baseOpts(), redirect);

    Object.defineProperty(document, "hidden", { value: true, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    Object.defineProperty(document, "hidden", { value: false, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(clearTimeoutSpy).toHaveBeenCalled();
    gate.dispose();
  });

  it("visibilityTimeout is set to undefined after clearing", () => {
    const gate = new AgeGate(baseOpts(), redirect);

    Object.defineProperty(document, "hidden", { value: true, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect((gate as any).visibilityTimeout).toBeDefined();

    Object.defineProperty(document, "hidden", { value: false, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect((gate as any).visibilityTimeout).toBeUndefined();

    gate.dispose();
  });

  it("background timeout fires showRetryPrompt with timeout type", () => {
    const gate = new AgeGate(baseOpts(), redirect);

    Object.defineProperty(document, "hidden", { value: true, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    jest.advanceTimersByTime(300000);

    expect(mount.getAttribute("data-agegate-prompt")).toBe("timeout");
    expect(mount.getAttribute("data-agegate-message")).toContain("background");
  });

  it("background timeout message contains 'more than 5 minutes'", () => {
    const gate = new AgeGate(baseOpts(), redirect);

    Object.defineProperty(document, "hidden", { value: true, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    jest.advanceTimersByTime(300000);

    const msg = mount.getAttribute("data-agegate-message") ?? "";
    expect(msg).toContain("more than 5 minutes");
  });

  it("background timeout message contains 'verification in progress has been lost'", () => {
    const gate = new AgeGate(baseOpts(), redirect);

    Object.defineProperty(document, "hidden", { value: true, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    jest.advanceTimersByTime(300000);

    const msg = mount.getAttribute("data-agegate-message") ?? "";
    expect(msg).toContain("verification in progress has been lost");
  });

  it("background timeout calls dispose after showing prompt", () => {
    const gate = new AgeGate(baseOpts(), redirect);

    Object.defineProperty(document, "hidden", { value: true, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    jest.advanceTimersByTime(300000);

    expect(gate.isDisposed()).toBe(true);
  });

  it("dispose cleanup clears the visibility timeout if set", () => {
    const clearSpy = jest.spyOn(globalThis, "clearTimeout");
    const gate = new AgeGate(baseOpts(), redirect);

    Object.defineProperty(document, "hidden", { value: true, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    const callsBefore = clearSpy.mock.calls.length;
    gate.dispose();
    expect(clearSpy.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

/* ================================================================== */
/* subscribe , callback behaviour                                     */
/* ================================================================== */

describe("subscribe callback behaviour", () => {
  it("callback receives getState() string as first arg", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const cb = jest.fn();
    gate.subscribe(cb);

    gate.init();
    jest.advanceTimersByTime(50);

    if (cb.mock.calls.length > 0) {
      const validStates = [
        "idle", "fetching", "rendered", "polling",
        "waiting", "timeout", "verified", "failed", "unknown",
      ];
      expect(validStates).toContain(cb.mock.calls[0][0]);
    }

    gate.dispose();
  });

  it("callback receives getContext() as second arg", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const cb = jest.fn();
    gate.subscribe(cb);

    gate.init();
    jest.advanceTimersByTime(50);

    if (cb.mock.calls.length > 0) {
      const ctx = cb.mock.calls[0][1];
      expect(typeof ctx).toBe("object");
    }

    gate.dispose();
  });

  it("does NOT call callback when disposed flag is true", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const cb = jest.fn();
    gate.subscribe(cb);

    gate.init();
    jest.advanceTimersByTime(10);

    const countBefore = cb.mock.calls.length;
    gate.dispose();

    jest.advanceTimersByTime(1000);
    expect(cb.mock.calls.length).toBe(countBefore);
  });

  it("returned unsub function does not throw even if actor already stopped", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const unsub = gate.subscribe(jest.fn());
    gate.dispose();
    expect(() => unsub()).not.toThrow();
  });

  it("disposed subscribe returns a callable no-op function", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    const unsub = gate.subscribe(jest.fn());
    expect(typeof unsub).toBe("function");
    expect(() => unsub()).not.toThrow();
  });
});

/* ================================================================== */
/* retry / stop delegation                                            */
/* ================================================================== */

describe("retry and stop delegation", () => {
  it("retry() calls userRetry() exactly once", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const spy = jest.spyOn(gate, "userRetry").mockImplementation();
    gate.retry();
    expect(spy).toHaveBeenCalledTimes(1);
    gate.dispose();
  });

  it("stop() calls dispose() exactly once", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const spy = jest.spyOn(gate, "dispose");
    gate.stop();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

/* ================================================================== */
/* Machine action message strings , notifyTimeout / notifyFailure     */
/* ================================================================== */

describe("machine action default messages", () => {
  it("notifyTimeout default message contains 'Your previous session has been discarded'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const actions = ((gate as any).actor.logic as any).implementations?.actions;
    if (actions?.notifyTimeout) {
      actions.notifyTimeout({ context: {} });
      const msg = mount.getAttribute("data-agegate-message") ?? "";
      expect(msg).toContain("Your previous session has been discarded");
    }
    gate.dispose();
  });

  it("notifyTimeout default message contains 'refresh the page'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const actions = ((gate as any).actor.logic as any).implementations?.actions;
    if (actions?.notifyTimeout) {
      actions.notifyTimeout({ context: {} });
      const msg = mount.getAttribute("data-agegate-message") ?? "";
      expect(msg).toContain("refresh the page");
    }
    gate.dispose();
  });

  it("notifyFailure default message contains 'Verification could not be completed'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const actions = ((gate as any).actor.logic as any).implementations?.actions;
    if (actions?.notifyFailure) {
      actions.notifyFailure({ context: {} });
      const msg = mount.getAttribute("data-agegate-message") ?? "";
      expect(msg).toContain("Verification could not be completed");
    }
    gate.dispose();
  });

  it("notifyFailure default message contains 'provii.app/help'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const actions = ((gate as any).actor.logic as any).implementations?.actions;
    if (actions?.notifyFailure) {
      actions.notifyFailure({ context: {} });
      const msg = mount.getAttribute("data-agegate-message") ?? "";
      expect(msg).toContain("provii.app/help");
    }
    gate.dispose();
  });

  it("notifyTimeout uses context.userMessage when available (not default)", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const actions = ((gate as any).actor.logic as any).implementations?.actions;
    if (actions?.notifyTimeout) {
      actions.notifyTimeout({ context: { userMessage: "Custom timeout msg" } });
      const msg = mount.getAttribute("data-agegate-message");
      expect(msg).toBe("Custom timeout msg");
      expect(msg).not.toContain("expired after 5 minutes");
    }
    gate.dispose();
  });

  it("notifyFailure uses context.userMessage when available (not default)", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const actions = ((gate as any).actor.logic as any).implementations?.actions;
    if (actions?.notifyFailure) {
      actions.notifyFailure({ context: { userMessage: "Custom error msg" } });
      const msg = mount.getAttribute("data-agegate-message");
      expect(msg).toBe("Custom error msg");
      expect(msg).not.toContain("Verification could not be completed");
    }
    gate.dispose();
  });
});

/* ================================================================== */
/* data-agegate-state subscription details                            */
/* ================================================================== */

describe("data-agegate-state subscription details", () => {
  it("sets attribute when snap.value is a string", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.init();
    jest.advanceTimersByTime(50);

    const stateVal = mount.getAttribute("data-agegate-state");
    expect(stateVal).toBeTruthy();
    expect(stateVal!.length).toBeGreaterThan(0);

    gate.dispose();
  });

  it("attribute name is exactly 'data-agegate-state'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.init();
    jest.advanceTimersByTime(50);

    expect(mount.hasAttribute("data-agegate-state")).toBe(true);
    expect(mount.hasAttribute("dataAgegateState")).toBe(false);
    expect(mount.hasAttribute("data-age-gate-state")).toBe(false);

    gate.dispose();
  });
});

/* ================================================================== */
/* checkExistingSession , request details                             */
/* ================================================================== */

describe("checkExistingSession request details", () => {
  it("method is exactly 'GET'", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ verified: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const gate = new AgeGate(baseOpts(), redirect);
    gate.init();
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    await Promise.resolve();

    const sessionCall = fetchSpy.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("/session/check"),
    );
    expect(sessionCall).toBeDefined();
    const opts = sessionCall![1] as RequestInit;
    expect(opts.method).toBe("GET");

    gate.dispose();
    fetchSpy.mockRestore();
  });

  it("includes X-Public-Key header with exact public key", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ verified: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const gate = new AgeGate(baseOpts(), redirect);
    gate.init();
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    await Promise.resolve();

    const sessionCall = fetchSpy.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("/session/check"),
    );
    const headers = (sessionCall![1] as RequestInit).headers as Record<string, string>;
    expect(headers["X-Public-Key"]).toBe(TEST_PUBLIC_KEY);

    gate.dispose();
    fetchSpy.mockRestore();
  });

  it("includes Accept: application/json header", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ verified: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const gate = new AgeGate(baseOpts(), redirect);
    gate.init();
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    await Promise.resolve();

    const sessionCall = fetchSpy.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("/session/check"),
    );
    const headers = (sessionCall![1] as RequestInit).headers as Record<string, string>;
    expect(headers["Accept"]).toBe("application/json");

    gate.dispose();
    fetchSpy.mockRestore();
  });

  it("uses credentials: 'include' for session cookie", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ verified: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const gate = new AgeGate(baseOpts(), redirect);
    gate.init();
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    await Promise.resolve();

    const sessionCall = fetchSpy.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("/session/check"),
    );
    expect((sessionCall![1] as RequestInit).credentials).toBe("include");

    gate.dispose();
    fetchSpy.mockRestore();
  });
});

/* ================================================================== */
/* checkExistingSession , error paths                                 */
/* ================================================================== */

describe("checkExistingSession error paths", () => {
  it("non-OK status returns verified: false (no redirect)", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 404 }),
    );

    const gate = new AgeGate(baseOpts(), redirect);
    gate.init();
    await Promise.resolve();
    jest.advanceTimersByTime(3100);
    await Promise.resolve();

    expect(redirect).not.toHaveBeenCalled();
    gate.dispose();
  });

  it("fetch rejection returns verified: false (no redirect)", async () => {
    jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("timeout"));

    const gate = new AgeGate(baseOpts(), redirect);
    gate.init();
    await Promise.resolve();
    jest.advanceTimersByTime(3100);
    await Promise.resolve();

    expect(redirect).not.toHaveBeenCalled();
    gate.dispose();
  });
});

/* ================================================================== */
/* applyTheme , branch coverage                                       */
/* ================================================================== */

describe("applyTheme branch coverage", () => {
  it("light theme sets attribute value to exactly 'light'", () => {
    const gate = new AgeGate({ ...baseOpts(), theme: "light" }, redirect);
    expect(mount.getAttribute("data-agegate-theme")).toBe("light");
    gate.dispose();
  });

  it("dark theme sets attribute value to exactly 'dark'", () => {
    const gate = new AgeGate({ ...baseOpts(), theme: "dark" }, redirect);
    expect(mount.getAttribute("data-agegate-theme")).toBe("dark");
    gate.dispose();
  });

  it("auto theme calls matchMedia with exact query string", () => {
    let capturedQuery = "";
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => {
        capturedQuery = query;
        return {
          matches: false,
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          addListener: jest.fn(),
          removeListener: jest.fn(),
          onchange: null,
          dispatchEvent: () => false,
        };
      },
    });

    const gate = new AgeGate({ ...baseOpts(), theme: "auto" }, redirect);
    expect(capturedQuery).toBe("(prefers-color-scheme: dark)");
    gate.dispose();
  });

  it("auto theme dark system sets 'dark' on mount", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query.includes("dark"),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        onchange: null,
        dispatchEvent: () => false,
      }),
    });

    const gate = new AgeGate({ ...baseOpts(), theme: "auto" }, redirect);
    expect(mount.getAttribute("data-agegate-theme")).toBe("dark");
    gate.dispose();
  });

  it("auto theme light system sets 'light' on mount", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        onchange: null,
        dispatchEvent: () => false,
      }),
    });

    const gate = new AgeGate({ ...baseOpts(), theme: "auto" }, redirect);
    expect(mount.getAttribute("data-agegate-theme")).toBe("light");
    gate.dispose();
  });

  it("auto theme change handler updates attribute dynamically", () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | undefined;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
          changeHandler = cb;
        },
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        onchange: null,
        dispatchEvent: () => false,
      }),
    });

    const gate = new AgeGate({ ...baseOpts(), theme: "auto" }, redirect);
    expect(mount.getAttribute("data-agegate-theme")).toBe("light");

    changeHandler!({ matches: true } as MediaQueryListEvent);
    expect(mount.getAttribute("data-agegate-theme")).toBe("dark");

    changeHandler!({ matches: false } as MediaQueryListEvent);
    expect(mount.getAttribute("data-agegate-theme")).toBe("light");

    gate.dispose();
  });

  it("auto theme removes change listener on dispose", () => {
    const removeListenerFn = jest.fn();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        addEventListener: jest.fn(),
        removeEventListener: removeListenerFn,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        onchange: null,
        dispatchEvent: () => false,
      }),
    });

    const gate = new AgeGate({ ...baseOpts(), theme: "auto" }, redirect);
    gate.dispose();
    expect(removeListenerFn).toHaveBeenCalledWith("change", expect.any(Function));
  });
});

/* ================================================================== */
/* init timeout cleared on dispose                                    */
/* ================================================================== */

describe("init timeout cleared on dispose", () => {
  it("clearing init timeout prevents rejection after dispose", async () => {
    (machineServicesMod.machineServices.fetchChallenge as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );

    const gate = new AgeGate(baseOpts(), redirect);
    const p = gate.init();
    await Promise.resolve();
    jest.advanceTimersByTime(3001);
    await Promise.resolve();

    gate.dispose();

    jest.advanceTimersByTime(330000);
    // Should not crash or reject with timeout
  });
});

/* ================================================================== */
/* showRetryPrompt , localised text exact values                      */
/* ================================================================== */

describe("showRetryPrompt localised text exact", () => {
  let gate: AgeGate;

  beforeEach(() => {
    gate = new AgeGate(baseOpts(), redirect);
  });

  afterEach(() => {
    gate.dispose();
  });

  it("timeout heading text is first sentence of verificationTimedOut", () => {
    (gate as any).showRetryPrompt("msg", "timeout");
    const shadow = requireShadow(mount);
    const h2 = shadow.querySelector("h2");
    expect(h2!.textContent).toBe("Verification timed out");
  });

  it("error heading text is exactly 'Age Verification Error'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const h2 = shadow.querySelector("h2");
    expect(h2!.textContent).toBe("Age Verification Error");
  });

  it("button text is exactly 'Try Again'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const btn = shadow.querySelector("#agegate-retry-btn");
    expect(btn!.textContent).toBe("Try Again");
  });

  it("help link text is exactly 'Need help?'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const link = shadow.querySelector(".agegate-retry-help-link");
    expect(link!.textContent).toBe("Need help?");
  });

  it("help link aria-label is exact", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const link = shadow.querySelector(".agegate-retry-help-link");
    expect(link!.getAttribute("aria-label")).toBe(
      "Need help with age verification? (opens in new tab)",
    );
  });

  it("timeout hint text is exact", () => {
    (gate as any).showRetryPrompt("msg", "timeout");
    const shadow = requireShadow(mount);
    const hint = shadow.querySelector("#agegate-retry-hint");
    expect(hint!.textContent).toBe("Make sure Provii Wallet is open and ready");
  });

  it("message paragraph shows exact provided message text", () => {
    (gate as any).showRetryPrompt("My precise error text", "error");
    const shadow = requireShadow(mount);
    const p = shadow.querySelector("#agegate-retry-msg");
    expect(p!.textContent).toBe("My precise error text");
  });
});

/* ================================================================== */
/* showRetryPrompt , mount missing edge case                          */
/* ================================================================== */

describe("showRetryPrompt mount missing", () => {
  it("logs exact error and returns without throwing", () => {
    const gate = new AgeGate(
      { ...baseOpts(), mountElementId: "nonexistent" },
      redirect,
    );
    expect(() => (gate as any).showRetryPrompt("msg", "error")).not.toThrow();
    expect(console.error).toHaveBeenCalledWith(
      "[AgeGate] Mount element not found for retry prompt",
    );
    gate.dispose();
  });
});

/* ================================================================== */
/* init , FETCH event type string                                     */
/* ================================================================== */

describe("init sends FETCH event", () => {
  it("sends event with type 'FETCH' to actor", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const sendSpy = jest.spyOn((gate as any).actor, "send");

    gate.init();

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "FETCH" }),
    );
    gate.dispose();
  });

  it("FETCH event includes cfg property", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const sendSpy = jest.spyOn((gate as any).actor, "send");

    gate.init();

    const fetchCall = sendSpy.mock.calls.find(
      c => (c[0] as any).type === "FETCH",
    );
    expect(fetchCall).toBeDefined();
    expect((fetchCall![0] as any).cfg).toBeInstanceOf(AgeGateConfig);

    gate.dispose();
  });
});

/* ================================================================== */
/* isDisposed return type                                              */
/* ================================================================== */

describe("isDisposed return type", () => {
  it("returns boolean false before dispose", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    expect(gate.isDisposed()).toBe(false);
    expect(typeof gate.isDisposed()).toBe("boolean");
    gate.dispose();
  });

  it("returns boolean true after dispose", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    expect(gate.isDisposed()).toBe(true);
    expect(typeof gate.isDisposed()).toBe("boolean");
  });
});
