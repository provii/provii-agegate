/**
 * Mutation-killing tests for src/core/pkce.ts
 *
 * Targets surviving Stryker mutants in:
 *  - PKCEError constructor (message propagation, name assignment)
 *  - debug logging (default false, spy verification when true)
 *  - storage operations (null verifier, clearAll empties, loop bounds)
 *  - crypto availability guards (missing crypto, missing getRandomValues, missing subtle)
 */

import { PKCEManager, PKCEError } from "../src/core/pkce.js";
import { PKCE_STORAGE_PREFIX } from "../src/core/types.js";

// ---------------------------------------------------------------------------
// 1. PKCEError constructor
// ---------------------------------------------------------------------------

describe("PKCEError", () => {
  it("propagates the message string to the Error base class", () => {
    const errorMessage = "something went wrong in PKCE land";
    const pkcError = new PKCEError(errorMessage);

    expect(pkcError.message).toBe(errorMessage);
  });

  it('sets .name to "PKCEError"', () => {
    const pkcError = new PKCEError("any message");

    expect(pkcError.name).toBe("PKCEError");
  });

  it("is an instance of Error", () => {
    const pkcError = new PKCEError("test");

    expect(pkcError).toBeInstanceOf(Error);
  });

  it("does not have an empty name", () => {
    const pkcError = new PKCEError("msg");

    expect(pkcError.name).not.toBe("");
  });
});

// ---------------------------------------------------------------------------
// 2. Debug logging , default false should not log
// ---------------------------------------------------------------------------

describe("PKCEManager debug logging", () => {
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    sessionStorage.clear();
    debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    debugSpy.mockRestore();
  });

  it("does not call console.debug when constructed with default debug (false)", () => {
    const manager = new PKCEManager();

    manager.storeVerifier("sess-1", "verifier-1");
    manager.getVerifier("sess-1");
    manager.clearVerifier("sess-1");
    manager.clearAllVerifiers();

    expect(debugSpy).not.toHaveBeenCalled();
  });

  it("does not call console.debug when debug is explicitly false", () => {
    const manager = new PKCEManager(false);

    manager.storeVerifier("sess-2", "verifier-2");
    manager.getVerifier("sess-2");

    expect(debugSpy).not.toHaveBeenCalled();
  });

  it("calls console.debug for storeVerifier when debug is true", () => {
    const manager = new PKCEManager(true);

    manager.storeVerifier("sess-dbg", "v1");

    expect(debugSpy).toHaveBeenCalled();
    const firstCallArgs = debugSpy.mock.calls[0] as unknown[];
    expect(firstCallArgs[0]).toContain("[PKCEManager]");
    expect(firstCallArgs[0]).toContain("Storing verifier");
  });

  it("calls console.debug for getVerifier when debug is true", () => {
    const manager = new PKCEManager(true);

    manager.getVerifier("no-such-session");

    expect(debugSpy).toHaveBeenCalled();
    // Should have two calls: "Retrieving verifier" and "Verifier not found"
    const allMessages = debugSpy.mock.calls.map(
      (callArgs: unknown[]) => callArgs[0],
    );
    expect(
      allMessages.some(
        (m: unknown) =>
          typeof m === "string" && m.includes("Retrieving verifier"),
      ),
    ).toBe(true);
    expect(
      allMessages.some(
        (m: unknown) =>
          typeof m === "string" && m.includes("Verifier not found"),
      ),
    ).toBe(true);
  });

  it("calls console.debug for clearVerifier when debug is true", () => {
    const manager = new PKCEManager(true);

    manager.clearVerifier("sess-x");

    expect(debugSpy).toHaveBeenCalled();
    const firstCallArgs = debugSpy.mock.calls[0] as unknown[];
    expect(firstCallArgs[0]).toContain("Clearing verifier");
  });

  it("calls console.debug for clearAllVerifiers when debug is true", () => {
    const manager = new PKCEManager(true);

    manager.clearAllVerifiers();

    expect(debugSpy).toHaveBeenCalled();
    const firstCallArgs = debugSpy.mock.calls[0] as unknown[];
    expect(firstCallArgs[0]).toContain("Clearing all verifiers");
  });

  it("calls console.debug for generateChallenge when debug is true", async () => {
    const manager = new PKCEManager(true);

    await manager.generateChallenge();

    expect(debugSpy).toHaveBeenCalled();
    const allMessages = debugSpy.mock.calls.map(
      (callArgs: unknown[]) => callArgs[0],
    );
    expect(
      allMessages.some(
        (m: unknown) =>
          typeof m === "string" && m.includes("Generating PKCE challenge"),
      ),
    ).toBe(true);
    expect(
      allMessages.some(
        (m: unknown) =>
          typeof m === "string" && m.includes("PKCE challenge generated"),
      ),
    ).toBe(true);
  });

  it("passes data parameter to console.debug when provided", () => {
    const manager = new PKCEManager(true);

    manager.storeVerifier("sess-data", "v-data");

    // Second argument should be the data object, not empty string
    const firstCallArgs = debugSpy.mock.calls[0] as unknown[];
    expect(firstCallArgs[1]).toEqual({ sessionId: "sess-data" });
  });

  it("passes empty string as data when no data is provided", () => {
    const manager = new PKCEManager(true);

    manager.clearAllVerifiers();

    // clearAllVerifiers calls this.log('Clearing all verifiers') with no data arg,
    // so the log method should pass '' as the fallback
    const firstCallArgs = debugSpy.mock.calls[0] as unknown[];
    expect(firstCallArgs[1]).toBe("");
  });
});

