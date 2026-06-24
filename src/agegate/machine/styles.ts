// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * CSS-string injectors for the AgeGate machine UI: the sandbox-control styles
 * and the shared machine-service styles (focus rings, QR, error, status, and
 * skeleton styling).
 *
 * @module machine/styles
 */

/**
 * Inject sandbox-specific CSS into the shadow DOM.
 *
 * Prevents duplicate injection by checking for an existing style element
 * with a known id. Includes dark mode and reduced-motion overrides.
 */
export function injectSandboxStyles(shadowRoot: ShadowRoot, cspNonce?: string): void {
  const styleId = "agegate-sandbox-styles";
  if (shadowRoot.querySelector(`#${styleId}`)) return;

  const style = document.createElement("style");
  style.id = styleId;
  if (cspNonce) {
    style.setAttribute("nonce", cspNonce);
  }
  style.textContent = `
    .agegate-sandbox-section {
      margin-top: 16px;
      padding: 12px 16px;
      border-top: 2px dashed var(--ag-border, #E5E7EB);
      text-align: center;
    }

    .agegate-sandbox-label {
      margin: 0 0 8px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--ag-text-muted, #6B7280);
    }

    .agegate-sandbox-buttons {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .agegate-sandbox-btn {
      min-height: 44px;
      min-width: 44px;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 600;
      border-width: 1px;
      border-style: solid;
      transition: opacity 0.15s ease;
    }

    .agegate-sandbox-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .agegate-sandbox-btn:focus-visible {
      outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start, #0091C7));
      outline-offset: 2px;
      box-shadow: var(--ag-focus-ring, 0 0 0 3px rgba(0, 145, 199, 0.4));
    }

    .agegate-sandbox-pass {
      background: #ecfdf5;
      color: #065f46;
      border-color: #6ee7b7;
    }

    .agegate-sandbox-fail {
      background: #fef2f2;
      color: #991b1b;
      border-color: #fca5a5;
    }

    @media (prefers-color-scheme: dark) {
      .agegate-sandbox-pass {
        background: #064e3b;
        color: #a7f3d0;
        border-color: #065f46;
      }

      .agegate-sandbox-fail {
        background: #7f1d1d;
        color: #fecaca;
        border-color: #991b1b;
      }

      .agegate-sandbox-section {
        border-top-color: var(--ag-border, #374151);
      }

      .agegate-sandbox-label {
        color: var(--ag-text-muted, #9CA3AF);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .agegate-sandbox-btn {
        transition: none;
      }
    }
  `;
  shadowRoot.appendChild(style);
}

