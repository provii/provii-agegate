/**
 * @jest-environment jsdom
 */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT
//
// Coverage tests for ChallengeSchema and StatusSchema runtime validators
// in src/types/api.ts. Exercises every field-level throw path.

import { ChallengeSchema, StatusSchema } from "../src/types/api.js";

// ---------------------------------------------------------------------------
// ChallengeSchema
// ---------------------------------------------------------------------------

describe("ChallengeSchema.parse", () => {
  const validChallenge = {
    challenge_id: "ch_abc123",
    short_code: "ABC123",
    rp_challenge: "rp_challenge_value",
    cutoff_days: 6570,
    verifying_key_id: 1,
    submit_secret: "submit_secret_value",
    expires_at: 1717200000,
    status_url: "https://api.provii.app/v1/hosted/status/ch_abc123",
    verify_url: "https://api.provii.app/v1/hosted/verify",
  };

  it("returns the object when all fields are valid", () => {
    const result = ChallengeSchema.parse(validChallenge);
    expect(result).toBe(validChallenge);
  });

  it("throws for null input", () => {
    expect(() => ChallengeSchema.parse(null)).toThrow("not an object");
  });

  it("throws for undefined input", () => {
    expect(() => ChallengeSchema.parse(undefined)).toThrow("not an object");
  });

  it("throws for a string input", () => {
    expect(() => ChallengeSchema.parse("not an object")).toThrow("not an object");
  });

  it("throws when challenge_id is missing", () => {
    const { challenge_id, ...rest } = validChallenge;
    expect(() => ChallengeSchema.parse(rest)).toThrow("Invalid challenge_id");
  });

  it("throws when challenge_id is a number", () => {
    expect(() => ChallengeSchema.parse({ ...validChallenge, challenge_id: 42 })).toThrow(
      "Invalid challenge_id",
    );
  });

  it("throws when short_code is missing", () => {
    const { short_code, ...rest } = validChallenge;
    expect(() => ChallengeSchema.parse(rest)).toThrow("Invalid short_code");
  });

  it("throws when rp_challenge is not a string", () => {
    expect(() => ChallengeSchema.parse({ ...validChallenge, rp_challenge: 123 })).toThrow(
      "Invalid rp_challenge",
    );
  });

  it("throws when cutoff_days is not a number", () => {
    expect(() => ChallengeSchema.parse({ ...validChallenge, cutoff_days: "6570" })).toThrow(
      "Invalid cutoff_days",
    );
  });

  it("throws when verifying_key_id is not a number", () => {
    expect(() =>
      ChallengeSchema.parse({ ...validChallenge, verifying_key_id: "1" }),
    ).toThrow("Invalid verifying_key_id");
  });

  it("throws when submit_secret is not a string", () => {
    expect(() =>
      ChallengeSchema.parse({ ...validChallenge, submit_secret: null }),
    ).toThrow("Invalid submit_secret");
  });

  it("throws when expires_at is not a number", () => {
    expect(() =>
      ChallengeSchema.parse({ ...validChallenge, expires_at: "2026-06-01" }),
    ).toThrow("Invalid expires_at");
  });

  it("throws when status_url is not a string", () => {
    expect(() =>
      ChallengeSchema.parse({ ...validChallenge, status_url: 42 }),
    ).toThrow("Invalid status_url");
  });

  it("throws when verify_url is not a string", () => {
    expect(() =>
      ChallengeSchema.parse({ ...validChallenge, verify_url: false }),
    ).toThrow("Invalid verify_url");
  });
});

// ---------------------------------------------------------------------------
// StatusSchema
// ---------------------------------------------------------------------------

describe("StatusSchema.parse", () => {
  const validStatus = {
    status: "pending",
    expires_at: "2026-06-01T00:00:00Z",
  };

  it("returns the object when all fields are valid", () => {
    const result = StatusSchema.parse(validStatus);
    expect(result).toBe(validStatus);
  });

  it("throws for null input", () => {
    expect(() => StatusSchema.parse(null)).toThrow("not an object");
  });

  it("throws for a number input", () => {
    expect(() => StatusSchema.parse(42)).toThrow("not an object");
  });

  it("throws when status field is missing", () => {
    expect(() => StatusSchema.parse({ expires_at: "2026-06-01T00:00:00Z" })).toThrow(
      "Invalid status field",
    );
  });

  it("throws when status field is not a string", () => {
    expect(() =>
      StatusSchema.parse({ status: 123, expires_at: "2026-06-01T00:00:00Z" }),
    ).toThrow("Invalid status field");
  });

  it("throws when expires_at is missing", () => {
    expect(() => StatusSchema.parse({ status: "pending" })).toThrow("Invalid expires_at");
  });

  it("throws when expires_at is not a string", () => {
    expect(() =>
      StatusSchema.parse({ status: "pending", expires_at: 1717200000 }),
    ).toThrow("Invalid expires_at");
  });

  it("throws when expires_at is not a valid date string", () => {
    expect(() =>
      StatusSchema.parse({ status: "pending", expires_at: "not-a-date" }),
    ).toThrow("not a valid date");
  });
});
