// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { logDebug, logWarn } from '@/utils';
import { isOffline } from '@/utils/performance/chunkLoad';

/**
 * Written by the build (`klassenplan:offline-file-list` in vite.config.ts):
 * every chunk, worker, stylesheet and font of this version.
 */
const OFFLINE_FILE_LIST = 'offline-files.json';

/** Files in flight at once: done soon, yet the connection stays the page's. */
const CONCURRENCY = 4;

const CONTEXT = 'offlineWarmup';

let started = false;

/**
 * Whether this page can have a service worker at all. Browsers allow one only
 * in a secure context — HTTPS or `localhost` — so an instance served over
 * plain HTTP, a school's intranet say, never gets one, and some browsers keep
 * them out of private windows.
 */
export function canHaveServiceWorker(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext === true &&
    'serviceWorker' in navigator
  );
}

/**
 * Loads every file of this version into the browser's HTTP cache.
 *
 * The service worker precaches the app, so it works offline as a whole. Where
 * there is none, only what the teacher had already opened would: the
 * neighbourhoods, the export, the class tools, English — anything not loaded
 * yet failed once the connection dropped. The files carry a content hash and
 * nginx serves them as immutable, so the cache answers for them without the
 * network, in this session and the next.
 *
 * A file that fails is skipped; going offline ends the run.
 */
export async function warmOfflineFiles(): Promise<void> {
  const base = import.meta.env.BASE_URL;
  // The list changes with every deployment while its name does not.
  const response = await fetch(`${base}${OFFLINE_FILE_LIST}`, {
    cache: 'no-cache',
  });
  if (!response.ok) {
    logDebug('No offline file list', { status: response.status }, CONTEXT);
    return;
  }
  const listed: unknown = await response.json();
  if (!Array.isArray(listed)) {
    return;
  }

  const queue = listed.filter(
    (file): file is string => typeof file === 'string',
  );
  const total = queue.length;
  let failed = 0;

  const drain = async (): Promise<void> => {
    for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
      if (isOffline()) {
        return;
      }
      try {
        const fileResponse = await fetch(`${base}${file}`, {
          priority: 'low',
        });
        // The cache keeps a response only once its body has been read.
        await fileResponse.arrayBuffer();
        if (!fileResponse.ok) {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, drain));
  logDebug('Cached the app for offline use', { total, failed }, CONTEXT);
}

/**
 * Starts {@link warmOfflineFiles} once per page, in a production build (only
 * a build writes the list). Called where no service worker can serve the
 * page: at start when the page cannot have one, and when registering one
 * fails.
 */
export function startOfflineWarmup(): void {
  if (started || !import.meta.env.PROD) {
    return;
  }
  started = true;
  warmOfflineFiles().catch((error: unknown) => {
    logWarn('Caching the app for offline use failed', { error }, CONTEXT);
  });
}
