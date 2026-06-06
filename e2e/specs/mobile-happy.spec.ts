// provii-agegate/e2e/specs/mobile-happy.spec.ts

import { test, expect } from "@playwright/test";

const base = () => `http://localhost:${process.env["E2E_PORT"] ?? 3001}`;

test.beforeEach(async () => {
  await fetch(`${base()}/admin/challenges`, { method: "DELETE" });
});

// No test.use({ ...devices[...] }) here. Mobile device config comes
// from the project definitions in playwright.config.ts (mobile-pixel5,
// mobile-iphone14). Setting isMobile at file level would force desktop
// projects (including Firefox, which doesn't support isMobile) to create
// a mobile context and fail before the test body can skip.

test("mobile happy‑path renders deep‑link anchor", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "mobile projects only");

  page.on("pageerror", (err) => console.error("[browser error]", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("[browser console]", msg.text());
  });

  await page.goto(`${base()}/examples/demo/index.html`);
  // The deep-link CTA lives inside a closed shadow root. The SDK exposes
  // the deep link on the mount host as `data-agegate-deep-link` so tests
  // (and integrators that opt into reading it) can confirm the wallet
  // redirect URL without piercing the shadow tree.
  const host = page.locator(
    '[data-agegate-mount][data-agegate-mode="mobile"]',
  );
  // toBeAttached already operates on DOM presence rather than visibility,
  // so the host is matched as soon as renderMobileChallenge has set the
  // mode attribute, even before the inside-shadow CTA paints.
  await expect(host).toBeAttached({ timeout: 10_000 });
  await expect(host).toHaveAttribute(
    "data-agegate-deep-link",
    /^proviiwallet:\/\/verify/,
  );
});
