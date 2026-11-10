// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/**
 * How the app moves: three curves and the few durations that use them.
 *
 * Motion is kept to the places where something changes its place or comes in
 * from an edge — the names after a mix, a drawer, a column, a menu, a layer,
 * the turn of the frame, a toast, the logo, the tour's coach mark. Everything
 * else stands still. Every one of them runs on the Web Animations API, which
 * the global reduced-motion guard in `index.css` cannot reach, so each asks
 * `motionEnabled` first; jsdom has no `Element.animate` and gets the instant
 * behaviour the tests expect.
 */

/** The curves: coming in, going out, and moving from one place to another. */
export const MOTION_EASE = {
  arrive: 'cubic-bezier(0.16, 1, 0.3, 1)',
  leave: 'cubic-bezier(0.4, 0, 1, 1)',
  settle: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
} as const;

/** Durations in milliseconds; going out is quicker than coming in. */
export const MOTION_DURATION = {
  menuIn: 140,
  menuOut: 100,
  drawerIn: 220,
  drawerOut: 160,
  sheetIn: 260,
  sheetOut: 180,
  column: 220,
  layer: 180,
  /** A coach mark of the tour on the way to the next one: ring and card. */
  coachMark: 280,
  /** A student on the way to another seat or place. */
  seatGlide: 420,
  /** The logo pointed at: the mark builds its K, the word's letters swap. */
  brandHover: 1280,
} as const;

/**
 * Whether to animate at all: the browser can (`animate` on the element given,
 * or on every element) and the teacher has not asked to reduce motion.
 */
export function motionEnabled(element?: Element | null): boolean {
  const canAnimate = element
    ? typeof element.animate === 'function'
    : typeof Element !== 'undefined' &&
      typeof Element.prototype.animate === 'function';
  if (!canAnimate) return false;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
    return true;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * When a layer's stand-in last gave way to the layer (`performance.now()`).
 * What the layer changes as it draws for the first time — the inspector's
 * column folding away beside the card that asks for a class — belongs to that
 * first drawing, and nothing moves on a first drawing.
 */
let layerArrivedAt = Number.NEGATIVE_INFINITY;

/** Longer than the commits a layer's first drawing takes, shorter than a tap. */
const FIRST_DRAWING_MS = 100;

/** Called by a layer's skeleton as it gives way. */
export function noteLayerArrived(): void {
  layerArrivedAt = performance.now();
}

/** Whether a change belongs to the first drawing of a layer just arrived. */
export function isLayerArriving(): boolean {
  return performance.now() - layerArrivedAt < FIRST_DRAWING_MS;
}

/** What makes an element reachable or named; a copy to look at has none. */
const LIVE_ATTRIBUTES = [
  'id',
  'tabindex',
  'role',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-pressed',
  'aria-expanded',
  'aria-controls',
  'data-tour',
];

/**
 * A copy of an element that is only looked at, for the moment it moves where
 * the real one no longer stands: no ids to clash, no focus, no name for a
 * screen reader, no pointer. `attributes` are stripped as well.
 */
export function inertCopy<T extends Element>(
  element: T,
  attributes: readonly string[] = [],
): T {
  const copy = element.cloneNode(true) as T;
  for (const part of [copy, ...copy.querySelectorAll('*')]) {
    for (const name of [...LIVE_ATTRIBUTES, ...attributes]) {
      part.removeAttribute(name);
    }
  }
  copy.setAttribute('aria-hidden', 'true');
  copy.setAttribute('inert', '');
  if (copy instanceof HTMLElement || copy instanceof SVGElement) {
    copy.style.pointerEvents = 'none';
  }
  return copy;
}