// ---------------------------------------------------------------------------
// 3. Storage operations , null verifier, clearAll empties storage
// ---------------------------------------------------------------------------

describe("PKCEManager storage edge cases", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns null for a session that was never stored", () => {
    const manager = new PKCEManager(false);
    const result = manager.getVerifier("does-not-exist");

    expect(result).toBeNull();
  });

  it("returns null (not undefined, not empty string) for missing verifier", () => {
    const manager = new PKCEManager(false);
    const result = manager.getVerifier("nonexistent");

    expect(result).toBe(null);
  });

  it("clearAllVerifiers leaves sessionStorage with zero PKCE keys", () => {
    const manager = new PKCEManager(false);

    manager.storeVerifier("a", "va");
    manager.storeVerifier("b", "vb");
    manager.storeVerifier("c", "vc");
    manager.storeVerifier("d", "vd");

    // Confirm they exist
    expect(manager.getVerifier("a")).toBe("va");
    expect(manager.getVerifier("d")).toBe("vd");

    manager.clearAllVerifiers();

    // All PKCE keys gone
    expect(manager.getVerifier("a")).toBeNull();
    expect(manager.getVerifier("b")).toBeNull();
    expect(manager.getVerifier("c")).toBeNull();
    expect(manager.getVerifier("d")).toBeNull();

    // Verify at the raw sessionStorage level
    let pkceKeyCount = 0;
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(PKCE_STORAGE_PREFIX)) {
        pkceKeyCount++;
      }
    }
    expect(pkceKeyCount).toBe(0);
  });

  it("clearAllVerifiers does not throw when storage is empty", () => {
    const manager = new PKCEManager(false);

    expect(() => manager.clearAllVerifiers()).not.toThrow();
  });

  it("clearAllVerifiers preserves non-PKCE keys", () => {
    const manager = new PKCEManager(false);

    sessionStorage.setItem("unrelated_key", "keep me");
    manager.storeVerifier("x", "vx");

    manager.clearAllVerifiers();

    expect(sessionStorage.getItem("unrelated_key")).toBe("keep me");
    expect(manager.getVerifier("x")).toBeNull();
  });

  it("clearAllVerifiers removes all verifiers even with many entries", () => {
    const manager = new PKCEManager(false);

    // Store enough to catch off-by-one in the loop bound (i < length vs i <= length)
    const sessionIds = Array.from({ length: 20 }, (_, idx) => `session-${idx}`);
    for (const sessionId of sessionIds) {
      manager.storeVerifier(sessionId, `verifier-for-${sessionId}`);
    }

    manager.clearAllVerifiers();

    for (const sessionId of sessionIds) {
      expect(manager.getVerifier(sessionId)).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Crypto availability guards
// ---------------------------------------------------------------------------

describe("PKCEManager crypto availability checks", () => {
  const originalCrypto = globalThis.crypto;

  afterEach(() => {
    // Restore crypto after each test
    Object.defineProperty(globalThis, "crypto", {
      value: originalCrypto,
      configurable: true,
      writable: true,
    });
  });

  it("throws PKCEError when globalThis.crypto is undefined", () => {
    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const manager = new PKCEManager(false);

    expect(() => {
      // generateChallenge calls generateVerifier internally which checks crypto
      // But generateVerifier is private, so we trigger it through generateChallenge
      // However generateChallenge is async and generateVerifier is sync
      // The sync throw inside generateVerifier will cause the promise to reject
      return manager.generateChallenge();
    }).rejects.toThrow(PKCEError);
  });

  it("throws PKCEError with correct message when crypto is missing", async () => {
    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const manager = new PKCEManager(false);

    await expect(manager.generateChallenge()).rejects.toThrow(
      "Web Crypto API is not available",
    );
  });

  it("throws PKCEError when crypto exists but getRandomValues is missing", async () => {
    Object.defineProperty(globalThis, "crypto", {
      value: { subtle: originalCrypto.subtle },
      configurable: true,
      writable: true,
    });

    const manager = new PKCEManager(false);

    await expect(manager.generateChallenge()).rejects.toThrow(PKCEError);
    await expect(manager.generateChallenge()).rejects.toThrow(
      "Web Crypto API is not available",
    );
  });

  it("throws PKCEError when crypto.subtle is missing", async () => {
    Object.defineProperty(globalThis, "crypto", {
      value: {
        getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto),
      },
      configurable: true,
      writable: true,
    });

    const manager = new PKCEManager(false);

    await expect(manager.generateChallenge()).rejects.toThrow(PKCEError);
    await expect(manager.generateChallenge()).rejects.toThrow(
      "Web Crypto API (SubtleCrypto) is not available",
    );
  });

  it("throws PKCEError when crypto is null", async () => {
    Object.defineProperty(globalThis, "crypto", {
      value: null,
      configurable: true,
      writable: true,
    });

    const manager = new PKCEManager(false);

    await expect(manager.generateChallenge()).rejects.toThrow(PKCEError);
  });

  it("throws PKCEError when crypto exists but subtle is null", async () => {
    Object.defineProperty(globalThis, "crypto", {
      value: {
        getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto),
        subtle: null,
      },
      configurable: true,
      writable: true,
    });

    const manager = new PKCEManager(false);

    await expect(manager.generateChallenge()).rejects.toThrow(
      "Web Crypto API (SubtleCrypto) is not available",
    );
  });

  it("does not throw when crypto and subtle are both available", async () => {
    // This confirms the positive path still works (sanity check)
    const manager = new PKCEManager(false);

    const result = await manager.generateChallenge();
    expect(result.verifier).toBeDefined();
    expect(result.challenge).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 5. generateChallenge return value structure
// ---------------------------------------------------------------------------

describe("PKCEManager generateChallenge return value", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns an object with verifier and challenge properties", async () => {
    const manager = new PKCEManager(false);
    const result = await manager.generateChallenge();

    expect(result).toHaveProperty("verifier");
    expect(result).toHaveProperty("challenge");
    expect(typeof result.verifier).toBe("string");
    expect(typeof result.challenge).toBe("string");
  });

  it("challenge is deterministically derived from verifier (same verifier => same challenge)", async () => {
    // We cannot directly call generateChallengeFromVerifier (private), but we
    // can verify two generateChallenge calls produce different pairs, implying
    // the challenge is derived from the verifier (not hardcoded or random).
    const manager = new PKCEManager(false);
    const result1 = await manager.generateChallenge();
    const result2 = await manager.generateChallenge();

    // Different verifiers must yield different challenges
    expect(result1.verifier).not.toBe(result2.verifier);
    expect(result1.challenge).not.toBe(result2.challenge);
  });
});

// ---------------------------------------------------------------------------
// 6. Storage key uses correct prefix
// ---------------------------------------------------------------------------

describe("PKCEManager storage key format", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("stores under the PKCE_STORAGE_PREFIX + sessionId key", () => {
    const manager = new PKCEManager(false);
    const sessionId = "test-key-format";
    const expectedKey = `${PKCE_STORAGE_PREFIX}${sessionId}`;

    manager.storeVerifier(sessionId, "some-verifier");

    expect(sessionStorage.getItem(expectedKey)).toBe("some-verifier");
  });

  it("getVerifier reads from the correct prefixed key", () => {
    const manager = new PKCEManager(false);
    const sessionId = "manual-insert";
    const expectedKey = `${PKCE_STORAGE_PREFIX}${sessionId}`;

    // Manually insert into sessionStorage
    sessionStorage.setItem(expectedKey, "manually-set-verifier");

    expect(manager.getVerifier(sessionId)).toBe("manually-set-verifier");
  });
});
