/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.com"}
 */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT

/**
 * Tests for the explicit failure-mode policy (`onUnavailable`).
 *
 * The relying party must choose what happens when Provii cannot return a
 * verdict because it is unreachable. These tests pin the safety-critical
 * invariants:
 *   - an invalid choice throws;
 *   - an absent choice fails CLOSED (block) and is never a silent allow;
 *   - 'allow' only ever reveals content on a genuine AVAILABILITY failure,
 *     never on a real "underage"/"failed" verdict;
 *   - 'defer' hands control to the integrator while staying blocked.
 */

import { AgeGateConfig } from "../src/agegate/AgeGateConfig.js";
import type { AgeGateOptions } from "../src/agegate/AgeGateConfig.js";
import { AgeGate } from "../src/agegate/AgeGate.js";
import { parseConfig, ConfigError } from "../src/modes/config-parser.js";
import { AutoBlockMode } from "../src/modes/autoload.js";
import type { AutoBlockConfig } from "../src/core/types.js";
import type { GateContext } from "../src/agegate/AgeGateMachine.js";
import { cacheServerFailureMode } from "../src/core/failure-mode.js";

const LIVE_KEY = "pk_live_" + "a".repeat(64);
const TEST_KEY = "pk_test_" + "a".repeat(64);

function asInternal(o: object): Record<string, unknown> {
  return o as unknown as Record<string, unknown>;
}

function callPrivate<T>(o: object, method: string, ...args: unknown[]): T {
  const fn = asInternal(o)[method];
  if (typeof fn !== "function") throw new Error(`No such method: ${method}`);
  return (fn as (...a: unknown[]) => T).call(o, ...args);
}

