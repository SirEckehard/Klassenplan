// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, type RefObject } from 'react';

/**
 * Keeps a finger on an SVG stage from scrolling the page.
 *
 * The stages declare `touch-action: none`, which Chromium honours. Safari on
 * an iPad did not on the SVG: in portrait, where the layer is a page that
 * scrolls, a finger drawing a selection box across the room scrolled the page
 * and the browser cancelled the pointer instead. A `touchmove` that is
 * cancelled before the browser starts to pan never scrolls, in every browser,
 * so this says the same thing a second way. React registers its touch
 * listeners as passive, hence a native one.
 *
 * @param ref - The stage
 * @param active - Whether the stage takes the finger (an editable one)
 */
export function useTouchScrollLock(
  ref: RefObject<Element | null>,
  active = true,
): void {
  useEffect(() => {
    const element = ref.current;
    if (!active || !element) return undefined;
    const handleTouchMove = (event: Event) => {
      if (event.cancelable) event.preventDefault();
    };
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => element.removeEventListener('touchmove', handleTouchMove);
  }, [active, ref]);
}
