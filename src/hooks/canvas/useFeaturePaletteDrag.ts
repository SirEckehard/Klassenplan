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
  clampCenterToRoom,
  generateId,
  getRotatedAabbHalfExtents,
  GRID_SNAP_SIZE,
  snapRotationAngle,
  calculateDragDelta,
  applyDragMovement,
  showToast,
  ALIGNMENT_GUIDE_EPSILON,
  applyAlignmentToDelta,
  computeAlignmentSnap,
  getGroupAabb,
  getRotatedAabb,
  selectAlignmentTargets,
  type AlignmentGuide,
  type AlignmentRect,
} from '@/utils';
import type { FeatureVisibilityFlags } from '@/utils/ui';
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
  /**
   * Scene frame where the feature would land right now (drop placement math,
   * including wall snapping), or null while the pointer is off-canvas.
   */
  placement: FeatureDropPlacement | null;
};

export type FeaturePlacement = {
  x: number;
  y: number;
  anchor: ClassroomFeatureAnchor;
  width: number;
  height: number;
};

/**
 * Structural size input for the placement helpers. Both palette templates and
 * live features satisfy this, so moving/pasting a resized feature keeps its
 * per-instance dimensions instead of resetting to the template defaults.
 */
export type FeatureSize = {
  width: number;
  height: number;
};

type FeatureDragUpdatePayload = FeaturePlacement & {
  featureId: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Applies the magnetic guide snap to a movable feature placement and returns
 * the exactly-hit guides for the final (re-clamped) position. Shared by the
 * live feature drag, the palette ghost and the palette drop so all three land
 * on identical coordinates.
 */
const snapMovablePlacementToGuides = <P extends FeaturePlacement>(
  placement: P,
  size: FeatureSize,
  rotation: number,
  targets: AlignmentRect[],
  classroomWidth: number,
  classroomHeight: number,
): { placement: P; guides: AlignmentGuide[] } => {
  const canvasDims = { width: classroomWidth, height: classroomHeight };
  const aabbOf = (frame: { x: number; y: number }) =>
    getRotatedAabb({
      x: frame.x,
      y: frame.y,
      width: size.width,
      height: size.height,
      rotation,
    });
  const { offset } = computeAlignmentSnap(
    aabbOf(placement),
    targets,
    canvasDims,
  );
  let next = placement;
  if (offset.x !== 0 || offset.y !== 0) {
    // Guide snap wins over grid snap, but the room bounds stay the last word.
    const { halfWidth, halfHeight } = getRotatedAabbHalfExtents(
      size.width,
      size.height,
      rotation,
    );
    const centerX = clampCenterToRoom(
      placement.x + size.width / 2 + offset.x,
      halfWidth,
      classroomWidth,
    );
    const centerY = clampCenterToRoom(
      placement.y + size.height / 2 + offset.y,
      halfHeight,
      classroomHeight,
    );
    next = {
      ...placement,
      x: centerX - size.width / 2,
      y: centerY - size.height / 2,
    };
  }
  const { guides } = computeAlignmentSnap(
    aabbOf(next),
    targets,
    canvasDims,
    ALIGNMENT_GUIDE_EPSILON,
  );
  return { placement: next, guides };
};

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
  size: FeatureSize,
  anchor: ClassroomFeatureAnchor,
) => {
  const isHorizontalWall = anchor === 'top' || anchor === 'bottom';
  const isVerticalWall = anchor === 'left' || anchor === 'right';

  let width = size.width;
  let height = size.height;

  if (isHorizontalWall) {
    if (height > width) {
      width = size.height;
      height = size.width;
    }
  } else if (isVerticalWall) {
    if (width > height) {
      width = size.height;
      height = size.width;
    }
  }

  return { width, height };
};

export const placeMovableFeatureBase = (
  size: FeatureSize,
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
    size.width,
    size.height,
    rotation,
  );
  const centerX = clampCenterToRoom(
    snapToGridValue(desiredX, snapToGrid) + size.width / 2,
    halfWidth,
    classroomWidth,
  );
  const centerY = clampCenterToRoom(
    snapToGridValue(desiredY, snapToGrid) + size.height / 2,
    halfHeight,
    classroomHeight,
  );
  return {
    x: centerX - size.width / 2,
    y: centerY - size.height / 2,
    anchor: 'free',
    width: size.width,
    height: size.height,
  };
};

