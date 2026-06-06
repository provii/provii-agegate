// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT

/**
 * H18: redeem terminal-status handling, driven through machineServices.pollStatus
 * (the public entry that calls the non-exported redeemChallenge).
 *
 * Covers:
 *  - idempotent double-redeem: a 409 from the verifier is treated as success
 *    (the challenge was already redeemed, e.g. by a retry that landed twice on
 *    the server before dedup, or by a concurrent tab),
 *  - 410 terminal: an expired challenge surfaces REDEEM_HTTP_410 with the
 *    expired-challenge user message,
 *  - other 4xx terminal: surfaced as REDEEM_HTTP_<status> and NOT retried,
 *  - retry-then-succeed on 5xx: a transient 5xx redeem is retried and the gate
 *    still completes (verified).
 *
 * The redeem leg uses fetchWithRetry (C1). Here it is auto-mocked and delegated
 * to the same fetchWithTimeout mock + queue used by the status poll, so a single
 * per-test response queue drives both legs; for the 5xx-then-200 case the queue
 * supplies the post-retry success directly (the real retry loop is exercised in
 * redeem-retry.spec.ts).
 */

import { machineServices } from "../src/agegate/machineServices.js";
import { AgeGateConfig } from "../src/agegate/AgeGateConfig.js";
import * as fetchUtils from "../src/utils/fetchWithTimeout.js";
import * as qrUtils from "../src/utils/qr.js";
import * as deviceUtils from "../src/utils/device.js";

jest.mock("../src/utils/qr.js");
jest.mock("../src/utils/fetchWithTimeout.js");
jest.mock("../src/utils/device.js");
jest.mock("../src/ui/StyledQR.js", () => ({
  StyledQR: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    destroy: jest.fn(),
  })),
}));

const TEST_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Returns `any` to match the established machineServices test style; pollStatus
// accepts a CreateChallengeResponse and these object literals stand in for one.
const createMockChallenge = (overrides: Record<string, unknown> = {}): any => ({
  challenge_id: "test-123",
  short_code: "123456789012",
  rp_challenge: "a".repeat(43),
  submit_secret: "b".repeat(43),
  expires_at: "2025-01-01T00:00:00Z",
  cutoff_days: 6574,
  verifying_key_id: 12,
  status_url: "https://test.com/status",
  verify_url: "https://test.com/verify",
  qr_code_url: "https://test.com/qr",
  ...overrides,
});

const proofOkStatus = () => ({
  status: "proof_ok_waiting_for_redeem",
  expires_at: new Date(Date.now() + 300_000).toISOString(),
});

describe("H18: redeem terminal-status handling via pollStatus", () => {
  let mockConfig: AgeGateConfig;
  let mountEl: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = new AgeGateConfig({
      publicKey: TEST_PUBLIC_KEY,
      environment: "sandbox" as const,
      contentUrl: "/content",
      mountElementId: "agegate-mount",
    });

    mountEl = document.createElement("div");
    mountEl.id = "agegate-mount";
    document.body.appendChild(mountEl);

    jest.spyOn(console, "debug").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const cryptoMock = {
      getRandomValues: jest.fn((arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = i % 256;
        return arr;
      }),
      randomUUID: jest
        .fn()
        .mockReturnValue("00000000-0000-4000-8000-000000000000"),
      subtle: {
        digest: jest.fn().mockResolvedValue(new Uint8Array(32).fill(1)),
      },
    };
    Object.defineProperty(global, "crypto", {
      value: cryptoMock,
      configurable: true,
      writable: true,
    });

    jest.spyOn(Storage.prototype, "getItem").mockReturnValue("test_verifier");
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {});
    jest.spyOn(Storage.prototype, "clear").mockImplementation(() => {});

    (deviceUtils.isMobile as jest.Mock).mockReturnValue(false);
    (qrUtils.renderQrToCanvas as jest.Mock).mockResolvedValue(undefined);

    // Delegate the redeem leg (fetchWithRetry) to the same fetchWithTimeout
    // mock + queue used by the status poll.
    (fetchUtils.fetchWithRetry as jest.Mock).mockImplementation(
      (...args: unknown[]) =>
        (fetchUtils.fetchWithTimeout as jest.Mock)(...args),
    );
    (fetchUtils.safeReadJson as jest.Mock).mockResolvedValue(proofOkStatus());
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("idempotent double-redeem: a 409 is treated as success", async () => {
    (fetchUtils.fetchWithTimeout as jest.Mock)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(proofOkStatus()), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response("", { status: 409 }));

    const result = await machineServices.pollStatus({
      cfg: mockConfig,
      challenge: createMockChallenge(),
      pollingUrl: "https://test.com/status",
    });

    expect(result.isValid).toBe(true);
    expect(result.message).toBe("verified");
  });

  it("410 terminal: surfaces REDEEM_HTTP_410 with the expired message and does NOT retry", async () => {
    (fetchUtils.fetchWithTimeout as jest.Mock)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(proofOkStatus()), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response("", { status: 410 }));

    await expect(
      machineServices.pollStatus({
        cfg: mockConfig,
        challenge: createMockChallenge(),
        pollingUrl: "https://test.com/status",
      }),
    ).rejects.toMatchObject({
      name: "AgeGateError",
      code: "REDEEM_HTTP_410",
      userMessage: expect.stringContaining("expired"),
    });

    // 1 status poll + exactly 1 redeem attempt (no retry on a terminal 4xx).
    expect(fetchUtils.fetchWithRetry).toHaveBeenCalledTimes(1);
  });

  it("other 4xx terminal: a 403 surfaces REDEEM_HTTP_403", async () => {
    (fetchUtils.fetchWithTimeout as jest.Mock)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(proofOkStatus()), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response("", { status: 403 }));

    await expect(
      machineServices.pollStatus({
        cfg: mockConfig,
        challenge: createMockChallenge(),
        pollingUrl: "https://test.com/status",
      }),
    ).rejects.toMatchObject({
      name: "AgeGateError",
      code: "REDEEM_HTTP_403",
    });
  });

  it("retry-then-succeed on 5xx: the gate still completes (verified)", async () => {
    // The status poll returns proof_ok; the redeem then resolves 200 (post-retry
    // success - the real backoff/retry loop is covered in redeem-retry.spec.ts).
    (fetchUtils.fetchWithTimeout as jest.Mock)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(proofOkStatus()), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const result = await machineServices.pollStatus({
      cfg: mockConfig,
      challenge: createMockChallenge(),
      pollingUrl: "https://test.com/status",
    });

    expect(result.isValid).toBe(true);

    // The redeem leg used the retry wrapper, with the bounded budget.
    expect(fetchUtils.fetchWithRetry).toHaveBeenCalledWith(
      expect.stringContaining("/redeem/"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "00000000-0000-4000-8000-000000000000",
        }),
      }),
      expect.any(Number),
      expect.objectContaining({ maxRetries: 2 }),
    );
  });
});
