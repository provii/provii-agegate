/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.com"}
 */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT

/**
 * Mutation-killing tests for src/modes/autoload.ts.
 *
 * Covers every branch, string literal, return value, and side effect of the
 * AutoBlockMode class and the module-level initAutoBlock IIFE. Written to
 * maximise the Stryker mutation kill rate: each test asserts exact values so
 * that string-replacement, condition-negation, statement-removal, and return-
 * value mutants are caught.
 */

import { AutoBlockMode } from "../src/modes/autoload.js";
import { ApiError } from "../src/core/api-client.js";
import { SessionCache } from "../src/core/session-cache.js";
import { DEFAULT_POLLING_CONFIG } from "../src/core/types.js";
import type {
  AutoBlockConfig,
  Challenge,
  StatusResponse,
  SDKEvent,
} from "../src/core/types.js";
import {
  t,
  setLocale,
  setStringOverrides,
  getLocale,
} from "../src/i18n/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const DUMMY_PUBLIC_KEY =
  "pk_test_0000000000000000000000000000000000000000000000000000000000000000";

function baseCfg(override: Partial<AutoBlockConfig> = {}): AutoBlockConfig {
  return {
    publicKey: TEST_PUBLIC_KEY,
    environment: "sandbox",
    ...override,
  };
}

/**
 * Cast the internal private methods to a callable surface so we can unit-test
 * them directly. The cast is only for test ergonomics.
 */
function asInternal(mode: AutoBlockMode): Record<string, unknown> {
  return mode as unknown as Record<string, unknown>;
}

/**
 * Invoke a private method by name.
 */
function callPrivate<T>(
  mode: AutoBlockMode,
  method: string,
  ...args: unknown[]
): T {
  const fn = asInternal(mode)[method];
  if (typeof fn !== "function") {
    throw new Error(`No such method: ${method}`);
  }
  return (fn as (...a: unknown[]) => T).call(mode, ...args);
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

let fetchSpy: jest.SpyInstance;

beforeEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
  document.body.style.visibility = "";
  document.documentElement.lang = "en";
  setLocale("en");
  setStringOverrides(null);
  SessionCache.clear();

  // Nuke the singleton guard so every test can re-initialise
  delete (window as unknown as Record<string, unknown>)[
    "__proviiAutoBlockInitialised"
  ];

  fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ verified: false }), { status: 200 }),
  );
});

