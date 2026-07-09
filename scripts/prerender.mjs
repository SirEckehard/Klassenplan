// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// Build-time prerendering. The app is a client-rendered SPA, so without this
// step every URL would serve the same index.html — same title, same
// `<html lang="de">`, and a canonical pointing at the German home page. Any
// crawler that does not execute JavaScript (Bing, DuckDuckGo, social preview
// bots, the AI crawlers welcomed in robots.txt) would see all 20 URLs
// canonicalise themselves onto `/`.
//
// Here we render each route in a real browser and write the resulting DOM to
// dist/<path>/index.html. nginx picks those up through the `$uri/` branch of
// its try_files directive; no server change is required.
//
// Run via `npm run build:static` (never as a postbuild hook — plain
// `vite build` must stay usable without a Chromium install).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { preview } from 'vite';
import { chromium } from 'playwright';
import { logError, logInfo } from './utils/logger.mjs';
import {
  distDir,
  expandRoutes,
  getSiteUrl,
  outputFileFor,
  readRoutes,
} from './utils/seoRoutes.mjs';

const PREVIEW_PORT = 4173;
const READY_TIMEOUT_MS = 15_000;
const SOURCE = 'prerender';

/**
 * Wait until the <Seo> effect has run for *this* route. Checking the canonical
 * URL, `<html lang>` and the JSON-LD block is far more reliable than
 * `networkidle`: web-vitals and idle-task prefetching keep the network busy
 * long after the page is done.
 *
 * `#page-structured-data` exists on every route — pages supply their own
 * JSON-LD nodes and <Seo> appends a BreadcrumbList to every non-home page — and
 * it is only ever created by that effect, so it also covers the home page,
 * whose canonical and lang already match the static shell.
 */
async function waitForRender(page, expectedCanonical, expectedLang) {
  await page.waitForFunction(
    ({ canonical, lang }) => {
      const link = document.querySelector('link[rel="canonical"]');
      return (
        document.documentElement.lang === lang &&
        !!link &&
        link.getAttribute('href') === canonical &&
        !!document.getElementById('page-structured-data')
      );
    },
    { canonical: expectedCanonical, lang: expectedLang },
    { timeout: READY_TIMEOUT_MS },
  );
}

async function capture(browser, baseUrl, siteUrl, entry) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();

  try {
    const expectedCanonical = new URL(entry.localizedPath, siteUrl).toString();
    await page.goto(`${baseUrl}${entry.localizedPath}`, {
      waitUntil: 'commit',
    });
    await waitForRender(page, expectedCanonical, entry.lang);

    // Vite's dynamic-import preload helper and addPrefetchHint() both emit
    // absolute hrefs, so the captured DOM carries the preview origin. Left in
    // place they would ship as http://localhost:4173/... links in production:
    // failed requests and CSP violations on every page. Root-relative paths
    // resolve correctly on any host.
    const html = await page.content();
    return html.replaceAll(baseUrl, '');
  } finally {
    await context.close();
  }
}

async function writeCaptures(captures) {
  for (const { file, html } of captures) {
    const absolute = path.resolve(distDir, file);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, html, 'utf-8');
    // Defensive: a precompressed copy from an older build would shadow the
    // fresh file, because nginx serves .br first (brotli_static on).
    await fs.rm(`${absolute}.br`, { force: true });
  }
}

async function run() {
  const siteUrl = getSiteUrl();
  const entries = expandRoutes(await readRoutes());

  const server = await preview({
    preview: { port: PREVIEW_PORT, strictPort: true },
  });
  const baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '');
  const browser = await chromium.launch();

  const captures = [];
  try {
    for (const entry of entries) {
      const html = await capture(browser, baseUrl, siteUrl, entry);
      captures.push({ file: outputFileFor(entry.localizedPath), html });
      logInfo(
        'Rendered route',
        { path: entry.localizedPath, lang: entry.lang },
        SOURCE,
      );
    }
  } finally {
    await browser.close();
    await server.close();
  }

  // Written only after the browser is gone: overwriting dist/index.html while
  // the preview server is still serving it would poison later navigations.
  await writeCaptures(captures);

  logInfo(
    'Prerender complete',
    { pages: captures.length, siteUrl, outputDir: distDir },
    SOURCE,
  );
}

run().catch((error) => {
  const context =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { detail: String(error) };
  logError('Prerender failed', context, SOURCE);
  process.exitCode = 1;
});
