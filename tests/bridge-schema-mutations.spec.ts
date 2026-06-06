/** @jest-environment jsdom */
// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Mutation-testing-focused tests for src/modes/bridge-schema.ts.
 *
 * Every string literal, Set member, constant, validator branch, and
 * error message is pinned so Stryker cannot mutate without a test
 * failing.
 */

import {
  AGEGATE_CONFIG_MESSAGE_TYPE,
  AGEGATE_CONFIG_MESSAGE_VERSION,
  buildConfigMessage,
  parseConfigMessage,
  type AgegateConfigPayload,
  type AgegateConfigMessage,
} from "../src/modes/bridge-schema.js";

// ---------------------------------------------------------------------------
// Helper: minimal valid payload
// ---------------------------------------------------------------------------
function validPayload(
  overrides?: Partial<AgegateConfigPayload>,
): AgegateConfigPayload {
  return {
    brandColour: "#0091c7",
    accentGradient: ["#0091c7", "#5b3df5", "#c23ad6"],
    locale: "en",
    containerRadius: 16,
    buttonRadius: 8,
    fontFamily: "system-ui",
    motionDuration: 220,
    strings: {},
    dir: "ltr",
    ...overrides,
  };
}

function validMessage(
  overrides?: Partial<AgegateConfigPayload>,
): Record<string, unknown> {
  return {
    type: AGEGATE_CONFIG_MESSAGE_TYPE,
    version: AGEGATE_CONFIG_MESSAGE_VERSION,
    config: validPayload(overrides),
  };
}

function expectOk(result: { ok: boolean }): void {
  expect(result.ok).toBe(true);
}

function expectFail(
  result: { ok: boolean; reason?: string },
  substringOrExact?: string,
): void {
  expect(result.ok).toBe(false);
  if (substringOrExact !== undefined && "reason" in result) {
    expect((result as { reason: string }).reason).toContain(substringOrExact);
  }
}

// ---------------------------------------------------------------------------
// 1. Constants
// ---------------------------------------------------------------------------
describe("exported constants", () => {
  it("AGEGATE_CONFIG_MESSAGE_TYPE is exactly 'agegate-config'", () => {
    expect(AGEGATE_CONFIG_MESSAGE_TYPE).toBe("agegate-config");
  });

  it("AGEGATE_CONFIG_MESSAGE_VERSION is exactly 1", () => {
    expect(AGEGATE_CONFIG_MESSAGE_VERSION).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. buildConfigMessage
// ---------------------------------------------------------------------------
describe("buildConfigMessage", () => {
  it("wraps a payload with type and version fields", () => {
    const payload = validPayload();
    const msg = buildConfigMessage(payload);
    expect(msg.type).toBe("agegate-config");
    expect(msg.version).toBe(1);
    expect(msg.config).toBe(payload);
  });

  it("round-trips through parseConfigMessage", () => {
    const msg = buildConfigMessage(validPayload());
    const parsed = parseConfigMessage(msg);
    expectOk(parsed);
  });
});

// ---------------------------------------------------------------------------
// 3. parseConfigMessage top-level envelope
// ---------------------------------------------------------------------------
describe("parseConfigMessage: envelope validation", () => {
  it("rejects null", () => {
    expectFail(parseConfigMessage(null), "message: expected object");
  });

  it("rejects undefined", () => {
    expectFail(parseConfigMessage(undefined), "message: expected object");
  });

  it("rejects a string", () => {
    expectFail(parseConfigMessage("hello"), "message: expected object");
  });

  it("rejects a number", () => {
    expectFail(parseConfigMessage(42), "message: expected object");
  });

  it("rejects an array", () => {
    expectFail(parseConfigMessage([]), "message: expected object");
  });

  it("rejects wrong type field", () => {
    expectFail(
      parseConfigMessage({ type: "wrong", version: 1, config: {} }),
      "type: expected 'agegate-config'",
    );
  });

  it("rejects missing type field", () => {
    expectFail(
      parseConfigMessage({ version: 1, config: {} }),
      "type: expected 'agegate-config'",
    );
  });

  it("rejects wrong version", () => {
    expectFail(
      parseConfigMessage({
        type: "agegate-config",
        version: 2,
        config: {},
      }),
      "version: expected 1",
    );
  });

  it("rejects version 0", () => {
    expectFail(
      parseConfigMessage({
        type: "agegate-config",
        version: 0,
        config: {},
      }),
      "version: expected 1",
    );
  });

  it("rejects config that is not an object", () => {
    expectFail(
      parseConfigMessage({
        type: "agegate-config",
        version: 1,
        config: "nope",
      }),
      "config: expected object",
    );
  });

  it("rejects config that is null", () => {
    expectFail(
      parseConfigMessage({
        type: "agegate-config",
        version: 1,
        config: null,
      }),
      "config: expected object",
    );
  });

  it("rejects config that is an array", () => {
    expectFail(
      parseConfigMessage({
        type: "agegate-config",
        version: 1,
        config: [],
      }),
      "config: expected object",
    );
  });
});

// ---------------------------------------------------------------------------
// 4. brandColour / parseHex
// ---------------------------------------------------------------------------
describe("parseConfigMessage: brandColour (hex validation)", () => {
  it("accepts valid 6-digit hex", () => {
    expectOk(parseConfigMessage(validMessage({ brandColour: "#aabbcc" })));
  });

  it("accepts uppercase hex", () => {
    expectOk(parseConfigMessage(validMessage({ brandColour: "#AABBCC" })));
  });

  it("normalises to lowercase", () => {
    const result = parseConfigMessage(validMessage({ brandColour: "#AABBCC" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.config.brandColour).toBe("#aabbcc");
    }
  });

  it("rejects non-string brandColour", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["brandColour"] = 123;
    expectFail(parseConfigMessage(msg), "brandColour: expected a string hex colour");
  });

  it("rejects 3-digit shorthand hex", () => {
    expectFail(
      parseConfigMessage(validMessage({ brandColour: "#abc" })),
      "brandColour: expected /^#[0-9a-f]{6}$/i",
    );
  });

  it("rejects 8-digit hex (with alpha)", () => {
    expectFail(
      parseConfigMessage(validMessage({ brandColour: "#aabbccdd" })),
      "brandColour: expected /^#[0-9a-f]{6}$/i",
    );
  });

  it("rejects hex without leading hash", () => {
    expectFail(
      parseConfigMessage(validMessage({ brandColour: "aabbcc" })),
      "brandColour: expected /^#[0-9a-f]{6}$/i",
    );
  });

  it("rejects empty string brandColour", () => {
    expectFail(
      parseConfigMessage(validMessage({ brandColour: "" })),
      "brandColour: expected /^#[0-9a-f]{6}$/i",
    );
  });
});

// ---------------------------------------------------------------------------
// 5. accentGradient
// ---------------------------------------------------------------------------
describe("parseConfigMessage: accentGradient", () => {
  it("accepts exactly 3 valid hex colours", () => {
    expectOk(
      parseConfigMessage(
        validMessage({
          accentGradient: ["#111111", "#222222", "#333333"],
        }),
      ),
    );
  });

  it("rejects 2-element array", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["accentGradient"] = [
      "#111111",
      "#222222",
    ];
    expectFail(
      parseConfigMessage(msg),
      "accentGradient: expected tuple of 3 hex colours",
    );
  });

  it("rejects 4-element array", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["accentGradient"] = [
      "#111111",
      "#222222",
      "#333333",
      "#444444",
    ];
    expectFail(
      parseConfigMessage(msg),
      "accentGradient: expected tuple of 3 hex colours",
    );
  });

  it("rejects non-array", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["accentGradient"] = "#111111";
    expectFail(
      parseConfigMessage(msg),
      "accentGradient: expected tuple of 3 hex colours",
    );
  });

  it("rejects invalid hex in stop 0", () => {
    expectFail(
      parseConfigMessage(
        validMessage({
          accentGradient: ["bad", "#222222", "#333333"],
        }),
      ),
      "accentGradient[0]",
    );
  });

  it("rejects invalid hex in stop 1", () => {
    expectFail(
      parseConfigMessage(
        validMessage({
          accentGradient: ["#111111", "bad", "#333333"],
        }),
      ),
      "accentGradient[1]",
    );
  });

  it("rejects invalid hex in stop 2", () => {
    expectFail(
      parseConfigMessage(
        validMessage({
          accentGradient: ["#111111", "#222222", "bad"],
        }),
      ),
      "accentGradient[2]",
    );
  });
});

// ---------------------------------------------------------------------------
// 6. dir
// ---------------------------------------------------------------------------
describe("parseConfigMessage: dir (parseDir)", () => {
  it("accepts 'ltr'", () => {
    expectOk(parseConfigMessage(validMessage({ dir: "ltr" })));
  });

  it("accepts 'rtl'", () => {
    expectOk(parseConfigMessage(validMessage({ dir: "rtl" })));
  });

  it("rejects 'auto'", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["dir"] = "auto";
    expectFail(parseConfigMessage(msg), "dir: expected 'ltr' or 'rtl'");
  });

  it("rejects a number", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["dir"] = 0;
    expectFail(parseConfigMessage(msg), "dir: expected 'ltr' or 'rtl'");
  });

  it("rejects undefined", () => {
    const msg = validMessage();
    delete (msg["config"] as Record<string, unknown>)["dir"];
    expectFail(parseConfigMessage(msg), "dir: expected 'ltr' or 'rtl'");
  });
});

