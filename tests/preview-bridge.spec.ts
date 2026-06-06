// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Tests for the preview bridge. The bridge listens
 * for typed `agegate-config` messages from the parent frame and
 * applies structural updates through a supplied target plus cosmetic
 * updates via CSS custom properties.
 */

import {
  installPreviewBridge,
  type AgegateConfigPayload,
  type PreviewBridgeTarget,
} from "../src/modes/preview-bridge.js";
import { buildConfigMessage } from "../src/modes/bridge-schema.js";

function baseConfig(): AgegateConfigPayload {
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
  };
}

function dispatchMessage(data: unknown, origin: string): void {
  window.dispatchEvent(new MessageEvent("message", { data, origin }));
}

describe("preview bridge", () => {
  let root: HTMLElement;
  let updates: Array<Partial<AgegateConfigPayload>>;
  let target: PreviewBridgeTarget;
  let dispose: () => void;

  beforeEach(() => {
    document.documentElement.removeAttribute("dir");
    document.documentElement.removeAttribute("lang");
    root = document.createElement("div");
    document.body.appendChild(root);
    updates = [];
    target = {
      update: (partial: Partial<AgegateConfigPayload>) => {
        updates.push(partial);
      },
    };
    dispose = installPreviewBridge({
      allowedOrigins: ["https://docs.provii.app"],
      target,
      root,
    });
  });

  afterEach(() => {
    dispose();
    document.body.removeChild(root);
  });

  it("ignores messages from an unapproved origin", () => {
    dispatchMessage(
      buildConfigMessage(baseConfig()),
      "https://attacker.example",
    );
    expect(root.style.getPropertyValue("--ag-accent-start")).toBe("");
    expect(updates).toHaveLength(0);
  });

  it("rejects malformed messages silently", () => {
    dispatchMessage(
      { type: "something-else" },
      "https://docs.provii.app",
    );
    expect(updates).toHaveLength(0);
    expect(root.style.getPropertyValue("--ag-accent-start")).toBe("");
  });

  it("applies CSS custom properties for cosmetic keys", () => {
    dispatchMessage(
      buildConfigMessage(baseConfig()),
      "https://docs.provii.app",
    );
    // brandColour maps to --ag-accent-start
    expect(root.style.getPropertyValue("--ag-accent-start")).toBe("#0091c7");
    // accent gradient composite string
    expect(root.style.getPropertyValue("--ag-accent-gradient")).toContain(
      "#0091c7",
    );
    expect(root.style.getPropertyValue("--ag-accent-gradient")).toContain(
      "#5b3df5",
    );
    expect(root.style.getPropertyValue("--ag-accent-gradient")).toContain(
      "#c23ad6",
    );
    // individual stop tokens consumed by theme
    expect(root.style.getPropertyValue("--ag-accent-mid")).toBe("#5b3df5");
    expect(root.style.getPropertyValue("--ag-accent-end")).toBe("#c23ad6");
    expect(root.style.getPropertyValue("--ag-radius-container")).toBe("16px");
    expect(root.style.getPropertyValue("--ag-radius-button")).toBe("8px");
    expect(root.style.getPropertyValue("--ag-font-family")).toBe("system-ui");
    expect(root.style.getPropertyValue("--ag-motion-duration")).toBe("220ms");
  });

  it("calls target.update with structural keys on first message", () => {
    dispatchMessage(
      buildConfigMessage(baseConfig()),
      "https://docs.provii.app",
    );
    expect(updates).toHaveLength(1);
    expect(updates[0]?.locale).toBe("en");
  });

  it("skips structural update when nothing structural changed", () => {
    const first = baseConfig();
    dispatchMessage(buildConfigMessage(first), "https://docs.provii.app");
    dispatchMessage(
      buildConfigMessage({ ...first, brandColour: "#111111" }),
      "https://docs.provii.app",
    );
    expect(updates).toHaveLength(1);
    expect(root.style.getPropertyValue("--ag-accent-start")).toBe("#111111");
  });

  it("honours prefers-reduced-motion by zeroing motion duration", () => {
    const original = window.matchMedia;
    (window as unknown as { matchMedia: unknown }).matchMedia = ((
      query: string,
    ) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    dispatchMessage(
      buildConfigMessage(baseConfig()),
      "https://docs.provii.app",
    );
    expect(root.style.getPropertyValue("--ag-motion-duration")).toBe("0ms");

    (window as unknown as { matchMedia: unknown }).matchMedia = original;
  });

  it("sets html[dir] and html[lang] from the message payload", () => {
    dispatchMessage(
      buildConfigMessage({
        ...baseConfig(),
        dir: "rtl",
        locale: "ar",
      }),
      "https://docs.provii.app",
    );
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    expect(document.documentElement.getAttribute("lang")).toBe("ar");
  });

  it("detaches the listener on dispose", () => {
    dispose();
    dispatchMessage(
      buildConfigMessage(baseConfig()),
      "https://docs.provii.app",
    );
    expect(updates).toHaveLength(0);
    // Re-install for afterEach's dispose.
    dispose = installPreviewBridge({
      allowedOrigins: ["https://docs.provii.app"],
      target,
      root,
    });
  });

  // --- New field tests ---

  it("writes --ag-qr-bg when qrBackground is set", () => {
    dispatchMessage(
      buildConfigMessage({ ...baseConfig(), qrBackground: "#f0f0f0" }),
      "https://docs.provii.app",
    );
    expect(root.style.getPropertyValue("--ag-qr-bg")).toBe("#f0f0f0");
  });

  it("does not write --ag-qr-bg when qrBackground is absent", () => {
    dispatchMessage(
      buildConfigMessage(baseConfig()),
      "https://docs.provii.app",
    );
    expect(root.style.getPropertyValue("--ag-qr-bg")).toBe("");
  });

  it("writes --ag-button-text when buttonTextColour is set", () => {
    dispatchMessage(
      buildConfigMessage({ ...baseConfig(), buttonTextColour: "#000000" }),
      "https://docs.provii.app",
    );
    expect(root.style.getPropertyValue("--ag-button-text")).toBe("#000000");
  });

  it("writes --ag-overlay-backdrop when backdropOpacity is set", () => {
    dispatchMessage(
      buildConfigMessage({ ...baseConfig(), backdropOpacity: 50 }),
      "https://docs.provii.app",
    );
    expect(root.style.getPropertyValue("--ag-overlay-backdrop")).toBe(
      "rgba(0, 0, 0, 0.50)",
    );
  });

  it("uses gradient angle in the --ag-accent-gradient value", () => {
    dispatchMessage(
      buildConfigMessage({ ...baseConfig(), gradientAngle: 90 }),
      "https://docs.provii.app",
    );
    const gradient = root.style.getPropertyValue("--ag-accent-gradient");
    expect(gradient).toContain("90deg");
    expect(gradient).not.toContain("135deg");
  });

  it("defaults gradient angle to 135deg when absent", () => {
    dispatchMessage(
      buildConfigMessage(baseConfig()),
      "https://docs.provii.app",
    );
    const gradient = root.style.getPropertyValue("--ag-accent-gradient");
    expect(gradient).toContain("135deg");
  });
});
