// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useSyncExternalStore } from 'react';

/**
 * Single source of truth for JS-side breakpoints, mirroring Tailwind's default
 * scale. Layout decisions made in JS have to line up with the ones the CSS
 * makes, so no component may invent its own pixel threshold.
 *
 * The steps are in rem, the unit Tailwind's `sm:` … `xl:` variants test
 * (`@media (width >= 48rem)`). A rem in a media query is the browser's default
 * text size, not a fixed 16px: set to 18px, `md` begins at 864px. Comparing
 * the window with 768px instead, JS and CSS disagreed in between — an iPad in
 * portrait got the tablet's toolbar column in a layer the CSS still stacked,
 * with the stage out of sight below it.
 */
const BREAKPOINTS = {
  sm: 40,
  md: 48,
  lg: 64,
  xl: 80,
} as const;

export type BreakpointName = keyof typeof BREAKPOINTS;

/** What a rem is worth where the browser does not say: its usual default. */
const DEFAULT_REM_PX = 16;

// Desktop-first default: matches the dominant case and avoids a layout flash
// for desktop users; touch/phone clients correct on the first measurement.
const SERVER_WIDTH_REM = BREAKPOINTS.xl;

const listeners = new Set<() => void>();
let cachedWidthRem = typeof window === 'undefined' ? SERVER_WIDTH_REM : -1;

/**
 * The px a rem in a media query resolves to: the browser's default text size.
 * The app never sets the root's font size, so the root's computed size is
 * exactly that default.
 */
function readRemPx(): number {
  const size = Number.parseFloat(
    window.getComputedStyle(document.documentElement).fontSize,
  );
  return Number.isFinite(size) && size > 0 ? size : DEFAULT_REM_PX;
}

/** The window's width in rem, the unit the breakpoints are measured in. */
function readWidthRem(): number {
  if (typeof window === 'undefined') {
    return SERVER_WIDTH_REM;
  }
  // `innerWidth` (not `visualViewport.width`) is what CSS media queries resolve
  // against — the visual viewport shrinks with the on-screen keyboard.
  const width = window.innerWidth;
  return width === undefined ? SERVER_WIDTH_REM : width / readRemPx();
}

function handleResize(): void {
  const next = readWidthRem();
  if (next === cachedWidthRem) {
    return;
  }
  cachedWidthRem = next;
  listeners.forEach((listener) => listener());
}

// One shared resize listener for all consumers instead of one per hook call.
function subscribe(listener: () => void): () => void {
  if (listeners.size === 0 && typeof window !== 'undefined') {
    cachedWidthRem = readWidthRem();
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

function getWidthRem(): number {
  if (cachedWidthRem < 0) {
    cachedWidthRem = readWidthRem();
  }
  return cachedWidthRem;
}

/**
 * Whether the viewport is at least the given breakpoint right now, for a
 * decision taken once rather than followed (a starting value).
 */
export function isBreakpointUp(name: BreakpointName): boolean {
  return readWidthRem() >= BREAKPOINTS[name];
}

/**
 * Returns whether the viewport is at least the given breakpoint (`min-width`),
 * matching the semantics of the equally named Tailwind prefix.
 */
export function useBreakpointUp(name: BreakpointName): boolean {
  const minWidth = BREAKPOINTS[name];
  const getMatch = useCallback(() => getWidthRem() >= minWidth, [minWidth]);
  const getServerMatch = useCallback(
    () => SERVER_WIDTH_REM >= minWidth,
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
