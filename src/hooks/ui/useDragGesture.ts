// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

/**
 * How far a pointer travels before a press becomes a drag. A finger wobbles
 * more than a mouse, so it gets more room; a pen is held like a mouse.
 */
export const DRAG_THRESHOLD_PX = { mouse: 4, touch: 8 } as const;

type Point = { x: number; y: number };

export type DragGestureHandlers = {
  /** The pointer has travelled far enough: the drag begins here. */
  onStart: (point: Point) => void;
  onMove: (point: Point) => void;
  /** Released after the drag began. */
  onDrop: (point: Point) => void;
  /** Escape, a cancelled pointer or an unmount: nothing moves. */
  onCancel: () => void;
};

type Session = {
  pointerId: number;
  start: Point;
  threshold: number;
  active: boolean;
  handlers: DragGestureHandlers;
  cleanup: () => void;
};

/**
 * One drag from a press to a release, the same in the seating plan and the
 * circle.
 *
 * A press that does not travel is a click or a tap and never becomes a drag,
 * so a tap on a badge or the lock does not also pick the student up. Once it
 * travels, `onStart` fires and the drag runs until the pointer is released
 * (`onDrop`) or the drag is abandoned: Escape, a pointer the system takes
 * back (a scroll, a notification) or the view going away all end it in
 * `onCancel`, and nothing moves.
 */
export function useDragGesture(): {
  begin: (event: React.PointerEvent, handlers: DragGestureHandlers) => void;
  cancel: () => void;
} {
  const sessionRef = React.useRef<Session | null>(null);

  const end = React.useCallback((notify: 'drop' | 'cancel' | 'none') => {
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;
    session.cleanup();
    if (session.active && notify === 'cancel') session.handlers.onCancel();
  }, []);

  const cancel = React.useCallback(() => end('cancel'), [end]);

  const begin = React.useCallback(
    (event: React.PointerEvent, handlers: DragGestureHandlers) => {
      // A second press while one is open (another finger) abandons the first.
      end('cancel');

      const pointerId = event.pointerId;
      const threshold =
        event.pointerType === 'touch'
          ? DRAG_THRESHOLD_PX.touch
          : DRAG_THRESHOLD_PX.mouse;
      const start = { x: event.clientX, y: event.clientY };

      const handleMove = (moveEvent: PointerEvent) => {
        const session = sessionRef.current;
        if (!session || moveEvent.pointerId !== session.pointerId) return;
        const point = { x: moveEvent.clientX, y: moveEvent.clientY };
        if (!session.active) {
          const travelled = Math.hypot(point.x - start.x, point.y - start.y);
          if (travelled < session.threshold) return;
          session.active = true;
          session.handlers.onStart(start);
        }
        session.handlers.onMove(point);
      };

      const handleUp = (upEvent: PointerEvent) => {
        const session = sessionRef.current;
        if (!session || upEvent.pointerId !== session.pointerId) return;
        const wasActive = session.active;
        end('none');
        if (wasActive) {
          handlers.onDrop({ x: upEvent.clientX, y: upEvent.clientY });
        }
      };

      const handleCancel = (cancelEvent: PointerEvent) => {
        const session = sessionRef.current;
        if (!session || cancelEvent.pointerId !== session.pointerId) return;
        end('cancel');
      };

      const handleKey = (keyEvent: KeyboardEvent) => {
        if (keyEvent.key !== 'Escape' || !sessionRef.current?.active) return;
        keyEvent.preventDefault();
        end('cancel');
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleCancel);
      window.addEventListener('keydown', handleKey);

      sessionRef.current = {
        pointerId,
        start,
        threshold,
        active: false,
        handlers,
        cleanup: () => {
          window.removeEventListener('pointermove', handleMove);
          window.removeEventListener('pointerup', handleUp);
          window.removeEventListener('pointercancel', handleCancel);
          window.removeEventListener('keydown', handleKey);
        },
      };
    },
    [end],
  );

  // A view that goes away mid-drag takes the drag with it.
  React.useEffect(() => () => end('cancel'), [end]);

  return React.useMemo(() => ({ begin, cancel }), [begin, cancel]);
}
