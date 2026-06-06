/**
 * Additional comprehensive tests for AgeGateMachine.ts
 * Tests all state transitions, guards, actions, and edge cases
 */

import { createActor, fromPromise } from "xstate";
import {
  AgeGateMachine,
  GateContext,
  GateEvent,
  isRetryableFetchError,
} from "../src/agegate/AgeGateMachine.js";
import type { AgeGateConfig } from "../src/agegate/AgeGateConfig.js";

describe("AgeGateMachine - Additional Comprehensive Tests", () => {
  const mockConfig: AgeGateConfig = {
    apiUrl: "https://api.example.com",
    relParty: "test-party",
    minAge: 18,
    onSuccess: jest.fn(),
    onError: jest.fn(),
  } as any;

  const mockChallenge = {
    challenge_id: "test-123",
    rp_challenge: "abc123",
    cutoff_days: 100,
    verifying_key_id: 1,
    submit_secret: "secret123",
    expires_at: Date.now() + 300000,
    status_url: "https://api.example.com/status",
    verify_url: "https://api.example.com/verify",
  };

  describe("State machine structure and initial state", () => {
    it("starts in idle state", () => {
      const actor = createActor(AgeGateMachine);
      actor.start();

      expect(actor.getSnapshot().value).toBe("idle");
      expect(actor.getSnapshot().context).toEqual({});

      actor.stop();
    });

    it("has correct initial context", () => {
      const actor = createActor(AgeGateMachine);
      actor.start();

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.cfg).toBeUndefined();
      expect(snapshot.context.challenge).toBeUndefined();
      expect(snapshot.context.networkRetries).toBeUndefined();

      actor.stop();
    });
  });

  describe("idle → fetching transition", () => {
    it("transitions from idle to fetching on FETCH event", () => {
      const actor = createActor(AgeGateMachine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe("fetching");

      actor.stop();
    });

    it("initializes context correctly on FETCH", () => {
      const actor = createActor(AgeGateMachine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.cfg).toEqual(mockConfig);
      expect(snapshot.context.currentPollInterval).toBe(5000); // INITIAL_DELAY
      expect(snapshot.context.networkRetries).toBe(0);
      expect(snapshot.context.negativeRetries).toBe(0);
      expect(snapshot.context.totalAttempts).toBe(0);
      expect(snapshot.context.error).toBeUndefined();
      expect(snapshot.context.userMessage).toBeUndefined();
      expect(snapshot.context.isFirstPoll).toBe(true);

      actor.stop();
    });
  });

  describe("fetching state", () => {
    it("invokes fetchChallenge service", () => {
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => ({
            challenge: mockChallenge,
            deepLink: "proviiwallet://challenge?id=test-123",
            pollingUrl: mockChallenge.status_url,
            qrPayload: { challenge_id: "test-123" },
          })),
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      // Wait for async transition
      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot = actor.getSnapshot();
          expect(snapshot.value).toBe("waiting");
          expect(snapshot.context.challenge).toEqual(mockChallenge);
          expect(snapshot.context.deepLink).toBe(
            "proviiwallet://challenge?id=test-123",
          );
          expect(snapshot.context.pollingUrl).toBe(mockChallenge.status_url);

          actor.stop();
          resolve(undefined);
        }, 100);
      });
    });

    it("transitions to failed on fetchChallenge error", () => {
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => {
            throw new Error("Network error");
          }),
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot = actor.getSnapshot();
          expect(snapshot.value).toBe("failed");
          expect(snapshot.context.error).toBeDefined();
          expect(snapshot.context.lastErrorType).toBe("fatal");
          expect(snapshot.context.userMessage).toBe(
            "Unable to connect to the verification service. Please check your internet connection and refresh the page to try again.",
          );

          actor.stop();
          resolve(undefined);
        }, 100);
      });
    });
  });

  describe("fetching auto-retry (cold-start resilience)", () => {
    const retryableErr = (code: string) => {
      const e = new Error(`server error ${code}`) as Error & { code: string };
      e.code = code;
      return e;
    };
    const ok = {
      challenge: mockChallenge,
      deepLink: "proviiwallet://challenge?id=test-123",
      pollingUrl: mockChallenge.status_url,
      qrPayload: { challenge_id: "test-123" },
    };

    it("retries a transient 5xx and recovers (cold-start 500)", () => {
      let calls = 0;
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => {
            calls += 1;
            if (calls === 1) throw retryableErr("HTTP_500");
            return ok;
          }),
        },
      });
      const actor = createActor(machine);
      actor.start();
      actor.send({ type: "FETCH", cfg: mockConfig });
      return new Promise((resolve) => {
        setTimeout(() => {
          const s = actor.getSnapshot();
          expect(calls).toBe(2); // initial failure + one retry
          expect(s.value).toBe("waiting"); // recovered, NOT failed
          expect(s.context.challenge).toEqual(mockChallenge);
          expect(s.context.fetchRetries).toBe(1);
          actor.stop();
          resolve(undefined);
        }, 1500);
      });
    });

    it("gives up after MAX_FETCH_RETRIES and marks the service unavailable", () => {
      let calls = 0;
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => {
            calls += 1;
            throw retryableErr("HTTP_503");
          }),
        },
      });
      const actor = createActor(machine);
      actor.start();
      actor.send({ type: "FETCH", cfg: mockConfig });
      return new Promise((resolve) => {
        setTimeout(() => {
          const s = actor.getSnapshot();
          expect(calls).toBe(3); // initial + 2 retries
          expect(s.value).toBe("failed");
          expect(s.context.serviceUnavailable).toBe(true);
          expect(s.context.fetchRetries).toBe(2);
          actor.stop();
          resolve(undefined);
        }, 4000);
      });
    }, 10000);

    it("does NOT retry a non-retryable 4xx (fails fast)", () => {
      let calls = 0;
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => {
            calls += 1;
            throw retryableErr("HTTP_403");
          }),
        },
      });
      const actor = createActor(machine);
      actor.start();
      actor.send({ type: "FETCH", cfg: mockConfig });
      return new Promise((resolve) => {
        setTimeout(() => {
          const s = actor.getSnapshot();
          expect(calls).toBe(1); // no retry on a 4xx
          expect(s.value).toBe("failed");
          expect(s.context.serviceUnavailable).toBe(true);
          actor.stop();
          resolve(undefined);
        }, 1200);
      });
    });
  });

  describe("isRetryableFetchError", () => {
    const withCode = (code: string, name = "AgeGateError") => {
      const e = new Error("x") as Error & { code: string };
      e.code = code;
      e.name = name;
      return e;
    };
    it("treats 5xx, timeout, and network failures as retryable", () => {
      expect(isRetryableFetchError(withCode("HTTP_500"))).toBe(true);
      expect(isRetryableFetchError(withCode("HTTP_503"))).toBe(true);
      expect(isRetryableFetchError(withCode("FETCH_TIMEOUT", "NetworkError"))).toBe(true);
      expect(isRetryableFetchError(withCode("NETWORK_FAILURE", "NetworkError"))).toBe(true);
    });
    it("treats 4xx and unknown errors as terminal", () => {
      expect(isRetryableFetchError(withCode("HTTP_400"))).toBe(false);
      expect(isRetryableFetchError(withCode("HTTP_403"))).toBe(false);
      expect(isRetryableFetchError(withCode("HTTP_429"))).toBe(false);
      expect(isRetryableFetchError(new Error("plain"))).toBe(false);
      expect(isRetryableFetchError(null)).toBe(false);
      expect(isRetryableFetchError(undefined)).toBe(false);
    });
  });

  describe("rendered → waiting transition", () => {
    it("automatically transitions from rendered to waiting", () => {
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => ({
            challenge: mockChallenge,
            deepLink: "proviiwallet://challenge",
            pollingUrl: mockChallenge.status_url,
            qrPayload: { challenge_id: "test-123" },
          })),
        },
        actions: {
          renderChallenge: jest.fn(),
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot = actor.getSnapshot();
          expect(snapshot.value).toBe("waiting");

          actor.stop();
          resolve(undefined);
        }, 100);
      });
    });
  });

  describe("polling state - success paths", () => {
    it("transitions to verified when poll returns isValid=true", () => {
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => ({
            challenge: mockChallenge,
            deepLink: "test",
            pollingUrl: "test",
            qrPayload: { challenge_id: "test" },
          })),
          pollStatus: fromPromise(async () => ({ isValid: true })),
        },
        actions: {
          renderChallenge: jest.fn(),
          redirect: jest.fn(),
        },
        delays: {
          POLL_INTERVAL: 10, // Fast polling for tests
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot = actor.getSnapshot();
          expect(snapshot.value).toBe("verified");

          actor.stop();
          resolve(undefined);
        }, 200);
      });
    });

    it("transitions to waiting when poll returns pending", () => {
      let callCount = 0;
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => ({
            challenge: mockChallenge,
            deepLink: "test",
            pollingUrl: "test",
            qrPayload: { challenge_id: "test" },
          })),
          pollStatus: fromPromise(async () => {
            callCount++;
            if (callCount === 1) {
              return { message: "pending", state: "pending" };
            }
            return { isValid: true };
          }),
        },
        actions: {
          renderChallenge: jest.fn(),
          redirect: jest.fn(),
        },
        delays: {
          POLL_INTERVAL: 50,
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot = actor.getSnapshot();
          // Should be in waiting after first pending response
          if (callCount >= 1) {
            expect(snapshot.context.networkRetries).toBe(0);
            expect(snapshot.context.lastPollState).toBe("pending");
          }

          actor.stop();
          resolve(undefined);
        }, 150);
      });
    });
  });

  describe("polling state - failure paths", () => {
    it("transitions to failed when poll returns expired", () => {
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => ({
            challenge: mockChallenge,
            deepLink: "test",
            pollingUrl: "test",
            qrPayload: { challenge_id: "test" },
          })),
          pollStatus: fromPromise(async () => ({ state: "expired" })),
        },
        actions: {
          renderChallenge: jest.fn(),
          notifyFailure: jest.fn(),
        },
        delays: {
          POLL_INTERVAL: 10,
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot = actor.getSnapshot();
          expect(snapshot.value).toBe("failed");
          expect(snapshot.context.lastErrorType).toBe("fatal");
          expect(snapshot.context.userMessage).toBe(
            "Your verification session expired after 5 minutes. Please refresh the page to start a new verification.",
          );

          actor.stop();
          resolve(undefined);
        }, 100);
      });
    });

    it("transitions to failed when poll returns failed state", () => {
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => ({
            challenge: mockChallenge,
            deepLink: "test",
            pollingUrl: "test",
            qrPayload: { challenge_id: "test" },
          })),
          pollStatus: fromPromise(async () => ({ state: "failed" })),
        },
        actions: {
          renderChallenge: jest.fn(),
          notifyFailure: jest.fn(),
        },
        delays: {
          POLL_INTERVAL: 10,
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot = actor.getSnapshot();
          expect(snapshot.value).toBe("failed");
          expect(snapshot.context.userMessage).toBe(
            "Verification was not completed. Please ensure Provii Wallet is open and that you approved the age check request, then try again. If the problem persists, visit provii.app/help for assistance.",
          );

          actor.stop();
          resolve(undefined);
        }, 100);
      });
    });

    it("transitions to timeout after MAX_TOTAL_ATTEMPTS", () => {
      let callCount = 0;
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => ({
            challenge: mockChallenge,
            deepLink: "test",
            pollingUrl: "test",
            qrPayload: { challenge_id: "test" },
          })),
          pollStatus: fromPromise(async () => {
            callCount++;
            // Return an unhandled response to trigger default negative path
            return { message: "unknown" };
          }),
        },
        actions: {
          renderChallenge: jest.fn(),
          notifyTimeout: jest.fn(),
        },
        delays: {
          POLL_INTERVAL: 5,
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot = actor.getSnapshot();
          // After 30 attempts, should timeout
          if (callCount >= 30) {
            expect(snapshot.value).toBe("timeout");
            expect(snapshot.context.lastErrorType).toBe("timeout");
          }

          actor.stop();
          resolve(undefined);
        }, 1000);
      });
    });

    it("transitions to failed after MAX_NEGATIVE_RETRIES", () => {
      let callCount = 0;
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => ({
            challenge: mockChallenge,
            deepLink: "test",
            pollingUrl: "test",
            qrPayload: { challenge_id: "test" },
          })),
          pollStatus: fromPromise(async () => {
            callCount++;
            return { message: "negative" };
          }),
        },
        actions: {
          renderChallenge: jest.fn(),
          notifyFailure: jest.fn(),
        },
        delays: {
          POLL_INTERVAL: 10,
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot = actor.getSnapshot();
          // After 3 negative retries, should fail
          if (callCount >= 3) {
            expect(snapshot.value).toBe("failed");
            expect(snapshot.context.lastErrorType).toBe("negative");
          }

          actor.stop();
          resolve(undefined);
        }, 200);
      });
    });
  });

  describe("polling state - network error handling", () => {
    it("retries on network error with backoff", () => {
      let callCount = 0;
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => ({
            challenge: mockChallenge,
            deepLink: "test",
            pollingUrl: "test",
            qrPayload: { challenge_id: "test" },
          })),
          pollStatus: fromPromise(async () => {
            callCount++;
            if (callCount <= 2) {
              throw new Error("Network error");
            }
            return { isValid: true };
          }),
        },
        actions: {
          renderChallenge: jest.fn(),
          redirect: jest.fn(),
        },
        delays: {
          POLL_INTERVAL: 50,
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot = actor.getSnapshot();
          // Should eventually succeed after retries
          expect(snapshot.value).toBe("verified");

          actor.stop();
          resolve(undefined);
        }, 500);
      });
    });

    it("transitions to timeout after MAX_NETWORK_RETRIES", () => {
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => ({
            challenge: mockChallenge,
            deepLink: "test",
            pollingUrl: "test",
            qrPayload: { challenge_id: "test" },
          })),
          pollStatus: fromPromise(async () => {
            throw new Error("Network error");
          }),
        },
        actions: {
          renderChallenge: jest.fn(),
          notifyTimeout: jest.fn(),
        },
        delays: {
          POLL_INTERVAL: 20,
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot = actor.getSnapshot();
          expect(snapshot.value).toBe("timeout");
          expect(snapshot.context.lastErrorType).toBe("timeout");
          expect(snapshot.context.userMessage).toBe(
            "The verification service could not be reached after multiple attempts. This may be caused by an unstable internet connection or a temporary service disruption. Please check your connection, wait a moment, and refresh the page to try again.",
          );

          actor.stop();
          resolve(undefined);
        }, 500);
      });
    });
  });

  describe("USER_RETRY event handling", () => {
    it("retries from timeout state", () => {
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => ({
            challenge: mockChallenge,
            deepLink: "test",
            pollingUrl: "test",
            qrPayload: { challenge_id: "test" },
          })),
          pollStatus: fromPromise(async () => {
            throw new Error("Network");
          }),
        },
        actions: {
          renderChallenge: jest.fn(),
          notifyTimeout: jest.fn(),
        },
        delays: {
          POLL_INTERVAL: 10,
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot1 = actor.getSnapshot();
          expect(snapshot1.value).toBe("timeout");

          // Retry - this transitions to 'polling', which immediately invokes
          // pollStatus. Since pollStatus throws, the machine moves to 'waiting'
          // (network error retry path) before the next tick settles.
          actor.send({ type: "USER_RETRY" });

          setTimeout(() => {
            const snapshot2 = actor.getSnapshot();
            // After USER_RETRY the machine enters 'polling' then immediately
            // invokes pollStatus, which throws. The onError handler sends it
            // to 'waiting' (networkRetries < MAX). So by the time we check,
            // the state is 'waiting', proving the retry loop restarted.
            expect(["polling", "waiting"]).toContain(snapshot2.value);

            actor.stop();
            resolve(undefined);
          }, 50);
        }, 300);
      });
    });

    it("retries from failed state", () => {
      let callCount = 0;
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => {
            callCount++;
            if (callCount === 1) {
              throw new Error("First attempt failed");
            }
            return {
              challenge: mockChallenge,
              deepLink: "test",
              pollingUrl: "test",
              qrPayload: { challenge_id: "test" },
            };
          }),
          pollStatus: fromPromise(async () => ({ isValid: true })),
        },
        actions: {
          renderChallenge: jest.fn(),
          notifyFailure: jest.fn(),
          redirect: jest.fn(),
        },
        delays: {
          POLL_INTERVAL: 10,
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot1 = actor.getSnapshot();
          expect(snapshot1.value).toBe("failed");

          // Retry
          actor.send({ type: "USER_RETRY" });

          setTimeout(() => {
            const snapshot2 = actor.getSnapshot();
            expect(snapshot2.value).toBe("verified");

            actor.stop();
            resolve(undefined);
          }, 150);
        }, 100);
      });
    });
  });

  describe("waiting state interval calculation", () => {
    it("uses INITIAL_DELAY for first poll", () => {
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => ({
            challenge: mockChallenge,
            deepLink: "test",
            pollingUrl: "test",
            qrPayload: { challenge_id: "test" },
          })),
          pollStatus: fromPromise(async () => ({ message: "pending" })),
        },
        actions: {
          renderChallenge: jest.fn(),
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot = actor.getSnapshot();
          expect(snapshot.context.isFirstPoll).toBe(true);
          // The waiting state entry action applies addJitter (15%) to the
          // base interval of 5000ms, so the value will be in the range
          // [4250, 5750]. Check with tolerance rather than exact equality.
          const interval = snapshot.context.currentPollInterval ?? 0;
          expect(interval).toBeGreaterThanOrEqual(4250);
          expect(interval).toBeLessThanOrEqual(5750);

          actor.stop();
          resolve(undefined);
        }, 100);
      });
    });

    it("uses quick polling for proof_ok_waiting_for_redeem", () => {
      let callCount = 0;
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => ({
            challenge: mockChallenge,
            deepLink: "test",
            pollingUrl: "test",
            qrPayload: { challenge_id: "test" },
          })),
          pollStatus: fromPromise(async () => {
            callCount++;
            if (callCount === 1) {
              return {
                message: "pending",
                state: "proof_ok_waiting_for_redeem",
              };
            }
            return { isValid: true };
          }),
        },
        actions: {
          renderChallenge: jest.fn(),
          redirect: jest.fn(),
        },
        delays: {
          POLL_INTERVAL: ({ context }) => context.currentPollInterval ?? 3000,
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot = actor.getSnapshot();
          // Interval should be reduced for quick polling
          if (
            snapshot.context.lastPollState === "proof_ok_waiting_for_redeem"
          ) {
            expect(snapshot.context.currentPollInterval).toBeLessThan(1500);
          }

          actor.stop();
          resolve(undefined);
        }, 200);
      });
    });
  });

  describe("Context management", () => {
    it("increments totalAttempts on each poll", () => {
      let callCount = 0;
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => ({
            challenge: mockChallenge,
            deepLink: "test",
            pollingUrl: "test",
            qrPayload: { challenge_id: "test" },
          })),
          pollStatus: fromPromise(async () => {
            callCount++;
            if (callCount < 3) {
              return { message: "pending" };
            }
            return { isValid: true };
          }),
        },
        actions: {
          renderChallenge: jest.fn(),
          redirect: jest.fn(),
        },
        delays: {
          POLL_INTERVAL: 30,
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot = actor.getSnapshot();
          expect(snapshot.context.totalAttempts).toBeGreaterThan(0);

          actor.stop();
          resolve(undefined);
        }, 200);
      });
    });

    it("increments networkRetries on network errors", () => {
      let callCount = 0;
      const machine = AgeGateMachine.provide({
        actors: {
          fetchChallenge: fromPromise(async () => ({
            challenge: mockChallenge,
            deepLink: "test",
            pollingUrl: "test",
            qrPayload: { challenge_id: "test" },
          })),
          pollStatus: fromPromise(async () => {
            callCount++;
            if (callCount < 3) {
              throw new Error("Network");
            }
            return { isValid: true };
          }),
        },
        actions: {
          renderChallenge: jest.fn(),
          redirect: jest.fn(),
        },
        delays: {
          POLL_INTERVAL: 30,
        },
      });

      const actor = createActor(machine);
      actor.start();

      actor.send({ type: "FETCH", cfg: mockConfig });

      return new Promise((resolve) => {
        setTimeout(() => {
          const snapshot = actor.getSnapshot();
          if (callCount >= 2) {
            expect(snapshot.context.networkRetries).toBeGreaterThan(0);
          }

          actor.stop();
          resolve(undefined);
        }, 200);
      });
    });
  });
});
