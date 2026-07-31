// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useSyncExternalStore } from 'react';

/**
 * Single source of truth for JS-side breakpoints, mirroring Tailwind's default
 * scale. Layout decisions made in JS have to line up with the ones the CSS
 * makes, so no component may invent its own pixel threshold.
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type BreakpointName = keyof typeof BREAKPOINTS;

// Desktop-first default: matches the dominant case and avoids a layout flash
// for desktop users; touch/phone clients correct on the first measurement.
const SERVER_WIDTH = BREAKPOINTS.xl;

const listeners = new Set<() => void>();
let cachedWidth = typeof window === 'undefined' ? SERVER_WIDTH : -1;

function readWidth(): number {
  // `innerWidth` (not `visualViewport.width`) is what CSS media queries resolve
  // against — the visual viewport shrinks with the on-screen keyboard.
  return typeof window === 'undefined'
    ? SERVER_WIDTH
    : (window.innerWidth ?? SERVER_WIDTH);
}

function handleResize(): void {
  const next = readWidth();
  if (next === cachedWidth) {
    return;
  }
  cachedWidth = next;
  listeners.forEach((listener) => listener());
}

// One shared resize listener for all consumers instead of one per hook call.
function subscribe(listener: () => void): () => void {
  if (listeners.size === 0 && typeof window !== 'undefined') {
    cachedWidth = readWidth();
    window.addEventListener('resize', handleResize);
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize);
    }
  };
}

function getWidth(): number {
  if (cachedWidth < 0) {
    cachedWidth = readWidth();
  }
  return cachedWidth;
}

/**
 * Returns whether the viewport is at least the given breakpoint (`min-width`),
 * matching the semantics of the equally named Tailwind prefix.
 */
export function useBreakpointUp(name: BreakpointName): boolean {
  const minWidth = BREAKPOINTS[name];
  const getMatch = useCallback(() => getWidth() >= minWidth, [minWidth]);
  const getServerMatch = useCallback(
    () => SERVER_WIDTH >= minWidth,
    [minWidth],
  );

  return useSyncExternalStore(subscribe, getMatch, getServerMatch);
}

/**
 * Returns whether the viewport is below the given breakpoint — the exact
 * complement of {@link useBreakpointUp}, i.e. a Tailwind `max-*` variant.
 */
export function useBreakpointDown(name: BreakpointName): boolean {
  return !useBreakpointUp(name);
}
