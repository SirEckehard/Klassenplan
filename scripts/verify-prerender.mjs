// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// Asserts that the prerendered files in dist/ really carry per-route metadata.
// It guards against what prerendering exists for: every URL shipping the same
// shell, with a canonical pointing at `/`.
//
// Runs as the last step of `npm run build:static` and fails the build.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { logError, logInfo } from './utils/logger.mjs';
import { DEFAULT_CONTACT_EMAIL } from '../src/config/contactEmail.ts';
import { LEGAL_PAGE_URL_TOKENS } from '../src/config/legalPageUrls.ts';
import {
  distDir,
  expandRoutes,
  getForwardedLegalRoutes,
  getLocalizedPath,
  getSiteUrl,
  NOT_FOUND_FILE,
  outputFileFor,
  readRoutes,
} from './utils/seoRoutes.mjs';

const SOURCE = 'verify-prerender';

// The value patterns match up to the closing quote via a backreference, so a
// double-quoted value may contain apostrophes (e.g. "students' names").
function metaContent(html, attribute, key) {
  const pattern = new RegExp(
    `<meta[^>]*${attribute}=["']${key}["'][^>]*content=(["'])(.*?)\\1`,
    'i',
  );
  return html.match(pattern)?.[2] ?? null;
}

function linkHref(html, rel) {
  const pattern = new RegExp(
    `<link[^>]*rel=["']${rel}["'][^>]*href=(["'])(.*?)\\1`,
    'i',
  );
  return html.match(pattern)?.[2] ?? null;
}

function hreflangHref(html, hreflang) {
  const pattern = new RegExp(
    `<link[^>]*hreflang=["']${hreflang}["'][^>]*href=(["'])(.*?)\\1`,
    'i',
  );
  return html.match(pattern)?.[2] ?? null;
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

/**
 * nginx answers every unknown address with this file and status 404. It must
 * be the rendered "not found" page and stay out of the index — a copy of the
 * start page here would be the soft 404 it replaced (decision 0029).
 */
function checkNotFound(html, siteUrl) {
  const errors = [];
  if (metaContent(html, 'name', 'robots') !== 'noindex,follow') {
    errors.push('meta[robots] must be noindex,follow');
  }
  if (linkHref(html, 'canonical') === new URL('/', siteUrl).toString()) {
    errors.push('canonical points at the start page — not the not-found page');
  }
  if (!rootIsPopulated(html)) {
    errors.push('#root is empty — the page was not actually prerendered');
  }
  if (/localhost|127\.0\.0\.1/.test(html)) {
    errors.push('preview origin leaked into the output (localhost URLs)');
  }
  return errors;
}

/**
 * The legal pages an image may forward when it starts (decision 0048): drawn
 * as forwarding pages, `noindex`, linking to the placeholder the start script
 * replaces, without a word of klassenplan.de's own pages — and the bundle
 * still holds that placeholder for the script to find.
 */
async function checkForwardingPages(entries, siteUrl) {
  const forwarded = getForwardedLegalRoutes();
  const legal = entries.filter(
    (entry) =>
      Object.hasOwn(LEGAL_PAGE_URL_TOKENS, entry.basePath) &&
      !forwarded.has(entry.basePath),
  );
  const failures = [];
  for (const entry of legal) {
    const file = path.join(
      '.instance',
      'forward',
      outputFileFor(entry.localizedPath),
    );
    let html;
    try {
      html = await fs.readFile(path.resolve(distDir, file), 'utf-8');
    } catch {
      failures.push(`${file}\n    - file missing`);
      continue;
    }
    const errors = checkEntry(html, { ...entry, noindex: true }, siteUrl);
    if (!html.includes(LEGAL_PAGE_URL_TOKENS[entry.basePath])) {
      errors.push("no link to the operator's page (placeholder missing)");
    }
    if (html.includes(DEFAULT_CONTACT_EMAIL)) {
      errors.push("carries klassenplan.de's own legal page");
    }
    if (errors.length > 0) {
      failures.push(`${file}\n    - ${errors.join('\n    - ')}`);
    }
  }

  if (legal.length > 0) {
    const scripts = (await fs.readdir(distDir, { recursive: true })).filter(
      (file) => file.endsWith('.js'),
    );
    const bundle = (
      await Promise.all(
        scripts.map((file) => fs.readFile(path.join(distDir, file), 'utf-8')),
      )
    ).join('\n');
    for (const entry of legal) {
      const token = LEGAL_PAGE_URL_TOKENS[entry.basePath];
      if (!bundle.includes(token)) {
        failures.push(
          `bundle\n    - ${token} missing: an image start could not set ${entry.basePath}`,
        );
      }
    }
  }

  try {
    await fs.access(path.resolve(distDir, '.instance', 'build.env'));
  } catch {
    failures.push('.instance/build.env\n    - file missing');
  }
  return [...new Set(failures)];
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

  try {
    const html = await fs.readFile(
      path.resolve(distDir, NOT_FOUND_FILE),
      'utf-8',
    );
    const errors = checkNotFound(html, siteUrl);
    if (errors.length > 0) {
      failures.push(`${NOT_FOUND_FILE}\n    - ${errors.join('\n    - ')}`);
    }
  } catch {
    failures.push(`${NOT_FOUND_FILE}\n    - file missing`);
  }

  failures.push(...(await checkForwardingPages(entries, siteUrl)));

  if (failures.length > 0) {
    logError(
      'Prerender verification failed',
      { failedPages: failures.length, totalPages: entries.length + 1 },
      SOURCE,
    );
    for (const failure of failures) {
      logError(`  ${failure}`, undefined, SOURCE);
    }
    process.exitCode = 1;
    return;
  }

  logInfo(
    'Prerender verified',
    { pages: entries.length, notFound: NOT_FOUND_FILE, siteUrl },
    SOURCE,
  );
}

run().catch((error) => {
  const context =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { detail: String(error) };
  logError('Prerender verification crashed', context, SOURCE);
  process.exitCode = 1;
});
