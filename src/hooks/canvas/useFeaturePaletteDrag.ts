// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type {
  ClassroomFeature,
  ClassroomFeatureType,
  ClassroomFeatureAnchor,
  ClassroomTable,
} from '@/types';
import { useCanvasBoundingRect } from '@/hooks/canvas/useCanvasBoundingRect';
import {
  generateId,
  getRotatedAabbHalfExtents,
  GRID_SNAP_SIZE,
  snapRotationAngle,
  calculateDragDelta,
  applyDragMovement,
} from '@/utils';
import type { SceneTransactionRunner } from '@/hooks/scene/useSceneManager';
import type { FeatureContextMenuState } from '@/hooks/useContextMenus';
import type { FeatureTemplate } from '@/hooks/canvas/featureTemplates';
import { applyFeatureGroupDelta } from '@/hooks/useTableInteraction';

export type FeaturePaletteItem = FeatureTemplate & {
  icon: React.ReactNode;
};

export type FeatureDragPreview = {
  type: ClassroomFeatureType;
  width: number;
  height: number;
  clientX: number;
  clientY: number;
  overCanvas: boolean;
  label: string;
  canvasX: number | null;
  canvasY: number | null;
};

export type FeaturePlacement = {
  x: number;
  y: number;
  anchor: ClassroomFeatureAnchor;
  width: number;
  height: number;
};

