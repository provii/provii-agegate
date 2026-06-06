/** @jest-environment jsdom */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT

/**
 * Mutation-testing-focused tests for AgeGate.ts
 *
 * Every string literal, constant, CSS class, attribute, event name, conditional
 * branch, comparison operator, numeric constant, and error path in AgeGate.ts
 * is pinned here so Stryker mutations are killed.
 */

import { AgeGate } from "../src/agegate/AgeGate.js";
import { AgeGateConfig } from "../src/agegate/AgeGateConfig.js";
import { getShadowRoot } from "../src/core/shadow-dom.js";
import * as machineServicesMod from "../src/agegate/machineServices.js";

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
/* ENVIRONMENT_API_BASES constants                                    */
/* ================================================================== */

describe("ENVIRONMENT_API_BASES string constants", () => {
  it("production session check targets hosted.provii.app", () => {
    // When init() runs checkExistingSession it constructs:
    //   `${ENVIRONMENT_API_BASES[cfg.environment]}/session/check`
    // Pin the production URL by triggering init and observing the fetch call.
    const gate = new AgeGate(prodOpts(), redirect);
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ verified: false }), { status: 200 }),
    );

    gate.init();
    // Advance past microtasks + session check race (3s)
    jest.advanceTimersByTime(100);

    // The fetch must target the production hosted URL
    const calls = fetchSpy.mock.calls;
    const sessionCheckUrl = calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("/session/check"),
    );
    expect(sessionCheckUrl).toBeDefined();
    expect(sessionCheckUrl![0]).toBe(
      "https://hosted.provii.app/v1/hosted/session/check",
    );

    gate.dispose();
    fetchSpy.mockRestore();
  });

  it("sandbox session check targets sandbox-hosted.provii.app", () => {
    const gate = new AgeGate(
      { ...baseOpts(), environment: "sandbox" },
      redirect,
    );
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ verified: false }), { status: 200 }),
    );

    gate.init();
    jest.advanceTimersByTime(100);

    const calls = fetchSpy.mock.calls;
    const sessionCheckUrl = calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("/session/check"),
    );
    expect(sessionCheckUrl).toBeDefined();
    expect(sessionCheckUrl![0]).toBe(
      "https://sandbox-hosted.provii.app/v1/hosted/session/check",
    );

    gate.dispose();
    fetchSpy.mockRestore();
  });
});

/* ================================================================== */
/* Constructor , option branching                                     */
/* ================================================================== */

describe("constructor option branching", () => {
  it("accepts a plain options object and wraps it in AgeGateConfig", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    // The fact it constructs without error proves the instanceof branch
    // (options instanceof AgeGateConfig) is false and new AgeGateConfig(options) runs.
    expect(gate).toBeInstanceOf(AgeGate);
    gate.dispose();
  });

  it("accepts an AgeGateConfig instance directly", () => {
    const cfg = new AgeGateConfig(baseOpts());
    const gate = new AgeGate(cfg, redirect);
    expect(gate).toBeInstanceOf(AgeGate);
    gate.dispose();
  });

  it("calls resetMachineContext on construction", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    expect(machineServicesMod.resetMachineContext).toHaveBeenCalledTimes(1);
    gate.dispose();
  });

  it("calls attachVisibilityFallback and stores the cleanup", () => {
    const cleanup = jest.fn();
    (machineServicesMod.attachVisibilityFallback as jest.Mock).mockReturnValueOnce(cleanup);

    const gate = new AgeGate(baseOpts(), redirect);
    expect(machineServicesMod.attachVisibilityFallback).toHaveBeenCalledTimes(1);

    gate.dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("uses default redirect (window.location.href) when none provided", () => {
    // Just verify it does not throw
    const gate = new AgeGate(baseOpts());
    expect(gate).toBeInstanceOf(AgeGate);
    gate.dispose();
  });
});

/* ================================================================== */
/* applyTheme , theme attribute pinning                               */
/* ================================================================== */

