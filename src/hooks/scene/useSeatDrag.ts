// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { Student } from '@/types';
import {
  triggerHapticFeedback,
  type NameDisplayMode,
  type NameLabels,
} from '@/utils';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import type {
  DragHover,
  DragOrigin,
  DragSeatConfig,
} from '@/hooks/ui/useDragDropState';
import { useDragGesture } from '@/hooks/ui/useDragGesture';

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
  /** A student landed: where from, where to. */
  onSeatDropped?: (from: DragOrigin, to: DragOrigin) => void;
  nameDisplay?: NameDisplayMode;
  nameLabels?: NameLabels;
}

interface UseSeatDragResult {
  handleSeatPointerDown: SeatPointerDownHandler;
  handleSeatPointerUp: SeatPointerUpHandler;
}

/**
 * Dragging a student from a seat of one table to any seat of the plan.
 *
 * The gesture — how far a press travels before it is a drag, and what ends
 * it — is `useDragGesture`, shared with the circle. This hook adds what the
 * table plan knows: the seat under the pointer (found with
 * `elementFromPoint`, which is why nothing drawn over the seats takes pointer
 * events), held seats, and the move itself.
 */
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
  onSeatDropped,
  nameDisplay,
  nameLabels,
}: UseSeatDragOptions): UseSeatDragResult {
  const gesture = useDragGesture();
  const hoverSeatRef = React.useRef<DragHover | null>(null);

  const resolveSeatTarget = React.useCallback(
    (clientX: number, clientY: number): DragHover | null => {
      if (
        typeof document === 'undefined' ||
        typeof document.elementFromPoint !== 'function'
      ) {
        return null;
      }
      const elementAtPoint = document.elementFromPoint(clientX, clientY);
      const seatElement = elementAtPoint
        ? elementAtPoint.closest('[data-seat-index][data-table-index]')
        : null;
      if (!seatElement) {
        return null;
      }
      const parsedSeat = Number.parseInt(
        seatElement.getAttribute('data-seat-index') ?? '',
        10,
      );
      const parsedTable = Number.parseInt(
        seatElement.getAttribute('data-table-index') ?? '',
        10,
      );
      if (Number.isNaN(parsedSeat) || Number.isNaN(parsedTable)) {
        return null;
      }
      return {
        tableIndex: parsedTable,
        seatIndex: parsedSeat,
        locked: isSeatLocked ? isSeatLocked(parsedTable, parsedSeat) : false,
      };
    },
    [isSeatLocked],
  );

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
      const student = students[fromSeat];
      if (!draggable || !moveStudent || locked || !hasStudent || !student) {
        return;
      }
      e.stopPropagation();
      if (typeof e.currentTarget.setPointerCapture === 'function') {
        e.currentTarget.setPointerCapture(e.pointerId);
      }

      const origin: DragOrigin = { tableIndex: index, seatIndex: fromSeat };
      const isOrigin = (target: DragHover | null) =>
        target?.tableIndex === origin.tableIndex &&
        target.seatIndex === origin.seatIndex;
      const setHover = (next: DragHover | null) => {
        const prev = hoverSeatRef.current;
        if (
          prev?.tableIndex === next?.tableIndex &&
          prev?.seatIndex === next?.seatIndex &&
          prev?.locked === next?.locked
        ) {
          return;
        }
        hoverSeatRef.current = next;
        onSeatHoverChange?.(next);
      };
      const finish = () => {
        setHover(null);
        onSeatDragEnd?.();
      };

      gesture.begin(e, {
        onStart: (point) => {
          onSeatDragStart?.(student, {
            x: point.x,
            y: point.y,
            tableIndex: index,
            seatIndex: fromSeat,
            seatWidth: seatWidthValue,
            seatHeight: seatHeightValue,
            appearance: appearanceValue,
            flags: flagsValue,
            nameDisplay,
            nameLabels,
          });
        },
        onMove: (point) => {
          onSeatDrag?.(point.x, point.y);
          const target = resolveSeatTarget(point.x, point.y);
          // The seat it came from is under the pointer at first; it is no
          // target.
          setHover(isOrigin(target) ? null : target);
        },
        onDrop: (point) => {
          const target = resolveSeatTarget(point.x, point.y);
          finish();
          if (!target || isOrigin(target)) {
            return;
          }
          if (target.locked) {
            onSeatDropRejected?.({ ...target, locked: true });
            triggerHapticFeedback('error');
            showToast('error', TOAST_MESSAGES.SEAT_LOCKED_DROP);
            return;
          }
          const moved = moveStudent(
            origin.tableIndex,
            origin.seatIndex,
            target.tableIndex,
            target.seatIndex,
          );
          if (moved) {
            triggerHapticFeedback('drop');
            onSeatDropped?.(origin, {
              tableIndex: target.tableIndex,
              seatIndex: target.seatIndex,
            });
          }
        },
        onCancel: finish,
      });
    },
    [
      draggable,
      moveStudent,
      index,
      students,
      gesture,
      onSeatDragStart,
      nameDisplay,
      nameLabels,
      onSeatHoverChange,
      onSeatDrag,
      onSeatDragEnd,
      onSeatDropRejected,
      onSeatDropped,
      resolveSeatTarget,
    ],
  );

  // The drop is the gesture's; the seat only lets go of the pointer it held.
  const handleSeatPointerUp = React.useCallback<SeatPointerUpHandler>((e) => {
    if (
      typeof e.currentTarget.hasPointerCapture === 'function' &&
      e.currentTarget.hasPointerCapture(e.pointerId)
    ) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  return {
    handleSeatPointerDown,
    handleSeatPointerUp,
  };
}
