// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/**
 * How a toast moves: it glides in from the right while the older ones make
 * room, and glides back out before the stack closes up behind it.
 *
 * The Web Animations API rather than CSS keyframes, because the stack closes
 * up by a measured height, and because `animation.finished` tells the
 * provider when a card may leave the DOM. The global reduced-motion guard in
 * `index.css` only reaches CSS animations, so `toastMotionEnabled` asks the
 * media query itself — and jsdom, which has no `Element.animate`, gets the
 * instant behaviour the tests expect.
 */

const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EASE_IN = 'cubic-bezier(0.4, 0, 1, 1)';
const SETTLE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/** How far a card travels on its way in and out. */
const SLIDE_PX = 28;

export function toastMotionEnabled(): boolean {
  if (
    typeof Element === 'undefined' ||
    typeof Element.prototype.animate !== 'function'
  ) {
    return false;
  }
  if (typeof window.matchMedia !== 'function') return true;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The room a card takes in the stack: its own height and the gap after it. */
function stackSpace(card: HTMLElement): number {
  const stack = card.parentElement;
  const gap = stack ? Number.parseFloat(getComputedStyle(stack).rowGap) : 0;
  return card.offsetHeight + (Number.isFinite(gap) ? gap : 0);
}

/**
 * A new card starts with a negative bottom margin of its own size, so the
 * cards below begin where they were and glide down as it grows to zero.
 */
export function animateToastIn(card: HTMLElement): void {
  card.animate(
    [{ marginBottom: `${-stackSpace(card)}px` }, { marginBottom: '0px' }],
    { duration: 380, easing: EASE_OUT },
  );
  card.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 200,
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
  });
  card.animate(
    [{ transform: `translateX(${SLIDE_PX}px)` }, { transform: 'none' }],
    { duration: 380, easing: EASE_OUT },
  );
}

/**
 * The card glides out — from where the finger left it after a swipe — and
 * the cards below close the gap once it has nearly faded.
 */
export function animateToastOut(
  card: HTMLElement,
  swipedBy?: number,
): Promise<void> {
  const space = stackSpace(card);
  const swiped = swipedBy !== undefined;
  const leave = swiped
    ? card.animate(
        [
          {
            transform: `translateX(${swipedBy}px)`,
            opacity: getComputedStyle(card).opacity,
          },
          { transform: `translateX(${card.offsetWidth + 40}px)`, opacity: 0 },
        ],
        { duration: 180, easing: EASE_IN, fill: 'forwards' },
      )
    : card.animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: `translateX(${SLIDE_PX}px)`, opacity: 0 },
        ],
        { duration: 200, easing: EASE_IN, fill: 'forwards' },
      );
  const collapse = card.animate(
    [{ marginBottom: '0px' }, { marginBottom: `${-space}px` }],
    {
      duration: 280,
      delay: swiped ? 100 : 140,
      easing: SETTLE,
      fill: 'forwards',
    },
  );
  return Promise.all([leave.finished, collapse.finished]).then(() => undefined);
}

/** A swipe let go too early: the card settles back into its place. */
export function animateToastBack(
  card: HTMLElement,
  from: { offset: number; opacity: string },
): void {
  card.animate(
    [
      { transform: `translateX(${from.offset}px)`, opacity: from.opacity },
      { transform: 'none', opacity: 1 },
    ],
    { duration: 260, easing: EASE_OUT },
  );
}

/** The same message again: the card that shows it nudges instead of doubling. */
export function animateToastNudge(card: HTMLElement): void {
  card.animate(
    [
      { transform: 'none' },
      { transform: 'scale(1.03)' },
      { transform: 'none' },
    ],
    { duration: 280, easing: 'cubic-bezier(0.3, 0, 0.3, 1)' },
  );
}
