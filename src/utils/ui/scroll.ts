// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
export const SCROLL_TO_TOP_EVENT = 'app:scrollToTop';

export const triggerScrollToTop = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SCROLL_TO_TOP_EVENT));
};

/** Room left between what is revealed and the scroller's edge. */
const REVEAL_MARGIN_PX = 12;

/**
 * Scrolls `scroller` just far enough to show `element` whole — or, where it
 * is taller than the scroller, until its top reaches the scroller's top, so
 * what was just unfolded starts in view rather than ends there. Nothing moves
 * while it is in view already.
 */
export function revealInScroller(
  scroller: HTMLElement,
  element: HTMLElement,
  behavior: ScrollBehavior = 'auto',
): void {
  const box = scroller.getBoundingClientRect();
  const target = element.getBoundingClientRect();
  const hiddenBelow = target.bottom - box.bottom;
  if (hiddenBelow <= 0) return;
  const roomAbove = target.top - box.top - REVEAL_MARGIN_PX;
  const by = Math.min(hiddenBelow + REVEAL_MARGIN_PX, roomAbove);
  if (by <= 0) return;
  const top = scroller.scrollTop + by;
  if (typeof scroller.scrollTo === 'function') {
    scroller.scrollTo({ top, behavior });
  } else {
    scroller.scrollTop = top;
  }
}
