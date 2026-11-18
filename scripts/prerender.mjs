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
// dist/<path>/index.html, plus the "not found" page to dist/404.html. nginx
// serves <path>/index.html for /<path> itself — no redirect to a trailing
// slash — and 404.html with status 404 for every other address (decision
// 0029).
//
// Run via `npm run build:static` (never as a postbuild hook — plain
// `vite build` must stay usable without a Chromium install).
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { preview } from 'vite';
import { chromium } from 'playwright';
import { logError, logInfo } from './utils/logger.mjs';
import { readContactEmail } from '../src/config/contactEmail.ts';
import {
  LEGAL_PAGE_URL_TOKENS,
  readLegalPageUrls,
} from '../src/config/legalPageUrls.ts';
import {
  distDir,
  expandRoutes,
  getForwardedLegalRoutes,
  getSiteUrl,
  NOT_FOUND_FILE,
  NOT_FOUND_PATH,
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

/**
 * Collects the module preloads Vite wrote into the built shell.
 *
 * Everything else with `rel="modulepreload"` in a captured DOM was injected at
 * runtime — by Vite's dynamic-import helper or by `addPrefetchHint()` — while
 * the page was rendering, so the set depends on how many idle tasks happened
 * to finish before `page.content()` ran. Capturing those made the build
 * non-reproducible (the same commit produced 21 to 31 links across runs) and
 * baked idle-time hints into the markup as blocking head preloads.
 */
async function readShellPreloads() {
  const shell = await fs.readFile(path.join(distDir, 'index.html'), 'utf-8');
  const hrefs = new Set();
  for (const match of shell.matchAll(
    /<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"/gi,
  )) {
    hrefs.add(match[1]);
  }
  return hrefs;
}

/**
 * Drops runtime-injected module hints, keeping the build-time ones.
 *
 * Deliberately narrow: `rel="alternate"` (hreflang), `canonical` and the JSON-LD
 * block are injected by <Seo> at runtime too, and those are the whole point of
 * prerendering — only module hints are filtered.
 */
function stripRuntimeModuleHints(html, shellPreloads) {
  return html.replace(
    /<link\b[^>]*\brel="(?:modulepreload|prefetch)"[^>]*>/gi,
    (tag) => {
      const href = tag.match(/\bhref="([^"]+)"/i)?.[1];
      return href && shellPreloads.has(href) ? tag : '';
    },
  );
}

async function capture(browser, baseUrl, siteUrl, entry, shellPreloads) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();

  try {
    const expectedCanonical = new URL(entry.localizedPath, siteUrl).toString();
    // The captured HTML is what every visitor of the route receives first, and
    // React never takes over markup outside #root. A fresh browser profile is a
    // first visit, so without this the onboarding tour could end up baked into
    // /generator as dead markup. The storage notice would leave its padding
    // on <body> the same way, outside #root, for every visitor.
    await context.addInitScript(() => {
      window.localStorage.setItem(
        'spg.onboardingTour',
        JSON.stringify({ version: 1, seen: [], skipped: true }),
      );
      window.localStorage.setItem('cookieConsent', 'true');
    });
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
    return stripRuntimeModuleHints(html.replaceAll(baseUrl, ''), shellPreloads);
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

/**
 * Where the start script of the published image finds what it needs
 * (`scripts/configure-instance.sh`, decision 0048): the build's own address
 * and contact, and the legal pages as forwarding pages. A dot directory, so
 * nginx serves none of it.
 */
const INSTANCE_DIR = '.instance';
const FORWARD_DIR = path.join(INSTANCE_DIR, 'forward');
const FORWARD_PREVIEW_PORT = PREVIEW_PORT + 1;

/** Stands in for an operator's URL while the forwarding pages are drawn. */
const placeholderUrlFor = (route) =>
  `https://${route.slice(1)}.klassenplan.invalid/`;

/**
 * Draws the legal pages this build keeps as forwarding pages, for an image
 * that is given `IMPRINT_URL` or `PRIVACY_URL` when it starts. A copy of the
 * bundle gets a placeholder URL in place of the "none" token, the pages are
 * rendered from it, and the placeholder goes back to the token, which the
 * start script replaces in the pages as in the bundle. The pages exist before
 * the start, so the HTML never shows klassenplan.de's texts.
 */
async function captureForwardingPages(browser, siteUrl, entries, preloads) {
  const forwarded = getForwardedLegalRoutes();
  const legal = entries.filter(
    (entry) =>
      Object.hasOwn(LEGAL_PAGE_URL_TOKENS, entry.basePath) &&
      !forwarded.has(entry.basePath),
  );
  if (legal.length === 0) return [];

  const copy = await fs.mkdtemp(path.join(os.tmpdir(), 'klassenplan-forward-'));
  try {
    await fs.cp(distDir, copy, { recursive: true });
    for (const file of await fs.readdir(copy, { recursive: true })) {
      if (!file.endsWith('.js')) continue;
      const absolute = path.join(copy, file);
      const source = await fs.readFile(absolute, 'utf-8');
      let replaced = source;
      for (const [route, token] of Object.entries(LEGAL_PAGE_URL_TOKENS)) {
        replaced = replaced.replaceAll(token, placeholderUrlFor(route));
      }
      if (replaced !== source) {
        await fs.writeFile(absolute, replaced, 'utf-8');
        await fs.rm(`${absolute}.br`, { force: true });
      }
    }

    const server = await preview({
      preview: { port: FORWARD_PREVIEW_PORT, strictPort: true },
      build: { outDir: copy },
    });
    const baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '');
    const captures = [];
    try {
      for (const entry of legal) {
        let html = await capture(browser, baseUrl, siteUrl, entry, preloads);
        const token = LEGAL_PAGE_URL_TOKENS[entry.basePath];
        html = html.replaceAll(placeholderUrlFor(entry.basePath), token);
        if (!html.includes(token)) {
          throw new Error(
            `Forwarding page ${entry.localizedPath} does not link to the operator's page`,
          );
        }
        captures.push({
          file: path.join(FORWARD_DIR, outputFileFor(entry.localizedPath)),
          html,
        });
        logInfo(
          'Rendered forwarding page',
          { path: entry.localizedPath },
          SOURCE,
        );
      }
    } finally {
      await server.close();
    }
    return captures;
  } finally {
    await fs.rm(copy, { recursive: true, force: true });
  }
}

