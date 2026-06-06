/**
 * AgeGate.edge.spec.ts
 *
 * Edge case tests for AgeGate class
 */

import { jest } from "@jest/globals";
import { fromPromise } from "xstate/actors";
import { createActor } from "xstate";
import { AgeGate } from "../src/agegate/AgeGate.js";
import { AgeGateMachine } from "../src/agegate/AgeGateMachine.js";
import { AgeGateConfig } from "../src/agegate/AgeGateConfig.js";
import {
  machineServices,
  machineActions,
} from "../src/agegate/machineServices.js";
import type { CreateChallengeResponse } from "../src/api/v1.js";

// Mock the entire xstate module to control state machine behavior
jest.mock("xstate", () => {
  const actual = jest.requireActual("xstate") as any;
  return {
    ...(actual as object),
    createActor: jest.fn(),
  };
});

const mockCreateActor = createActor as jest.MockedFunction<typeof createActor>;

/* ------------------------------------------------------------------ */
/* Test setup helpers                                                 */
/* ------------------------------------------------------------------ */

// Test public key matching the required format: pk_test_<64 hex chars>
const TEST_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const mkCfg = () =>
  new AgeGateConfig({
    publicKey: TEST_PUBLIC_KEY,
    environment: "sandbox" as const,
    challengeUrl: "https://api.example.com/age/challenge",
    statusUrl: "https://api.example.com/age/status/{sid}",
    contentUrl: "/content",
    mountElementId: "age-gate-mount",
    pollInterval: 1000,
  });

const createMockChallenge = (): CreateChallengeResponse =>
  ({
    challenge_id: "00000000-0000-4000-8000-000000000000",
    rp_challenge: "n".repeat(43),
    cutoff_days: 6570,
    verifying_key_id: 1,
    submit_secret: "s".repeat(43),
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    status_url:
      "https://api.example.com/age/status/00000000-0000-4000-8000-000000000000",
    verify_url: "https://api.example.com/age/verify",
  }) as CreateChallengeResponse;

// Helper to create a mock actor that transitions to specific states
const createMockActor = (finalState: "rendered" | "failed", error?: Error) => {
  let subscriber: ((snapshot: any) => void) | null = null;

  return {
    start: jest.fn().mockReturnThis(),
    subscribe: jest.fn((callback: (snapshot: any) => void) => {
      subscriber = callback;
      return {
        unsubscribe: jest.fn(),
      };
    }),
    send: jest.fn((event: any) => {
      if (event && typeof event === "object" && event.type === "FETCH") {
        // Simulate async state transition
        setTimeout(() => {
          if (subscriber) {
            if (finalState === "rendered") {
              subscriber({
                matches: (state: string) => state === "rendered",
                context: {},
              });
            } else if (finalState === "failed") {
              subscriber({
                matches: (state: string) => state === "failed",
                context: { error: error || new Error("Test error") },
              });
            }
          }
        }, 10);
      }
    }),
  };
};

/* ------------------------------------------------------------------ */
/* Edge case tests                                                    */
/* ------------------------------------------------------------------ */

// Mock fetch globally so session check resolves instantly (prevents unhandled rejections)
const mockFetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ verified: false }),
  } as Response),
);

beforeEach(() => {
  (globalThis as any).fetch = mockFetch;
});

describe("AgeGate – graceful when mount element is missing", () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = "";

    // Set up window.location for tests
    delete (window as any).location;
    (window as any).location = {
      origin: "http://localhost",
      href: "http://localhost/",
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (globalThis as any).fetch = mockFetch;
  });

  it("resolves without error", async () => {
    // Mock getElementById to return null (mount element not found)
    jest.spyOn(document, "getElementById").mockReturnValue(null);

    // Mock console.warn to capture the warning
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    // Mock the actor to transition to 'rendered' state even when mount is missing
    const mockActor = createMockActor("rendered");
    mockCreateActor.mockReturnValue(mockActor as any);

    const ageGate = new AgeGate(mkCfg());

    // This should resolve even when mount element is missing
    await expect(ageGate.init()).resolves.toBeUndefined();

    // Verify the actor was created and started
    expect(mockCreateActor).toHaveBeenCalled();
    expect(mockActor.start).toHaveBeenCalled();
    expect(mockActor.send).toHaveBeenCalledWith({
      type: "FETCH",
      cfg: expect.any(AgeGateConfig),
    });
  }, 15000);
});

/* ------------------------------------------------------------------ */

describe("AgeGate.init idempotency", () => {
  beforeEach(() => {
    // Reset DOM and add mount element
    document.body.innerHTML = '<div id="age-gate-mount"></div>';

    // Set up window.location for tests
    delete (window as any).location;
    (window as any).location = {
      origin: "http://localhost",
      href: "http://localhost/",
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (globalThis as any).fetch = mockFetch;
  });

  it("returns the same promise on repeated calls", async () => {
    // Mock the actor to transition to 'rendered' state
    const mockActor = createMockActor("rendered");
    mockCreateActor.mockReturnValue(mockActor as any);

    const ageGate = new AgeGate(mkCfg());

    const promise1 = ageGate.init();
    const promise2 = ageGate.init();

    // Should be the same promise object
    expect(promise1).toBe(promise2);

    // Both should resolve
    await expect(promise1).resolves.toBeUndefined();
    await expect(promise2).resolves.toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */

describe("Verification timeout guard", () => {
  beforeEach(() => {
    // Add mount element
    document.body.innerHTML = '<div id="age-gate-mount"></div>';

    // Set up window.location for tests
    delete (window as any).location;
    (window as any).location = {
      origin: "http://localhost",
      href: "http://localhost/",
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (globalThis as any).fetch = mockFetch;
  });

  it("still not verified after simulated 1 s", async () => {
    // Mock an actor that never transitions to terminal states
    const mockActor = {
      start: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback: (snapshot: any) => void) => ({
        unsubscribe: jest.fn(),
      })),
      send: jest.fn(),
    };

    mockCreateActor.mockReturnValue(mockActor as any);

    const ageGate = new AgeGate(mkCfg());
    const initPromise = ageGate.init();

    // Promise should still be pending (never resolves)
    const raceResult = await Promise.race([
      initPromise.then(() => "resolved"),
      new Promise((resolve) => setTimeout(() => resolve("still-pending"), 100)),
    ]);

    expect(raceResult).toBe("still-pending");
  });
});

/* ------------------------------------------------------------------ */

describe("AgeGate.init rejection on poll error", () => {
  beforeEach(() => {
    // Add mount element
    document.body.innerHTML = '<div id="age-gate-mount"></div>';

    // Set up window.location for tests
    delete (window as any).location;
    (window as any).location = {
      origin: "http://localhost",
      href: "http://localhost/",
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (globalThis as any).fetch = mockFetch;
  });

  it("rejects with the underlying error", async () => {
    const testError = new Error("Poll service unavailable");

    // Mock the actor to transition to 'failed' state with our error
    const mockActor = createMockActor("failed", testError);
    mockCreateActor.mockReturnValue(mockActor as any);

    const ageGate = new AgeGate(mkCfg());

    // The init should reject with our test error
    await expect(ageGate.init()).rejects.toThrow("Poll service unavailable");
  }, 10000);
});
