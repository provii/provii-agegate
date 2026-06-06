/**
 * W10-3.5: accentGradient option coverage.
 *
 * Parser handles both hex-triple and raw CSS variants, rejects
 * malformed input with a warning, and AutoBlockMode paints the
 * resulting CSS value onto the shadow host --ag-accent-gradient.
 *
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.com"}
 */

import { parseConfig, isValidHexColour } from "../src/modes/config-parser.js";
import { AutoBlockMode } from "../src/modes/autoload.js";
import type { AutoBlockConfig } from "../src/core/types.js";

const TEST_PUBLIC_KEY =
  "pk_test_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function mkScript(attrs: Record<string, string>): HTMLScriptElement {
  const s = document.createElement("script");
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.body.appendChild(s);
  return s;
}

function baseCfg(override: Partial<AutoBlockConfig> = {}): AutoBlockConfig {
  return { publicKey: TEST_PUBLIC_KEY, environment: "sandbox", ...override };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("hex colour validator", () => {
  it.each(["#fff", "#1e3a6e", "#ABCDEF"])("accepts %s", (c) => {
    expect(isValidHexColour(c)).toBe(true);
  });

  it.each(["fff", "#ggg", "#12", "#1234567", "", "rgb(0,0,0)"])(
    "rejects %s",
    (c) => {
      expect(isValidHexColour(c)).toBe(false);
    },
  );
});

describe("config-parser accentGradient (W10-3.5)", () => {
  it("parses a hex triple into the tuple form", () => {
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-accent-gradient": "#1E3A6E, #7B3FA0, #C05525",
    });
    expect(parseConfig(s).accentGradient).toEqual([
      "#1E3A6E",
      "#7B3FA0",
      "#C05525",
    ]);
  });

  it("passes through a CSS gradient value verbatim", () => {
    const css = "linear-gradient(45deg, red, blue)";
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-accent-gradient": css,
    });
    expect(parseConfig(s).accentGradient).toBe(css);
  });

  it("warns and drops a malformed hex triple", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-accent-gradient": "#1E3A6E, notahex, #C05525",
    });
    expect(parseConfig(s).accentGradient).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("drops a triple with the wrong arity", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const s = mkScript({
      "data-public-key": TEST_PUBLIC_KEY,
      "data-accent-gradient": "#1E3A6E, #C05525",
    });
    expect(parseConfig(s).accentGradient).toBeUndefined();
    warn.mockRestore();
  });
});

describe("AutoBlockMode accentGradient wiring", () => {
  it("paints the tuple onto --ag-accent-gradient on the shadow host", () => {
    const mode = new AutoBlockMode(
      baseCfg({
        accentGradient: ["#112233", "#445566", "#778899"],
      }),
    );
    (mode as unknown as { showOverlay: (m: string) => void }).showOverlay("x");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.style.getPropertyValue("--ag-accent-gradient")).toContain(
      "#112233",
    );
    expect(host.style.getPropertyValue("--ag-accent-gradient")).toContain(
      "#778899",
    );
  });

  it("applies a raw CSS gradient value verbatim", () => {
    const css = "linear-gradient(90deg, #aaa, #bbb)";
    const mode = new AutoBlockMode(baseCfg({ accentGradient: css }));
    (mode as unknown as { showOverlay: (m: string) => void }).showOverlay("x");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.style.getPropertyValue("--ag-accent-gradient")).toBe(css);
  });

  it("rejects a malformed tuple at runtime with a warning", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const mode = new AutoBlockMode(
      baseCfg({
        accentGradient: ["#112233", "notahex", "#778899"] as unknown as [
          string,
          string,
          string,
        ],
      }),
    );
    (mode as unknown as { showOverlay: (m: string) => void }).showOverlay("x");
    const host = document.body.querySelector("div") as HTMLElement;
    expect(host.style.getPropertyValue("--ag-accent-gradient")).toBe("");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