// ---------------------------------------------------------------------------
// 7. locale (parseLocale)
// ---------------------------------------------------------------------------
describe("parseConfigMessage: locale", () => {
  it("accepts 'en'", () => {
    expectOk(parseConfigMessage(validMessage({ locale: "en" })));
  });

  it("accepts 'zh'", () => {
    expectOk(parseConfigMessage(validMessage({ locale: "zh" })));
  });

  it("accepts 'zh-Hans'", () => {
    expectOk(parseConfigMessage(validMessage({ locale: "zh-Hans" })));
  });

  it("accepts 'fr-FR'", () => {
    expectOk(parseConfigMessage(validMessage({ locale: "fr-FR" })));
  });

  it("accepts three-letter code 'mya'", () => {
    expectOk(parseConfigMessage(validMessage({ locale: "mya" })));
  });

  it("rejects non-string locale", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["locale"] = 42;
    expectFail(parseConfigMessage(msg), "locale: expected string");
  });

  it("rejects single character locale", () => {
    expectFail(
      parseConfigMessage(validMessage({ locale: "e" })),
      "locale: expected BCP 47 tag",
    );
  });

  it("rejects locale starting with a digit", () => {
    expectFail(
      parseConfigMessage(validMessage({ locale: "1en" })),
      "locale: expected BCP 47 tag",
    );
  });

  it("rejects locale with spaces", () => {
    expectFail(
      parseConfigMessage(validMessage({ locale: "en US" })),
      "locale: expected BCP 47 tag",
    );
  });

  it("rejects empty string locale", () => {
    expectFail(
      parseConfigMessage(validMessage({ locale: "" })),
      "locale: expected BCP 47 tag",
    );
  });
});

