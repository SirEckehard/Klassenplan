// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type {
  ClassroomScene,
  SeatingArrangement,
  ClassroomTable,
  ClassroomFeature,
  Student,
} from '@/types';
import { deepClone } from '@/utils';

export interface HistorySnapshot {
  scene: ClassroomScene;
  seating: SeatingArrangement;
  signature: string;
}

export interface SceneHistoryHook {
  history: HistorySnapshot[];
  snapshot: () => void;
  undo: () => void;
  canUndo: boolean;
  restoreFromSnapshot: (snap: HistorySnapshot) => void;
}

export interface UseSceneHistoryParams {
  classroomScene: ClassroomScene;
  currentSeating: SeatingArrangement;
  setCurrentSeating: React.Dispatch<React.SetStateAction<SeatingArrangement>>;
  updateClassroomScene: (next: React.SetStateAction<ClassroomScene>) => void;
  setSceneTables: React.Dispatch<React.SetStateAction<ClassroomTable[]>>;
  setSceneFeatures: React.Dispatch<React.SetStateAction<ClassroomFeature[]>>;
  setSelectedTableIds: React.Dispatch<React.SetStateAction<number[]>>;
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

const createSnapshotSignature = (
  scene: ClassroomScene,
  seating: SeatingArrangement,
): string => {
  const sceneHash = hashScene(scene).toString(16);
  const seatingHash = hashSeating(seating).toString(16);
  return `${sceneHash}:${seatingHash}`;
};

/**
 * Custom hook for managing scene history with undo functionality
 * Extracted from SeatingPlanView for better separation of concerns
 */
export function useSceneHistory({
  classroomScene,
  currentSeating,
  setCurrentSeating,
  updateClassroomScene,
  setSceneTables,
  setSceneFeatures,
  setSelectedTableIds,
}: UseSceneHistoryParams): SceneHistoryHook {
  const [history, setHistory] = React.useState<HistorySnapshot[]>([]);
  const historyRef = React.useRef<HistorySnapshot[]>(history);
  const undoInProgress = React.useRef(false);

  React.useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const snapshot = React.useCallback(() => {
    const signature = createSnapshotSignature(classroomScene, currentSeating);

    setHistory((h) => {
      // Prevent redundant snapshots via lightweight hash comparison
      if (h.length > 0 && h[h.length - 1].signature === signature) {
        return h; // No change, skip creating a new snapshot
      }

      const newSnapshot: HistorySnapshot = {
        scene: deepClone(classroomScene),
        seating: deepClone(currentSeating),
        signature,
      };

      // Limit history to 50 entries to avoid memory leaks
      const newHistory = [...h, newSnapshot];
      return newHistory.length > 50 ? newHistory.slice(-50) : newHistory;
    });
  }, [classroomScene, currentSeating]);

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

      // Update state atomically to avoid direct array mutations
      setSceneTables(newTables);
      setSceneFeatures(newFeatures);
      setCurrentSeating(newSeating);
      setSelectedTableIds([]);
      updateClassroomScene(() => ({
        ...snap.scene,
        tables: newTables,
        features: newFeatures,
      }));
    },
    [
      setSceneTables,
      setSceneFeatures,
      setCurrentSeating,
      setSelectedTableIds,
      updateClassroomScene,
    ],
  );

  const undo = React.useCallback(() => {
    // Prevent concurrent undo calls
    if (undoInProgress.current) return;

    const currentHistory = historyRef.current;
    if (currentHistory.length === 0) {
      return;
    }

    const last = currentHistory[currentHistory.length - 1];
    undoInProgress.current = true;
    restoreFromSnapshot(last);

    setHistory((h) => h.slice(0, -1));

    // Reset after a short delay
    setTimeout(() => {
      undoInProgress.current = false;
    }, 100);
  }, [restoreFromSnapshot]);

  const canUndo = history.length > 0;

  return {
    history,
    snapshot,
    undo,
    canUndo,
    restoreFromSnapshot,
  };
}
