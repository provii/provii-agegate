/** @jest-environment jsdom */

/**
 * Mutation-testing-focused test file for src/styles/theme.ts.
 *
 * The DEFAULT_THEME_CSS export is a single ~750-line template literal.
 * Stryker mutates string literals (empty string replacement, character
 * swaps). A snapshot test pins the entire output so that ANY mutation
 * to ANY character is caught. Targeted assertions pin important CSS
 * values for descriptive failure messages when a mutation does land.
 */

import { DEFAULT_THEME_CSS } from "../src/styles/theme.js";

/* ------------------------------------------------------------------ */
/*  Full-string snapshot (catches every possible string mutation)       */
/* ------------------------------------------------------------------ */
describe("DEFAULT_THEME_CSS snapshot", () => {
  it("matches the full CSS snapshot", () => {
    expect(DEFAULT_THEME_CSS).toMatchSnapshot();
  });

  it("is a non-empty string", () => {
    expect(typeof DEFAULT_THEME_CSS).toBe("string");
    expect(DEFAULT_THEME_CSS.length).toBeGreaterThan(500);
  });
});

/* ------------------------------------------------------------------ */
/*  Light theme custom property values                                 */
/* ------------------------------------------------------------------ */
describe("light theme custom properties", () => {
  const LIGHT_TOKEN_VALUES: ReadonlyArray<[string, string]> = [
    ["--ag-bg", "#FFFFFF"],
    ["--ag-bg-subtle", "#F8FAFC"],
    ["--ag-border", "#E5E7EB"],
    ["--ag-text", "#1F2937"],
    ["--ag-text-secondary", "#6B7280"],
    ["--ag-text-muted", "#6B7280"],
    ["--ag-accent-start", "#007DAC"],
    ["--ag-focus-outline", "#007DAC"],
    ["--ag-accent-end", "#C23AD6"],
    ["--ag-accent-mid", "#5B3DF5"],
    ["--ag-privacy-link", "#007DAC"],
    ["--ag-success", "#047857"],
    ["--ag-success-bg", "#F0FDF4"],
    ["--ag-success-border", "#BBF7D0"],
    ["--ag-error", "#C62020"],
    ["--ag-error-bg", "#FEF2F2"],
    ["--ag-error-border", "#FECACA"],
    ["--ag-warning", "#B75C06"],
    ["--ag-qr-bg", "#FFFFFF"],
  ];

  it.each(LIGHT_TOKEN_VALUES)(
    "pins %s to %s in the light theme :host block",
    (tokenName, tokenValue) => {
      const pattern = new RegExp(
        `${escapeForRegex(tokenName)}:\\s*${escapeForRegex(tokenValue)}\\s*;`,
      );
      expect(DEFAULT_THEME_CSS).toMatch(pattern);
    },
  );

  it("pins --ag-radius-container to 16px", () => {
    expect(DEFAULT_THEME_CSS).toContain("--ag-radius-container: 16px;");
  });

  it("pins --ag-radius-button to 12px", () => {
    expect(DEFAULT_THEME_CSS).toContain("--ag-radius-button: 12px;");
  });

  it("pins --ag-logo-size to 64px", () => {
    expect(DEFAULT_THEME_CSS).toContain("--ag-logo-size: 64px;");
  });

  it("pins --ag-motion-duration to 0.4s", () => {
    expect(DEFAULT_THEME_CSS).toContain("--ag-motion-duration: 0.4s;");
  });

  it("pins the Manrope font family stack", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "--ag-font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;",
    );
  });

  it("pins the accent gradient direction and colour stops", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "linear-gradient(135deg, #007DAC 0%, #5B3DF5 50%, #C23AD6 100%)",
    );
  });

  it("pins shadow token values", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "--ag-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);",
    );
    expect(DEFAULT_THEME_CSS).toContain(
      "--ag-shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);",
    );
  });

  it("pins focus ring token", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "--ag-focus-ring: 0 0 0 3px rgba(0, 125, 172, 0.4);",
    );
  });

  it("pins QR shadow token", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "--ag-qr-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);",
    );
  });

  it("pins overlay shadow token", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "--ag-overlay-shadow: 0 0 0 6px rgba(0, 0, 0, 0.5);",
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Dark theme custom property values                                  */
/* ------------------------------------------------------------------ */
describe("dark theme custom properties", () => {
  const DARK_TOKEN_VALUES: ReadonlyArray<[string, string]> = [
    ["--ag-bg", "#0F172A"],
    ["--ag-bg-subtle", "#1E293B"],
    ["--ag-border", "#1E293B"],
    ["--ag-text", "#F1F5F9"],
    ["--ag-text-secondary", "#94A3B8"],
    ["--ag-text-muted", "#8B9BB5"],
    ["--ag-accent-start", "#4FC3E8"],
    ["--ag-shortcode-color", "#5CC8E0"],
    ["--ag-accent-end", "#E082EE"],
    ["--ag-accent-mid", "#8B7AFA"],
    ["--ag-privacy-link", "#4FC3E8"],
    ["--ag-focus-outline", "#FFFFFF"],
    ["--ag-success", "#34D399"],
    ["--ag-error", "#F87171"],
    ["--ag-warning", "#FBBF24"],
    ["--ag-qr-bg", "#FFFFFF"],
  ];

  it.each(DARK_TOKEN_VALUES)(
    "pins %s to %s in a dark-theme block",
    (tokenName, tokenValue) => {
      const pattern = new RegExp(
        `${escapeForRegex(tokenName)}:\\s*${escapeForRegex(tokenValue)}\\s*;`,
      );
      expect(DEFAULT_THEME_CSS).toMatch(pattern);
    },
  );

  it("pins dark accent gradient colour stops", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "linear-gradient(135deg, #4FC3E8 0%, #8B7AFA 50%, #E082EE 100%)",
    );
  });

  it("pins dark shadow tokens", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "0 4px 24px rgba(0, 0, 0, 0.4)",
    );
    expect(DEFAULT_THEME_CSS).toContain(
      "0 8px 32px rgba(0, 0, 0, 0.5)",
    );
  });

  it("pins dark focus ring with violet alpha", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "0 0 0 3px rgba(139, 122, 250, 0.7)",
    );
  });

  it("pins dark success-bg rgba value", () => {
    expect(DEFAULT_THEME_CSS).toContain("rgba(5, 150, 105, 0.15)");
  });

  it("pins dark success-border rgba value", () => {
    expect(DEFAULT_THEME_CSS).toContain("rgba(52, 211, 153, 0.3)");
  });

  it("pins dark error-bg rgba value", () => {
    expect(DEFAULT_THEME_CSS).toContain("rgba(220, 38, 38, 0.15)");
  });

  it("pins dark error-border rgba value", () => {
    expect(DEFAULT_THEME_CSS).toContain("rgba(248, 113, 113, 0.3)");
  });

  it("pins dark overlay shadow with white alpha", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "0 0 0 6px rgba(255, 255, 255, 0.3)",
    );
  });

  it("pins dark QR shadow value", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "0 4px 20px rgba(0, 0, 0, 0.3)",
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Dark theme selectors                                               */
/* ------------------------------------------------------------------ */
describe("theme selectors", () => {
  it("uses :host([data-agegate-theme=\"dark\"]) for explicit dark mode", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      ':host([data-agegate-theme="dark"])',
    );
  });

  it("uses :host:not([data-agegate-theme=\"light\"]) for auto dark fallback", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      ':host:not([data-agegate-theme="light"])',
    );
  });

  it("wraps auto dark in prefers-color-scheme media query", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "@media (prefers-color-scheme: dark)",
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Keyframe animations                                                */
/* ------------------------------------------------------------------ */
describe("keyframe animations", () => {
  it("defines @keyframes slideUp", () => {
    expect(DEFAULT_THEME_CSS).toContain("@keyframes slideUp");
  });

  it("pins slideUp from-state transform", () => {
    expect(DEFAULT_THEME_CSS).toContain("translateY(20px) scale(0.97)");
  });

  it("pins slideUp to-state transform", () => {
    expect(DEFAULT_THEME_CSS).toContain("translateY(0) scale(1)");
  });

  it("defines @keyframes float", () => {
    expect(DEFAULT_THEME_CSS).toContain("@keyframes float");
  });

  it("pins float rotation from 0deg to 360deg", () => {
    expect(DEFAULT_THEME_CSS).toContain("rotate(0deg)");
    expect(DEFAULT_THEME_CSS).toContain("rotate(360deg)");
  });

  it("defines @keyframes spin", () => {
    expect(DEFAULT_THEME_CSS).toContain("@keyframes spin");
  });

  it("references slideUp in .container animation", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /animation:\s*slideUp\s+var\(--ag-motion-duration\)\s*cubic-bezier\(0\.34,\s*1\.56,\s*0\.64,\s*1\)/,
    );
  });

  it("pins float animation duration to 25s infinite linear", () => {
    expect(DEFAULT_THEME_CSS).toContain("animation: float 25s infinite linear");
  });

  it("pins spin animation to 0.8s linear infinite", () => {
    expect(DEFAULT_THEME_CSS).toContain("animation: spin 0.8s linear infinite");
  });
});

