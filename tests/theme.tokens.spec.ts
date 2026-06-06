/**
 * W10-3.1: Brand-tunable theme token coverage.
 *
 * Verifies that every structural value the task brief calls out as
 * customisable is exposed as a :host CSS custom property in
 * DEFAULT_THEME_CSS, and that the tokens drive the downstream rules
 * (container radius, button radius, logo size, font family, motion,
 * accent gradient, privacy link colour).
 *
 * @jest-environment jsdom
 */

import { DEFAULT_THEME_CSS } from "../src/styles/theme.js";

const REQUIRED_TOKENS = [
  "--ag-radius-container",
  "--ag-radius-button",
  "--ag-font-family",
  "--ag-logo-size",
  "--ag-motion-duration",
  "--ag-accent-gradient",
  "--ag-privacy-link",
] as const;

describe("theme tokens (W10-3.1)", () => {
  it.each(REQUIRED_TOKENS)(
    "declares %s on :host with a default value",
    (token) => {
      const declarationPattern = new RegExp(`\\${token}\\s*:\\s*[^;]+;`);
      expect(DEFAULT_THEME_CSS).toMatch(declarationPattern);
    },
  );

  it("wires --ag-radius-container into .container", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.container\s*\{[^}]*border-radius:\s*var\(--ag-radius-container\)/s,
    );
  });

  it("wires --ag-motion-duration into the container animation", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /animation:\s*slideUp\s+var\(--ag-motion-duration\)/,
    );
  });

  it("wires --ag-font-family on body", () => {
    expect(DEFAULT_THEME_CSS).toMatch(/font-family:\s*var\(--ag-font-family\)/);
  });

  it("wires --ag-logo-size on .logo", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.logo\s*\{[^}]*width:\s*var\(--ag-logo-size\)/s,
    );
  });

  it("wires --ag-radius-button into mobile CTA and retry button", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.gate-container \.agegate-link\s*\{[^}]*border-radius:\s*var\(--ag-radius-button\)/s,
    );
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.retry-button\s*\{[^}]*border-radius:\s*var\(--ag-radius-button\)/s,
    );
  });

  it("declares dark-mode override for --ag-privacy-link", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /:host\(\[data-agegate-theme="dark"\]\)\s*\{[^}]*--ag-privacy-link:/s,
    );
  });
});
