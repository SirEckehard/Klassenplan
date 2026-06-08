// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logError, logInfo, logWarn } from './utils/logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.resolve(projectRoot, 'public');
const sitemapPath = path.resolve(publicDir, 'sitemap.xml');

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

function getSiteUrl() {
  const fromEnv = process.env.SITE_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  return 'https://klassenplan.de';
}

/**
 * Extract every <loc> entry from the generated sitemap so we ping exactly the
 * URLs we publish (DE + EN).
 */
async function readSitemapUrls() {
  const xml = await fs.readFile(sitemapPath, 'utf-8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  return [...new Set(locs)];
}

/**
 * IndexNow requires the key to be verifiable at a public URL. By default we
 * host it at <site>/<key>.txt; ensure that file exists in public/ so the next
 * deploy serves it.
 */
async function ensureKeyFile(key) {
  const keyFilePath = path.resolve(publicDir, `${key}.txt`);
  try {
    await fs.access(keyFilePath);
  } catch {
    await fs.writeFile(keyFilePath, key, 'utf-8');
    logInfo('IndexNow key file created', { keyFilePath }, 'indexnow');
  }
  return keyFilePath;
}

async function ping() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    logWarn(
      'INDEXNOW_KEY not set; skipping IndexNow ping. Generate a key (32+ hex ' +
        'chars), set it as INDEXNOW_KEY, and host it at <site>/<key>.txt.',
      {},
      'indexnow',
    );
    return;
  }

  const siteUrl = getSiteUrl();
  const host = new URL(siteUrl).host;
  const keyLocation =
    process.env.INDEXNOW_KEY_LOCATION || `${siteUrl}/${key}.txt`;

  await ensureKeyFile(key);

  const urlList = await readSitemapUrls();
  if (urlList.length === 0) {
    logWarn('No URLs found in sitemap; nothing to submit', {}, 'indexnow');
    return;
  }

  const body = { host, key, keyLocation, urlList };
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });

  // IndexNow returns 200 (accepted) or 202 (accepted, pending validation).
  if (response.ok || response.status === 202) {
    logInfo(
      'IndexNow ping submitted',
      { status: response.status, urls: urlList.length, host },
      'indexnow',
    );
    return;
  }

  const text = await response.text().catch(() => '');
  throw new Error(
    `IndexNow ping failed: ${response.status} ${response.statusText} ${text}`.trim(),
  );
}

ping().catch((error) => {
  const errorContext =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { detail: String(error) };
  logError('Failed to ping IndexNow', errorContext, 'indexnow');
  process.exitCode = 1;
});