/* ------------------------------------------------------------------ */
/*  Container structural values                                        */
/* ------------------------------------------------------------------ */
describe("container structural values", () => {
  it("pins max-width to 420px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.container\s*\{[^}]*max-width:\s*420px/s,
    );
  });

  it("pins max-height to 90vh", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.container\s*\{[^}]*max-height:\s*90vh/s,
    );
  });

  it("pins border to 1px solid var(--ag-border)", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.container\s*\{[^}]*border:\s*1px solid var\(--ag-border\)/s,
    );
  });

  it("pins scrollbar-width: none for Firefox", () => {
    expect(DEFAULT_THEME_CSS).toContain("scrollbar-width: none;");
  });
});

/* ------------------------------------------------------------------ */
/*  Header structural values                                           */
/* ------------------------------------------------------------------ */
describe("header structural values", () => {
  it("pins header padding to 28px 24px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.header\s*\{[^}]*padding:\s*28px 24px/s,
    );
  });

  it("pins header color to white", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.header\s*\{[^}]*color:\s*white/s,
    );
  });

  it("pins h1/h2 font-size to 1.5rem", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.header h1,\s*\n\s*\.header h2\s*\{[^}]*font-size:\s*1\.5rem/s,
    );
  });

  it("pins h1/h2 font-weight to 700", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.header h1,\s*\n\s*\.header h2\s*\{[^}]*font-weight:\s*700/s,
    );
  });

  it("pins h1/h2 letter-spacing to -0.3px", () => {
    expect(DEFAULT_THEME_CSS).toContain("letter-spacing: -0.3px;");
  });

  it("pins header paragraph max-width to 300px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.header p\s*\{[^}]*max-width:\s*300px/s,
    );
  });

  it("pins header paragraph font-size to 0.875rem", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.header p\s*\{[^}]*font-size:\s*0\.875rem/s,
    );
  });

  it("pins header::before radial gradient with 0.08 alpha white", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)",
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Logo structural values                                             */
/* ------------------------------------------------------------------ */
describe("logo structural values", () => {
  it("pins logo margin to 0 auto 12px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.logo\s*\{[^}]*margin:\s*0 auto 12px/s,
    );
  });

  it("pins logo background rgba", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.logo\s*\{[^}]*background:\s*rgba\(255, 255, 255, 0\.15\)/s,
    );
  });

  it("pins logo border", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.logo\s*\{[^}]*border:\s*2px solid rgba\(255, 255, 255, 0\.25\)/s,
    );
  });

  it("pins logo border-radius to 50%", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.logo\s*\{[^}]*border-radius:\s*50%/s,
    );
  });

  it("pins logo svg dimensions to 32px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.logo svg\s*\{[^}]*width:\s*32px/s,
    );
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.logo svg\s*\{[^}]*height:\s*32px/s,
    );
  });

  it("pins logo svg stroke-width to 1.5", () => {
    expect(DEFAULT_THEME_CSS).toContain("stroke-width: 1.5;");
  });
});

