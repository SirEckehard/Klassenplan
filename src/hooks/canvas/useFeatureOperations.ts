// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { ClassroomFeature, ClassroomFeatureType } from '@/types';
import { deepClone, generateId } from '@/utils';
import { showToast } from '@/utils/ui/toast';
import type { SceneTransactionRunner } from '@/hooks/scene/useSceneManager';
import type { FeatureTemplate } from '@/hooks/canvas/featureTemplates';
import {
  placeMovableFeatureBase,
  placeFixedFeatureBase,
  rotateFeatureForAnchor,
  type FeaturePlacement,
} from '@/hooks/canvas/useFeaturePaletteDrag';

export interface FeatureOperationsHook {
  copySelectedFeatures: () => void;
  cutSelectedFeatures: () => void;
  deleteSelectedFeatures: () => void;
  pasteFeaturesAt: (coords?: { sceneX?: number; sceneY?: number }) => void;
}

export interface UseFeatureOperationsParams {
  sceneFeatures: ClassroomFeature[];
  selectedFeatureIds: string[];
  featureClipboard: ClassroomFeature[] | null;
  snapToGrid: boolean;
  canvasWidth: number;
  classroomHeight: number;
  featureTemplateMap: Map<ClassroomFeatureType, FeatureTemplate>;

  setSelectedFeatureIds: React.Dispatch<React.SetStateAction<string[]>>;
  setFeatureClipboard: React.Dispatch<
    React.SetStateAction<ClassroomFeature[] | null>
  >;
  runSceneTransaction: SceneTransactionRunner;
  snapshot: () => void;
  setFeatureVisible: (type: ClassroomFeatureType, visible: boolean) => void;
}

/**
 * Copy/cut/paste/delete operations for room features, mirroring
 * {@link useTableOperations}. Operates on the whole feature selection so it can
 * be combined with the table operations into one unified clipboard action.
 */