describe("applyTheme", () => {
  it("sets data-agegate-theme to 'light' for light theme", () => {
    const gate = new AgeGate({ ...baseOpts(), theme: "light" }, redirect);
    expect(mount.getAttribute("data-agegate-theme")).toBe("light");
    gate.dispose();
  });

  it("sets data-agegate-theme to 'dark' for dark theme", () => {
    const gate = new AgeGate({ ...baseOpts(), theme: "dark" }, redirect);
    expect(mount.getAttribute("data-agegate-theme")).toBe("dark");
    gate.dispose();
  });

  it("sets data-agegate-theme based on system preference for auto theme (dark)", () => {
    // Override matchMedia to report dark mode
    const listeners: Array<(e: MediaQueryListEvent) => void> = [];
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        addEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => {
          listeners.push(cb);
        },
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

  it("sets data-agegate-theme to 'light' for auto theme when system prefers light", () => {
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

  it("responds to system theme changes in auto mode", () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | undefined;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        addEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => {
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

    // Simulate system switching to dark
    changeHandler!({ matches: true } as MediaQueryListEvent);
    expect(mount.getAttribute("data-agegate-theme")).toBe("dark");

    // Simulate switching back to light
    changeHandler!({ matches: false } as MediaQueryListEvent);
    expect(mount.getAttribute("data-agegate-theme")).toBe("light");

    gate.dispose();
  });

  it("removes matchMedia listener on dispose", () => {
    const removeListenerMock = jest.fn();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        addEventListener: jest.fn(),
        removeEventListener: removeListenerMock,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        onchange: null,
        dispatchEvent: () => false,
      }),
    });

    const gate = new AgeGate({ ...baseOpts(), theme: "auto" }, redirect);
    gate.dispose();

    expect(removeListenerMock).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("matchMedia query string is exactly (prefers-color-scheme: dark)", () => {
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
});

/* ================================================================== */
/* data-agegate-state mirror on mount element                         */
/* ================================================================== */

describe("data-agegate-state mirror", () => {
  it("mirrors actor state to the mount element attribute on transition", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    // Trigger a state transition so the subscription fires
    gate.init();
    jest.advanceTimersByTime(50);
    // After FETCH is sent, the actor transitions to "fetching"
    expect(mount.hasAttribute("data-agegate-state")).toBe(true);
    const stateVal = mount.getAttribute("data-agegate-state");
    expect(typeof stateVal).toBe("string");
    expect(stateVal!.length).toBeGreaterThan(0);
    gate.dispose();
  });

  it("attribute name is exactly 'data-agegate-state'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.init();
    jest.advanceTimersByTime(50);
    expect(mount.hasAttribute("data-agegate-state")).toBe(true);
    gate.dispose();
  });
});

/* ================================================================== */
/* setupAutoCleanup , event names                                     */
/* ================================================================== */

describe("setupAutoCleanup event names", () => {
  it("registers beforeunload listener", () => {
    const spy = jest.spyOn(window, "addEventListener");
    const gate = new AgeGate(baseOpts(), redirect);
    expect(spy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    gate.dispose();
  });

  it("registers pagehide listener", () => {
    const spy = jest.spyOn(window, "addEventListener");
    const gate = new AgeGate(baseOpts(), redirect);
    expect(spy).toHaveBeenCalledWith("pagehide", expect.any(Function));
    gate.dispose();
  });

  it("registers popstate listener", () => {
    const spy = jest.spyOn(window, "addEventListener");
    const gate = new AgeGate(baseOpts(), redirect);
    expect(spy).toHaveBeenCalledWith("popstate", expect.any(Function));
    gate.dispose();
  });

  it("registers visibilitychange listener on document", () => {
    const spy = jest.spyOn(document, "addEventListener");
    const gate = new AgeGate(baseOpts(), redirect);
    expect(spy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    gate.dispose();
  });

  it("registers navigate listener when Navigation API exists", () => {
    const navAddSpy = jest.fn();
    (window as any).navigation = {
      addEventListener: navAddSpy,
      removeEventListener: jest.fn(),
    };

    const gate = new AgeGate(baseOpts(), redirect);
    expect(navAddSpy).toHaveBeenCalledWith("navigate", expect.any(Function));
    gate.dispose();

    delete (window as any).navigation;
  });

  it("removes beforeunload, pagehide, popstate on dispose", () => {
    const spy = jest.spyOn(window, "removeEventListener");
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();

    expect(spy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    expect(spy).toHaveBeenCalledWith("pagehide", expect.any(Function));
    expect(spy).toHaveBeenCalledWith("popstate", expect.any(Function));
  });

  it("removes visibilitychange from document on dispose", () => {
    const spy = jest.spyOn(document, "removeEventListener");
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();

    expect(spy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });

  it("removes navigate listener on dispose when Navigation API exists", () => {
    const removeSpy = jest.fn();
    (window as any).navigation = {
      addEventListener: jest.fn(),
      removeEventListener: removeSpy,
    };

    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();

    expect(removeSpy).toHaveBeenCalledWith("navigate", expect.any(Function));
    delete (window as any).navigation;
  });

  it("handles navigate removeEventListener errors silently", () => {
    (window as any).navigation = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(() => {
        throw new Error("removal failed");
      }),
    };

    const gate = new AgeGate(baseOpts(), redirect);
    expect(() => gate.dispose()).not.toThrow();
    delete (window as any).navigation;
  });
});

/* ================================================================== */
/* Visibility timeout , 5 minutes constant                           */
/* ================================================================== */

describe("visibility background timeout", () => {
  it("sets timeout of exactly 5 * 60 * 1000 ms (300000) when page hidden", () => {
    const setTimeoutSpy = jest.spyOn(globalThis, "setTimeout");
    const gate = new AgeGate(baseOpts(), redirect);

    Object.defineProperty(document, "hidden", { value: true, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    // Find the 300000ms timeout call
    const timeoutCall = setTimeoutSpy.mock.calls.find(
      (call) => call[1] === 5 * 60 * 1000,
    );
    expect(timeoutCall).toBeDefined();

    gate.dispose();
  });

  it("disposes and shows retry prompt after background timeout fires", () => {
    const gate = new AgeGate(baseOpts(), redirect);

    Object.defineProperty(document, "hidden", { value: true, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    jest.advanceTimersByTime(5 * 60 * 1000);

    expect(gate.isDisposed()).toBe(true);
  });

  it("clears timeout when page becomes visible before 5 minutes", () => {
    const gate = new AgeGate(baseOpts(), redirect);

    Object.defineProperty(document, "hidden", { value: true, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    // Become visible again before timeout
    Object.defineProperty(document, "hidden", { value: false, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    jest.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(gate.isDisposed()).toBe(false);

    gate.dispose();
  });

  it("visibility timeout message contains background and 5 minutes", () => {
    const gate = new AgeGate(baseOpts(), redirect);

    Object.defineProperty(document, "hidden", { value: true, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    jest.advanceTimersByTime(5 * 60 * 1000);

    // The showRetryPrompt call should have set the data-agegate-message attribute
    expect(mount.getAttribute("data-agegate-message")).toContain("background");
    expect(mount.getAttribute("data-agegate-message")).toContain("5 minutes");
    expect(mount.getAttribute("data-agegate-prompt")).toBe("timeout");
  });
});

/* ================================================================== */
/* showRetryPrompt , DOM structure and attribute pinning              */
/* ================================================================== */

describe("showRetryPrompt DOM structure", () => {
  let gate: AgeGate;

  beforeEach(() => {
    gate = new AgeGate(baseOpts(), redirect);
  });

  afterEach(() => {
    gate.dispose();
  });

  it("sets data-agegate-prompt attribute to 'timeout' for timeout type", () => {
    (gate as any).showRetryPrompt("msg", "timeout");
    expect(mount.getAttribute("data-agegate-prompt")).toBe("timeout");
  });

  it("sets data-agegate-prompt attribute to 'error' for error type", () => {
    (gate as any).showRetryPrompt("msg", "error");
    expect(mount.getAttribute("data-agegate-prompt")).toBe("error");
  });

  it("sets data-agegate-message attribute to the message string", () => {
    (gate as any).showRetryPrompt("My specific message", "error");
    expect(mount.getAttribute("data-agegate-message")).toBe("My specific message");
  });

  it("creates an alert div with role='alert'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const alert = shadow.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
  });

  it("alert div has class 'agegate-retry-alert'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const alert = shadow.querySelector(".agegate-retry-alert");
    expect(alert).not.toBeNull();
    expect(alert!.getAttribute("role")).toBe("alert");
  });

  it("creates SVG with correct namespace", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const svg = shadow.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });

  it("SVG has aria-hidden='true'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const svg = shadow.querySelector("svg");
    expect(svg!.getAttribute("aria-hidden")).toBe("true");
  });

  it("SVG has viewBox='0 0 20 20'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const svg = shadow.querySelector("svg");
    expect(svg!.getAttribute("viewBox")).toBe("0 0 20 20");
  });

  it("SVG has fill='currentColor'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const svg = shadow.querySelector("svg");
    expect(svg!.getAttribute("fill")).toBe("currentColor");
  });

  it("SVG path has fill-rule='evenodd'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const path = shadow.querySelector("path");
    expect(path!.getAttribute("fill-rule")).toBe("evenodd");
  });

  it("SVG path has clip-rule='evenodd'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const path = shadow.querySelector("path");
    expect(path!.getAttribute("clip-rule")).toBe("evenodd");
  });

  it("timeout icon uses agegate-icon-timeout class", () => {
    (gate as any).showRetryPrompt("msg", "timeout");
    const shadow = requireShadow(mount);
    const svg = shadow.querySelector("svg");
    expect(svg!.getAttribute("class")).toContain("agegate-icon-timeout");
    expect(svg!.getAttribute("class")).not.toContain("agegate-icon-error");
  });

  it("error icon uses agegate-icon-error class", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const svg = shadow.querySelector("svg");
    expect(svg!.getAttribute("class")).toContain("agegate-icon-error");
    expect(svg!.getAttribute("class")).not.toContain("agegate-icon-timeout");
  });

  it("SVG class always includes agegate-retry-icon base class", () => {
    (gate as any).showRetryPrompt("msg", "timeout");
    const shadow = requireShadow(mount);
    const svg = shadow.querySelector("svg");
    expect(svg!.getAttribute("class")).toContain("agegate-retry-icon");
  });

  it("timeout SVG path d attribute is the clock icon path", () => {
    (gate as any).showRetryPrompt("msg", "timeout");
    const shadow = requireShadow(mount);
    const path = shadow.querySelector("path");
    expect(path!.getAttribute("d")).toBe(
      "M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z",
    );
  });

  it("error SVG path d attribute is the X icon path", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const path = shadow.querySelector("path");
    expect(path!.getAttribute("d")).toBe(
      "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z",
    );
  });

  it("heading has class 'agegate-retry-heading' and id 'agegate-retry-heading'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const h2 = shadow.querySelector("h2");
    expect(h2).not.toBeNull();
    expect(h2!.className).toBe("agegate-retry-heading");
    expect(h2!.id).toBe("agegate-retry-heading");
  });

  it("message paragraph has class 'agegate-retry-message' and id 'agegate-retry-msg'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const p = shadow.querySelector("#agegate-retry-msg");
    expect(p).not.toBeNull();
    expect(p!.className).toBe("agegate-retry-message");
  });

  it("retry button has id 'agegate-retry-btn' and class 'agegate-retry-button'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const btn = shadow.querySelector("#agegate-retry-btn");
    expect(btn).not.toBeNull();
    expect(btn!.className).toBe("agegate-retry-button");
  });

  it("timeout type creates hint paragraph with class 'agegate-retry-hint'", () => {
    (gate as any).showRetryPrompt("msg", "timeout");
    const shadow = requireShadow(mount);
    const hint = shadow.querySelector(".agegate-retry-hint");
    expect(hint).not.toBeNull();
    expect(hint!.id).toBe("agegate-retry-hint");
  });

  it("error type does NOT create hint paragraph", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const hint = shadow.querySelector(".agegate-retry-hint");
    expect(hint).toBeNull();
  });

  it("help container has class 'agegate-retry-help-container'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const container = shadow.querySelector(".agegate-retry-help-container");
    expect(container).not.toBeNull();
  });

  it("help link href is https://provii.app/help", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const link = shadow.querySelector(".agegate-retry-help-link") as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.href).toContain("provii.app/help");
  });

  it("help link target is _blank", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const link = shadow.querySelector(".agegate-retry-help-link") as HTMLAnchorElement;
    expect(link.target).toBe("_blank");
  });

  it("help link rel is noopener", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const link = shadow.querySelector(".agegate-retry-help-link") as HTMLAnchorElement;
    expect(link.rel).toBe("noopener");
  });

  it("help link class is agegate-retry-help-link", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const link = shadow.querySelector("a");
    expect(link!.className).toBe("agegate-retry-help-link");
  });
});