/* ------------------------------------------------------------------ */
/*  Content and age-badge                                              */
/* ------------------------------------------------------------------ */
describe("content and age-badge", () => {
  it("pins content padding to 28px 24px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.content\s*\{[^}]*padding:\s*28px 24px/s,
    );
  });

  it("pins age-badge border-radius to 100px (pill shape)", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.age-badge\s*\{[^}]*border-radius:\s*100px/s,
    );
  });

  it("pins age-badge padding to 8px 16px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.age-badge\s*\{[^}]*padding:\s*8px 16px/s,
    );
  });

  it("pins age-badge font-size to 0.875rem", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.age-badge\s*\{[^}]*font-size:\s*0\.875rem/s,
    );
  });

  it("pins age-badge margin-bottom to 24px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.age-badge\s*\{[^}]*margin-bottom:\s*24px/s,
    );
  });

  it("pins age-badge svg to 16px square", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.age-badge svg\s*\{[^}]*width:\s*16px/s,
    );
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.age-badge svg\s*\{[^}]*height:\s*16px/s,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Gate container                                                     */
/* ------------------------------------------------------------------ */
describe("gate container", () => {
  it("pins min-height to 240px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.gate-container\s*\{[^}]*min-height:\s*240px/s,
    );
  });

  it("pins border-radius to 12px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.gate-container\s*\{[^}]*border-radius:\s*12px/s,
    );
  });

  it("pins padding to 24px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.gate-container\s*\{[^}]*padding:\s*24px/s,
    );
  });

  it("pins margin-bottom to 20px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.gate-container\s*\{[^}]*margin-bottom:\s*20px/s,
    );
  });

  it("pins gate-loading min-height to 200px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.gate-loading\s*\{[^}]*min-height:\s*200px/s,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  QR canvas                                                          */
/* ------------------------------------------------------------------ */
describe("QR canvas", () => {
  it("pins width to 200px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.qr-canvas\s*\{[^}]*width:\s*200px/s,
    );
  });

  it("pins border-radius to 8px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.qr-canvas\s*\{[^}]*border-radius:\s*8px/s,
    );
  });

  it("pins padding to 8px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.qr-canvas\s*\{[^}]*padding:\s*8px/s,
    );
  });

  it("sets image-rendering: pixelated", () => {
    expect(DEFAULT_THEME_CSS).toContain("image-rendering: pixelated;");
  });

  it("sets image-rendering: crisp-edges", () => {
    expect(DEFAULT_THEME_CSS).toContain("image-rendering: crisp-edges;");
  });
});

