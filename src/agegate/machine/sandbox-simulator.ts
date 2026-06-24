// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Sandbox proof simulator (W3-frontend) for the AgeGate machine.
 *
 * Renders Simulate Pass / Simulate Fail controls and submits simulated
 * outcomes to the sandbox simulate-proof endpoint. Active only when
 * `cfg.environment === "sandbox"`.
 *
 * @module machine/sandbox-simulator
 */

import { fetchWithTimeout } from "../../utils/fetchWithTimeout.js";
import { AgeGateError } from "../../errors/AgeGateError.js";
import { t } from "../../i18n/index.js";
import type { CreateChallengeResponse } from "../../api/v1.js";
import type { AgeGateConfig } from "../AgeGateConfig.js";
import { DEFAULT_TIMEOUT } from "./constants.js";
import { injectSandboxStyles } from "./styles.js";

/**
 * Submit a simulated proof outcome to the sandbox simulate-proof endpoint.
 *
 * Only works when `cfg.environment === "sandbox"`. Derives the endpoint URL
 * from cfg.challengeUrl by replacing the trailing `/challenge` segment with
 * `/sandbox/simulate-proof`.
 *
 * @throws AgeGateError on non-200 response or network failure
 */
async function simulateProof(
  challengeId: string,
  submitSecret: string,
  outcome: "verified" | "age_not_met",
  cfg: AgeGateConfig,
): Promise<void> {
  if (cfg.environment !== "sandbox") {
    throw new AgeGateError(
      "simulateProof is only available in sandbox environment",
      "Simulation is only available in sandbox mode",
      "SIMULATE_NOT_SANDBOX",
    );
  }

  const simulateUrl =
    cfg.challengeUrl.replace(/\/challenge$/, "") + "/sandbox/simulate-proof";

  const res = await fetchWithTimeout(
    simulateUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Public-Key": cfg.publicKey,
      },
      body: JSON.stringify({
        challenge_id: challengeId,
        submit_secret: submitSecret,
        outcome,
      }),
    },
    DEFAULT_TIMEOUT,
  );

  if (!res.ok) {
    let errorDetail = "";
    try {
      const errorText = await res.text();
      errorDetail = `: ${errorText}`;
    } catch {
      // Ignore read errors
    }
    throw new AgeGateError(
      `Simulate proof failed (${res.status})${errorDetail}`,
      "Simulation request failed. Please try again.",
      `SIMULATE_HTTP_${res.status}`,
    );
  }
}

/**
 * Render sandbox testing controls (Simulate Pass / Simulate Fail buttons)
 * below the main challenge UI. Only rendered when `cfg.environment === "sandbox"`.
 *
 * Appends to the `.content` element inside the shadow DOM so the buttons
 * appear below the QR code (desktop) or deep link button (mobile).
 */
export function renderSandboxSimulator(
  shadowRoot: ShadowRoot,
  challenge: CreateChallengeResponse,
  cfg: AgeGateConfig,
  cspNonce?: string,
): void {
  if (cfg.environment !== "sandbox") return;

  // Build the sandbox section container
  const section = document.createElement("div");
  section.className = "agegate-sandbox-section";
  section.setAttribute("role", "region");
  section.setAttribute("aria-labelledby", "agegate-sandbox-heading");

  // Heading
  const heading = document.createElement("h3");
  heading.id = "agegate-sandbox-heading";
  heading.className = "agegate-sandbox-label";
  heading.textContent = t("sandboxTesting");
  section.appendChild(heading);

  // Button container
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "agegate-sandbox-buttons";

  // Pass button
  const passButton = document.createElement("button");
  passButton.type = "button";
  passButton.className = "agegate-sandbox-btn agegate-sandbox-pass";
  passButton.textContent = t("simulatePass");
  passButton.setAttribute("aria-label", t("simulatePassAriaLabel"));

  // Fail button
  const failButton = document.createElement("button");
  failButton.type = "button";
  failButton.className = "agegate-sandbox-btn agegate-sandbox-fail";
  failButton.textContent = t("simulateFail");
  failButton.setAttribute("aria-label", t("simulateFailAriaLabel"));

  const passOriginalText = passButton.textContent;
  const failOriginalText = failButton.textContent;

  /**
   * Handle a simulate button click. Disables both buttons, calls the
   * simulate endpoint, and updates the UI based on the result.
   */
  async function handleSimulate(
    outcome: "verified" | "age_not_met",
    clickedButton: HTMLButtonElement,
    originalText: string,
  ): Promise<void> {
    // Disable both buttons and show loading state
    passButton.disabled = true;
    failButton.disabled = true;
    clickedButton.setAttribute("aria-busy", "true");
    clickedButton.textContent = t("simulating");

    try {
      await simulateProof(
        challenge.challenge_id,
        challenge.submit_secret,
        outcome,
        cfg,
      );

      // Update button text on success
      clickedButton.textContent =
        outcome === "verified" ? "\u2713 Simulated" : "\u2717 Simulated";
      clickedButton.removeAttribute("aria-busy");

      // Update the existing aria-live status region so screen readers
      // announce the state change (WCAG 4.1.3 Status Messages)
      const statusRegion = shadowRoot.querySelector('[aria-live="polite"]');
      if (statusRegion) {
        const statusSpan = statusRegion.querySelector("span");
        if (statusSpan) {
          statusSpan.textContent = "Simulation submitted, verifying...";
        }
      }
    } catch (err) {
      // Re-enable buttons and restore original text on failure
      passButton.disabled = false;
      failButton.disabled = false;
      clickedButton.removeAttribute("aria-busy");
      clickedButton.textContent = originalText;
      console.error("[AgeGate] Simulation failed:", err);
    }
  }

  passButton.addEventListener("click", () => {
    handleSimulate("verified", passButton, passOriginalText);
  });

  failButton.addEventListener("click", () => {
    handleSimulate("age_not_met", failButton, failOriginalText);
  });

  buttonContainer.appendChild(passButton);
  buttonContainer.appendChild(failButton);
  section.appendChild(buttonContainer);

  // Append to the .content element inside the shadow DOM
  const contentElement = shadowRoot.querySelector(".content");
  if (contentElement) {
    contentElement.appendChild(section);
  }

  injectSandboxStyles(shadowRoot, cspNonce);
}