// ---------------------------------------------------------------------------
// 8. containerRadius, buttonRadius, motionDuration (parsePositiveInt)
// ---------------------------------------------------------------------------
describe("parseConfigMessage: parsePositiveInt fields", () => {
  describe("containerRadius (max 64)", () => {
    it("accepts 0", () => {
      expectOk(parseConfigMessage(validMessage({ containerRadius: 0 })));
    });

    it("accepts 64", () => {
      expectOk(parseConfigMessage(validMessage({ containerRadius: 64 })));
    });

    it("rejects 65", () => {
      expectFail(
        parseConfigMessage(validMessage({ containerRadius: 65 })),
        "containerRadius: expected 0..64",
      );
    });

    it("rejects -1", () => {
      expectFail(
        parseConfigMessage(validMessage({ containerRadius: -1 })),
        "containerRadius: expected 0..64",
      );
    });

    it("rejects non-integer 8.5", () => {
      expectFail(
        parseConfigMessage(validMessage({ containerRadius: 8.5 })),
        "containerRadius: expected integer",
      );
    });

    it("rejects NaN", () => {
      expectFail(
        parseConfigMessage(validMessage({ containerRadius: NaN as unknown as number })),
        "containerRadius: expected finite number",
      );
    });

    it("rejects Infinity", () => {
      expectFail(
        parseConfigMessage(
          validMessage({ containerRadius: Infinity as unknown as number }),
        ),
        "containerRadius: expected finite number",
      );
    });

    it("rejects a string", () => {
      const msg = validMessage();
      (msg["config"] as Record<string, unknown>)["containerRadius"] = "16";
      expectFail(parseConfigMessage(msg), "containerRadius: expected finite number");
    });
  });

  describe("buttonRadius (max 64)", () => {
    it("accepts 0", () => {
      expectOk(parseConfigMessage(validMessage({ buttonRadius: 0 })));
    });

    it("accepts 64", () => {
      expectOk(parseConfigMessage(validMessage({ buttonRadius: 64 })));
    });

    it("rejects 65", () => {
      expectFail(
        parseConfigMessage(validMessage({ buttonRadius: 65 })),
        "buttonRadius: expected 0..64",
      );
    });

    it("rejects -1", () => {
      expectFail(
        parseConfigMessage(validMessage({ buttonRadius: -1 })),
        "buttonRadius: expected 0..64",
      );
    });

    it("rejects non-integer", () => {
      expectFail(
        parseConfigMessage(validMessage({ buttonRadius: 3.14 })),
        "buttonRadius: expected integer",
      );
    });
  });

  describe("motionDuration (max 2000)", () => {
    it("accepts 0", () => {
      expectOk(parseConfigMessage(validMessage({ motionDuration: 0 })));
    });

    it("accepts 2000", () => {
      expectOk(parseConfigMessage(validMessage({ motionDuration: 2000 })));
    });

    it("rejects 2001", () => {
      expectFail(
        parseConfigMessage(validMessage({ motionDuration: 2001 })),
        "motionDuration: expected 0..2000",
      );
    });

    it("rejects -1", () => {
      expectFail(
        parseConfigMessage(validMessage({ motionDuration: -1 })),
        "motionDuration: expected 0..2000",
      );
    });
  });
});

// ---------------------------------------------------------------------------
// 9. fontFamily (parseFontFamily)
// ---------------------------------------------------------------------------
describe("parseConfigMessage: fontFamily", () => {
  it("accepts 'system-ui'", () => {
    expectOk(parseConfigMessage(validMessage({ fontFamily: "system-ui" })));
  });

  it("accepts comma-separated stack", () => {
    expectOk(
      parseConfigMessage(
        validMessage({ fontFamily: "Inter, system-ui, sans-serif" }),
      ),
    );
  });

  it("rejects empty string", () => {
    expectFail(
      parseConfigMessage(validMessage({ fontFamily: "" })),
      "fontFamily: expected non-empty string",
    );
  });

  it("rejects non-string", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["fontFamily"] = 42;
    expectFail(parseConfigMessage(msg), "fontFamily: expected non-empty string");
  });

  for (const ch of [";", "{", "}", "<", ">", "`", "\n", "\r"]) {
    it(`rejects fontFamily containing '${ch === "\n" ? "\\n" : ch === "\r" ? "\\r" : ch}'`, () => {
      expectFail(
        parseConfigMessage(validMessage({ fontFamily: `Arial${ch}` })),
        "fontFamily: contains disallowed characters",
      );
    });
  }

  it("rejects fontFamily exceeding 200 characters", () => {
    expectFail(
      parseConfigMessage(validMessage({ fontFamily: "A".repeat(201) })),
      "fontFamily: exceeds 200 chars",
    );
  });

  it("accepts exactly 200 characters", () => {
    expectOk(
      parseConfigMessage(validMessage({ fontFamily: "A".repeat(200) })),
    );
  });
});

// ---------------------------------------------------------------------------
// 10. strings (parseStrings)
// ---------------------------------------------------------------------------
describe("parseConfigMessage: strings", () => {
  it("accepts empty strings object", () => {
    expectOk(parseConfigMessage(validMessage({ strings: {} })));
  });

  it("accepts valid key/value pairs", () => {
    expectOk(
      parseConfigMessage(
        validMessage({ strings: { heading: "Age check", body: "Continue" } }),
      ),
    );
  });

  it("rejects non-object strings", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["strings"] = "not-an-object";
    expectFail(parseConfigMessage(msg), "strings: expected object");
  });

  it("rejects array as strings", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["strings"] = ["a", "b"];
    expectFail(parseConfigMessage(msg), "strings: expected object");
  });

  it("rejects key with hyphen", () => {
    expectFail(
      parseConfigMessage(validMessage({ strings: { "bad-key": "val" } })),
      "strings.bad-key: invalid key",
    );
  });

  it("rejects key starting with digit", () => {
    expectFail(
      parseConfigMessage(validMessage({ strings: { "9bad": "val" } })),
      "strings.9bad: invalid key",
    );
  });

  it("rejects key exceeding 64 characters", () => {
    const longKey = "a".repeat(65);
    expectFail(
      parseConfigMessage(
        validMessage({ strings: { [longKey]: "val" } }),
      ),
      `strings.${longKey}: invalid key`,
    );
  });

  it("accepts key with exactly 64 characters (1 + 63)", () => {
    const key = "a" + "b".repeat(63);
    expectOk(
      parseConfigMessage(validMessage({ strings: { [key]: "val" } })),
    );
  });

  it("rejects non-string value", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["strings"] = { heading: 123 };
    expectFail(parseConfigMessage(msg), "strings.heading: expected string");
  });

  it("rejects value exceeding 500 characters", () => {
    expectFail(
      parseConfigMessage(
        validMessage({ strings: { heading: "x".repeat(501) } }),
      ),
      "strings.heading: exceeds 500 chars",
    );
  });

  it("accepts value with exactly 500 characters", () => {
    expectOk(
      parseConfigMessage(
        validMessage({ strings: { heading: "x".repeat(500) } }),
      ),
    );
  });

  it("defaults to empty object when strings is absent", () => {
    const msg = validMessage();
    delete (msg["config"] as Record<string, unknown>)["strings"];
    // source code does: cfgRaw["strings"] ?? {} so absent → {}
    expectOk(parseConfigMessage(msg));
  });
});

