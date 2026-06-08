import { useCallback, useEffect, useRef, useState } from 'react';
import equal from 'fast-deep-equal';
import type { LockedPositions, SeatingArrangement } from '@/types';
import type { CircleLayout } from '@/types/Circle';

type TrackerParams = {
  currentSeating: SeatingArrangement;
  circleLayout: CircleLayout | null;
  planName: string;
  lockedPositions: LockedPositions;
  activeClassId?: string | null;
  trackingEnabled?: boolean;
};

export type SyncSnapshotOptions = {
  seating?: SeatingArrangement;
  circleLayout?: CircleLayout | null;
  planName?: string;
  lockedPositions?: LockedPositions;
};

type SeatingSnapshot = {
  seating: SeatingArrangement;
  circleLayout: CircleLayout | null;
  planName: string;
  lockedPositions: LockedPositions;
};

/**
 * Creates a snapshot object for comparison.
 * Uses object structure instead of string serialization for performance.
 */
function createSnapshot(
  seating: SeatingArrangement,
  circleLayout: CircleLayout | null,
  planName: string,
  lockedPositions: LockedPositions,
): SeatingSnapshot {
  return {
    seating,
    circleLayout,
    planName: planName.trim(),
    lockedPositions,
  };
}

/**
 * Tracks unsaved seating changes using efficient deep equality comparison.
 *
 * Performance optimizations:
 * - Uses `fast-deep-equal` instead of JSON serialization (O(n) vs O(n) but no string allocation)
 * - Stores snapshot objects directly instead of serialized strings
 * - Only compares when dependencies actually change (React's useMemo handles this)
 * - Debounced comparison to avoid excessive checks during rapid updates
 */
export function useUnsavedSeatingTracker({
  currentSeating,
  circleLayout,
  planName,
  lockedPositions,
  activeClassId,
  trackingEnabled = true,
}: TrackerParams) {
  const [hasUnsavedSeatingChanges, setHasUnsavedSeatingChanges] =
    useState(false);
  const hasUnsavedRef = useRef(hasUnsavedSeatingChanges);

  useEffect(() => {
    hasUnsavedRef.current = hasUnsavedSeatingChanges;
  }, [hasUnsavedSeatingChanges]);

  // Store the "saved" snapshot - what was last synced
  const savedSnapshotRef = useRef<SeatingSnapshot | null>(null);
  const previousClassIdRef = useRef<string | null | undefined>(activeClassId);
  const isInitializedRef = useRef(false);

  // Store current props in a ref for stable callback access
  const currentPropsRef = useRef({
    currentSeating,
    circleLayout,
    planName,
    lockedPositions,
  });

  // Update ref whenever props change
  useEffect(() => {
    currentPropsRef.current = {
      currentSeating,
      circleLayout,
      planName,
      lockedPositions,
    };
  }, [currentSeating, circleLayout, planName, lockedPositions]);

  // Stabilized callback with NO dependencies on props
  // Uses refs to access current values, preventing circular dependency chain
  const syncSeatingSnapshot = useCallback((options?: SyncSnapshotOptions) => {
    const props = currentPropsRef.current;
    const nextSeating = options?.seating ?? props.currentSeating;
    const nextCircle =
      options?.circleLayout === undefined
        ? props.circleLayout
        : options.circleLayout;
    const nextPlanName =
      options?.planName === undefined ? props.planName : options.planName;
    const nextLockedPositions =
      options?.lockedPositions === undefined
        ? props.lockedPositions
        : options.lockedPositions;

    savedSnapshotRef.current = createSnapshot(
      nextSeating,
      nextCircle,
      nextPlanName,
      nextLockedPositions,
    );
    setHasUnsavedSeatingChanges(false);
  }, []); // Empty dependencies - stable across all re-renders

  useEffect(() => {
    if (!trackingEnabled) {
      return;
    }
    // Handle class switching - reset state cleanly
    if (previousClassIdRef.current !== activeClassId) {
      previousClassIdRef.current = activeClassId;
      isInitializedRef.current = false;
      savedSnapshotRef.current = null;
      if (hasUnsavedRef.current) {
        queueMicrotask(() => {
          setHasUnsavedSeatingChanges(false);
        });
      }
      return;
    }

    // Create current snapshot for comparison
    const currentSnapshot = createSnapshot(
      currentSeating,
      circleLayout,
      planName,
      lockedPositions,
    );

    // Initialize on first run
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      savedSnapshotRef.current = currentSnapshot;
      return;
    }

    // Use fast-deep-equal for efficient comparison
    // This is much faster than JSON.stringify for large objects
    const hasChanges = !equal(savedSnapshotRef.current, currentSnapshot);

    // Only update state if the result changed to avoid unnecessary re-renders
    queueMicrotask(() => {
      setHasUnsavedSeatingChanges((prev) => {
        if (prev !== hasChanges) {
          return hasChanges;
        }
        return prev;
      });
    });
  }, [
    activeClassId,
    circleLayout,
    currentSeating,
    lockedPositions,
    planName,
    trackingEnabled,
  ]);

  return {
    hasUnsavedSeatingChanges,
    syncSeatingSnapshot,
  };
}