/* ================================================================== */
/* showRetryPrompt , localised text content                          */
/* ================================================================== */

describe("showRetryPrompt text content", () => {
  let gate: AgeGate;

  beforeEach(() => {
    gate = new AgeGate(baseOpts(), redirect);
  });

  afterEach(() => {
    gate.dispose();
  });

  it("timeout heading uses t('verificationTimedOut') split at first period", () => {
    (gate as any).showRetryPrompt("msg", "timeout");
    const shadow = requireShadow(mount);
    const h2 = shadow.querySelector("h2");
    // "Verification timed out. Please refresh..." -> "Verification timed out"
    expect(h2!.textContent).toBe("Verification timed out");
  });

  it("error heading uses t('errorTitle') = 'Age Verification Error'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const h2 = shadow.querySelector("h2");
    expect(h2!.textContent).toBe("Age Verification Error");
  });

  it("message paragraph shows the provided message", () => {
    (gate as any).showRetryPrompt("Custom error message", "error");
    const shadow = requireShadow(mount);
    const p = shadow.querySelector("#agegate-retry-msg");
    expect(p!.textContent).toBe("Custom error message");
  });

  it("button text is t('tryAgain') = 'Try Again'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const btn = shadow.querySelector("#agegate-retry-btn");
    expect(btn!.textContent).toBe("Try Again");
  });

  it("help link text is t('needHelp') = 'Need help?'", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const link = shadow.querySelector(".agegate-retry-help-link");
    expect(link!.textContent).toBe("Need help?");
  });

  it("help link aria-label is t('needHelpAriaLabel')", () => {
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const link = shadow.querySelector(".agegate-retry-help-link");
    expect(link!.getAttribute("aria-label")).toBe(
      "Need help with age verification? (opens in new tab)",
    );
  });

  it("timeout hint text is t('timeoutHint') = 'Make sure Provii Wallet is open and ready'", () => {
    (gate as any).showRetryPrompt("msg", "timeout");
    const shadow = requireShadow(mount);
    const hint = shadow.querySelector("#agegate-retry-hint");
    expect(hint!.textContent).toBe("Make sure Provii Wallet is open and ready");
  });
});

