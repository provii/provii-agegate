// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * WebSocket push notification client for verification status changes.
 *
 * Connects to the provii-verifier ChallengeNotifyDO via a single wss://
 * connection and resolves when a status_change notification arrives.
 * Falls back to HTTP polling if the WebSocket connection fails for any
 * reason (corporate proxy, timeout, server error).
 *
 * No reconnection logic is implemented by design. A failed WebSocket is
 * not retried; the caller simply continues with HTTP polling.
 *
 * @module WebSocketManager
 */

/** Payload shape received from the ChallengeNotifyDO over WebSocket. */
interface WebSocketNotification {
  type: string;
  status: string;
  proof_verified?: boolean;
}

/**
 * Lightweight WebSocket wrapper that connects to the ChallengeNotifyDO
 * and resolves a Promise when a status_change notification arrives.
 *
 * No reconnection logic. If the WebSocket fails for any reason (proxy blocks
 * upgrade, timeout, server error), the caller falls back to HTTP polling.
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private closed = false;
  private opened = false;

  constructor(
    private readonly wsUrl: string,
    private readonly sessionId: string,
  ) {
    // Enforce wss:// for WebSocket connections. Plain ws:// is only
    // permitted for localhost during development, mirroring the HTTPS
    // enforcement applied to API endpoints in AgeGateConfig.
    const lowerUrl = wsUrl.toLowerCase();
    if (lowerUrl.startsWith("ws://")) {
      let isLocalhost = false;
      try {
        const parsed = new URL(wsUrl.replace(/^ws:/i, "http:"));
        const hostname = parsed.hostname;
        isLocalhost =
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname === "[::1]" ||
          hostname === "::1";
      } catch {
        // URL parse failure handled below by the wss:// check
      }
      if (!isLocalhost) {
        throw new Error(
          "WebSocket URL must use wss://. " +
            "Plain ws:// is only permitted for localhost during development.",
        );
      }
    } else if (!lowerUrl.startsWith("wss://")) {
      throw new Error("WebSocket URL must use the wss:// scheme.");
    }
  }

  /**
   * Open the WebSocket and wait for a status_change notification.
   *
   * Resolves with the notification payload on success.
   * Rejects on error, close, or timeout (5 seconds for connection, no
   * timeout for waiting since the DO closes the socket on session expiry).
   */
  waitForNotification(): Promise<WebSocketNotification> {
    return new Promise<WebSocketNotification>((resolve, reject) => {
      if (this.closed) {
        reject(new Error("WebSocketManager already closed"));
        return;
      }

      try {
        this.ws = new WebSocket(this.wsUrl);
      } catch (err) {
        reject(new Error("WebSocket construction failed"));
        return;
      }

      // 5-second connection timeout. If the upgrade doesn't complete
      // in time (corporate proxy, network issue), fall back to polling.
      const connectTimeout = setTimeout(() => {
        this.close();
        reject(new Error("WebSocket connection timeout"));
      }, 5000);

      this.ws.onopen = () => {
        clearTimeout(connectTimeout);
        this.opened = true;
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const raw: unknown = JSON.parse(event.data as string);

          // Validate WebSocket message shape before trusting it
          if (
            typeof raw !== "object" ||
            raw === null ||
            typeof (raw as Record<string, unknown>)["type"] !== "string" ||
            typeof (raw as Record<string, unknown>)["status"] !== "string"
          ) {
            // Ignore messages that don't match expected shape
            return;
          }

          const data = raw as WebSocketNotification;
          if (data.type === "status_change") {
            resolve(data);
            // Don't close here; the server closes after sending.
          }
          // Ignore non-status_change messages (e.g., "pong")
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onerror = () => {
        clearTimeout(connectTimeout);
        this.close();
        reject(new Error("WebSocket error"));
      };

      this.ws.onclose = (event: CloseEvent) => {
        clearTimeout(connectTimeout);
        this.ws = null;
        // Code 1000 with "Notification delivered" means the DO pushed
        // the message and closed. Code 1000 with "Session expired" means
        // the alarm fired. Anything else is unexpected.
        if (event.reason === "Session expired") {
          reject(new Error("Session expired"));
        }
        // If we haven't resolved yet, the socket closed unexpectedly.
        // The Promise will stay pending, so reject it.
        reject(new Error(`WebSocket closed: ${event.code} ${event.reason}`));
      };
    });
  }

  /** Idempotent cleanup. Safe to call multiple times. */
  close(): void {
    this.closed = true;
    if (this.ws) {
      try {
        this.ws.close(1000, "Client cleanup");
      } catch {
        // Ignore errors during cleanup
      }
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /** True if the WebSocket successfully opened at any point before closing. */
  get wasConnected(): boolean {
    return this.opened;
  }
}
