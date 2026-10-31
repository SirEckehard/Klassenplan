// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, type RefObject } from 'react';

const SCROLLING_OVERFLOW = new Set(['auto', 'scroll', 'overlay']);

/**
 * Whether an element between the finger and the panel can still scroll the
 * way the finger moves. `delta` is how far the content would move: positive
 * towards the end (a finger moving up or left), negative towards the start.
 */
function canScrollWithin(
  target: EventTarget | null,
  root: HTMLElement,
  horizontal: boolean,
  delta: number,
): boolean {
  let element = target instanceof Element ? target : null;
  while (element && root.contains(element)) {
    // A text field scrolls its own line sideways, which no style tells.
    if (horizontal && element instanceof HTMLInputElement) return true;
    if (element instanceof HTMLElement) {
      const style = window.getComputedStyle(element);
      const overflow = horizontal ? style.overflowX : style.overflowY;
      if (SCROLLING_OVERFLOW.has(overflow)) {
        const position = horizontal ? element.scrollLeft : element.scrollTop;
        const size = horizontal ? element.clientWidth : element.clientHeight;
        const extent = horizontal ? element.scrollWidth : element.scrollHeight;
        if (delta > 0 && position + size < extent - 1) return true;
        if (delta < 0 && position > 0) return true;
      }
    }
    if (element === root) break;
    element = element.parentElement;
  }
  return false;
}

/**
 * Keeps a finger on an open drawer or sheet from scrolling the page under it.
 *
 * Below `lg` the layer is a page that scrolls, and the drawers lie over it,
 * fixed and not modal. A swipe on a part of the drawer that does not scroll
 * — its header, its foot, a body shorter than its room — or past the end of
 * its body went on to the page, and the class list slid away under the
 * drawer. `overscroll-behavior` stops that only on a scroll container that
 * overflows, so this asks at every move whether something in the drawer can
 * still take it, and cancels the move where nothing can. A pinch is left
 * alone. React registers its touch listeners as passive, hence native ones
 * on the document, which also follow the drawer when its element changes.
 *
 * @param ref - The drawer
 * @param active - Whether it is open as a drawer (not the desktop's column)
 */
export function useContainedTouchScroll(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;

    let last: { x: number; y: number } | null = null;

    const handleTouchStart = (event: TouchEvent) => {
      const root = ref.current;
      const touch = event.touches[0];
      last =
        event.touches.length === 1 &&
        root &&
        event.target instanceof Node &&
        root.contains(event.target)
          ? { x: touch.clientX, y: touch.clientY }
          : null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const root = ref.current;
      if (!last || !root || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = last.x - touch.clientX;
      const dy = last.y - touch.clientY;
      last = { x: touch.clientX, y: touch.clientY };
      if (!event.cancelable || (dx === 0 && dy === 0)) return;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const delta = horizontal ? dx : dy;
      if (!canScrollWithin(event.target, root, horizontal, delta)) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length === 0) last = null;
    };

    document.addEventListener('touchstart', handleTouchStart, {
      capture: true,
      passive: true,
    });
    document.addEventListener('touchmove', handleTouchMove, {
      capture: true,
      passive: false,
    });
    document.addEventListener('touchend', handleTouchEnd, true);
    document.addEventListener('touchcancel', handleTouchEnd, true);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart, true);
      document.removeEventListener('touchmove', handleTouchMove, true);
      document.removeEventListener('touchend', handleTouchEnd, true);
      document.removeEventListener('touchcancel', handleTouchEnd, true);
    };
  }, [active, ref]);
}