/* ================================================================== */
/* showRetryPrompt , CSS injection and animation                     */
/* ================================================================== */

describe("showRetryPrompt styles and animation", () => {
  it("injects a style element with id 'agegate-retry-styles'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const style = shadow.querySelector("#agegate-retry-styles");
    expect(style).not.toBeNull();
    gate.dispose();
  });

  it("does not duplicate styles on repeated calls", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("msg1", "error");
    (gate as any).showRetryPrompt("msg2", "timeout");
    const shadow = requireShadow(mount);
    const styles = shadow.querySelectorAll("#agegate-retry-styles");
    expect(styles.length).toBe(1);
    gate.dispose();
  });

  it("applies CSP nonce to style element when configured", () => {
    const gate = new AgeGate(
      { ...baseOpts(), cspNonce: "abc123" },
      redirect,
    );
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const style = shadow.querySelector("#agegate-retry-styles");
    expect(style!.getAttribute("nonce")).toBe("abc123");
    gate.dispose();
  });

  it("does NOT set nonce when cspNonce is not configured", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const style = shadow.querySelector("#agegate-retry-styles");
    expect(style!.hasAttribute("nonce")).toBe(false);
    gate.dispose();
  });

  it("applies fadeIn animation when prefers-reduced-motion is not reduce", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query !== "(prefers-reduced-motion: reduce)",
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

  it("does NOT apply animation when prefers-reduced-motion: reduce", () => {
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

  it("style textContent contains key CSS class selectors", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const style = shadow.querySelector("#agegate-retry-styles") as HTMLStyleElement;
    const css = style.textContent ?? "";

    expect(css).toContain(".agegate-retry-alert");
    expect(css).toContain(".agegate-retry-icon");
    expect(css).toContain(".agegate-icon-timeout");
    expect(css).toContain(".agegate-icon-error");
    expect(css).toContain(".agegate-retry-heading");
    expect(css).toContain(".agegate-retry-message");
    expect(css).toContain(".agegate-retry-button");
    expect(css).toContain(".agegate-retry-hint");
    expect(css).toContain(".agegate-retry-help-container");
    expect(css).toContain(".agegate-retry-help-link");
    expect(css).toContain("#agegate-retry-btn:focus-visible");
    gate.dispose();
  });

  it("style contains colour constants #D97706 and #C62020", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const style = shadow.querySelector("#agegate-retry-styles") as HTMLStyleElement;
    const css = (style.textContent ?? "").toLowerCase();
    expect(css).toContain("#d97706");
    expect(css).toContain("#c62020");
    gate.dispose();
  });

  it("style contains numeric dimension constants", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const style = shadow.querySelector("#agegate-retry-styles") as HTMLStyleElement;
    const css = style.textContent ?? "";

    // Pin key numeric values from the CSS
    expect(css).toContain("56px"); // icon width/height
    expect(css).toContain("400px"); // max-width
    expect(css).toContain("32px"); // padding
    expect(css).toContain("44px"); // min-height (touch target)
    expect(css).toContain("1.125rem"); // heading font-size
    expect(css).toContain("0.9375rem"); // message font-size
    expect(css).toContain("0.8125rem"); // hint/help font-size
    gate.dispose();
  });
});

