/**
 * @jest-environment jsdom
 */
// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT

/**
 * Mutation-killing tests for src/utils/base64.ts
 *
 * Targets surviving Stryker mutants across:
 *  - bytesToB64urlStrict: input validation (null, wrong type, empty)
 *  - encoding correctness: known input/output pairs
 *  - base64url alphabet replacements (+, /, = padding)
 *  - Base64Error construction (name, userMessage, code, details)
 *  - error re-throw vs wrap branching
 */

import { bytesToB64urlStrict } from "../src/utils/base64.js";

// ---------------------------------------------------------------------------
// Helper: build a Uint8Array from an array of byte values
// ---------------------------------------------------------------------------
function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

// ---------------------------------------------------------------------------
// 1. Base64Error class behaviour (via thrown errors)
// ---------------------------------------------------------------------------

describe("Base64Error properties", () => {
  it('sets .name to "Base64Error" for null input', () => {
    expect(() => bytesToB64urlStrict(null as unknown as Uint8Array)).toThrow(
      expect.objectContaining({ name: "Base64Error" }),
    );
  });

  it("sets .code to EMPTY_BYTES for null input", () => {
    try {
      bytesToB64urlStrict(null as unknown as Uint8Array);
      fail("expected Base64Error");
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("EMPTY_BYTES");
    }
  });

  it("sets .userMessage to user-facing string for null input", () => {
    try {
      bytesToB64urlStrict(null as unknown as Uint8Array);
      fail("expected Base64Error");
    } catch (err: unknown) {
      expect((err as { userMessage: string }).userMessage).toBe(
        "Invalid data format. Please try again.",
      );
    }
  });

  it("sets .code to INVALID_BYTES_TYPE for wrong type", () => {
    try {
      bytesToB64urlStrict("not bytes" as unknown as Uint8Array);
      fail("expected Base64Error");
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("INVALID_BYTES_TYPE");
    }
  });

  it("includes actualType in .details for wrong type", () => {
    try {
      bytesToB64urlStrict(42 as unknown as Uint8Array);
      fail("expected Base64Error");
    } catch (err: unknown) {
      expect((err as { details: { actualType: string } }).details).toEqual({
        actualType: "number",
      });
    }
  });

  it("sets .userMessage for wrong type input", () => {
    try {
      bytesToB64urlStrict({} as unknown as Uint8Array);
      fail("expected Base64Error");
    } catch (err: unknown) {
      expect((err as { userMessage: string }).userMessage).toBe(
        "Invalid data format. Please try again.",
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Input validation: falsy and wrong-type rejection
// ---------------------------------------------------------------------------

describe("bytesToB64urlStrict input validation", () => {
  it("throws for null input", () => {
    expect(() => bytesToB64urlStrict(null as unknown as Uint8Array)).toThrow();
  });

  it("throws for undefined input", () => {
    expect(() =>
      bytesToB64urlStrict(undefined as unknown as Uint8Array),
    ).toThrow();
  });

  it("throws for a plain string", () => {
    expect(() =>
      bytesToB64urlStrict("hello" as unknown as Uint8Array),
    ).toThrow();
  });

  it("throws for a number", () => {
    expect(() => bytesToB64urlStrict(123 as unknown as Uint8Array)).toThrow();
  });

  it("throws for a plain object", () => {
    expect(() =>
      bytesToB64urlStrict({ length: 3 } as unknown as Uint8Array),
    ).toThrow();
  });

  it("throws for a regular Array", () => {
    expect(() =>
      bytesToB64urlStrict([1, 2, 3] as unknown as Uint8Array),
    ).toThrow();
  });

  it("throws for boolean false (falsy)", () => {
    expect(() =>
      bytesToB64urlStrict(false as unknown as Uint8Array),
    ).toThrow();
  });

  it("throws for the number 0 (falsy)", () => {
    expect(() => bytesToB64urlStrict(0 as unknown as Uint8Array)).toThrow();
  });

  it("throws for empty string (falsy)", () => {
    expect(() => bytesToB64urlStrict("" as unknown as Uint8Array)).toThrow();
  });

  it("does NOT throw for an empty Uint8Array (truthy, valid type)", () => {
    expect(() => bytesToB64urlStrict(new Uint8Array(0))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 3. Known input/output pairs (kills replacement + string-literal mutants)
// ---------------------------------------------------------------------------

describe("bytesToB64urlStrict encoding correctness", () => {
  it("encodes an empty Uint8Array to an empty string", () => {
    expect(bytesToB64urlStrict(bytes())).toBe("");
  });

  it("encodes a single zero byte", () => {
    // Standard base64 of [0x00] = "AA==" -> base64url = "AA"
    expect(bytesToB64urlStrict(bytes(0))).toBe("AA");
  });

  it("encodes a single byte (0x01)", () => {
    // Standard base64 of [0x01] = "AQ==" -> base64url = "AQ"
    expect(bytesToB64urlStrict(bytes(1))).toBe("AQ");
  });

  it("encodes a single byte (0xFF)", () => {
    // Standard base64 of [0xFF] = "/w==" -> base64url = "_w"
    expect(bytesToB64urlStrict(bytes(0xff))).toBe("_w");
  });

  it("encodes two bytes requiring one padding character", () => {
    // Standard base64 of [0x00, 0x00] = "AAA=" -> base64url = "AAA"
    expect(bytesToB64urlStrict(bytes(0, 0))).toBe("AAA");
  });

  it("encodes three bytes with no padding needed", () => {
    // Standard base64 of [0x00, 0x00, 0x00] = "AAAA" -> base64url = "AAAA"
    expect(bytesToB64urlStrict(bytes(0, 0, 0))).toBe("AAAA");
  });

  it('encodes ASCII "Hello" correctly', () => {
    // "Hello" = [72, 101, 108, 108, 111]
    // Standard base64 = "SGVsbG8=" -> base64url = "SGVsbG8"
    const helloBytes = new TextEncoder().encode("Hello");
    expect(bytesToB64urlStrict(helloBytes)).toBe("SGVsbG8");
  });

  it('encodes ASCII "f" (single character)', () => {
    // "f" = [0x66] -> base64 "Zg==" -> base64url "Zg"
    expect(bytesToB64urlStrict(new TextEncoder().encode("f"))).toBe("Zg");
  });

  it('encodes ASCII "fo" (two characters)', () => {
    // "fo" = [0x66, 0x6F] -> base64 "Zm8=" -> base64url "Zm8"
    expect(bytesToB64urlStrict(new TextEncoder().encode("fo"))).toBe("Zm8");
  });

  it('encodes ASCII "foo" (three characters, no padding)', () => {
    // "foo" = [0x66, 0x6F, 0x6F] -> base64 "Zm9v" -> base64url "Zm9v"
    expect(bytesToB64urlStrict(new TextEncoder().encode("foo"))).toBe("Zm9v");
  });

  it('encodes ASCII "foobar" (six characters, no padding)', () => {
    expect(bytesToB64urlStrict(new TextEncoder().encode("foobar"))).toBe(
      "Zm9vYmFy",
    );
  });
});

// ---------------------------------------------------------------------------
// 4. Base64url alphabet: + -> - replacement (kills regex mutant)
// ---------------------------------------------------------------------------

describe("base64url plus-to-hyphen replacement", () => {
  // Byte sequence 0xFB produces '+' in standard base64.
  // [0x3E] in standard base64 is "Pg==" (no plus). We need bytes where
  // standard base64 output contains '+'.
  // Bytes [0x3B, 0xBF] -> standard base64 = "O78=" which has no +.
  // Bytes [0xFB, 0xEF, 0xBE] -> standard base64 = "++++". Let's verify:
  // Actually, 0xFB = 11111011, 0xEF = 11101111, 0xBE = 10111110
  // Combined 24 bits: 111110 111110 111110 111110 -> all index 62 = '+'
  // base64url should replace all with '-'

  it("replaces + with - in the output", () => {
    const result = bytesToB64urlStrict(bytes(0xfb, 0xef, 0xbe));
    expect(result).not.toContain("+");
    expect(result).toContain("-");
  });

  it("produces the correct base64url for bytes that yield + in standard base64", () => {
    // 0xFB, 0xEF, 0xBE => standard "++++" => base64url "----"
    expect(bytesToB64urlStrict(bytes(0xfb, 0xef, 0xbe))).toBe("----");
  });
});

// ---------------------------------------------------------------------------
// 5. Base64url alphabet: / -> _ replacement (kills regex mutant)
// ---------------------------------------------------------------------------

describe("base64url slash-to-underscore replacement", () => {
  // Bytes where standard base64 produces '/':
  // Index 63 in base64 = '/', bit pattern 111111
  // [0xFF, 0xFF, 0xFF] -> 24 bits all 1 -> four sextets all 63 -> "////"
  // base64url should be "____"

  it("replaces / with _ in the output", () => {
    const result = bytesToB64urlStrict(bytes(0xff, 0xff, 0xff));
    expect(result).not.toContain("/");
    expect(result).toContain("_");
  });

  it("produces the correct base64url for bytes that yield / in standard base64", () => {
    expect(bytesToB64urlStrict(bytes(0xff, 0xff, 0xff))).toBe("____");
  });
});

// ---------------------------------------------------------------------------
// 6. Padding removal (kills regex mutant for =+$ stripping)
// ---------------------------------------------------------------------------

describe("base64url padding removal", () => {
  it("output never contains = characters (single byte, two padding chars)", () => {
    // Single byte -> base64 has "==" suffix
    expect(bytesToB64urlStrict(bytes(0))).not.toContain("=");
  });

  it("output never contains = characters (two bytes, one padding char)", () => {
    // Two bytes -> base64 has "=" suffix
    expect(bytesToB64urlStrict(bytes(0, 0))).not.toContain("=");
  });

  it("output never contains = characters (three bytes, no padding needed)", () => {
    // Three bytes -> no padding in standard base64 either
    expect(bytesToB64urlStrict(bytes(0, 0, 0))).not.toContain("=");
  });

  it("produces the correct length for single byte (2 chars, not 4)", () => {
    // "AA==" stripped to "AA"
    expect(bytesToB64urlStrict(bytes(0))).toHaveLength(2);
  });

  it("produces the correct length for two bytes (3 chars, not 4)", () => {
    // "AAA=" stripped to "AAA"
    expect(bytesToB64urlStrict(bytes(0, 0))).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 7. Mixed + and / in a single output
// ---------------------------------------------------------------------------

describe("base64url mixed special characters", () => {
  // We need bytes that produce both + and / in standard base64.
  // [0xFB, 0xFF, 0xBF] -> 11111011 11111111 10111111
  // Sextets: 111110 | 111111 | 111110 | 111111
  // Indices:   62(+)   63(/)   62(+)   63(/)
  // Standard: "+/+/" -> base64url: "-_-_"

  it("replaces both + and / in a single encoding", () => {
    const result = bytesToB64urlStrict(bytes(0xfb, 0xff, 0xbf));
    expect(result).toBe("-_-_");
  });

  it("contains neither + nor / nor =", () => {
    const result = bytesToB64urlStrict(bytes(0xfb, 0xff, 0xbf));
    expect(result).not.toContain("+");
    expect(result).not.toContain("/");
    expect(result).not.toContain("=");
  });
});

// ---------------------------------------------------------------------------
// 8. Output uses only the base64url alphabet
// ---------------------------------------------------------------------------

describe("base64url output alphabet", () => {
  it("output contains only [A-Za-z0-9_-] for random-ish bytes", () => {
    const input = bytes(
      0x00, 0x10, 0x83, 0x40, 0x51, 0x8b, 0x80, 0x92, 0x1e, 0xfb, 0xef,
      0xbe, 0xff, 0xff, 0xff,
    );
    const result = bytesToB64urlStrict(input);
    expect(result).toMatch(/^[A-Za-z0-9_-]*$/);
  });

  it("output contains only [A-Za-z0-9_-] for all-zero bytes", () => {
    const result = bytesToB64urlStrict(new Uint8Array(256));
    expect(result).toMatch(/^[A-Za-z0-9_-]*$/);
  });

  it("output contains only [A-Za-z0-9_-] for all-0xFF bytes", () => {
    const result = bytesToB64urlStrict(new Uint8Array(256).fill(0xff));
    expect(result).toMatch(/^[A-Za-z0-9_-]*$/);
  });
});

// ---------------------------------------------------------------------------
// 9. Byte-level loop correctness (every byte value 0-255)
// ---------------------------------------------------------------------------

describe("bytesToB64urlStrict handles every byte value", () => {
  it("encodes all 256 byte values without throwing", () => {
    const allBytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      allBytes[i] = i;
    }
    expect(() => bytesToB64urlStrict(allBytes)).not.toThrow();
  });

  it("produces a non-empty string for all 256 byte values", () => {
    const allBytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      allBytes[i] = i;
    }
    expect(bytesToB64urlStrict(allBytes).length).toBeGreaterThan(0);
  });

  it("encodes each single byte individually without throwing", () => {
    for (let i = 0; i < 256; i++) {
      expect(() => bytesToB64urlStrict(bytes(i))).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// 10. Error wrapping: non-Base64Error exceptions get wrapped
// ---------------------------------------------------------------------------

describe("error wrapping for unexpected failures", () => {
  it("wraps non-Base64Error exceptions with STRICT_ENCODE_FAILED code", () => {
    // Create a Uint8Array-like object that passes the toString check but
    // throws during iteration, triggering the generic catch branch.
    const fakeUint8Array = {
      [Symbol.iterator]() {
        return {
          next() {
            throw new TypeError("iterator boom");
          },
        };
      },
      [Symbol.toStringTag]: "Uint8Array",
    };

    try {
      bytesToB64urlStrict(fakeUint8Array as unknown as Uint8Array);
      fail("expected error");
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe("STRICT_ENCODE_FAILED");
      expect((err as { userMessage: string }).userMessage).toBe(
        "Unable to encode data. Please try again.",
      );
    }
  });

  it("preserves Base64Error instances without wrapping", () => {
    // null triggers the Base64Error path directly, and it should NOT get
    // wrapped in a second Base64Error
    try {
      bytesToB64urlStrict(null as unknown as Uint8Array);
      fail("expected error");
    } catch (err: unknown) {
      // Should be EMPTY_BYTES, not STRICT_ENCODE_FAILED
      expect((err as { code: string }).code).toBe("EMPTY_BYTES");
    }
  });
});

// ---------------------------------------------------------------------------
// 11. Determinism: same input always yields same output
// ---------------------------------------------------------------------------

describe("encoding determinism", () => {
  it("produces identical output for the same input bytes", () => {
    const input = bytes(0xde, 0xad, 0xbe, 0xef);
    const first = bytesToB64urlStrict(input);
    const second = bytesToB64urlStrict(input);
    expect(first).toBe(second);
  });
});

// ---------------------------------------------------------------------------
// 12. Large input handling
// ---------------------------------------------------------------------------

describe("large input encoding", () => {
  it("encodes a 10 000-byte array without error", () => {
    const large = new Uint8Array(10_000);
    for (let i = 0; i < large.length; i++) {
      large[i] = i % 256;
    }
    const result = bytesToB64urlStrict(large);
    // 10000 bytes -> ceil(10000/3)*4 = 13336 chars in standard base64
    // base64url unpadded: depends on remainder. 10000 % 3 = 1, so 2 padding
    // chars removed. Final length = 13334 - but let's just check it's valid.
    expect(result.length).toBeGreaterThan(0);
    expect(result).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("base64url survivor killers", () => {
  it("throws with 'Empty bytes input' for null/undefined", () => {
    expect(() => bytesToB64urlStrict(null as unknown as Uint8Array)).toThrow(
      "Empty bytes input",
    );
    expect(() => bytesToB64urlStrict(undefined as unknown as Uint8Array)).toThrow(
      "Empty bytes input",
    );
  });

  it("throws with type description for non-Uint8Array", () => {
    expect(() => bytesToB64urlStrict("hello" as unknown as Uint8Array)).toThrow(
      "Invalid bytes input type: string",
    );
  });

  it("console.error prefix is '[base64url] Strict encode failed:'", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const origBtoa = globalThis.btoa;
    globalThis.btoa = () => { throw new Error("mock"); };
    try {
      expect(() => bytesToB64urlStrict(new Uint8Array([1, 2, 3]))).toThrow(
        "Failed to encode strict base64url:",
      );
      expect(spy).toHaveBeenCalledWith(
        "[base64url] Strict encode failed:",
        expect.any(Error),
      );
    } finally {
      globalThis.btoa = origBtoa;
      spy.mockRestore();
    }
  });

  it("error message includes 'Failed to encode strict base64url'", () => {
    const origBtoa = globalThis.btoa;
    globalThis.btoa = () => { throw new Error("test-err"); };
    try {
      expect(() => bytesToB64urlStrict(new Uint8Array([1]))).toThrow(
        /Failed to encode strict base64url/,
      );
    } finally {
      globalThis.btoa = origBtoa;
    }
  });

  it("replaces + with - in output", () => {
    const result = bytesToB64urlStrict(new Uint8Array([0xfb, 0xef, 0xbe]));
    expect(result).not.toContain("+");
  });

  it("replaces / with _ in output", () => {
    const result = bytesToB64urlStrict(new Uint8Array([0xff, 0xff]));
    expect(result).not.toContain("/");
  });

  it("strips trailing = padding", () => {
    const result = bytesToB64urlStrict(new Uint8Array([1]));
    expect(result).not.toContain("=");
  });
});