export function useFeatureOperations({
  sceneFeatures,
  selectedFeatureIds,
  featureClipboard,
  snapToGrid,
  canvasWidth,
  classroomHeight,
  featureTemplateMap,
  setSelectedFeatureIds,
  setFeatureClipboard,
  runSceneTransaction,
  snapshot,
  setFeatureVisible,
}: UseFeatureOperationsParams): FeatureOperationsHook {
  // Splits the current selection into elements that can be duplicated and the
  // singleton elements (board) that cannot, warning once if any of the latter
  // are present.
  const collectCopyableSelection = React.useCallback(() => {
    const selected = sceneFeatures.filter((feature) =>
      selectedFeatureIds.includes(feature.id),
    );
    const copyable = selected.filter(
      (feature) => featureTemplateMap.get(feature.type)?.allowMultiple ?? true,
    );
    if (copyable.length < selected.length) {
      showToast('info', 'toast:feature.notCopyable');
    }
    return { selected, copyable };
  }, [sceneFeatures, selectedFeatureIds, featureTemplateMap]);

  const copySelectedFeatures = React.useCallback(() => {
    if (selectedFeatureIds.length === 0) return;
    const { selected, copyable } = collectCopyableSelection();
    if (selected.length === 0) return;
    setFeatureClipboard(
      copyable.length > 0
        ? copyable.map((feature) => deepClone(feature))
        : null,
    );
  }, [selectedFeatureIds, collectCopyableSelection, setFeatureClipboard]);

  const deleteSelectedFeatures = React.useCallback(() => {
    if (selectedFeatureIds.length === 0) return;
    const targets = sceneFeatures.filter((feature) =>
      selectedFeatureIds.includes(feature.id),
    );
    if (targets.length === 0) return;
    snapshot();
    runSceneTransaction(({ features, scene, tables, seating }) => {
      const existing = features ?? scene.features ?? [];
      const nextFeatures = existing.filter(
        (feature) => !selectedFeatureIds.includes(feature.id),
      );
      return {
        features: nextFeatures,
        scene: { ...scene, features: nextFeatures },
        tables,
        seating,
      };
    });
    // Keep the visibility toggle in sync when a board is removed.
    if (targets.some((feature) => feature.type === 'board')) {
      setFeatureVisible('board', false);
    }
    setSelectedFeatureIds([]);
  }, [
    sceneFeatures,
    selectedFeatureIds,
    snapshot,
    runSceneTransaction,
    setFeatureVisible,
    setSelectedFeatureIds,
  ]);

  const cutSelectedFeatures = React.useCallback(() => {
    if (selectedFeatureIds.length === 0) return;
    const { selected, copyable } = collectCopyableSelection();
    if (selected.length === 0) return;

    setFeatureClipboard(
      copyable.length > 0
        ? copyable.map((feature) => deepClone(feature))
        : null,
    );

    // Only remove what can actually be pasted again. Singleton elements
    // (the board) stay in place so a cut never destroys them.
    if (copyable.length === 0) return;
    const copyableIds = new Set(copyable.map((feature) => feature.id));
    snapshot();
    runSceneTransaction(({ features, scene, tables, seating }) => {
      const existing = features ?? scene.features ?? [];
      const nextFeatures = existing.filter(
        (feature) => !copyableIds.has(feature.id),
      );
      return {
        features: nextFeatures,
        scene: { ...scene, features: nextFeatures },
        tables,
        seating,
      };
    });
    // Keep any non-duplicable elements (e.g. the board) selected.
    setSelectedFeatureIds(
      selected
        .filter((feature) => !copyableIds.has(feature.id))
        .map((feature) => feature.id),
    );
  }, [
    selectedFeatureIds,
    collectCopyableSelection,
    setFeatureClipboard,
    snapshot,
    runSceneTransaction,
    setSelectedFeatureIds,
  ]);

  const pasteFeaturesAt = React.useCallback(
    ({ sceneX, sceneY }: { sceneX?: number; sceneY?: number } = {}) => {
      const clipboardFeatures = featureClipboard;
      if (!clipboardFeatures || clipboardFeatures.length === 0) return;

      // Preserve the copied elements' relative layout. Without an explicit
      // target (keyboard paste) they land right next to the originals; with a
      // target (context-menu paste) the group is centered on the cursor. A
      // small offset keeps the copy visually distinct from its source.
      const PASTE_OFFSET = 20;
      const minX = Math.min(...clipboardFeatures.map((feature) => feature.x));
      const minY = Math.min(...clipboardFeatures.map((feature) => feature.y));
      const maxX = Math.max(
        ...clipboardFeatures.map((feature) => feature.x + feature.width),
      );
      const maxY = Math.max(
        ...clipboardFeatures.map((feature) => feature.y + feature.height),
      );
      const hasTarget =
        typeof sceneX === 'number' && typeof sceneY === 'number';
      const delta = hasTarget
        ? {
            x: sceneX - (minX + maxX) / 2 + PASTE_OFFSET,
            y: sceneY - (minY + maxY) / 2 + PASTE_OFFSET,
          }
        : { x: PASTE_OFFSET, y: PASTE_OFFSET };

      const pastedFeatures = clipboardFeatures
        .map((feature) => {
          const template = featureTemplateMap.get(feature.type);
          if (!template) {
            return null;
          }

          let placement: FeaturePlacement;
          // Pass the feature itself as size source so resized copies keep
          // their per-instance dimensions instead of the template defaults.
          if (template.movable) {
            placement = placeMovableFeatureBase(
              feature,
              feature.x + delta.x,
              feature.y + delta.y,
              snapToGrid,
              canvasWidth,
              classroomHeight,
              feature.rotation ?? 0,
            );
          } else {
            // Fixed elements re-anchor to the nearest wall around their
            // shifted center.
            placement = placeFixedFeatureBase(
              feature,
              feature.x + feature.width / 2 + delta.x,
              feature.y + feature.height / 2 + delta.y,
              snapToGrid,
              canvasWidth,
              classroomHeight,
            );
          }

          let nextFeature: ClassroomFeature = {
            ...feature,
            id: generateId(),
            x: placement.x,
            y: placement.y,
            width: placement.width ?? feature.width,
            height: placement.height ?? feature.height,
            movable: template.movable,
            anchor: placement.anchor,
            label: template.label,
            rotation: feature.rotation ?? 0,
          };

          if (!template.movable) {
            nextFeature = rotateFeatureForAnchor(nextFeature, placement.anchor);
          }

          return nextFeature;
        })
        .filter((item): item is ClassroomFeature => item !== null);

      if (pastedFeatures.length === 0) return;

      // Snapshot before touching visibility so undo restores the pre-paste
      // visibility flags along with the scene
      snapshot();
      pastedFeatures.forEach((feature) => {
        setFeatureVisible(feature.type, true);
      });

      runSceneTransaction(({ features, scene, tables, seating }) => {
        const existing = features ?? scene.features ?? [];
        const nextFeatures = [...existing, ...pastedFeatures];
        return {
          features: nextFeatures,
          scene: { ...scene, features: nextFeatures },
          tables,
          seating,
        };
      });
      setSelectedFeatureIds(pastedFeatures.map((feature) => feature.id));
    },
    [
      featureClipboard,
      canvasWidth,
      classroomHeight,
      featureTemplateMap,
      snapToGrid,
      snapshot,
      runSceneTransaction,
      setFeatureVisible,
      setSelectedFeatureIds,
    ],
  );

  return {
    copySelectedFeatures,
    cutSelectedFeatures,
    deleteSelectedFeatures,
    pasteFeaturesAt,
  };
}