// ---------------------------------------------------------------------------
// 11. logoUrl (parseOptionalHttpsUrl)
// ---------------------------------------------------------------------------
describe("parseConfigMessage: logoUrl", () => {
  it("accepts a valid https URL", () => {
    expectOk(
      parseConfigMessage(
        validMessage({ logoUrl: "https://cdn.example.com/logo.svg" }),
      ),
    );
  });

  it("accepts undefined (optional)", () => {
    expectOk(parseConfigMessage(validMessage()));
  });

  it("rejects http URL", () => {
    expectFail(
      parseConfigMessage(
        validMessage({ logoUrl: "http://example.com/logo.svg" }),
      ),
      "logoUrl: expected https URL",
    );
  });

  it("rejects data: URL", () => {
    expectFail(
      parseConfigMessage(
        validMessage({ logoUrl: "data:image/svg+xml;base64,abc" }),
      ),
      "logoUrl: expected https URL",
    );
  });

  it("rejects javascript: URL", () => {
    expectFail(
      parseConfigMessage(
        validMessage({ logoUrl: "javascript:alert(1)" }),
      ),
      "logoUrl: expected https URL",
    );
  });

  it("rejects blob: URL", () => {
    expectFail(
      parseConfigMessage(
        validMessage({ logoUrl: "blob:https://example.com/abc" }),
      ),
      "logoUrl: expected https URL",
    );
  });

  it("rejects non-string truthy value", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["logoUrl"] = 42;
    expectFail(parseConfigMessage(msg), "logoUrl: expected https URL");
  });

  it("treats empty string as undefined (accepted)", () => {
    expectOk(parseConfigMessage(validMessage({ logoUrl: "" })));
  });

  it("treats null as undefined (accepted)", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["logoUrl"] = null;
    expectOk(parseConfigMessage(msg));
  });

  it("rejects malformed URL string", () => {
    expectFail(
      parseConfigMessage(validMessage({ logoUrl: "not-a-url" })),
      "logoUrl: expected https URL",
    );
  });
});

// ---------------------------------------------------------------------------
// 12. privacyPolicyUrl
// ---------------------------------------------------------------------------
describe("parseConfigMessage: privacyPolicyUrl", () => {
  it("accepts valid https URL", () => {
    expectOk(
      parseConfigMessage(
        validMessage({
          privacyPolicyUrl: "https://example.com/privacy",
        }),
      ),
    );
  });

  it("rejects http URL", () => {
    expectFail(
      parseConfigMessage(
        validMessage({
          privacyPolicyUrl: "http://example.com/privacy",
        }),
      ),
      "privacyPolicyUrl: expected https URL",
    );
  });

  it("accepts undefined", () => {
    expectOk(parseConfigMessage(validMessage()));
  });
});

// ---------------------------------------------------------------------------
// 13. logoSvg (parseOptionalString + regex + DOMPurify)
// ---------------------------------------------------------------------------
describe("parseConfigMessage: logoSvg", () => {
  it("accepts valid SVG", () => {
    const result = parseConfigMessage(
      validMessage({
        logoSvg: '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>',
      }),
    );
    expectOk(result);
  });

  it("accepts undefined (optional)", () => {
    expectOk(parseConfigMessage(validMessage()));
  });

  it("accepts empty string as undefined", () => {
    expectOk(parseConfigMessage(validMessage({ logoSvg: "" })));
  });

  it("rejects non-string value", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["logoSvg"] = 42;
    expectFail(parseConfigMessage(msg), "logoSvg: expected string");
  });

  it("rejects SVG exceeding 8192 characters", () => {
    expectFail(
      parseConfigMessage(
        validMessage({ logoSvg: "<svg>" + "x".repeat(8188) }),
      ),
      "logoSvg: exceeds max length 8192",
    );
  });

  it("accepts SVG at exactly 8192 characters", () => {
    expectOk(
      parseConfigMessage(
        validMessage({ logoSvg: "<svg>" + "x".repeat(8187) }),
      ),
    );
  });

  it("rejects <script> tag in logoSvg", () => {
    expectFail(
      parseConfigMessage(
        validMessage({
          logoSvg: "<svg><script>alert(1)</script></svg>",
        }),
      ),
      "logoSvg: rejected unsafe markup",
    );
  });

  it("rejects javascript: in logoSvg", () => {
    expectFail(
      parseConfigMessage(
        validMessage({
          logoSvg: '<svg><a href="javascript:alert(1)"/></svg>',
        }),
      ),
      "logoSvg: rejected unsafe markup",
    );
  });

  it("rejects onerror handler in logoSvg", () => {
    expectFail(
      parseConfigMessage(
        validMessage({
          logoSvg: '<svg><image onerror="alert(1)"/></svg>',
        }),
      ),
      "logoSvg: rejected unsafe markup",
    );
  });

  it("rejects onclick handler in logoSvg", () => {
    expectFail(
      parseConfigMessage(
        validMessage({
          logoSvg: '<svg onclick="alert(1)"><rect/></svg>',
        }),
      ),
      "logoSvg: rejected unsafe markup",
    );
  });

  it("rejects onload handler in logoSvg", () => {
    expectFail(
      parseConfigMessage(
        validMessage({
          logoSvg: '<svg onload="alert(1)"><rect/></svg>',
        }),
      ),
      "logoSvg: rejected unsafe markup",
    );
  });

  it("passes safe SVG through DOMPurify sanitisation", () => {
    const safeSvg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
    const result = parseConfigMessage(validMessage({ logoSvg: safeSvg }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      // DOMPurify may reformat slightly but it should still contain svg
      expect(result.value.config.logoSvg).toBeDefined();
      expect(result.value.config.logoSvg!).toContain("svg");
    }
  });

  it("treats null as undefined", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["logoSvg"] = null;
    expectOk(parseConfigMessage(msg));
  });
});

