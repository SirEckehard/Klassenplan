// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

/** How near the bottom edge the pointer has to come to bring the bar up. */
const EDGE_REVEAL_ZONE_PX = 120;
/** How long the bar stays up once neither the pointer nor the focus holds it. */
const EDGE_REVEAL_HIDE_DELAY_MS = 1500;

/**
 * Whether the keyboard brought the focus here. A click focuses the button it
 * lands on as well — the fullscreen button first of all — and that focus must
 * not hold the bar, or it would wait for the next click elsewhere to go.
 */
const isKeyboardFocus = (target: EventTarget) => {
  if (!(target instanceof Element)) return false;
  try {
    return target.matches(':focus-visible');
  } catch {
    // Without `:focus-visible` there is no telling; keeping the bar up is the
    // mistake that leaves the keyboard somewhere to go.
    return true;
  }
};

/**
 * A bar at the bottom edge that keeps out of the picture until it is reached
 * for.
 *
 * In the projection's fullscreen the room should see the plan and nothing
 * else, while the teacher still needs the controls. The bar comes up when the
 * pointer nears the bottom edge — a tap there does the same on a touch screen —
 * or when the keyboard moves the focus into it, and slides away again a moment
 * after pointer and focus have left it. Disabled, it is simply always up.
 *
 * The element the bar lives in takes `barProps`; hiding it (off-screen, no
 * pointer events) is the caller's markup. It stays focusable while hidden, so
 * Tab is a way in, not a dead end. Only the keyboard's focus holds it — the
 * focus a click leaves on a button does not.
 */
export function useEdgeReveal(enabled: boolean) {
  const [revealed, setRevealed] = React.useState(false);
  const pointerInsideRef = React.useRef(false);
  const focusInsideRef = React.useRef(false);
  const timerRef = React.useRef<number | undefined>(undefined);

  const hideSoon = React.useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (!pointerInsideRef.current && !focusInsideRef.current) {
        setRevealed(false);
      }
    }, EDGE_REVEAL_HIDE_DELAY_MS);
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    const handlePointer = (event: PointerEvent) => {
      if (window.innerHeight - event.clientY > EDGE_REVEAL_ZONE_PX) return;
      setRevealed(true);
      hideSoon();
    };
    window.addEventListener('pointermove', handlePointer);
    window.addEventListener('pointerdown', handlePointer);
    return () => {
      window.removeEventListener('pointermove', handlePointer);
      window.removeEventListener('pointerdown', handlePointer);
    };
  }, [enabled, hideSoon]);

  // A hide still pending when the view goes away has nothing left to hide.
  React.useEffect(() => {
    const timer = timerRef;
    return () => window.clearTimeout(timer.current);
  }, []);

  const barProps = {
    onPointerEnter: () => {
      pointerInsideRef.current = true;
      setRevealed(true);
    },
    onPointerLeave: () => {
      pointerInsideRef.current = false;
      hideSoon();
    },
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      if (!isKeyboardFocus(event.target)) return;
      focusInsideRef.current = true;
      setRevealed(true);
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      // Moving between two buttons of the bar is still being in it.
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return;
      }
      focusInsideRef.current = false;
      hideSoon();
    },
  };

  return { visible: !enabled || revealed, barProps };
}
