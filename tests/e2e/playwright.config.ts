import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './specs',
  // Fails the run at once when the real backend is not up. See src/global-setup.ts.
  globalSetup: './src/global-setup.ts',
  timeout: 90_000,
  expect: { timeout: 20_000 },

  // One Chrome instance, one persistent profile. Parallel workers would fight
  // over the same user-data-dir, so this stays serial on purpose.
  fullyParallel: false,
  workers: 1,
  retries: 0,

  reporter: [['list']],
  use: {
    // The trace already carries DOM snapshots and a screencast, and those are
    // what failures are actually diagnosed from.
    trace: 'retain-on-failure',
    // Off unless asked for. Playwright raises the tab to the front before every
    // screenshot, which yanks the whole browser window in front of whatever the
    // person at the keyboard was doing — once per failing test.
    screenshot: process.env.E2E_SCREENSHOTS === '1' ? 'only-on-failure' : 'off',
  },
})
