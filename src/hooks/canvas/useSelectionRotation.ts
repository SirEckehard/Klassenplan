// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { ClassroomFeature, ClassroomTable } from '@/types';
import {
  applyFeatureRotations,
  applyTableRotations,
  collectRotationTargets,
  rotateTargets,
  snapRotationAngle,
  type RotationTargets,
  type SceneRotations,
} from '@/utils';
import type { SceneTransactionRunner } from '@/hooks/scene/useSceneManager';

/** The element whose handle a turn was started on. */
export type RotationOrigin = { table: number } | { feature: string };

/**
 * One step of a handle gesture: `'start'` when the handle is pressed, then
 * `'move'` with the angle turned since (degrees, unsnapped), `'end'` when it
 * is let go.
 */
export type RotationGestureHandler = (
  origin: RotationOrigin,
  phase: 'start' | 'move' | 'end',
  delta: number,
) => void;

interface UseSelectionRotationParams {
  sceneTables: ClassroomTable[];
  sceneFeatures: ClassroomFeature[];
  selectedTableIds: number[];
  selectedFeatureIds: string[];
  updateSceneTables: (
    updateFn: (tables: ClassroomTable[]) => ClassroomTable[],
  ) => void;
  setSceneFeatures: React.Dispatch<React.SetStateAction<ClassroomFeature[]>>;
  runSceneTransaction: SceneTransactionRunner;
  snapshot: () => void;
  /** The area room elements are kept inside (the canvas, board strip included). */
  roomWidth: number;
  roomHeight: number;
}

/**
 * Turns the room layer's selection by a handle — the handle of a table or of
 * a room element, whichever was grabbed. Pressed on an element of the
 * selection it turns every unlocked table and every rotatable room element in
 * it, each around its own centre; pressed on anything else, only that.
 *
 * The turn is shown live as new objects in the local scene, so the inspector
 * follows it, and committed once when the handle is let go.
 */
export function useSelectionRotation({
  sceneTables,
  sceneFeatures,
  selectedTableIds,
  selectedFeatureIds,
  updateSceneTables,
  setSceneFeatures,
  runSceneTransaction,
  snapshot,
  roomWidth,
  roomHeight,
}: UseSelectionRotationParams) {
  // A gesture runs in window listeners set up when it began, so it reads the
  // scene and the selection through a ref rather than a stale closure.
  const liveRef = React.useRef({
    sceneTables,
    sceneFeatures,
    selectedTableIds,
    selectedFeatureIds,
  });
  React.useEffect(() => {
    liveRef.current = {
      sceneTables,
      sceneFeatures,
      selectedTableIds,
      selectedFeatureIds,
    };
  }, [sceneTables, sceneFeatures, selectedTableIds, selectedFeatureIds]);

  const gestureRef = React.useRef<{
    targets: RotationTargets;
    latest: SceneRotations | null;
  } | null>(null);

  const room = React.useMemo(
    () => ({ width: roomWidth, height: roomHeight }),
    [roomWidth, roomHeight],
  );

  /** Sets rotations and commits them in one step (inspector, keyboard). */
  const commitRotations = React.useCallback(
    (rotations: SceneRotations) => {
      runSceneTransaction(
        ({ tables, features }) => ({
          tables: applyTableRotations(tables, rotations.tables),
          features: applyFeatureRotations(features, rotations.features, room),
        }),
        { skipSeatingUpdate: true },
      );
    },
    [runSceneTransaction, room],
  );

  const handleRotationGesture = React.useCallback<RotationGestureHandler>(
    (origin, phase, delta) => {
      if (phase === 'start') {
        const live = liveRef.current;
        const inSelection =
          'table' in origin
            ? live.selectedTableIds.includes(origin.table)
            : live.selectedFeatureIds.includes(origin.feature);
        gestureRef.current = {
          targets: inSelection
            ? collectRotationTargets(
                live.sceneTables,
                live.sceneFeatures,
                live.selectedTableIds,
                live.selectedFeatureIds,
              )
            : collectRotationTargets(
                live.sceneTables,
                live.sceneFeatures,
                'table' in origin ? [origin.table] : [],
                'feature' in origin ? [origin.feature] : [],
              ),
          latest: null,
        };
        return;
      }

      const gesture = gestureRef.current;
      if (!gesture) return;

      if (phase === 'move') {
        // The first move takes the undo snapshot, so a click on the handle
        // that turns nothing leaves no step to undo.
        if (!gesture.latest) snapshot();
        const rotations = rotateTargets(
          gesture.targets,
          (rotation) => snapRotationAngle(rotation + delta).normalized,
        );
        gesture.latest = rotations;
        updateSceneTables((tables) =>
          applyTableRotations(tables, rotations.tables),
        );
        setSceneFeatures((features) =>
          applyFeatureRotations(features, rotations.features, room),
        );
        return;
      }

      gestureRef.current = null;
      if (gesture.latest) commitRotations(gesture.latest);
    },
    [commitRotations, room, setSceneFeatures, snapshot, updateSceneTables],
  );

  return { handleRotationGesture, commitRotations };
}
