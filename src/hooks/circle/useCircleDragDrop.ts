// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useState, useCallback, useRef } from 'react';
import type { CircleLayout } from '@/types/Circle';
import { triggerHapticFeedback } from '@/utils/touch/hapticFeedback';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import { useDragGesture } from '@/hooks/ui/useDragGesture';

/** The view box the circle is drawn in, unless the view says otherwise. */
const ROOM_VIEW = { x: 0, y: 0, width: 900, height: 600 };
/** How far from a place, in view-box units, the pointer still means it. */
const TARGET_RADIUS = 50;

export interface UseCircleDragDropParams {
  layout: CircleLayout;
  editable: boolean;
  onStudentMove?: (studentId: string, targetPosition: number) => void;
  /**
   * Where each place is drawn, in view-box units. The target is the nearest
   * of these — the places as drawn, not as stored: a circle with photos is
   * drawn smaller than its layout says.
   */
  slotPositions: ReadonlyArray<{ x: number; y: number }>;
  /**
   * The SVG's view box: 900×600, or 600×900 for a circle turned for a screen
   * held upright. A pointer is read against it.
   */
  viewBox?: { x: number; y: number; width: number; height: number };
  /** A held place: nothing leaves it and nothing lands on it. */
  isPositionLocked?: (position: number) => boolean;
  /** A student landed: from which place to which. */
  onMoved?: (from: number, to: number) => void;
}

export interface CircleDragState {
  isDragging: boolean;
  draggedPosition: number | null;
  hoverPosition: number | null;
  /** The place under the pointer is held and refuses the drop. */
  hoverBlocked: boolean;
  /** The pointer in client coordinates, for the name chip beside it. */
  pointer: { x: number; y: number } | null;
  /** `touch` puts the chip above the finger, else beside the pointer. */
  pointerType: string | null;
}

export interface CircleDragDropHook {
  dragState: CircleDragState;
  handlePointerDown: (
    e: React.PointerEvent,
    position: number,
    studentId: string,
  ) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

const IDLE: CircleDragState = {
  isDragging: false,
  draggedPosition: null,
  hoverPosition: null,
  hoverBlocked: false,
  pointer: null,
  pointerType: null,
};

/**
 * Dragging a student to another place in the circle.
 *
 * The gesture — how far a press travels before it is a drag, and what ends
 * it — is `useDragGesture`, shared with the table plan. This hook adds what
 * the circle knows: the nearest drawn place under the pointer, the places
 * that are held, and the swap.
 */
export function useCircleDragDrop({
  layout,
  editable,
  onStudentMove,
  slotPositions,
  viewBox = ROOM_VIEW,
  isPositionLocked,
  onMoved,
}: UseCircleDragDropParams): CircleDragDropHook {
  const [dragState, setDragState] = useState<CircleDragState>(IDLE);
  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useDragGesture();

  const findTarget = useCallback(
    (point: { x: number; y: number }, from: number): number | null => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return null;
      const x =
        viewBox.x + ((point.x - rect.left) / rect.width) * viewBox.width;
      const y =
        viewBox.y + ((point.y - rect.top) / rect.height) * viewBox.height;

      let closest: number | null = null;
      let minDistance = TARGET_RADIUS;
      slotPositions.forEach((slot, index) => {
        const distance = Math.hypot(x - slot.x, y - slot.y);
        if (distance < minDistance) {
          minDistance = distance;
          closest = index;
        }
      });
      // The place the drag started from is no target.
      return closest === from ? null : closest;
    },
    [slotPositions, viewBox.x, viewBox.y, viewBox.width, viewBox.height],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, position: number, studentId: string) => {
      if (!editable) return;
      if (!layout.students[position]?.student) return;
      // A held student stays where they are.
      if (isPositionLocked?.(position)) return;

      e.preventDefault();
      e.stopPropagation();

      let target: number | null = null;
      let blocked = false;
      const pointerType = e.pointerType;
      const reset = () => setDragState(IDLE);

      gesture.begin(e, {
        onStart: (point) => {
          triggerHapticFeedback('dragStart');
          setDragState({
            ...IDLE,
            isDragging: true,
            draggedPosition: position,
            pointer: point,
            pointerType,
          });
        },
        onMove: (point) => {
          target = findTarget(point, position);
          blocked = target !== null && Boolean(isPositionLocked?.(target));
          setDragState((prev) => ({
            ...prev,
            pointer: point,
            hoverPosition: target,
            hoverBlocked: blocked,
          }));
        },
        onDrop: () => {
          reset();
          if (target === null) {
            triggerHapticFeedback('dragEnd');
            return;
          }
          if (blocked) {
            triggerHapticFeedback('error');
            showToast('error', TOAST_MESSAGES.SEAT_LOCKED_DROP);
            return;
          }
          onStudentMove?.(studentId, target);
          triggerHapticFeedback('drop');
          onMoved?.(position, target);
        },
        onCancel: () => {
          reset();
          triggerHapticFeedback('dragEnd');
        },
      });
    },
    [
      editable,
      layout.students,
      isPositionLocked,
      gesture,
      findTarget,
      onStudentMove,
      onMoved,
    ],
  );

  return {
    dragState,
    handlePointerDown,
    svgRef,
  };
}
