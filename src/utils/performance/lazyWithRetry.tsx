// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { lazy, useState } from 'react';
import type { ComponentProps, ComponentType } from 'react';
import { logWarn } from '@/utils';

/**
 * sessionStorage flag that records that we already forced a reload to recover
 * from a failed chunk import. Prevents an endless reload loop when the chunk is
 * genuinely unavailable (rather than just stale in the client cache).
 */
const RELOAD_FLAG = 'kp-chunk-reload';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

export type PreloadableComponent<T extends AnyComponent> = ComponentType<
  ComponentProps<T>
> & {
  /** Load the chunk ahead of render. Resolves even when the import fails. */
  preload: () => Promise<void>;
};

/**
 * Detect the "failed dynamic import" class of errors raised by browsers when a
 * lazily-loaded chunk cannot be fetched or parsed. Messages differ per engine:
 *
 * - Chrome/Edge: "Failed to fetch dynamically imported module"
 * - Safari/iOS (incl. in-app browsers): "Importing a module script failed"
 * - Firefox: "error loading dynamically imported module"
 */
function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /dynamically imported module|module script failed|importing a module/i.test(
    message,
  );
}

/**
 * Import the chunk, recovering once from a stale-chunk failure.
 *
 * After a deploy, content-hashed chunk filenames change. A client holding a
 * stale `index.html` (e.g. an aggressively caching in-app browser) requests
 * chunks that no longer exist and the dynamic import rejects. We force a single
 * cache-busting reload so the browser fetches a fresh `index.html` with valid
 * chunk references. If the import still fails afterwards, we surface the error
 * to the nearest error boundary instead of reloading again.
 */
async function importWithRecovery<T extends AnyComponent>(
  factory: () => Promise<{ default: T }>,
): Promise<{ default: T }> {
  try {
    const component = await factory();
    // A clean load means any earlier recovery succeeded; clear the flag so a
    // future stale deploy can trigger its own one-shot reload.
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(RELOAD_FLAG);
    }
    return component;
  } catch (error) {
    if (typeof window === 'undefined' || !isChunkLoadError(error)) {
      throw error;
    }

    const alreadyReloaded =
      window.sessionStorage.getItem(RELOAD_FLAG) === 'true';
    if (alreadyReloaded) {
      // The fresh index.html still could not load the chunk - give up and let
      // the error boundary handle it rather than looping.
      throw error;
    }

    logWarn(
      'Failed to load route chunk; reloading once to recover',
      { error },
      'lazyWithRetry',
    );
    window.sessionStorage.setItem(RELOAD_FLAG, 'true');

    // Cache-bust the entry document so a stale, immutably-cached index.html is
    // not served from the HTTP cache on reload.
    const url = new URL(window.location.href);
    url.searchParams.set('reload', Date.now().toString());
    window.location.replace(url.toString());

    // Keep Suspense in its fallback while the reload navigation happens.
    return new Promise<{ default: T }>(() => {});
  }
}

/**
 * Drop-in replacement for `React.lazy` that recovers from stale-chunk failures
 * and renders synchronously once `preload()` has resolved.
 *
 * The synchronous path matters for prerendered pages: `React.lazy` suspends on
 * its first render even when the module already sits in the ESM cache, because
 * it only reads the settled promise on a later microtask. That single suspend
 * swaps the prerendered markup for the loading skeleton — a visible flash and a
 * large layout shift. Rendering the cached module directly avoids both.
 */
export function lazyWithRetry<T extends AnyComponent>(
  factory: () => Promise<{ default: T }>,
): PreloadableComponent<T> {
  let resolved: T | null = null;

  const Lazy = lazy(async () => {
    const component = await importWithRecovery(factory);
    resolved = component.default;
    return component;
  });

  function RouteComponent(props: ComponentProps<T>) {
    // Captured once per mount: swapping the element type between the resolved
    // component and the lazy wrapper mid-life would remount the subtree and
    // throw away its state.
    const [Resolved] = useState(() => resolved);
    return Resolved ? <Resolved {...props} /> : <Lazy {...props} />;
  }

  RouteComponent.preload = async (): Promise<void> => {
    if (resolved) {
      return;
    }
    try {
      // Deliberately not importWithRecovery: a background prefetch must never
      // navigate the page. On failure the lazy path stays in charge and runs
      // its own recovery when the route is actually rendered.
      resolved = (await factory()).default;
    } catch (error) {
      logWarn('Failed to preload route chunk', { error }, 'lazyWithRetry');
    }
  };

  return RouteComponent as PreloadableComponent<T>;
}

export default lazyWithRetry;