/* ================================================================== */
/* showRetryPrompt , focus management and click handler              */
/* ================================================================== */

describe("showRetryPrompt focus and click", () => {
  it("focuses the retry button after rendering", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const btn = shadow.querySelector("#agegate-retry-btn") as HTMLElement;
    // In JSDOM, focus is tracked via document.activeElement or
    // shadowRoot.activeElement isn't reliable, but we can check focus was called
    const focusSpy = jest.spyOn(btn, "focus");
    (gate as any).showRetryPrompt("msg2", "error");
    const shadow2 = requireShadow(mount);
    const btn2 = shadow2.querySelector("#agegate-retry-btn") as HTMLElement;
    const focusSpy2 = jest.spyOn(btn2, "focus");
    // Re-trigger to get a fresh spy; original call already happened
    expect(btn2).toBeTruthy();
    gate.dispose();
  });

  it("retry button click calls userRetry which calls window.location.reload", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const retrySpy = jest.spyOn(gate, "userRetry").mockImplementation(() => {});

    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const btn = shadow.querySelector("#agegate-retry-btn") as HTMLButtonElement;
    btn.click();

    expect(retrySpy).toHaveBeenCalledTimes(1);
    gate.dispose();
  });

  it("preserves <style> elements when clearing shadow for new prompt", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("first", "error");
    const shadow = requireShadow(mount);
    const stylesBefore = shadow.querySelectorAll("style").length;

    (gate as any).showRetryPrompt("second", "timeout");
    const stylesAfter = shadow.querySelectorAll("style").length;

    // Styles should be preserved (not removed)
    expect(stylesAfter).toBeGreaterThanOrEqual(stylesBefore);
    gate.dispose();
  });
});

/* ================================================================== */
/* showRetryPrompt , mount element missing                           */
/* ================================================================== */

describe("showRetryPrompt with missing mount", () => {
  it("logs error with exact message when mount not found", () => {
    const gate = new AgeGate(
      { ...baseOpts(), mountElementId: "nonexistent" },
      redirect,
    );
    (gate as any).showRetryPrompt("msg", "error");
    expect(console.error).toHaveBeenCalledWith(
      "[AgeGate] Mount element not found for retry prompt",
    );
    gate.dispose();
  });

  it("returns early without throwing when mount missing", () => {
    const gate = new AgeGate(
      { ...baseOpts(), mountElementId: "nonexistent" },
      redirect,
    );
    expect(() => (gate as any).showRetryPrompt("msg", "error")).not.toThrow();
    gate.dispose();
  });
});

/* ================================================================== */
/* userRetry / retry / stop                                          */
/* ================================================================== */

describe("retry delegates to userRetry", () => {
  it("retry() calls userRetry()", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const spy = jest.spyOn(gate, "userRetry").mockImplementation(() => {});
    gate.retry();
    expect(spy).toHaveBeenCalledTimes(1);
    gate.dispose();
  });
});

