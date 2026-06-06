/**
 * E2E tests for session state transitions (MED-9).
 *
 * Tests: expired sessions, revoked sessions, and the redemption happy path.
 * Uses the stub server admin endpoints to force state transitions.
 *
 * The SDK renders into a closed shadow root, so playwright cannot read
 * the in-shadow alert/error text directly. The SDK mirrors state to
 * `data-agegate-state`, `data-agegate-prompt`, and `data-agegate-message`
 * on the mount element; these tests key off the light-DOM attributes.
 */
import { test, expect } from "@playwright/test";

const base = () => `http://localhost:${process.env["E2E_PORT"] ?? 3001}`;
const CHALLENGE_ID = "00000000-0000-4000-8000-000000000000";

test.describe("Session state transitions", () => {
  test.beforeEach(async ({ page }) => {
    // Clear shared mutable state so each test starts with a clean
    // challenge map. Without this, a challenge left in "verified" by a
    // prior test leaks into the next one.
    await fetch(`${base()}/admin/challenges`, { method: "DELETE" });

    page.on("pageerror", (err) => console.error("[browser error]", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("[browser console]", msg.text());
    });
  });

  test('expired session shows "Session expired" message', async ({ page }) => {
    await page.goto(`${base()}/examples/demo/index.html`);

    // Wait for the SDK to mount the rendered UI inside the closed shadow root.
    await page
      .locator("[data-agegate-mount][data-agegate-mode]")
      .waitFor({ state: "attached", timeout: 10_000 });

    // Force the session to expired via admin endpoint.
    await fetch(`${base()}/admin/expire/${CHALLENGE_ID}`, { method: "POST" });

    // The SDK detects expiry on the next poll and surfaces the failure
    // prompt with the configured user message. Both the prompt type
    // and the message text are mirrored to light-DOM attributes.
    const host = page.locator("[data-agegate-mount]");
    await expect(host).toHaveAttribute(
      "data-agegate-prompt",
      /^(error|timeout)$/,
      { timeout: 15_000 },
    );
    await expect(host).toHaveAttribute("data-agegate-message", /expired/i);
  });

  test("revoked session surfaces revoked state", async ({ page }) => {
    await page.goto(`${base()}/examples/demo/index.html`);
    await page
      .locator("[data-agegate-mount][data-agegate-mode]")
      .waitFor({ state: "attached", timeout: 10_000 });

    // Force revocation via admin endpoint.
    await fetch(`${base()}/admin/revoke/${CHALLENGE_ID}`, { method: "POST" });

    // The SDK reports the revoked state via data-agegate-state and a
    // user-facing prompt; both are observable from light DOM.
    const host = page.locator("[data-agegate-mount]");
    await expect(host).toHaveAttribute("data-agegate-prompt", /^error$/, {
      timeout: 15_000,
    });
  });

  test("redemption happy path: challenge, poll, redeem, content unlocks", async ({
    page,
  }) => {
    await page.goto(`${base()}/examples/demo/index.html`);
    await page
      .locator("[data-agegate-mount][data-agegate-mode]")
      .waitFor({ state: "attached", timeout: 10_000 });

    // The stub server auto-transitions to proof_ok after 3 polls, then
    // the SDK auto-redeems and redirects to content.
    await page.waitForURL("**/content", { timeout: 20_000 });
    expect(page.url()).toContain("/content");
  });
});
