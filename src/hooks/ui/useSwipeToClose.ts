// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, type RefObject } from 'react';
import {
  notePanelSwiped,
  swipedPanelTransform,
  type SwipeEdge,
} from '@/hooks/ui/usePanelMotion';
import { MOTION_DURATION, MOTION_EASE, motionEnabled } from '@/utils/ui/motion';

/** The inspector's head, which `InspectorHeader` marks. */
const HEAD_SELECTOR = '[data-inspector-head]';

/** A finger has to move this far before the swipe's direction counts. */
const SLOP_PX = 8;
/** A swipe that carries the panel this far closes it … */
const CLOSE_DISTANCE_PX = 96;
/** … and so does a flick faster than this (px per ms) past a few pixels. */
const FLICK_VELOCITY = 0.45;
const FLICK_MIN_PX = 24;
/** A finger that rested this long before it lifted has flicked nothing. */
const FLICK_MAX_REST_MS = 100;

interface Swipe {
  node: HTMLElement;
  startX: number;
  startY: number;
  /** Where the finger stood along the way out when the panel began to follow. */
  start: number;
  last: number;
  lastTime: number;
  velocity: number;
  /** The panel follows the finger: the swipe was found to go its way out. */
  following: boolean;
  offset: number;
}

/**
 * A finger on the head of an open sheet or drawer pulls it towards the edge it
 * came from, and far or fast enough puts it away; otherwise it goes back to
 * its place.
 *
 * Touch events alone, so a mouse never drags the panel, and native ones on the
 * document, as in `useContainedTouchScroll`, which also keeps this swipe from
 * scrolling the page under the panel. A text field that has the focus keeps
 * the finger, which places the caret there.
 *
 * @param ref - The panel
 * @param onClose - Puts it away, as its ✕ does
 * @param active - Whether it is open as a sheet or a drawer
 * @param edge - The edge it came from and leaves over
 */
export function useSwipeToClose(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  active: boolean,
  edge: SwipeEdge,
): void {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;

    let swipe: Swipe | null = null;

    const goBack = () => {
      if (!swipe) return;
      const { node, following, offset } = swipe;
      swipe = null;
      if (!following) return;
      node.style.removeProperty('transform');
      if (offset > 0 && motionEnabled(node)) {
        node.animate(
          [
            { transform: swipedPanelTransform(edge, offset) },
            { transform: 'none' },
          ],
          { duration: MOTION_DURATION.sheetOut, easing: MOTION_EASE.settle },
        );
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      // A second finger is a pinch, not this swipe.
      if (event.touches.length !== 1) {
        goBack();
        return;
      }
      const node = ref.current;
      const target = event.target;
      if (!node || !(target instanceof Element) || !node.contains(target))
        return;
      if (!target.closest(HEAD_SELECTOR)) return;
      const field = target.closest('input, textarea');
      if (field && field === document.activeElement) return;
      const touch = event.touches[0];
      const along = edge === 'right' ? touch.clientX : touch.clientY;
      swipe = {
        node,
        startX: touch.clientX,
        startY: touch.clientY,
        start: along,
        last: along,
        lastTime: event.timeStamp,
        velocity: 0,
        following: false,
        offset: 0,
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!swipe || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const along = edge === 'right' ? touch.clientX : touch.clientY;
      if (!swipe.following) {
        const dx = touch.clientX - swipe.startX;
        const dy = touch.clientY - swipe.startY;
        if (Math.abs(dx) < SLOP_PX && Math.abs(dy) < SLOP_PX) return;
        // Any other way is not this swipe, and stays not this swipe.
        const [out, across] = edge === 'right' ? [dx, dy] : [dy, dx];
        if (out <= Math.abs(across)) {
          swipe = null;
          return;
        }
        swipe.following = true;
        swipe.start = along;
      }
      if (event.cancelable) event.preventDefault();
      const elapsed = event.timeStamp - swipe.lastTime;
      if (elapsed > 0) swipe.velocity = (along - swipe.last) / elapsed;
      swipe.last = along;
      swipe.lastTime = event.timeStamp;
      swipe.offset = Math.max(0, along - swipe.start);
      swipe.node.style.transform = swipedPanelTransform(edge, swipe.offset);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!swipe || event.touches.length > 0) return;
      const { node, following, offset } = swipe;
      const flicked =
        swipe.velocity >= FLICK_VELOCITY &&
        offset >= FLICK_MIN_PX &&
        event.timeStamp - swipe.lastTime <= FLICK_MAX_REST_MS;
      if (following && (offset >= CLOSE_DISTANCE_PX || flicked)) {
        swipe = null;
        // The copy `usePanelMotion` sends off takes over from where it stands.
        notePanelSwiped(node, offset);
        node.style.removeProperty('transform');
        onClose();
        return;
      }
      goBack();
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
    document.addEventListener('touchcancel', goBack, true);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart, true);
      document.removeEventListener('touchmove', handleTouchMove, true);
      document.removeEventListener('touchend', handleTouchEnd, true);
      document.removeEventListener('touchcancel', goBack, true);
      // Closed some other way under the finger: nothing stays pulled away.
      swipe?.node.style.removeProperty('transform');
    };
  }, [active, edge, onClose, ref]);
}
