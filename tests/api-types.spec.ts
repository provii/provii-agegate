// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

import { StatusSchema } from "../src/types/api.js";

describe("StatusSchema", () => {
  const validStatusObject = {
    status: "pending",
    expires_at: "2026-06-01T00:00:00Z",
  };

  it("accepts a valid ISO 8601 expires_at string", () => {
    expect(() => StatusSchema.parse(validStatusObject)).not.toThrow();
  });

  it("throws when expires_at is missing", () => {
    const input = { status: "pending" };
    expect(() => StatusSchema.parse(input)).toThrow("Invalid expires_at");
  });

  it("throws when expires_at is a number (wrong type)", () => {
    const input = { status: "pending", expires_at: 1717200000 };
    expect(() => StatusSchema.parse(input)).toThrow("Invalid expires_at");
  });

  it("throws when expires_at is null", () => {
    const input = { status: "pending", expires_at: null };
    expect(() => StatusSchema.parse(input)).toThrow("Invalid expires_at");
  });

  it("throws when expires_at is a non-date string", () => {
    const input = { status: "pending", expires_at: "not-a-date" };
    expect(() => StatusSchema.parse(input)).toThrow(
      "Invalid expires_at: not a valid date",
    );
  });
});
