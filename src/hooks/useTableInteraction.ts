import React from 'react';
import {
  GRID_SNAP_SIZE,
  getTablePresets,
  calculateDragDelta,
  applyDragMovement,
} from '@/utils';
import { triggerHapticFeedback } from '@/utils/touch/hapticFeedback';
import { addSeatingForTables } from '@/utils/seating/seatingOperations';
import type { ClassroomTable, TableTemplateType } from '@/types';
import type { SceneTransactionRunner } from '@/hooks/scene/useSceneManager';
import { useTemplateDrag } from '@/hooks/canvas/useTemplateDrag';

// Hook handling table interactions such as selection, dragging and template drops
export default function useTableInteraction({
  sceneTables,
  updateSceneTables,
  runSceneTransaction,
  snapshot,
  commitScene,
  setSelectedTableIds,
  snapToGrid,
  classroomWidth,
  classroomHeight,
  canvasWidth,
  canvasRef,
}: {
  sceneTables: ClassroomTable[];
  updateSceneTables: (
    updateFn: (tables: ClassroomTable[]) => ClassroomTable[],
  ) => void;
  runSceneTransaction: SceneTransactionRunner;
  snapshot: () => void;
  commitScene: () => void;
  setSelectedTableIds: React.Dispatch<React.SetStateAction<number[]>>;
  snapToGrid: boolean;
  classroomWidth: number;
  classroomHeight: number;
  canvasWidth: number;
  canvasRef: React.RefObject<SVGSVGElement | null>;
}) {
  const capturedPointerId = React.useRef<number | null>(null);
  const getPointerPosition = React.useCallback(
    (svg: SVGSVGElement, clientX: number, clientY: number) => {
      const rect = svg.getBoundingClientRect();
      const scaleX = rect.width / canvasWidth;
      const scaleY = rect.height / classroomHeight;
      return {
        x: (clientX - rect.left) / scaleX,
        y: (clientY - rect.top) / scaleY,
      };
    },
    [canvasWidth, classroomHeight],
  );

  // Helper to optionally snap positions to the grid
  const snap = React.useCallback(
    (v: number) =>
      snapToGrid ? Math.round(v / GRID_SNAP_SIZE) * GRID_SNAP_SIZE : v,
    [snapToGrid],
  );

  const dragInfo = React.useRef<{
    tables: { index: number; startX: number; startY: number }[];
    startMouseX: number;
    startMouseY: number;
  }>({ tables: [], startMouseX: 0, startMouseY: 0 });
  const hasDragged = React.useRef(false); // Tracks whether tables have been dragged

  const resetDragState = React.useCallback(() => {
    dragInfo.current.tables = [];
    dragInfo.current.startMouseX = 0;
    dragInfo.current.startMouseY = 0;
    hasDragged.current = false;
  }, []);

  const dropTemplateAt = React.useCallback(
    (
      templateType: TableTemplateType,
      clientX: number,
      clientY: number,
      svg: SVGSVGElement,
    ) => {
      const rect = svg.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return false;
      }
      const type = templateType;
      const preset = getTablePresets()[type];
      snapshot();
      const { x: dropX, y: dropY } = getPointerPosition(svg, clientX, clientY);
      // Align by front edge (right side toward blackboard)
      // x position: right edge of table aligns with drop point
      const frontAlignedX = dropX - preset.width;
      const centeredY = dropY - preset.height / 2;
      const snappedPosition = snapToGrid
        ? { x: snap(frontAlignedX), y: snap(centeredY) }
        : { x: frontAlignedX, y: centeredY };

      const x = Math.min(
        Math.max(0, snappedPosition.x),
        classroomWidth - preset.width,
      );
      const y = Math.min(
        Math.max(0, snappedPosition.y),
        classroomHeight - preset.height,
      );
      const newTable = {
        x,
        y,
        width: preset.width,
        height: preset.height,
        rotation: 0, // All templates use 0° (dimensions are optimized)
        seatCount: preset.seatCount,
        locked: false,
        zIndex: 0,
        templateType: type,
      };

      const transactionResult = runSceneTransaction(
        ({ tables, seating, scene }) => {
          const startIndex = tables.length;
          const tableWithIndex = { ...newTable, zIndex: startIndex };
          const combinedTables = [...tables, tableWithIndex].map(
            (table, idx) => ({
              ...table,
              zIndex: idx,
            }),
          );
          const updatedSeating = addSeatingForTables(seating, [tableWithIndex]);
          return {
            tables: combinedTables,
            seating: updatedSeating,
            scene: { ...scene, tables: combinedTables },
          };
        },
      );

      const nextTables = transactionResult.tables ?? [];
      if (nextTables.length > 0) {
        setSelectedTableIds([nextTables.length - 1]);
      }
      return true;
    },
    [
      classroomHeight,
      classroomWidth,
      getPointerPosition,
      runSceneTransaction,
      setSelectedTableIds,
      snap,
      snapToGrid,
      snapshot,
    ],
  );

  const initializeDragFromSelection = React.useCallback(
    (selection: number[], startPoint: { x: number; y: number }) => {
      dragInfo.current.startMouseX = startPoint.x;
      dragInfo.current.startMouseY = startPoint.y;
      dragInfo.current.tables = selection
        .filter((index) => !sceneTables[index]?.locked)
        .map((index) => ({
          index,
          startX: sceneTables[index].x,
          startY: sceneTables[index].y,
        }));
      hasDragged.current = false;
    },
    [sceneTables],
  );

  const updateDragSelection = React.useCallback(
    (scenePoint: { x: number; y: number }) => {
      if (dragInfo.current.tables.length === 0) {
        return;
      }
      if (!hasDragged.current) {
        snapshot(); // Take snapshot once when dragging starts
        triggerHapticFeedback('dragStart');
        hasDragged.current = true;
      }

      const startMouse = {
        x: dragInfo.current.startMouseX,
        y: dragInfo.current.startMouseY,
      };
      const delta = calculateDragDelta(startMouse, scenePoint, snapToGrid);
      const tableIndices = dragInfo.current.tables.map((t) => t.index);
      const startPositions = dragInfo.current.tables.map((t) => ({
        x: t.startX,
        y: t.startY,
      }));
      updateSceneTables((tables) =>
        applyDragMovement(tables || [], tableIndices, startPositions, delta, {
          width: classroomWidth,
          height: classroomHeight,
        }),
      );
    },
    [classroomHeight, classroomWidth, snapToGrid, snapshot, updateSceneTables],
  );

  const finalizeDragInteraction = React.useCallback(() => {
    if (hasDragged.current) {
      triggerHapticFeedback('drop');
      commitScene();
    }
    resetDragState();
  }, [commitScene, resetDragState]);

  const {
    templateDragPreview,
    startTemplateDrag,
    isTemplateDragging,
    cancelTemplateDrag,
  } = useTemplateDrag({
    canvasRef,
    dropTemplateAt,
  });

  const resetCapturedPointer = React.useCallback(() => {
    const pointerId = capturedPointerId.current;
    if (pointerId === null) {
      return;
    }
    const svg = canvasRef.current;
    if (svg && typeof svg.releasePointerCapture === 'function') {
      svg.releasePointerCapture(pointerId);
    }
    capturedPointerId.current = null;
  }, [canvasRef]);

  const cancelSelectionInteraction = React.useCallback(() => {
    cancelTemplateDrag();
    resetCapturedPointer();
    resetDragState();
  }, [cancelTemplateDrag, resetCapturedPointer, resetDragState]);

  const startTablePointerDrag = (e: React.PointerEvent<SVGGElement>) => {
    if (isTemplateDragging) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (svg && typeof svg.setPointerCapture === 'function') {
      svg.setPointerCapture(e.pointerId);
      capturedPointerId.current = e.pointerId;
    } else {
      capturedPointerId.current = null;
    }
  };

  const releaseTablePointerCapture = React.useCallback(
    (pointerId: number) => {
      if (capturedPointerId.current !== pointerId) {
        return;
      }
      const svg = canvasRef.current;
      if (svg && typeof svg.releasePointerCapture === 'function') {
        svg.releasePointerCapture(pointerId);
      }
      capturedPointerId.current = null;
    },
    [canvasRef],
  );

  React.useEffect(() => cancelTemplateDrag, [cancelTemplateDrag]);

  return {
    startTemplateDrag,
    startTablePointerDrag,
    templateDragPreview,
    initializeDragFromSelection,
    updateDragSelection,
    finalizeDragInteraction,
    releaseTablePointerCapture,
    cancelSelectionInteraction,
  };
}