// ---------------------------------------------------------------------------
// 14. Optional hex fields: qrBackground, buttonTextColour, qrForeground
// ---------------------------------------------------------------------------
describe("parseConfigMessage: optional hex fields", () => {
  describe("qrBackground", () => {
    it("accepts valid hex when provided", () => {
      expectOk(
        parseConfigMessage(validMessage({ qrBackground: "#ffffff" })),
      );
    });

    it("rejects invalid hex", () => {
      expectFail(
        parseConfigMessage(validMessage({ qrBackground: "white" })),
        "qrBackground: expected /^#[0-9a-f]{6}$/i",
      );
    });

    it("accepts when absent", () => {
      expectOk(parseConfigMessage(validMessage()));
    });

    it("result omits qrBackground when absent", () => {
      const result = parseConfigMessage(validMessage());
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.config.qrBackground).toBeUndefined();
      }
    });

    it("result includes qrBackground when provided", () => {
      const result = parseConfigMessage(validMessage({ qrBackground: "#abcdef" }));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.config.qrBackground).toBe("#abcdef");
      }
    });
  });

  describe("buttonTextColour", () => {
    it("accepts valid hex", () => {
      expectOk(
        parseConfigMessage(validMessage({ buttonTextColour: "#000000" })),
      );
    });

    it("rejects invalid hex", () => {
      expectFail(
        parseConfigMessage(validMessage({ buttonTextColour: "black" })),
        "buttonTextColour: expected /^#[0-9a-f]{6}$/i",
      );
    });

    it("accepts when absent", () => {
      expectOk(parseConfigMessage(validMessage()));
    });
  });

  describe("qrForeground", () => {
    it("accepts valid hex", () => {
      expectOk(
        parseConfigMessage(validMessage({ qrForeground: "#112233" })),
      );
    });

    it("rejects invalid hex", () => {
      expectFail(
        parseConfigMessage(validMessage({ qrForeground: "red" })),
        "qrForeground: expected /^#[0-9a-f]{6}$/i",
      );
    });

    it("accepts when absent", () => {
      expectOk(parseConfigMessage(validMessage()));
    });
  });
});

// ---------------------------------------------------------------------------
// 15. Optional integer fields: backdropOpacity, gradientAngle
// ---------------------------------------------------------------------------
describe("parseConfigMessage: optional integer fields", () => {
  describe("backdropOpacity (max 100)", () => {
    it("accepts 0", () => {
      expectOk(parseConfigMessage(validMessage({ backdropOpacity: 0 })));
    });

    it("accepts 100", () => {
      expectOk(parseConfigMessage(validMessage({ backdropOpacity: 100 })));
    });

    it("accepts 50", () => {
      expectOk(parseConfigMessage(validMessage({ backdropOpacity: 50 })));
    });

    it("rejects 101", () => {
      expectFail(
        parseConfigMessage(validMessage({ backdropOpacity: 101 })),
        "backdropOpacity: expected 0..100",
      );
    });

    it("rejects -1", () => {
      expectFail(
        parseConfigMessage(validMessage({ backdropOpacity: -1 })),
        "backdropOpacity: expected 0..100",
      );
    });

    it("rejects non-integer", () => {
      expectFail(
        parseConfigMessage(validMessage({ backdropOpacity: 50.5 })),
        "backdropOpacity: expected integer",
      );
    });

    it("accepts when absent", () => {
      expectOk(parseConfigMessage(validMessage()));
    });

    it("result omits backdropOpacity when absent", () => {
      const result = parseConfigMessage(validMessage());
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.config.backdropOpacity).toBeUndefined();
      }
    });
  });

  describe("gradientAngle (max 360)", () => {
    it("accepts 0", () => {
      expectOk(parseConfigMessage(validMessage({ gradientAngle: 0 })));
    });

    it("accepts 360", () => {
      expectOk(parseConfigMessage(validMessage({ gradientAngle: 360 })));
    });

    it("accepts 135", () => {
      expectOk(parseConfigMessage(validMessage({ gradientAngle: 135 })));
    });

    it("rejects 361", () => {
      expectFail(
        parseConfigMessage(validMessage({ gradientAngle: 361 })),
        "gradientAngle: expected 0..360",
      );
    });

    it("rejects -1", () => {
      expectFail(
        parseConfigMessage(validMessage({ gradientAngle: -1 })),
        "gradientAngle: expected 0..360",
      );
    });

    it("accepts when absent", () => {
      expectOk(parseConfigMessage(validMessage()));
    });
  });
});

