/**
 * @jest-environment jsdom
 */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT
//
// Mutation-killing tests for WebSocketManager. Every conditional branch,
// state transition, timeout boundary, and error path is exercised so that
// Stryker cannot survive a mutant in the source file.

import { WebSocketManager } from "../src/agegate/WebSocketManager.js";

// ---------------------------------------------------------------------------
// Mock WebSocket
// ---------------------------------------------------------------------------

/** Captured event handlers so tests can fire events manually. */
interface MockWSHandlers {
  onopen: (() => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: (() => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
}

let lastMockWs: MockWebSocket | null = null;
let constructorShouldThrow = false;

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: MockWSHandlers["onopen"] = null;
  onmessage: MockWSHandlers["onmessage"] = null;
  onerror: MockWSHandlers["onerror"] = null;
  onclose: MockWSHandlers["onclose"] = null;

  closeCalled = false;
  closeCode: number | undefined;
  closeReason: string | undefined;

  constructor(url: string) {
    if (constructorShouldThrow) {
      throw new Error("Simulated constructor failure");
    }
    this.url = url;
    lastMockWs = this;
  }

  close(code?: number, reason?: string): void {
    this.closeCalled = true;
    this.closeCode = code;
    this.closeReason = reason;
    this.readyState = MockWebSocket.CLOSED;
  }

  // Helper to simulate the server opening the connection
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  // Helper to simulate a message from the server
  simulateMessage(data: unknown): void {
    const event = new MessageEvent("message", {
      data: typeof data === "string" ? data : JSON.stringify(data),
    });
    this.onmessage?.(event);
  }

  // Helper to simulate an error
  simulateError(): void {
    this.onerror?.();
  }

  // Helper to simulate the connection closing
  simulateClose(code: number, reason: string): void {
    this.readyState = MockWebSocket.CLOSED;
    const event = new CloseEvent("close", { code, reason });
    this.onclose?.(event);
  }
}

// Replace the global WebSocket with the mock
beforeEach(() => {
  lastMockWs = null;
  constructorShouldThrow = false;
  (globalThis as Record<string, unknown>)["WebSocket"] = MockWebSocket as unknown as typeof WebSocket;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const TEST_URL = "wss://hosted.provii.app/ws/notify";
const TEST_SESSION = "abcdef12-3456-7890-abcd-ef1234567890";

describe("WebSocketManager", () => {
  // =========================================================================
  // Construction and initial state
  // =========================================================================

  describe("initial state", () => {
    it("isConnected returns false before waitForNotification is called", () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      expect(manager.isConnected).toBe(false);
    });

    it("wasConnected returns false before any connection attempt", () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      expect(manager.wasConnected).toBe(false);
    });
  });

  // =========================================================================
  // waitForNotification , happy path
  // =========================================================================

  describe("waitForNotification , happy path", () => {
    it("resolves with the notification payload when a status_change arrives", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      expect(lastMockWs).not.toBeNull();
      lastMockWs!.simulateOpen();
      lastMockWs!.simulateMessage({
        type: "status_change",
        status: "proof_ok",
        proof_verified: true,
      });

      const result = await promise;
      expect(result).toEqual({
        type: "status_change",
        status: "proof_ok",
        proof_verified: true,
      });
    });

    it("passes the correct URL to the WebSocket constructor", () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      manager.waitForNotification();
      expect(lastMockWs!.url).toBe(TEST_URL);
    });

    it("sets wasConnected to true after open fires", () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      manager.waitForNotification();
      expect(manager.wasConnected).toBe(false);
      lastMockWs!.simulateOpen();
      expect(manager.wasConnected).toBe(true);
    });

    it("sets isConnected to true when readyState is OPEN and ws is non-null", () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      manager.waitForNotification();
      expect(manager.isConnected).toBe(false);
      lastMockWs!.simulateOpen();
      expect(manager.isConnected).toBe(true);
    });

