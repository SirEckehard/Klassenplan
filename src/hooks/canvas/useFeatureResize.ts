// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { ClassroomFeature } from '@/types';
import {
  resizeFeature,
  type FeatureFrame,
  type FeatureResizeHandle,
} from '@/utils';
import type { SceneTransactionRunner } from '@/hooks/scene/useSceneManager';

type UseFeatureResizeOptions = {
  sceneFeatures: ClassroomFeature[];
  setSceneFeatures: React.Dispatch<React.SetStateAction<ClassroomFeature[]>>;
  runSceneTransaction: SceneTransactionRunner;
  snapshot: () => void;
  snapToGrid: boolean;
  classroomWidth: number;
  classroomHeight: number;
  canvasRef: React.RefObject<SVGSVGElement | null>;
  toSceneCoordinates: (
    svg: SVGSVGElement,
    clientX: number,
    clientY: number,
  ) => { x: number; y: number };
  selectFeature: (featureId: string, additive: boolean) => void;
};

/**
 * Resize gesture for room features, driven by the edge handles on the canvas.
 * Mirrors the rotation gesture in {@link useFeaturePaletteDrag}: live updates
 * via `setSceneFeatures` while dragging, a single snapshot + scene transaction
 * on pointerup so undo/redo captures one step per resize.
 */
export function useFeatureResize({
  sceneFeatures,
  setSceneFeatures,
  runSceneTransaction,
  snapshot,
  snapToGrid,
  classroomWidth,
  classroomHeight,
  canvasRef,
  toSceneCoordinates,
  selectFeature,
}: UseFeatureResizeOptions) {
  const resizeRef = React.useRef<{
    featureId: string;
    pointerId: number;
    handle: FeatureResizeHandle;
    startScene: { x: number; y: number };
    startFrame: FeatureFrame;
    moved: boolean;
  } | null>(null);
  const latestFeaturesRef = React.useRef(sceneFeatures);

  React.useEffect(() => {
    latestFeaturesRef.current = sceneFeatures;
  }, [sceneFeatures]);

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

  const handleFeatureResizeMove = React.useCallback(
    (event: PointerEvent) => {
      const state = resizeRef.current;
      if (!state || event.pointerId !== state.pointerId) {
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const point = toSceneCoordinates(canvas, event.clientX, event.clientY);
      const sceneDelta = {
        x: point.x - state.startScene.x,
        y: point.y - state.startScene.y,
      };
      state.moved = true;

      setSceneFeatures((prev) => {
        const next = prev.map((feature) => {
          if (feature.id !== state.featureId) {
            return feature;
          }
          const frame = resizeFeature(
            feature,
            state.handle,
            sceneDelta,
            state.startFrame,
            { snapToGrid, classroomWidth, classroomHeight },
          );
          return { ...feature, ...frame };
        });
        latestFeaturesRef.current = next;
        return next;
      });
    },
    [
      canvasRef,
      classroomHeight,
      classroomWidth,
      setSceneFeatures,
      snapToGrid,
      toSceneCoordinates,
    ],
  );

  const handleFeatureResizeEnd = React.useCallback(
    function handleFeatureResizeEnd(event: PointerEvent) {
      const state = resizeRef.current;
      if (!state || event.pointerId !== state.pointerId) {
        return;
      }
      window.removeEventListener('pointermove', handleFeatureResizeMove);
      window.removeEventListener('pointerup', handleFeatureResizeEnd);
      resizeRef.current = null;
      if (state.moved) {
        snapshot();
        commitFeatureState(latestFeaturesRef.current);
      }
    },
    [commitFeatureState, handleFeatureResizeMove, snapshot],
  );

  const handleFeatureResizeStart = React.useCallback(
    (
      feature: ClassroomFeature,
      handle: FeatureResizeHandle,
      event: React.PointerEvent<SVGElement>,
    ): void => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      // The handle itself stops propagation and captures the pointer, so the
      // canvas selection machinery never sees this gesture.
      selectFeature(feature.id, false);

      resizeRef.current = {
        featureId: feature.id,
        pointerId: event.pointerId,
        handle,
        startScene: toSceneCoordinates(canvas, event.clientX, event.clientY),
        startFrame: {
          x: feature.x,
          y: feature.y,
          width: feature.width,
          height: feature.height,
        },
        moved: false,
      };

      window.addEventListener('pointermove', handleFeatureResizeMove);
      window.addEventListener('pointerup', handleFeatureResizeEnd);
    },
    [
      canvasRef,
      handleFeatureResizeEnd,
      handleFeatureResizeMove,
      selectFeature,
      toSceneCoordinates,
    ],
  );

  React.useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handleFeatureResizeMove);
      window.removeEventListener('pointerup', handleFeatureResizeEnd);
      resizeRef.current = null;
    };
  }, [handleFeatureResizeEnd, handleFeatureResizeMove]);

  return { handleFeatureResizeStart } as const;
}
