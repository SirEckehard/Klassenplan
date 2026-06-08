/**
 * Hook for auto-persisting class data when state changes.
 * Extracted from useSeatingPersistence for better separation of concerns.
 */
import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type MutableRefObject,
} from 'react';
import type {
  ClassroomScene,
  LockedPositions,
  MixSettings,
  MixResult,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import type { CircleLayout } from '@/types/Circle';
import type { PersistQueueReturn } from './usePersistQueue';
import type { PersistKey, PersistPayloadMap } from './types';

export interface ClassDataState {
  students: Student[];
  seatingHistory: SavedPlan[];
  mixHistory: MixResult[];
  currentSeating: SeatingArrangement;
  lockedPositions: LockedPositions;
  mixSettings: MixSettings;
  classroomScene: ClassroomScene;
  circleLayout: CircleLayout | null;
  activePlanId: string | null;
  activeClassId: string | null;
  hasActiveClass: boolean;
}

export interface ClassDataPersistenceReturn {
  /** Reload current class data from storage */
  reloadCurrentClassData: () => Promise<{
    currentSeating: SeatingArrangement;
    circleLayout: CircleLayout | null;
    lockedPositions: LockedPositions;
    planName: string;
  }>;
}

export interface LoadedSnapshot {
  classCollectionResult: {
    success: boolean;
    data?: { activeClassId?: string | null; classes?: Array<{ id: string }> };
    error?: unknown;
  };
  activeClassSnapshotResult: {
    success: boolean;
    data?: {
      currentSeating?: SeatingArrangement;
      circleLayout?: CircleLayout | null;
      lockedPositions?: LockedPositions;
      seatingHistory?: SavedPlan[];
      activePlanId?: string | null;
      students?: Student[];
      mixHistory?: MixResult[];
      mixSettings?: MixSettings | null;
      classroomScene?: ClassroomScene | null;
    };
    error?: { type?: string; message?: string };
  };
}

/**
 * Hook for auto-persisting class data and managing class data lifecycle.
 *
 * @param state - Current class data state
 * @param queue - Persist queue operations
 * @param fetchPersistedState - Function to fetch persisted state
 * @param applyPersistedState - Function to apply loaded state
 * @param isRestoringRef - Ref indicating if restore is in progress
 * @returns Class data persistence operations
 */
export function useClassDataPersistence(
  state: ClassDataState,
  queue: PersistQueueReturn,
  fetchPersistedState: () => Promise<LoadedSnapshot>,
  applyPersistedState: (snapshot: LoadedSnapshot) => void,
  isRestoringRef: MutableRefObject<boolean>,
): ClassDataPersistenceReturn {
  const {
    students,
    seatingHistory,
    mixHistory,
    currentSeating,
    lockedPositions,
    mixSettings,
    classroomScene,
    circleLayout,
    activePlanId,
    activeClassId,
    hasActiveClass,
  } = state;

  const { queuePersist, flushPersistQueue, clearQueue } = queue;

  // Clear queue when class changes to prevent cross-contamination
  useEffect(() => {
    // CRITICAL: Clear both queue and snapshot when class changes
    // to prevent old class data from being written to new class
    clearQueue();
  }, [activeClassId, clearQueue]);

  // Create a memoized snapshot of all persistable data for efficient comparison
  const persistableData = useMemo(
    () => ({
      students,
      seatingHistory,
      mixHistory,
      currentSeating,
      lockedPositions,
      mixSettings,
      classroomScene,
      circleLayout,
      activePlanId,
    }),
    [
      students,
      seatingHistory,
      mixHistory,
      currentSeating,
      lockedPositions,
      mixSettings,
      classroomScene,
      circleLayout,
      activePlanId,
    ],
  );

  // Track previous data for comparison
  const previousDataRef = useRef<typeof persistableData | null>(null);

  // Single consolidated effect for auto-persisting all data types
  // This replaces 10 separate useEffects with a single one that:
  // 1. Compares current data with previous data
  // 2. Queues only changed keys for persistence
  // 3. Batches multiple changes into a single flush cycle
  useEffect(() => {
    if (!hasActiveClass) return;

    const previousData = previousDataRef.current;
    previousDataRef.current = persistableData;

    // Skip on initial mount - no previous data to compare
    if (!previousData) return;

    // Queue only keys where data has actually changed
    (
      Object.keys(persistableData) as Array<keyof typeof persistableData>
    ).forEach((key) => {
      const currentValue = persistableData[key];
      const previousValue = previousData[key];
      // Use Object.is for accurate comparison (handles NaN, -0, etc.)
      if (!Object.is(currentValue, previousValue)) {
        // Type assertion is safe because key is from persistableData keys
        queuePersist(
          key as PersistKey,
          currentValue as PersistPayloadMap[PersistKey],
        );
      }
    });
  }, [hasActiveClass, queuePersist, persistableData]);

  const reloadCurrentClassData = useCallback(async () => {
    try {
      // Flush any pending persist operations before loading new class data
      // to prevent data loss during class switches
      await flushPersistQueue();

      // CRITICAL: Clear queue again after flush to prevent any jobs
      // that were added during flush from being written
      clearQueue();

      const snapshot = await fetchPersistedState();
      applyPersistedState(snapshot);
      const activeSnapshot = snapshot.activeClassSnapshotResult.success
        ? snapshot.activeClassSnapshotResult.data
        : null;
      return {
        currentSeating: activeSnapshot?.currentSeating ?? [],
        circleLayout: activeSnapshot?.circleLayout ?? null,
        lockedPositions: activeSnapshot?.lockedPositions ?? {},
        planName:
          activeSnapshot?.seatingHistory?.find(
            (p) => p.id === activeSnapshot.activePlanId,
          )?.name ?? '',
      };
    } finally {
      // Fallback: ensure we never leave persistence locked if loading fails
      if (isRestoringRef.current) {
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 0);
      }
    }
  }, [
    applyPersistedState,
    clearQueue,
    fetchPersistedState,
    flushPersistQueue,
    isRestoringRef,
  ]);

  return {
    reloadCurrentClassData,
  };
}
