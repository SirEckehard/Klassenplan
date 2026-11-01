// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { MOTION_EASE } from '@/utils/ui/motion';

/**
 * How a toast moves: it rises from the status bar while the older ones make
 * room above it, and sinks back before the stack closes up behind it.
 *
 * The Web Animations API rather than CSS keyframes, because the stack closes
 * up by a measured height, and because `animation.finished` tells the
 * provider when a card may leave the DOM. The curves are the app's own
 * (`utils/ui/motion`), and so is the question whether to move at all.
 *
 * The stack grows upwards from the bar (`flex-col-reverse`): a card's top
 * margin is the side the older cards lie on, so it is the margin that makes
 * room and gives it back.
 */

const EASE_OUT = MOTION_EASE.arrive;
const EASE_IN = MOTION_EASE.leave;
const SETTLE = MOTION_EASE.settle;

/** How far a card travels on its way in and out. */
const RISE_PX = 12;

/** Where a swipe left a card, in px from its place. */
export interface SwipeOffset {
  x: number;
  y: number;
}

/** The room a card takes in the stack: its own height and the gap after it. */
function stackSpace(card: HTMLElement): number {
  const stack = card.parentElement;
  const gap = stack ? Number.parseFloat(getComputedStyle(stack).rowGap) : 0;
  return card.offsetHeight + (Number.isFinite(gap) ? gap : 0);
}

/**
 * A new card starts with a negative top margin of its own size, so the cards
 * above begin where they were and glide up as it grows to zero.
 */
export function animateToastIn(card: HTMLElement): void {
  card.animate(
    [{ marginTop: `${-stackSpace(card)}px` }, { marginTop: '0px' }],
    { duration: 380, easing: EASE_OUT },
  );
  card.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 200,
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
  });
  card.animate(
    [{ transform: `translateY(${RISE_PX}px)` }, { transform: 'none' }],
    { duration: 380, easing: EASE_OUT },
  );
}

/**
 * The card sinks out — or, after a swipe, goes on the way the finger sent
 * it — and the cards above close the gap once it has nearly faded.
 */
export function animateToastOut(
  card: HTMLElement,
  swipedBy?: SwipeOffset,
): Promise<void> {
  const space = stackSpace(card);
  const swiped = swipedBy !== undefined;
  let leave: Animation;
  if (swiped) {
    const sideways = Math.abs(swipedBy.x) >= swipedBy.y;
    const away = sideways
      ? `translateX(${Math.sign(swipedBy.x || 1) * (card.offsetWidth + 40)}px)`
      : `translateY(${card.offsetHeight + 40}px)`;
    leave = card.animate(
      [
        {
          transform: `translate(${swipedBy.x}px, ${swipedBy.y}px)`,
          opacity: getComputedStyle(card).opacity,
        },
        { transform: away, opacity: 0 },
      ],
      { duration: 180, easing: EASE_IN, fill: 'forwards' },
    );
  } else {
    leave = card.animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: `translateY(${RISE_PX}px)`, opacity: 0 },
      ],
      { duration: 200, easing: EASE_IN, fill: 'forwards' },
    );
  }
  const collapse = card.animate(
    [{ marginTop: '0px' }, { marginTop: `${-space}px` }],
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
  from: SwipeOffset & { opacity: string },
): void {
  card.animate(
    [
      {
        transform: `translate(${from.x}px, ${from.y}px)`,
        opacity: from.opacity,
      },
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
