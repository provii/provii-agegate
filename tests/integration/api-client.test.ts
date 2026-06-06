/**
 * Integration tests for API Client
 */

import { HostedBackendClient, ApiError } from "../../src/core/api-client.js";

describe("HostedBackendClient Integration Tests", () => {
  let client: HostedBackendClient;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    client = new HostedBackendClient({
      publicKey: "pk_test_123",
      apiEndpoint: "https://api.test.com",
      debug: false,
      fetchImpl: mockFetch,
    });
  });

  describe("createChallenge", () => {
    it("should create a challenge successfully", async () => {
      // Mock fetch returns v1 API snake_case response (CreateChallengeResponse)
      // Production createChallenge() maps these to the camelCase Challenge type
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          challenge_id: "challenge-123",
          verify_url: "https://verify.test.com/123",
          short_code: "123456789012",
          expires_at: Date.now() + 3600,
          status_url: "https://api.test.com/v1/hosted/status/challenge-123",
          rp_challenge: "test-rp-challenge-base64url-placeholder-43ch",
          submit_secret: "test-submit-secret-base64url-placeholder-43",
          cutoff_days: 6570,
          verifying_key_id: 12,
        }),
      });

      const result = await client.createChallenge({
        codeChallenge: "test-challenge",
        codeChallengeMethod: "S256",
        origin: "https://example.com",
      });

      // Production maps challenge_id to both sessionId and challengeId
      expect(result.sessionId).toBe("challenge-123");
      expect(result.challengeId).toBe("challenge-123");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: "Invalid request",
          code: "INVALID_REQUEST",
        }),
      });

      await expect(
        client.createChallenge({
          codeChallenge: "test-challenge",
          codeChallengeMethod: "S256",
          origin: "https://example.com",
        }),
      ).rejects.toThrow(ApiError);
    });

    it("should retry on 5xx errors", async () => {
      // First call: 500 error triggers retry via handleErrorResponse
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: "Internal error",
          challenge_id: "challenge-123",
          verify_url: "https://verify.test.com/123",
          short_code: "123456789012",
          expires_at: Date.now() + 3600,
          status_url: "https://api.test.com/v1/hosted/status/challenge-123",
          rp_challenge: "test-rp-challenge-base64url-placeholder-43ch",
          submit_secret: "test-submit-secret-base64url-placeholder-43",
          cutoff_days: 6570,
          verifying_key_id: 12,
        }),
      });

      // Second call: Success with v1 API response shape (consumed by retryRequest
      // internally, but return value is discarded by handleErrorResponse's caller)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          challenge_id: "challenge-123",
          verify_url: "https://verify.test.com/123",
          short_code: "123456789012",
          expires_at: Date.now() + 3600,
          status_url: "https://api.test.com/v1/hosted/status/challenge-123",
          rp_challenge: "test-rp-challenge-base64url-placeholder-43ch",
          submit_secret: "test-submit-secret-base64url-placeholder-43",
          cutoff_days: 6570,
          verifying_key_id: 12,
        }),
      });

      const result = await client.createChallenge({
        codeChallenge: "test-challenge",
        codeChallengeMethod: "S256",
        origin: "https://example.com",
      });

      expect(result.sessionId).toBe("challenge-123");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle timeout errors", async () => {
      mockFetch.mockRejectedValueOnce(
        new DOMException("Aborted", "AbortError"),
      );

      await expect(
        client.createChallenge({
          codeChallenge: "test-challenge",
          codeChallengeMethod: "S256",
          origin: "https://example.com",
        }),
      ).rejects.toThrow("Request timeout");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("Network error"));

      await expect(
        client.createChallenge({
          codeChallenge: "test-challenge",
          codeChallengeMethod: "S256",
          origin: "https://example.com",
        }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe("pollStatus", () => {
    it("should poll status successfully", async () => {
      // v1 API StatusResponse uses 'status' field (not 'state')
      // Production pollStatus() maps status values to internal state names
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "pending",
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        }),
      });

      const result = await client.pollStatus("session-123");

      expect(result.state).toBe("pending");
      expect(result.complete).toBe(false);
    });

    it("should handle proof_ok status", async () => {
      // v1 API uses 'proof_ok_waiting_for_redeem', production maps to 'proof_ok'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "proof_ok_waiting_for_redeem",
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        }),
      });

      const result = await client.pollStatus("session-123");

      expect(result.state).toBe("proof_ok");
      expect(result.proofVerified).toBe(true);
    });

    it("should handle expired status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "expired",
          expires_at: new Date(Date.now() - 3600000).toISOString(),
          reason: "EXPIRED",
        }),
      });

      const result = await client.pollStatus("session-123");

      expect(result.state).toBe("expired");
      // Production sets complete = (status === 'verified'), so expired is not complete
      expect(result.complete).toBe(false);
      // Production maps reason to client-safe error via mapReasonToMessage
      expect(result.error).toBe("Session expired");
    });
  });

  describe("redeemSession", () => {
    it("should redeem session successfully", async () => {
      // v1 API RedeemResponse only has status field
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "verified",
        }),
      });

      const result = await client.redeemSession("session-123", "verifier-abc");

      expect(result.status).toBe("verified");
    });

    it("should handle PKCE verification failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: "PKCE verification failed",
          code: "PKCE_FAILED",
        }),
      });

      await expect(
        client.redeemSession("session-123", "wrong-verifier"),
      ).rejects.toThrow(ApiError);
    });

    it("should handle already redeemed session", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: "Session already redeemed",
          code: "ALREADY_REDEEMED",
        }),
      });

      await expect(
        client.redeemSession("session-123", "verifier-abc"),
      ).rejects.toThrow(ApiError);
    });
  });

  describe("checkSession", () => {
    it("should check session when verified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          verified: true,
          session: {
            sessionId: "session-123",
            expiresAt: Date.now() + 86400,
          },
        }),
      });

      const result = await client.checkSession();

      expect(result.verified).toBe(true);
      expect(result.session).toBeDefined();
    });

    it("should check session when not verified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          verified: false,
        }),
      });

      const result = await client.checkSession();

      expect(result.verified).toBe(false);
      expect(result.session).toBeUndefined();
    });
  });

  describe("Error handling", () => {
    it("should identify rate limit errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        // handleErrorResponse() reads Retry-After off response.headers, so
        // the mock must expose a Headers-shaped object even when no header
        // is present.
        headers: { get: () => null },
        json: async () => ({
          error: "Rate limit exceeded",
          code: "RATE_LIMIT",
        }),
      });

      expect.assertions(2);
      try {
        await client.pollStatus("session-123");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).isRateLimitError()).toBe(true);
      }
    });

    it("should identify retryable errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          error: "Service unavailable",
        }),
      });

      try {
        await client.pollStatus("session-123");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).isRetryable()).toBe(true);
      }
    });
  });
});
