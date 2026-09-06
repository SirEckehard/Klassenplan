// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useSyncExternalStore } from 'react';

/**
 * Whether the operating system asks for reduced motion.
 *
 * Anything that moves on its own — the hero carousel, a programmatic scroll —
 * has to honour this, so both read the same media query through one shared
 * listener instead of each keeping its own.
 */
const QUERY = '(prefers-reduced-motion: reduce)';

const listeners = new Set<() => void>();
let mediaQuery: MediaQueryList | null = null;

const getMediaQuery = (): MediaQueryList | null => {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return null;
  }
  mediaQuery ??= window.matchMedia(QUERY);
  return mediaQuery;
};

const notify = (): void => {
  listeners.forEach((listener) => listener());
};

function subscribe(listener: () => void): () => void {
  const query = getMediaQuery();
  if (query && listeners.size === 0) {
    query.addEventListener('change', notify);
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (query && listeners.size === 0) {
      query.removeEventListener('change', notify);
    }
  };
}

function getSnapshot(): boolean {
  return getMediaQuery()?.matches ?? false;
}

// No motion preference is knowable on the server; full motion is the browser
// default and a client that asks for less corrects on first measurement.
function getServerSnapshot(): boolean {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
