import React, { useState, useCallback, useRef } from 'react';
import type { CircleLayout } from '@/types/Circle';
import type { Student } from '@/types';
import { angleToPosition } from '@/utils/math/circleGeometry';
import { triggerHapticFeedback } from '@/utils/touch/hapticFeedback';

export interface UseCircleDragDropParams {
  layout: CircleLayout;
  editable: boolean;
  onStudentMove?: (studentId: string, targetPosition: number) => void;
}

export interface CircleDragState {
  isDragging: boolean;
  draggedPosition: number | null;
  hoverPosition: number | null;
  dragPreview: { x: number; y: number; student: Student | null } | null;
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

// Distance (in SVG units) the preview should keep from the finger on touch devices
const TOUCH_DRAG_PREVIEW_DISTANCE = 36;

/**
 * Custom hook for managing drag-and-drop interactions in circle view
 * Handles pointer events, drag state, and cleanup for circle student positioning
 */
export function useCircleDragDrop({
  layout,
  editable,
  onStudentMove,
}: UseCircleDragDropParams): CircleDragDropHook {
  const [dragState, setDragState] = useState<CircleDragState>({
    isDragging: false,
    draggedPosition: null,
    hoverPosition: null,
    dragPreview: null,
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const isMountedRef = useRef(true);

  // Instance-specific drag state refs
  const dragInfoRef = useRef<{
    fromPosition: number;
    studentId: string;
  } | null>(null);
  const dragMoveListenerRef = useRef<((e: PointerEvent) => void) | null>(null);
  const dragUpListenerRef = useRef<((e: PointerEvent) => void) | null>(null);

  // Cleanup effect for drag listeners and mount state
  React.useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Clean up any active drag listeners
      if (dragMoveListenerRef.current) {
        window.removeEventListener('pointermove', dragMoveListenerRef.current);
        dragMoveListenerRef.current = null;
      }
      if (dragUpListenerRef.current) {
        window.removeEventListener('pointerup', dragUpListenerRef.current);
        dragUpListenerRef.current = null;
      }
      dragInfoRef.current = null;
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, position: number, studentId: string) => {
      if (!editable) return;

      const student = layout.students[position];
      if (!student || !student.student) return;

      e.preventDefault();
      e.stopPropagation();

      // Clean up any existing listeners
      if (dragMoveListenerRef.current) {
        window.removeEventListener('pointermove', dragMoveListenerRef.current);
        dragMoveListenerRef.current = null;
      }
      if (dragUpListenerRef.current) {
        window.removeEventListener('pointerup', dragUpListenerRef.current);
        dragUpListenerRef.current = null;
      }

      dragInfoRef.current = { fromPosition: position, studentId };

      // Trigger haptic feedback on drag start
      triggerHapticFeedback('dragStart');

      if (isMountedRef.current) {
        setDragState({
          isDragging: true,
          draggedPosition: position,
          hoverPosition: null,
          dragPreview: null, // Will be set during mouse move
        });
      }

      // Store current hover position in a variable to avoid stale closure
      let currentHoverPosition: number | null = null;
      const pointerType = e.pointerType;

      // Mouse move handler
      dragMoveListenerRef.current = (moveEvent: PointerEvent) => {
        if (!svgRef.current || !dragInfoRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const svgX = ((moveEvent.clientX - rect.left) / rect.width) * 900;
        const svgY = ((moveEvent.clientY - rect.top) / rect.height) * 600;

        const isTouchPointer = pointerType === 'touch';

        let previewX = svgX;
        let previewY = svgY;

        if (isTouchPointer) {
          const { x: centerX, y: centerY } = layout.center;
          const deltaX = svgX - centerX;
          const deltaY = svgY - centerY;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

          if (distance > 0.0001) {
            const scale = TOUCH_DRAG_PREVIEW_DISTANCE / distance;
            previewX = svgX + deltaX * scale;
            previewY = svgY + deltaY * scale;
          } else {
            previewY = svgY - TOUCH_DRAG_PREVIEW_DISTANCE;
          }

          previewX = Math.min(Math.max(previewX, 40), 860);
          previewY = Math.min(Math.max(previewY, 30), 570);
        }

        // Update drag preview position
        if (isMountedRef.current) {
          setDragState((prev) => ({
            ...prev,
            dragPreview: {
              x: previewX,
              y: previewY,
              student: dragInfoRef.current
                ? layout.students[dragInfoRef.current.fromPosition]?.student
                : null,
            },
          }));
        }

        // Find closest position
        let closestPosition = -1;
        let minDistance = Infinity;

        layout.students.forEach((_, index) => {
          const angle = (360 / layout.students.length) * index;
          const pos = angleToPosition(angle, layout.center, layout.radius);
          const distance = Math.sqrt(
            Math.pow(svgX - pos.x, 2) + Math.pow(svgY - pos.y, 2),
          );

          if (distance < minDistance) {
            minDistance = distance;
            closestPosition = index;
          }
        });

        // Update hover position if close enough and different from start position
        if (
          minDistance < 50 &&
          closestPosition !== dragInfoRef.current.fromPosition
        ) {
          if (currentHoverPosition !== closestPosition) {
            currentHoverPosition = closestPosition;
            if (isMountedRef.current) {
              setDragState((prev) => ({
                ...prev,
                hoverPosition: closestPosition,
              }));
            }
          }
        } else {
          if (currentHoverPosition !== null) {
            currentHoverPosition = null;
            if (isMountedRef.current) {
              setDragState((prev) => ({
                ...prev,
                hoverPosition: null,
              }));
            }
          }
        }
      };

      // Mouse up handler
      dragUpListenerRef.current = () => {
        let wasSuccessfulDrop = false;

        if (
          dragInfoRef.current &&
          currentHoverPosition !== null &&
          currentHoverPosition !== dragInfoRef.current.fromPosition
        ) {
          onStudentMove?.(dragInfoRef.current.studentId, currentHoverPosition);
          wasSuccessfulDrop = true;
        }

        // Trigger haptic feedback based on drop result
        if (wasSuccessfulDrop) {
          triggerHapticFeedback('drop');
        } else {
          triggerHapticFeedback('dragEnd');
        }

        // Cleanup
        if (dragMoveListenerRef.current) {
          window.removeEventListener(
            'pointermove',
            dragMoveListenerRef.current,
          );
          dragMoveListenerRef.current = null;
        }
        if (dragUpListenerRef.current) {
          window.removeEventListener('pointerup', dragUpListenerRef.current);
          dragUpListenerRef.current = null;
        }

        dragInfoRef.current = null;
        if (isMountedRef.current) {
          setDragState({
            isDragging: false,
            draggedPosition: null,
            hoverPosition: null,
            dragPreview: null,
          });
        }
      };

      window.addEventListener('pointermove', dragMoveListenerRef.current);
      window.addEventListener('pointerup', dragUpListenerRef.current);
    },
    [editable, layout.students, layout.center, layout.radius, onStudentMove],
  );

  return {
    dragState,
    handlePointerDown,
    svgRef,
  };
}
