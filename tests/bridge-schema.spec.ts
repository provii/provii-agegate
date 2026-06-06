// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Bridge schema parity tests. The schema is mirrored in
 * provii-docs/src/lib/styler-bridge-schema.ts; any behavioural drift
 * breaks the styler ⇄ preview channel.
 */

import {
  AGEGATE_CONFIG_MESSAGE_TYPE,
  AGEGATE_CONFIG_MESSAGE_VERSION,
  buildConfigMessage,
  parseConfigMessage,
  type AgegateConfigPayload,
} from "../src/modes/bridge-schema.js";

function validPayload(): AgegateConfigPayload {
  return {
    brandColour: "#0091c7",
    accentGradient: ["#0091c7", "#5b3df5", "#c23ad6"],
    logoUrl: "https://example.com/logo.svg",
    locale: "en",
    containerRadius: 16,
    buttonRadius: 8,
    fontFamily: "system-ui",
    motionDuration: 220,
    privacyPolicyUrl: "https://example.com/privacy",
    strings: { headerTitle: "Verify your age" },
    dir: "ltr",
  };
}

describe("bridge schema parity", () => {
  it("accepts a well-formed message", () => {
    const parsed = parseConfigMessage(buildConfigMessage(validPayload()));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.type).toBe(AGEGATE_CONFIG_MESSAGE_TYPE);
    expect(parsed.value.version).toBe(AGEGATE_CONFIG_MESSAGE_VERSION);
  });

  it("rejects short-hand hex colour", () => {
    expect(
      parseConfigMessage(
        buildConfigMessage({
          ...validPayload(),
          brandColour: "#fff" as unknown as string,
        }),
      ).ok,
    ).toBe(false);
  });

  it("rejects non-https logo URLs", () => {
    expect(
      parseConfigMessage(
        buildConfigMessage({
          ...validPayload(),
          logoUrl: "http://example.com/logo.svg",
        }),
      ).ok,
    ).toBe(false);
  });

  it("rejects accentGradient with wrong arity", () => {
    expect(
      parseConfigMessage(
        buildConfigMessage({
          ...validPayload(),
          accentGradient: ["#000000", "#111111"] as unknown as [
            string,
            string,
            string,
          ],
        }),
      ).ok,
    ).toBe(false);
  });

  it("rejects scripted logoSvg", () => {
    expect(
      parseConfigMessage(
        buildConfigMessage({
          ...validPayload(),
          logoSvg: "<svg><script>alert(1)</script></svg>",
        }),
      ).ok,
    ).toBe(false);
  });

  it("rejects malformed strings keys", () => {
    expect(
      parseConfigMessage(
        buildConfigMessage({
          ...validPayload(),
          strings: { "bad-key": "x" },
        }),
      ).ok,
    ).toBe(false);
  });

  it("rejects a version bump without an opt-in", () => {
    expect(
      parseConfigMessage({
        type: AGEGATE_CONFIG_MESSAGE_TYPE,
        version: 2,
        config: validPayload(),
      }).ok,
    ).toBe(false);
  });

  it("rejects non-object payloads", () => {
    expect(parseConfigMessage(null).ok).toBe(false);
    expect(parseConfigMessage("string").ok).toBe(false);
    expect(parseConfigMessage([]).ok).toBe(false);
  });
});
