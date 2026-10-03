// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { logWarn } from '@/utils';
import { getToastMessage, showToast } from '@/utils/ui/toast';

/**
 * Loading the parts of the app that are fetched on demand — a dialog, the
 * lower half of a menu, a page — without taking the page down when the fetch
 * fails.
 *
 * The service worker precaches every chunk, so this only happens where it does
 * not serve the page: an origin without HTTPS, a private window, a browser
 * that blocks service workers, or a stale deployment. Offline, such a chunk
 * cannot be had at all, and reloading the page would leave the app for the
 * browser's own offline page.
 */

/**
 * Detect the "failed dynamic import" class of errors raised by browsers when a
 * lazily-loaded chunk cannot be fetched or parsed. Messages differ per engine:
 *
 * - Chrome/Edge: "Failed to fetch dynamically imported module"
 * - Safari/iOS (incl. in-app browsers): "Importing a module script failed"
 * - Firefox: "error loading dynamically imported module"
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /dynamically imported module|module script failed|importing a module/i.test(
    message,
  );
}

/** Whether the browser reports that it has no connection. */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * A page's chunk that could not be fetched while the browser was offline.
 * `RouteOfflineBoundary` shows a notice for it instead of the error screen,
 * whose "reload" would lead to the browser's offline page.
 */
export class OfflineChunkError extends Error {
  constructor(cause: unknown) {
    super('A part of the app could not be loaded while offline', { cause });
    this.name = 'OfflineChunkError';
  }
}

/** One message however many parts failed at once. */
const CHUNK_TOAST_ID = 'chunk-load';

/**
 * Tells the teacher that what they asked for could not be loaded. Offline it
 * says so and asks them to try again once they are back online; online the
 * chunk is most likely gone after a deployment, and a reload brings the
 * current one.
 */
export function reportChunkLoadFailure(error: unknown, context: string): void {
  logWarn('Could not load a part of the app', { error }, context);
  if (isOffline()) {
    showToast('error', 'toast:errors.chunkOffline', { id: CHUNK_TOAST_ID });
    return;
  }
  showToast('error', 'toast:errors.chunkFailed', {
    id: CHUNK_TOAST_ID,
    action: {
      label: getToastMessage('common:common.reloadPage'),
      onClick: () => window.location.reload(),
    },
  });
}

export interface OnDemandModule<M> {
  /** The module once it has loaded, else `null`. */
  get: () => M | null;
  /**
   * Loads it while nobody is waiting for it, so it is there should the
   * connection drop later. A failure is only logged.
   */
  preload: () => void;
  /**
   * Loads it for something the teacher just asked for. Rejects when the chunk
   * cannot be fetched — pass the error to {@link reportChunkLoadFailure}. A
   * failed load is forgotten, so the next request tries again.
   */
  load: () => Promise<M>;
}

/**
 * A module fetched on first use rather than with the app. Unlike `React.lazy`,
 * whose rejection reaches the nearest error boundary and takes the layer
 * around it down, the caller decides what a failure means: a dialog does not
 * open and a message says why.
 */
export function loadOnDemand<M>(
  factory: () => Promise<M>,
  context: string,
): OnDemandModule<M> {
  let loaded: M | null = null;
  let pending: Promise<M> | null = null;

  const load = (): Promise<M> => {
    if (loaded) {
      return Promise.resolve(loaded);
    }
    pending ??= factory().then(
      (module) => {
        loaded = module;
        pending = null;
        return module;
      },
      (error: unknown) => {
        pending = null;
        throw error;
      },
    );
    return pending;
  };

  const preload = (): void => {
    load().catch((error: unknown) => {
      logWarn('Preloading a part of the app failed', { error }, context);
    });
  };

  return { get: () => loaded, preload, load };
}
