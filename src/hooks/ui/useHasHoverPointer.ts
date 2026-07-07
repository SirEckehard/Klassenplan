// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useState } from 'react';

// A device that can actually hover: mouse/trackpad, not touch or stylus.
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

const getInitialMatch = (): boolean => {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    // Without matchMedia (jsdom/SSR) assume no hover capability so
    // hover-revealed controls stay permanently visible — the safe default.
    return false;
  }
  return window.matchMedia(HOVER_QUERY).matches;
};

/**
 * Returns whether the primary pointer supports hovering (mouse/trackpad).
 *
 * Used to gate hover-revealed controls (e.g. the seat-lock icon): on touch
 * devices there is no hover, so those controls must remain always visible.
 * Reads `matchMedia` synchronously for the initial value to avoid a flash.
 */
export function useHasHoverPointer(): boolean {
  const [hasHover, setHasHover] = useState<boolean>(getInitialMatch);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }

    const mediaQuery = window.matchMedia(HOVER_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setHasHover(event.matches);
    };

    // Initial value is read synchronously in useState; only subscribe here.
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return hasHover;
}
