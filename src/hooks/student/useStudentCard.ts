// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

/**
 * What a card in the class list explains: one badge of a student (or the
 * badges behind its "+N"), or the whole student.
 */
export type StudentCard =
  | {
      kind: 'badge';
      studentId: string;
      badgeKey: string;
      /** Behind a "+N": the keys it stands for, in reading order. */
      hiddenKeys: string[];
      rect: { left: number; top: number; width: number; height: number };
      /** Opened by a long press: it stays until the next touch. */
      pinned: boolean;
    }
  | {
      kind: 'profile';
      studentId: string;
      rect: { left: number; top: number; width: number; height: number };
      pinned: boolean;
    };

/** A finger held this long without moving opens the card. */
export const LONG_PRESS_MS = 500;
/** The pointer rests this long on a name before its profile opens. */
export const PROFILE_HOVER_MS = 450;
/** A finger that moves farther than this scrolls; it does not press. */
const PRESS_SLOP = 8;

const BADGE_SELECTOR = '[data-card-badge]';
const PROFILE_SELECTOR = '[data-card-profile]';

/** Which kinds of card may open; both unless switched off. */
type CardKinds = { badge: boolean; profile: boolean };
const ALL_KINDS: CardKinds = { badge: true, profile: true };

const boxOf = (element: Element) => {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { left, top, width, height };
};

/**
 * The card an element of a row stands for, if it stands for one and that
 * kind may open. A badge switched off opens nothing, not the profile around
 * it either.
 */
function cardFor(
  target: EventTarget | null,
  pinned: boolean,
  kinds: CardKinds,
) {
  if (!(target instanceof Element)) return null;
  const badge = target.closest(BADGE_SELECTOR);
  if (badge) {
    if (!kinds.badge) return null;
    const hidden = badge.getAttribute('data-card-hidden');
    return {
      kind: 'badge',
      studentId: badge.getAttribute('data-card-student') ?? '',
      badgeKey: badge.getAttribute('data-card-badge') ?? '',
      hiddenKeys: hidden ? hidden.split(' ') : [],
      rect: boxOf(badge),
      pinned,
    } satisfies StudentCard;
  }
  const profile = target.closest(PROFILE_SELECTOR);
  if (profile && kinds.profile) {
    return {
      kind: 'profile',
      studentId: profile.getAttribute('data-card-profile') ?? '',
      rect: boxOf(profile),
      pinned,
    } satisfies StudentCard;
  }
  return null;
}

const sameCard = (a: StudentCard | null, b: StudentCard | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.kind === b.kind &&
    a.studentId === b.studentId &&
    a.pinned === b.pinned &&
    (a.kind === 'profile' ||
      (b.kind === 'badge' && a.badgeKey === b.badgeKey)));

/**
 * The card the class list shows over a student's badges or name.
 *
 * A mouse or a pen hovers: a badge explains itself at once, as on a seat,
 * and a name after a moment, so a pointer crossing the list does not flash
 * a profile over every row it passes. A finger holds: a long press on a
 * badge or a name opens its card and keeps it until the next touch, a
 * scroll or Escape, and the press does not also open the row. The rows
 * mark what explains itself with `data-card-badge` (with
 * `data-card-student`, and `data-card-hidden` behind a "+N") and
 * `data-card-profile`. `kinds` leaves either kind closed, by a mouse and a
 * finger alike, as the seats' tooltip is (`useStudentCardSettings`).
 * `touch: false` leaves the finger out: a long press opens nothing and the
 * press is the row's, where the row unfolds the same in words (the class
 * list below `lg`, decision 0051).
 *
 * `root` is the element itself, which the caller keeps in state through a
 * callback ref, not a ref object: a list that is drawn only once it has
 * students — a class just created, a class switched to from an empty one —
 * gets its element after the first render, and a ref's change starts no
 * effect, so the cards stayed closed there until a reload.
 */
