// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import {
  GRID_SNAP_SIZE,
  getTablePresets,
  calculateDragDelta,
  applyDragMovement,
  getRotatedAabbHalfExtents,
  clampCenterToRoom,
} from '@/utils';
import { triggerHapticFeedback } from '@/utils/touch/hapticFeedback';
import { addSeatingForTables } from '@/utils/seating/seatingOperations';
import type {
  ClassroomTable,
  ClassroomFeature,
  TableTemplateType,
} from '@/types';
import type { SceneTransactionRunner } from '@/hooks/scene/useSceneManager';
import { useTemplateDrag } from '@/hooks/canvas/useTemplateDrag';

// Moves the selected free (movable) features by a shared delta, clamping each
// feature's rotated footprint to the room. Wall-anchored features are left in
// place so a group drag never rips them off their wall.
export const applyFeatureGroupDelta = (
  features: ClassroomFeature[],
  captured: Map<string, { x: number; y: number }>,
  delta: { x: number; y: number },
  bounds: { width: number; height: number },
): ClassroomFeature[] => {
  if (captured.size === 0) {
    return features;
  }
  return features.map((feature) => {
    const start = captured.get(feature.id);
    if (!start || feature.anchor !== 'free' || !feature.movable) {
      return feature;
    }
    const { halfWidth, halfHeight } = getRotatedAabbHalfExtents(
      feature.width,
      feature.height,
      feature.rotation ?? 0,
    );
    const centerX = clampCenterToRoom(
      start.x + feature.width / 2 + delta.x,
      halfWidth,
      bounds.width,
    );
    const centerY = clampCenterToRoom(
      start.y + feature.height / 2 + delta.y,
      halfHeight,
      bounds.height,
    );
    return {
      ...feature,
      x: centerX - feature.width / 2,
      y: centerY - feature.height / 2,
    };
  });
};

export type TemplateDropPlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
  seatCount: number;
};

// Placement math shared by the palette drag preview and the actual drop so
// the live ghost sits exactly where the table will land.
export const computeTemplateDropPlacement = (
  templateType: TableTemplateType,
  dropX: number,
  dropY: number,
  snapToGrid: boolean,
  classroomWidth: number,
  classroomHeight: number,
): TemplateDropPlacement => {
  const preset = getTablePresets()[templateType];
  // Align by front edge (right side toward blackboard):
  // the table's right edge aligns with the drop point.
  const frontAlignedX = dropX - preset.width;
  const centeredY = dropY - preset.height / 2;
  const snapValue = (value: number) =>
    snapToGrid ? Math.round(value / GRID_SNAP_SIZE) * GRID_SNAP_SIZE : value;
  const x = Math.min(
    Math.max(0, snapValue(frontAlignedX)),
    classroomWidth - preset.width,
  );
  const y = Math.min(
    Math.max(0, snapValue(centeredY)),
    classroomHeight - preset.height,
  );
  return {
    x,
    y,
    width: preset.width,
    height: preset.height,
    seatCount: preset.seatCount,
  };
};

// Hook handling table interactions such as selection, dragging and template drops
export default function useTableInteraction({
  sceneTables,
  sceneFeatures,
  selectedFeatureIds,
  setSceneFeatures,
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
  sceneFeatures: ClassroomFeature[];
  selectedFeatureIds: string[];
  setSceneFeatures: React.Dispatch<React.SetStateAction<ClassroomFeature[]>>;
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

  const dragInfo = React.useRef<{
    tables: { index: number; startX: number; startY: number }[];
    features: Map<string, { x: number; y: number }>;
    startMouseX: number;
    startMouseY: number;
  }>({ tables: [], features: new Map(), startMouseX: 0, startMouseY: 0 });
  const hasDragged = React.useRef(false); // Tracks whether tables have been dragged

  const resetDragState = React.useCallback(() => {
    dragInfo.current.tables = [];
    dragInfo.current.features = new Map();
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
      snapshot();
      const { x: dropX, y: dropY } = getPointerPosition(svg, clientX, clientY);
      const placement = computeTemplateDropPlacement(
        type,
        dropX,
        dropY,
        snapToGrid,
        classroomWidth,
        classroomHeight,
      );
      const newTable = {
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
        rotation: 0, // All templates use 0° (dimensions are optimized)
        seatCount: placement.seatCount,
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
      snapToGrid,
      snapshot,
    ],
  );

  // Client-coordinate resolver for the drag preview, so the ghost uses the
  // exact placement math of the drop.
  const getTemplateDropPlacement = React.useCallback(
    (
      templateType: TableTemplateType,
      clientX: number,
      clientY: number,
    ): TemplateDropPlacement | null => {
      const svg = canvasRef.current;
      if (!svg) {
        return null;
      }
      const { x, y } = getPointerPosition(svg, clientX, clientY);
      return computeTemplateDropPlacement(
        templateType,
        x,
        y,
        snapToGrid,
        classroomWidth,
        classroomHeight,
      );
    },
    [
      canvasRef,
      classroomHeight,
      classroomWidth,
      getPointerPosition,
      snapToGrid,
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
      // Capture start positions of the co-selected movable features so a table
      // group drag moves the whole unified selection together.
      const capturedFeatures = new Map<string, { x: number; y: number }>();
      sceneFeatures.forEach((feature) => {
        if (
          selectedFeatureIds.includes(feature.id) &&
          feature.anchor === 'free' &&
          feature.movable
        ) {
          capturedFeatures.set(feature.id, { x: feature.x, y: feature.y });
        }
      });
      dragInfo.current.features = capturedFeatures;
      hasDragged.current = false;
    },
    [sceneTables, sceneFeatures, selectedFeatureIds],
  );

  const updateDragSelection = React.useCallback(
    (scenePoint: { x: number; y: number }) => {
      if (
        dragInfo.current.tables.length === 0 &&
        dragInfo.current.features.size === 0
      ) {
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

      // Move any co-selected movable features by the same delta. Features can
      // extend into the wider board area, so they clamp against canvasWidth.
      if (dragInfo.current.features.size > 0) {
        const capturedFeatures = dragInfo.current.features;
        setSceneFeatures((features) =>
          applyFeatureGroupDelta(features, capturedFeatures, delta, {
            width: canvasWidth,
            height: classroomHeight,
          }),
        );
      }
    },
    [
      canvasWidth,
      classroomHeight,
      classroomWidth,
      snapToGrid,
      snapshot,
      setSceneFeatures,
      updateSceneTables,
    ],
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
    getTemplateDropPlacement,
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