/* ------------------------------------------------------------------ */
/*  Mobile CTA button                                                  */
/* ------------------------------------------------------------------ */
describe("mobile CTA button (.agegate-link)", () => {
  it("pins padding to 14px 28px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.agegate-link\s*\{[^}]*padding:\s*14px 28px/s,
    );
  });

  it("pins min-height to 48px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.agegate-link\s*\{[^}]*min-height:\s*48px/s,
    );
  });

  it("pins font-size to 1rem", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.agegate-link\s*\{[^}]*font-size:\s*1rem/s,
    );
  });

  it("pins max-width to 280px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.agegate-link\s*\{[^}]*max-width:\s*280px/s,
    );
  });

  it("pins default button text colour fallback to #ffffff", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "var(--ag-button-text, #ffffff)",
    );
  });

  it("pins box-shadow colour with 0.3 alpha", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "0 4px 16px rgba(30, 58, 110, 0.3)",
    );
  });

  it("pins hover transition properties", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "transition: opacity 0.2s ease, transform 0.2s ease;",
    );
  });

  it("pins hover transform translateY(-2px)", () => {
    expect(DEFAULT_THEME_CSS).toContain("translateY(-2px)");
  });

  it("pins hover box-shadow with 0.4 alpha", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "0 6px 20px rgba(30, 58, 110, 0.4)",
    );
  });

  it("pins active opacity to 0.85", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.agegate-link:active\s*\{[^}]*opacity:\s*0\.85/s,
    );
  });

  it("pins disabled opacity to 0.6", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.agegate-link:disabled\s*\{[^}]*opacity:\s*0\.6/s,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Status messages                                                    */
/* ------------------------------------------------------------------ */
describe("status messages", () => {
  it("pins status-message gap to 10px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.status-message\s*\{[^}]*gap:\s*10px/s,
    );
  });

  it("pins status-message min-height to 32px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.status-message\s*\{[^}]*min-height:\s*32px/s,
    );
  });

  it("pins status-icon dimensions to 20px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.status-icon\s*\{[^}]*width:\s*20px/s,
    );
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.status-icon\s*\{[^}]*height:\s*20px/s,
    );
  });

  it("pins status-error padding and border-radius", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.status-error\s*\{[^}]*padding:\s*12px 20px/s,
    );
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.status-error\s*\{[^}]*border-radius:\s*8px/s,
    );
  });

  it("pins status-success padding and border-radius", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.status-success\s*\{[^}]*padding:\s*12px 20px/s,
    );
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.status-success\s*\{[^}]*border-radius:\s*8px/s,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Spinner                                                            */
/* ------------------------------------------------------------------ */
describe("spinner", () => {
  it("pins spinner dimensions to 20px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.spinner\s*\{[^}]*width:\s*20px/s,
    );
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.spinner\s*\{[^}]*height:\s*20px/s,
    );
  });

  it("pins spinner border to 2px solid", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.spinner\s*\{[^}]*border:\s*2px solid var\(--ag-border\)/s,
    );
  });

  it("pins spinner border-radius to 50%", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.spinner\s*\{[^}]*border-radius:\s*50%/s,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Retry button                                                       */
/* ------------------------------------------------------------------ */
describe("retry button", () => {
  it("pins padding to 10px 24px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.retry-button\s*\{[^}]*padding:\s*10px 24px/s,
    );
  });

  it("pins min-height to 44px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.retry-button\s*\{[^}]*min-height:\s*44px/s,
    );
  });

  it("pins border to 2px solid var(--ag-accent-start)", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.retry-button\s*\{[^}]*border:\s*2px solid var\(--ag-accent-start\)/s,
    );
  });

  it("pins retry hover colour to white", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.retry-button:hover\s*\{[^}]*color:\s*white/s,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
describe("footer", () => {
  it("pins footer padding to 20px 24px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.footer\s*\{[^}]*padding:\s*20px 24px/s,
    );
  });

  it("pins footer font-size to 0.8125rem", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.footer\s*\{[^}]*font-size:\s*0\.8125rem/s,
    );
  });

  it("pins footer-subtitle font-size to 0.75rem", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.footer-subtitle\s*\{[^}]*font-size:\s*0\.75rem/s,
    );
  });

  it("pins footer-privacy margin-top to 8px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.footer-privacy\s*\{[^}]*margin-top:\s*8px/s,
    );
  });

  it("pins footer-privacy font-size to 0.75rem", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.footer-privacy\s*\{[^}]*font-size:\s*0\.75rem/s,
    );
  });

  it("pins privacy-link font-weight to 600", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.agegate-privacy-link\s*\{[^}]*font-weight:\s*600/s,
    );
  });

  it("pins tech-info font family to monospace stack", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "'SF Mono', Monaco, 'Cascadia Code', 'Consolas', monospace",
    );
  });

  it("pins tech-info font-size to 0.6875rem", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.tech-info\s*\{[^}]*font-size:\s*0\.6875rem/s,
    );
  });

  it("pins tech-info border-top to 1px solid", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.tech-info\s*\{[^}]*border-top:\s*1px solid var\(--ag-border\)/s,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Focus indicators                                                   */
/* ------------------------------------------------------------------ */
describe("focus indicators", () => {
  it("pins outline to 2px solid with focus-outline fallback", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start));",
    );
  });

  it("pins outline-offset to 2px", () => {
    expect(DEFAULT_THEME_CSS).toContain("outline-offset: 2px;");
  });

  it("pins footer focus border-radius to 2px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.footer a:focus-visible\s*\{[^}]*border-radius:\s*2px/s,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Media query breakpoints                                            */
/* ------------------------------------------------------------------ */
describe("media query breakpoints", () => {
  it("pins small phone breakpoint to max-width: 359px", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "@media screen and (max-width: 359px)",
    );
  });

  it("pins tablet/desktop breakpoint to min-width: 768px", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "@media screen and (min-width: 768px)",
    );
  });

  it("pins landscape breakpoint to max-height: 600px", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "@media screen and (orientation: landscape) and (max-height: 600px)",
    );
  });

  it("includes touch device media query", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "@media (hover: none) and (pointer: coarse)",
    );
  });

  it("includes high DPI media query", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "(-webkit-min-device-pixel-ratio: 2)",
    );
    expect(DEFAULT_THEME_CSS).toContain("(min-resolution: 192dpi)");
  });

  it("includes print media query", () => {
    expect(DEFAULT_THEME_CSS).toContain("@media print");
  });

  it("includes reduced motion media query", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "@media (prefers-reduced-motion: reduce)",
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Small phone responsive overrides                                   */
/* ------------------------------------------------------------------ */
describe("small phone responsive overrides (< 360px)", () => {
  it("sets container border-radius to 0", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /max-width:\s*359px\)[\s\S]*?\.container\s*\{[^}]*border-radius:\s*0/,
    );
  });

  it("reduces header padding to 20px 16px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /max-width:\s*359px\)[\s\S]*?\.header\s*\{[^}]*padding:\s*20px 16px/,
    );
  });

  it("reduces heading font-size to 1.25rem", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /max-width:\s*359px\)[\s\S]*?font-size:\s*1\.25rem/,
    );
  });

  it("reduces QR canvas width to 160px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /max-width:\s*359px\)[\s\S]*?\.qr-canvas\s*\{[^}]*width:\s*160px/,
    );
  });

  it("reduces gate-container min-height to 200px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /max-width:\s*359px\)[\s\S]*?\.gate-container\s*\{[^}]*min-height:\s*200px/,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Tablet/desktop responsive overrides                                */
/* ------------------------------------------------------------------ */
describe("tablet/desktop responsive overrides (768px+)", () => {
  it("sets body padding to 40px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /min-width:\s*768px\)[\s\S]*?body\s*\{[^}]*padding:\s*40px/,
    );
  });

  it("increases header padding to 32px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /min-width:\s*768px\)[\s\S]*?\.header\s*\{[^}]*padding:\s*32px/,
    );
  });

  it("scales logo with 1.125 multiplier", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "calc(var(--ag-logo-size) * 1.125)",
    );
  });

  it("increases logo svg to 36px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /min-width:\s*768px\)[\s\S]*?\.logo svg\s*\{[^}]*width:\s*36px/,
    );
  });

  it("increases heading font-size to 1.625rem", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /min-width:\s*768px\)[\s\S]*?font-size:\s*1\.625rem/,
    );
  });

  it("increases header paragraph font-size to 0.9375rem", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /min-width:\s*768px\)[\s\S]*?font-size:\s*0\.9375rem/,
    );
  });

  it("increases content padding to 32px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /min-width:\s*768px\)[\s\S]*?\.content\s*\{[^}]*padding:\s*32px/,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Landscape responsive overrides                                     */
/* ------------------------------------------------------------------ */
describe("landscape responsive overrides", () => {
  it("sets body padding to 10px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /orientation:\s*landscape\)[\s\S]*?body\s*\{[^}]*padding:\s*10px/,
    );
  });

  it("increases container max-width to 520px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /orientation:\s*landscape\)[\s\S]*?\.container\s*\{[^}]*max-width:\s*520px/,
    );
  });

  it("scales logo with 0.75 multiplier", () => {
    expect(DEFAULT_THEME_CSS).toContain(
      "calc(var(--ag-logo-size) * 0.75)",
    );
  });

  it("reduces gate-container min-height to 180px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /orientation:\s*landscape\)[\s\S]*?\.gate-container\s*\{[^}]*min-height:\s*180px/,
    );
  });

  it("reduces gate-container padding to 12px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /orientation:\s*landscape\)[\s\S]*?\.gate-container\s*\{[^}]*padding:\s*12px/,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Touch device overrides                                             */
/* ------------------------------------------------------------------ */
describe("touch device overrides", () => {
  it("pins active scale to 0.98", () => {
    expect(DEFAULT_THEME_CSS).toContain("scale(0.98)");
  });

  it("pins active opacity to 0.85 on touch", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /hover:\s*none\)[\s\S]*?\.agegate-link:active\s*\{[^}]*opacity:\s*0\.85/,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  High DPI display overrides                                         */
/* ------------------------------------------------------------------ */
describe("high DPI display overrides", () => {
  it("sets image-rendering to auto for high DPI", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /192dpi\)[\s\S]*?image-rendering:\s*auto/,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Print overrides                                                    */
/* ------------------------------------------------------------------ */
describe("print overrides", () => {
  it("sets body background to white", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /@media print[\s\S]*?body\s*\{[^}]*background:\s*white/,
    );
  });

  it("removes container box-shadow", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /@media print[\s\S]*?\.container\s*\{[^}]*box-shadow:\s*none/,
    );
  });

  it("sets header border-bottom to 2px solid accent", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /@media print[\s\S]*?\.header\s*\{[^}]*border-bottom:\s*2px solid var\(--ag-accent-start\)/,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Reduced motion overrides                                           */
/* ------------------------------------------------------------------ */
describe("reduced motion overrides", () => {
  it("disables container animation", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /prefers-reduced-motion:\s*reduce\)[\s\S]*?\.container\s*\{[^}]*animation:\s*none/,
    );
  });

  it("disables header::before animation", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /prefers-reduced-motion:\s*reduce\)[\s\S]*?\.header::before\s*\{[^}]*animation:\s*none/,
    );
  });

  it("disables spinner animation and sets opacity 0.7", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /prefers-reduced-motion:\s*reduce\)[\s\S]*?\.spinner\s*\{[^}]*animation:\s*none/,
    );
    expect(DEFAULT_THEME_CSS).toMatch(
      /prefers-reduced-motion:\s*reduce\)[\s\S]*?\.spinner\s*\{[^}]*opacity:\s*0\.7/,
    );
  });

  it("sets transition: none for interactive elements", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /prefers-reduced-motion:\s*reduce\)[\s\S]*?transition:\s*none/,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Reset and base styles                                              */