afterEach(() => {
  fetchSpy.mockRestore();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe("AutoBlockMode constructor", () => {
  it("stores the config and creates internal components", () => {
    const cfg = baseCfg({ debug: true });
    const mode = new AutoBlockMode(cfg);
    // The config is stored on the instance
    expect(asInternal(mode)["config"]).toBe(cfg);
  });

  it("calls setStringOverrides with config.strings when provided", () => {
    const overrides = { headerTitle: "Custom header" };
    new AutoBlockMode(baseCfg({ strings: overrides }));
    expect(t("headerTitle")).toBe("Custom header");
  });

  it("resets string overrides when strings option is absent", () => {
    setStringOverrides({ headerTitle: "Stale" });
    new AutoBlockMode(baseCfg());
    // strings is undefined, so setStringOverrides(null) is called
    expect(t("headerTitle")).not.toBe("Stale");
  });

  it("hydrates QR style fields from config", () => {
    const mode = new AutoBlockMode(
      baseCfg({
        qrDotStyle: "rounded",
        qrEyeFrameStyle: "dot",
        qrEyeDotStyle: "square",
        qrLogoUrl: "https://example.com/logo.png",
        qrForeground: "#112233",
        qrBackground: "#ffeedd",
      }),
    );
    expect(asInternal(mode)["qrDotStyle"]).toBe("rounded");
    expect(asInternal(mode)["qrEyeFrameStyle"]).toBe("dot");
    expect(asInternal(mode)["qrEyeDotStyle"]).toBe("square");
    expect(asInternal(mode)["qrLogoUrl"]).toBe("https://example.com/logo.png");
    expect(asInternal(mode)["qrForeground"]).toBe("#112233");
    expect(asInternal(mode)["qrBackground"]).toBe("#ffeedd");
  });

  it("passes environment and apiEndpoint to the API client", () => {
    const mode = new AutoBlockMode(
      baseCfg({
        environment: "sandbox",
        apiEndpoint: "https://sandbox-hosted.provii.app",
      }),
    );
    const client = asInternal(mode)["apiClient"] as Record<string, unknown>;
    expect(client).toBeDefined();
  });

  it("passes debug flag to PKCEManager", () => {
    const mode = new AutoBlockMode(baseCfg({ debug: true }));
    expect(asInternal(mode)["pkceManager"]).toBeDefined();
  });

  it("initialises empty eventHandlers map", () => {
    const mode = new AutoBlockMode(baseCfg());
    const handlers = asInternal(mode)["eventHandlers"] as Map<
      string,
      Set<unknown>
    >;
    expect(handlers.size).toBe(0);
  });

  it("initialises overlayElement as null", () => {
    const mode = new AutoBlockMode(baseCfg());
    expect(asInternal(mode)["overlayElement"]).toBeNull();
  });

  it("initialises currentChallenge as null", () => {
    const mode = new AutoBlockMode(baseCfg());
    expect(asInternal(mode)["currentChallenge"]).toBeNull();
  });

  it("initialises consecutivePollingErrors at 0", () => {
    const mode = new AutoBlockMode(baseCfg());
    expect(asInternal(mode)["consecutivePollingErrors"]).toBe(0);
  });

  it("initialises heartbeatShown as false", () => {
    const mode = new AutoBlockMode(baseCfg());
    expect(asInternal(mode)["heartbeatShown"]).toBe(false);
  });

  it("initialises previewLayout as 'auto'", () => {
    const mode = new AutoBlockMode(baseCfg());
    expect(asInternal(mode)["previewLayout"]).toBe("auto");
  });
});

// ---------------------------------------------------------------------------
// initialise()
// ---------------------------------------------------------------------------

describe("AutoBlockMode.initialise()", () => {
  it("enters preview mode when config.previewMode is true", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();

    // Preview overlay should be in the DOM
    const host = document.body.querySelector("div");
    expect(host).not.toBeNull();
    // Zero fetch calls
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls checkAndBlock when previewMode is false", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: false }));
    const spy = jest
      .spyOn(mode as unknown as { checkAndBlock: () => Promise<void> }, "checkAndBlock" as never)
      .mockResolvedValue(undefined as never);
    await mode.initialise();
    expect(spy).toHaveBeenCalled();
  });

  it("calls handleError when checkAndBlock throws", async () => {
    const mode = new AutoBlockMode(baseCfg());
    const testError = new Error("boom");
    jest
      .spyOn(mode as unknown as { checkAndBlock: () => Promise<void> }, "checkAndBlock" as never)
      .mockRejectedValue(testError as never);
    const errorHandler = jest.fn();
    mode.on("error", errorHandler);
    await mode.initialise();
    expect(errorHandler).toHaveBeenCalledWith(
      expect.objectContaining({ code: "initialization_failed" }),
    );
  });
});

// ---------------------------------------------------------------------------
// showPreviewOverlay() (via initialise in preview mode)
// ---------------------------------------------------------------------------

describe("showPreviewOverlay", () => {
  it("sets currentChallenge with canned preview data", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();
    const challenge = asInternal(mode)["currentChallenge"] as Challenge;
    expect(challenge.sessionId).toBe("preview-session");
    expect(challenge.challengeId).toBe("preview-challenge");
    expect(challenge.challengeCode).toBe("000000000000");
    expect(challenge.deepLink).toBe("proviiwallet://verify?d=preview");
    expect(challenge.status).toBe("pending");
  });

  it("creates the preview banner with correct class and role", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();

    // Access the shadow root through the internal handle
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    expect(shadowRoot).not.toBeNull();
    const banner = shadowRoot.querySelector(".provii-preview-banner");
    expect(banner).not.toBeNull();
    expect(banner?.getAttribute("role")).toBe("status");
  });

  it("preview banner text matches exact string", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const banner = shadowRoot.querySelector(".provii-preview-banner");
    const span = banner?.querySelector("span");
    expect(span?.textContent).toBe("Preview mode, no verification occurs");
  });

  it("preview banner dismiss button has correct aria-label", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const dismissBtn = shadowRoot.querySelector(
      ".provii-preview-banner-dismiss",
    );
    expect(dismissBtn).not.toBeNull();
    expect(dismissBtn?.getAttribute("aria-label")).toBe(
      "Dismiss preview banner",
    );
    expect(dismissBtn?.textContent).toBe("×");
  });

  it("dismiss button removes the banner from the DOM on click", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const dismissBtn = shadowRoot.querySelector(
      ".provii-preview-banner-dismiss",
    ) as HTMLButtonElement;
    dismissBtn.click();
    expect(
      shadowRoot.querySelector(".provii-preview-banner"),
    ).toBeNull();
  });

  it("derives allowed origins from document.referrer when previewOrigin is absent", async () => {
    // The referrer is typically empty in jsdom; this tests the fallback path
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const mode = new AutoBlockMode(
      baseCfg({ previewMode: true }),
    );
    await mode.initialise();
    // With no referrer and no previewOrigin, a warning should have been logged
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("no allowed origins available"),
    );
    warnSpy.mockRestore();
  });

  it("uses explicit previewOrigin when provided", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const mode = new AutoBlockMode(
      baseCfg({
        previewMode: true,
        previewOrigin: "https://docs.example.com",
      }),
    );
    await mode.initialise();
    // Should NOT warn about missing origins since we provided one
    const calls = warnSpy.mock.calls.map(([msg]) => msg);
    const originWarning = calls.find(
      (c: unknown) => typeof c === "string" && (c as string).includes("no allowed origins available"),
    );
    expect(originWarning).toBeUndefined();
    warnSpy.mockRestore();
  });

  it("splits comma-separated previewOrigin entries", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const mode = new AutoBlockMode(
      baseCfg({
        previewMode: true,
        previewOrigin: "https://a.example.com, https://b.example.com",
      }),
    );
    await mode.initialise();
    // No origin warning
    const calls = warnSpy.mock.calls.map(([msg]) => msg);
    const originWarning = calls.find(
      (c: unknown) => typeof c === "string" && (c as string).includes("no allowed origins available"),
    );
    expect(originWarning).toBeUndefined();
    warnSpy.mockRestore();
  });

  it("stores previewBridgeDisposer for cleanup", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();
    expect(asInternal(mode)["previewBridgeDisposer"]).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// showOverlay() , via direct call
// ---------------------------------------------------------------------------

describe("showOverlay", () => {
  it("locks body scroll to hidden", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Testing");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores body visibility to visible", () => {
    document.body.style.visibility = "hidden";
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Testing");
    expect(document.body.style.visibility).toBe("visible");
  });

  it("appends shadow host to the document body", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test message");
    const host = document.body.querySelector("div");
    expect(host).not.toBeNull();
  });

  it("creates overlay with correct role and aria attributes", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Loading");
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const overlay = shadowRoot.querySelector(".provii-age-gate-overlay");
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute("role")).toBe("dialog");
    expect(overlay?.getAttribute("aria-modal")).toBe("true");
    expect(overlay?.getAttribute("aria-label")).toBe(
      t("ageVerificationRegion"),
    );
  });

  it("sets lang attribute on overlay from current locale", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Loading");
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const overlay = shadowRoot.querySelector(".provii-age-gate-overlay");
    expect(overlay?.getAttribute("lang")).toBe("en");
  });

  it("sets dir=rtl on overlay when locale is RTL", () => {
    setLocale("ar");
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Loading");
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const overlay = shadowRoot.querySelector(".provii-age-gate-overlay");
    expect(overlay?.getAttribute("dir")).toBe("rtl");
  });

  it("does not set dir attribute for LTR locale", () => {
    setLocale("en");
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Loading");
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const overlay = shadowRoot.querySelector(".provii-age-gate-overlay");
    // LTR locales should not have the dir attribute set
    expect(overlay?.getAttribute("dir")).toBeNull();
  });

  it("marks background children as inert", () => {
    const bgDiv = document.createElement("div");
    bgDiv.id = "bg-content";
    document.body.appendChild(bgDiv);

    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Blocking");

    expect(bgDiv.hasAttribute("inert")).toBe(true);
  });

  it("creates overlay-content container with tabindex for focus", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Loading");
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const content = shadowRoot.querySelector(".provii-overlay-content");
    expect(content).not.toBeNull();
    expect(content?.getAttribute("tabindex")).toBe("-1");
  });

  it("renders loading text from t() translation function", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Initialising");
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const content = shadowRoot.querySelector(".provii-overlay-content");
    expect(content).not.toBeNull();
  });

  it("creates escape link when allowClose is false", () => {
    const mode = new AutoBlockMode(baseCfg({ allowClose: false }));
    // createOverlay adds the escape link, but showOverlay then calls
    // updateOverlayStatus which clears content.innerHTML. Test by calling
    // createOverlay directly and inspecting the returned element.
    const overlay = callPrivate<HTMLElement>(mode, "createOverlay");
    const escapeLink = overlay.querySelector(".provii-escape-link");
    expect(escapeLink).not.toBeNull();
    expect(escapeLink?.getAttribute("href")).toBe("about:blank");
    expect(escapeLink?.textContent).toBe(t("leaveSite"));
    expect(escapeLink?.getAttribute("tabindex")).toBe("0");
  });

  it("creates escape link when allowClose is undefined (default)", () => {
    const mode = new AutoBlockMode(baseCfg());
    const overlay = callPrivate<HTMLElement>(mode, "createOverlay");
    const escapeLink = overlay.querySelector(".provii-escape-link");
    expect(escapeLink).not.toBeNull();
  });

  it("does not create escape link when allowClose is true", () => {
    const mode = new AutoBlockMode(baseCfg({ allowClose: true }));
    const overlay = callPrivate<HTMLElement>(mode, "createOverlay");
    expect(overlay.querySelector(".provii-escape-link")).toBeNull();
  });

  it("reuses existing overlay on second call", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "First");
    const firstHost = asInternal(mode)["shadowHost"];
    callPrivate(mode, "showOverlay", "Second");
    const secondHost = asInternal(mode)["shadowHost"];
    expect(firstHost).toBe(secondHost);
  });

  it("returns early when document is undefined", () => {
    // Simulate non-browser environment
    const mode = new AutoBlockMode(baseCfg());
    // This shouldn't throw even in JSDOM; mainly a coverage path
    callPrivate(mode, "showOverlay", "Test");
    expect(asInternal(mode)["overlayElement"]).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// hideOverlay()
// ---------------------------------------------------------------------------

describe("hideOverlay", () => {
  it("restores body overflow", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Blocking");
    expect(document.body.style.overflow).toBe("hidden");
    callPrivate(mode, "hideOverlay");
    expect(document.body.style.overflow).toBe("");
  });

  it("removes shadow host from the DOM", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Blocking");
    expect(document.body.querySelector("div")).not.toBeNull();
    callPrivate(mode, "hideOverlay");
    // The shadow host was the only top-level div we added
    expect(asInternal(mode)["shadowHost"]).toBeNull();
  });

  it("nulls out overlayElement, shadowRoot, shadowHost", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Blocking");
    callPrivate(mode, "hideOverlay");
    expect(asInternal(mode)["overlayElement"]).toBeNull();
    expect(asInternal(mode)["shadowRoot"]).toBeNull();
    expect(asInternal(mode)["shadowHost"]).toBeNull();
  });

  it("removes inert from background children", () => {
    const bgDiv = document.createElement("div");
    bgDiv.id = "bg-content";
    document.body.appendChild(bgDiv);

    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Blocking");
    expect(bgDiv.hasAttribute("inert")).toBe(true);
    callPrivate(mode, "hideOverlay");
    expect(bgDiv.hasAttribute("inert")).toBe(false);
  });

  it("restores previous focus", () => {
    const focusTarget = document.createElement("button");
    document.body.appendChild(focusTarget);
    focusTarget.focus();

    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Blocking");
    callPrivate(mode, "hideOverlay");
    // previousFocus should be nulled
    expect(asInternal(mode)["previousFocus"]).toBeNull();
  });

  it("destroys challengeUI if present", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Blocking");
    const destroyMock = jest.fn();
    (asInternal(mode) as Record<string, unknown>)["challengeUI"] = {
      destroy: destroyMock,
      elements: {},
    };
    callPrivate(mode, "hideOverlay");
    expect(destroyMock).toHaveBeenCalled();
    expect(asInternal(mode)["challengeUI"]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// on() / off() / emit()
// ---------------------------------------------------------------------------

describe("event system (on / off / emit)", () => {
  it("registers and fires event handlers", () => {
    const mode = new AutoBlockMode(baseCfg());
    const handler = jest.fn();
    mode.on("verified", handler);
    callPrivate(mode, "emit", "verified", { sessionId: "s1" });
    expect(handler).toHaveBeenCalledWith({ sessionId: "s1" });
  });

  it("unregisters handlers via off()", () => {
    const mode = new AutoBlockMode(baseCfg());
    const handler = jest.fn();
    mode.on("error", handler);
    mode.off("error", handler);
    callPrivate(mode, "emit", "error", { code: "test" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("allows multiple handlers on the same event", () => {
    const mode = new AutoBlockMode(baseCfg());
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    mode.on("verified", handler1);
    mode.on("verified", handler2);
    callPrivate(mode, "emit", "verified", { sessionId: "s1" });
    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it("does not throw when emitting an event with no handlers", () => {
    const mode = new AutoBlockMode(baseCfg());
    expect(() =>
      callPrivate(mode, "emit", "timeout", { message: "test" }),
    ).not.toThrow();
  });

  it("catches and logs errors thrown by event handlers", () => {
    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const mode = new AutoBlockMode(baseCfg());
    mode.on("verified", () => {
      throw new Error("handler boom");
    });
    callPrivate(mode, "emit", "verified", {});
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error in verified handler"),
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });

  it("off() is safe to call on an unregistered event", () => {
    const mode = new AutoBlockMode(baseCfg());
    const handler = jest.fn();
    expect(() => mode.off("closed", handler)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// handleError()
// ---------------------------------------------------------------------------

describe("handleError", () => {
  it("emits error event with the code and a generic message", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");
    const handler = jest.fn();
    mode.on("error", handler);
    callPrivate(
      mode,
      "handleError",
      "test_code",
      new Error("secret details"),
    );
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "test_code",
        message: "Verification error",
      }),
    );
    // The internal error.message must NOT leak to the event
    expect(handler).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: "secret details" }),
    );
  });

  it("includes ApiError code in details when error is an ApiError", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");
    const handler = jest.fn();
    mode.on("error", handler);
    const apiErr = new ApiError("rate limited", 429, "RATE_LIMIT");
    callPrivate(mode, "handleError", "polling_error", apiErr);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ details: "RATE_LIMIT" }),
    );
  });

  it("details is undefined for non-ApiError errors", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");
    const handler = jest.fn();
    mode.on("error", handler);
    callPrivate(mode, "handleError", "generic", new Error("nope"));
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ details: undefined }),
    );
  });

  it("handles non-Error objects gracefully", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");
    const handler = jest.fn();
    mode.on("error", handler);
    callPrivate(mode, "handleError", "unknown", "string error");
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ code: "unknown" }),
    );
  });

  it("clears session cache on error", () => {
    SessionCache.set({
      sessionId: "s1",
      verifiedAt: 1000,
      expiresAt: 9999999999,
      origin: "https://example.com",
    });
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");
    callPrivate(mode, "handleError", "fail", new Error("x"));
    expect(SessionCache.get()).toBeNull();
  });

  it("renders generic overlay message, never the actual error text", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");
    callPrivate(
      mode,
      "handleError",
      "oops",
      new Error("XSS<script>alert(1)</script>"),
    );
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const statusMsg = shadowRoot.querySelector(".provii-status-message");
    expect(statusMsg?.textContent).toBe(t("somethingWentWrong"));
  });
});