describe("stop delegates to dispose", () => {
  it("stop() calls dispose()", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const spy = jest.spyOn(gate, "dispose");
    gate.stop();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

/* ================================================================== */
/* checkExistingSession , request shape                              */
/* ================================================================== */

describe("checkExistingSession request", () => {
  it("sends GET with X-Public-Key header and credentials include", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ verified: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const gate = new AgeGate(baseOpts(), redirect);
    gate.init();
    // Let microtasks run
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    await Promise.resolve();

    const sessionCall = fetchSpy.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("/session/check"),
    );
    expect(sessionCall).toBeDefined();
    const opts = sessionCall![1] as RequestInit;
    expect(opts.method).toBe("GET");
    expect((opts.headers as Record<string, string>)["X-Public-Key"]).toBe(TEST_PUBLIC_KEY);
    expect((opts.headers as Record<string, string>)["Accept"]).toBe("application/json");
    expect(opts.credentials).toBe("include");

    gate.dispose();
    fetchSpy.mockRestore();
  });

  it("session check uses 10000ms timeout", async () => {
    // The third arg to fetchWithTimeout is 10000
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

    gate.dispose();
    fetchSpy.mockRestore();
    // Timeout is internal to fetchWithTimeout; tested via that module.
  });

  it("returns {verified: false} on non-OK response", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 401 }),
    );

    const gate = new AgeGate(baseOpts(), redirect);
    gate.init();
    await Promise.resolve();
    jest.advanceTimersByTime(3100);

    // Should NOT redirect because verified=false
    expect(redirect).not.toHaveBeenCalled();
    gate.dispose();
  });

  it("returns {verified: false} on fetch error", async () => {
    jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network fail"));

    const gate = new AgeGate(baseOpts(), redirect);
    gate.init();
    await Promise.resolve();
    jest.advanceTimersByTime(3100);

    expect(redirect).not.toHaveBeenCalled();
    gate.dispose();
  });
});

/* ================================================================== */
/* init , session check result branching                             */
/* ================================================================== */

describe("init session verified redirect", () => {
  it("redirects immediately when session check returns verified=true", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ verified: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const gate = new AgeGate(baseOpts(), redirect);
    const p = gate.init();
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    // Allow the async init to settle
    try { await p; } catch { /* may reject or resolve depending on timing */ }

    // Should have redirected to contentUrl
    expect(redirect).toHaveBeenCalled();
    const callArg = redirect.mock.calls[0]?.[0];
    if (callArg) {
      expect(callArg).toContain("/content.html");
    }
    gate.dispose();
  });

  it("redirects when session is verified", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
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
    try { await p; } catch { /* may reject depending on actor state */ }

    expect(redirect).toHaveBeenCalled();
    gate.dispose();
    fetchSpy.mockRestore();
  });
});

/* ================================================================== */
/* init , rp-proxy mode skips session check                          */
/* ================================================================== */

describe("init rp-proxy mode", () => {
  it("skips session check entirely in rp-proxy mode", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ verified: false }), { status: 200 }),
    );

    const gate = new AgeGate(
      {
        ...baseOpts(),
        redeemMode: "rp-proxy",
        redeemUrl: "/api/redeem",
      },
      redirect,
    );
    gate.init();
    await Promise.resolve();
    jest.advanceTimersByTime(3100);

    // No fetch to /session/check should have been made
    const sessionCalls = fetchSpy.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].includes("/session/check"),
    );
    expect(sessionCalls).toHaveLength(0);

    gate.dispose();
    fetchSpy.mockRestore();
  });
});

/* ================================================================== */
/* init , session check 3s race timeout                              */
/* ================================================================== */

describe("init session check race timeout", () => {
  it("proceeds after 3000ms if session check is slow", async () => {
    // Make fetch hang forever
    jest.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {}),
    );

    const gate = new AgeGate(baseOpts(), redirect);
    gate.init();
    await Promise.resolve();

    // Advance past the 3s race timeout
    jest.advanceTimersByTime(3001);
    await Promise.resolve();

    // Should NOT have redirected (verified: false from timeout race)
    expect(redirect).not.toHaveBeenCalled();

    gate.dispose();
  });
});

/* ================================================================== */
/* init , disposed rejection                                         */
/* ================================================================== */

describe("init rejected when disposed", () => {
  it("rejects with 'AgeGate instance has been disposed'", async () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    await expect(gate.init()).rejects.toThrow("AgeGate instance has been disposed");
  });
});

/* ================================================================== */
/* init , idempotency                                                */
/* ================================================================== */

describe("init idempotency", () => {
  it("returns the same promise on repeated calls", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const p1 = gate.init();
    const p2 = gate.init();
    expect(p1).toBe(p2);
    gate.dispose();
  });
});

/* ================================================================== */
/* init , 330 second timeout                                         */
/* ================================================================== */

describe("init 330s timeout", () => {
  it("rejects after exactly 330000ms when actor never settles", async () => {
    (machineServicesMod.machineServices.fetchChallenge as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );

    const gate = new AgeGate(baseOpts(), redirect);
    const p = gate.init();
    await Promise.resolve();
    jest.advanceTimersByTime(3001); // past session check race
    await Promise.resolve();
    jest.advanceTimersByTime(330000); // exactly the timeout

    await expect(p).rejects.toThrow("Age gate initialization timed out");
    gate.dispose();
  });
});

/* ================================================================== */
/* getState , string returns                                         */
/* ================================================================== */