/* ------------------------------------------------------------------ */
describe("reset and base styles", () => {
  it("pins box-sizing to border-box", () => {
    expect(DEFAULT_THEME_CSS).toContain("box-sizing: border-box;");
  });

  it("pins html text-size-adjust to 100%", () => {
    expect(DEFAULT_THEME_CSS).toContain("-webkit-text-size-adjust: 100%;");
  });

  it("pins font smoothing properties", () => {
    expect(DEFAULT_THEME_CSS).toContain("-webkit-font-smoothing: antialiased;");
    expect(DEFAULT_THEME_CSS).toContain("-moz-osx-font-smoothing: grayscale;");
  });

  it("pins body line-height to 1.5", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /body\s*\{[^}]*line-height:\s*1\.5/s,
    );
  });

  it("pins body min-height to 100vh", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /body\s*\{[^}]*min-height:\s*100vh/s,
    );
  });

  it("includes -webkit-fill-available fallback", () => {
    expect(DEFAULT_THEME_CSS).toContain("-webkit-fill-available");
  });

  it("pins safe-area-inset env() padding", () => {
    expect(DEFAULT_THEME_CSS).toContain("env(safe-area-inset-top, 20px)");
    expect(DEFAULT_THEME_CSS).toContain("env(safe-area-inset-right, 20px)");
    expect(DEFAULT_THEME_CSS).toContain("env(safe-area-inset-bottom, 20px)");
    expect(DEFAULT_THEME_CSS).toContain("env(safe-area-inset-left, 20px)");
  });
});