function scriptTag(attrs: Record<string, string>): HTMLScriptElement {
  const el = document.createElement("script");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// ---------------------------------------------------------------------------
// AgeGateConfig (programmatic / manual mode)
// ---------------------------------------------------------------------------

describe("AgeGateConfig onUnavailable validation", () => {
  const base = {
    publicKey: LIVE_KEY,
    contentUrl: "/content",
    mountElementId: "gate",
  };

  it.each(["block", "allow", "defer"] as const)(
    "accepts and stores '%s'",
    (mode) => {
      const cfg = new AgeGateConfig({ ...base, onUnavailable: mode });
      expect(cfg.onUnavailable).toBe(mode);
    },
  );

  it("throws on an invalid value", () => {
    expect(
      () =>
        new AgeGateConfig({
          ...base,
          // @ts-expect-error deliberately invalid
          onUnavailable: "ignore",
        }),
    ).toThrow(/onUnavailable must be 'block', 'allow', or 'defer'/);
  });

  it("throws when the handler is not a function", () => {
    expect(
      () =>
        new AgeGateConfig({
          ...base,
          onUnavailable: "defer",
          // @ts-expect-error deliberately invalid
          onUnavailableHandler: "nope",
        }),
    ).toThrow(/onUnavailableHandler must be a function/);
  });

  it("leaves onUnavailable undefined when omitted (resolved to block later)", () => {
    const cfg = new AgeGateConfig(base);
    expect(cfg.onUnavailable).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AgeGate.applyUnavailablePolicy (the manual-mode decision)
// ---------------------------------------------------------------------------

describe("AgeGate.applyUnavailablePolicy", () => {
  function makeGate(
    opts: Partial<AgeGateOptions> = {},
    redirect = jest.fn(),
  ): { gate: AgeGate; redirect: jest.Mock } {
    const gate = new AgeGate(
      {
        publicKey: LIVE_KEY,
        contentUrl: "/content",
        mountElementId: "gate",
        ...opts,
      },
      redirect as unknown as (url: string) => void,
    );
    return { gate, redirect: redirect as jest.Mock };
  }

  const unavailable = { serviceUnavailable: true } as GateContext;
  const genuine = { serviceUnavailable: false } as GateContext;

  afterEach(() => jest.restoreAllMocks());

  it("does NOT fail open on a genuine verdict (serviceUnavailable=false)", () => {
    const { gate, redirect } = makeGate({ onUnavailable: "allow" });
    const handled = callPrivate<boolean>(
      gate,
      "applyUnavailablePolicy",
      genuine,
      "rejected",
    );
    expect(handled).toBe(false);
    expect(redirect).not.toHaveBeenCalled();
    gate.dispose();
  });

  it("'allow' reveals content on a real availability failure", () => {
    const { gate, redirect } = makeGate({ onUnavailable: "allow" });
    const handled = callPrivate<boolean>(
      gate,
      "applyUnavailablePolicy",
      unavailable,
      "verifier_unreachable",
    );
    expect(handled).toBe(true);
    expect(redirect).toHaveBeenCalledWith("https://example.com/content");
    gate.dispose();
  });

  it("'block' keeps the gate closed (no redirect)", () => {
    const { gate, redirect } = makeGate({ onUnavailable: "block" });
    const handled = callPrivate<boolean>(
      gate,
      "applyUnavailablePolicy",
      unavailable,
      "verifier_unreachable",
    );
    expect(handled).toBe(false);
    expect(redirect).not.toHaveBeenCalled();
    gate.dispose();
  });

  it("'defer' invokes the handler and stays blocked", () => {
    const handler = jest.fn();
    const { gate, redirect } = makeGate({
      onUnavailable: "defer",
      onUnavailableHandler: handler,
    });
    const handled = callPrivate<boolean>(
      gate,
      "applyUnavailablePolicy",
      unavailable,
      "verifier_unreachable",
    );
    expect(handled).toBe(false); // stays blocked
    expect(redirect).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "verifier_unreachable" }),
    );
    gate.dispose();
  });

  it("unset fails CLOSED and logs an error (never a silent allow)", () => {
    const err = jest.spyOn(console, "error").mockImplementation(() => {});
    const { gate, redirect } = makeGate(); // no onUnavailable
    const handled = callPrivate<boolean>(
      gate,
      "applyUnavailablePolicy",
      unavailable,
      "verifier_unreachable",
    );
    expect(handled).toBe(false);
    expect(redirect).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalledWith(
      expect.stringContaining("onUnavailable is not set"),
    );
    gate.dispose();
  });
});

// ---------------------------------------------------------------------------
// config-parser (autoload / script-tag mode)
// ---------------------------------------------------------------------------

describe("parseConfig data-on-unavailable", () => {
  it.each(["block", "allow", "defer"])("parses '%s'", (mode) => {
    const cfg = parseConfig(
      scriptTag({ "data-public-key": TEST_KEY, "data-on-unavailable": mode }),
    );
    expect(cfg.onUnavailable).toBe(mode);
  });

  it("throws ConfigError on an invalid value", () => {
    expect(() =>
      parseConfig(
        scriptTag({
          "data-public-key": TEST_KEY,
          "data-on-unavailable": "sometimes",
        }),
      ),
    ).toThrow(ConfigError);
  });

  it("leaves onUnavailable undefined when the attribute is absent", () => {
    const cfg = parseConfig(scriptTag({ "data-public-key": TEST_KEY }));
    expect(cfg.onUnavailable).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AutoBlockMode.handleUnavailable (the autoload decision)
// ---------------------------------------------------------------------------

describe("AutoBlockMode.handleUnavailable", () => {
  function makeMode(override: Partial<AutoBlockConfig> = {}): AutoBlockMode {
    return new AutoBlockMode({
      publicKey: TEST_KEY,
      environment: "sandbox",
      ...override,
    });
  }

  function capture(mode: AutoBlockMode): {
    unavailable: unknown[];
    error: unknown[];
    verified: unknown[];
  } {
    const events = { unavailable: [], error: [], verified: [] } as {
      unavailable: unknown[];
      error: unknown[];
      verified: unknown[];
    };
    mode.on("unavailable", (d) => events.unavailable.push(d));
    mode.on("error", (d) => events.error.push(d));
    mode.on("verified", (d) => events.verified.push(d));
    return events;
  }

  afterEach(() => jest.restoreAllMocks());

  it("'allow' emits unavailable(allow) and does NOT emit a blocking error", () => {
    const mode = makeMode({ onUnavailable: "allow" });
    const hide = jest
      .spyOn(mode as unknown as { hideOverlay: () => void }, "hideOverlay")
      .mockImplementation(() => {});
    const events = capture(mode);
    callPrivate(mode, "handleUnavailable", "verification_failed", new Error("x"));
    expect(events.unavailable).toEqual([
      expect.objectContaining({ action: "allow", reason: "verification_failed" }),
    ]);
    expect(events.error).toHaveLength(0);
    expect(hide).toHaveBeenCalled();
  });

  it("'block' emits unavailable(block) AND the legacy error event", () => {
    const mode = makeMode({ onUnavailable: "block" });
    const events = capture(mode);
    callPrivate(mode, "handleUnavailable", "verification_failed", new Error("x"));
    expect(events.unavailable).toEqual([
      expect.objectContaining({ action: "block" }),
    ]);
    expect(events.error).toEqual([
      expect.objectContaining({ code: "verification_failed" }),
    ]);
  });

  it("'defer' emits unavailable(defer) and no legacy error", () => {
    const mode = makeMode({ onUnavailable: "defer" });
    const events = capture(mode);
    callPrivate(mode, "handleUnavailable", "polling_circuit_breaker", new Error("x"));
    expect(events.unavailable).toEqual([
      expect.objectContaining({ action: "defer" }),
    ]);
    expect(events.error).toHaveLength(0);
  });

  it("unset fails closed: logs error, emits unavailable(block) + legacy error", () => {
    const err = jest.spyOn(console, "error").mockImplementation(() => {});
    const mode = makeMode(); // no onUnavailable
    const events = capture(mode);
    callPrivate(mode, "handleUnavailable", "initialization_failed", new Error("x"));
    expect(err).toHaveBeenCalledWith(
      expect.stringContaining("data-on-unavailable"),
    );
    expect(events.unavailable).toEqual([
      expect.objectContaining({ action: "block" }),
    ]);
    expect(events.error).toEqual([
      expect.objectContaining({ code: "initialization_failed" }),
    ]);
  });
});

// ---------------------------------------------------------------------------
// Server-side failure-mode policy wiring
//
// The mode can now also come from the origin's server policy, delivered in
// the challenge response and cached so it survives an outage. These pin that
// the SDK actually CONSULTS the server value + cache via resolveFailureMode,
// with the documented precedence (locked server > attribute > server/cache >
// block).
// ---------------------------------------------------------------------------

describe("server-side failure-mode policy wiring", () => {
  afterEach(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    jest.restoreAllMocks();
  });

  // --- AutoBlockMode (autoload) ---

  function makeMode(override: Partial<AutoBlockConfig> = {}): AutoBlockMode {
    return new AutoBlockMode({
      publicKey: TEST_KEY,
      environment: "sandbox",
      ...override,
    });
  }

  function captureUnavailable(mode: AutoBlockMode): unknown[] {
    const out: unknown[] = [];
    mode.on("unavailable", (d) => out.push(d));
    return out;
  }

  it("autoload: a LOCKED server mode overrides the integrator attribute", () => {
    const mode = makeMode({ onUnavailable: "block" });
    asInternal(mode)["currentChallenge"] = {
      failureMode: "allow",
      failureModeLocked: true,
    };
    const hide = jest
      .spyOn(mode as unknown as { hideOverlay: () => void }, "hideOverlay")
      .mockImplementation(() => {});
    const events = captureUnavailable(mode);
    callPrivate(mode, "handleUnavailable", "verification_failed", new Error("x"));
    expect(events).toEqual([expect.objectContaining({ action: "allow" })]);
    expect(hide).toHaveBeenCalled();
  });

  it("autoload: an UNLOCKED server mode applies when no attribute is set", () => {
    const mode = makeMode(); // no onUnavailable
    asInternal(mode)["currentChallenge"] = {
      failureMode: "defer",
      failureModeLocked: false,
    };
    const events = captureUnavailable(mode);
    callPrivate(mode, "handleUnavailable", "verification_failed", new Error("x"));
    expect(events).toEqual([expect.objectContaining({ action: "defer" })]);
  });

  it("autoload: the integrator attribute wins over an UNLOCKED server mode", () => {
    const mode = makeMode({ onUnavailable: "block" });
    asInternal(mode)["currentChallenge"] = {
      failureMode: "allow",
      failureModeLocked: false,
    };
    const events = captureUnavailable(mode);
    callPrivate(mode, "handleUnavailable", "verification_failed", new Error("x"));
    expect(events).toEqual([expect.objectContaining({ action: "block" })]);
  });

  it("autoload: the CACHED server mode applies during an outage (no live challenge, no attribute) and suppresses the nag", () => {
    cacheServerFailureMode(TEST_KEY, "allow");
    const mode = makeMode(); // no onUnavailable, no currentChallenge
    const err = jest.spyOn(console, "error").mockImplementation(() => {});
    const hide = jest
      .spyOn(mode as unknown as { hideOverlay: () => void }, "hideOverlay")
      .mockImplementation(() => {});
    const events = captureUnavailable(mode);
    callPrivate(mode, "handleUnavailable", "initialization_failed", new Error("x"));
    expect(events).toEqual([expect.objectContaining({ action: "allow" })]);
    expect(hide).toHaveBeenCalled();
    expect(err).not.toHaveBeenCalled();
  });

  // --- AgeGate (manual mode) ---

  function makeGate(
    opts: Partial<AgeGateOptions> = {},
    redirect = jest.fn(),
  ): { gate: AgeGate; redirect: jest.Mock } {
    const gate = new AgeGate(
      {
        publicKey: LIVE_KEY,
        contentUrl: "/content",
        mountElementId: "gate",
        ...opts,
      },
      redirect as unknown as (url: string) => void,
    );
    return { gate, redirect: redirect as jest.Mock };
  }

  it("manual: a LOCKED server mode in the challenge overrides the attribute", () => {
    const { gate, redirect } = makeGate({ onUnavailable: "block" });
    const ctx = {
      serviceUnavailable: true,
      challenge: { failure_mode: "allow", failure_mode_locked: true },
    } as unknown as GateContext;
    const handled = callPrivate<boolean>(
      gate,
      "applyUnavailablePolicy",
      ctx,
      "verifier_unreachable",
    );
    expect(handled).toBe(true); // 'allow' revealed content
    expect(redirect).toHaveBeenCalledWith("https://example.com/content");
    gate.dispose();
  });

  it("manual: the CACHED server mode applies when the challenge is absent (outage)", () => {
    cacheServerFailureMode(LIVE_KEY, "allow");
    const err = jest.spyOn(console, "error").mockImplementation(() => {});
    const { gate, redirect } = makeGate(); // no onUnavailable
    const ctx = { serviceUnavailable: true } as GateContext;
    const handled = callPrivate<boolean>(
      gate,
      "applyUnavailablePolicy",
      ctx,
      "verifier_unreachable",
    );
    expect(handled).toBe(true);
    expect(redirect).toHaveBeenCalledWith("https://example.com/content");
    expect(err).not.toHaveBeenCalled();
    gate.dispose();
  });
});
