// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';
import { deepClone } from '@/utils';
import { FEATURE_TYPES, type FeatureVisibilityFlags } from '@/utils/ui';
import type {
  CommittedSceneState,
  SceneTransactionRunner,
} from '@/hooks/scene/useSceneManager';

export interface HistorySnapshot {
  scene: ClassroomScene;
  seating: SeatingArrangement;
  featureVisibility: FeatureVisibilityFlags;
  signature: string;
}

export interface SceneHistoryHook {
  history: HistorySnapshot[];
  snapshot: () => void;
  undo: () => void;
  canUndo: boolean;
  redo: () => void;
  canRedo: boolean;
  restoreFromSnapshot: (snap: HistorySnapshot) => void;
}

export interface UseSceneHistoryParams {
  getCommittedSceneState: () => CommittedSceneState;
  runSceneTransaction: SceneTransactionRunner;
  getFeatureVisibility: () => FeatureVisibilityFlags;
  setAllFeatureVisibility: (flags: FeatureVisibilityFlags) => void;
  setSelectedTableIds: React.Dispatch<React.SetStateAction<number[]>>;
  setSelectedFeatureIds: React.Dispatch<React.SetStateAction<string[]>>;
}

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;
const numberBuffer = new ArrayBuffer(8);
const numberView = new DataView(numberBuffer);

const mixInt = (hash: number, value: number): number => {
  return Math.imul(hash ^ (value >>> 0), FNV_PRIME_32) >>> 0;
};

const mixNumber = (hash: number, value: number): number => {
  if (!Number.isFinite(value)) {
    return mixInt(hash, 0xffffffff);
  }
  numberView.setFloat64(0, value);
  hash = mixInt(hash, numberView.getUint32(0));
  return mixInt(hash, numberView.getUint32(4));
};

const mixBoolean = (
  hash: number,
  value: boolean | undefined | null,
): number => {
  return mixInt(hash, value ? 1 : 0);
};

const mixString = (hash: number, value: string | undefined | null): number => {
  if (!value) {
    return mixInt(hash, 0);
  }
  for (let i = 0; i < value.length; i += 1) {
    hash = mixInt(hash, value.charCodeAt(i));
  }
  return hash;
};

const hashStudent = (hash: number, student: Student): number => {
  hash = mixString(hash, student.id);
  hash = mixString(hash, student.name);
  hash = mixString(hash, student.gender);
  hash = mixString(hash, student.height);
  hash = mixBoolean(hash, student.restless);
  hash = mixBoolean(hash, student.shy);
  hash = mixBoolean(hash, student.concentrationIssues);
  hash = mixBoolean(hash, student.needsFrontSeat);
  hash = mixString(hash, student.wishPartnerId);
  hash = mixString(hash, student.avoidPartnerId);
  hash = mixBoolean(hash, student.prefersWindow);
  hash = mixBoolean(hash, student.prefersDoor);
  hash = mixBoolean(hash, student.performanceStrong);
  hash = mixBoolean(hash, student.performanceWeak);
  return hash;
};

const hashScene = (scene: ClassroomScene): number => {
  let hash = FNV_OFFSET_BASIS;
  hash = mixNumber(hash, scene.totalStudents);
  hash = mixInt(hash, scene.tables.length);

  scene.tables.forEach((table) => {
    hash = mixNumber(hash, table.x);
    hash = mixNumber(hash, table.y);
    hash = mixNumber(hash, table.width);
    hash = mixNumber(hash, table.height);
    hash = mixNumber(hash, table.rotation);
    hash = mixNumber(hash, table.seatCount);
    hash = mixBoolean(hash, table.locked);
    hash = mixNumber(hash, table.zIndex);
    hash = mixString(hash, table.templateType);
  });

  const features = scene.features ?? [];
  hash = mixInt(hash, features.length);
  features.forEach((feature) => {
    hash = mixString(hash, feature.id);
    hash = mixString(hash, feature.type);
    hash = mixBoolean(hash, feature.visible);
    hash = mixNumber(hash, feature.x);
    hash = mixNumber(hash, feature.y);
    hash = mixNumber(hash, feature.width);
    hash = mixNumber(hash, feature.height);
    hash = mixString(hash, feature.anchor);
    hash = mixBoolean(hash, feature.movable);
    hash = mixString(hash, feature.label);
    hash = mixNumber(hash, feature.rotation ?? 0);
  });

  return hash >>> 0;
};

const hashSeating = (seating: SeatingArrangement): number => {
  let hash = FNV_OFFSET_BASIS;
  hash = mixInt(hash, seating.length);

  seating.forEach((table) => {
    hash = mixInt(hash, table.length);
    table.forEach((seat) => {
      if (!seat) {
        hash = mixInt(hash, 0xffffffff);
        return;
      }
      hash = hashStudent(hash, seat);
    });
  });

  return hash >>> 0;
};

const hashFeatureVisibility = (flags: FeatureVisibilityFlags): number => {
  let hash = FNV_OFFSET_BASIS;
  for (const type of FEATURE_TYPES) {
    // Missing entries default to visible (see DEFAULT_FEATURE_VISIBILITY)
    hash = mixBoolean(hash, flags[type] ?? true);
  }
  return hash >>> 0;
};

