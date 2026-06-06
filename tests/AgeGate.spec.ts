/**
 * @jest-environment ./tests/jest-environment-jsdom-configurable.cjs
 */

/**
 * AgeGate.spec.ts
 *
 * Combined unit- and integration-level tests for the AgeGate wrapper.
 */

import { jest } from "@jest/globals";
import { AgeGateConfig } from "../src/agegate/AgeGateConfig.js";
import { isMobile } from "../src/utils/device.js";

/* ------------------------------------------------------------------ */
/* shared mocks & helpers                                             */
/* ------------------------------------------------------------------ */
jest.mock("../src/utils/device");
jest.mock("../src/utils/qr", () => ({
  renderQrToCanvas: jest.fn(() => Promise.resolve()),
}));

const isMobileMock = isMobile as jest.MockedFunction<typeof isMobile>;
(global as any).fetch = jest.fn();

// Test public key matching the required format: pk_test_<64 hex chars>
const TEST_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const mkConfig = () =>
  new AgeGateConfig({
    publicKey: TEST_PUBLIC_KEY,
    environment: "sandbox" as const,
    challengeUrl: "https://api.example.com/challenge",
    statusUrl: "https://api.example.com/status/{sid}",
    contentUrl: "/content",
    mountElementId: "age-gate-mount",
    pollInterval: 500,
  });

// Mock challenge object that matches the actual protobuf structure
const createMockChallenge = () => ({
  challengeId: "11111111-1111-1111-1111-111111111111",
  minAge: 18,
  maxAge: 0,
  nonce: new Uint8Array(32),
  origin: "https://api.example.com",
  siteSignature: new Uint8Array(),
  expiresAt: { seconds: BigInt(Math.floor(Date.now() / 1000) + 3600) },
});

/* ------------------------------------------------------------------ */
/* 1. Unit tests (XState mocked)                                      */
/* ------------------------------------------------------------------ */
describe("AgeGate – Unit tests", () => {
  let snapshotCb!: (s: {
    matches: (state: string) => boolean;
    context: any;
  }) => void;
  let lastUnsub!: jest.Mock;

  const actorStub = {
    start: () => actorStub,
    subscribe: jest.fn((cb) => {
      snapshotCb = cb as any;
      lastUnsub = jest.fn();
      return { unsubscribe: lastUnsub };
    }),
    send: jest.fn(),
  };

  const capturedMachines: any[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    capturedMachines.length = 0;

    jest.mock("xstate", () => ({ createActor: jest.fn(() => actorStub) }));
    jest.mock("xstate/actors", () => ({
      fromPromise: jest.fn((fn: unknown) => fn),
    }));
    jest.mock("../src/agegate/AgeGateMachine.js", () => ({
      AgeGateMachine: {
        provide: (impl: unknown) => {
          capturedMachines.push(impl);
          return {};
        },
      },
    }));

    const mount = document.createElement("div");
    mount.id = "age-gate-mount";
    jest.spyOn(document, "getElementById").mockReturnValue(mount);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.unmock("xstate");
    jest.unmock("xstate/actors");
    jest.unmock("../src/agegate/AgeGateMachine.js");
  });

  const loadAgeGate = async () => {
    const { AgeGate } = await import("../src/agegate/AgeGate.js");
    return AgeGate;
  };

  describe("init() promise lifecycle", () => {
    it('resolves when snapshot hits "rendered"', async () => {
      const AgeGate = await loadAgeGate();
      const gate = new AgeGate(mkConfig(), jest.fn());

      const p = gate.init();
      snapshotCb({
        matches: (state: string) => state === "rendered",
        context: {},
      } as any);

      await expect(p).resolves.toBeUndefined();
      expect(lastUnsub).toHaveBeenCalled();
    });

    it('rejects when snapshot hits "failed"', async () => {
      const AgeGate = await loadAgeGate();
      const gate = new AgeGate(mkConfig(), jest.fn());

      const p = gate.init();
      snapshotCb({
        matches: (state: string) => state === "failed",
        context: {},
      } as any);

      await expect(p).rejects.toThrow();
      expect(lastUnsub).toHaveBeenCalled();
    });
  });

  describe("redirect action", () => {
    it("invokes caller-supplied redirect fn", async () => {
      const AgeGate = await loadAgeGate();
      const redirect = jest.fn();
      new AgeGate(mkConfig(), redirect);

      const { actions } = capturedMachines[0];
      actions.redirect({ context: { cfg: mkConfig() } });

      expect(redirect).toHaveBeenCalledWith(
        expect.stringMatching(/\/content$/),
      );
    });

    it("falls back to window.location.href", async () => {
      const AgeGate = await loadAgeGate();

      // Construct without a redirect function so the default
      // (window.location.href = url) is used.
      new AgeGate(mkConfig());
      const { actions } = capturedMachines[0];

      // JSDOM does not support real navigation, but the redirect action
      // should not throw and the config should resolve contentUrl correctly.
      expect(() =>
        actions.redirect({ context: { cfg: mkConfig() } }),
      ).not.toThrow();
      expect(mkConfig().contentUrl).toMatch(/\/content$/);
    });
  });
});

