// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { swallowReleaseClick } from '@/utils';

/** As long as the room's long press (`canvasPointerMachine`). */
const LONG_PRESS_MS = 500;
/** How far a finger may wander and still be holding, not scrolling. */
const LONG_PRESS_SLOP_PX = 10;

type LongPressHandlers<T extends Element> = {
  onPointerDown: (event: React.PointerEvent<T>) => void;
  onPointerMove: (event: React.PointerEvent<T>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
};

/**
 * A finger or a pen held still on an element: the touch screen's right-click,
 * for elements of the page (the canvas has its own, in `canvasPointerMachine`).
 *
 * The press becomes a long press after half a second, unless the finger moved
 * (it scrolls the list) or lifted before. The click some browsers send when
 * that finger lifts is swallowed (`swallowReleaseClick`), or it would close
 * the menu the press opened, or choose what it covers. The mouse is left to
 * the browser's `contextmenu`.
 *
 * Mobile Safari sends no `contextmenu` for a long press at all; Chrome on
 * Android sends one as well — a handler of `contextmenu` leaves a touch's to
 * this hook (`isTouchContextMenu`).
 */
export function useLongPress<T extends Element>(
  onLongPress: (point: { x: number; y: number }, target: T) => void,
): LongPressHandlers<T> {
  const pressRef = React.useRef<{
    id: number;
    x: number;
    y: number;
    timer: number;
  } | null>(null);
  const callbackRef = React.useRef(onLongPress);
  React.useEffect(() => {
    callbackRef.current = onLongPress;
  });

  const cancel = React.useCallback(() => {
    const press = pressRef.current;
    if (!press) return;
    window.clearTimeout(press.timer);
    pressRef.current = null;
  }, []);

  React.useEffect(() => cancel, [cancel]);

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent<T>) => {
      cancel();
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      const target = event.currentTarget;
      const x = event.clientX;
      const y = event.clientY;
      const timer = window.setTimeout(() => {
        pressRef.current = null;
        swallowReleaseClick();
        callbackRef.current({ x, y }, target);
      }, LONG_PRESS_MS);
      pressRef.current = { id: event.pointerId, x, y, timer };
    },
    [cancel],
  );

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<T>) => {
      const press = pressRef.current;
      if (!press || press.id !== event.pointerId) return;
      if (
        Math.hypot(event.clientX - press.x, event.clientY - press.y) >
        LONG_PRESS_SLOP_PX
      ) {
        cancel();
      }
    },
    [cancel],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: cancel,
    onPointerCancel: cancel,
  };
}

/** A `contextmenu` a finger or a pen raised — the long press answers it. */
export function isTouchContextMenu(event: React.MouseEvent): boolean {
  const { pointerType } = event.nativeEvent as Partial<PointerEvent>;
  return pointerType === 'touch' || pointerType === 'pen';
}
