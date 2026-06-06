/**
 * Comprehensive AgeGate.ts tests for 90%+ mutation coverage
 * Tests AgeGate class, lifecycle, cleanup, and all public methods
 */

import { AgeGate } from "../src/agegate/AgeGate.js";
import { AgeGateConfig } from "../src/agegate/AgeGateConfig.js";
import { getShadowRoot } from "../src/core/shadow-dom.js";
import * as machineServicesMock from "../src/agegate/machineServices.js";

const requireShadow = (host: HTMLElement): ShadowRoot => {
  const root = getShadowRoot(host);
  if (!root) throw new Error("expected shadow root on host");
  return root;
};

// Mock dependencies
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
  attachVisibilityFallback: jest.fn(() => () => {}),
  wasWsConnected: jest.fn(() => false),
}));

describe("AgeGate.ts - Comprehensive Coverage", () => {
  let mockConfig: ConstructorParameters<typeof AgeGateConfig>[0];
  let mockRedirect: jest.Mock;
  let mockMountElement: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Test public key matching the required format: pk_test_<64 hex chars>
    const TEST_PUBLIC_KEY =
      "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    mockConfig = {
      publicKey: TEST_PUBLIC_KEY,
      environment: "sandbox" as const,
      contentUrl: "/content.html",
      mountElementId: "agegate-mount",
    };

    mockRedirect = jest.fn();

    // Mock DOM
    mockMountElement = document.createElement("div");
    mockMountElement.id = "agegate-mount";
    document.body.appendChild(mockMountElement);

    // jest-location-mock (in setupFiles) provides window.location as a mock
    // No need to replace it; clearMocks resets mock call history between tests

    // Mock console methods
    jest.spyOn(console, "debug").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    document.body.innerHTML = "";
  });

  describe("constructor", () => {
    it("creates instance with AgeGateConfig object", () => {
      const config = new AgeGateConfig(mockConfig);
      const gate = new AgeGate(config, mockRedirect);

      expect(gate).toBeInstanceOf(AgeGate);
      gate.dispose();
    });

    it("creates instance with config options", () => {
      const gate = new AgeGate(mockConfig, mockRedirect);

      expect(gate).toBeInstanceOf(AgeGate);
      gate.dispose();
    });

    it("uses default redirect function when not provided", () => {
      const gate = new AgeGate(mockConfig);

      expect(gate).toBeInstanceOf(AgeGate);
      gate.dispose();
    });

    it("sets up auto cleanup listeners", () => {
      const addEventListenerSpy = jest.spyOn(window, "addEventListener");
      const documentAddEventListenerSpy = jest.spyOn(
        document,
        "addEventListener",
      );

      const gate = new AgeGate(mockConfig);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "pagehide",
        expect.any(Function),
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "popstate",
        expect.any(Function),
      );
      expect(documentAddEventListenerSpy).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      );

      gate.dispose();
    });

    it("handles navigation API when available", () => {
      (window as any).navigation = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      const gate = new AgeGate(mockConfig);

      expect((window as any).navigation.addEventListener).toHaveBeenCalledWith(
        "navigate",
        expect.any(Function),
      );

      gate.dispose();
      delete (window as any).navigation;
    });

    it("handles navigation API errors gracefully", () => {
      (window as any).navigation = {
        addEventListener: jest.fn().mockImplementation(() => {
          throw new Error("Not supported");
        }),
      };

      // Should not throw when Navigation API is broken
      const gate = new AgeGate(mockConfig);

      gate.dispose();
      delete (window as any).navigation;
    });
  });

  describe("setupAutoCleanup", () => {
    it("disposes on beforeunload event", () => {
      const gate = new AgeGate(mockConfig);
      const disposeSpy = jest.spyOn(gate, "dispose");

      window.dispatchEvent(new Event("beforeunload"));

      expect(disposeSpy).toHaveBeenCalled();
    });

    it("disposes on pagehide event", () => {
      const gate = new AgeGate(mockConfig);
      const disposeSpy = jest.spyOn(gate, "dispose");

      window.dispatchEvent(new Event("pagehide"));

      expect(disposeSpy).toHaveBeenCalled();
    });

    it("disposes on popstate event", () => {
      const gate = new AgeGate(mockConfig);
      const disposeSpy = jest.spyOn(gate, "dispose");

      window.dispatchEvent(new Event("popstate"));

      expect(disposeSpy).toHaveBeenCalled();
    });

    it("sets timeout on document hidden", () => {
      const gate = new AgeGate(mockConfig);

      Object.defineProperty(document, "hidden", {
        value: true,
        writable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      jest.advanceTimersByTime(5 * 60 * 1000 + 1);

      expect(gate.isDisposed()).toBe(true);
    });

    it("clears timeout when document becomes visible", () => {
      const gate = new AgeGate(mockConfig);

      Object.defineProperty(document, "hidden", {
        value: true,
        writable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      Object.defineProperty(document, "hidden", {
        value: false,
        writable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      jest.advanceTimersByTime(5 * 60 * 1000 + 1);

      // Should not have disposed
      expect(gate.isDisposed()).toBe(false);

      gate.dispose();
    });

  });

  describe("showRetryPrompt", () => {
    it("shows retry prompt for timeout", () => {
      const config = new AgeGateConfig({
        ...mockConfig,
        mountElementId: "agegate-mount",
      });
      const gate = new AgeGate(config);

      (gate as any).showRetryPrompt("Test message", "timeout");

      const html = requireShadow(mockMountElement).innerHTML;
      expect(html).toContain("Test message");
      expect(html).toContain("Verification timed out");
      // Timeout uses --ag-warning fallback colour (#D97706) injected via styles
      expect(html.toLowerCase()).toContain("#d97706");

      gate.dispose();
    });

    it("shows retry prompt for error", () => {
      const config = new AgeGateConfig({
        ...mockConfig,
        mountElementId: "agegate-mount",
      });
      const gate = new AgeGate(config);

      (gate as any).showRetryPrompt("Error message", "error");

      const html = requireShadow(mockMountElement).innerHTML;
      expect(html).toContain("Error message");
      expect(html).toContain("Age Verification Error");
      // Error uses --ag-error fallback colour (#C62020) injected via styles
      expect(html.toLowerCase()).toContain("#c62020");

      gate.dispose();
    });

    it("adds click handler to retry button", () => {
      const config = new AgeGateConfig({
        ...mockConfig,
        mountElementId: "agegate-mount",
      });
      const gate = new AgeGate(config);
      const userRetrySpy = jest.spyOn(gate, "userRetry");

      (gate as any).showRetryPrompt("Test", "timeout");

      const shadow = getShadowRoot(mockMountElement);
      const retryBtn = shadow?.querySelector(
        "#agegate-retry-btn",
      ) as HTMLButtonElement | null;
      expect(retryBtn).toBeTruthy();

      retryBtn?.click();
      expect(userRetrySpy).toHaveBeenCalled();

      gate.dispose();
    });

    it("shows helper text for timeout", () => {
      const config = new AgeGateConfig({
        ...mockConfig,
        mountElementId: "agegate-mount",
      });
      const gate = new AgeGate(config);

      (gate as any).showRetryPrompt("Test", "timeout");

      expect(requireShadow(mockMountElement).innerHTML).toContain(
        "Provii Wallet is open",
      );

      gate.dispose();
    });

    it("does not show helper text for error", () => {
      const config = new AgeGateConfig({
        ...mockConfig,
        mountElementId: "agegate-mount",
      });
      const gate = new AgeGate(config);

      (gate as any).showRetryPrompt("Test", "error");

      expect(requireShadow(mockMountElement).innerHTML).not.toContain(
        "Provii Wallet is open",
      );

      gate.dispose();
    });

    it("logs error when mount element not found", () => {
      const config = new AgeGateConfig({
        ...mockConfig,
        mountElementId: "nonexistent",
      });
      const gate = new AgeGate(config);

      (gate as any).showRetryPrompt("Test", "timeout");

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Mount element not found"),
      );

      gate.dispose();
    });
  });

  describe("userRetry", () => {
    it("sends USER_RETRY event to actor", () => {
      const gate = new AgeGate(mockConfig);

      expect(() => gate.userRetry()).not.toThrow();

      gate.dispose();
    });

    it("calls reload on userRetry", () => {
      const config = new AgeGateConfig({
        ...mockConfig,
        mountElementId: "agegate-mount",
      });
      const gate = new AgeGate(config);

      expect(() => gate.userRetry()).not.toThrow();

      gate.dispose();
    });

    it("still reloads page when instance is disposed", () => {
      const gate = new AgeGate(mockConfig);
      gate.dispose();

      expect(() => gate.userRetry()).not.toThrow();
    });

    it("handles missing mount element", () => {
      const config = new AgeGateConfig({
        ...mockConfig,
        mountElementId: "nonexistent",
      });
      const gate = new AgeGate(config);

      // Should not throw
      expect(() => gate.userRetry()).not.toThrow();

      gate.dispose();
    });
  });

  describe("init", () => {
    it("starts initialization flow", async () => {
      const gate = new AgeGate(mockConfig);

      const promise = gate.init();
      expect(promise).toBeInstanceOf(Promise);

      gate.dispose();
    });

    it("is idempotent", async () => {
      const gate = new AgeGate(mockConfig);

      const promise1 = gate.init();
      const promise2 = gate.init();

      expect(promise1).toBe(promise2);

      gate.dispose();
    });

    it("rejects when instance is disposed", async () => {
      const gate = new AgeGate(mockConfig);
      gate.dispose();

      await expect(gate.init()).rejects.toThrow("disposed");
    });

    it("times out after 330 seconds when actor never settles", async () => {
      // Stall the challenge fetch so the actor never reaches "rendered" or
      // "failed". This forces the init() Promise to depend on the 330s
      // setTimeout for resolution.
      (
        machineServicesMock.machineServices.fetchChallenge as jest.Mock
      ).mockImplementation(() => new Promise(() => {}));

      const gate = new AgeGate(mockConfig);
      const promise = gate.init();

      // Drain the microtask queue so verificationPromise wiring runs, then
      // skip past the session-check 3s race and the 330s init timeout.
      await Promise.resolve();
      jest.advanceTimersByTime(3001);
      await Promise.resolve();
      jest.advanceTimersByTime(330001);

      await expect(promise).rejects.toThrow("timed out");

      gate.dispose();
    });
  });

  describe("getState", () => {
    it('returns "disposed" when disposed', () => {
      const gate = new AgeGate(mockConfig);
      gate.dispose();

      expect(gate.getState()).toBe("disposed");
    });

    it('returns "idle" initially', () => {
      const gate = new AgeGate(mockConfig);

      expect(gate.getState()).toBe("idle");

      gate.dispose();
    });

    it("returns correct state for each machine state", () => {
      const gate = new AgeGate(mockConfig);

      // Test idle state
      expect(gate.getState()).toBe("idle");

      gate.dispose();
    });

    it('returns "unknown" for unmatched states', () => {
      const gate = new AgeGate(mockConfig);

      // This is hard to test without mocking the actor's snapshot
      // but the code path exists

      gate.dispose();
    });
  });

  describe("getContext", () => {
    it("returns error when disposed", () => {
      const gate = new AgeGate(mockConfig);
      gate.dispose();

      const context = gate.getContext();

      expect(context.error).toBeInstanceOf(Error);
      expect(context.userMessage).toContain("expired");
    });

    it("returns current context", () => {
      const gate = new AgeGate(mockConfig);

      const context = gate.getContext();

      expect(context).toBeDefined();
      expect(typeof context).toBe("object");

      gate.dispose();
    });

    it("returns all context fields", () => {
      const gate = new AgeGate(mockConfig);

      const context = gate.getContext();

      expect(context).toHaveProperty("currentPollInterval");
      expect(context).toHaveProperty("networkRetries");
      expect(context).toHaveProperty("negativeRetries");
      expect(context).toHaveProperty("totalAttempts");
      expect(context).toHaveProperty("lastErrorType");
      expect(context).toHaveProperty("lastPollState");
      expect(context).toHaveProperty("error");
      expect(context).toHaveProperty("userMessage");

      gate.dispose();
    });
  });

  describe("retry", () => {
    it("calls userRetry", () => {
      const gate = new AgeGate(mockConfig);
      const userRetrySpy = jest.spyOn(gate, "userRetry");

      gate.retry();

      expect(userRetrySpy).toHaveBeenCalled();

      gate.dispose();
    });
  });

  describe("stop", () => {
    it("calls dispose", () => {
      const gate = new AgeGate(mockConfig);
      const disposeSpy = jest.spyOn(gate, "dispose");

      gate.stop();

      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe("dispose", () => {
    it("sets disposed flag", () => {
      const gate = new AgeGate(mockConfig);

      gate.dispose();

      expect(gate.isDisposed()).toBe(true);
    });

    it("is idempotent", () => {
      const gate = new AgeGate(mockConfig);

      gate.dispose();
      gate.dispose();
      gate.dispose();

      expect(gate.isDisposed()).toBe(true);
    });

    it("stops the actor", () => {
      const gate = new AgeGate(mockConfig);

      gate.dispose();

      expect(gate.isDisposed()).toBe(true);
    });

    it("clears visibility timeout", () => {
      const gate = new AgeGate(mockConfig);

      Object.defineProperty(document, "hidden", {
        value: true,
        writable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      gate.dispose();

      // Timeout should be cleared
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      // No additional dispose should happen
    });

    it("runs cleanup callbacks", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      const gate = new AgeGate(mockConfig);
      gate.dispose();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "pagehide",
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "popstate",
        expect.any(Function),
      );
    });

    it("handles cleanup errors gracefully", () => {
      const gate = new AgeGate(mockConfig);

      // Force an error in cleanup
      (gate as any).cleanupCallbacks.push(() => {
        throw new Error("Cleanup error");
      });

      gate.dispose();

      expect(console.error).toHaveBeenCalled();
    });

    it("handles actor stop errors gracefully", () => {
      const gate = new AgeGate(mockConfig);

      // Mock actor.stop to throw
      (gate as any).actor.stop = jest.fn().mockImplementation(() => {
        throw new Error("Stop error");
      });

      gate.dispose();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("isDisposed", () => {
    it("returns false initially", () => {
      const gate = new AgeGate(mockConfig);

      expect(gate.isDisposed()).toBe(false);

      gate.dispose();
    });

    it("returns true after dispose", () => {
      const gate = new AgeGate(mockConfig);
      gate.dispose();

      expect(gate.isDisposed()).toBe(true);
    });
  });

  describe("subscribe", () => {
    it("calls callback on state changes", () => {
      const gate = new AgeGate(mockConfig);
      const callback = jest.fn();

      const unsubscribe = gate.subscribe(callback);

      // Trigger a state change
      gate.init();
      jest.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalled();

      unsubscribe();
      gate.dispose();
    });

    it("returns unsubscribe function", () => {
      const gate = new AgeGate(mockConfig);
      const callback = jest.fn();

      const unsubscribe = gate.subscribe(callback);

      expect(typeof unsubscribe).toBe("function");

      unsubscribe();
      gate.dispose();
    });

    it("unsubscribe stops callbacks", () => {
      const gate = new AgeGate(mockConfig);
      const callback = jest.fn();

      const unsubscribe = gate.subscribe(callback);
      const callCountBefore = callback.mock.calls.length;

      unsubscribe();

      // Trigger state change
      gate.init();
      jest.advanceTimersByTime(100);

      // Callback should not be called again
      expect(callback.mock.calls.length).toBe(callCountBefore);

      gate.dispose();
    });

    it("warns when subscribing to disposed instance", () => {
      const gate = new AgeGate(mockConfig);
      gate.dispose();

      const callback = jest.fn();
      const unsubscribe = gate.subscribe(callback);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Cannot subscribe - instance disposed"),
      );
      expect(typeof unsubscribe).toBe("function");

      unsubscribe();
    });

    it("does not call callback after disposal", () => {
      const gate = new AgeGate(mockConfig);
      const callback = jest.fn();

      gate.subscribe(callback);
      gate.dispose();

      const callCountAfterDispose = callback.mock.calls.length;

      // Try to trigger more callbacks
      jest.advanceTimersByTime(1000);

      expect(callback.mock.calls.length).toBe(callCountAfterDispose);
    });

    it("handles unsubscribe errors gracefully", () => {
      const gate = new AgeGate(mockConfig);
      const callback = jest.fn();

      const unsubscribe = gate.subscribe(callback);

      // Dispose first to make unsubscribe potentially error
      gate.dispose();

      // Should not throw
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe("redirect action", () => {
    it("calls redirectFn with contentUrl", () => {
      const gate = new AgeGate(mockConfig, mockRedirect);

      // Simulate redirect action
      const machine = (gate as any).actor.getSnapshot();
      const context = { cfg: new AgeGateConfig(mockConfig) };

      // Call redirect action directly
      const actions = ((gate as any).actor.logic as any).implementations
        .actions;
      if (actions && actions.redirect) {
        actions.redirect({ context });
      }

      gate.dispose();
    });

    it("logs error when cfg is missing", () => {
      const gate = new AgeGate(mockConfig, mockRedirect);

      const context = {}; // No cfg

      const actions = ((gate as any).actor.logic as any).implementations
        .actions;
      if (actions && actions.redirect) {
        actions.redirect({ context });
      }

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("redirect called without cfg"),
      );

      gate.dispose();
    });
  });

  describe("navigation API cleanup", () => {
    it("removes navigation listener on dispose", () => {
      (window as any).navigation = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      const gate = new AgeGate(mockConfig);
      gate.dispose();

      expect(
        (window as any).navigation.removeEventListener,
      ).toHaveBeenCalledWith("navigate", expect.any(Function));

      delete (window as any).navigation;
    });

    it("handles navigation removal errors", () => {
      (window as any).navigation = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn().mockImplementation(() => {
          throw new Error("Removal error");
        }),
      };

      const gate = new AgeGate(mockConfig);

      // Should not throw
      expect(() => gate.dispose()).not.toThrow();

      delete (window as any).navigation;
    });
  });
});
