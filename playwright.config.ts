// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // A retry tells a broken runner from a broken spec, but a spec that passes
  // only on its second attempt still fails the run: three runs in a row once
  // went green on a spec that failed every first attempt.
  failOnFlakyTests: Boolean(process.env.CI),
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
      testIgnore: /(touch-layouts|export-sheets)\.spec\.ts/,
    },
    // Below `lg` the inspector and the toolbar have no column; these two walk
    // what takes their place. Chromium in both, as the CI installs only it —
    // the iPad's own descriptor would ask for WebKit.
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'], browserName: 'chromium' },
      testMatch: /(touch-layouts|page-header)\.spec\.ts/,
      grep: /@tablet/,
    },
    {
      name: 'phone',
      // The iPhone 16 Pro is 402px wide, the narrowest header the app has
      // been reported on.
      use: { ...devices['iPhone 16 Pro'], browserName: 'chromium' },
      testMatch: /(touch-layouts|page-header)\.spec\.ts/,
      grep: /@phone/,
    },
    {
      // An interactive whiteboard: a wide screen and only a finger. It gets
      // the desktop layout, which the mouse-driven specs walk without touch.
      name: 'whiteboard',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        hasTouch: true,
      },
      testMatch: /(touch-layouts|page-header)\.spec\.ts/,
      grep: /@whiteboard/,
    },
    {
      // The export sheets as pictures. Snapshots are drawn on Linux, as CI
      // runs it; on a Mac `npm run test:visual` runs this project in Docker.
      // One path for every platform, since only one platform writes them.
      name: 'visual',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 960 },
      },
      testMatch: /export-sheets\.spec\.ts/,
      snapshotPathTemplate:
        '{testDir}/__screenshots__/{testFileName}/{arg}{ext}',
      expect: {
        toHaveScreenshot: {
          // A sheet is mostly white: a whole line of text moved by a pixel
          // changes more than this, a smoothed edge less.
          maxDiffPixelRatio: 0.002,
          animations: 'disabled',
          caret: 'hide',
          scale: 'css',
        },
      },
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
