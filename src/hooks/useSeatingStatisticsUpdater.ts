// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useMemo } from 'react';
import type {
  SeatingArrangement,
  MixSettings,
  ClassroomScene,
  Student,
  SavedPlan,
  MixResult,
} from '@/types';
import type { CriterionFulfillment } from '@/utils/algorithm/seatingStatistics';
import {
  calculateSeatingStatistics,
  getTopFulfilledCriteria,
} from '@/utils/algorithm/seatingStatistics';

/**
 * Calculate statistics for the current seating arrangement.
 * This is a shared utility used by both automatic mixing and manual changes.
 */
export function calculateCurrentStatistics(
  arrangement: SeatingArrangement,
  students: Student[],
  settings: Partial<MixSettings>,
  seatingHistory: SavedPlan[],
  scene: ClassroomScene,
  mixHistory: MixResult[],
  topN?: number,
): CriterionFulfillment[] {
  const stats = calculateSeatingStatistics(
    arrangement,
    students,
    settings,
    seatingHistory,
    scene,
    { mixHistory },
  );
  return getTopFulfilledCriteria(stats, settings, topN);
}

interface UseSeatingStatisticsUpdaterParams {
  currentSeating: SeatingArrangement;
  students: Student[];
  mixSettings: Partial<MixSettings>;
  seatingHistory: SavedPlan[];
  mixHistory: MixResult[];
  classroomScene: ClassroomScene;
  setLastStatistics: (stats: CriterionFulfillment[] | null) => void;
  enabled?: boolean;
}

/**
 * Automatically update seating statistics whenever the current seating changes.
 * This hook ensures the statistics badge reflects the current state,
 * whether changed by the algorithm or manual user interactions.
 */
export function useSeatingStatisticsUpdater({
  currentSeating,
  students,
  mixSettings,
  seatingHistory,
  mixHistory,
  classroomScene,
  setLastStatistics,
  enabled = true,
}: UseSeatingStatisticsUpdaterParams) {
  // Memoize statistics calculation to avoid unnecessary recalculations
  const currentStatistics = useMemo(() => {
    // Don't calculate if disabled or no seating arrangement
    if (!enabled || currentSeating.length === 0) {
      return null;
    }

    return calculateCurrentStatistics(
      currentSeating,
      students,
      mixSettings,
      seatingHistory,
      classroomScene,
      mixHistory,
    );
  }, [
    enabled,
    currentSeating,
    students,
    mixSettings,
    seatingHistory,
    mixHistory,
    classroomScene,
  ]);

  // Update lastStatistics whenever currentStatistics changes
  useEffect(() => {
    if (enabled) {
      setLastStatistics(currentStatistics);
    }
  }, [currentStatistics, setLastStatistics, enabled]);
}
