/**
 * @jest-environment jsdom
 */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT
//
// Coverage tests for AgeGateMachine: adaptive polling interval calculation,
// timeout guards, and state transition edge cases.
// Tests the machine by interpreting it with XState and asserting on context
// values after specific event sequences.

import { createActor } from "xstate";
import { fromPromise } from "xstate/actors";
import { AgeGateMachine } from "../src/agegate/AgeGateMachine.js";
import type { AgeGateConfig } from "../src/agegate/AgeGateConfig.js";

// Minimal config stub that satisfies the machine's cfg type
const mockConfig = {
  publicKey: "pk_test_abc",
  mountElementId: "agegate-mount",
  contentUrl: "/content",
  theme: "light",
  environment: "sandbox",
  challengeUrl: "https://hosted.provii.app/v1/hosted/challenge",
  statusUrl: "https://hosted.provii.app/v1/hosted/status/{sid}",
  redeemMode: "direct",
  cspNonce: undefined,
} as unknown as AgeGateConfig;

describe("AgeGateMachine state transitions", () => {
  it("starts in idle state", () => {
    const actor = createActor(AgeGateMachine).start();
    expect(actor.getSnapshot().matches("idle")).toBe(true);
    actor.stop();
  });

  it("transitions from idle to fetching on FETCH event", () => {
    const machine = AgeGateMachine.provide({
      actors: {
        fetchChallenge: fromPromise(async () => {
          // Never resolve (we just want to test the transition to fetching)
          return new Promise(() => {});
        }),
      },
      actions: {
        renderSkeleton: () => {},
        renderChallenge: () => {},
        redirect: () => {},
        notifyTimeout: () => {},
        notifyFailure: () => {},
      },
    });

    const actor = createActor(machine).start();
    actor.send({ type: "FETCH", cfg: mockConfig });

    expect(actor.getSnapshot().matches("fetching")).toBe(true);

    // Verify context was populated
    const context = actor.getSnapshot().context;
    expect(context.cfg).toBe(mockConfig);
    expect(context.networkRetries).toBe(0);
    expect(context.negativeRetries).toBe(0);
    expect(context.totalAttempts).toBe(0);
    expect(context.isFirstPoll).toBe(true);
    expect(typeof context.pollingStartTime).toBe("number");

    actor.stop();
  });

  it("transitions to failed when fetchChallenge rejects", async () => {
    const machine = AgeGateMachine.provide({
      actors: {
        fetchChallenge: fromPromise(async () => {
          throw new Error("Network failure");
        }),
      },
      actions: {
        renderSkeleton: () => {},
        renderChallenge: () => {},
        redirect: () => {},
        notifyTimeout: () => {},
        notifyFailure: () => {},
      },
    });

    const actor = createActor(machine).start();

    const failedPromise = new Promise<void>((resolve) => {
      actor.subscribe((snap) => {
        if (snap.matches("failed")) resolve();
      });
    });

    actor.send({ type: "FETCH", cfg: mockConfig });
    await failedPromise;

    const snap = actor.getSnapshot();
    expect(snap.matches("failed")).toBe(true);
    expect(snap.context.lastErrorType).toBe("fatal");
    expect(snap.context.userMessage).toContain("verification service");

    actor.stop();
  });

  it("transitions from fetching to rendered on successful fetchChallenge", async () => {
    const mockChallengeResult = {
      challenge: { challenge_id: "ch_test", short_code: "ABC" },
      deepLink: "proviiwallet://verify?d=abc",
      pollingUrl: "https://api.provii.app/status/ch_test",
      qrPayload: { challenge_id: "ch_test" },
      wsUrl: undefined,
    };

    const machine = AgeGateMachine.provide({
      actors: {
        fetchChallenge: fromPromise(async () => mockChallengeResult),
        pollStatus: fromPromise(async () => ({ isValid: false, message: "pending" })),
      },
      actions: {
        renderSkeleton: () => {},
        renderChallenge: () => {},
        redirect: () => {},
        notifyTimeout: () => {},
        notifyFailure: () => {},
      },
    });

    const actor = createActor(machine).start();

    // Wait for the machine to reach waiting (rendered transitions always to waiting)
    const waitingPromise = new Promise<void>((resolve) => {
      actor.subscribe((snap) => {
        if (snap.matches("waiting") || snap.matches("polling")) resolve();
      });
    });

    actor.send({ type: "FETCH", cfg: mockConfig });
    await waitingPromise;

    // The machine goes rendered -> always -> waiting
    const snap = actor.getSnapshot();
    expect(
      snap.matches("waiting") || snap.matches("polling"),
    ).toBe(true);
    expect(snap.context.deepLink).toBe("proviiwallet://verify?d=abc");

    actor.stop();
  });
});

describe("AgeGateMachine USER_RETRY in failed state", () => {
  it("transitions from failed to fetching on USER_RETRY, resetting context", async () => {
    const fetchCallCount = { value: 0 };

    const machine = AgeGateMachine.provide({
      actors: {
        fetchChallenge: fromPromise(async () => {
          fetchCallCount.value++;
          if (fetchCallCount.value === 1) {
            throw new Error("First attempt fails");
          }
          return new Promise(() => {}); // Second attempt hangs
        }),
      },
      actions: {
        renderSkeleton: () => {},
        renderChallenge: () => {},
        redirect: () => {},
        notifyTimeout: () => {},
        notifyFailure: () => {},
      },
    });

    const actor = createActor(machine).start();

    // Wait for failed state
    const failedPromise = new Promise<void>((resolve) => {
      actor.subscribe((snap) => {
        if (snap.matches("failed")) resolve();
      });
    });

    actor.send({ type: "FETCH", cfg: mockConfig });
    await failedPromise;

    // Now send USER_RETRY
    actor.send({ type: "USER_RETRY" });

    const snap = actor.getSnapshot();
    expect(snap.matches("fetching")).toBe(true);
    expect(snap.context.networkRetries).toBe(0);
    expect(snap.context.negativeRetries).toBe(0);
    expect(snap.context.totalAttempts).toBe(0);
    expect(snap.context.error).toBeUndefined();
    expect(snap.context.userMessage).toBeUndefined();
    expect(snap.context.isFirstPoll).toBe(true);

    actor.stop();
  });
});
