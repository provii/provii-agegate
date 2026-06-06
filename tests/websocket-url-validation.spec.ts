/**
 * @jest-environment jsdom
 */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT
//
// Coverage tests for WebSocketManager constructor URL validation.
// Exercises the ws:// localhost exemption and scheme rejection paths.

import { WebSocketManager } from "../src/agegate/WebSocketManager.js";

// Replace the global WebSocket with a mock so construction doesn't fail
class MockWebSocket {
  static readonly OPEN = 1;
  readyState = 0;
  onopen: unknown = null;
  onmessage: unknown = null;
  onerror: unknown = null;
  onclose: unknown = null;
  close(): void {
    /* no-op */
  }
  constructor(_url: string) {
    /* no-op */
  }
}

beforeEach(() => {
  (globalThis as Record<string, unknown>)["WebSocket"] =
    MockWebSocket as unknown as typeof WebSocket;
});

describe("WebSocketManager constructor URL validation", () => {
  it("accepts wss:// URLs", () => {
    expect(
      () => new WebSocketManager("wss://hosted.provii.app/ws/notify", "sess1"),
    ).not.toThrow();
  });

  it("accepts ws:// for localhost", () => {
    expect(
      () => new WebSocketManager("ws://localhost:8787/ws/notify", "sess1"),
    ).not.toThrow();
  });

  it("accepts ws:// for 127.0.0.1", () => {
    expect(
      () => new WebSocketManager("ws://127.0.0.1:8787/ws/notify", "sess1"),
    ).not.toThrow();
  });

  it("accepts ws:// for [::1]", () => {
    expect(
      () => new WebSocketManager("ws://[::1]:8787/ws/notify", "sess1"),
    ).not.toThrow();
  });

  it("rejects ws:// for non-localhost hosts", () => {
    expect(
      () => new WebSocketManager("ws://example.com/ws/notify", "sess1"),
    ).toThrow("wss://");
  });

  it("rejects http:// URLs", () => {
    expect(
      () => new WebSocketManager("http://hosted.provii.app/ws", "sess1"),
    ).toThrow("wss://");
  });

  it("rejects ftp:// URLs", () => {
    expect(
      () => new WebSocketManager("ftp://hosted.provii.app/ws", "sess1"),
    ).toThrow("wss://");
  });

  it("rejects empty string URL", () => {
    expect(() => new WebSocketManager("", "sess1")).toThrow("wss://");
  });

  it("rejects ws:// with malformed URL that fails URL parsing", () => {
    // This will hit the catch block in URL parsing then fall through to the
    // non-localhost rejection since isLocalhost stays false
    expect(
      () => new WebSocketManager("ws://:::invalid", "sess1"),
    ).toThrow("wss://");
  });
});