type FeatureDragUpdatePayload = FeaturePlacement & {
  featureId: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Clamps a feature center so its rotated footprint stays inside the room.
 * Falls back to centering when the footprint is larger than the room.
 */
const clampCenterToRoom = (value: number, halfExtent: number, size: number) =>
  halfExtent * 2 > size
    ? size / 2
    : clamp(value, halfExtent, size - halfExtent);

const snapToGridValue = (value: number, shouldSnap: boolean) =>
  shouldSnap ? Math.round(value / GRID_SNAP_SIZE) * GRID_SNAP_SIZE : value;

const determineAnchorForPoint = (
  x: number,
  y: number,
  classroomWidth: number,
  classroomHeight: number,
): ClassroomFeatureAnchor => {
  const distances = {
    left: x,
    right: classroomWidth - x,
    top: y,
    bottom: classroomHeight - y,
  } as const;

  let anchor: ClassroomFeatureAnchor = 'left';
  let minDistance = Number.POSITIVE_INFINITY;

  (['left', 'right', 'top', 'bottom'] as const).forEach((key) => {
    if (distances[key] < minDistance) {
      anchor = key;
      minDistance = distances[key];
    }
  });

  return anchor;
};

const getOrientedDimensions = (
  template: FeatureTemplate,
  anchor: ClassroomFeatureAnchor,
) => {
  const isHorizontalWall = anchor === 'top' || anchor === 'bottom';
  const isVerticalWall = anchor === 'left' || anchor === 'right';

  let width = template.width;
  let height = template.height;

  if (isHorizontalWall) {
    if (height > width) {
      width = template.height;
      height = template.width;
    }
  } else if (isVerticalWall) {
    if (width > height) {
      width = template.height;
      height = template.width;
    }
  }

  return { width, height };
};

export const placeMovableFeatureBase = (
  template: FeatureTemplate,
  desiredX: number,
  desiredY: number,
  snapToGrid: boolean,
  classroomWidth: number,
  classroomHeight: number,
  rotation = 0,
): FeaturePlacement => {
  // Rotation happens around the feature center, so the clamp works on the
  // center against the rotated footprint (AABB). This lets e.g. a
  // 90°-rotated cabinet sit flush against the side walls; the returned
  // top-left of the unrotated rect may legitimately be negative.
  const { halfWidth, halfHeight } = getRotatedAabbHalfExtents(
    template.width,
    template.height,
    rotation,
  );
  const centerX = clampCenterToRoom(
    snapToGridValue(desiredX, snapToGrid) + template.width / 2,
    halfWidth,
    classroomWidth,
  );
  const centerY = clampCenterToRoom(
    snapToGridValue(desiredY, snapToGrid) + template.height / 2,
    halfHeight,
    classroomHeight,
  );
  return {
    x: centerX - template.width / 2,
    y: centerY - template.height / 2,
    anchor: 'free',
    width: template.width,
    height: template.height,
  };
};

export const placeFixedFeatureBase = (
  template: FeatureTemplate,
  pointerX: number,
  pointerY: number,
  snapToGrid: boolean,
  classroomWidth: number,
  classroomHeight: number,
): FeaturePlacement => {
  const anchor = determineAnchorForPoint(
    pointerX,
    pointerY,
    classroomWidth,
    classroomHeight,
  );

  const { width: orientedWidth, height: orientedHeight } =
    getOrientedDimensions(template, anchor);

  switch (anchor) {
    case 'left':
      return {
        x: 0,
        y: clamp(
          snapToGridValue(pointerY - orientedHeight / 2, snapToGrid),
          0,
          classroomHeight - orientedHeight,
        ),
        anchor,
        width: orientedWidth,
        height: orientedHeight,
      };
    case 'right':
      return {
        x: classroomWidth - orientedWidth,
        y: clamp(
          snapToGridValue(pointerY - orientedHeight / 2, snapToGrid),
          0,
          classroomHeight - orientedHeight,
        ),
        anchor,
        width: orientedWidth,
        height: orientedHeight,
      };
    case 'top':
      return {
        x: clamp(
          snapToGridValue(pointerX - orientedWidth / 2, snapToGrid),
          0,
          classroomWidth - orientedWidth,
        ),
        y: 0,
        anchor,
        width: orientedWidth,
        height: orientedHeight,
      };
    case 'bottom':
    default:
      return {
        x: clamp(
          snapToGridValue(pointerX - orientedWidth / 2, snapToGrid),
          0,
          classroomWidth - orientedWidth,
        ),
        y: classroomHeight - orientedHeight,
        anchor: 'bottom',
        width: orientedWidth,
        height: orientedHeight,
      };
  }
};

export const rotateFeatureForAnchor = (
  feature: ClassroomFeature,
  anchor: ClassroomFeatureAnchor,
): ClassroomFeature => {
  if (
    feature.type !== 'window' &&
    feature.type !== 'door' &&
    feature.type !== 'board' &&
    feature.type !== 'whiteboard'
  ) {
    return feature;
  }

  let rotation: number;
  switch (anchor) {
    case 'left':
      rotation = 0;
      break;
    case 'right':
      rotation = 180;
      break;
    case 'top':
      rotation = -90;
      break;
    case 'bottom':
      rotation = 90;
      break;
    case 'free':
    default:
      rotation = feature.rotation ?? 0;
      break;
  }

  return { ...feature, rotation };
};

type UseFeaturePaletteDragOptions = {
  featureTemplateMap: Map<ClassroomFeatureType, FeatureTemplate>;
  sceneFeatures: ClassroomFeature[];
  runSceneTransaction: SceneTransactionRunner;
  setSceneFeatures: React.Dispatch<React.SetStateAction<ClassroomFeature[]>>;
  snapshot: () => void;
  snapToGrid: boolean;
  classroomWidth: number;
  classroomHeight: number;
  // Unified selection context, used to move a mixed group when a co-selected
  // feature is grabbed.
  selectedFeatureIds: string[];
  selectedTableIds: number[];
  sceneTables: ClassroomTable[];
  updateSceneTables: (
    updateFn: (tables: ClassroomTable[]) => ClassroomTable[],
  ) => void;
  commitScene: () => void;
  toSceneCoordinates: (
    svg: SVGSVGElement,
    clientX: number,
    clientY: number,
  ) => { x: number; y: number };
  sceneToClient: (point: {
    x: number;
    y: number;
  }) => { x: number; y: number } | null;
  canvasRef: React.RefObject<SVGSVGElement | null>;
  onFeatureAdded?: (feature: ClassroomFeature) => void;
  openFeatureContextMenu?: (
    menu: FeatureContextMenuState,
    position?: { left: number; top: number },
  ) => void;
  closeFeatureContextMenu?: () => void;
  /**
   * Selects a feature as part of the unified selection. `additive` (Shift/Ctrl)
   * toggles the feature within the current selection; otherwise a plain click
   * selects only this feature and clears the rest of the selection.
   */
  selectFeature: (featureId: string, additive: boolean) => void;
};

export function useFeaturePaletteDrag({
  featureTemplateMap,
  sceneFeatures,
  runSceneTransaction,
  setSceneFeatures,
  snapshot,
  snapToGrid,
  classroomWidth,
  classroomHeight,
  selectedFeatureIds,
  selectedTableIds,
  sceneTables,
  updateSceneTables,
  commitScene,
  toSceneCoordinates,
  sceneToClient,
  canvasRef,
  onFeatureAdded,
  openFeatureContextMenu,
  closeFeatureContextMenu,
  selectFeature,
}: UseFeaturePaletteDragOptions) {
  const LONG_PRESS_DURATION = 500;
  const DRAG_DISTANCE_THRESHOLD = 6;
  const featureDragRef = React.useRef<{
    type: ClassroomFeatureType;
    pointerId: number;
  } | null>(null);
  const activeFeatureDragRef = React.useRef<{
    featureId: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
    anchor: ClassroomFeatureAnchor;
    type: ClassroomFeatureType;
  } | null>(null);
  const pendingFeatureRef = React.useRef<{
    feature: ClassroomFeature;
    template: FeatureTemplate;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    pointerType: string;
  } | null>(null);
  const featureLongPressTimerRef = React.useRef<number | null>(null);
  const pendingMoveListenerRef = React.useRef<
    ((event: PointerEvent) => void) | null
  >(null);
  const pendingUpListenerRef = React.useRef<
    ((event: PointerEvent) => void) | null
  >(null);
  const featureRotationRef = React.useRef<{
    featureId: string;
    pointerId: number;
    centerClient: { x: number; y: number };
    initialRotation: number;
    startAngle: number;
  } | null>(null);
  const [featureDragPreview, setFeatureDragPreview] =
    React.useState<FeatureDragPreview | null>(null);
  const featureDragPlacementRef = React.useRef<FeatureDragUpdatePayload | null>(
    null,
  );
  const featureDragFrameRef = React.useRef<number | null>(null);
  const latestFeaturesRef = React.useRef(sceneFeatures);
  const { canvasRectRef } = useCanvasBoundingRect(canvasRef);
  const palettePointerRectRef = React.useRef<Map<number, DOMRectReadOnly>>(
    new Map(),
  );

  // Live refs for the unified selection, read inside stable pointer listeners.
  const selectedFeatureIdsRef = React.useRef(selectedFeatureIds);
  const selectedTableIdsRef = React.useRef(selectedTableIds);
  const sceneTablesRef = React.useRef(sceneTables);
  const groupDragRef = React.useRef<{
    pointerId: number;
    startScene: { x: number; y: number };
    capturedFeatures: Map<string, { x: number; y: number }>;
    capturedTables: { index: number; startX: number; startY: number }[];
    moved: boolean;
  } | null>(null);

  React.useEffect(() => {
    latestFeaturesRef.current = sceneFeatures;
  }, [sceneFeatures]);

  React.useEffect(() => {
    selectedFeatureIdsRef.current = selectedFeatureIds;
  }, [selectedFeatureIds]);

  React.useEffect(() => {
    selectedTableIdsRef.current = selectedTableIds;
  }, [selectedTableIds]);

  React.useEffect(() => {
    sceneTablesRef.current = sceneTables;
  }, [sceneTables]);

  const getCanvasPointerMetrics = React.useCallback(
    (pointerId: number, clientX: number, clientY: number) => {
      const rect =
        palettePointerRectRef.current.get(pointerId) ?? canvasRectRef.current;
      if (!rect) {
        return {
          overCanvas: false,
          canvasX: null,
          canvasY: null,
        };
      }
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;
      const overCanvas =
        canvasX >= 0 &&
        canvasX <= rect.width &&
        canvasY >= 0 &&
        canvasY <= rect.height;
      return { overCanvas, canvasX, canvasY };
    },
    [canvasRectRef],
  );

  const cachePalettePointerRect = React.useCallback(
    (pointerId: number) => {
      const rect = canvasRectRef.current;
      if (!rect) {
        palettePointerRectRef.current.delete(pointerId);
        return null;
      }
      palettePointerRectRef.current.set(pointerId, rect);
      return rect;
    },
    [canvasRectRef],
  );

  const releasePalettePointerRect = React.useCallback((pointerId: number) => {
    palettePointerRectRef.current.delete(pointerId);
  }, []);

  const applyBufferedFeatureDragUpdate = React.useCallback(
    (update: FeatureDragUpdatePayload) => {
      setSceneFeatures((prev) => {
        const next = prev.map((feature) =>
          feature.id === update.featureId
            ? rotateFeatureForAnchor(
                {
                  ...feature,
                  x: update.x,
                  y: update.y,
                  anchor: update.anchor,
                  width: update.width,
                  height: update.height,
                },
                update.anchor,
              )
            : feature,
        );
        latestFeaturesRef.current = next;
        return next;
      });
    },
    [setSceneFeatures],
  );

  const runFeatureDragUpdate = React.useCallback(() => {
    featureDragFrameRef.current = null;
    const update = featureDragPlacementRef.current;
    if (!update) {
      return;
    }
    featureDragPlacementRef.current = null;
    applyBufferedFeatureDragUpdate(update);
  }, [applyBufferedFeatureDragUpdate]);

  const scheduleFeatureDragUpdate = React.useCallback(() => {
    if (featureDragFrameRef.current !== null) {
      return;
    }
    featureDragFrameRef.current = requestAnimationFrame(runFeatureDragUpdate);
  }, [runFeatureDragUpdate]);

  const cancelFeatureDragUpdate = React.useCallback(() => {
    if (featureDragFrameRef.current !== null) {
      cancelAnimationFrame(featureDragFrameRef.current);
      featureDragFrameRef.current = null;
    }
    featureDragPlacementRef.current = null;
  }, []);

  const clearFeatureLongPressTimer = React.useCallback(() => {
    if (featureLongPressTimerRef.current !== null) {
      window.clearTimeout(featureLongPressTimerRef.current);
      featureLongPressTimerRef.current = null;
    }
  }, []);

  const clearPendingFeatureListeners = React.useCallback(() => {
    if (pendingMoveListenerRef.current) {
      window.removeEventListener('pointermove', pendingMoveListenerRef.current);
      pendingMoveListenerRef.current = null;
    }
    if (pendingUpListenerRef.current) {
      window.removeEventListener('pointerup', pendingUpListenerRef.current);
      pendingUpListenerRef.current = null;
    }
  }, []);

  const cancelPendingFeatureInteraction = React.useCallback(() => {
    pendingFeatureRef.current = null;
    clearFeatureLongPressTimer();
    clearPendingFeatureListeners();
  }, [clearFeatureLongPressTimer, clearPendingFeatureListeners]);

  const addFeatureFromTemplate = React.useCallback(
    (type: ClassroomFeatureType, sceneX: number, sceneY: number) => {
      const template = featureTemplateMap.get(type);
      if (!template) {
        return;
      }

      const initialRotation = type === 'podium' ? 90 : 0;
      const placement = template.movable
        ? placeMovableFeatureBase(
            template,
            sceneX - template.width / 2,
            sceneY - template.height / 2,
            snapToGrid,
            classroomWidth,
            classroomHeight,
            initialRotation,
          )
        : placeFixedFeatureBase(
            template,
            sceneX,
            sceneY,
            snapToGrid,
            classroomWidth,
            classroomHeight,
          );

      const featureWidth = placement.width ?? template.width;
      const featureHeight = placement.height ?? template.height;

      let feature: ClassroomFeature = {
        id: generateId(),
        type,
        visible: true,
        x: placement.x,
        y: placement.y,
        width: featureWidth,
        height: featureHeight,
        movable: template.movable,
        anchor: placement.anchor,
        label: template.label,
        rotation: initialRotation,
      };

      if (!template.movable) {
        feature = rotateFeatureForAnchor(feature, placement.anchor);
      }

      snapshot();
      runSceneTransaction(({ features, scene, tables, seating }) => {
        const existing = features ?? scene.features ?? [];
        const filtered = template.allowMultiple
          ? existing
          : existing.filter((existingFeature) => existingFeature.type !== type);
        const nextFeatures = [...filtered, feature];
        return {
          features: nextFeatures,
          scene: { ...scene, features: nextFeatures },
          tables,
          seating,
        };
      });

      onFeatureAdded?.(feature);
      closeFeatureContextMenu?.();
    },
    [
      featureTemplateMap,
      snapshot,
      runSceneTransaction,
      onFeatureAdded,
      closeFeatureContextMenu,
      snapToGrid,
      classroomWidth,
      classroomHeight,
    ],
  );

  const handlePalettePointerMove = React.useCallback(
    (event: PointerEvent) => {
      const drag = featureDragRef.current;
      if (!drag) {
        return;
      }
      const template = featureTemplateMap.get(drag.type);
      if (!template) {
        return;
      }
      const metrics = getCanvasPointerMetrics(
        event.pointerId,
        event.clientX,
        event.clientY,
      );

      setFeatureDragPreview({
        type: drag.type,
        width: template.width,
        height: template.height,
        clientX: event.clientX,
        clientY: event.clientY,
        overCanvas: metrics.overCanvas,
        canvasX: metrics.canvasX,
        canvasY: metrics.canvasY,
        label: template.label,
      });
    },
    [featureTemplateMap, getCanvasPointerMetrics],
  );

  const commitFeatureState = React.useCallback(
    (nextFeatures: ClassroomFeature[]) => {
      runSceneTransaction(({ scene, tables, seating }) => ({
        features: nextFeatures,
        scene: { ...scene, features: nextFeatures },
        tables,
        seating,
      }));
    },
    [runSceneTransaction],
  );

  const handleFeatureDragMove = React.useCallback(
    (event: PointerEvent) => {
      const drag = activeFeatureDragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }
      const canvas = canvasRef.current;
      const template = featureTemplateMap.get(drag.type);
      if (!canvas || !template) {
        return;
      }
      const { x: pointerX, y: pointerY } = toSceneCoordinates(
        canvas,
        event.clientX,
        event.clientY,
      );

      let placement: FeaturePlacement;
      if (template.movable) {
        const desiredX = pointerX - drag.offsetX;
        const desiredY = pointerY - drag.offsetY;
        // The drag only knows the palette template; the live feature carries
        // the user-applied rotation needed for footprint-aware clamping.
        const liveRotation =
          latestFeaturesRef.current.find(
            (feature) => feature.id === drag.featureId,
          )?.rotation ?? 0;
        placement = placeMovableFeatureBase(
          template,
          desiredX,
          desiredY,
          snapToGrid,
          classroomWidth,
          classroomHeight,
          liveRotation,
        );
      } else {
        placement = placeFixedFeatureBase(
          template,
          pointerX,
          pointerY,
          snapToGrid,
          classroomWidth,
          classroomHeight,
        );
      }

      featureDragPlacementRef.current = {
        featureId: drag.featureId,
        x: placement.x,
        y: placement.y,
        anchor: placement.anchor,
        width: placement.width ?? template.width,
        height: placement.height ?? template.height,
      };
      scheduleFeatureDragUpdate();
    },
    [
      canvasRef,
      classroomHeight,
      classroomWidth,
      featureTemplateMap,
      scheduleFeatureDragUpdate,
      snapToGrid,
      toSceneCoordinates,
    ],
  );

  const resetActiveDrag = React.useCallback(
    function resetActiveDrag() {
      window.removeEventListener('pointermove', handleFeatureDragMove);
      window.removeEventListener('pointerup', resetActiveDrag);
      cancelFeatureDragUpdate();

      // Only commit if we actually had an active drag
      if (activeFeatureDragRef.current) {
        snapshot();
        commitFeatureState(latestFeaturesRef.current);
      }

      activeFeatureDragRef.current = null;
    },
    [
      cancelFeatureDragUpdate,
      commitFeatureState,
      handleFeatureDragMove,
      snapshot,
    ],
  );

  const clearPaletteDrag = React.useCallback(
    (pointerId?: number | null) => {
      window.removeEventListener('pointermove', handlePalettePointerMove);
      const activePointerId =
        pointerId ?? featureDragRef.current?.pointerId ?? null;
      featureDragRef.current = null;
      if (activePointerId !== null) {
        releasePalettePointerRect(activePointerId);
      }
      setFeatureDragPreview(null);
    },
    [handlePalettePointerMove, releasePalettePointerRect],
  );

  const handlePalettePointerUp = React.useCallback(
    (event: PointerEvent) => {
      const drag = featureDragRef.current;
      const canvas = canvasRef.current;
      if (!drag || !canvas) {
        clearPaletteDrag(event.pointerId);
        return;
      }

      const metrics = getCanvasPointerMetrics(
        event.pointerId,
        event.clientX,
        event.clientY,
      );

      if (metrics.overCanvas) {
        const { x, y } = toSceneCoordinates(
          canvas,
          event.clientX,
          event.clientY,
        );
        addFeatureFromTemplate(drag.type, x, y);
      }

      clearPaletteDrag(event.pointerId);
    },
    [
      addFeatureFromTemplate,
      canvasRef,
      clearPaletteDrag,
      getCanvasPointerMetrics,
      toSceneCoordinates,
    ],
  );

  const handleFeatureRotateMove = React.useCallback(
    (event: PointerEvent) => {
      const rotationState = featureRotationRef.current;
      if (!rotationState || event.pointerId !== rotationState.pointerId) {
        return;
      }

      const currentAngle = Math.atan2(
        event.clientY - rotationState.centerClient.y,
        event.clientX - rotationState.centerClient.x,
      );
      const deltaDegrees =
        ((currentAngle - rotationState.startAngle) * 180) / Math.PI;
      const rawRotation = rotationState.initialRotation + deltaDegrees;
      const snapped = snapRotationAngle(rawRotation);
      const nextRotation = snapped.normalized;

      setSceneFeatures((prev) =>
        prev.map((feature) => {
          if (feature.id !== rotationState.featureId) {
            return feature;
          }
          // Re-clamp around the fixed center so a feature rotated while
          // flush against a wall doesn't end up sticking out of the room.
          const { halfWidth, halfHeight } = getRotatedAabbHalfExtents(
            feature.width,
            feature.height,
            nextRotation,
          );
          const centerX = clampCenterToRoom(
            feature.x + feature.width / 2,
            halfWidth,
            classroomWidth,
          );
          const centerY = clampCenterToRoom(
            feature.y + feature.height / 2,
            halfHeight,
            classroomHeight,
          );
          return {
            ...feature,
            rotation: nextRotation,
            x: centerX - feature.width / 2,
            y: centerY - feature.height / 2,
          };
        }),
      );
    },
    [setSceneFeatures, classroomWidth, classroomHeight],
  );

  const handleFeatureRotateEnd = React.useCallback(
    function handleFeatureRotateEnd(event: PointerEvent) {
      const rotationState = featureRotationRef.current;
      if (!rotationState || event.pointerId !== rotationState.pointerId) {
        return;
      }

      window.removeEventListener('pointermove', handleFeatureRotateMove);
      window.removeEventListener('pointerup', handleFeatureRotateEnd);
      featureRotationRef.current = null;
      snapshot();
      commitFeatureState(latestFeaturesRef.current);
    },
    [commitFeatureState, handleFeatureRotateMove, snapshot],
  );

  const handleFeatureRotateStart = React.useCallback(
    (
      feature: ClassroomFeature,
      event: React.PointerEvent<SVGElement>,
    ): void => {
      // Every freely placed, movable feature (podium, cabinet, divider, …)
      // can be rotated — matching the rotate handle shown on the canvas.
      if (feature.anchor !== 'free' || !feature.movable) {
        return;
      }
      const centerScene = {
        x: feature.x + feature.width / 2,
        y: feature.y + feature.height / 2,
      };
      const centerClient = sceneToClient(centerScene);
      if (!centerClient) {
        return;
      }

      cancelPendingFeatureInteraction();
      selectFeature(feature.id, false);

      featureRotationRef.current = {
        featureId: feature.id,
        pointerId: event.pointerId,
        centerClient,
        initialRotation: feature.rotation ?? 0,
        startAngle: Math.atan2(
          event.clientY - centerClient.y,
          event.clientX - centerClient.x,
        ),
      };

      if (typeof event.currentTarget.setPointerCapture === 'function') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      event.stopPropagation();
      event.preventDefault();

      window.addEventListener('pointermove', handleFeatureRotateMove);
      window.addEventListener('pointerup', handleFeatureRotateEnd);
    },
    [
      cancelPendingFeatureInteraction,
      handleFeatureRotateEnd,
      handleFeatureRotateMove,
      sceneToClient,
      selectFeature,
    ],
  );

  // --- Unified group drag (moving a mixed table + feature selection by
  // grabbing one of the selected features) ---
  const handleGroupDragMove = React.useCallback(
    (event: PointerEvent) => {
      const state = groupDragRef.current;
      if (!state || event.pointerId !== state.pointerId) {
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const point = toSceneCoordinates(canvas, event.clientX, event.clientY);
      const delta = calculateDragDelta(state.startScene, point, snapToGrid);
      state.moved = true;

      setSceneFeatures((features) => {
        const next = applyFeatureGroupDelta(
          features,
          state.capturedFeatures,
          delta,
          { width: classroomWidth, height: classroomHeight },
        );
        latestFeaturesRef.current = next;
        return next;
      });

      if (state.capturedTables.length > 0) {
        const indices = state.capturedTables.map((entry) => entry.index);
        const starts = state.capturedTables.map((entry) => ({
          x: entry.startX,
          y: entry.startY,
        }));
        updateSceneTables((tables) =>
          applyDragMovement(tables || [], indices, starts, delta, {
            width: classroomWidth,
            height: classroomHeight,
          }),
        );
      }
    },
    [
      canvasRef,
      classroomHeight,
      classroomWidth,
      setSceneFeatures,
      snapToGrid,
      toSceneCoordinates,
      updateSceneTables,
    ],
  );

  const endGroupDrag = React.useCallback(
    function endGroupDrag(event: PointerEvent) {
      const state = groupDragRef.current;
      if (!state || event.pointerId !== state.pointerId) {
        return;
      }
      window.removeEventListener('pointermove', handleGroupDragMove);
      window.removeEventListener('pointerup', endGroupDrag);
      groupDragRef.current = null;
      if (state.moved) {
        snapshot();
        commitScene();
      }
    },
    [commitScene, handleGroupDragMove, snapshot],
  );

  const startGroupFeatureDrag = React.useCallback(
    (pointerId: number, clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      cancelPendingFeatureInteraction();

      const capturedFeatures = new Map<string, { x: number; y: number }>();
      latestFeaturesRef.current.forEach((feature) => {
        if (
          selectedFeatureIdsRef.current.includes(feature.id) &&
          feature.anchor === 'free' &&
          feature.movable
        ) {
          capturedFeatures.set(feature.id, { x: feature.x, y: feature.y });
        }
      });
      const capturedTables = selectedTableIdsRef.current
        .filter((index) => !sceneTablesRef.current[index]?.locked)
        .map((index) => ({
          index,
          startX: sceneTablesRef.current[index].x,
          startY: sceneTablesRef.current[index].y,
        }));

      groupDragRef.current = {
        pointerId,
        startScene: toSceneCoordinates(canvas, clientX, clientY),
        capturedFeatures,
        capturedTables,
        moved: false,
      };

      window.addEventListener('pointermove', handleGroupDragMove);
      window.addEventListener('pointerup', endGroupDrag);
    },
    [
      canvasRef,
      cancelPendingFeatureInteraction,
      endGroupDrag,
      handleGroupDragMove,
      toSceneCoordinates,
    ],
  );

  // Whether grabbing `featureId` should move the whole unified selection
  // instead of just that single feature.
  const shouldGroupDrag = React.useCallback((featureId: string) => {
    const selectedFeatures = selectedFeatureIdsRef.current;
    if (!selectedFeatures.includes(featureId)) {
      return false;
    }
    return selectedFeatures.length + selectedTableIdsRef.current.length > 1;
  }, []);

  const startFeatureDrag = React.useCallback(
    (
      feature: ClassroomFeature,
      template: FeatureTemplate,
      pointerId: number,
      clientX: number,
      clientY: number,
    ) => {
      featureDragRef.current = null;
      pendingFeatureRef.current = null;
      clearFeatureLongPressTimer();
      clearPendingFeatureListeners();

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const { x, y } = toSceneCoordinates(canvas, clientX, clientY);
      const offsetX = x - feature.x;
      const offsetY = y - feature.y;

      activeFeatureDragRef.current = {
        featureId: feature.id,
        pointerId,
        offsetX,
        offsetY,
        anchor: feature.anchor ?? 'free',
        type: template.type,
      };

      featureDragPlacementRef.current = {
        featureId: feature.id,
        x: feature.x,
        y: feature.y,
        anchor: feature.anchor ?? 'free',
        width: feature.width,
        height: feature.height,
      };

      window.addEventListener('pointermove', handleFeatureDragMove);
      window.addEventListener('pointerup', resetActiveDrag);
      cancelPendingFeatureInteraction();
    },
    [
      canvasRef,
      cancelPendingFeatureInteraction,
      clearFeatureLongPressTimer,
      clearPendingFeatureListeners,
      handleFeatureDragMove,
      resetActiveDrag,
      toSceneCoordinates,
    ],
  );

  const handleFeaturePointerDown = React.useCallback(
    (feature: ClassroomFeature, event: React.PointerEvent<SVGRectElement>) => {
      event.stopPropagation();
      event.preventDefault();
      const additive = event.shiftKey || event.ctrlKey || event.metaKey;
      selectFeature(feature.id, additive);

      const template = featureTemplateMap.get(feature.type);
      if (!template) {
        return;
      }

      pendingFeatureRef.current = {
        feature,
        template,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        pointerType: event.pointerType,
      };

      featureLongPressTimerRef.current = window.setTimeout(() => {
        const pending = pendingFeatureRef.current;
        if (!pending) {
          return;
        }
        cancelPendingFeatureInteraction();
        const normalizedPointer =
          pending.pointerType === 'pen' ? 'pen' : 'touch';
        const menuState: FeatureContextMenuState = {
          featureId: pending.feature.id,
          clientX: pending.startClientX,
          clientY: pending.startClientY,
          pointerType: normalizedPointer,
          trigger: 'longpress',
        };
        openFeatureContextMenu?.(menuState);
      }, LONG_PRESS_DURATION);

      const handlePendingMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== event.pointerId) {
          return;
        }
        const pending = pendingFeatureRef.current;
        if (!pending) {
          return;
        }
        const deltaX = Math.abs(moveEvent.clientX - pending.startClientX);
        const deltaY = Math.abs(moveEvent.clientY - pending.startClientY);
        if (
          deltaX > DRAG_DISTANCE_THRESHOLD ||
          deltaY > DRAG_DISTANCE_THRESHOLD
        ) {
          if (shouldGroupDrag(pending.feature.id)) {
            // Grabbing a feature that is part of a mixed selection moves the
            // whole unified group (tables + movable features) together.
            startGroupFeatureDrag(
              moveEvent.pointerId,
              moveEvent.clientX,
              moveEvent.clientY,
            );
            handleGroupDragMove(moveEvent);
          } else {
            startFeatureDrag(
              pending.feature,
              pending.template,
              moveEvent.pointerId,
              moveEvent.clientX,
              moveEvent.clientY,
            );
            handleFeatureDragMove(moveEvent);
          }
        }
      };

      const handlePendingUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== event.pointerId) {
          return;
        }
        cancelPendingFeatureInteraction();
      };

      pendingMoveListenerRef.current = handlePendingMove;
      pendingUpListenerRef.current = handlePendingUp;
      window.addEventListener('pointermove', handlePendingMove);
      window.addEventListener('pointerup', handlePendingUp);
    },
    [
      DRAG_DISTANCE_THRESHOLD,
      LONG_PRESS_DURATION,
      cancelPendingFeatureInteraction,
      featureTemplateMap,
      handleFeatureDragMove,
      handleGroupDragMove,
      openFeatureContextMenu,
      selectFeature,
      shouldGroupDrag,
      startFeatureDrag,
      startGroupFeatureDrag,
    ],
  );

  const handleFeatureTemplatePointerDown = React.useCallback(
    (type: ClassroomFeatureType, event: React.PointerEvent<Element>) => {
      event.preventDefault();
      event.stopPropagation();

      const pointerId = event.pointerId;
      const template = featureTemplateMap.get(type);
      if (!template) {
        return;
      }

      const rect = cachePalettePointerRect(pointerId);
      if (!rect) {
        return;
      }

      featureDragRef.current = {
        type,
        pointerId,
      };

      setFeatureDragPreview({
        type,
        width: template.width,
        height: template.height,
        clientX: event.clientX,
        clientY: event.clientY,
        overCanvas: true,
        label: template.label,
        canvasX: event.clientX - rect.left,
        canvasY: event.clientY - rect.top,
      });

      window.addEventListener('pointermove', handlePalettePointerMove);
      window.addEventListener('pointerup', handlePalettePointerUp);
    },
    [
      cachePalettePointerRect,
      featureTemplateMap,
      handlePalettePointerMove,
      handlePalettePointerUp,
    ],
  );

  React.useEffect(() => {
    return () => {
      clearPaletteDrag();
      resetActiveDrag();
      cancelPendingFeatureInteraction();
      window.removeEventListener('pointermove', handleFeatureRotateMove);
      window.removeEventListener('pointerup', handleFeatureRotateEnd);
      window.removeEventListener('pointermove', handleGroupDragMove);
      window.removeEventListener('pointerup', endGroupDrag);
      featureRotationRef.current = null;
      groupDragRef.current = null;
    };
  }, [
    cancelPendingFeatureInteraction,
    clearPaletteDrag,
    endGroupDrag,
    handleFeatureRotateEnd,
    handleFeatureRotateMove,
    handleGroupDragMove,
    resetActiveDrag,
  ]);

  return {
    featureDragPreview,
    handleFeatureTemplatePointerDown,
    handleFeaturePointerDown,
    handleFeatureRotateStart,
  } as const;
}
