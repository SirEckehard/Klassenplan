// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// Bundle size budgets for dist/.
//
// Vite's `chunkSizeWarningLimit` only looks at individual chunks, prints a
// warning nobody fails on, and says nothing about what a first visit actually
// costs. This script measures the real numbers instead:
//
//   - initial payload: the entry script plus every chunk index.html preloads,
//     i.e. what a cold visitor downloads before the app renders
//   - largest chunk: the worst single lazy chunk
//   - css: the stylesheet total
//
// Budgets are stated in brotli bytes (what goes over the wire) and raw bytes
// (what the browser has to parse). Both are checked. Run after `npm run build`.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { logError, logInfo, logWarn } from './utils/logger.mjs';

const SOURCE = 'check-bundle';
const distDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'dist',
);

const KB = 1024;

/**
 * Headroom is deliberately tight (roughly +12 % over the measured size at the
 * time of writing, 2026-08-01). A budget nobody ever hits is a budget nobody
 * maintains — when one of these fails, either the growth is justified and the
 * number moves in the same commit, or it isn't and the import gets fixed.
 *
 * For context on the initial payload (223 KB brotli over 64 files): about
 * 86 KB of that is react-dom plus the German i18n bundle, neither of which can
 * be deferred — react-dom renders the first frame and German is the fallback
 * language. Roughly 33 KB is generator-only code (class management, seating
 * statistics, storage history) that the start page pulls in through the
 * footer's data-management menu; deferring it means untangling the provider
 * import graph, which belongs to the R1/R2 state-architecture work.
 */
const BUDGETS = {
  initial: { raw: 900 * KB, brotli: 250 * KB },
  largestChunk: { raw: 330 * KB, brotli: 78 * KB },
  css: { raw: 200 * KB, brotli: 24 * KB },
};

const formatKb = (bytes) => `${(bytes / KB).toFixed(1)} KB`;

const brotliSize = (buffer) =>
  brotliCompressSync(buffer, {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
  }).length;

async function measure(relativePath) {
  const buffer = await fs.readFile(path.join(distDir, relativePath));
  return { raw: buffer.length, brotli: brotliSize(buffer) };
}

/** Entry script + every modulepreload in index.html — the cold-start payload. */
function initialAssetsFrom(html) {
  const assets = new Set();

  const entry = html.match(/<script[^>]*\bsrc="([^"]+\.js)"/i);
  if (entry) assets.add(entry[1]);

  for (const match of html.matchAll(
    /<link[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"/gi,
  )) {
    assets.add(match[1]);
  }

  return [...assets].map((href) => href.replace(/^\//, ''));
}

function stylesheetsFrom(html) {
  return [
    ...html.matchAll(/<link[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/gi),
  ].map((match) => match[1].replace(/^\//, ''));
}

async function allChunks() {
  const chunkDir = path.join(distDir, 'chunks');
  const names = await fs.readdir(chunkDir).catch(() => []);
  return names.filter((name) => name.endsWith('.js')).map((n) => `chunks/${n}`);
}

function check(results, label, budget, detail) {
  const overRaw = results.raw > budget.raw;
  const overBrotli = results.brotli > budget.brotli;
  const context = {
    raw: formatKb(results.raw),
    rawBudget: formatKb(budget.raw),
    brotli: formatKb(results.brotli),
    brotliBudget: formatKb(budget.brotli),
    ...detail,
  };

  if (overRaw || overBrotli) {
    logError(`${label} exceeds its budget`, context, SOURCE);
    return false;
  }

  logInfo(`${label} within budget`, context, SOURCE);
  return true;
}

async function run() {
  let html;
  try {
    html = await fs.readFile(path.join(distDir, 'index.html'), 'utf-8');
  } catch {
    logError(
      'dist/index.html not found — run `npm run build` first',
      undefined,
      SOURCE,
    );
    process.exitCode = 1;
    return;
  }

  const initialAssets = initialAssetsFrom(html);
  if (initialAssets.length === 0) {
    logError('No entry script found in dist/index.html', undefined, SOURCE);
    process.exitCode = 1;
    return;
  }

  const initial = { raw: 0, brotli: 0 };
  for (const asset of initialAssets) {
    const size = await measure(asset);
    initial.raw += size.raw;
    initial.brotli += size.brotli;
  }

  const cssFiles = stylesheetsFrom(html);
  const css = { raw: 0, brotli: 0 };
  for (const file of cssFiles) {
    const size = await measure(file);
    css.raw += size.raw;
    css.brotli += size.brotli;
  }

  let largest = { name: 'none', raw: 0, brotli: 0 };
  for (const chunk of await allChunks()) {
    const size = await measure(chunk);
    if (size.brotli > largest.brotli) {
      largest = { name: path.basename(chunk), ...size };
    }
  }

  const passed = [
    check(initial, 'Initial payload', BUDGETS.initial, {
      files: initialAssets.length,
    }),
    check(largest, 'Largest chunk', BUDGETS.largestChunk, {
      chunk: largest.name,
    }),
    check(css, 'CSS', BUDGETS.css, { files: cssFiles.length }),
  ];

  if (cssFiles.length === 0) {
    // A build with zero stylesheets is what a silently missing Tailwind plugin
    // used to produce. vite.config.ts now throws instead, so this is a backstop.
    logWarn('Build contains no stylesheet at all', undefined, SOURCE);
    process.exitCode = 1;
    return;
  }

  if (passed.some((ok) => !ok)) {
    logError(
      'Bundle budget check failed — reduce the payload or adjust BUDGETS in scripts/check-bundle.mjs with a reason',
      undefined,
      SOURCE,
    );
    process.exitCode = 1;
  }
}

run().catch((error) => {
  const context =
    error instanceof Error
      ? { name: error.name, message: error.message }
      : { detail: String(error) };
  logError('Bundle budget check crashed', context, SOURCE);
  process.exitCode = 1;
});
