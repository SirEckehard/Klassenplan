// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * What a teacher waits for on a slow classroom computer, measured by hand
 * (`npm run measure:slow-device`, figures in `docs/PERFORMANCE.md`). Not part
 * of CI: timings on a shared runner vary too much for a fixed ceiling, as for
 * `npm run bench`.
 *
 * Runs against the production bundle (`vite preview` of `dist/`, which the
 * script builds first), never the dev server: Vite's dev server transforms
 * every module on request and would measure itself.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;

export default defineConfig({
  testDir: './e2e/perf',
  testMatch: /\.perf\.ts$/,
  // One browser at a time: two measurements side by side share the CPU.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  timeout: 15 * 60_000,
  expect: { timeout: 60_000 },
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    locale: 'de-DE',
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
