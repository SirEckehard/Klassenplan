// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// Asserts that the prerendered files in dist/ really carry per-route metadata.
// This is the regression test for the bug that motivated prerendering: every
// URL used to ship the same shell, with a canonical pointing at `/`.
//
// Runs as the last step of `npm run build:static` and fails the build.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { logError, logInfo } from './utils/logger.mjs';
import {
  distDir,
  expandRoutes,
  getLocalizedPath,
  getSiteUrl,
  outputFileFor,
  readRoutes,
} from './utils/seoRoutes.mjs';

const SOURCE = 'verify-prerender';

function metaContent(html, attribute, key) {
  const pattern = new RegExp(
    `<meta[^>]*${attribute}=["']${key}["'][^>]*content=["']([^"']*)["']`,
    'i',
  );
  return html.match(pattern)?.[1] ?? null;
}

function linkHref(html, rel) {
  const pattern = new RegExp(
    `<link[^>]*rel=["']${rel}["'][^>]*href=["']([^"']*)["']`,
    'i',
  );
  return html.match(pattern)?.[1] ?? null;
}

function hreflangHref(html, hreflang) {
  const pattern = new RegExp(
    `<link[^>]*hreflang=["']${hreflang}["'][^>]*href=["']([^"']*)["']`,
    'i',
  );
  return html.match(pattern)?.[1] ?? null;
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Root element must contain rendered markup, not just the empty shell. */
function rootIsPopulated(html) {
  const match = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<script/i);
  if (!match) {
    // The closing </div> is ambiguous once real content is nested; fall back to
    // checking that *something* follows the opening tag.
    const opening = html.indexOf('<div id="root">');
    if (opening === -1) return false;
    const after = html.slice(opening + '<div id="root">'.length, opening + 400);
    return after.trim().length > 0 && after.trimStart().startsWith('<');
  }
  return match[1].trim().length > 0;
}

function checkEntry(html, entry, siteUrl) {
  const errors = [];
  const expect = (label, actual, expected) => {
    if (actual !== expected) {
      errors.push(
        `${label}\n      expected: ${expected}\n      actual:   ${actual}`,
      );
    }
  };

  const canonical = new URL(entry.localizedPath, siteUrl).toString();
  const deHref = new URL(
    getLocalizedPath(entry.basePath, 'de'),
    siteUrl,
  ).toString();
  const enHref = new URL(
    getLocalizedPath(entry.basePath, 'en'),
    siteUrl,
  ).toString();

  const lang = html.match(/<html[^>]*\blang=["']([^"']*)["']/i)?.[1] ?? null;
  expect('html[lang]', lang, entry.lang);

  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? null;
  const expectedTitle = entry.title.includes('Klassenplan')
    ? entry.title
    : `${entry.title} | Klassenplan`;
  expect('title', title && decodeEntities(title), expectedTitle);

  expect(
    'meta[description]',
    metaContent(html, 'name', 'description') &&
      decodeEntities(metaContent(html, 'name', 'description')),
    entry.description,
  );

  // The core assertion: each page declares itself canonical, not `/`.
  expect('link[canonical]', linkHref(html, 'canonical'), canonical);
  expect('og:url', metaContent(html, 'property', 'og:url'), canonical);
  expect(
    'og:locale',
    metaContent(html, 'property', 'og:locale'),
    entry.lang === 'de' ? 'de_DE' : 'en_US',
  );
  expect(
    'og:locale:alternate',
    metaContent(html, 'property', 'og:locale:alternate'),
    entry.lang === 'de' ? 'en_US' : 'de_DE',
  );

  expect('hreflang[de]', hreflangHref(html, 'de'), deHref);
  expect('hreflang[en]', hreflangHref(html, 'en'), enHref);
  expect('hreflang[x-default]', hreflangHref(html, 'x-default'), enHref);

  expect(
    'meta[robots]',
    metaContent(html, 'name', 'robots'),
    entry.noindex ? 'noindex,follow' : 'index,follow',
  );

  if (!rootIsPopulated(html)) {
    errors.push('#root is empty — the page was not actually prerendered');
  }
  if (!/id="page-structured-data"/.test(html)) {
    errors.push('missing JSON-LD block (#page-structured-data)');
  }
  // The prerender runs against a local preview server, and Vite's preload
  // helper writes absolute hrefs. Any leftover would ship dead links.
  if (/localhost|127\.0\.0\.1/.test(html)) {
    errors.push('preview origin leaked into the output (localhost URLs)');
  }

  return errors;
}

async function run() {
  const siteUrl = getSiteUrl();
  const entries = expandRoutes(await readRoutes());
  const failures = [];

  for (const entry of entries) {
    const file = outputFileFor(entry.localizedPath);
    const absolute = path.resolve(distDir, file);

    let html;
    try {
      html = await fs.readFile(absolute, 'utf-8');
    } catch {
      failures.push(`${file}\n    - file missing`);
      continue;
    }

    const errors = checkEntry(html, entry, siteUrl);
    if (errors.length > 0) {
      failures.push(`${file}\n    - ${errors.join('\n    - ')}`);
    }
  }

  if (failures.length > 0) {
    logError(
      'Prerender verification failed',
      { failedPages: failures.length, totalPages: entries.length },
      SOURCE,
    );
    for (const failure of failures) {
      logError(`  ${failure}`, undefined, SOURCE);
    }
    process.exitCode = 1;
    return;
  }

  logInfo('Prerender verified', { pages: entries.length, siteUrl }, SOURCE);
}

run().catch((error) => {
  const context =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { detail: String(error) };
  logError('Prerender verification crashed', context, SOURCE);
  process.exitCode = 1;
});