/**
 * The address, contact and legal pages this build has: the start script
 * replaces the first two and knows from the others which legal pages it may
 * still set.
 */
async function writeInstanceInfo(siteUrl) {
  const contact = readContactEmail(process.env);
  const legal = readLegalPageUrls(process.env);
  const file = path.join(distDir, INSTANCE_DIR, 'build.env');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    [
      `BUILD_SITE_URL=${siteUrl}`,
      `BUILD_CONTACT_EMAIL=${contact}`,
      `BUILD_IMPRINT_URL=${legal['/impressum'] ?? ''}`,
      `BUILD_PRIVACY_URL=${legal['/datenschutz'] ?? ''}`,
      '',
    ].join('\n'),
    'utf-8',
  );
}

async function run() {
  const siteUrl = getSiteUrl();
  const entries = expandRoutes(await readRoutes());

  const server = await preview({
    preview: { port: PREVIEW_PORT, strictPort: true },
  });
  const baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '');
  const browser = await chromium.launch();
  // Read before writeCaptures() overwrites dist/index.html below.
  const shellPreloads = await readShellPreloads();

  const captures = [];
  try {
    try {
      // NotFound declares the address it was asked for as its canonical, so the
      // probe waits for that one; the page is noindex either way.
      captures.push({
        file: NOT_FOUND_FILE,
        html: await capture(
          browser,
          baseUrl,
          siteUrl,
          { localizedPath: NOT_FOUND_PATH, lang: 'de' },
          shellPreloads,
        ),
      });
      logInfo('Rendered not-found page', { path: NOT_FOUND_PATH }, SOURCE);

      for (const entry of entries) {
        const html = await capture(
          browser,
          baseUrl,
          siteUrl,
          entry,
          shellPreloads,
        );
        captures.push({ file: outputFileFor(entry.localizedPath), html });
        logInfo(
          'Rendered route',
          { path: entry.localizedPath, lang: entry.lang },
          SOURCE,
        );
      }
    } finally {
      await server.close();
    }

    // From a copy of the bundle as it is before the captures overwrite it.
    captures.push(
      ...(await captureForwardingPages(
        browser,
        siteUrl,
        entries,
        shellPreloads,
      )),
    );
  } finally {
    await browser.close();
  }

  // Written only after the browser is gone: overwriting dist/index.html while
  // the preview server is still serving it would poison later navigations.
  await writeCaptures(captures);
  await writeInstanceInfo(siteUrl);

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
