// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Default overlay shell CSS for auto-block mode.
 *
 * Overlay layout only: the challenge content styling is provided by the
 * shared challenge-ui module (injected separately on render). Returned by
 * AutoBlockMode.getStyles() when no custom stylesheet is configured.
 *
 * @module modes/autoload/overlay-styles
 */

export const OVERLAY_STYLES = `
      /* Modal layout: full-viewport blocking overlay */
      .provii-age-gate-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: var(--ag-overlay-backdrop, rgba(0, 0, 0, 0.95));
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
      }

      .provii-overlay-content {
        background: var(--ag-bg, white);
        padding: 40px;
        border-radius: var(--ag-radius-container, 16px);
        max-width: 500px;
        width: 100%;
        text-align: center;
        position: relative;
        box-shadow: var(--ag-shadow-lg, 0 8px 32px rgba(0, 0, 0, 0.12));
      }

      .provii-close-button {
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 2rem;
        color: var(--ag-text-secondary, #545454);
        cursor: pointer;
        padding: 4px;
        width: 44px;
        height: 44px;
        line-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;
      }

      .provii-close-button:hover {
        color: var(--ag-text, #1a1a1a);
      }

      .provii-close-button:focus-visible {
        outline: 3px solid var(--ag-focus-outline, #FFFFFF);
        outline-offset: 2px;
        box-shadow: 0 0 0 6px rgba(0, 0, 0, 0.5);
      }

      .provii-retry-button {
        display: inline-block;
        margin-top: 16px;
        padding: 12px 24px;
        background: var(--ag-accent-gradient);
        color: white;
        border: none;
        border-radius: var(--ag-radius-button);
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        min-height: 44px;
      }

      .provii-retry-button:focus-visible {
        outline: 3px solid var(--ag-focus-outline, #FFFFFF);
        outline-offset: 2px;
        box-shadow: 0 0 0 6px rgba(0, 0, 0, 0.5);
      }

      .provii-status-message {
        font-size: 1rem;
        color: var(--ag-text-secondary, #545454);
      }

      /* Escape hatch link (visible when allowClose is false) */
      .provii-escape-link {
        display: inline-block;
        margin-top: 16px;
        padding: 12px 8px;
        min-height: 44px;
        color: var(--ag-text-secondary, #545454);
        font-size: 0.8125rem;
        text-decoration: underline;
        cursor: pointer;
      }

      .provii-escape-link:hover {
        color: var(--ag-text, #1a1a1a);
      }

      .provii-escape-link:focus-visible {
        outline: 3px solid var(--ag-focus-outline, #FFFFFF);
        outline-offset: 2px;
        box-shadow: 0 0 0 6px rgba(0, 0, 0, 0.5);
      }

      /* RTL support: logical properties for directional spacing */
      :host([dir="rtl"]) .provii-close-button {
        right: auto;
        left: 12px;
      }

      /* Preview mode banner */
      .provii-preview-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 6px 12px;
        margin-bottom: 12px;
        background: #fef3c7;
        color: #92400e;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
        line-height: 1.4;
      }

      .provii-preview-banner-dismiss {
        background: none;
        border: none;
        color: #92400e;
        cursor: pointer;
        font-size: 1rem;
        padding: 2px 6px;
        line-height: 1;
        min-width: 28px;
        min-height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .provii-preview-banner-dismiss:focus-visible {
        outline: 2px solid #92400e;
        outline-offset: 2px;
      }

      @media screen and (max-width: 360px) {
        .provii-overlay-content {
          padding: 20px;
          margin: 10px;
          max-width: calc(100% - 20px);
        }
      }
    `;
