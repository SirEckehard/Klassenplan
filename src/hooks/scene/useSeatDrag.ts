// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { Student } from '@/types';
import { triggerHapticFeedback } from '@/utils';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import type { DragHover, DragSeatConfig } from '@/hooks/ui/useDragDropState';

type MoveStudentHandler = (
  fromTable: number,
  fromSeat: number,
  toTable: number,
  toSeat: number,
) => boolean;

type SeatPointerDownHandler = (
  e: React.PointerEvent<SVGRectElement>,
  seatIndex: number,
  locked: boolean,
  hasStudent: boolean,
  seatWidth: number,
  seatHeight: number,
  appearance: DragSeatConfig['appearance'],
  flags: DragSeatConfig['flags'],
) => void;

type SeatPointerUpHandler = (
  e: React.PointerEvent<SVGRectElement>,
  seatIndex: number,
  locked: boolean,
) => void;

interface UseSeatDragOptions {
  draggable?: boolean;
  index: number;
  students: (Student | null)[];
  moveStudent?: MoveStudentHandler;
  isSeatLocked?: (table: number, seat: number) => boolean;
  onSeatDragStart?: (student: Student, config: DragSeatConfig) => void;
  onSeatDrag?: (x: number, y: number) => void;
  onSeatDragEnd?: () => void;
  onSeatHoverChange?: (hover: DragHover | null) => void;
  onSeatDropRejected?: (target: DragHover) => void;
  showFullNames: boolean;
}

interface UseSeatDragResult {
  handleSeatPointerDown: SeatPointerDownHandler;
  handleSeatPointerUp: SeatPointerUpHandler;
}

