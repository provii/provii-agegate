// provii-agegate/e2e/specs/desktop-happy.spec.ts
import { test, expect } from "@playwright/test";

const base = () => `http://localhost:${process.env["E2E_PORT"] ?? 3001}`;

test.beforeEach(async () => {
  await fetch(`${base()}/admin/challenges`, { method: "DELETE" });
});

test("desktop happy‑path renders QR then redirects", async ({
  page,
}, testInfo) => {
  /* Skip when running under the mobile project */
  if (testInfo.project.name.includes("mobile")) testInfo.skip();

  page.on("pageerror", (err) => console.error("[browser error]", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("[browser console]", msg.text());
  });

  await page.goto(`${base()}/examples/demo/index.html`);
  // The SDK uses a closed shadow root, so the canvas itself is invisible
  // to standard query selectors. The mount host gets `data-agegate-mount`
  // when the shadow attaches and `data-agegate-mode="desktop"` when the
  // desktop UI is mounted. Wait on the attribute presence (state:attached)
  // rather than viewport visibility , playwright's default
  // state: 'visible' would never resolve because the host element has
  // no light-DOM dimensions before the shadow content paints.
  await page
    .locator('[data-agegate-mount][data-agegate-mode="desktop"]')
    .waitFor({ state: "attached", timeout: 10_000 });
  // The stub auto-progresses pending → proof_ok_waiting_for_redeem on the
  // third status poll, then the SDK redeems and redirects. Each poll
  // backs off ~5s by default so 30s gives the full cycle plenty of time.
  await page.waitForURL("**/content", { timeout: 30_000 });
  expect(page.url()).toContain("/content");
});