export function useStudentCard(
  root: HTMLElement | null,
  {
    enabled = true,
    kinds = ALL_KINDS,
    touch = true,
  }: { enabled?: boolean; kinds?: CardKinds; touch?: boolean } = {},
): { card: StudentCard | null; dismiss: () => void } {
  const [card, setCard] = React.useState<StudentCard | null>(null);
  const cardRef = React.useRef<StudentCard | null>(null);
  const update = React.useCallback((next: StudentCard | null) => {
    if (sameCard(cardRef.current, next)) return;
    cardRef.current = next;
    setCard(next);
  }, []);
  const dismiss = React.useCallback(() => update(null), [update]);
  const { badge: badgeCards, profile: profileCards } = kinds;

  React.useEffect(() => {
    const allowed: CardKinds = { badge: badgeCards, profile: profileCards };
    // A card of a kind just switched off goes with it.
    if (cardRef.current && !allowed[cardRef.current.kind]) update(null);
    if (!root || !enabled || (!badgeCards && !profileCards)) return undefined;

    let profileTimer = 0;
    let pressTimer = 0;
    let press: { x: number; y: number } | null = null;
    // The click that ends a long press would open the row under the card.
    let swallowClick = false;

    const clearProfileTimer = () => window.clearTimeout(profileTimer);
    const cancelPress = () => {
      window.clearTimeout(pressTimer);
      press = null;
    };

    const handleOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const found = cardFor(event.target, false, allowed);
      clearProfileTimer();
      if (!found) {
        if (!cardRef.current?.pinned) update(null);
        return;
      }
      if (found.kind === 'badge') {
        update(found);
        return;
      }
      if (
        cardRef.current?.kind === 'profile' &&
        cardRef.current.studentId === found.studentId
      ) {
        return;
      }
      if (!cardRef.current?.pinned) update(null);
      profileTimer = window.setTimeout(() => update(found), PROFILE_HOVER_MS);
    };

    const handleLeave = () => {
      clearProfileTimer();
      if (!cardRef.current?.pinned) update(null);
    };

    const handleDown = (event: PointerEvent) => {
      // A press always ends a card from before; a hover card would otherwise
      // wait at its old place until the pointer moves again.
      update(null);
      clearProfileTimer();
      cancelPress();
      swallowClick = false;
      if (event.pointerType !== 'touch' || !touch) return;
      const target = event.target;
      if (!cardFor(target, true, allowed)) return;
      press = { x: event.clientX, y: event.clientY };
      pressTimer = window.setTimeout(() => {
        const found = cardFor(target, true, allowed);
        press = null;
        if (!found) return;
        swallowClick = true;
        update(found);
      }, LONG_PRESS_MS);
    };

    const handleMove = (event: PointerEvent) => {
      if (!press) return;
      if (
        Math.hypot(event.clientX - press.x, event.clientY - press.y) >
        PRESS_SLOP
      ) {
        cancelPress();
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
    };

    // A held finger opens the browser's own menu on some systems.
    const handleContextMenu = (event: Event) => {
      if (cardRef.current?.pinned || press) event.preventDefault();
    };

    const handleOutsideDown = (event: PointerEvent) => {
      if (!root.contains(event.target as Node)) update(null);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && cardRef.current) update(null);
    };

    root.addEventListener('pointerover', handleOver);
    root.addEventListener('pointerleave', handleLeave);
    root.addEventListener('pointerdown', handleDown, true);
    root.addEventListener('pointermove', handleMove);
    root.addEventListener('pointerup', cancelPress);
    root.addEventListener('pointercancel', cancelPress);
    root.addEventListener('click', handleClick, true);
    root.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('pointerdown', handleOutsideDown, true);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('keydown', handleKey);
    return () => {
      clearProfileTimer();
      cancelPress();
      root.removeEventListener('pointerover', handleOver);
      root.removeEventListener('pointerleave', handleLeave);
      root.removeEventListener('pointerdown', handleDown, true);
      root.removeEventListener('pointermove', handleMove);
      root.removeEventListener('pointerup', cancelPress);
      root.removeEventListener('pointercancel', cancelPress);
      root.removeEventListener('click', handleClick, true);
      root.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('pointerdown', handleOutsideDown, true);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('keydown', handleKey);
    };
  }, [badgeCards, dismiss, enabled, profileCards, root, touch, update]);

  const shown =
    enabled && card && (card.kind === 'badge' ? badgeCards : profileCards)
      ? card
      : null;
  return { card: shown, dismiss };
}
