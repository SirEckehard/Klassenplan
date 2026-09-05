// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  // The suite runs against the Vite dev server, which transforms a route the
  // first time it is requested. On a cold CI server that first navigation can
  // outlast the 5 s default while every later one takes well under a second, so
  // the ceiling is raised rather than the specs padded with waits.
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // The port is passed explicitly: `vite.config.ts` serves on 3000, and Vite
    // silently moves to the next free port when that one is taken, so a plain
    // `npm run dev` leaves Playwright waiting on a URL nothing is bound to.
    // `--strictPort` turns a busy port into an immediate error instead of a
    // two-minute timeout, and `--no-open` keeps it from launching a browser.
    command: 'npm run dev -- --port 5173 --strictPort --no-open',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