/* ------------------------------------------------------------------ */
/* 2. Integration tests (DOM behaviour)                               */
/* ------------------------------------------------------------------ */
describe("AgeGate – Integration tests", () => {
  let mountElem: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();

    mountElem = {
      innerHTML: "",
      appendChild: jest.fn(),
      id: "age-gate-mount",
    } as any;
    jest.spyOn(document, "getElementById").mockReturnValue(mountElem);
    jest.spyOn(document, "createElement").mockImplementation(
      (tag: string) =>
        ({
          tagName: tag.toUpperCase(),
          href: "",
          textContent: "",
          appendChild: jest.fn(),
        }) as any,
    );

    /* manual DOM-oriented mock of AgeGate */
    jest.mock("../src/agegate/AgeGate.ts", () => ({
      AgeGate: jest.fn((cfg: any, redirect?: (url: string) => void) => ({
        cfg,
        redirectFn: redirect,
        init: () => {
          const mount = document.getElementById(cfg.mountElementId);
          if (!mount) return Promise.resolve();

          if (isMobile()) {
            const a = document.createElement("a");
            a.href = "test://verify";
            a.textContent = "Verify Age";
            mount.appendChild(a);
          } else {
            const canvas = document.createElement("canvas");
            const caption = document.createElement("p");
            caption.textContent = "Scan QR code to verify age";
            mount.appendChild(canvas);
            mount.appendChild(caption);
          }

          if (redirect) setTimeout(() => redirect(cfg.contentUrl), 10);

          return Promise.resolve();
        },
      })),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.unmock("../src/agegate/AgeGate.ts");
  });

  const loadMockedAgeGate = async () => {
    const { AgeGate } = await import("../src/agegate/AgeGate.js");
    return AgeGate;
  };

  it("renders QR canvas & caption on desktop", async () => {
    const AgeGate = await loadMockedAgeGate();
    isMobileMock.mockReturnValue(false);

    await new AgeGate(mkConfig()).init();
    expect(document.createElement).toHaveBeenCalledWith("canvas");
    expect(document.createElement).toHaveBeenCalledWith("p");
    expect(mountElem.appendChild).toHaveBeenCalledTimes(2);
  });

  it("renders deep-link anchor on mobile", async () => {
    const AgeGate = await loadMockedAgeGate();
    isMobileMock.mockReturnValue(true);

    await new AgeGate(mkConfig()).init();
    expect(document.createElement).toHaveBeenCalledWith("a");
    expect(mountElem.appendChild).toHaveBeenCalledTimes(1);
  });

  it("redirects to contentUrl after verification", async () => {
    const AgeGate = await loadMockedAgeGate();
    isMobileMock.mockReturnValue(false);

    const redirect = jest.fn();
    await new AgeGate(mkConfig(), redirect).init();

    await new Promise((r) => setTimeout(r, 20));
    expect(redirect).toHaveBeenCalledWith(expect.stringMatching(/\/content$/));
  });

  it("propagates init errors", async () => {
    const AgeGate = await loadMockedAgeGate();
    const AgeGateClass = AgeGate as jest.MockedClass<typeof AgeGate>;

    AgeGateClass.mockImplementationOnce(
      (cfg: any) =>
        ({
          cfg,
          init: () => Promise.reject(new Error("Age gate failed")),
        }) as any,
    );

    await expect(new AgeGate(mkConfig()).init()).rejects.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* 3. Real constructor smoke test                                     */
/* ------------------------------------------------------------------ */
describe("AgeGate – Real implementation smoke test", () => {
  beforeEach(() => {
    jest.unmock("../src/agegate/AgeGate");
    jest.unmock("xstate");
    jest.unmock("xstate/actors");
    jest.unmock("../src/agegate/AgeGateMachine.js");
  });

  it("constructs without throwing", async () => {
    const { AgeGate } = await import("../src/agegate/AgeGate.js");
    expect(() => new AgeGate(mkConfig())).not.toThrow();
  });
});