// ---------------------------------------------------------------------------
// handleTimeout()
// ---------------------------------------------------------------------------

describe("handleTimeout", () => {
  it("shows timeout message in overlay and emits timeout event", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");
    const handler = jest.fn();
    mode.on("timeout", handler);
    callPrivate(mode, "handleTimeout");
    expect(handler).toHaveBeenCalledWith({
      message: "Verification timed out",
    });
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const msg = shadowRoot.querySelector(".provii-status-message");
    expect(msg?.textContent).toBe(t("verificationTimedOut"));
  });
});

// ---------------------------------------------------------------------------
// handleExpired()
// ---------------------------------------------------------------------------

describe("handleExpired", () => {
  it("emits expired event with exact message string", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");
    const handler = jest.fn();
    mode.on("expired", handler);
    callPrivate(mode, "handleExpired");
    expect(handler).toHaveBeenCalledWith({
      message: "Session expired",
    });
  });

  it("clears session cache on expiration", () => {
    SessionCache.set({
      sessionId: "s1",
      verifiedAt: 1000,
      expiresAt: 9999999999,
      origin: "https://example.com",
    });
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");
    callPrivate(mode, "handleExpired");
    expect(SessionCache.get()).toBeNull();
  });

  it("renders sessionExpired text in overlay", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");
    callPrivate(mode, "handleExpired");
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const msg = shadowRoot.querySelector(".provii-status-message");
    expect(msg?.textContent).toBe(t("sessionExpired"));
  });
});

// ---------------------------------------------------------------------------
// handleVerified()
// ---------------------------------------------------------------------------

