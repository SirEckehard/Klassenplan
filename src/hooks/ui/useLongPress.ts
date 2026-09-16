// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

/**
 * Same delay as a long press on the canvas (`canvasPointerMachine`), so holding
 * a finger down means the same thing everywhere in the editor.
 */
const LONG_PRESS_DELAY_MS = 500;

/** How far a finger may drift before the press counts as the start of a scroll. */
const MOVE_TOLERANCE_PX = 10;

/**
 * How long after lifting the finger a click still belongs to the long press.
 * Whether a click follows at all differs by browser (Android fires
 * `contextmenu` instead, iOS may still click), so the swallow window expires
 * rather than waiting for a click that never comes — a keyboard click on the
 * same button later must not be eaten.
 */
const CLICK_GRACE_MS = 800;

type LongPressHandlers<T extends HTMLElement> = {
  onPointerDown: (event: React.PointerEvent<T>) => void;
  onPointerMove: (event: React.PointerEvent<T>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
};

/**
 * Long press for touch and pen on an ordinary element — the counterpart of the
 * right click a mouse has. A mouse keeps its plain click; the canvas does the
 * same.
 *
 * Spread `handlers` onto the element and ask `isClickAfterLongPress()` first
 * thing in its `onClick`: the click that ends a long press must not also
 * trigger the element's primary action.
 */
export function useLongPress<T extends HTMLElement>(
  onLongPress: (element: T) => void,
): {
  handlers: LongPressHandlers<T>;
  isClickAfterLongPress: () => boolean;
} {
  const timerRef = React.useRef<number | null>(null);
  const originRef = React.useRef<{ x: number; y: number } | null>(null);
  const firedRef = React.useRef(false);
  const swallowClickUntilRef = React.useRef(0);

  const cancelTimer = React.useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    originRef.current = null;
  }, []);

  React.useEffect(() => cancelTimer, [cancelTimer]);

  const endPress = React.useCallback(() => {
    cancelTimer();
    if (firedRef.current) {
      firedRef.current = false;
      swallowClickUntilRef.current = Date.now() + CLICK_GRACE_MS;
    }
  }, [cancelTimer]);

  const handlers: LongPressHandlers<T> = {
    onPointerDown: (event) => {
      cancelTimer();
      firedRef.current = false;
      swallowClickUntilRef.current = 0;
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
        return;
      }
      const element = event.currentTarget;
      originRef.current = { x: event.clientX, y: event.clientY };
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        originRef.current = null;
        firedRef.current = true;
        onLongPress(element);
      }, LONG_PRESS_DELAY_MS);
    },
    onPointerMove: (event) => {
      const origin = originRef.current;
      if (
        origin &&
        Math.hypot(event.clientX - origin.x, event.clientY - origin.y) >
          MOVE_TOLERANCE_PX
      ) {
        cancelTimer();
      }
    },
    onPointerUp: endPress,
    onPointerCancel: endPress,
  };

  const isClickAfterLongPress = React.useCallback(() => {
    const swallow = Date.now() <= swallowClickUntilRef.current;
    swallowClickUntilRef.current = 0;
    return swallow;
  }, []);

  return { handlers, isClickAfterLongPress };
}
