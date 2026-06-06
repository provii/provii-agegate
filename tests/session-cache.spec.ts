import { SessionCache } from "../src/core/session-cache.js";

const CACHE_KEY = "provii_session_cache";

function validCacheEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 1,
    sessionId: "sess_abc123",
    verifiedAt: Math.floor(Date.now() / 1000) - 60,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    origin: "https://localhost",
    cachedAt: Date.now(),
    ...overrides,
  };
}

describe("SessionCache.get field type validation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns a valid cache entry unchanged", () => {
    const entry = validCacheEntry();
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));

    const result = SessionCache.get();

    expect(result).not.toBeNull();
    expect(result?.sessionId).toBe("sess_abc123");
    expect(result?.expiresAt).toBe(entry["expiresAt"]);
    expect(result?.verifiedAt).toBe(entry["verifiedAt"]);
    expect(result?.origin).toBe("https://localhost");
  });

  it("returns null and clears when sessionId is not a string", () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(validCacheEntry({ sessionId: 42 })));

    const result = SessionCache.get();

    expect(result).toBeNull();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it("returns null and clears when sessionId is null", () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(validCacheEntry({ sessionId: null })));

    const result = SessionCache.get();

    expect(result).toBeNull();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it("returns null and clears when expiresAt is not a number", () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(validCacheEntry({ expiresAt: "2026-01-01" })));

    const result = SessionCache.get();

    expect(result).toBeNull();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it("returns null and clears when expiresAt is NaN", () => {
    // JSON.parse turns null into null, but we can craft a scenario
    // where a stored value becomes NaN by storing it directly
    const entry = validCacheEntry();
    const raw = JSON.stringify(entry);
    // Replace the expiresAt value with a non-finite representation
    // NaN cannot be represented in JSON, so we use a string that the
    // type check catches (typeof !== "number")
    localStorage.setItem(CACHE_KEY, raw);

    // Manually overwrite with a crafted object that has NaN
    // Since JSON.stringify(NaN) produces null, we use a workaround:
    // store valid JSON, then patch localStorage to return NaN via a spy
    const maliciousEntry = { ...entry, expiresAt: "NaN" };
    localStorage.setItem(CACHE_KEY, JSON.stringify(maliciousEntry));

    // "NaN" as string fails typeof !== "number", so it returns null
    const resultStringNaN = SessionCache.get();
    expect(resultStringNaN).toBeNull();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();

    // Now test actual NaN via JSON.parse monkey-patching
    localStorage.setItem(CACHE_KEY, JSON.stringify(validCacheEntry()));
    const originalParse = JSON.parse;
    JSON.parse = (text: string) => {
      const result = originalParse(text);
      result.expiresAt = NaN;
      return result;
    };

    try {
      const resultActualNaN = SessionCache.get();
      expect(resultActualNaN).toBeNull();
    } finally {
      JSON.parse = originalParse;
    }
  });

  it("returns null and clears when expiresAt is Infinity", () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(validCacheEntry()));
    const originalParse = JSON.parse;
    JSON.parse = (text: string) => {
      const result = originalParse(text);
      result.expiresAt = Infinity;
      return result;
    };

    try {
      const result = SessionCache.get();
      expect(result).toBeNull();
    } finally {
      JSON.parse = originalParse;
    }
  });

  it("returns null and clears when verifiedAt is NaN", () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(validCacheEntry()));
    const originalParse = JSON.parse;
    JSON.parse = (text: string) => {
      const result = originalParse(text);
      result.verifiedAt = NaN;
      return result;
    };

    try {
      const result = SessionCache.get();
      expect(result).toBeNull();
    } finally {
      JSON.parse = originalParse;
    }
  });

  it("returns null and clears when verifiedAt is not a number", () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(validCacheEntry({ verifiedAt: true })));

    const result = SessionCache.get();

    expect(result).toBeNull();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it("returns null and clears when origin is not a string", () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(validCacheEntry({ origin: 12345 })));

    const result = SessionCache.get();

    expect(result).toBeNull();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it("returns null and clears when origin is an array", () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(validCacheEntry({ origin: ["https://localhost"] })));

    const result = SessionCache.get();

    expect(result).toBeNull();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it("returns null and clears when expiresAt is negative Infinity", () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(validCacheEntry()));
    const originalParse = JSON.parse;
    JSON.parse = (text: string) => {
      const result = originalParse(text);
      result.expiresAt = -Infinity;
      return result;
    };

    try {
      const result = SessionCache.get();
      expect(result).toBeNull();
    } finally {
      JSON.parse = originalParse;
    }
  });
});