export const placeFixedFeatureBase = (
  size: FeatureSize,
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
    getOrientedDimensions(size, anchor);

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

/**
 * Rotation a wall-mounted feature type gets for the given anchor; other types
 * (and the free anchor) keep the provided fallback rotation.
 */
const getFeatureAnchorRotation = (
  type: ClassroomFeatureType,
  anchor: ClassroomFeatureAnchor,
  fallback: number,
): number => {
  if (
    type !== 'window' &&
    type !== 'door' &&
    type !== 'board' &&
    type !== 'whiteboard'
  ) {
    return fallback;
  }

  switch (anchor) {
    case 'left':
      return 0;
    case 'right':
      return 180;
    case 'top':
      return -90;
    case 'bottom':
      return 90;
    case 'free':
    default:
      return fallback;
  }
};

export const rotateFeatureForAnchor = (
  feature: ClassroomFeature,
  anchor: ClassroomFeatureAnchor,
): ClassroomFeature => {
  const rotation = getFeatureAnchorRotation(
    feature.type,
    anchor,
    feature.rotation ?? 0,
  );
  return rotation === (feature.rotation ?? 0)
    ? feature
    : { ...feature, rotation };
};

export type FeatureDropPlacement = FeaturePlacement & {
  rotation: number;
  movable: boolean;
};

/**
 * Placement math shared by the palette drag preview and the actual drop so
 * the live ghost sits exactly where the feature will land (including wall
 * snapping and the anchor rotation).
 */
export const computeFeatureDropPlacement = (
  template: FeatureTemplate,
  sceneX: number,
  sceneY: number,
  snapToGrid: boolean,
  classroomWidth: number,
  classroomHeight: number,
): FeatureDropPlacement => {
  const initialRotation = template.type === 'podium' ? 90 : 0;

  if (template.movable) {
    const placement = placeMovableFeatureBase(
      template,
      sceneX - template.width / 2,
      sceneY - template.height / 2,
      snapToGrid,
      classroomWidth,
      classroomHeight,
      initialRotation,
    );
    return { ...placement, rotation: initialRotation, movable: true };
  }

  const placement = placeFixedFeatureBase(
    template,
    sceneX,
    sceneY,
    snapToGrid,
    classroomWidth,
    classroomHeight,
  );
  return {
    ...placement,
    rotation: getFeatureAnchorRotation(
      template.type,
      placement.anchor,
      initialRotation,
    ),
    movable: false,
  };
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
  alignmentGuidesEnabled: boolean;
  setActiveAlignmentGuides: (guides: AlignmentGuide[] | null) => void;
  featureVisibility?: FeatureVisibilityFlags;
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
  alignmentGuidesEnabled,
  setActiveAlignmentGuides,
  featureVisibility,
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
    moved: boolean;
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
    moved: boolean;
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
    // Alignment context captured once at drag start (scene is static during
    // the drag): static targets and the union AABB of the dragged group.
    alignmentTargets: AlignmentRect[];
    startGroupAabb: AlignmentRect | null;
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

      let placement = computeFeatureDropPlacement(
        template,
        sceneX,
        sceneY,
        snapToGrid,
        classroomWidth,
        classroomHeight,
      );
      // Apply the identical guide snap as the ghost preview so the dropped
      // feature lands exactly where the ghost was shown.
      if (alignmentGuidesEnabled && placement.movable) {
        placement = snapMovablePlacementToGuides(
          placement,
          placement,
          placement.rotation,
          selectAlignmentTargets(
            sceneTablesRef.current,
            [],
            latestFeaturesRef.current,
            [],
            featureVisibility,
          ),
          classroomWidth,
          classroomHeight,
        ).placement;
      }

      const feature: ClassroomFeature = {
        id: generateId(),
        type,
        visible: true,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
        movable: placement.movable,
        anchor: placement.anchor,
        label: template.label,
        rotation: placement.rotation,
      };

      snapshot();
      runSceneTransaction(({ features, scene, tables, seating }) => {
        const existing = features ?? scene.features ?? [];
        const filtered = template.allowMultiple
          ? existing
          : existing.filter((existingFeature) => existingFeature.type !== type);
        // The board is a singleton because its position defines the front of
        // the room for the seating algorithm — explain the swap to the user.
        if (filtered.length < existing.length) {
          showToast('info', 'toast:feature.boardReplaced');
        }
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
      alignmentGuidesEnabled,
      featureTemplateMap,
      featureVisibility,
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

      const canvas = canvasRef.current;
      let placement: FeatureDropPlacement | null = null;
      if (metrics.overCanvas && canvas) {
        const { x, y } = toSceneCoordinates(
          canvas,
          event.clientX,
          event.clientY,
        );
        placement = computeFeatureDropPlacement(
          template,
          x,
          y,
          snapToGrid,
          classroomWidth,
          classroomHeight,
        );
      }

      if (alignmentGuidesEnabled) {
        if (placement?.movable) {
          const snapped = snapMovablePlacementToGuides(
            placement,
            placement,
            placement.rotation,
            selectAlignmentTargets(
              sceneTablesRef.current,
              [],
              latestFeaturesRef.current,
              [],
              featureVisibility,
            ),
            classroomWidth,
            classroomHeight,
          );
          placement = snapped.placement;
          setActiveAlignmentGuides(
            snapped.guides.length > 0 ? snapped.guides : null,
          );
        } else {
          // Off-canvas or wall-anchored template: no guides.
          setActiveAlignmentGuides(null);
        }
      }

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
        placement,
      });
    },
    [
      alignmentGuidesEnabled,
      canvasRef,
      classroomHeight,
      classroomWidth,
      featureTemplateMap,
      featureVisibility,
      getCanvasPointerMetrics,
      setActiveAlignmentGuides,
      snapToGrid,
      toSceneCoordinates,
    ],
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

      // The drag only knows the palette template; the live feature carries
      // the user-applied rotation and size (resized features must keep their
      // dimensions while being moved).
      const liveFeature = latestFeaturesRef.current.find(
        (feature) => feature.id === drag.featureId,
      );
      const size: FeatureSize = liveFeature ?? template;

      let placement: FeaturePlacement;
      if (template.movable) {
        const desiredX = pointerX - drag.offsetX;
        const desiredY = pointerY - drag.offsetY;
        const rotation = liveFeature?.rotation ?? 0;
        placement = placeMovableFeatureBase(
          size,
          desiredX,
          desiredY,
          snapToGrid,
          classroomWidth,
          classroomHeight,
          rotation,
        );
        if (alignmentGuidesEnabled) {
          const snapped = snapMovablePlacementToGuides(
            placement,
            size,
            rotation,
            selectAlignmentTargets(
              sceneTablesRef.current,
              [],
              latestFeaturesRef.current,
              [drag.featureId],
              featureVisibility,
            ),
            classroomWidth,
            classroomHeight,
          );
          placement = snapped.placement;
          setActiveAlignmentGuides(
            snapped.guides.length > 0 ? snapped.guides : null,
          );
        }
      } else {
        placement = placeFixedFeatureBase(
          size,
          pointerX,
          pointerY,
          snapToGrid,
          classroomWidth,
          classroomHeight,
        );
        // Wall-anchored features are never guide-snap subjects.
        if (alignmentGuidesEnabled) {
          setActiveAlignmentGuides(null);
        }
      }

      drag.moved = true;
      featureDragPlacementRef.current = {
        featureId: drag.featureId,
        x: placement.x,
        y: placement.y,
        anchor: placement.anchor,
        width: placement.width ?? size.width,
        height: placement.height ?? size.height,
      };
      scheduleFeatureDragUpdate();
    },
    [
      alignmentGuidesEnabled,
      canvasRef,
      classroomHeight,
      classroomWidth,
      featureTemplateMap,
      featureVisibility,
      scheduleFeatureDragUpdate,
      setActiveAlignmentGuides,
      snapToGrid,
      toSceneCoordinates,
    ],
  );

  const resetActiveDrag = React.useCallback(
    function resetActiveDrag() {
      window.removeEventListener('pointermove', handleFeatureDragMove);
      window.removeEventListener('pointerup', resetActiveDrag);
      cancelFeatureDragUpdate();
      setActiveAlignmentGuides(null);

      // Only commit if the drag actually moved the feature; a bare click on
      // a feature must not create an undo entry
      if (activeFeatureDragRef.current?.moved) {
        snapshot();
        commitFeatureState(latestFeaturesRef.current);
      }

      activeFeatureDragRef.current = null;
    },
    [
      cancelFeatureDragUpdate,
      commitFeatureState,
      handleFeatureDragMove,
      setActiveAlignmentGuides,
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
      setActiveAlignmentGuides(null);
    },
    [
      handlePalettePointerMove,
      releasePalettePointerRect,
      setActiveAlignmentGuides,
    ],
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

      rotationState.moved = true;
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
      // A bare click on the rotate handle must not create an undo entry
      if (rotationState.moved) {
        snapshot();
        commitFeatureState(latestFeaturesRef.current);
      }
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
        moved: false,
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
      let delta = calculateDragDelta(state.startScene, point, snapToGrid);
      const guideCanvas = { width: classroomWidth, height: classroomHeight };
      if (alignmentGuidesEnabled && state.startGroupAabb) {
        delta = applyAlignmentToDelta(
          delta,
          state.startGroupAabb,
          state.alignmentTargets,
          guideCanvas,
        ).delta;
      }
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

      if (alignmentGuidesEnabled && state.startGroupAabb) {
        // Render pass: only guides the shifted group actually coincides with.
        const { guides } = computeAlignmentSnap(
          {
            ...state.startGroupAabb,
            x: state.startGroupAabb.x + delta.x,
            y: state.startGroupAabb.y + delta.y,
          },
          state.alignmentTargets,
          guideCanvas,
          ALIGNMENT_GUIDE_EPSILON,
        );
        setActiveAlignmentGuides(guides.length > 0 ? guides : null);
      }
    },
    [
      alignmentGuidesEnabled,
      canvasRef,
      classroomHeight,
      classroomWidth,
      setActiveAlignmentGuides,
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
      setActiveAlignmentGuides(null);
      if (state.moved) {
        snapshot();
        commitScene();
      }
    },
    [commitScene, handleGroupDragMove, setActiveAlignmentGuides, snapshot],
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

      const capturedIndices = capturedTables.map((entry) => entry.index);
      groupDragRef.current = {
        pointerId,
        startScene: toSceneCoordinates(canvas, clientX, clientY),
        capturedFeatures,
        capturedTables,
        moved: false,
        alignmentTargets: alignmentGuidesEnabled
          ? selectAlignmentTargets(
              sceneTablesRef.current,
              capturedIndices,
              latestFeaturesRef.current,
              [...capturedFeatures.keys()],
              featureVisibility,
            )
          : [],
        startGroupAabb: alignmentGuidesEnabled
          ? getGroupAabb([
              ...capturedIndices.map((index) => sceneTablesRef.current[index]),
              ...latestFeaturesRef.current.filter((feature) =>
                capturedFeatures.has(feature.id),
              ),
            ])
          : null,
      };

      window.addEventListener('pointermove', handleGroupDragMove);
      window.addEventListener('pointerup', endGroupDrag);
    },
    [
      alignmentGuidesEnabled,
      canvasRef,
      cancelPendingFeatureInteraction,
      endGroupDrag,
      featureVisibility,
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
        moved: false,
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

      // The drag starts on the palette item, so the pointer is not over the
      // canvas yet — compute the metrics honestly instead of assuming it is.
      const metrics = getCanvasPointerMetrics(
        pointerId,
        event.clientX,
        event.clientY,
      );

      setFeatureDragPreview({
        type,
        width: template.width,
        height: template.height,
        clientX: event.clientX,
        clientY: event.clientY,
        overCanvas: metrics.overCanvas,
        label: template.label,
        canvasX: metrics.canvasX,
        canvasY: metrics.canvasY,
        placement: null,
      });

      window.addEventListener('pointermove', handlePalettePointerMove);
      window.addEventListener('pointerup', handlePalettePointerUp);
    },
    [
      cachePalettePointerRect,
      featureTemplateMap,
      getCanvasPointerMetrics,
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
