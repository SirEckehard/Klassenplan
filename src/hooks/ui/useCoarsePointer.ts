// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useSyncExternalStore } from 'react';

/**
 * Whether the primary pointer is a finger rather than a mouse.
 *
 * Hit areas used to be derived from the viewport width, which conflated two
 * unrelated questions. A tablet in landscape is 1180px wide and was handed
 * mouse-sized targets although every tap is a fingertip — and landscape is the
 * likely orientation for setting up a classroom. Width decides the *layout*
 * (see `useLayoutMode`), the pointer decides how big things have to be to hit.
 *
 * Mirrors the `pointer-coarse:` variant already used in the markup, so CSS and
 * JS answer the same question the same way.
 */
const QUERY = '(pointer: coarse)';

const listeners = new Set<() => void>();
let mediaQuery: MediaQueryList | null = null;

const supportsMatchMedia = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

const getMediaQuery = (): MediaQueryList | null => {
  if (!supportsMatchMedia()) {
    return null;
  }
  mediaQuery ??= window.matchMedia(QUERY);
  return mediaQuery;
};

const notify = (): void => {
  listeners.forEach((listener) => listener());
};

// One shared listener for all consumers instead of one per hook call.
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

// Server default matches `useBreakpoint`'s desktop-first stance: a fine pointer
// is the safe assumption, and a touch client corrects on first measurement.
function getServerSnapshot(): boolean {
  return false;
}

export function useIsCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
