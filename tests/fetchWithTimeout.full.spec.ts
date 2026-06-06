// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT
// tests/fetchWithTimeout.full.spec.ts - Full test coverage
// -----------------------------------------------------------------------------
// Tests for fetchWithTimeout.ts - Focus on uncovered paths
// -----------------------------------------------------------------------------

import {
  fetchWithTimeout,
  NetworkError,
  safeReadJson,
} from "../src/utils/fetchWithTimeout.js";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("fetchWithTimeout.ts - Full Coverage", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  /* ========================================================================== */
  /*                          NetworkError Class                                */
  /* ========================================================================== */

  describe("NetworkError", () => {
    it("creates error with all properties", () => {
      const error = new NetworkError(
        "Test message",
        "User message",
        "TEST_CODE",
        500,
        { detail: "test" },
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.name).toBe("NetworkError");
      expect(error.message).toBe("Test message");
      expect(error.userMessage).toBe("User message");
      expect(error.code).toBe("TEST_CODE");
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ detail: "test" });
    });
  });

  /* ========================================================================== */
  /*                            safeReadJson                                    */
  /* ========================================================================== */

  describe("safeReadJson", () => {
    it("parses valid JSON", async () => {
      const response = new Response('{"key":"value"}', {
        headers: { "content-type": "application/json" },
      });

      const result = await safeReadJson(response);

      expect(result).toEqual({ key: "value" });
    });

    it("throws on JSON parse error", async () => {
      const response = new Response("invalid json {", {
        headers: { "content-type": "application/json" },
      });

      await expect(safeReadJson(response)).rejects.toMatchObject({
        code: "JSON_PARSE_FAILED",
        userMessage: expect.stringContaining("Invalid response format"),
      });
    });

    it("includes preview in parse error", async () => {
      const response = new Response("invalid json data here", {
        headers: { "content-type": "application/json" },
      });

      await expect(safeReadJson(response)).rejects.toMatchObject({
        details: expect.objectContaining({
          preview: "invalid json data here",
        }),
      });
    });

    it('truncates long preview with "..."', async () => {
      const longData = "x".repeat(200);
      const response = new Response(longData, {
        headers: { "content-type": "application/json" },
      });

      try {
        await safeReadJson(response);
      } catch (err: unknown) {
        const networkErr = err as NetworkError;
        const details = networkErr.details as { preview: string };
        expect(details.preview).toHaveLength(103);
        expect(details.preview).toMatch(/\.\.\.$/);
      }
    });

    it("logs parse errors", async () => {
      const response = new Response("not json", {
        headers: { "content-type": "application/json" },
      });

      await expect(safeReadJson(response)).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("JSON parse failed"),
        expect.any(Error),
      );
    });

    it("respects custom maxSize", async () => {
      const largeData = JSON.stringify({ data: "x".repeat(2000) });
      const response = new Response(largeData, {
        headers: { "content-type": "application/json" },
      });

      await expect(safeReadJson(response, 100)).rejects.toMatchObject({
        code: "RESPONSE_TOO_LARGE",
      });
    });

    it("wraps non-NetworkError exceptions", async () => {
      const mockResponse = {
        headers: new Headers({ "content-type": "application/json" }),
        status: 200,
        body: null,
        arrayBuffer: jest.fn().mockRejectedValue(new Error("Unexpected")),
      } as unknown as Response;

      await expect(safeReadJson(mockResponse)).rejects.toMatchObject({
        code: "BODY_READ_FAILED",
      });
    });
  });

  /* ========================================================================== */
  /*                        fetchWithTimeout Basic                              */
  /* ========================================================================== */

  describe("fetchWithTimeout", () => {
    beforeEach(() => {
      jest.useRealTimers();
    });

    it("performs successful fetch", async () => {
      const mockResponse = new Response("success");
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetchWithTimeout("https://example.com", {}, 0);

      expect(response).toBe(mockResponse);
    });

    it("logs warning for invalid timeout", async () => {
      mockFetch.mockResolvedValue(new Response("ok"));

      await fetchWithTimeout(
        "https://example.com",
        {},
        "invalid" as unknown as number,
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid timeout value"),
        "invalid",
      );
    });

    it("clamps timeout to MIN_TIMEOUT", async () => {
      mockFetch.mockResolvedValue(new Response("ok"));

      await fetchWithTimeout("https://example.com", {}, 500);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Timeout too short"),
      );
    });

    it("clamps timeout to MAX_TIMEOUT", async () => {
      mockFetch.mockResolvedValue(new Response("ok"));

      await fetchWithTimeout("https://example.com", {}, 100000);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Timeout too long"),
      );
    });

    it("logs warning for non-OK response", async () => {
      const mockResponse = new Response("error", {
        status: 404,
        statusText: "Not Found",
      });
      Object.defineProperty(mockResponse, "ok", { value: false });
      mockFetch.mockResolvedValue(mockResponse);

      await fetchWithTimeout("https://example.com", {}, 0);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("HTTP 404 Not Found"),
      );
    });

    it("handles TypeError as network error", async () => {
      mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(
        fetchWithTimeout("https://example.com", {}, 0),
      ).rejects.toMatchObject({
        code: "NETWORK_FAILURE",
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Network error"),
        "Failed to fetch",
      );
    });

    it("handles AbortError", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValue(abortError);

      await expect(
        fetchWithTimeout("https://example.com", {}, 0),
      ).rejects.toMatchObject({
        code: "FETCH_ABORTED",
      });
    });

    it("handles browser timeout errors", async () => {
      const timeoutError = new Error("Request timeout");
      mockFetch.mockRejectedValue(timeoutError);

      await expect(
        fetchWithTimeout("https://example.com", {}, 0),
      ).rejects.toMatchObject({
        code: "BROWSER_TIMEOUT",
      });
    });

    it("handles unexpected errors", async () => {
      mockFetch.mockRejectedValue("Strange error");

      await expect(
        fetchWithTimeout("https://example.com", {}, 0),
      ).rejects.toMatchObject({
        code: "FETCH_UNEXPECTED",
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unexpected error"),
        "Strange error",
      );
    });
  });
});