export function injectMachineServiceStyles(
  shadowRoot: ShadowRoot,
  cspNonce?: string,
): void {
  const styleId = "agegate-ms-styles";
  if (shadowRoot.querySelector(`#${styleId}`)) return;
  const style = document.createElement("style");
  style.id = styleId;
  if (cspNonce) {
    style.setAttribute("nonce", cspNonce);
  }
  style.textContent = `
    /* Focus styles using theme-aware CSS variables */
    #agegate-mobile-btn:focus-visible,
    #agegate-show-qr:focus-visible,
    #agegate-retry-btn:focus-visible,
    .retry-button:focus-visible {
      outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start, #0091C7));
      outline-offset: 2px;
      box-shadow: var(--ag-focus-ring, 0 0 0 3px rgba(0, 145, 199, 0.4));
    }
    [role="alert"] button:focus-visible {
      outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start, #0091C7));
      outline-offset: 2px;
      box-shadow: var(--ag-focus-ring, 0 0 0 3px rgba(0, 145, 199, 0.4));
    }
    a[href*="provii.app/help"]:focus-visible,
    .footer a:focus-visible {
      outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start, #0091C7));
      outline-offset: 2px;
      border-radius: 2px;
    }

    /* Mobile CTA button */
    .agegate-mobile-cta {
      min-height: 48px;
      display: inline-block;
    }

    /* Time notice */
    .agegate-time-notice {
      margin: 8px 0 0;
      color: var(--ag-text-muted, #6B7280);
      font-size: 0.75rem;
      text-align: center;
    }

    /* QR toggle section */
    .agegate-qr-toggle-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--ag-border, #E5E7EB);
      text-align: center;
    }

    .agegate-qr-toggle-label {
      margin: 0 0 12px;
      color: var(--ag-text-secondary, #6B7280);
      font-size: 0.8125rem;
    }

    .agegate-qr-toggle-btn {
      min-height: 44px;
    }

    /* QR container visibility */
    .agegate-qr-container-hidden {
      display: none;
    }

    #agegate-qr-container {
      margin-top: 20px;
      text-align: center;
    }

    /* QR canvas */
    .agegate-qr-canvas {
      display: block;
      width: 200px;
      height: 200px;
      max-width: 100%;
      margin: 0 auto;
      border-radius: 8px;
      box-shadow: var(--ag-qr-shadow, 0 4px 20px rgba(0, 0, 0, 0.08));
      background: var(--ag-qr-bg, #FFFFFF);
      padding: 8px;
    }

    /* Help link */
    .agegate-help-link-container {
      margin: 16px 0 0;
      font-size: 0.8125rem;
      text-align: center;
    }

    .agegate-help-link-container-tight {
      margin-top: 8px;
    }

    .agegate-help-link {
      color: var(--ag-accent-start, #0091C7);
      display: inline-block;
      padding: 12px 8px;
      min-height: 44px;
    }

    /* Footer link */
    .agegate-footer-link {
      display: inline-block;
      padding: 4px 8px;
      min-height: 44px;
    }

    /* Short code section */
    .agegate-short-code {
      margin-top: 16px;
      text-align: center;
    }

    .agegate-shortcode-label {
      margin: 0 0 8px;
      color: var(--ag-text-secondary, #6B7280);
      font-size: 0.8125rem;
    }

    .agegate-shortcode-value {
      margin: 0;
      color: var(--ag-accent-start, #0091C7);
      font-size: 1.125rem;
      font-weight: 700;
      font-family: 'SF Mono', Monaco, monospace;
      letter-spacing: 2px;
    }

    @media screen and (max-width: 359px) {
      .agegate-shortcode-value {
        font-size: 0.9375rem;
      }
    }

    /* Skeleton loading gate */
    .agegate-skeleton-gate {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
    }

    /* Error state */
    .agegate-error-alert {
      text-align: center;
      padding: 20px;
      color: var(--ag-text, #1F2937);
    }

    .agegate-error-message {
      margin: 20px 0;
      color: var(--ag-text-secondary, #6B7280);
    }

    .agegate-error-details {
      color: var(--ag-text-muted, #6B7280);
      font-size: 0.75rem;
      margin: 10px 0;
    }

    .agegate-error-retry {
      background: var(--ag-accent-gradient);
      border: none;
      color: #fff;
      padding: 12px 24px;
      min-height: 44px;
      border-radius: var(--ag-radius-button);
      cursor: pointer;
      margin-top: 20px;
      font-size: 1rem;
      font-weight: 700;
    }

    /* Confirming status feedback (proof received, redeeming) */
    .agegate-status-confirming {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .agegate-pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ag-accent-start, #0091C7);
      animation: agegate-pulse 1.2s ease-in-out infinite;
    }

    @keyframes agegate-pulse {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
    }

    @media (prefers-reduced-motion: reduce) {
      .agegate-pulse-dot {
        animation: none;
        opacity: 1;
        transform: none;
      }
    }

    /* QR code fade-in transition */
    .gate-container {
      opacity: 0;
      transition: opacity 0.3s ease-in;
    }
    .gate-container.agegate-visible {
      opacity: 1;
    }
    /* Skeleton loading gate must remain visible (has its own spinner) */
    .agegate-skeleton-gate {
      opacity: 1;
      transition: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .gate-container {
        opacity: 1;
        transition: none;
      }
    }
  `;
  shadowRoot.appendChild(style);
}