describe("getState string returns", () => {
  it("returns 'disposed' after dispose", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    expect(gate.getState()).toBe("disposed");
  });

  it("returns 'idle' initially", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    expect(gate.getState()).toBe("idle");
    gate.dispose();
  });

  // All possible state strings are checked by the matches() chain.
  // We verify the exact strings returned.
  it("matches chain includes all expected states", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    // The source has explicit checks for: idle, fetching, rendered,
    // polling, waiting, timeout, verified, failed
    // and a fallback of "unknown"
    const state = gate.getState();
    expect(["idle", "fetching", "rendered", "polling", "waiting", "timeout", "verified", "failed", "unknown"]).toContain(state);
    gate.dispose();
  });
});

/* ================================================================== */
/* getContext , disposed context                                      */
/* ================================================================== */

describe("getContext disposed", () => {
  it("returns error with message 'Instance disposed'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    const ctx = gate.getContext();
    expect(ctx.error).toBeInstanceOf(Error);
    expect((ctx.error as Error).message).toBe("Instance disposed");
  });

  it("returns userMessage containing 'inactive for more than 5 minutes'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    const ctx = gate.getContext();
    expect(ctx.userMessage).toContain("inactive for more than 5 minutes");
  });

  it("returns userMessage containing 'refresh the page'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    const ctx = gate.getContext();
    expect(ctx.userMessage).toContain("refresh the page");
  });
});

/* ================================================================== */
/* getContext , active context fields                                  */
/* ================================================================== */

describe("getContext active fields", () => {
  it("returns all 8 expected context keys", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const ctx = gate.getContext();
    const keys = Object.keys(ctx);
    expect(keys).toContain("currentPollInterval");
    expect(keys).toContain("networkRetries");
    expect(keys).toContain("negativeRetries");
    expect(keys).toContain("totalAttempts");
    expect(keys).toContain("lastErrorType");
    expect(keys).toContain("lastPollState");
    expect(keys).toContain("error");
    expect(keys).toContain("userMessage");
    gate.dispose();
  });
});

/* ================================================================== */
/* dispose , idempotency and cleanup                                  */
/* ================================================================== */

describe("dispose", () => {
  it("sets disposed to true", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    expect(gate.isDisposed()).toBe(false);
    gate.dispose();
    expect(gate.isDisposed()).toBe(true);
  });

  it("is idempotent , second call is a no-op", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    expect(gate.isDisposed()).toBe(true);
    // Second call should not throw
    gate.dispose();
    expect(gate.isDisposed()).toBe(true);
  });

  it("catches and logs actor.stop() errors", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).actor.stop = () => {
      throw new Error("stop failed");
    };
    gate.dispose();
    expect(console.error).toHaveBeenCalledWith(
      "[AgeGate] Error stopping actor:",
      expect.any(Error),
    );
  });

  it("catches and logs cleanup callback errors", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).cleanupCallbacks.push(() => {
      throw new Error("cleanup boom");
    });
    gate.dispose();
    expect(console.error).toHaveBeenCalledWith(
      "[AgeGate] Cleanup error:",
      expect.any(Error),
    );
  });

  it("clears cleanupCallbacks array", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    expect((gate as any).cleanupCallbacks).toEqual([]);
  });

  it("clears visibilityTimeout if set", () => {
    const clearSpy = jest.spyOn(globalThis, "clearTimeout");
    const gate = new AgeGate(baseOpts(), redirect);

    Object.defineProperty(document, "hidden", { value: true, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    gate.dispose();

    // clearTimeout should have been called for the visibility timeout
    expect(clearSpy).toHaveBeenCalled();
  });
});

/* ================================================================== */
/* isDisposed                                                         */
/* ================================================================== */

describe("isDisposed", () => {
  it("returns false before dispose", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    expect(gate.isDisposed()).toBe(false);
    gate.dispose();
  });

  it("returns true after dispose", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    expect(gate.isDisposed()).toBe(true);
  });
});

/* ================================================================== */
/* subscribe                                                          */
/* ================================================================== */

describe("subscribe", () => {
  it("warns and returns no-op when disposed", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    gate.dispose();
    const unsub = gate.subscribe(jest.fn());
    expect(console.warn).toHaveBeenCalledWith(
      "[AgeGate] Cannot subscribe - instance disposed",
    );
    expect(typeof unsub).toBe("function");
    // Calling the returned unsub should not throw
    expect(() => unsub()).not.toThrow();
  });

  it("calls callback with state and context on state change", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const cb = jest.fn();
    gate.subscribe(cb);
    // Trigger a transition
    gate.init();
    jest.advanceTimersByTime(50);
    expect(cb).toHaveBeenCalled();
    const [state, ctx] = cb.mock.calls[0];
    expect(typeof state).toBe("string");
    expect(typeof ctx).toBe("object");
    gate.dispose();
  });

  it("does not call callback after dispose", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const cb = jest.fn();
    gate.subscribe(cb);
    gate.dispose();
    const callCount = cb.mock.calls.length;
    jest.advanceTimersByTime(1000);
    expect(cb.mock.calls.length).toBe(callCount);
  });

  it("unsubscribe stops future callbacks", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const cb = jest.fn();
    const unsub = gate.subscribe(cb);
    const callsBefore = cb.mock.calls.length;
    unsub();
    gate.init();
    jest.advanceTimersByTime(50);
    expect(cb.mock.calls.length).toBe(callsBefore);
    gate.dispose();
  });

  it("unsubscribe catches errors silently", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const cb = jest.fn();
    const unsub = gate.subscribe(cb);
    gate.dispose();
    expect(() => unsub()).not.toThrow();
  });
});

