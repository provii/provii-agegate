// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Default theme CSS for the age gate widget, bundled as a string constant.
 *
 * This file is the source of truth. The CSS is template-literal'd into the
 * IIFE bundle and injected into the closed shadow root at widget mount time
 * via core/shadow-dom.ts:injectStyles.
 *
 * Selectors use shadow-DOM-isolated forms:
 *   - :host                              instead of :root
 *   - :host([data-agegate-theme="dark"]) instead of [data-agegate-theme="dark"]
 *   - prefers-color-scheme dark fallback scoped to :host
 *
 * CSS custom properties defined on :host provide defaults. Because custom
 * properties inherit across shadow boundaries, integrators can still override
 * values on :root or any ancestor element. For larger customisation, use the
 * data-custom-styles script-tag attribute, which gets injected alongside this
 * stylesheet inside the same shadow root.
 *
 * No external CSS file is published to the CDN: the bundle is fully
 * self-contained, and a host-page stylesheet cannot reach inside the closed
 * shadow root anyway.
 */
export const DEFAULT_THEME_CSS = `\
/* Provii Age Gate Responsive Styles
 *
 * Theme system using CSS custom properties with automatic dark mode detection.
 * Brand colours: #007DAC (teal) through #5B3DF5 (violet) to #C23AD6 (pink).
 * Font: Manrope with system fallback stack.
 *
 * Breakpoints:
 *   < 360px  - small phones (full-width, no border-radius)
 *   360-767px - standard mobile (full-width, rounded)
 *   768px+   - tablet/desktop (420px max, centred)
 */

/* ------------------------------------------------------------------ */
/*  Shadow host base                                                   */
/* ------------------------------------------------------------------ */
:host {
  display: block;
  /* Consume the brand-tunable font stack on the shadow host so every
   * descendant inherits it (the token is defined in the :host block
   * below). A previous version applied this only to the body selector,
   * which never matches inside the closed shadow root, so the Font family
   * styler control and data-font-family were inert. */
  font-family: var(--ag-font-family);
}

/* ------------------------------------------------------------------ */
/*  Light theme (default)                                              */
/* ------------------------------------------------------------------ */
:host {
  --ag-bg: #FFFFFF;
  --ag-bg-subtle: #F8FAFC;
  --ag-border: #E5E7EB;
  --ag-text: #1F2937;
  --ag-text-secondary: #6B7280;
  --ag-text-muted: #6B7280;
  --ag-accent-start: #007DAC;
  --ag-focus-outline: #007DAC;
  --ag-accent-end: #C23AD6;
  --ag-accent-mid: #5B3DF5;
  --ag-accent-gradient: linear-gradient(135deg, #007DAC 0%, #5B3DF5 50%, #C23AD6 100%);
  --ag-privacy-link: #007DAC;
  --ag-success: #047857;
  --ag-success-bg: #F0FDF4;
  --ag-success-border: #BBF7D0;
  --ag-error: #C62020;
  --ag-error-bg: #FEF2F2;
  --ag-error-border: #FECACA;
  --ag-warning: #B75C06;
  --ag-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  --ag-shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);
  --ag-focus-ring: 0 0 0 3px rgba(0, 125, 172, 0.4);
  --ag-qr-bg: #FFFFFF;
  --ag-qr-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  --ag-overlay-shadow: 0 0 0 6px rgba(0, 0, 0, 0.5);

  /* W10-3.1: Brand-tunable structural tokens */
  --ag-radius-container: 16px;
  --ag-radius-button: 12px;
  --ag-font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --ag-logo-size: 64px;
  --ag-motion-duration: 0.4s;
}

/* ------------------------------------------------------------------ */
/*  Dark theme (explicit attribute)                                    */
/* ------------------------------------------------------------------ */
:host([data-agegate-theme="dark"]) {
  --ag-bg: #0F172A;
  --ag-bg-subtle: #1E293B;
  --ag-border: #1E293B;
  --ag-text: #F1F5F9;
  --ag-text-secondary: #94A3B8;
  --ag-text-muted: #8B9BB5;
  --ag-accent-start: #4FC3E8;
  /* Override short code colour for WCAG AA contrast (7:1 on #0F172A) */
  --ag-shortcode-color: #5CC8E0;
  --ag-accent-end: #E082EE;
  --ag-accent-mid: #8B7AFA;
  --ag-accent-gradient: linear-gradient(135deg, #4FC3E8 0%, #8B7AFA 50%, #E082EE 100%);
  --ag-privacy-link: #4FC3E8;
  --ag-focus-outline: #FFFFFF;
  --ag-success: #34D399;
  --ag-success-bg: rgba(5, 150, 105, 0.15);
  --ag-success-border: rgba(52, 211, 153, 0.3);
  --ag-error: #F87171;
  --ag-error-bg: rgba(220, 38, 38, 0.15);
  --ag-error-border: rgba(248, 113, 113, 0.3);
  --ag-warning: #FBBF24;
  --ag-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  --ag-shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
  --ag-focus-ring: 0 0 0 3px rgba(139, 122, 250, 0.7);
  --ag-qr-bg: #FFFFFF;
  --ag-qr-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  --ag-overlay-shadow: 0 0 0 6px rgba(255, 255, 255, 0.3);
}

/* ------------------------------------------------------------------ */
/*  Auto dark mode fallback (when no explicit theme is set)            */
/* ------------------------------------------------------------------ */
@media (prefers-color-scheme: dark) {
  :host:not([data-agegate-theme="light"]) {
    --ag-bg: #0F172A;
    --ag-bg-subtle: #1E293B;
    --ag-border: #1E293B;
    --ag-text: #F1F5F9;
    --ag-text-secondary: #94A3B8;
    --ag-text-muted: #8B9BB5;
    --ag-accent-start: #4FC3E8;
    /* Override short code colour for WCAG AA contrast (7:1 on #0F172A) */
    --ag-shortcode-color: #5CC8E0;
    --ag-accent-end: #E082EE;
    --ag-accent-mid: #8B7AFA;
    --ag-accent-gradient: linear-gradient(135deg, #4FC3E8 0%, #8B7AFA 50%, #E082EE 100%);
    --ag-privacy-link: #4FC3E8;
    --ag-focus-outline: #FFFFFF;
    --ag-success: #34D399;
    --ag-success-bg: rgba(5, 150, 105, 0.15);
    --ag-success-border: rgba(52, 211, 153, 0.3);
    --ag-error: #F87171;
    --ag-error-bg: rgba(220, 38, 38, 0.15);
    --ag-error-border: rgba(248, 113, 113, 0.3);
    --ag-warning: #FBBF24;
    --ag-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    --ag-shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
    --ag-focus-ring: 0 0 0 3px rgba(139, 122, 250, 0.7);
    --ag-qr-bg: #FFFFFF;
    --ag-qr-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    --ag-overlay-shadow: 0 0 0 6px rgba(255, 255, 255, 0.3);
  }
}

/* ------------------------------------------------------------------ */
/*  Reset and base styles                                              */
/* ------------------------------------------------------------------ */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  height: 100%;
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--ag-font-family);
  background: var(--ag-accent-gradient);
  min-height: 100vh;
  min-height: -webkit-fill-available;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  padding: env(safe-area-inset-top, 20px) env(safe-area-inset-right, 20px) env(safe-area-inset-bottom, 20px) env(safe-area-inset-left, 20px);
  color: var(--ag-text);
  line-height: 1.5;
}

/* ------------------------------------------------------------------ */
/*  Container                                                          */
/* ------------------------------------------------------------------ */
.container {
  background: var(--ag-bg);
  border: 1px solid var(--ag-border);
  border-radius: var(--ag-radius-container);
  box-shadow: var(--ag-shadow);
  max-width: 420px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
  animation: slideUp var(--ag-motion-duration) cubic-bezier(0.34, 1.56, 0.64, 1);
}

.container::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */
.header {
  background: var(--ag-accent-gradient);
  padding: 28px 24px;
  text-align: center;
  color: white;
  position: relative;
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
  animation: float 25s infinite linear;
}

@keyframes float {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.logo {
  width: var(--ag-logo-size);
  height: var(--ag-logo-size);
  margin: 0 auto 12px;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  overflow: hidden;
}

.logo img,
.logo svg {
  max-width: 100%;
  max-height: 100%;
}

.logo svg {
  width: 32px;
  height: 32px;
  stroke-width: 1.5;
}

.header h1,
.header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 6px;
  letter-spacing: -0.3px;
  position: relative;
  z-index: 1;
}

.header p {
  font-size: 0.875rem;
  line-height: 1.5;
  position: relative;
  z-index: 1;
  max-width: 300px;
  margin: 0 auto;
}

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */
.content {
  padding: 28px 24px;
  text-align: center;
}

.age-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--ag-bg-subtle);
  padding: 8px 16px;
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--ag-accent-start);
  margin-bottom: 24px;
  border: 1px solid var(--ag-border);
}

.age-badge svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* ------------------------------------------------------------------ */
/*  Gate container (holds QR code)                                     */
/* ------------------------------------------------------------------ */
.gate-container {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--ag-bg-subtle);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  position: relative;
  border: 1px solid var(--ag-border);
}

.gate-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 200px;
}

/* ------------------------------------------------------------------ */
/*  QR code canvas - single 200px rendering path                       */
/* ------------------------------------------------------------------ */
.gate-container canvas,
.qr-canvas {
  display: block !important;
  width: 200px;
  height: auto;
  aspect-ratio: 1;
  max-width: 100% !important;
  margin: 0 auto;
  border-radius: 8px;
  box-shadow: var(--ag-qr-shadow);
  background: var(--ag-qr-bg);
  padding: 8px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

/* ------------------------------------------------------------------ */
/*  Mobile CTA button                                                  */
/* ------------------------------------------------------------------ */
.gate-container .agegate-link {
  background: var(--ag-accent-gradient);
  color: var(--ag-button-text, #ffffff);
  border: none;
  padding: 14px 28px;
  min-height: 48px;
  border-radius: var(--ag-radius-button);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
  box-shadow: 0 4px 16px rgba(30, 58, 110, 0.3);
  width: 100%;
  max-width: 280px;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  overflow: visible;
  text-decoration: none;
  text-align: center;
  display: inline-block;
}

.gate-container .agegate-link:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(30, 58, 110, 0.4);
}

.gate-container .agegate-link:active {
  transform: translateY(0);
  opacity: 0.85;
}

.gate-container .agegate-link:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

/* ------------------------------------------------------------------ */
/*  Gate instructions                                                  */
/* ------------------------------------------------------------------ */
.gate-container .agegate-caption,
.gate-container .agegate-instructions {
  margin-top: 16px;
  font-size: 0.875rem;
  color: var(--ag-text-secondary);
  line-height: 1.5;
}

/* ------------------------------------------------------------------ */
/*  Status messages                                                    */
/* ------------------------------------------------------------------ */
.status-message {
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 32px;
  flex-wrap: wrap;
  transition: all 0.2s ease;
}

.status-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.status-loading {
  color: var(--ag-accent-start);
}

.status-info {
  color: var(--ag-text-secondary);
}

.status-error {
  color: var(--ag-error);
  background: var(--ag-error-bg);
  padding: 12px 20px;
  border-radius: 8px;
  margin-top: 10px;
  border: 1px solid var(--ag-error-border);
}

.status-success {
  color: var(--ag-success);
  background: var(--ag-success-bg);
  padding: 12px 20px;
  border-radius: 8px;
  margin-top: 10px;
  border: 1px solid var(--ag-success-border);
}

/* ------------------------------------------------------------------ */
/*  Spinner                                                            */
/* ------------------------------------------------------------------ */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--ag-border);
  border-top-color: var(--ag-accent-start);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ------------------------------------------------------------------ */
/*  Retry button                                                       */
/* ------------------------------------------------------------------ */
.retry-button {
  display: block;
  margin: 12px auto 0;
  padding: 10px 24px;
  min-height: 44px;
  background: var(--ag-bg);
  color: var(--ag-accent-start);
  border: 2px solid var(--ag-accent-start);
  border-radius: var(--ag-radius-button);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.retry-button:hover {
  background: var(--ag-accent-start);
  color: white;
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
.footer {
  padding: 20px 24px;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--ag-text-secondary);
}

.footer a {
  color: var(--ag-accent-start);
  text-decoration: underline;
  font-weight: 700;
  transition: color 0.2s ease;
}

.footer a:hover {
  color: var(--ag-accent-end);
}

.footer-subtitle {
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--ag-text-muted);
}

/* W10-3.6: optional privacy policy link sits under the footer subtitle. */
.footer-privacy {
  margin-top: 8px;
  font-size: 0.75rem;
}

.agegate-privacy-link {
  color: var(--ag-privacy-link, var(--ag-text-secondary));
  text-decoration: underline;
  font-weight: 600;
}

.agegate-privacy-link:hover {
  color: var(--ag-accent-start);
}

.tech-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--ag-border);
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.6875rem;
  color: var(--ag-text-muted);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tech-info .separator {
  color: var(--ag-text-muted);
}

/* ------------------------------------------------------------------ */
/*  Focus indicators                                                   */
/* ------------------------------------------------------------------ */
.gate-container .agegate-link:focus-visible,
.retry-button:focus-visible {
  outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start));
  outline-offset: 2px;
  box-shadow: var(--ag-focus-ring);
}

.footer a:focus-visible {
  outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start));
  outline-offset: 2px;
  border-radius: 2px;
}

/* ------------------------------------------------------------------ */
/*  Responsive: small phones (< 360px)                                 */
/* ------------------------------------------------------------------ */
@media screen and (max-width: 359px) {
  .container {
    border-radius: 0;
    max-height: none;
    border-left: none;
    border-right: none;
  }

  .header {
    padding: 20px 16px;
  }

  .header h1,
  .header h2 {
    font-size: 1.25rem;
  }

  .header p {
    font-size: 0.8125rem;
  }

  .content {
    padding: 20px 16px;
  }

  .gate-container {
    padding: 16px;
    min-height: 200px;
  }

  .gate-container canvas,
  .qr-canvas {
    width: 160px;
  }
}

/* ------------------------------------------------------------------ */
/*  Responsive: tablets and desktop (768px+)                           */
/* ------------------------------------------------------------------ */
@media screen and (min-width: 768px) {
  body {
    padding: 40px;
  }

  .container {
    box-shadow: var(--ag-shadow-lg);
  }

  .header {
    padding: 32px;
  }

  .logo {
    width: calc(var(--ag-logo-size) * 1.125);
    height: calc(var(--ag-logo-size) * 1.125);
  }

  .logo svg {
    width: 36px;
    height: 36px;
  }

  .header h1,
  .header h2 {
    font-size: 1.625rem;
  }

  .header p {
    font-size: 0.9375rem;
  }

  .content {
    padding: 32px;
  }
}

/* ------------------------------------------------------------------ */
/*  Landscape orientation                                              */
/* ------------------------------------------------------------------ */
@media screen and (orientation: landscape) and (max-height: 600px) {
  body {
    padding: 10px;
  }

  .container {
    max-width: 520px;
  }

  .header {
    padding: 16px 24px;
  }

  .logo {
    width: calc(var(--ag-logo-size) * 0.75);
    height: calc(var(--ag-logo-size) * 0.75);
  }

  .header h1,
  .header h2 {
    font-size: 1.25rem;
  }

  .content {
    padding: 16px 24px;
  }

  .gate-container {
    min-height: 180px;
    padding: 12px;
  }

  .gate-container canvas,
  .qr-canvas {
    width: 160px;
  }
}

/* ------------------------------------------------------------------ */
/*  Touch device adjustments                                           */
/* ------------------------------------------------------------------ */
@media (hover: none) and (pointer: coarse) {
  .gate-container .agegate-link:hover {
    transform: none;
    opacity: 1;
  }

  .gate-container .agegate-link:active {
    transform: scale(0.98);
    opacity: 0.85;
  }
}

/* ------------------------------------------------------------------ */
/*  High DPI displays                                                  */
/* ------------------------------------------------------------------ */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .gate-container canvas,
  .qr-canvas {
    image-rendering: auto;
  }
}

/* ------------------------------------------------------------------ */
/*  Print                                                              */
/* ------------------------------------------------------------------ */
@media print {
  body {
    background: white;
  }

  .container {
    box-shadow: none;
    border: 1px solid var(--ag-border);
  }

  .header {
    background: none;
    color: var(--ag-text);
    border-bottom: 2px solid var(--ag-accent-start);
  }
}

/* ------------------------------------------------------------------ */
/*  Reduced motion                                                     */
/* ------------------------------------------------------------------ */
@media (prefers-reduced-motion: reduce) {
  .container {
    animation: none;
  }

  .header::before {
    animation: none;
  }

  .spinner {
    animation: none;
    opacity: 0.7;
  }

  .gate-container .agegate-link,
  .retry-button,
  .footer a,
  .status-message {
    transition: none;
  }
}
`;
