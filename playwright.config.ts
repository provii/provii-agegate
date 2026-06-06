// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/specs',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    trace: 'retain-on-failure',
  },

  // The stub server (e2e/stub-server.ts) holds challenge state in a
  // process-global Map keyed by a fixed id. Two test workers polling
  // the same record race on poll_count, status transitions, and the
  // admin/expire endpoint. Single-worker keeps each test's view of the
  // stub deterministic without forcing every spec into a serial
  // describe.
  workers: 1,

  // point to your files as strings
  globalSetup: './e2e/globalSetup.ts',
  globalTeardown: './e2e/globalTeardown.ts',

  projects: [
    {
      name: 'desktop-chrome',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'desktop-firefox',
      use: {
        browserName: 'firefox',
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'desktop-webkit',
      use: {
        browserName: 'webkit',
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'mobile-pixel5',
      use: devices['Pixel 5'],
    },
    {
      name: 'mobile-iphone14',
      use: devices['iPhone 14'],
    },
  ],
});