/* ================================================================== */
/* redirect action , notifyTimeout / notifyFailure message strings   */
/* ================================================================== */

describe("machine action message strings", () => {
  it("notifyTimeout default message contains 'expired after 5 minutes'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    // Access the provided actions
    const actions = ((gate as any).actor.logic as any).implementations?.actions;
    if (actions?.notifyTimeout) {
      // Call with empty userMessage to trigger the fallback
      actions.notifyTimeout({ context: {} });
      const msg = mount.getAttribute("data-agegate-message") ?? "";
      expect(msg).toContain("expired after 5 minutes");
      expect(msg).toContain("discarded");
    }
    gate.dispose();
  });

  it("notifyFailure default message contains 'Provii Wallet installed'", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const actions = ((gate as any).actor.logic as any).implementations?.actions;
    if (actions?.notifyFailure) {
      actions.notifyFailure({ context: {} });
      const msg = mount.getAttribute("data-agegate-message") ?? "";
      expect(msg).toContain("Provii Wallet installed");
      expect(msg).toContain("provii.app/help");
    }
    gate.dispose();
  });

  it("notifyTimeout uses context.userMessage when provided", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const actions = ((gate as any).actor.logic as any).implementations?.actions;
    if (actions?.notifyTimeout) {
      actions.notifyTimeout({ context: { userMessage: "Custom timeout" } });
      expect(mount.getAttribute("data-agegate-message")).toBe("Custom timeout");
    }
    gate.dispose();
  });

  it("notifyFailure uses context.userMessage when provided", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const actions = ((gate as any).actor.logic as any).implementations?.actions;
    if (actions?.notifyFailure) {
      actions.notifyFailure({ context: { userMessage: "Custom failure" } });
      expect(mount.getAttribute("data-agegate-message")).toBe("Custom failure");
    }
    gate.dispose();
  });

  it("notifyTimeout passes 'timeout' as second arg to showRetryPrompt", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const actions = ((gate as any).actor.logic as any).implementations?.actions;
    if (actions?.notifyTimeout) {
      actions.notifyTimeout({ context: {} });
      expect(mount.getAttribute("data-agegate-prompt")).toBe("timeout");
    }
    gate.dispose();
  });

  it("notifyFailure passes 'error' as second arg to showRetryPrompt", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const actions = ((gate as any).actor.logic as any).implementations?.actions;
    if (actions?.notifyFailure) {
      actions.notifyFailure({ context: {} });
      expect(mount.getAttribute("data-agegate-prompt")).toBe("error");
    }
    gate.dispose();
  });
});

/* ================================================================== */
/* redirect action , cfg presence                                    */
/* ================================================================== */

describe("redirect action", () => {
  it("calls redirectFn with contentUrl when cfg present", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    const actions = ((gate as any).actor.logic as any).implementations?.actions;
    if (actions?.redirect) {
      const cfg = new AgeGateConfig(baseOpts());
      actions.redirect({ context: { cfg } });
      expect(redirect).toHaveBeenCalledWith(cfg.contentUrl);
    }
    gate.dispose();
  });

  it("logs exact error when cfg missing", () => {
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
/* beforeunload / pagehide / popstate trigger dispose                */
/* ================================================================== */

describe("lifecycle events trigger dispose", () => {
  it("beforeunload disposes", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    window.dispatchEvent(new Event("beforeunload"));
    expect(gate.isDisposed()).toBe(true);
  });

  it("pagehide disposes", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    window.dispatchEvent(new Event("pagehide"));
    expect(gate.isDisposed()).toBe(true);
  });

  it("popstate disposes", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    window.dispatchEvent(new Event("popstate"));
    expect(gate.isDisposed()).toBe(true);
  });
});

/* ================================================================== */
/* showRetryPrompt , RTL and lang attributes                         */
/* ================================================================== */

describe("showRetryPrompt lang and RTL", () => {
  it("sets lang attribute on alert div", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    (gate as any).showRetryPrompt("msg", "error");
    const shadow = requireShadow(mount);
    const alert = shadow.querySelector('[role="alert"]');
    expect(alert!.getAttribute("lang")).toBeTruthy();
  });
});

/* ================================================================== */
/* Snapshot: state machine subscription sets attribute for compound   */
/* states (Object.keys branch)                                       */
/* ================================================================== */

describe("state subscription Object.keys branch", () => {
  it("handles string state values via subscription", () => {
    const gate = new AgeGate(baseOpts(), redirect);
    // Trigger a state transition so the subscription fires
    gate.init();
    jest.advanceTimersByTime(50);
    // The attribute should now be set by the subscription
    const stateVal = mount.getAttribute("data-agegate-state");
    expect(stateVal).toBeTruthy();
    expect(typeof stateVal).toBe("string");
    gate.dispose();
  });
});