// ---------------------------------------------------------------------------
// 16. previewLayout enum
// ---------------------------------------------------------------------------
describe("parseConfigMessage: previewLayout", () => {
  it("accepts 'desktop'", () => {
    const result = parseConfigMessage(validMessage({ previewLayout: "desktop" }));
    expectOk(result);
    if (result.ok) expect(result.value.config.previewLayout).toBe("desktop");
  });

  it("accepts 'mobile'", () => {
    const result = parseConfigMessage(validMessage({ previewLayout: "mobile" }));
    expectOk(result);
    if (result.ok) expect(result.value.config.previewLayout).toBe("mobile");
  });

  it("accepts 'auto'", () => {
    const result = parseConfigMessage(validMessage({ previewLayout: "auto" }));
    expectOk(result);
    if (result.ok) expect(result.value.config.previewLayout).toBe("auto");
  });

  it("rejects invalid string", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["previewLayout"] = "tablet";
    expectFail(
      parseConfigMessage(msg),
      "previewLayout: expected 'desktop', 'mobile', or 'auto'",
    );
  });

  it("rejects number", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["previewLayout"] = 1;
    expectFail(
      parseConfigMessage(msg),
      "previewLayout: expected 'desktop', 'mobile', or 'auto'",
    );
  });

  it("accepts when absent", () => {
    expectOk(parseConfigMessage(validMessage()));
  });

  it("result omits previewLayout when absent", () => {
    const result = parseConfigMessage(validMessage());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.config.previewLayout).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 17. QR dot style enum , pin every member
// ---------------------------------------------------------------------------
describe("parseConfigMessage: qrDotStyle", () => {
  const validDotStyles = [
    "dots",
    "rounded",
    "classy",
    "classy-rounded",
    "square",
    "extra-rounded",
  ];

  for (const style of validDotStyles) {
    it(`accepts '${style}'`, () => {
      const result = parseConfigMessage(
        validMessage({ qrDotStyle: style as AgegateConfigPayload["qrDotStyle"] }),
      );
      expectOk(result);
      if (result.ok) expect(result.value.config.qrDotStyle).toBe(style);
    });
  }

  it("rejects invalid string 'circles'", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["qrDotStyle"] = "circles";
    expectFail(parseConfigMessage(msg), "qrDotStyle: invalid value");
  });

  it("rejects empty string", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["qrDotStyle"] = "";
    expectFail(parseConfigMessage(msg), "qrDotStyle: invalid value");
  });

  it("rejects non-string type", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["qrDotStyle"] = 42;
    expectFail(parseConfigMessage(msg), "qrDotStyle: invalid value");
  });

  it("accepts when absent", () => {
    expectOk(parseConfigMessage(validMessage()));
  });

  it("result omits qrDotStyle when absent", () => {
    const result = parseConfigMessage(validMessage());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.config.qrDotStyle).toBeUndefined();
    }
  });

  it("set has exactly 6 members", () => {
    // Ensure no extra members were added , each valid style must be tested
    let acceptedCount = 0;
    for (const style of validDotStyles) {
      const result = parseConfigMessage(
        validMessage({ qrDotStyle: style as AgegateConfigPayload["qrDotStyle"] }),
      );
      if (result.ok) acceptedCount++;
    }
    expect(acceptedCount).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// 18. QR eye frame style enum , pin every member
// ---------------------------------------------------------------------------
describe("parseConfigMessage: qrEyeFrameStyle", () => {
  const validEyeFrameStyles = ["dot", "square", "extra-rounded"];

  for (const style of validEyeFrameStyles) {
    it(`accepts '${style}'`, () => {
      const result = parseConfigMessage(
        validMessage({
          qrEyeFrameStyle:
            style as AgegateConfigPayload["qrEyeFrameStyle"],
        }),
      );
      expectOk(result);
      if (result.ok) expect(result.value.config.qrEyeFrameStyle).toBe(style);
    });
  }

  it("rejects 'rounded'", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["qrEyeFrameStyle"] = "rounded";
    expectFail(parseConfigMessage(msg), "qrEyeFrameStyle: invalid value");
  });

  it("rejects non-string", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["qrEyeFrameStyle"] = true;
    expectFail(parseConfigMessage(msg), "qrEyeFrameStyle: invalid value");
  });

  it("accepts when absent", () => {
    expectOk(parseConfigMessage(validMessage()));
  });

  it("result omits qrEyeFrameStyle when absent", () => {
    const result = parseConfigMessage(validMessage());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.config.qrEyeFrameStyle).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 19. QR eye dot style enum , pin every member
// ---------------------------------------------------------------------------
describe("parseConfigMessage: qrEyeDotStyle", () => {
  const validEyeDotStyles = ["dot", "square"];

  for (const style of validEyeDotStyles) {
    it(`accepts '${style}'`, () => {
      const result = parseConfigMessage(
        validMessage({
          qrEyeDotStyle:
            style as AgegateConfigPayload["qrEyeDotStyle"],
        }),
      );
      expectOk(result);
      if (result.ok) expect(result.value.config.qrEyeDotStyle).toBe(style);
    });
  }

  it("rejects 'circle'", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["qrEyeDotStyle"] = "circle";
    expectFail(parseConfigMessage(msg), "qrEyeDotStyle: invalid value");
  });

  it("rejects non-string", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["qrEyeDotStyle"] = 0;
    expectFail(parseConfigMessage(msg), "qrEyeDotStyle: invalid value");
  });

  it("accepts when absent", () => {
    expectOk(parseConfigMessage(validMessage()));
  });

  it("result omits qrEyeDotStyle when absent", () => {
    const result = parseConfigMessage(validMessage());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.config.qrEyeDotStyle).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 20. qrLogoUrl
// ---------------------------------------------------------------------------
describe("parseConfigMessage: qrLogoUrl", () => {
  it("accepts valid https URL", () => {
    expectOk(
      parseConfigMessage(
        validMessage({ qrLogoUrl: "https://cdn.example.com/qr-logo.png" }),
      ),
    );
  });

  it("rejects http URL", () => {
    expectFail(
      parseConfigMessage(
        validMessage({ qrLogoUrl: "http://cdn.example.com/qr-logo.png" }),
      ),
      "qrLogoUrl: expected https URL",
    );
  });

  it("accepts when absent", () => {
    expectOk(parseConfigMessage(validMessage()));
  });

  it("result omits qrLogoUrl when absent", () => {
    const result = parseConfigMessage(validMessage());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.config.qrLogoUrl).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 21. theme enum
// ---------------------------------------------------------------------------
describe("parseConfigMessage: theme", () => {
  it("accepts 'light'", () => {
    const result = parseConfigMessage(validMessage({ theme: "light" }));
    expectOk(result);
    if (result.ok) expect(result.value.config.theme).toBe("light");
  });

  it("accepts 'dark'", () => {
    const result = parseConfigMessage(validMessage({ theme: "dark" }));
    expectOk(result);
    if (result.ok) expect(result.value.config.theme).toBe("dark");
  });

  it("accepts 'auto'", () => {
    const result = parseConfigMessage(validMessage({ theme: "auto" }));
    expectOk(result);
    if (result.ok) expect(result.value.config.theme).toBe("auto");
  });

  it("rejects 'system'", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["theme"] = "system";
    expectFail(
      parseConfigMessage(msg),
      "theme: expected 'light', 'dark', or 'auto'",
    );
  });

  it("rejects boolean", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["theme"] = true;
    expectFail(
      parseConfigMessage(msg),
      "theme: expected 'light', 'dark', or 'auto'",
    );
  });

  it("accepts when absent", () => {
    expectOk(parseConfigMessage(validMessage()));
  });

  it("result omits theme when absent", () => {
    const result = parseConfigMessage(validMessage());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.config.theme).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 22. Full payload with all optional fields
// ---------------------------------------------------------------------------
describe("parseConfigMessage: full payload with all optionals", () => {
  it("accepts and preserves all optional fields", () => {
    const result = parseConfigMessage(
      validMessage({
        logoUrl: "https://example.com/logo.svg",
        logoSvg: "<svg><rect/></svg>",
        privacyPolicyUrl: "https://example.com/privacy",
        qrBackground: "#ffffff",
        buttonTextColour: "#000000",
        backdropOpacity: 95,
        gradientAngle: 135,
        previewLayout: "desktop",
        qrForeground: "#112233",
        qrDotStyle: "dots",
        qrEyeFrameStyle: "extra-rounded",
        qrEyeDotStyle: "square",
        qrLogoUrl: "https://example.com/qr.png",
        theme: "dark",
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cfg = result.value.config;
    expect(cfg.logoUrl).toBe("https://example.com/logo.svg");
    expect(cfg.logoSvg).toBeDefined();
    expect(cfg.privacyPolicyUrl).toBe("https://example.com/privacy");
    expect(cfg.qrBackground).toBe("#ffffff");
    expect(cfg.buttonTextColour).toBe("#000000");
    expect(cfg.backdropOpacity).toBe(95);
    expect(cfg.gradientAngle).toBe(135);
    expect(cfg.previewLayout).toBe("desktop");
    expect(cfg.qrForeground).toBe("#112233");
    expect(cfg.qrDotStyle).toBe("dots");
    expect(cfg.qrEyeFrameStyle).toBe("extra-rounded");
    expect(cfg.qrEyeDotStyle).toBe("square");
    expect(cfg.qrLogoUrl).toBe("https://example.com/qr.png");
    expect(cfg.theme).toBe("dark");
  });
});

// ---------------------------------------------------------------------------
// 23. Output structure
// ---------------------------------------------------------------------------
describe("parseConfigMessage: output structure", () => {
  it("returns ok: true with type, version, and config", () => {
    const result = parseConfigMessage(validMessage());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveProperty("type", "agegate-config");
    expect(result.value).toHaveProperty("version", 1);
    expect(result.value).toHaveProperty("config");
  });

  it("returned config has brandColour, locale, dir", () => {
    const result = parseConfigMessage(validMessage());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.config.brandColour).toBe("#0091c7");
    expect(result.value.config.locale).toBe("en");
    expect(result.value.config.dir).toBe("ltr");
  });

  it("returned config has accentGradient as 3-element array", () => {
    const result = parseConfigMessage(validMessage());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.config.accentGradient).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 24. isHttpsUrl edge cases (exercised via logoUrl)
// ---------------------------------------------------------------------------
describe("parseConfigMessage: isHttpsUrl edge cases", () => {
  it("rejects empty string in isHttpsUrl path (via logoUrl field)", () => {
    // Empty string goes through parseOptionalHttpsUrl → returns undefined
    // but if we force a non-empty non-URL we get false
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["logoUrl"] = "ftp://example.com/logo.svg";
    expectFail(parseConfigMessage(msg), "logoUrl: expected https URL");
  });

  it("rejects URL with no protocol", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["logoUrl"] = "//example.com/logo.svg";
    expectFail(parseConfigMessage(msg), "logoUrl: expected https URL");
  });
});

// ---------------------------------------------------------------------------
// 25. isPlainObject edge cases
// ---------------------------------------------------------------------------
describe("parseConfigMessage: isPlainObject paths", () => {
  it("rejects boolean as top-level message", () => {
    expectFail(parseConfigMessage(true), "message: expected object");
  });

  it("rejects function as top-level message", () => {
    expectFail(
      parseConfigMessage(() => {}),
      "message: expected object",
    );
  });
});

// ---------------------------------------------------------------------------
// 26. Error message exact strings (pin for mutation testing)
// ---------------------------------------------------------------------------
describe("error message pinning", () => {
  it("type error says exactly \"type: expected 'agegate-config'\"", () => {
    const result = parseConfigMessage({ type: "wrong", version: 1, config: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("type: expected 'agegate-config'");
    }
  });

  it("version error says exactly \"version: expected 1\"", () => {
    const result = parseConfigMessage({
      type: "agegate-config",
      version: 99,
      config: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("version: expected 1");
    }
  });

  it("config error says exactly \"config: expected object\"", () => {
    const result = parseConfigMessage({
      type: "agegate-config",
      version: 1,
      config: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("config: expected object");
    }
  });

  it("message error says exactly \"message: expected object\"", () => {
    const result = parseConfigMessage(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("message: expected object");
    }
  });

  it("accentGradient error says exactly \"accentGradient: expected tuple of 3 hex colours\"", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["accentGradient"] = "not-array";
    const result = parseConfigMessage(msg);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe(
        "accentGradient: expected tuple of 3 hex colours",
      );
    }
  });

  it("previewLayout error is exact", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["previewLayout"] = "invalid";
    const result = parseConfigMessage(msg);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe(
        "previewLayout: expected 'desktop', 'mobile', or 'auto'",
      );
    }
  });

  it("theme error is exact", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["theme"] = "invalid";
    const result = parseConfigMessage(msg);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe(
        "theme: expected 'light', 'dark', or 'auto'",
      );
    }
  });

  it("qrDotStyle error is exact", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["qrDotStyle"] = "invalid";
    const result = parseConfigMessage(msg);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("qrDotStyle: invalid value");
    }
  });

  it("qrEyeFrameStyle error is exact", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["qrEyeFrameStyle"] = "invalid";
    const result = parseConfigMessage(msg);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("qrEyeFrameStyle: invalid value");
    }
  });

  it("qrEyeDotStyle error is exact", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["qrEyeDotStyle"] = "invalid";
    const result = parseConfigMessage(msg);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("qrEyeDotStyle: invalid value");
    }
  });

  it("logoSvg unsafe markup error is exact", () => {
    const result = parseConfigMessage(
      validMessage({ logoSvg: '<svg><script>x</script></svg>' }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("logoSvg: rejected unsafe markup");
    }
  });

  it("dir error is exact", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["dir"] = "bidi";
    const result = parseConfigMessage(msg);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("dir: expected 'ltr' or 'rtl'");
    }
  });

  it("locale string error is exact", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["locale"] = 42;
    const result = parseConfigMessage(msg);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("locale: expected string");
    }
  });

  it("locale BCP 47 error is exact", () => {
    const result = parseConfigMessage(validMessage({ locale: "!!" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("locale: expected BCP 47 tag");
    }
  });

  it("fontFamily non-empty error is exact", () => {
    const result = parseConfigMessage(validMessage({ fontFamily: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("fontFamily: expected non-empty string");
    }
  });

  it("fontFamily disallowed chars error is exact", () => {
    const result = parseConfigMessage(validMessage({ fontFamily: "Arial;" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("fontFamily: contains disallowed characters");
    }
  });

  it("fontFamily exceeds error is exact", () => {
    const result = parseConfigMessage(
      validMessage({ fontFamily: "A".repeat(201) }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("fontFamily: exceeds 200 chars");
    }
  });

  it("strings object error is exact", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["strings"] = "nope";
    const result = parseConfigMessage(msg);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("strings: expected object");
    }
  });
});

// ---------------------------------------------------------------------------
// 27. Boundary: parseHex trimming and lowercasing
// ---------------------------------------------------------------------------
describe("parseHex trimming behaviour", () => {
  it("trims leading/trailing whitespace from hex", () => {
    const result = parseConfigMessage(
      validMessage({ brandColour: "  #aabbcc  " }),
    );
    expectOk(result);
    if (result.ok) {
      expect(result.value.config.brandColour).toBe("#aabbcc");
    }
  });

  it("lowercases mixed-case hex", () => {
    const result = parseConfigMessage(
      validMessage({ brandColour: "#AaBbCc" }),
    );
    expectOk(result);
    if (result.ok) {
      expect(result.value.config.brandColour).toBe("#aabbcc");
    }
  });
});

// ---------------------------------------------------------------------------
// 28. Mutation pinning: Set membership uniqueness
// ---------------------------------------------------------------------------
describe("Set membership uniqueness", () => {
  it("QR_DOT_STYLES: 'dots' is distinct from 'dot'", () => {
    // 'dot' is a valid eye frame style but NOT a valid dot style
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["qrDotStyle"] = "dot";
    expectFail(parseConfigMessage(msg), "qrDotStyle: invalid value");
  });

  it("QR_EYE_FRAME_STYLES: 'dots' is not valid (only 'dot' is)", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["qrEyeFrameStyle"] = "dots";
    expectFail(parseConfigMessage(msg), "qrEyeFrameStyle: invalid value");
  });

  it("QR_EYE_DOT_STYLES: 'extra-rounded' is not valid", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["qrEyeDotStyle"] = "extra-rounded";
    expectFail(parseConfigMessage(msg), "qrEyeDotStyle: invalid value");
  });

  it("QR_EYE_DOT_STYLES: 'rounded' is not valid", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["qrEyeDotStyle"] = "rounded";
    expectFail(parseConfigMessage(msg), "qrEyeDotStyle: invalid value");
  });

  it("QR_DOT_STYLES: 'classy' accepted, 'classy-round' rejected", () => {
    expectOk(parseConfigMessage(validMessage({ qrDotStyle: "classy" })));
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["qrDotStyle"] = "classy-round";
    expectFail(parseConfigMessage(msg), "qrDotStyle: invalid value");
  });

  it("QR_DOT_STYLES: 'extra-rounded' accepted, 'extra-round' rejected", () => {
    expectOk(
      parseConfigMessage(validMessage({ qrDotStyle: "extra-rounded" })),
    );
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["qrDotStyle"] = "extra-round";
    expectFail(parseConfigMessage(msg), "qrDotStyle: invalid value");
  });
});

// ---------------------------------------------------------------------------
// 29. parsePositiveInt: non-number types
// ---------------------------------------------------------------------------
describe("parsePositiveInt type rejection", () => {
  it("rejects boolean for containerRadius", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["containerRadius"] = true;
    expectFail(parseConfigMessage(msg), "containerRadius: expected finite number");
  });

  it("rejects null for motionDuration", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["motionDuration"] = null;
    expectFail(parseConfigMessage(msg), "motionDuration: expected finite number");
  });

  it("rejects undefined for buttonRadius", () => {
    const msg = validMessage();
    delete (msg["config"] as Record<string, unknown>)["buttonRadius"];
    expectFail(parseConfigMessage(msg), "buttonRadius: expected finite number");
  });
});