const createSnapshotSignature = (
  scene: ClassroomScene,
  seating: SeatingArrangement,
  featureVisibility: FeatureVisibilityFlags,
): string => {
  const sceneHash = hashScene(scene).toString(16);
  const seatingHash = hashSeating(seating).toString(16);
  const visibilityHash = hashFeatureVisibility(featureVisibility).toString(16);
  return `${sceneHash}:${seatingHash}:${visibilityHash}`;
};

const HISTORY_LIMIT = 50;

/**
 * Custom hook for managing scene history with undo/redo functionality.
 *
 * The stacks live in refs and are mutated synchronously inside event
 * handlers, so back-to-back gestures within a single render cycle each
 * record their own entry (state mirrors exist only for rendering).
 * Snapshots read the committed scene through synchronous getters instead
 * of render-scoped closures — a snapshot taken right after a commit always
 * captures that commit, never a stale pre-render scene.
 */
export function useSceneHistory({
  getCommittedSceneState,
  runSceneTransaction,
  getFeatureVisibility,
  setAllFeatureVisibility,
  setSelectedTableIds,
  setSelectedFeatureIds,
}: UseSceneHistoryParams): SceneHistoryHook {
  const undoStackRef = React.useRef<HistorySnapshot[]>([]);
  const redoStackRef = React.useRef<HistorySnapshot[]>([]);
  const [history, setHistory] = React.useState<HistorySnapshot[]>([]);
  const [redoLength, setRedoLength] = React.useState(0);

  const syncMirrors = React.useCallback(() => {
    setHistory([...undoStackRef.current]);
    setRedoLength(redoStackRef.current.length);
  }, []);

  const captureCurrent = React.useCallback((): HistorySnapshot => {
    const { scene, seating } = getCommittedSceneState();
    const featureVisibility = getFeatureVisibility();
    return {
      scene: deepClone(scene),
      seating: deepClone(seating),
      featureVisibility: { ...featureVisibility },
      signature: createSnapshotSignature(scene, seating, featureVisibility),
    };
  }, [getCommittedSceneState, getFeatureVisibility]);

  const snapshot = React.useCallback(() => {
    const snap = captureCurrent();
    const stack = undoStackRef.current;

    // Prevent redundant snapshots via lightweight hash comparison; a deduped
    // no-op must not clear the redo stack.
    if (
      stack.length > 0 &&
      stack[stack.length - 1].signature === snap.signature
    ) {
      return;
    }

    stack.push(snap);
    // Limit history to avoid memory leaks
    if (stack.length > HISTORY_LIMIT) {
      undoStackRef.current = stack.slice(-HISTORY_LIMIT);
    }
    // A new mutation invalidates the redo branch
    redoStackRef.current = [];
    syncMirrors();
  }, [captureCurrent, syncMirrors]);

  const restoreFromSnapshot = React.useCallback(
    (snap: HistorySnapshot) => {
      // Use immutable updates instead of splice for better React compatibility
      // REMOVED: Re-snapping caused position drift with rotated tables
      // The original snapshot positions already contain the correct data
      const newTables = snap.scene.tables.map((t) => ({ ...t }));
      const newFeatures = (snap.scene.features ?? []).map((feature) => ({
        ...feature,
      }));
      const newSeating = snap.seating.map((arr) => [...arr]);

      // One transaction updates local scene state, committed refs and the
      // layout store synchronously, so a snapshot taken right after an undo
      // already sees the restored state.
      runSceneTransaction(() => ({
        scene: { ...snap.scene, tables: newTables, features: newFeatures },
        tables: newTables,
        features: newFeatures,
        seating: newSeating,
      }));
      setSelectedTableIds([]);
      setSelectedFeatureIds([]);
      setAllFeatureVisibility(snap.featureVisibility);
    },
    [
      runSceneTransaction,
      setSelectedTableIds,
      setSelectedFeatureIds,
      setAllFeatureVisibility,
    ],
  );

  const undo = React.useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) {
      return;
    }

    const target = stack[stack.length - 1];
    undoStackRef.current = stack.slice(0, -1);

    // Preserve the live state so redo can return to it
    redoStackRef.current = [...redoStackRef.current, captureCurrent()].slice(
      -HISTORY_LIMIT,
    );

    restoreFromSnapshot(target);
    syncMirrors();
  }, [captureCurrent, restoreFromSnapshot, syncMirrors]);

  const redo = React.useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) {
      return;
    }

    const target = stack[stack.length - 1];
    redoStackRef.current = stack.slice(0, -1);

    undoStackRef.current = [...undoStackRef.current, captureCurrent()].slice(
      -HISTORY_LIMIT,
    );

    restoreFromSnapshot(target);
    syncMirrors();
  }, [captureCurrent, restoreFromSnapshot, syncMirrors]);

  const canUndo = history.length > 0;
  const canRedo = redoLength > 0;

  return {
    history,
    snapshot,
    undo,
    canUndo,
    redo,
    canRedo,
    restoreFromSnapshot,
  };
}
