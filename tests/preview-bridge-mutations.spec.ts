/** @jest-environment jsdom */
// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Mutation-testing-focused tests for src/modes/preview-bridge.ts.
 *
 * Every constant, string literal, conditional branch, operator, and
 * fallback path is pinned so Stryker cannot mutate the source without
 * at least one test failing. This file deliberately overlaps with
 * preview-bridge.spec.ts on some assertions but targets the exact
 * values and boundary conditions that a mutator would flip.
 */

import {
  installPreviewBridge,
  type AgegateConfigPayload,
  type PreviewBridgeOptions,
  type PreviewBridgeTarget,
} from "../src/modes/preview-bridge.js";
import { buildConfigMessage } from "../src/modes/bridge-schema.js";

// ---------------------------------------------------------------------------
// Helper: minimal valid payload
// ---------------------------------------------------------------------------
function baseConfig(
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

function sendMessage(
  data: unknown,
  origin: string,
  windowRef?: Window,
): void {
  (windowRef ?? window).dispatchEvent(
    new MessageEvent("message", { data, origin }),
  );
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const ORIGIN = "https://docs.provii.app";

describe("preview-bridge mutations", () => {
  let root: HTMLElement;
  let updates: Array<Partial<AgegateConfigPayload>>;
  let target: PreviewBridgeTarget;
  let dispose: () => void;
  let warnSpy: jest.SpyInstance;

  function install(
    opts?: Partial<PreviewBridgeOptions>,
  ): () => void {
    return installPreviewBridge({
      allowedOrigins: [ORIGIN],
      target,
      root,
      ...opts,
    });
  }

  beforeEach(() => {
    document.documentElement.removeAttribute("dir");
    document.documentElement.removeAttribute("lang");
    document.documentElement.removeAttribute("data-agegate-theme");
    root = document.createElement("div");
    document.body.appendChild(root);
    updates = [];
    target = {
      update: (partial: Partial<AgegateConfigPayload>) => {
        updates.push(partial);
      },
    };
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    dispose = install();
  });

  afterEach(() => {
    dispose();
    if (root.parentNode) {
      document.body.removeChild(root);
    }
    warnSpy.mockRestore();
  });

  // =========================================================================
  // 1. Origin checking (isAllowedOrigin)
  // =========================================================================
  describe("isAllowedOrigin", () => {
    it("rejects empty string origin", () => {
      sendMessage(buildConfigMessage(baseConfig()), "");
      expect(updates).toHaveLength(0);
    });

    it("rejects origin with wrong protocol", () => {
      sendMessage(buildConfigMessage(baseConfig()), "http://docs.provii.app");
      expect(updates).toHaveLength(0);
    });

    it("accepts origin with trailing slash stripped", () => {
      dispose();
      dispose = install({
        allowedOrigins: ["https://example.com/"],
      });
      sendMessage(buildConfigMessage(baseConfig()), "https://example.com");
      expect(updates).toHaveLength(1);
    });

    it("accepts origin when event origin has trailing slash", () => {
      sendMessage(buildConfigMessage(baseConfig()), "https://docs.provii.app/");
      expect(updates).toHaveLength(1);
    });

    it("accepts origin when both have trailing slashes", () => {
      dispose();
      dispose = install({
        allowedOrigins: ["https://example.com/"],
      });
      sendMessage(buildConfigMessage(baseConfig()), "https://example.com/");
      expect(updates).toHaveLength(1);
    });

    it("strips multiple trailing slashes from origin", () => {
      sendMessage(buildConfigMessage(baseConfig()), "https://docs.provii.app///");
      expect(updates).toHaveLength(1);
    });

    it("strips multiple trailing slashes from allowlist entry", () => {
      dispose();
      dispose = install({
        allowedOrigins: ["https://example.com///"],
      });
      sendMessage(buildConfigMessage(baseConfig()), "https://example.com");
      expect(updates).toHaveLength(1);
    });

    it("skips wildcard entries in allowlist", () => {
      dispose();
      dispose = install({
        allowedOrigins: ["*"],
      });
      sendMessage(buildConfigMessage(baseConfig()), "https://any-origin.com");
      expect(updates).toHaveLength(0);
    });

    it("skips wildcard but still matches explicit entries", () => {
      dispose();
      dispose = install({
        allowedOrigins: ["*", "https://good.example"],
      });
      sendMessage(buildConfigMessage(baseConfig()), "https://good.example");
      expect(updates).toHaveLength(1);
    });

    it("accepts literal 'null' origin when allowlisted", () => {
      dispose();
      dispose = install({
        allowedOrigins: ["null"],
      });
      sendMessage(buildConfigMessage(baseConfig()), "null");
      expect(updates).toHaveLength(1);
    });

    it("rejects literal 'null' origin when NOT allowlisted", () => {
      sendMessage(buildConfigMessage(baseConfig()), "null");
      expect(updates).toHaveLength(0);
    });

    it("rejects when allowedOrigins is empty array", () => {
      dispose();
      dispose = install({ allowedOrigins: [] });
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates).toHaveLength(0);
    });

    it("matches first entry in multi-entry allowlist", () => {
      dispose();
      dispose = install({
        allowedOrigins: ["https://first.example", "https://second.example"],
      });
      sendMessage(buildConfigMessage(baseConfig()), "https://first.example");
      expect(updates).toHaveLength(1);
    });

    it("matches second entry in multi-entry allowlist", () => {
      dispose();
      dispose = install({
        allowedOrigins: ["https://first.example", "https://second.example"],
      });
      sendMessage(buildConfigMessage(baseConfig()), "https://second.example");
      expect(updates).toHaveLength(1);
    });

    it("performs case-sensitive origin comparison", () => {
      sendMessage(
        buildConfigMessage(baseConfig()),
        "https://DOCS.PROVII.APP",
      );
      expect(updates).toHaveLength(0);
    });
  });

  // =========================================================================
  // 2. Message parsing rejection
  // =========================================================================
  describe("message parsing", () => {
    it("rejects non-object message data", () => {
      sendMessage("just-a-string", ORIGIN);
      expect(updates).toHaveLength(0);
    });

    it("rejects null message data", () => {
      sendMessage(null, ORIGIN);
      expect(updates).toHaveLength(0);
    });

    it("rejects message with wrong type field", () => {
      sendMessage({ type: "not-agegate-config", version: 1, config: {} }, ORIGIN);
      expect(updates).toHaveLength(0);
    });

    it("rejects message with wrong version", () => {
      sendMessage({ type: "agegate-config", version: 2, config: {} }, ORIGIN);
      expect(updates).toHaveLength(0);
    });

    it("warns on rejected message", () => {
      sendMessage({ type: "wrong" }, ORIGIN);
      expect(warnSpy).toHaveBeenCalledWith(
        "[agegate-preview-bridge] rejected message",
        expect.any(String),
      );
    });

    it("pins the warn prefix string exactly", () => {
      sendMessage(42, ORIGIN);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const prefix = warnSpy.mock.calls[0][0] as string;
      expect(prefix).toBe("[agegate-preview-bridge] rejected message");
    });
  });

  // =========================================================================
  // 3. CSS variable application (applyCssVars)
  // =========================================================================
  describe("CSS variables", () => {
    it("sets --ag-accent-start to brandColour", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ brandColour: "#ff0000" })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-accent-start")).toBe("#ff0000");
    });

    it("sets --ag-accent-gradient with correct format string", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      const gradient = root.style.getPropertyValue("--ag-accent-gradient");
      expect(gradient).toBe(
        "linear-gradient(135deg, #0091c7 0%, #5b3df5 50%, #c23ad6 100%)",
      );
    });

    it("pins gradient stop percentages: 0%, 50%, 100%", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      const gradient = root.style.getPropertyValue("--ag-accent-gradient");
      expect(gradient).toContain("0%");
      expect(gradient).toContain("50%");
      expect(gradient).toContain("100%");
    });

    it("pins gradient default angle to 135 degrees", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      const gradient = root.style.getPropertyValue("--ag-accent-gradient");
      expect(gradient).toMatch(/^linear-gradient\(135deg,/);
    });

    it("uses explicit gradientAngle when provided", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ gradientAngle: 45 })),
        ORIGIN,
      );
      const gradient = root.style.getPropertyValue("--ag-accent-gradient");
      expect(gradient).toMatch(/^linear-gradient\(45deg,/);
    });

    it("uses gradientAngle 0 when explicitly set to 0", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ gradientAngle: 0 })),
        ORIGIN,
      );
      const gradient = root.style.getPropertyValue("--ag-accent-gradient");
      expect(gradient).toMatch(/^linear-gradient\(0deg,/);
    });

    it("sets --ag-accent-mid to second gradient stop", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(root.style.getPropertyValue("--ag-accent-mid")).toBe("#5b3df5");
    });

    it("sets --ag-accent-end to third gradient stop", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(root.style.getPropertyValue("--ag-accent-end")).toBe("#c23ad6");
    });

    it("sets --ag-radius-container with px suffix", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ containerRadius: 24 })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-radius-container")).toBe("24px");
    });

    it("sets --ag-radius-button with px suffix", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ buttonRadius: 12 })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-radius-button")).toBe("12px");
    });

    it("sets --ag-font-family to fontFamily value", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ fontFamily: "Inter" })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-font-family")).toBe("Inter");
    });

    it("sets --ag-motion-duration with ms suffix", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ motionDuration: 300 })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-motion-duration")).toBe("300ms");
    });

    it("sets --ag-motion-duration to 0ms when motionDuration is 0", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ motionDuration: 0 })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-motion-duration")).toBe("0ms");
    });

    it("sets --ag-qr-fg when qrForeground is present", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ qrForeground: "#112233" })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-qr-fg")).toBe("#112233");
    });

    it("does NOT set --ag-qr-fg when qrForeground is absent", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(root.style.getPropertyValue("--ag-qr-fg")).toBe("");
    });

    it("sets --ag-qr-bg when qrBackground is present", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ qrBackground: "#ffffff" })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-qr-bg")).toBe("#ffffff");
    });

    it("does NOT set --ag-qr-bg when qrBackground is absent", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(root.style.getPropertyValue("--ag-qr-bg")).toBe("");
    });

    it("sets --ag-button-text when buttonTextColour is present", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ buttonTextColour: "#aabbcc" })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-button-text")).toBe("#aabbcc");
    });

    it("does NOT set --ag-button-text when buttonTextColour is absent", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(root.style.getPropertyValue("--ag-button-text")).toBe("");
    });

    it("sets --ag-overlay-backdrop from backdropOpacity", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ backdropOpacity: 75 })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-overlay-backdrop")).toBe(
        "rgba(0, 0, 0, 0.75)",
      );
    });

    it("computes backdropOpacity 100 as 1.00", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ backdropOpacity: 100 })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-overlay-backdrop")).toBe(
        "rgba(0, 0, 0, 1.00)",
      );
    });

    it("computes backdropOpacity 0 as 0.00", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ backdropOpacity: 0 })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-overlay-backdrop")).toBe(
        "rgba(0, 0, 0, 0.00)",
      );
    });

    it("does NOT set --ag-overlay-backdrop when backdropOpacity is absent", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(root.style.getPropertyValue("--ag-overlay-backdrop")).toBe("");
    });

    it("pins the rgba format string for backdrop", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ backdropOpacity: 50 })),
        ORIGIN,
      );
      const value = root.style.getPropertyValue("--ag-overlay-backdrop");
      // Must be exactly rgba(0, 0, 0, <alpha>) with two decimal places
      expect(value).toMatch(/^rgba\(0, 0, 0, \d+\.\d{2}\)$/);
    });
  });

  // =========================================================================
  // 4. prefers-reduced-motion
  // =========================================================================
  describe("prefers-reduced-motion", () => {
    let originalMatchMedia: typeof window.matchMedia;

    beforeEach(() => {
      originalMatchMedia = window.matchMedia;
    });

    afterEach(() => {
      (window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia =
        originalMatchMedia;
    });

    function mockMatchMedia(prefersReduced: boolean): void {
      (window as unknown as { matchMedia: unknown }).matchMedia = ((
        query: string,
      ) => ({
        matches:
          prefersReduced && query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
    }

    it("zeroes motion duration when prefers-reduced-motion matches", () => {
      mockMatchMedia(true);
      sendMessage(
        buildConfigMessage(baseConfig({ motionDuration: 500 })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-motion-duration")).toBe("0ms");
    });

    it("preserves motion duration when prefers-reduced-motion does not match", () => {
      mockMatchMedia(false);
      sendMessage(
        buildConfigMessage(baseConfig({ motionDuration: 500 })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-motion-duration")).toBe("500ms");
    });

    it("falls back to false when matchMedia throws", () => {
      (window as unknown as { matchMedia: unknown }).matchMedia = () => {
        throw new Error("not supported");
      };
      sendMessage(
        buildConfigMessage(baseConfig({ motionDuration: 400 })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-motion-duration")).toBe("400ms");
    });

    it("falls back to false when matchMedia is undefined", () => {
      (window as unknown as { matchMedia: unknown }).matchMedia = undefined as unknown as typeof window.matchMedia;
      sendMessage(
        buildConfigMessage(baseConfig({ motionDuration: 350 })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-motion-duration")).toBe("350ms");
    });

    it("pins the exact media query string", () => {
      let capturedQuery = "";
      (window as unknown as { matchMedia: unknown }).matchMedia = ((
        query: string,
      ) => {
        capturedQuery = query;
        return {
          matches: false,
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        };
      }) as unknown as typeof window.matchMedia;
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(capturedQuery).toBe("(prefers-reduced-motion: reduce)");
    });
  });

  // =========================================================================
  // 5. Theme attribute (data-agegate-theme)
  // =========================================================================
  describe("theme attribute", () => {
    it("sets data-agegate-theme to 'light' for light theme", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ theme: "light" })),
        ORIGIN,
      );
      expect(root.getAttribute("data-agegate-theme")).toBe("light");
    });

    it("sets data-agegate-theme to 'dark' for dark theme", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ theme: "dark" })),
        ORIGIN,
      );
      expect(root.getAttribute("data-agegate-theme")).toBe("dark");
    });

    it("removes data-agegate-theme for 'auto' theme", () => {
      // First set it
      root.setAttribute("data-agegate-theme", "dark");
      sendMessage(
        buildConfigMessage(baseConfig({ theme: "auto" })),
        ORIGIN,
      );
      expect(root.hasAttribute("data-agegate-theme")).toBe(false);
    });

    it("removes data-agegate-theme when theme is absent", () => {
      root.setAttribute("data-agegate-theme", "light");
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(root.hasAttribute("data-agegate-theme")).toBe(false);
    });

    it("pins the attribute name exactly as 'data-agegate-theme'", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ theme: "dark" })),
        ORIGIN,
      );
      // Verify the exact attribute name, not just value
      expect(root.getAttributeNames()).toContain("data-agegate-theme");
    });
  });

  // =========================================================================
  // 6. Document element dir and lang attributes
  // =========================================================================
  describe("dir and lang attributes", () => {
    it("sets html[dir] to 'ltr'", () => {
      sendMessage(buildConfigMessage(baseConfig({ dir: "ltr" })), ORIGIN);
      expect(document.documentElement.getAttribute("dir")).toBe("ltr");
    });

    it("sets html[dir] to 'rtl'", () => {
      sendMessage(buildConfigMessage(baseConfig({ dir: "rtl" })), ORIGIN);
      expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    });

    it("sets html[lang] to locale value", () => {
      sendMessage(buildConfigMessage(baseConfig({ locale: "fr" })), ORIGIN);
      expect(document.documentElement.getAttribute("lang")).toBe("fr");
    });

    it("sets html[lang] to BCP 47 subtag locale", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ locale: "zh-Hans" })),
        ORIGIN,
      );
      expect(document.documentElement.getAttribute("lang")).toBe("zh-Hans");
    });

    it("sets dir on documentElement even when custom root is used", () => {
      sendMessage(buildConfigMessage(baseConfig({ dir: "rtl" })), ORIGIN);
      // dir is set on document.documentElement, not on root
      expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    });
  });

  // =========================================================================
  // 7. Structural vs cosmetic change detection (anyStructuralChange)
  // =========================================================================
  describe("structural change detection", () => {
    it("always calls target.update on the first message", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates).toHaveLength(1);
    });

    it("does NOT call target.update when only brandColour changes", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(baseConfig({ brandColour: "#ff0000" })),
        ORIGIN,
      );
      expect(updates).toHaveLength(1);
    });

    it("does NOT call target.update when only containerRadius changes", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(baseConfig({ containerRadius: 32 })),
        ORIGIN,
      );
      expect(updates).toHaveLength(1);
    });

    it("does NOT call target.update when only buttonRadius changes", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(baseConfig({ buttonRadius: 4 })),
        ORIGIN,
      );
      expect(updates).toHaveLength(1);
    });

    it("does NOT call target.update when only fontFamily changes", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(baseConfig({ fontFamily: "Inter" })),
        ORIGIN,
      );
      expect(updates).toHaveLength(1);
    });

    // motionDuration and accentGradient are now structural: the var-only
    // path could not make them observable (the .container entrance
    // animation reads --ag-motion-duration only on (re)mount, and the QR
    // canvas reads its accent stops at construction). This replaces the
    // earlier false-confidence test that asserted motionDuration was purely
    // cosmetic — it set the CSS var but the preview never changed.
    it("calls target.update when only motionDuration changes", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(baseConfig({ motionDuration: 500 })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("calls target.update when accentGradient changes by value", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(
          baseConfig({ accentGradient: ["#111111", "#222222", "#333333"] }),
        ),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("does NOT call target.update when accentGradient is unchanged by value", () => {
      // A fresh array reference every message must NOT count as a change,
      // or every cosmetic keystroke would rebuild the QR.
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(
          baseConfig({ accentGradient: ["#0091c7", "#5b3df5", "#c23ad6"] }),
        ),
        ORIGIN,
      );
      expect(updates).toHaveLength(1);
    });

    it("calls target.update when locale changes", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(baseConfig({ locale: "fr" })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("calls target.update when logoUrl changes", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(
          baseConfig({ logoUrl: "https://example.com/logo.png" }),
        ),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("calls target.update when logoSvg changes", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(baseConfig({ logoSvg: "<svg></svg>" })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("calls target.update when privacyPolicyUrl changes", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(
          baseConfig({
            privacyPolicyUrl: "https://example.com/privacy",
          }),
        ),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("calls target.update when previewLayout changes", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(baseConfig({ previewLayout: "mobile" })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("calls target.update when qrDotStyle changes", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(baseConfig({ qrDotStyle: "rounded" })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("calls target.update when qrEyeFrameStyle changes", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(baseConfig({ qrEyeFrameStyle: "dot" })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("calls target.update when qrEyeDotStyle changes", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(baseConfig({ qrEyeDotStyle: "dot" })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("calls target.update when qrLogoUrl changes", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(
          baseConfig({ qrLogoUrl: "https://example.com/qr-logo.png" }),
        ),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("calls target.update when qrForeground changes", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(baseConfig({ qrForeground: "#000000" })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("calls target.update when qrBackground changes", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(baseConfig({ qrBackground: "#ffffff" })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("calls target.update when strings change", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(baseConfig({ strings: { heading: "Hello" } })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("does NOT call target.update when strings are identical", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ strings: { heading: "Hello" } })),
        ORIGIN,
      );
      sendMessage(
        buildConfigMessage(baseConfig({ strings: { heading: "Hello" } })),
        ORIGIN,
      );
      expect(updates).toHaveLength(1);
    });

    it("detects string value change as structural", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ strings: { heading: "Hello" } })),
        ORIGIN,
      );
      sendMessage(
        buildConfigMessage(baseConfig({ strings: { heading: "Goodbye" } })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("detects string key addition as structural", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ strings: { a: "1" } })),
        ORIGIN,
      );
      sendMessage(
        buildConfigMessage(baseConfig({ strings: { a: "1", b: "2" } })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("detects string key removal as structural", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ strings: { a: "1", b: "2" } })),
        ORIGIN,
      );
      sendMessage(
        buildConfigMessage(baseConfig({ strings: { a: "1" } })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });
  });

  // =========================================================================
  // 8. target.update payload construction
  // =========================================================================
  describe("update payload", () => {
    it("always includes locale in update payload", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates[0]).toHaveProperty("locale", "en");
    });

    it("always includes strings in update payload", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates[0]).toHaveProperty("strings", {});
    });

    it("always forwards accentGradient so the target can recolour the QR", () => {
      sendMessage(
        buildConfigMessage(
          baseConfig({ accentGradient: ["#111111", "#222222", "#333333"] }),
        ),
        ORIGIN,
      );
      expect(updates[0]).toHaveProperty("accentGradient", [
        "#111111",
        "#222222",
        "#333333",
      ]);
    });

    it("always forwards motionDuration so the target can replay the animation", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ motionDuration: 333 })),
        ORIGIN,
      );
      expect(updates[0]).toHaveProperty("motionDuration", 333);
    });

    it("includes logoUrl when defined", () => {
      sendMessage(
        buildConfigMessage(
          baseConfig({ logoUrl: "https://example.com/logo.png" }),
        ),
        ORIGIN,
      );
      expect(updates[0]).toHaveProperty(
        "logoUrl",
        "https://example.com/logo.png",
      );
    });

    it("excludes logoUrl when undefined", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates[0]).not.toHaveProperty("logoUrl");
    });

    it("includes logoSvg when defined", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ logoSvg: "<svg></svg>" })),
        ORIGIN,
      );
      expect(updates[0]).toHaveProperty("logoSvg");
    });

    it("excludes logoSvg when undefined", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates[0]).not.toHaveProperty("logoSvg");
    });

    it("includes privacyPolicyUrl when defined", () => {
      sendMessage(
        buildConfigMessage(
          baseConfig({ privacyPolicyUrl: "https://example.com/pp" }),
        ),
        ORIGIN,
      );
      expect(updates[0]).toHaveProperty(
        "privacyPolicyUrl",
        "https://example.com/pp",
      );
    });

    it("excludes privacyPolicyUrl when undefined", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates[0]).not.toHaveProperty("privacyPolicyUrl");
    });

    it("includes previewLayout when defined", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ previewLayout: "desktop" })),
        ORIGIN,
      );
      expect(updates[0]).toHaveProperty("previewLayout", "desktop");
    });

    it("excludes previewLayout when undefined", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates[0]).not.toHaveProperty("previewLayout");
    });

    it("includes qrDotStyle when defined", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ qrDotStyle: "classy" })),
        ORIGIN,
      );
      expect(updates[0]).toHaveProperty("qrDotStyle", "classy");
    });

    it("excludes qrDotStyle when undefined", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates[0]).not.toHaveProperty("qrDotStyle");
    });

    it("includes qrEyeFrameStyle when defined", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ qrEyeFrameStyle: "square" })),
        ORIGIN,
      );
      expect(updates[0]).toHaveProperty("qrEyeFrameStyle", "square");
    });

    it("excludes qrEyeFrameStyle when undefined", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates[0]).not.toHaveProperty("qrEyeFrameStyle");
    });

    it("includes qrEyeDotStyle when defined", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ qrEyeDotStyle: "dot" })),
        ORIGIN,
      );
      expect(updates[0]).toHaveProperty("qrEyeDotStyle", "dot");
    });

    it("excludes qrEyeDotStyle when undefined", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates[0]).not.toHaveProperty("qrEyeDotStyle");
    });

    it("includes qrLogoUrl when defined", () => {
      sendMessage(
        buildConfigMessage(
          baseConfig({ qrLogoUrl: "https://example.com/qr.png" }),
        ),
        ORIGIN,
      );
      expect(updates[0]).toHaveProperty(
        "qrLogoUrl",
        "https://example.com/qr.png",
      );
    });

    it("excludes qrLogoUrl when undefined", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates[0]).not.toHaveProperty("qrLogoUrl");
    });

    it("includes qrForeground when defined", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ qrForeground: "#abcdef" })),
        ORIGIN,
      );
      expect(updates[0]).toHaveProperty("qrForeground", "#abcdef");
    });

    it("excludes qrForeground when undefined", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates[0]).not.toHaveProperty("qrForeground");
    });

    it("includes qrBackground when defined", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ qrBackground: "#123456" })),
        ORIGIN,
      );
      expect(updates[0]).toHaveProperty("qrBackground", "#123456");
    });

    it("excludes qrBackground when undefined", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates[0]).not.toHaveProperty("qrBackground");
    });
  });

  // =========================================================================
  // 9. target.update error handling
  // =========================================================================
  describe("target.update error handling", () => {
    it("catches and warns when target.update throws", () => {
      dispose();
      const throwingTarget: PreviewBridgeTarget = {
        update: () => {
          throw new Error("boom");
        },
      };
      dispose = install({ target: throwingTarget });
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(warnSpy).toHaveBeenCalledWith(
        "[agegate-preview-bridge] target.update() threw",
        expect.any(Error),
      );
    });

    it("pins the target.update error warn prefix", () => {
      dispose();
      const throwingTarget: PreviewBridgeTarget = {
        update: () => {
          throw new Error("test");
        },
      };
      dispose = install({ target: throwingTarget });
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      const prefix = warnSpy.mock.calls[0][0] as string;
      expect(prefix).toBe("[agegate-preview-bridge] target.update() threw");
    });

    it("still applies CSS variables when target.update throws", () => {
      dispose();
      const throwingTarget: PreviewBridgeTarget = {
        update: () => {
          throw new Error("fail");
        },
      };
      dispose = install({ target: throwingTarget });
      sendMessage(
        buildConfigMessage(baseConfig({ brandColour: "#aabbcc" })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-accent-start")).toBe("#aabbcc");
    });

    it("still sets dir and lang when target.update throws", () => {
      dispose();
      const throwingTarget: PreviewBridgeTarget = {
        update: () => {
          throw new Error("fail");
        },
      };
      dispose = install({ target: throwingTarget });
      sendMessage(
        buildConfigMessage(baseConfig({ dir: "rtl", locale: "ar" })),
        ORIGIN,
      );
      expect(document.documentElement.getAttribute("dir")).toBe("rtl");
      expect(document.documentElement.getAttribute("lang")).toBe("ar");
    });
  });

  // =========================================================================
  // 10. Dispose and listener lifecycle
  // =========================================================================
  describe("dispose", () => {
    it("removes message listener so subsequent messages are ignored", () => {
      dispose();
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates).toHaveLength(0);
      // Re-install for afterEach
      dispose = install();
    });

    it("is safe to call dispose multiple times", () => {
      dispose();
      expect(() => dispose()).not.toThrow();
      // Re-install for afterEach
      dispose = install();
    });

    it("nullifies the handler reference on dispose", () => {
      dispose();
      // Second dispose should be a no-op, not throw
      dispose();
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates).toHaveLength(0);
      dispose = install();
    });
  });

  // =========================================================================
  // 11. Options: root, target, window/document overrides
  // =========================================================================
  describe("options and fallbacks", () => {
    it("uses documentElement when root option is null", () => {
      dispose();
      dispose = install({ root: null });
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(
        document.documentElement.style.getPropertyValue("--ag-accent-start"),
      ).toBe("#0091c7");
      // Clean up
      document.documentElement.style.removeProperty("--ag-accent-start");
    });

    it("uses documentElement when root option is undefined", () => {
      dispose();
      dispose = install({ root: undefined });
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(
        document.documentElement.style.getPropertyValue("--ag-accent-start"),
      ).toBe("#0091c7");
      document.documentElement.style.removeProperty("--ag-accent-start");
    });

    it("skips target.update when target is null", () => {
      dispose();
      dispose = install({ target: null as unknown as PreviewBridgeTarget });
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      // Should not throw, and no updates
      expect(updates).toHaveLength(0);
    });

    it("skips target.update when target is undefined", () => {
      dispose();
      dispose = install({
        target: undefined as unknown as PreviewBridgeTarget,
      });
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(updates).toHaveLength(0);
    });

    it("still applies CSS when target is null", () => {
      dispose();
      dispose = install({ target: null as unknown as PreviewBridgeTarget });
      sendMessage(
        buildConfigMessage(baseConfig({ brandColour: "#112233" })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-accent-start")).toBe("#112233");
    });

    it("still sets dir and lang when target is null", () => {
      dispose();
      dispose = install({ target: null as unknown as PreviewBridgeTarget });
      sendMessage(
        buildConfigMessage(baseConfig({ dir: "rtl", locale: "ar" })),
        ORIGIN,
      );
      expect(document.documentElement.getAttribute("dir")).toBe("rtl");
      expect(document.documentElement.getAttribute("lang")).toBe("ar");
    });
  });

  // =========================================================================
  // 12. State tracking (lastConfig)
  // =========================================================================
  describe("lastConfig state tracking", () => {
    it("stores config after first message for diff detection", () => {
      const config = baseConfig();
      sendMessage(buildConfigMessage(config), ORIGIN);
      // Send identical config: no structural update
      sendMessage(buildConfigMessage(config), ORIGIN);
      expect(updates).toHaveLength(1);
    });

    it("updates stored config after each message", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      // Change locale: structural
      sendMessage(
        buildConfigMessage(baseConfig({ locale: "fr" })),
        ORIGIN,
      );
      // Send same fr config: no new structural update
      sendMessage(
        buildConfigMessage(baseConfig({ locale: "fr" })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("updates CSS on every message even without structural change", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      sendMessage(
        buildConfigMessage(baseConfig({ brandColour: "#aaaaaa" })),
        ORIGIN,
      );
      sendMessage(
        buildConfigMessage(baseConfig({ brandColour: "#bbbbbb" })),
        ORIGIN,
      );
      expect(root.style.getPropertyValue("--ag-accent-start")).toBe("#bbbbbb");
      // Only one structural update (the first)
      expect(updates).toHaveLength(1);
    });
  });

  // =========================================================================
  // 13. shallowEqualStrings edge cases
  // =========================================================================
  describe("shallowEqualStrings", () => {
    it("treats two empty objects as equal (no structural change)", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ strings: {} })),
        ORIGIN,
      );
      sendMessage(
        buildConfigMessage(baseConfig({ strings: {} })),
        ORIGIN,
      );
      expect(updates).toHaveLength(1);
    });

    it("detects key count difference", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ strings: { a: "1" } })),
        ORIGIN,
      );
      sendMessage(
        buildConfigMessage(baseConfig({ strings: {} })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("detects same key count but different keys", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ strings: { a: "1" } })),
        ORIGIN,
      );
      sendMessage(
        buildConfigMessage(baseConfig({ strings: { b: "1" } })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });

    it("detects same keys but different values", () => {
      sendMessage(
        buildConfigMessage(baseConfig({ strings: { a: "one" } })),
        ORIGIN,
      );
      sendMessage(
        buildConfigMessage(baseConfig({ strings: { a: "two" } })),
        ORIGIN,
      );
      expect(updates).toHaveLength(2);
    });
  });

  // =========================================================================
  // 14. CSS variable name pinning (mutation of string literals)
  // =========================================================================
  describe("CSS variable name pinning", () => {
    it("uses exactly '--ag-accent-start' for brandColour", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(root.style.getPropertyValue("--ag-accent-start")).not.toBe("");
    });

    it("uses exactly '--ag-accent-gradient' for gradient", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(root.style.getPropertyValue("--ag-accent-gradient")).not.toBe("");
    });

    it("uses exactly '--ag-accent-mid' for gradient mid stop", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(root.style.getPropertyValue("--ag-accent-mid")).not.toBe("");
    });

    it("uses exactly '--ag-accent-end' for gradient end stop", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(root.style.getPropertyValue("--ag-accent-end")).not.toBe("");
    });

    it("uses exactly '--ag-radius-container' for container radius", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(root.style.getPropertyValue("--ag-radius-container")).not.toBe("");
    });

    it("uses exactly '--ag-radius-button' for button radius", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(root.style.getPropertyValue("--ag-radius-button")).not.toBe("");
    });

    it("uses exactly '--ag-font-family' for font family", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(root.style.getPropertyValue("--ag-font-family")).not.toBe("");
    });

    it("uses exactly '--ag-motion-duration' for motion duration", () => {
      sendMessage(buildConfigMessage(baseConfig()), ORIGIN);
      expect(root.style.getPropertyValue("--ag-motion-duration")).not.toBe("");
    });
  });
});