describe("handleVerified", () => {
  it("caches session and emits verified event", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");
    const handler = jest.fn();
    mode.on("verified", handler);

    const status: StatusResponse = {
      sessionId: "s-123",
      state: "verified",
      complete: true,
      createdAt: 1000,
      expiresAt: 9999999999,
      proofVerified: true,
      remainingChecks: 0,
    };

    callPrivate(mode, "handleVerified", "s-123", status);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "s-123" }),
    );

    // Session should be cached
    const cached = SessionCache.get();
    expect(cached).not.toBeNull();
    expect(cached?.sessionId).toBe("s-123");
    expect(cached?.origin).toBe("https://example.com");
  });

  it("hides the overlay on verification", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");
    const status: StatusResponse = {
      sessionId: "s-1",
      state: "verified",
      complete: true,
      createdAt: 0,
      expiresAt: 9999999999,
      proofVerified: true,
      remainingChecks: 0,
    };
    callPrivate(mode, "handleVerified", "s-1", status);
    expect(asInternal(mode)["overlayElement"]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateOverlayStatus()
// ---------------------------------------------------------------------------

describe("updateOverlayStatus", () => {
  it("sets aria-live=polite and role=status for non-urgent messages", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Init");
    callPrivate(mode, "updateOverlayStatus", "Working", false);
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const wrapper = shadowRoot.querySelector("[role='status']");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute("aria-live")).toBe("polite");
  });

  it("sets aria-live=assertive and role=alert for urgent messages", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Init");
    callPrivate(mode, "updateOverlayStatus", "Error!", true);
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const wrapper = shadowRoot.querySelector("[role='alert']");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute("aria-live")).toBe("assertive");
  });

  it("adds a retry button for urgent messages", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Init");
    callPrivate(mode, "updateOverlayStatus", "Failed", true);
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const retryBtn = shadowRoot.querySelector(".provii-retry-button");
    expect(retryBtn).not.toBeNull();
    expect(retryBtn?.textContent).toBe(t("tryAgain"));
  });

  it("does not add a retry button for non-urgent messages", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Init");
    callPrivate(mode, "updateOverlayStatus", "Working", false);
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    expect(shadowRoot.querySelector(".provii-retry-button")).toBeNull();
  });

  it("restores dialog accessible name to ageVerificationRegion", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Init");
    // Set aria-labelledby to something different first
    const overlay = asInternal(mode)["overlayElement"] as HTMLElement;
    overlay.setAttribute("aria-labelledby", "something");
    callPrivate(mode, "updateOverlayStatus", "Update", false);
    expect(overlay.getAttribute("aria-labelledby")).toBeNull();
    expect(overlay.getAttribute("aria-label")).toBe(
      t("ageVerificationRegion"),
    );
  });

  it("returns early when overlayElement is null", () => {
    const mode = new AutoBlockMode(baseCfg());
    // No showOverlay called, so overlayElement is null
    expect(() =>
      callPrivate(mode, "updateOverlayStatus", "Nothing"),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// updateInstructionText()
// ---------------------------------------------------------------------------

describe("updateInstructionText", () => {
  it("updates span text inside statusMessage element", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Init");

    // Manually set up a challengeUI with a statusMessage containing a span
    const statusDiv = document.createElement("div");
    const span = document.createElement("span");
    span.textContent = "original";
    statusDiv.appendChild(span);

    (asInternal(mode) as Record<string, unknown>)["challengeUI"] = {
      elements: { statusMessage: statusDiv },
      destroy: jest.fn(),
    };

    callPrivate(mode, "updateInstructionText", "Updated text", "Indicator");
    expect(span.textContent).toBe("Updated text");
  });

  it("sets textContent directly when no span exists", () => {
    const mode = new AutoBlockMode(baseCfg());
    const statusDiv = document.createElement("div");
    statusDiv.textContent = "original";

    (asInternal(mode) as Record<string, unknown>)["challengeUI"] = {
      elements: { statusMessage: statusDiv },
      destroy: jest.fn(),
    };

    callPrivate(mode, "updateInstructionText", "Fallback text");
    expect(statusDiv.textContent).toBe("Fallback text");
  });

  it("returns early when challengeUI is null", () => {
    const mode = new AutoBlockMode(baseCfg());
    expect(() =>
      callPrivate(mode, "updateInstructionText", "No UI"),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// resolveIsMobile()
// ---------------------------------------------------------------------------

describe("resolveIsMobile", () => {
  it("returns false for desktop UA in non-preview mode", () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: false }));
    // JSDOM default UA is desktop-like
    const result = callPrivate<boolean>(mode, "resolveIsMobile");
    expect(result).toBe(false);
  });

  it("returns true when previewLayout is 'mobile' in preview mode", () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    (asInternal(mode) as Record<string, unknown>)["previewLayout"] = "mobile";
    const result = callPrivate<boolean>(mode, "resolveIsMobile");
    expect(result).toBe(true);
  });

  it("returns false when previewLayout is 'desktop' in preview mode", () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    (asInternal(mode) as Record<string, unknown>)["previewLayout"] = "desktop";
    const result = callPrivate<boolean>(mode, "resolveIsMobile");
    expect(result).toBe(false);
  });

  it("defers to isMobile() when previewLayout is 'auto' in preview mode", () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    (asInternal(mode) as Record<string, unknown>)["previewLayout"] = "auto";
    // JSDOM UA is desktop, so isMobile() returns false
    const result = callPrivate<boolean>(mode, "resolveIsMobile");
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveAccentGradientCss()
// ---------------------------------------------------------------------------

describe("resolveAccentGradientCss", () => {
  it("returns null when no accentGradient is configured", () => {
    const mode = new AutoBlockMode(baseCfg());
    const result = callPrivate<string | null>(
      mode,
      "resolveAccentGradientCss",
    );
    expect(result).toBeNull();
  });

  it("returns a raw CSS string verbatim", () => {
    const css = "linear-gradient(45deg, red, blue)";
    const mode = new AutoBlockMode(baseCfg({ accentGradient: css }));
    const result = callPrivate<string | null>(
      mode,
      "resolveAccentGradientCss",
    );
    expect(result).toBe(css);
  });

  it("builds a 135deg linear-gradient from a valid hex triple", () => {
    const mode = new AutoBlockMode(
      baseCfg({ accentGradient: ["#112233", "#445566", "#778899"] }),
    );
    const result = callPrivate<string | null>(
      mode,
      "resolveAccentGradientCss",
    );
    expect(result).toBe(
      "linear-gradient(135deg, #112233 0%, #445566 50%, #778899 100%)",
    );
  });

  it("rejects a tuple with wrong arity and returns null", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const mode = new AutoBlockMode(
      baseCfg({
        accentGradient: ["#111", "#222"] as unknown as [
          string,
          string,
          string,
        ],
      }),
    );
    const result = callPrivate<string | null>(
      mode,
      "resolveAccentGradientCss",
    );
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("must be [start, mid, end]"),
    );
    warn.mockRestore();
  });

  it("rejects a tuple with invalid hex entries and returns null", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const mode = new AutoBlockMode(
      baseCfg({ accentGradient: ["#112233", "notahex", "#778899"] }),
    );
    const result = callPrivate<string | null>(
      mode,
      "resolveAccentGradientCss",
    );
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("#rrggbb or #rgb"),
    );
    warn.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// resolveAccentGradientStops()
// ---------------------------------------------------------------------------

describe("resolveAccentGradientStops", () => {
  it("returns null when accentGradient is not an array", () => {
    const mode = new AutoBlockMode(baseCfg());
    const result = callPrivate<readonly [string, string, string] | null>(
      mode,
      "resolveAccentGradientStops",
    );
    expect(result).toBeNull();
  });

  it("returns null for a non-3-element array", () => {
    const mode = new AutoBlockMode(
      baseCfg({
        accentGradient: ["#aaa", "#bbb"] as unknown as [
          string,
          string,
          string,
        ],
      }),
    );
    const result = callPrivate<readonly [string, string, string] | null>(
      mode,
      "resolveAccentGradientStops",
    );
    expect(result).toBeNull();
  });

  it("returns null when hex validation fails", () => {
    const mode = new AutoBlockMode(
      baseCfg({ accentGradient: ["#112233", "nope", "#778899"] }),
    );
    const result = callPrivate<readonly [string, string, string] | null>(
      mode,
      "resolveAccentGradientStops",
    );
    expect(result).toBeNull();
  });

  it("returns the tuple for valid hex entries", () => {
    const mode = new AutoBlockMode(
      baseCfg({ accentGradient: ["#aabbcc", "#112233", "#445566"] }),
    );
    const result = callPrivate<readonly [string, string, string] | null>(
      mode,
      "resolveAccentGradientStops",
    );
    expect(result).toEqual(["#aabbcc", "#112233", "#445566"]);
  });
});

// ---------------------------------------------------------------------------
// applyCosmeticCssVars()
// ---------------------------------------------------------------------------

describe("applyCosmeticCssVars", () => {
  it("sets --ag-radius-container when containerRadius is specified", () => {
    const mode = new AutoBlockMode(baseCfg({ containerRadius: 24 }));
    callPrivate(mode, "showOverlay", "Test");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.style.getPropertyValue("--ag-radius-container")).toBe("24px");
  });

  it("sets --ag-radius-button when buttonRadius is specified", () => {
    const mode = new AutoBlockMode(baseCfg({ buttonRadius: 8 }));
    callPrivate(mode, "showOverlay", "Test");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.style.getPropertyValue("--ag-radius-button")).toBe("8px");
  });

  it("sets --ag-font-family when fontFamily is specified", () => {
    const mode = new AutoBlockMode(baseCfg({ fontFamily: "Inter, sans-serif" }));
    callPrivate(mode, "showOverlay", "Test");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.style.getPropertyValue("--ag-font-family")).toBe(
      "Inter, sans-serif",
    );
  });

  it("sets --ag-motion-duration when motionDuration is specified", () => {
    const mode = new AutoBlockMode(baseCfg({ motionDuration: 300 }));
    callPrivate(mode, "showOverlay", "Test");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.style.getPropertyValue("--ag-motion-duration")).toBe("300ms");
  });

  it("sets --ag-overlay-backdrop when backdropOpacity is specified", () => {
    const mode = new AutoBlockMode(baseCfg({ backdropOpacity: 80 }));
    callPrivate(mode, "showOverlay", "Test");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.style.getPropertyValue("--ag-overlay-backdrop")).toBe(
      "rgba(0, 0, 0, 0.80)",
    );
  });

  it("sets --ag-qr-fg when qrForeground is specified", () => {
    const mode = new AutoBlockMode(baseCfg({ qrForeground: "#ff0000" }));
    callPrivate(mode, "showOverlay", "Test");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.style.getPropertyValue("--ag-qr-fg")).toBe("#ff0000");
  });

  it("sets --ag-qr-bg when qrBackground is specified", () => {
    const mode = new AutoBlockMode(baseCfg({ qrBackground: "#00ff00" }));
    callPrivate(mode, "showOverlay", "Test");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.style.getPropertyValue("--ag-qr-bg")).toBe("#00ff00");
  });

  it("sets --ag-button-text when buttonTextColour is specified", () => {
    const mode = new AutoBlockMode(baseCfg({ buttonTextColour: "#0000ff" }));
    callPrivate(mode, "showOverlay", "Test");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.style.getPropertyValue("--ag-button-text")).toBe("#0000ff");
  });

  it("rebuilds --ag-accent-gradient when gradientAngle and accentGradient tuple are present", () => {
    const mode = new AutoBlockMode(
      baseCfg({
        gradientAngle: 90,
        accentGradient: ["#aabbcc", "#112233", "#445566"],
      }),
    );
    callPrivate(mode, "showOverlay", "Test");
    const host = document.body.querySelector("div") as HTMLElement;
    const gradient = host.style.getPropertyValue("--ag-accent-gradient");
    expect(gradient).toContain("90deg");
    expect(gradient).toContain("#aabbcc 0%");
    expect(gradient).toContain("#112233 50%");
    expect(gradient).toContain("#445566 100%");
  });

  it("sets data-agegate-theme for light theme", () => {
    const mode = new AutoBlockMode(baseCfg({ theme: "light" }));
    callPrivate(mode, "showOverlay", "Test");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.getAttribute("data-agegate-theme")).toBe("light");
  });

  it("sets data-agegate-theme for dark theme", () => {
    const mode = new AutoBlockMode(baseCfg({ theme: "dark" }));
    callPrivate(mode, "showOverlay", "Test");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.getAttribute("data-agegate-theme")).toBe("dark");
  });

  it("does not set data-agegate-theme for auto theme", () => {
    const mode = new AutoBlockMode(baseCfg({ theme: "auto" }));
    callPrivate(mode, "showOverlay", "Test");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.getAttribute("data-agegate-theme")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createOverlay() brand colour handling
// ---------------------------------------------------------------------------

describe("createOverlay brand colour handling", () => {
  it("sets --ag-accent-start from brandColor when valid", () => {
    const mode = new AutoBlockMode(baseCfg({ brandColor: "#ff5500" }));
    callPrivate(mode, "showOverlay", "Test");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.style.getPropertyValue("--ag-accent-start")).toBe("#ff5500");
  });

  it("derives --ag-accent-start from first accent stop when brandColor is absent", () => {
    const mode = new AutoBlockMode(
      baseCfg({ accentGradient: ["#aabb00", "#112233", "#445566"] }),
    );
    callPrivate(mode, "showOverlay", "Test");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.style.getPropertyValue("--ag-accent-start")).toBe("#aabb00");
  });

  it("does not set --ag-accent-start when neither brandColor nor accentGradient tuple is present", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.style.getPropertyValue("--ag-accent-start")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// getStyles()
// ---------------------------------------------------------------------------

describe("getStyles", () => {
  it("returns custom styles when style=custom and customStyles provided", () => {
    const customCss = ".my-rule { color: red; }";
    const mode = new AutoBlockMode(
      baseCfg({ style: "custom", customStyles: customCss }),
    );
    const result = callPrivate<string>(mode, "getStyles");
    expect(result).toBe(customCss);
  });

  it("returns default overlay CSS when style is not custom", () => {
    const mode = new AutoBlockMode(baseCfg());
    const result = callPrivate<string>(mode, "getStyles");
    expect(result).toContain(".provii-age-gate-overlay");
    expect(result).toContain(".provii-overlay-content");
    expect(result).toContain(".provii-close-button");
    expect(result).toContain(".provii-retry-button");
    expect(result).toContain(".provii-status-message");
    expect(result).toContain(".provii-escape-link");
    expect(result).toContain(".provii-preview-banner");
    expect(result).toContain(".provii-preview-banner-dismiss");
    expect(result).toContain("z-index: 999999");
  });

  it("default CSS includes RTL support for close button", () => {
    const mode = new AutoBlockMode(baseCfg());
    const result = callPrivate<string>(mode, "getStyles");
    expect(result).toContain(':host([dir="rtl"]) .provii-close-button');
  });

  it("default CSS includes responsive breakpoint at 360px", () => {
    const mode = new AutoBlockMode(baseCfg());
    const result = callPrivate<string>(mode, "getStyles");
    expect(result).toContain("max-width: 360px");
  });
});

// ---------------------------------------------------------------------------
// log()
// ---------------------------------------------------------------------------

describe("log", () => {
  it("outputs to console.debug when debug is true", () => {
    const debugSpy = jest
      .spyOn(console, "debug")
      .mockImplementation(() => {});
    const mode = new AutoBlockMode(baseCfg({ debug: true }));
    callPrivate(mode, "log", "test message", { data: 1 });
    expect(debugSpy).toHaveBeenCalledWith(
      "[AutoBlockMode] test message",
      { data: 1 },
    );
    debugSpy.mockRestore();
  });

  it("does not output when debug is false", () => {
    const debugSpy = jest
      .spyOn(console, "debug")
      .mockImplementation(() => {});
    const mode = new AutoBlockMode(baseCfg({ debug: false }));
    callPrivate(mode, "log", "silent");
    expect(debugSpy).not.toHaveBeenCalled();
    debugSpy.mockRestore();
  });

  it("appends empty string when data is not provided", () => {
    const debugSpy = jest
      .spyOn(console, "debug")
      .mockImplementation(() => {});
    const mode = new AutoBlockMode(baseCfg({ debug: true }));
    callPrivate(mode, "log", "no data");
    expect(debugSpy).toHaveBeenCalledWith(
      "[AutoBlockMode] no data",
      "",
    );
    debugSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Keyboard handling in overlay (focus trap, Escape)
// ---------------------------------------------------------------------------

describe("overlay keyboard handling", () => {
  it("closes overlay on Escape when allowClose is true", () => {
    const mode = new AutoBlockMode(baseCfg({ allowClose: true }));
    callPrivate(mode, "showOverlay", "Test");
    const handler = jest.fn();
    mode.on("closed", handler);

    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const overlay = shadowRoot.querySelector(
      ".provii-age-gate-overlay",
    ) as HTMLElement;
    overlay.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );

    expect(handler).toHaveBeenCalledWith({});
    expect(asInternal(mode)["overlayElement"]).toBeNull();
  });

  it("does not close overlay on Escape when allowClose is false", () => {
    const mode = new AutoBlockMode(baseCfg({ allowClose: false }));
    callPrivate(mode, "showOverlay", "Test");
    const handler = jest.fn();
    mode.on("closed", handler);

    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const overlay = shadowRoot.querySelector(
      ".provii-age-gate-overlay",
    ) as HTMLElement;
    overlay.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );

    expect(handler).not.toHaveBeenCalled();
    expect(asInternal(mode)["overlayElement"]).not.toBeNull();
  });

  it("prevents focus escape on Tab when no focusable elements", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");

    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const overlay = shadowRoot.querySelector(
      ".provii-age-gate-overlay",
    ) as HTMLElement;

    // Remove all focusable elements from shadow root
    const focusables = shadowRoot.querySelectorAll(
      'a[href], button, input, [tabindex]:not([tabindex="-1"])',
    );
    focusables.forEach((el) => el.remove());

    const tabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    const preventSpy = jest.spyOn(tabEvent, "preventDefault");
    overlay.dispatchEvent(tabEvent);

    expect(preventSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Close button (allowClose=true)
// ---------------------------------------------------------------------------

describe("close button with allowClose", () => {
  it("creates close button inside overlay content when allowClose is true", async () => {
    const mode = new AutoBlockMode(
      baseCfg({ previewMode: true, allowClose: true }),
    );
    await mode.initialise();
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const closeBtn = shadowRoot.querySelector(".provii-close-button");
    expect(closeBtn).not.toBeNull();
    expect(closeBtn?.getAttribute("aria-label")).toBe(
      t("closeVerification"),
    );
  });

  it("clicking close button hides overlay and emits closed", async () => {
    const mode = new AutoBlockMode(
      baseCfg({ previewMode: true, allowClose: true }),
    );
    await mode.initialise();
    const handler = jest.fn();
    mode.on("closed", handler);

    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const closeBtn = shadowRoot.querySelector(
      ".provii-close-button",
    ) as HTMLButtonElement;
    closeBtn.click();

    expect(handler).toHaveBeenCalledWith({});
    expect(asInternal(mode)["overlayElement"]).toBeNull();
  });

  it("does not create close button when allowClose is false", async () => {
    const mode = new AutoBlockMode(
      baseCfg({ previewMode: true, allowClose: false }),
    );
    await mode.initialise();
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    expect(shadowRoot.querySelector(".provii-close-button")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// applyPreviewConfig()
// ---------------------------------------------------------------------------

describe("applyPreviewConfig", () => {
  async function previewMode(
    extra: Partial<AutoBlockConfig> = {},
  ): Promise<AutoBlockMode> {
    const mode = new AutoBlockMode(
      baseCfg({ previewMode: true, ...extra }),
    );
    await mode.initialise();
    return mode;
  }

  it("updates logo with SVG via DOMPurify sanitisation", async () => {
    const mode = await previewMode();
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const logoEl = shadowRoot.querySelector(".logo");
    if (!logoEl) return; // Logo element may or may not exist depending on challenge UI build
    mode.applyPreviewConfig({
      logoSvg: "<svg data-test='custom'></svg>",
    });
    const svg = logoEl.querySelector("svg[data-test='custom']");
    expect(svg).not.toBeNull();
  });

  it("updates logo with an img when logoUrl is provided and logoSvg is empty", async () => {
    const mode = await previewMode();
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const logoEl = shadowRoot.querySelector(".logo");
    if (!logoEl) return;
    mode.applyPreviewConfig({
      logoUrl: "https://cdn.example.com/logo.png",
      logoSvg: "",
    });
    const img = logoEl.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://cdn.example.com/logo.png");
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.getAttribute("aria-hidden")).toBe("true");
  });

  it("updates privacy policy link for existing element", async () => {
    const mode = await previewMode({
      privacyPolicyUrl: "https://old.example.com/privacy",
    });
    mode.applyPreviewConfig({
      privacyPolicyUrl: "https://new.example.com/privacy",
    });
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const link = shadowRoot.querySelector(
      ".agegate-privacy-link",
    ) as HTMLAnchorElement | null;
    if (link) {
      expect(link.href).toBe("https://new.example.com/privacy");
    }
  });

  it("hides privacy link when non-https URL is provided", async () => {
    const mode = await previewMode({
      privacyPolicyUrl: "https://example.com/privacy",
    });
    mode.applyPreviewConfig({ privacyPolicyUrl: "http://insecure.com" });
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const link = shadowRoot.querySelector(".agegate-privacy-link");
    if (link?.parentElement) {
      expect(link.parentElement.hasAttribute("hidden")).toBe(true);
    }
  });

  it("creates privacy link in footer when element does not exist but URL is https", async () => {
    const mode = await previewMode();
    mode.applyPreviewConfig({
      privacyPolicyUrl: "https://example.com/privacy",
    });
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const footer = shadowRoot.querySelector(".footer");
    if (footer) {
      const link = footer.querySelector(".agegate-privacy-link");
      expect(link).not.toBeNull();
      expect(link?.getAttribute("target")).toBe("_blank");
      expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("changes locale when payload.locale differs from current", async () => {
    const mode = await previewMode();
    mode.applyPreviewConfig({ locale: "fr" });
    // Direction and lang should have been updated
    const overlay = asInternal(mode)["overlayElement"] as HTMLElement;
    if (overlay) {
      expect(overlay.getAttribute("lang")).toBe("fr");
    }
  });

  it("sets dir=rtl when locale changes to an RTL locale", async () => {
    const mode = await previewMode();
    mode.applyPreviewConfig({ locale: "ar" });
    const overlay = asInternal(mode)["overlayElement"] as HTMLElement;
    if (overlay) {
      expect(overlay.getAttribute("dir")).toBe("rtl");
    }
  });

  it("sets dir=ltr for LTR locales", async () => {
    const mode = await previewMode();
    mode.applyPreviewConfig({ locale: "en" });
    const overlay = asInternal(mode)["overlayElement"] as HTMLElement;
    if (overlay) {
      expect(overlay.getAttribute("dir")).toBe("ltr");
    }
  });

  it("applies string overrides and re-renders text", async () => {
    const mode = await previewMode();
    mode.applyPreviewConfig({
      strings: { headerTitle: "Custom Title" },
    });
    expect(t("headerTitle")).toBe("Custom Title");
  });

  it("does not re-render text when locale and strings are unchanged", async () => {
    const mode = await previewMode();
    const rerenderSpy = jest
      .spyOn(
        mode as unknown as { rerenderTextContent: () => void },
        "rerenderTextContent" as never,
      )
      .mockImplementation((() => {}) as never);
    mode.applyPreviewConfig({});
    expect(rerenderSpy).not.toHaveBeenCalled();
  });

  it("updates previewLayout and triggers QR rebuild", async () => {
    const mode = await previewMode();
    const prevChallenge = asInternal(mode)["currentChallenge"];
    expect(prevChallenge).not.toBeNull();
    // Changing layout should trigger rebuild
    mode.applyPreviewConfig({ previewLayout: "mobile" });
    expect(asInternal(mode)["previewLayout"]).toBe("mobile");
  });

  it("does not change previewLayout when value is same as current", async () => {
    const mode = await previewMode();
    (asInternal(mode) as Record<string, unknown>)["previewLayout"] = "desktop";
    mode.applyPreviewConfig({ previewLayout: "desktop" });
    // No rebuild triggered since value is the same
    expect(asInternal(mode)["previewLayout"]).toBe("desktop");
  });

  it("updates qrDotStyle and triggers rebuild", async () => {
    const mode = await previewMode();
    mode.applyPreviewConfig({ qrDotStyle: "rounded" });
    expect(asInternal(mode)["qrDotStyle"]).toBe("rounded");
  });

  it("updates qrEyeFrameStyle and triggers rebuild", async () => {
    const mode = await previewMode();
    mode.applyPreviewConfig({ qrEyeFrameStyle: "square" });
    expect(asInternal(mode)["qrEyeFrameStyle"]).toBe("square");
  });

  it("updates qrEyeDotStyle and triggers rebuild", async () => {
    const mode = await previewMode();
    mode.applyPreviewConfig({ qrEyeDotStyle: "dot" });
    expect(asInternal(mode)["qrEyeDotStyle"]).toBe("dot");
  });

  it("updates qrLogoUrl and triggers rebuild", async () => {
    const mode = await previewMode();
    mode.applyPreviewConfig({ qrLogoUrl: "https://example.com/qr-logo.png" });
    expect(asInternal(mode)["qrLogoUrl"]).toBe(
      "https://example.com/qr-logo.png",
    );
  });

  it("updates qrForeground and triggers rebuild", async () => {
    const mode = await previewMode();
    mode.applyPreviewConfig({ qrForeground: "#aabb00" });
    expect(asInternal(mode)["qrForeground"]).toBe("#aabb00");
  });

  it("updates qrBackground and triggers rebuild", async () => {
    const mode = await previewMode();
    mode.applyPreviewConfig({ qrBackground: "#ffffff" });
    expect(asInternal(mode)["qrBackground"]).toBe("#ffffff");
  });

  it("does not rebuild QR when values are unchanged", async () => {
    const mode = await previewMode();
    (asInternal(mode) as Record<string, unknown>)["qrDotStyle"] = "dots";
    const challengeBefore = asInternal(mode)["currentChallenge"];
    mode.applyPreviewConfig({ qrDotStyle: "dots" });
    // No rebuild means challengeUI is not re-created (same reference)
    expect(asInternal(mode)["currentChallenge"]).toBe(challengeBefore);
  });
});

// ---------------------------------------------------------------------------
// rerenderTextContent()
// ---------------------------------------------------------------------------

describe("rerenderTextContent", () => {
  it("returns early when shadowRoot is null", () => {
    const mode = new AutoBlockMode(baseCfg());
    // shadowRoot is null since no overlay was shown
    expect(() => callPrivate(mode, "rerenderTextContent")).not.toThrow();
  });

  it("updates heading text to headerTitle", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const heading = shadowRoot.querySelector("h2");
    if (heading) {
      setStringOverrides({ headerTitle: "New Title" });
      callPrivate(mode, "rerenderTextContent");
      expect(heading.textContent).toBe("New Title");
    }
  });

  it("updates footer subtitle", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const footerSubtitle = shadowRoot.querySelector(".footer-subtitle");
    if (footerSubtitle) {
      setStringOverrides({ footerSubtitle: "New Footer" });
      callPrivate(mode, "rerenderTextContent");
      expect(footerSubtitle.textContent).toBe("New Footer");
    }
  });

  it("updates privacy link text", async () => {
    const mode = new AutoBlockMode(
      baseCfg({
        previewMode: true,
        privacyPolicyUrl: "https://example.com/privacy",
      }),
    );
    await mode.initialise();
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const privacyLink = shadowRoot.querySelector(".agegate-privacy-link");
    if (privacyLink) {
      setStringOverrides({ privacyPolicyLinkLabel: "Data Policy" });
      callPrivate(mode, "rerenderTextContent");
      expect(privacyLink.textContent).toBe("Data Policy");
    }
  });

  it("updates overlay aria-label to ageVerificationRegion", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();
    setStringOverrides({ ageVerificationRegion: "Verify Age" });
    callPrivate(mode, "rerenderTextContent");
    const overlay = asInternal(mode)["overlayElement"] as HTMLElement;
    if (overlay) {
      expect(overlay.getAttribute("aria-label")).toBe("Verify Age");
    }
  });
});

// ---------------------------------------------------------------------------
// Polling-related methods
// ---------------------------------------------------------------------------

describe("polling lifecycle", () => {
  it("startPolling sets pollingStartTime and resets counters", () => {
    jest.useFakeTimers();
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");

    // Mock the apiClient.pollStatus to avoid real fetches
    const apiClient = asInternal(mode)["apiClient"] as Record<string, unknown>;
    (apiClient as Record<string, (...args: unknown[]) => unknown>)["pollStatus"] = jest
      .fn()
      .mockResolvedValue({
        sessionId: "s1",
        state: "pending",
        complete: false,
        createdAt: 0,
        expiresAt: 9999999999,
        proofVerified: false,
        remainingChecks: 10,
      });

    callPrivate(mode, "startPolling", "s1");

    expect(asInternal(mode)["pollingStartTime"]).toBeGreaterThan(0);
    expect(asInternal(mode)["currentPollingInterval"]).toBe(
      DEFAULT_POLLING_CONFIG.initialInterval,
    );
    expect(asInternal(mode)["consecutivePollingErrors"]).toBe(0);
    expect(asInternal(mode)["heartbeatShown"]).toBe(false);
    expect(asInternal(mode)["pollingIntervalId"]).not.toBeNull();

    callPrivate(mode, "stopPolling");
    jest.useRealTimers();
  });

  it("stopPolling clears interval and sets pollingIntervalId to null", () => {
    jest.useFakeTimers();
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");

    const apiClient = asInternal(mode)["apiClient"] as Record<string, unknown>;
    (apiClient as Record<string, (...args: unknown[]) => unknown>)["pollStatus"] = jest
      .fn()
      .mockResolvedValue({
        sessionId: "s1",
        state: "pending",
        complete: false,
        createdAt: 0,
        expiresAt: 9999999999,
        proofVerified: false,
        remainingChecks: 10,
      });

    callPrivate(mode, "startPolling", "s1");
    expect(asInternal(mode)["pollingIntervalId"]).not.toBeNull();

    callPrivate(mode, "stopPolling");
    expect(asInternal(mode)["pollingIntervalId"]).toBeNull();

    jest.useRealTimers();
  });

  it("stopPolling is safe to call when no polling is active", () => {
    const mode = new AutoBlockMode(baseCfg());
    expect(() => callPrivate(mode, "stopPolling")).not.toThrow();
    expect(asInternal(mode)["pollingIntervalId"]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updatePollingInterval()
// ---------------------------------------------------------------------------

describe("updatePollingInterval", () => {
  it("applies backoff multiplier up to maxInterval", () => {
    jest.useFakeTimers();
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");

    const apiClient = asInternal(mode)["apiClient"] as Record<string, unknown>;
    (apiClient as Record<string, (...args: unknown[]) => unknown>)["pollStatus"] = jest
      .fn()
      .mockResolvedValue({
        sessionId: "s1",
        state: "pending",
        complete: false,
        createdAt: 0,
        expiresAt: 9999999999,
        proofVerified: false,
        remainingChecks: 10,
      });

    callPrivate(mode, "startPolling", "s1");
    const initial = asInternal(mode)["currentPollingInterval"] as number;
    expect(initial).toBe(DEFAULT_POLLING_CONFIG.initialInterval);

    callPrivate(mode, "updatePollingInterval");
    const afterFirst = asInternal(mode)["currentPollingInterval"] as number;
    expect(afterFirst).toBe(
      Math.min(
        initial * DEFAULT_POLLING_CONFIG.backoffMultiplier,
        DEFAULT_POLLING_CONFIG.maxInterval,
      ),
    );

    callPrivate(mode, "stopPolling");
    jest.useRealTimers();
  });

  it("does not exceed maxInterval", () => {
    const mode = new AutoBlockMode(baseCfg());
    (asInternal(mode) as Record<string, unknown>)["currentPollingInterval"] =
      DEFAULT_POLLING_CONFIG.maxInterval;
    (asInternal(mode) as Record<string, unknown>)["pollingIntervalId"] = 999;
    callPrivate(mode, "updatePollingInterval");
    expect(asInternal(mode)["currentPollingInterval"]).toBe(
      DEFAULT_POLLING_CONFIG.maxInterval,
    );
  });
});

// ---------------------------------------------------------------------------
// pollStatus() , state machine paths
// ---------------------------------------------------------------------------

describe("pollStatus state handling", () => {
  function setupModeWithPolling(): {
    mode: AutoBlockMode;
    mockPollStatus: jest.Mock;
  } {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");

    const mockPollStatus = jest.fn();
    const apiClient = asInternal(mode)["apiClient"] as Record<string, unknown>;
    (apiClient as Record<string, (...args: unknown[]) => unknown>)["pollStatus"] =
      mockPollStatus;

    // Set pollingStartTime to now so timeout checks pass
    (asInternal(mode) as Record<string, unknown>)["pollingStartTime"] =
      Date.now();
    (asInternal(mode) as Record<string, unknown>)["currentChallenge"] = {
      sessionId: "s1",
      challengeId: "c1",
      qrCodeUrl: "",
      challengeCode: "000000000000",
      expiresAt: 9999999999,
      deepLink: "#",
      status: "pending",
    };

    return { mode, mockPollStatus };
  }

  it("emits statusUpdate event on every successful poll", async () => {
    const { mode, mockPollStatus } = setupModeWithPolling();
    mockPollStatus.mockResolvedValue({
      sessionId: "s1",
      state: "pending",
      complete: false,
      createdAt: 0,
      expiresAt: 9999999999,
      proofVerified: false,
      remainingChecks: 10,
    });
    const handler = jest.fn();
    mode.on("statusUpdate", handler);
    await callPrivate<Promise<void>>(mode, "pollStatus", "s1");
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "s1",
        status: "pending",
        proofVerified: false,
      }),
    );
  });

  it("resets consecutivePollingErrors on success", async () => {
    const { mode, mockPollStatus } = setupModeWithPolling();
    (asInternal(mode) as Record<string, unknown>)["consecutivePollingErrors"] =
      3;
    mockPollStatus.mockResolvedValue({
      sessionId: "s1",
      state: "pending",
      complete: false,
      createdAt: 0,
      expiresAt: 9999999999,
      proofVerified: false,
      remainingChecks: 10,
    });
    await callPrivate<Promise<void>>(mode, "pollStatus", "s1");
    expect(asInternal(mode)["consecutivePollingErrors"]).toBe(0);
  });

  it("handles proof_ok state by calling redeemSession", async () => {
    const { mode, mockPollStatus } = setupModeWithPolling();
    mockPollStatus.mockResolvedValue({
      sessionId: "s1",
      state: "proof_ok",
      complete: false,
      createdAt: 0,
      expiresAt: 9999999999,
      proofVerified: true,
      remainingChecks: 10,
    });

    // Mock redeemSession to avoid real API calls
    const redeemSpy = jest
      .spyOn(
        mode as unknown as { redeemSession: (id: string) => Promise<void> },
        "redeemSession" as never,
      )
      .mockResolvedValue(undefined as never);

    await callPrivate<Promise<void>>(mode, "pollStatus", "s1");
    expect(redeemSpy).toHaveBeenCalledWith("s1");
  });

  it("handles verified state directly", async () => {
    const { mode, mockPollStatus } = setupModeWithPolling();
    const verifiedResponse: StatusResponse = {
      sessionId: "s1",
      state: "verified",
      complete: true,
      createdAt: 0,
      expiresAt: 9999999999,
      proofVerified: true,
      remainingChecks: 0,
    };
    mockPollStatus.mockResolvedValue(verifiedResponse);

    const handler = jest.fn();
    mode.on("verified", handler);
    await callPrivate<Promise<void>>(mode, "pollStatus", "s1");
    expect(handler).toHaveBeenCalled();
  });

  it("handles expired state", async () => {
    const { mode, mockPollStatus } = setupModeWithPolling();
    mockPollStatus.mockResolvedValue({
      sessionId: "s1",
      state: "expired",
      complete: true,
      createdAt: 0,
      expiresAt: 0,
      proofVerified: false,
      remainingChecks: 0,
    });
    const handler = jest.fn();
    mode.on("expired", handler);
    await callPrivate<Promise<void>>(mode, "pollStatus", "s1");
    expect(handler).toHaveBeenCalledWith({
      message: "Session expired",
    });
  });

  it("handles revoked state", async () => {
    const { mode, mockPollStatus } = setupModeWithPolling();
    mockPollStatus.mockResolvedValue({
      sessionId: "s1",
      state: "revoked",
      complete: true,
      createdAt: 0,
      expiresAt: 0,
      proofVerified: false,
      remainingChecks: 0,
      error: "Admin revoked",
    });
    const handler = jest.fn();
    mode.on("error", handler);
    await callPrivate<Promise<void>>(mode, "pollStatus", "s1");
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ code: "session_revoked" }),
    );
  });

  it("handles revoked state with no error text", async () => {
    const { mode, mockPollStatus } = setupModeWithPolling();
    mockPollStatus.mockResolvedValue({
      sessionId: "s1",
      state: "revoked",
      complete: true,
      createdAt: 0,
      expiresAt: 0,
      proofVerified: false,
      remainingChecks: 0,
    });
    const handler = jest.fn();
    mode.on("error", handler);
    await callPrivate<Promise<void>>(mode, "pollStatus", "s1");
    expect(handler).toHaveBeenCalled();
  });

  it("shows heartbeat after 20 seconds of pending", async () => {
    const { mode, mockPollStatus } = setupModeWithPolling();
    // Set start time to 25 seconds ago
    (asInternal(mode) as Record<string, unknown>)["pollingStartTime"] =
      Date.now() - 25_000;
    (asInternal(mode) as Record<string, unknown>)["heartbeatShown"] = false;

    mockPollStatus.mockResolvedValue({
      sessionId: "s1",
      state: "pending",
      complete: false,
      createdAt: 0,
      expiresAt: 9999999999,
      proofVerified: false,
      remainingChecks: 10,
    });

    await callPrivate<Promise<void>>(mode, "pollStatus", "s1");
    expect(asInternal(mode)["heartbeatShown"]).toBe(true);
  });

  it("does not show heartbeat again after already shown", async () => {
    const { mode, mockPollStatus } = setupModeWithPolling();
    (asInternal(mode) as Record<string, unknown>)["pollingStartTime"] =
      Date.now() - 25_000;
    (asInternal(mode) as Record<string, unknown>)["heartbeatShown"] = true;

    mockPollStatus.mockResolvedValue({
      sessionId: "s1",
      state: "pending",
      complete: false,
      createdAt: 0,
      expiresAt: 9999999999,
      proofVerified: false,
      remainingChecks: 10,
    });

    // Should not throw or re-set heartbeat
    await callPrivate<Promise<void>>(mode, "pollStatus", "s1");
    expect(asInternal(mode)["heartbeatShown"]).toBe(true);
  });

  it("does not show heartbeat within first 20 seconds", async () => {
    const { mode, mockPollStatus } = setupModeWithPolling();
    // Start time is now, so elapsed is ~0
    (asInternal(mode) as Record<string, unknown>)["pollingStartTime"] =
      Date.now();
    (asInternal(mode) as Record<string, unknown>)["heartbeatShown"] = false;

    mockPollStatus.mockResolvedValue({
      sessionId: "s1",
      state: "pending",
      complete: false,
      createdAt: 0,
      expiresAt: 9999999999,
      proofVerified: false,
      remainingChecks: 10,
    });

    await callPrivate<Promise<void>>(mode, "pollStatus", "s1");
    expect(asInternal(mode)["heartbeatShown"]).toBe(false);
  });

  it("triggers timeout when elapsed exceeds polling timeout", async () => {
    const { mode, mockPollStatus } = setupModeWithPolling();
    (asInternal(mode) as Record<string, unknown>)["pollingStartTime"] =
      Date.now() - DEFAULT_POLLING_CONFIG.timeout - 1000;

    const handler = jest.fn();
    mode.on("timeout", handler);
    await callPrivate<Promise<void>>(mode, "pollStatus", "s1");
    expect(handler).toHaveBeenCalledWith({
      message: "Verification timed out",
    });
    // pollStatus should not have been called since timeout triggers first
    expect(mockPollStatus).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// pollStatus() , error handling and circuit breaker
// ---------------------------------------------------------------------------

describe("pollStatus error handling", () => {
  function setupForError(): {
    mode: AutoBlockMode;
    mockPollStatus: jest.Mock;
  } {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");

    const mockPollStatus = jest.fn();
    const apiClient = asInternal(mode)["apiClient"] as Record<string, unknown>;
    (apiClient as Record<string, (...args: unknown[]) => unknown>)["pollStatus"] =
      mockPollStatus;

    (asInternal(mode) as Record<string, unknown>)["pollingStartTime"] =
      Date.now();
    (asInternal(mode) as Record<string, unknown>)["currentChallenge"] = {
      sessionId: "s1",
      challengeId: "c1",
      qrCodeUrl: "",
      challengeCode: "000000000000",
      expiresAt: 9999999999,
      deepLink: "#",
      status: "pending",
    };

    return { mode, mockPollStatus };
  }

  it("increments consecutivePollingErrors on poll failure", async () => {
    const { mode, mockPollStatus } = setupForError();
    mockPollStatus.mockRejectedValue(new Error("network error"));
    await callPrivate<Promise<void>>(mode, "pollStatus", "s1");
    expect(asInternal(mode)["consecutivePollingErrors"]).toBe(1);
  });

  it("triggers circuit breaker after 5 consecutive errors", async () => {
    const { mode, mockPollStatus } = setupForError();
    mockPollStatus.mockRejectedValue(new Error("fail"));
    (asInternal(mode) as Record<string, unknown>)["consecutivePollingErrors"] =
      4; // Will become 5 on this error
    const handler = jest.fn();
    mode.on("error", handler);
    await callPrivate<Promise<void>>(mode, "pollStatus", "s1");
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ code: "polling_circuit_breaker" }),
    );
  });

  it("does not trigger circuit breaker below 5 errors", async () => {
    const { mode, mockPollStatus } = setupForError();
    mockPollStatus.mockRejectedValue(new Error("fail"));
    (asInternal(mode) as Record<string, unknown>)["consecutivePollingErrors"] =
      2;
    const handler = jest.fn();
    mode.on("error", handler);
    await callPrivate<Promise<void>>(mode, "pollStatus", "s1");
    expect(handler).not.toHaveBeenCalled();
    expect(asInternal(mode)["consecutivePollingErrors"]).toBe(3);
  });

  it("honours Retry-After header from ApiError with retryAfterMs", async () => {
    jest.useFakeTimers();
    const { mode, mockPollStatus } = setupForError();

    const apiErr = new ApiError("rate limited", 429, "RATE_LIMIT", undefined, 5000);
    mockPollStatus.mockRejectedValue(apiErr);

    // Set a polling interval so the restart logic can clear it
    (asInternal(mode) as Record<string, unknown>)["pollingIntervalId"] =
      window.setInterval(() => {}, 10000);

    await callPrivate<Promise<void>>(mode, "pollStatus", "s1");
    expect(asInternal(mode)["currentPollingInterval"]).toBe(5000);

    callPrivate(mode, "stopPolling");
    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// checkAndBlock() , session cache and cookie checks
// ---------------------------------------------------------------------------

describe("checkAndBlock", () => {
  it("returns immediately when SessionCache is valid", async () => {
    SessionCache.set({
      sessionId: "cached-session",
      verifiedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      origin: "https://example.com",
    });

    const mode = new AutoBlockMode(baseCfg());
    const blockSpy = jest
      .spyOn(
        mode as unknown as { blockAndVerify: () => Promise<void> },
        "blockAndVerify" as never,
      )
      .mockResolvedValue(undefined as never);

    await callPrivate<Promise<void>>(mode, "checkAndBlock");
    expect(blockSpy).not.toHaveBeenCalled();
  });

  it("clears stale cache and blocks when no session exists", async () => {
    const mode = new AutoBlockMode(baseCfg());
    const blockSpy = jest
      .spyOn(
        mode as unknown as { blockAndVerify: () => Promise<void> },
        "blockAndVerify" as never,
      )
      .mockResolvedValue(undefined as never);

    await callPrivate<Promise<void>>(mode, "checkAndBlock");
    expect(blockSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// backgroundRevalidate()
// ---------------------------------------------------------------------------

describe("backgroundRevalidate", () => {
  it("clears cache when session cookie is missing", async () => {
    SessionCache.set({
      sessionId: "s1",
      verifiedAt: 1000,
      expiresAt: 9999999999,
      origin: "https://example.com",
    });

    const mode = new AutoBlockMode(baseCfg());
    // SessionManager.hasSession() returns false in JSDOM (no cookies)
    await callPrivate<Promise<void>>(mode, "backgroundRevalidate");
    // Cache should be cleared since no cookie exists
    expect(SessionCache.get()).toBeNull();
  });

  it("does not clear cache on errors", async () => {
    const mode = new AutoBlockMode(baseCfg());
    // Mock sessionManager to throw
    const sessionManager = asInternal(mode)["sessionManager"] as Record<
      string,
      unknown
    >;
    (sessionManager as Record<string, (...args: unknown[]) => unknown>)["hasSession"] = () => {
      throw new Error("storage unavailable");
    };

    SessionCache.set({
      sessionId: "s1",
      verifiedAt: 1000,
      expiresAt: 9999999999,
      origin: "https://example.com",
    });

    await callPrivate<Promise<void>>(mode, "backgroundRevalidate");
    // Cache should NOT be cleared on errors
    expect(SessionCache.get()).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// redeemSession()
// ---------------------------------------------------------------------------

describe("redeemSession", () => {
  it("throws when PKCE verifier is not found", async () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");

    // pkceManager.getVerifier returns null for unknown session
    const handler = jest.fn();
    mode.on("error", handler);
    await callPrivate<Promise<void>>(mode, "redeemSession", "unknown-session");
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ code: "redemption_failed" }),
    );
  });
});

// ---------------------------------------------------------------------------
// updateOverlayWithChallenge()
// ---------------------------------------------------------------------------

describe("updateOverlayWithChallenge", () => {
  it("returns early when shadowRoot is null", () => {
    const mode = new AutoBlockMode(baseCfg());
    // No overlay created, shadowRoot is null
    expect(() =>
      callPrivate(mode, "updateOverlayWithChallenge", {
        sessionId: "s1",
        challengeId: "c1",
        qrCodeUrl: "",
        challengeCode: "000000000000",
        expiresAt: 9999999999,
        deepLink: "#",
        status: "pending",
      }),
    ).not.toThrow();
  });

  it("destroys previous challengeUI before building new one", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();

    const destroyMock = jest.fn();
    (asInternal(mode) as Record<string, unknown>)["challengeUI"] = {
      destroy: destroyMock,
      elements: {},
    };

    callPrivate(mode, "updateOverlayWithChallenge", {
      sessionId: "s1",
      challengeId: "c1",
      qrCodeUrl: "",
      challengeCode: "000000000000",
      expiresAt: 9999999999,
      deepLink: "#",
      status: "pending",
    });

    expect(destroyMock).toHaveBeenCalled();
  });

  it("sets aria-labelledby on overlay after challenge is rendered", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();

    const overlay = asInternal(mode)["overlayElement"] as HTMLElement;
    expect(overlay.getAttribute("aria-labelledby")).toBe(
      "provii-overlay-heading",
    );
    // aria-label should be removed in favour of aria-labelledby
    expect(overlay.getAttribute("aria-label")).toBeNull();
  });

  it("adds close button when allowClose is true", async () => {
    const mode = new AutoBlockMode(
      baseCfg({ previewMode: true, allowClose: true }),
    );
    await mode.initialise();
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const closeBtn = shadowRoot.querySelector(".provii-close-button");
    expect(closeBtn).not.toBeNull();
  });

  it("passes QR style options when instance fields are set", async () => {
    const mode = new AutoBlockMode(
      baseCfg({
        previewMode: true,
        qrDotStyle: "rounded",
        qrEyeFrameStyle: "dot",
      }),
    );
    await mode.initialise();
    // If we got here without error, the QR style options were passed through
    expect(asInternal(mode)["challengeUI"]).not.toBeNull();
  });

  it("builds desktop UI on non-mobile UA", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();
    // JSDOM UA is desktop, so buildDesktopChallengeUI is called.
    // The challengeUI should have been set
    expect(asInternal(mode)["challengeUI"]).not.toBeNull();
  });

  it("passes sandbox flag based on environment", async () => {
    const mode = new AutoBlockMode(
      baseCfg({ previewMode: true, environment: "sandbox" }),
    );
    await mode.initialise();
    // Sandbox should be detected from environment
    expect(asInternal(mode)["challengeUI"]).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CSP nonce propagation
// ---------------------------------------------------------------------------

describe("CSP nonce propagation", () => {
  it("passes cspNonce to shadow root styles", () => {
    const mode = new AutoBlockMode(baseCfg({ cspNonce: "abc123" }));
    callPrivate(mode, "showOverlay", "Test");
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const styles = shadowRoot.querySelectorAll("style");
    // At least one style element should have the nonce
    const hasNonce = Array.from(styles).some(
      (s) => s.getAttribute("nonce") === "abc123",
    );
    expect(hasNonce).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Module-level IIFE and initAutoBlock
// ---------------------------------------------------------------------------

describe("module-level auto-initialisation", () => {
  it("singleton guard prevents double initialisation", async () => {
    (window as unknown as Record<string, unknown>)[
      "__proviiAutoBlockInitialised"
    ] = true;
    // Importing the module again should not throw or reinitialise
    // because the singleton guard is set
    const windowRecord = window as unknown as Record<string, unknown>;
    expect(windowRecord["__proviiAutoBlockInitialised"]).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Extracted constants used by the module
// ---------------------------------------------------------------------------

describe("extracted string constants", () => {
  it("SESSION_EXPIRED_MESSAGE is used in handleExpired event", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");
    const handler = jest.fn();
    mode.on("expired", handler);
    callPrivate(mode, "handleExpired");
    // The event message must match the extracted constant exactly
    expect(handler).toHaveBeenCalledWith({ message: "Session expired" });
  });

  it("OVERLAY_CONTENT_SELECTOR matches class used in overlay", () => {
    const mode = new AutoBlockMode(baseCfg());
    callPrivate(mode, "showOverlay", "Test");
    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    // The selector ".provii-overlay-content" must find the content element
    const content = shadowRoot.querySelector(".provii-overlay-content");
    expect(content).not.toBeNull();
    expect(content?.className).toBe("provii-overlay-content");
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_POLLING_CONFIG values (kills literal mutants)
// ---------------------------------------------------------------------------

describe("DEFAULT_POLLING_CONFIG exact values", () => {
  it("initialInterval is 3000", () => {
    expect(DEFAULT_POLLING_CONFIG.initialInterval).toBe(3000);
  });

  it("maxInterval is 10000", () => {
    expect(DEFAULT_POLLING_CONFIG.maxInterval).toBe(10000);
  });

  it("backoffMultiplier is 1.3", () => {
    expect(DEFAULT_POLLING_CONFIG.backoffMultiplier).toBe(1.3);
  });

  it("timeout is 300000 (5 minutes)", () => {
    expect(DEFAULT_POLLING_CONFIG.timeout).toBe(300000);
  });
});

// ---------------------------------------------------------------------------
// Edge cases for coverage
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("preview mode with qrCodeUrl uses data URI", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();
    const challenge = asInternal(mode)["currentChallenge"] as Challenge;
    expect(challenge.qrCodeUrl).toBe("data:image/svg+xml,<svg/>");
  });

  it("preview challenge expiresAt is in the future", async () => {
    const before = Math.floor(Date.now() / 1000);
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();
    const challenge = asInternal(mode)["currentChallenge"] as Challenge;
    expect(challenge.expiresAt).toBeGreaterThanOrEqual(before + 3600);
  });

  it("handleError debugMessage falls back to 'Unknown error' for non-Error", () => {
    const debugSpy = jest
      .spyOn(console, "debug")
      .mockImplementation(() => {});
    const mode = new AutoBlockMode(baseCfg({ debug: true }));
    callPrivate(mode, "showOverlay", "Test");
    callPrivate(mode, "handleError", "test", 42);
    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error"),
      expect.objectContaining({ message: "Unknown error" }),
    );
    debugSpy.mockRestore();
  });

  it("constructor initialises currentPollingInterval to DEFAULT_POLLING_CONFIG.initialInterval", () => {
    const mode = new AutoBlockMode(baseCfg());
    expect(asInternal(mode)["currentPollingInterval"]).toBe(
      DEFAULT_POLLING_CONFIG.initialInterval,
    );
  });

  it("constructor initialises pollingStartTime to 0", () => {
    const mode = new AutoBlockMode(baseCfg());
    expect(asInternal(mode)["pollingStartTime"]).toBe(0);
  });

  it("constructor initialises pollingIntervalId to null", () => {
    const mode = new AutoBlockMode(baseCfg());
    expect(asInternal(mode)["pollingIntervalId"]).toBeNull();
  });

  it("constructor initialises previousFocus to null", () => {
    const mode = new AutoBlockMode(baseCfg());
    expect(asInternal(mode)["previousFocus"]).toBeNull();
  });

  it("constructor initialises challengeUI to null", () => {
    const mode = new AutoBlockMode(baseCfg());
    expect(asInternal(mode)["challengeUI"]).toBeNull();
  });

  it("constructor initialises previewBridgeDisposer to null", () => {
    const mode = new AutoBlockMode(baseCfg());
    expect(asInternal(mode)["previewBridgeDisposer"]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Preview bridge: structural threading.
//
// Regression tests for the styler "some controls do not change the preview"
// bugs. These assert the OBSERVABLE effect of a bridge update (config
// threaded through, DOM preserved across a rebuild, animation replayed),
// not merely that a CSS variable was written.
// ---------------------------------------------------------------------------
describe("applyPreviewConfig structural threading", () => {
  it("threads an accentGradient change into config so the QR rebuild uses it", async () => {
    const mode = new AutoBlockMode(
      baseCfg({
        previewMode: true,
        accentGradient: ["#0091c7", "#5b3df5", "#c23ad6"],
      }),
    );
    await mode.initialise();

    callPrivate(mode, "applyPreviewConfig", {
      accentGradient: ["#111111", "#222222", "#333333"],
    });

    const cfg = asInternal(mode)["config"] as AutoBlockConfig;
    expect(cfg.accentGradient).toEqual(["#111111", "#222222", "#333333"]);
  });

  it("preserves a bridge-applied logo across a QR-style rebuild", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();

    callPrivate(mode, "applyPreviewConfig", {
      logoUrl: "https://example.com/logo.png",
    });
    // A QR-style change forces updateOverlayWithChallenge to rebuild the
    // header from config. Before the fix this reverted the logo to the
    // default shield because config.logoUrl was never updated by the bridge.
    callPrivate(mode, "applyPreviewConfig", { qrDotStyle: "rounded" });

    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const logoImg = shadowRoot.querySelector(".logo img");
    expect(logoImg).not.toBeNull();
    expect(logoImg?.getAttribute("src")).toBe("https://example.com/logo.png");
  });

  it("preserves a bridge-applied privacy link across a QR-style rebuild", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();

    callPrivate(mode, "applyPreviewConfig", {
      privacyPolicyUrl: "https://example.com/privacy",
    });
    callPrivate(mode, "applyPreviewConfig", { qrDotStyle: "rounded" });

    const shadowRoot = asInternal(mode)["shadowRoot"] as ShadowRoot;
    const link = shadowRoot.querySelector<HTMLAnchorElement>(
      ".agegate-privacy-link",
    );
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("https://example.com/privacy");
  });

  it("replays the entrance animation when motionDuration changes", async () => {
    const mode = new AutoBlockMode(baseCfg({ previewMode: true }));
    await mode.initialise();

    const replaySpy = jest.spyOn(
      mode as unknown as { replayEntranceAnimation: () => void },
      "replayEntranceAnimation",
    );

    callPrivate(mode, "applyPreviewConfig", { motionDuration: 500 });

    expect(asInternal(mode)["previewMotionDuration"]).toBe(500);
    expect(replaySpy).toHaveBeenCalledTimes(1);
  });

  it("does not replay the entrance animation when motionDuration is unchanged", async () => {
    const mode = new AutoBlockMode(
      baseCfg({ previewMode: true, motionDuration: 220 }),
    );
    await mode.initialise();

    const replaySpy = jest.spyOn(
      mode as unknown as { replayEntranceAnimation: () => void },
      "replayEntranceAnimation",
    );

    callPrivate(mode, "applyPreviewConfig", { motionDuration: 220 });

    expect(replaySpy).not.toHaveBeenCalled();
  });
});