/* ------------------------------------------------------------------ */
/*  CSS class names present in selectors                               */
/* ------------------------------------------------------------------ */
describe("CSS class selectors are present", () => {
  const EXPECTED_SELECTORS = [
    ".container",
    ".header",
    ".logo",
    ".content",
    ".age-badge",
    ".gate-container",
    ".gate-loading",
    ".qr-canvas",
    ".agegate-link",
    ".agegate-caption",
    ".agegate-instructions",
    ".status-message",
    ".status-icon",
    ".status-loading",
    ".status-info",
    ".status-error",
    ".status-success",
    ".spinner",
    ".retry-button",
    ".footer",
    ".footer-subtitle",
    ".footer-privacy",
    ".agegate-privacy-link",
    ".tech-info",
    ".separator",
  ] as const;

  it.each(EXPECTED_SELECTORS)(
    "contains selector %s",
    (selector) => {
      expect(DEFAULT_THEME_CSS).toContain(selector);
    },
  );
});

/* ------------------------------------------------------------------ */
/*  Shadow host rules                                                  */
/* ------------------------------------------------------------------ */
describe("shadow host rules", () => {
  it("sets :host display to block", () => {
    expect(DEFAULT_THEME_CSS).toMatch(/:host\s*\{\s*\n?\s*display:\s*block/);
  });

  // Regression guard for the dead-font-family bug: the variable was only
  // consumed by `body { font-family: var(--ag-font-family); }`, but the
  // closed shadow root has no <body>, so the Font family control and
  // data-font-family were inert. Consuming it on :host makes every
  // descendant inherit the brand font. This asserts the CONSUMER exists,
  // not merely that the bridge SETS the variable (the old false-confidence
  // tests only checked the latter).
  it("consumes --ag-font-family on :host so shadow content inherits it", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /:host\s*\{[^}]*font-family:\s*var\(--ag-font-family\)/s,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Gate instructions / caption                                        */
/* ------------------------------------------------------------------ */
describe("gate instructions and caption", () => {
  it("pins margin-top to 16px", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.agegate-caption[\s\S]*?\{[^}]*margin-top:\s*16px/,
    );
  });

  it("pins font-size to 0.875rem", () => {
    expect(DEFAULT_THEME_CSS).toMatch(
      /\.agegate-caption[\s\S]*?\{[^}]*font-size:\s*0\.875rem/,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */
function escapeForRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\#]/g, "\\$&");
}
