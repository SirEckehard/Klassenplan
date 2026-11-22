// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useMemo, useState } from 'react';
import type {
  SeatingArrangement,
  MixSettings,
  ClassroomScene,
  Student,
  SavedPlan,
  PlanUsage,
} from '@/types';
import type { CriterionFulfillment } from '@/utils/algorithm/seatingStatistics';
import { logWarn } from '@/utils';
import { loadOnDemand } from '@/utils/performance/chunkLoad';

export type SeatingStatisticsModule =
  typeof import('@/utils/algorithm/seatingStatistics');

/**
 * The fulfilment and the criterion model beneath it, fetched with the plan
 * layer rather than with the app. The provider that computes it wraps every
 * page, yet computes it on the plan layer alone, whose own chunk imports the
 * module anyway; kept out of the initial payload, it spares the start page
 * about 10 KB brotli (`scripts/check-bundle.mjs`).
 */
export const seatingStatistics = loadOnDemand<SeatingStatisticsModule>(
  () => import('@/utils/algorithm/seatingStatistics'),
  'useSeatingStatisticsUpdater',
);

/**
 * Calculate statistics for the current seating arrangement.
 * This is a shared utility used by both automatic mixing and manual changes.
 */
export function calculateCurrentStatistics(
  {
    calculateSeatingStatistics,
    getTopFulfilledCriteria,
  }: SeatingStatisticsModule,
  arrangement: SeatingArrangement,
  students: Student[],
  settings: Partial<MixSettings>,
  seatingHistory: SavedPlan[],
  scene: ClassroomScene,
  options?: {
    topN?: number;
    planUsage?: PlanUsage[];
    planUsageSince?: string | null;
    /** Whether the class marks its plans by hand; see `buildPreviousPairs`. */
    planUsageManual?: boolean;
  },
): CriterionFulfillment[] {
  const stats = calculateSeatingStatistics(
    arrangement,
    students,
    settings,
    seatingHistory,
    scene,
    {
      planUsage: options?.planUsage,
      planUsageSince: options?.planUsageSince,
      planUsageManual: options?.planUsageManual,
    },
  );
  return getTopFulfilledCriteria(stats, settings, options?.topN);
}

interface UseSeatingStatisticsUpdaterParams {
  currentSeating: SeatingArrangement;
  students: Student[];
  mixSettings: Partial<MixSettings>;
  seatingHistory: SavedPlan[];
  /** Records of plans that were really in use; see `buildPreviousPairs`. */
  planUsage: PlanUsage[];
  /** When the neighbourhoods were last reset; see `buildPreviousPairs`. */
  planUsageSince?: string | null;
  /** Whether the class marks its plans by hand; see `buildPreviousPairs`. */
  planUsageManual?: boolean;
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
  planUsage,
  planUsageSince = null,
  planUsageManual = false,
  classroomScene,
  setLastStatistics,
  enabled = true,
}: UseSeatingStatisticsUpdaterParams) {
  // At hand once the plan layer fetched it; until then nothing is computed.
  const [statistics, setStatistics] = useState(seatingStatistics.get);

  useEffect(() => {
    if (!enabled || statistics) {
      return;
    }
    let current = true;
    seatingStatistics.load().then(
      (module) => {
        if (current) {
          setStatistics(module);
        }
      },
      (error: unknown) => {
        // The plan stays usable; its fulfilment shows once a later change
        // loads the module.
        logWarn(
          'Could not load the seating statistics',
          { error },
          'useSeatingStatisticsUpdater',
        );
      },
    );
    return () => {
      current = false;
    };
  }, [enabled, statistics]);

  // Memoize statistics calculation to avoid unnecessary recalculations
  const currentStatistics = useMemo(() => {
    // Don't calculate if disabled, without a seating arrangement or before
    // the module has loaded
    if (!enabled || currentSeating.length === 0 || !statistics) {
      return null;
    }

    return calculateCurrentStatistics(
      statistics,
      currentSeating,
      students,
      mixSettings,
      seatingHistory,
      classroomScene,
      { planUsage, planUsageSince, planUsageManual },
    );
  }, [
    enabled,
    statistics,
    currentSeating,
    students,
    mixSettings,
    seatingHistory,
    planUsage,
    planUsageSince,
    planUsageManual,
    classroomScene,
  ]);

  // Update lastStatistics whenever currentStatistics changes
  useEffect(() => {
    if (enabled) {
      setLastStatistics(currentStatistics);
    }
  }, [currentStatistics, setLastStatistics, enabled]);
}