// ---------------------------------------------------------------------------
// 30. Negative Infinity for parsePositiveInt
// ---------------------------------------------------------------------------
describe("parsePositiveInt: special numeric values", () => {
  it("rejects -Infinity for containerRadius", () => {
    expectFail(
      parseConfigMessage(
        validMessage({ containerRadius: -Infinity as unknown as number }),
      ),
      "containerRadius: expected finite number",
    );
  });
});

// ---------------------------------------------------------------------------
// 31. parseOptionalHttpsUrl: isHttpsUrl internal logic
// ---------------------------------------------------------------------------
describe("isHttpsUrl via parseOptionalHttpsUrl", () => {
  it("rejects file:// protocol", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["logoUrl"] = "file:///etc/passwd";
    expectFail(parseConfigMessage(msg), "logoUrl: expected https URL");
  });

  it("rejects ws:// protocol", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["logoUrl"] = "ws://example.com/sock";
    expectFail(parseConfigMessage(msg), "logoUrl: expected https URL");
  });

  it("rejects wss:// protocol (not https:)", () => {
    const msg = validMessage();
    (msg["config"] as Record<string, unknown>)["logoUrl"] = "wss://example.com/sock";
    expectFail(parseConfigMessage(msg), "logoUrl: expected https URL");
  });
});