    it("clears the connect timeout once onopen fires", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateOpen();
      // Advance past the 5-second timeout. Should NOT reject.
      jest.advanceTimersByTime(6000);

      lastMockWs!.simulateMessage({
        type: "status_change",
        status: "proof_ok",
      });

      const result = await promise;
      expect(result.status).toBe("proof_ok");
    });
  });

  // =========================================================================
  // waitForNotification , message filtering
  // =========================================================================

  describe("message filtering", () => {
    it("ignores messages with type other than status_change", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateOpen();

      // Send a "pong" message first , should be ignored
      lastMockWs!.simulateMessage({ type: "pong" });

      // Then send the real notification
      lastMockWs!.simulateMessage({
        type: "status_change",
        status: "verified",
      });

      const result = await promise;
      expect(result.type).toBe("status_change");
      expect(result.status).toBe("verified");
    });

    it("ignores malformed JSON messages without throwing", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateOpen();

      // Send garbage , the catch block swallows the parse error
      lastMockWs!.simulateMessage("this is not valid JSON{{{");

      // Now send a valid notification
      lastMockWs!.simulateMessage({
        type: "status_change",
        status: "proof_ok",
        proof_verified: false,
      });

      const result = await promise;
      expect(result.proof_verified).toBe(false);
    });

    it("resolves only on the first status_change message", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateOpen();

      lastMockWs!.simulateMessage({
        type: "status_change",
        status: "proof_ok",
      });
      // A second status_change should be a no-op (Promise already resolved)
      lastMockWs!.simulateMessage({
        type: "status_change",
        status: "verified",
      });

      const result = await promise;
      expect(result.status).toBe("proof_ok");
    });
  });

  // =========================================================================
  // waitForNotification , connection timeout
  // =========================================================================

  describe("connection timeout", () => {
    it("rejects after exactly 5000ms if onopen never fires", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      // At 4999ms, should still be pending
      jest.advanceTimersByTime(4999);
      // Verify the WebSocket hasn't been closed yet
      expect(lastMockWs!.closeCalled).toBe(false);

      // At 5000ms, the timeout fires
      jest.advanceTimersByTime(1);

      await expect(promise).rejects.toThrow("WebSocket connection timeout");
    });

    it("calls close() on the manager when timeout fires", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      jest.advanceTimersByTime(5000);

      await expect(promise).rejects.toThrow("WebSocket connection timeout");
      // After timeout, close was called with cleanup code
      expect(lastMockWs!.closeCalled).toBe(true);
      expect(lastMockWs!.closeCode).toBe(1000);
      expect(lastMockWs!.closeReason).toBe("Client cleanup");
    });

    it("sets isConnected to false after timeout", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      jest.advanceTimersByTime(5000);
      await expect(promise).rejects.toThrow();
      expect(manager.isConnected).toBe(false);
    });
  });

  // =========================================================================
  // waitForNotification , error event
  // =========================================================================

  describe("error event", () => {
    it("rejects with 'WebSocket error' when onerror fires", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateError();

      await expect(promise).rejects.toThrow("WebSocket error");
    });

    it("clears the connect timeout when onerror fires", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateError();
      await expect(promise).rejects.toThrow("WebSocket error");

      // Advancing past 5s should NOT produce a second rejection
      // (timeout was cleared, so nothing more happens)
      jest.advanceTimersByTime(6000);
    });

    it("calls close() on the manager when onerror fires", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateError();
      await expect(promise).rejects.toThrow();

      expect(lastMockWs!.closeCalled).toBe(true);
    });
  });

  // =========================================================================
  // waitForNotification , close event
  // =========================================================================

  describe("close event", () => {
    it("rejects with 'Session expired' when close reason is exactly that string", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateOpen();
      lastMockWs!.simulateClose(1000, "Session expired");

      await expect(promise).rejects.toThrow("Session expired");
    });

    it("rejects with close code and reason for unexpected closures", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateOpen();
      lastMockWs!.simulateClose(1006, "Abnormal Closure");

      await expect(promise).rejects.toThrow("WebSocket closed: 1006 Abnormal Closure");
    });

    it("includes both code and reason in the error message for generic close", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateClose(1001, "Going away");

      await expect(promise).rejects.toThrow("WebSocket closed: 1001 Going away");
    });

    it("rejects with code and empty reason when close has no reason", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateClose(1000, "");

      // The fallthrough reject fires: "WebSocket closed: 1000 "
      await expect(promise).rejects.toThrow("WebSocket closed: 1000 ");
    });

    it("rejects with 'Notification delivered' reason embedded in the generic close message", async () => {
      // Close code 1000 with "Notification delivered" goes through the generic
      // fallthrough path since the reason is not "Session expired"
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateOpen();
      lastMockWs!.simulateClose(1000, "Notification delivered");

      await expect(promise).rejects.toThrow(
        "WebSocket closed: 1000 Notification delivered",
      );
    });

    it("clears the connect timeout when onclose fires", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      // Close before open (proxy blocks upgrade immediately)
      lastMockWs!.simulateClose(1006, "Proxy blocked");
      await expect(promise).rejects.toThrow();

      // Advancing timers should NOT produce a timeout error
      jest.advanceTimersByTime(6000);
    });

    it("sets ws to null when onclose fires", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateClose(1000, "Done");
      await expect(promise).rejects.toThrow();

      // isConnected depends on ws being non-null, so it must be false
      expect(manager.isConnected).toBe(false);
    });
  });

  // =========================================================================
  // waitForNotification , already closed guard
  // =========================================================================

  describe("already closed guard", () => {
    it("rejects immediately if close() was called before waitForNotification", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      manager.close();
      await expect(manager.waitForNotification()).rejects.toThrow(
        "WebSocketManager already closed",
      );
    });

    it("does not construct a WebSocket when already closed", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      manager.close();

      try {
        await manager.waitForNotification();
      } catch {
        // Expected rejection
      }

      // No WebSocket should have been created
      expect(lastMockWs).toBeNull();
    });
  });

  // =========================================================================
  // waitForNotification , constructor failure
  // =========================================================================

  describe("WebSocket constructor failure", () => {
    it("rejects with 'WebSocket construction failed' if new WebSocket() throws", async () => {
      constructorShouldThrow = true;
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      await expect(manager.waitForNotification()).rejects.toThrow(
        "WebSocket construction failed",
      );
    });
  });

  // =========================================================================
  // close() method
  // =========================================================================

  describe("close()", () => {
    it("sets closed flag so subsequent waitForNotification calls reject", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      manager.close();
      await expect(manager.waitForNotification()).rejects.toThrow(
        "WebSocketManager already closed",
      );
    });

    it("calls ws.close(1000, 'Client cleanup') on an active socket", () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      manager.waitForNotification();

      const ws = lastMockWs!;
      manager.close();

      expect(ws.closeCalled).toBe(true);
      expect(ws.closeCode).toBe(1000);
      expect(ws.closeReason).toBe("Client cleanup");
    });

    it("sets ws to null after calling close", () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      manager.waitForNotification();

      manager.close();
      expect(manager.isConnected).toBe(false);
    });

    it("is idempotent , calling close() twice does not throw", () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      manager.waitForNotification();

      manager.close();
      expect(() => manager.close()).not.toThrow();
    });

    it("is safe when ws is null (no connection started)", () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      expect(() => manager.close()).not.toThrow();
    });

    it("catches errors from ws.close() during cleanup", () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      manager.waitForNotification();

      // Make ws.close() throw
      lastMockWs!.close = () => {
        throw new Error("close() blew up");
      };

      // Should not propagate the error
      expect(() => manager.close()).not.toThrow();
    });
  });

  // =========================================================================
  // isConnected getter
  // =========================================================================

  describe("isConnected", () => {
    it("returns false when ws is null", () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      expect(manager.isConnected).toBe(false);
    });

    it("returns false when ws exists but readyState is CONNECTING", () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      manager.waitForNotification();
      // readyState defaults to CONNECTING (0)
      expect(lastMockWs!.readyState).toBe(MockWebSocket.CONNECTING);
      expect(manager.isConnected).toBe(false);
    });

    it("returns true only when ws is non-null and readyState is OPEN", () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      manager.waitForNotification();
      lastMockWs!.simulateOpen();
      expect(manager.isConnected).toBe(true);
    });

    it("returns false when ws exists but readyState is CLOSING", () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      manager.waitForNotification();
      lastMockWs!.readyState = MockWebSocket.CLOSING;
      expect(manager.isConnected).toBe(false);
    });

    it("returns false when ws exists but readyState is CLOSED", () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      manager.waitForNotification();
      lastMockWs!.readyState = MockWebSocket.CLOSED;
      expect(manager.isConnected).toBe(false);
    });
  });

  // =========================================================================
  // wasConnected getter
  // =========================================================================

  describe("wasConnected", () => {
    it("returns false if the connection never opened", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateError();
      await expect(promise).rejects.toThrow();

      expect(manager.wasConnected).toBe(false);
    });

    it("returns true if the connection opened even after it closes", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateOpen();
      lastMockWs!.simulateClose(1000, "Done");

      await expect(promise).rejects.toThrow();
      expect(manager.wasConnected).toBe(true);
    });

    it("returns true after close() is called on an opened connection", () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      manager.waitForNotification();

      lastMockWs!.simulateOpen();
      manager.close();

      expect(manager.wasConnected).toBe(true);
    });
  });

  // =========================================================================
  // Interaction between events , ordering edge cases
  // =========================================================================

  describe("event ordering edge cases", () => {
    it("does not reject on close after resolve from status_change", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateOpen();
      lastMockWs!.simulateMessage({
        type: "status_change",
        status: "proof_ok",
      });

      // The server closes after sending the notification
      lastMockWs!.simulateClose(1000, "Notification delivered");

      // The promise should resolve with the notification, not reject from close
      const result = await promise;
      expect(result.status).toBe("proof_ok");
    });

    it("error before open: wasConnected remains false", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      // Error fires before onopen
      lastMockWs!.simulateError();
      await expect(promise).rejects.toThrow("WebSocket error");

      expect(manager.wasConnected).toBe(false);
    });

    it("close before open: wasConnected remains false", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateClose(1006, "Proxy");
      await expect(promise).rejects.toThrow();

      expect(manager.wasConnected).toBe(false);
    });
  });

  // =========================================================================
  // URL and sessionId are stored correctly
  // =========================================================================

  describe("constructor parameters", () => {
    it("uses the exact wsUrl for the WebSocket connection", () => {
      const customUrl = "wss://custom.example.com/ws/v2";
      const manager = new WebSocketManager(customUrl, TEST_SESSION);
      manager.waitForNotification();
      expect(lastMockWs!.url).toBe(customUrl);
    });

  });

  // =========================================================================
  // Boundary: status_change with optional proof_verified field
  // =========================================================================

  describe("notification payload variants", () => {
    it("resolves when proof_verified is absent", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateOpen();
      lastMockWs!.simulateMessage({
        type: "status_change",
        status: "expired",
      });

      const result = await promise;
      expect(result.proof_verified).toBeUndefined();
      expect(result.status).toBe("expired");
    });

    it("resolves when proof_verified is false", async () => {
      const manager = new WebSocketManager(TEST_URL, TEST_SESSION);
      const promise = manager.waitForNotification();

      lastMockWs!.simulateOpen();
      lastMockWs!.simulateMessage({
        type: "status_change",
        status: "failed",
        proof_verified: false,
      });

      const result = await promise;
      expect(result.proof_verified).toBe(false);
    });
  });
});