export function useSeatDrag({
  draggable,
  index,
  students,
  moveStudent,
  isSeatLocked,
  onSeatDragStart,
  onSeatDrag,
  onSeatDragEnd,
  onSeatHoverChange,
  onSeatDropRejected,
  showFullNames,
}: UseSeatDragOptions): UseSeatDragResult {
  const dragInfoRef = React.useRef<{ table: number; seat: number } | null>(
    null,
  );
  const dragMoveListenerRef = React.useRef<
    ((event: PointerEvent) => void) | null
  >(null);
  const dragUpListenerRef = React.useRef<
    ((event: PointerEvent) => void) | null
  >(null);
  const activePointerIdRef = React.useRef<number | null>(null);
  const hoverSeatRef = React.useRef<DragHover | null>(null);

  const resolveSeatTarget = React.useCallback(
    (clientX: number, clientY: number): DragHover | null => {
      if (typeof document === 'undefined') {
        return null;
      }
      const elementAtPoint = document.elementFromPoint(clientX, clientY);
      const seatElement = elementAtPoint
        ? elementAtPoint.closest('[data-seat-index][data-table-index]')
        : null;
      if (!seatElement) {
        return null;
      }
      const seatIndexAttr = seatElement.getAttribute('data-seat-index');
      const tableIndexAttr = seatElement.getAttribute('data-table-index');
      const parsedSeat = seatIndexAttr
        ? Number.parseInt(seatIndexAttr, 10)
        : Number.NaN;
      const parsedTable = tableIndexAttr
        ? Number.parseInt(tableIndexAttr, 10)
        : Number.NaN;
      if (Number.isNaN(parsedSeat) || Number.isNaN(parsedTable)) {
        return null;
      }
      const lockedState = isSeatLocked
        ? isSeatLocked(parsedTable, parsedSeat)
        : false;
      return {
        tableIndex: parsedTable,
        seatIndex: parsedSeat,
        locked: lockedState,
      };
    },
    [isSeatLocked],
  );

  React.useEffect(() => {
    return () => {
      if (dragMoveListenerRef.current) {
        window.removeEventListener('pointermove', dragMoveListenerRef.current);
        dragMoveListenerRef.current = null;
      }
      if (dragUpListenerRef.current) {
        window.removeEventListener('pointerup', dragUpListenerRef.current);
        window.removeEventListener('pointercancel', dragUpListenerRef.current);
        dragUpListenerRef.current = null;
      }
      if (dragInfoRef.current && onSeatDragEnd) {
        onSeatDragEnd();
      }
      dragInfoRef.current = null;
      activePointerIdRef.current = null;
      if (hoverSeatRef.current && onSeatHoverChange) {
        onSeatHoverChange(null);
      }
      hoverSeatRef.current = null;
    };
  }, [onSeatDragEnd, onSeatHoverChange]);

  const handleSeatPointerDown = React.useCallback<SeatPointerDownHandler>(
    (
      e,
      fromSeat,
      locked,
      hasStudent,
      seatWidthValue,
      seatHeightValue,
      appearanceValue,
      flagsValue,
    ) => {
      if (!draggable || !moveStudent || locked || !hasStudent) return;
      e.stopPropagation();

      if (dragMoveListenerRef.current) {
        window.removeEventListener('pointermove', dragMoveListenerRef.current);
        dragMoveListenerRef.current = null;
      }
      if (dragUpListenerRef.current) {
        window.removeEventListener('pointerup', dragUpListenerRef.current);
        window.removeEventListener('pointercancel', dragUpListenerRef.current);
        dragUpListenerRef.current = null;
      }

      activePointerIdRef.current = e.pointerId;
      if (typeof e.currentTarget.setPointerCapture === 'function') {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      dragInfoRef.current = { table: index, seat: fromSeat };
      if (onSeatDragStart && students[fromSeat]) {
        onSeatDragStart(students[fromSeat]!, {
          x: e.clientX,
          y: e.clientY,
          tableIndex: index,
          seatIndex: fromSeat,
          seatWidth: seatWidthValue,
          seatHeight: seatHeightValue,
          appearance: appearanceValue,
          flags: flagsValue,
          showFullName: showFullNames,
        });
      }

      if (onSeatHoverChange) {
        const initialHover: DragHover = {
          tableIndex: index,
          seatIndex: fromSeat,
          locked,
        };
        hoverSeatRef.current = initialHover;
        onSeatHoverChange(initialHover);
      }

      const moveListener = (event: PointerEvent) => {
        if (event.pointerId !== activePointerIdRef.current) return;
        onSeatDrag?.(event.clientX, event.clientY);

        if (onSeatHoverChange) {
          const nextHover = resolveSeatTarget(event.clientX, event.clientY);
          const prevHover = hoverSeatRef.current;
          if (
            prevHover?.tableIndex !== nextHover?.tableIndex ||
            prevHover?.seatIndex !== nextHover?.seatIndex ||
            prevHover?.locked !== nextHover?.locked
          ) {
            hoverSeatRef.current = nextHover;
            onSeatHoverChange(nextHover);
          }
        }
      };

      const cleanupListeners = () => {
        window.removeEventListener('pointermove', moveListener);
        window.removeEventListener('pointerup', upListener);
        window.removeEventListener('pointercancel', upListener);
        if (onSeatHoverChange) {
          hoverSeatRef.current = null;
          onSeatHoverChange(null);
        }
      };

      const upListener = (event: PointerEvent) => {
        if (event.pointerId !== activePointerIdRef.current) return;
        dragInfoRef.current = null;
        activePointerIdRef.current = null;
        cleanupListeners();
        dragMoveListenerRef.current = null;
        dragUpListenerRef.current = null;
        onSeatDragEnd?.();
      };

      dragMoveListenerRef.current = moveListener;
      dragUpListenerRef.current = upListener;

      window.addEventListener('pointermove', moveListener);
      window.addEventListener('pointerup', upListener);
      window.addEventListener('pointercancel', upListener);
    },
    [
      draggable,
      moveStudent,
      index,
      students,
      onSeatDragStart,
      showFullNames,
      onSeatHoverChange,
      onSeatDrag,
      onSeatDragEnd,
      resolveSeatTarget,
    ],
  );

  const handleSeatPointerUp = React.useCallback<SeatPointerUpHandler>(
    (e, toSeat, locked) => {
      if (!draggable || !moveStudent) return;
      if (
        typeof e.currentTarget.hasPointerCapture === 'function' &&
        e.currentTarget.hasPointerCapture(e.pointerId)
      ) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      let targetSeat = toSeat;
      let targetTable = index;
      let targetLocked = locked;
      const seatTarget = resolveSeatTarget(e.clientX, e.clientY);
      if (seatTarget) {
        targetSeat = seatTarget.seatIndex;
        targetTable = seatTarget.tableIndex;
        targetLocked = seatTarget.locked;
      }

      if (targetLocked) {
        onSeatDropRejected?.({
          tableIndex: targetTable,
          seatIndex: targetSeat,
          locked: true,
        });
        triggerHapticFeedback('error');
        showToast('error', TOAST_MESSAGES.SEAT_LOCKED_DROP);
        if (onSeatHoverChange) {
          hoverSeatRef.current = null;
          onSeatHoverChange(null);
        }
        return;
      }

      if (dragInfoRef.current) {
        const { table: fromTable, seat: fromSeat } = dragInfoRef.current;
        if (fromTable !== targetTable || fromSeat !== targetSeat) {
          moveStudent(fromTable, fromSeat, targetTable, targetSeat);
          triggerHapticFeedback('drop');
        }
      }
      if (onSeatHoverChange) {
        hoverSeatRef.current = null;
        onSeatHoverChange(null);
      }
    },
    [
      draggable,
      moveStudent,
      index,
      onSeatDropRejected,
      onSeatHoverChange,
      resolveSeatTarget,
    ],
  );

  return {
    handleSeatPointerDown,
    handleSeatPointerUp,
  };
}
