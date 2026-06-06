/**
 * @jest-environment jsdom
 */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT
//
// Coverage tests for machineServices exported helpers:
// resetMachineContext, attachVisibilityFallback, wasWsConnected.
// Also covers the isValidTransition export from AgeGateMachine.

import {
  resetMachineContext,
  attachVisibilityFallback,
  wasWsConnected,
} from "../src/agegate/machineServices.js";
import { isValidTransition } from "../src/agegate/AgeGateMachine.js";

// ---------------------------------------------------------------------------
// isValidTransition
// ---------------------------------------------------------------------------

describe("isValidTransition", () => {
  it("returns true for FETCH in idle state", () => {
    expect(isValidTransition("idle", "FETCH")).toBe(true);
  });

  it("returns false for FETCH in fetching state (no external events)", () => {
    expect(isValidTransition("fetching", "FETCH")).toBe(false);
  });

  it("returns true for USER_RETRY in polling state", () => {
    expect(isValidTransition("polling", "USER_RETRY")).toBe(true);
  });

  it("returns true for USER_RETRY in waiting state", () => {
    expect(isValidTransition("waiting", "USER_RETRY")).toBe(true);
  });

  it("returns true for USER_RETRY in timeout state", () => {
    expect(isValidTransition("timeout", "USER_RETRY")).toBe(true);
  });

  it("returns true for USER_RETRY in failed state", () => {
    expect(isValidTransition("failed", "USER_RETRY")).toBe(true);
  });

  it("returns false for any event in verified state (final)", () => {
    expect(isValidTransition("verified", "USER_RETRY")).toBe(false);
    expect(isValidTransition("verified", "FETCH")).toBe(false);
  });

  it("returns false for any event in rendered state (always-transition)", () => {
    expect(isValidTransition("rendered", "FETCH")).toBe(false);
  });

  it("returns false for unknown state names", () => {
    expect(isValidTransition("nonexistent_state", "FETCH")).toBe(false);
  });

  it("returns false for unknown event types in known states", () => {
    expect(isValidTransition("idle", "UNKNOWN_EVENT")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resetMachineContext
// ---------------------------------------------------------------------------

describe("resetMachineContext", () => {
  it("does not throw when called with no prior state", () => {
    expect(() => resetMachineContext()).not.toThrow();
  });

  it("can be called multiple times without error", () => {
    resetMachineContext();
    resetMachineContext();
    resetMachineContext();
    expect(wasWsConnected()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// wasWsConnected
// ---------------------------------------------------------------------------

describe("wasWsConnected", () => {
  it("returns false after a fresh reset", () => {
    resetMachineContext();
    expect(wasWsConnected()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// attachVisibilityFallback
// ---------------------------------------------------------------------------

describe("attachVisibilityFallback", () => {
  it("returns a cleanup function", () => {
    const cleanup = attachVisibilityFallback();
    expect(typeof cleanup).toBe("function");
    cleanup();
  });

  it("cleanup can be called multiple times safely", () => {
    const cleanup = attachVisibilityFallback();
    cleanup();
    expect(() => cleanup()).not.toThrow();
  });

  it("attaches a visibilitychange listener to document", () => {
    const addSpy = jest.spyOn(document, "addEventListener");
    const cleanup = attachVisibilityFallback();

    expect(addSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));

    cleanup();
    addSpy.mockRestore();
  });

  it("removes the visibilitychange listener on cleanup", () => {
    const removeSpy = jest.spyOn(document, "removeEventListener");
    const cleanup = attachVisibilityFallback();
    cleanup();

    expect(removeSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    removeSpy.mockRestore();
  });
});
