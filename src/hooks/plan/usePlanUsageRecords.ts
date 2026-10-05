// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Holds the plan usage records of the active class.
 *
 * Signals are raised from several places, some of them on other routes, so the
 * hook subscribes to the store rather than reloading at chosen moments — that
 * way the neighbourhood view and the repetition scoring always read the same,
 * current set of records. The records come resolved for the class's mode
 * (`resolvePlanUsageMode`): with the detection switched off, only what the
 * teacher marked as used counts.
 */
import { useCallback, useEffect, useState } from 'react';
import type { PlanUsage, SeatingArrangement } from '@/types';
import { logError } from '@/utils';
import { resolvePlanUsageMode } from '@/utils/data/planUsage';
import {
  loadPlanUsage,
  loadPlanUsageManual,
  loadPlanUsageResetAt,
  markPlanUsed,
  resetPlanUsage,
  setPlanUsageConfirmed,
  setPlanUsageManual,
  subscribeToPlanUsage,
  undoPlanUsageReset,
  type PlanUsageResetSnapshot,
} from '@/repositories/planUsageStore';

const LOG_SOURCE = 'usePlanUsageRecords';

export interface PlanUsageRecordsReturn {
  /** Records of the active class; empty until the first load resolves. */
  planUsage: PlanUsage[];
  /** When the class's neighbourhoods were last reset, or null if never. */
  planUsageSince: string | null;
  /** Whether the class marks its plans by hand instead of detecting them. */
  planUsageManual: boolean;
  /** Answer the confirmation for one record; the store push updates the list. */
  setUsageConfirmed: (usageId: string, confirmed: boolean) => void;
  /** Switch the detection off (`true`) or back on. */
  setUsageManual: (manual: boolean) => void;
  /**
   * Mark a plan as used or not; `at` dates a record it creates (ISO 8601).
   */
  markUsed: (seating: SeatingArrangement, used: boolean, at: string) => void;
  /** Start the class's neighbourhoods afresh; resolves to what it took away. */
  resetUsage: () => Promise<PlanUsageResetSnapshot | null>;
  /** Take a reset back. */
  undoReset: (snapshot: PlanUsageResetSnapshot) => Promise<void>;
}

export function usePlanUsageRecords(
  classId: string | null,
): PlanUsageRecordsReturn {
  const [planUsage, setPlanUsage] = useState<PlanUsage[]>([]);
  const [planUsageSince, setPlanUsageSince] = useState<string | null>(null);
  const [planUsageManual, setPlanUsageManualState] = useState(false);

  useEffect(() => {
    let active = true;

    const load = () => {
      Promise.all([
        loadPlanUsage(classId),
        loadPlanUsageResetAt(classId),
        loadPlanUsageManual(classId),
      ])
        .then(([records, resetAt, manual]) => {
          if (!active) return;
          setPlanUsage(resolvePlanUsageMode(records, manual));
          setPlanUsageSince(resetAt);
          setPlanUsageManualState(manual);
        })
        .catch((error) => {
          logError('Failed to load plan usage records', { error }, LOG_SOURCE);
        });
    };

    load();
    const unsubscribe = subscribeToPlanUsage(load);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [classId]);

  const setUsageConfirmed = useCallback(
    (usageId: string, confirmed: boolean) => {
      setPlanUsageConfirmed(classId, usageId, confirmed).catch((error) => {
        logError(
          'Failed to update plan usage confirmation',
          { error, usageId },
          LOG_SOURCE,
        );
      });
    },
    [classId],
  );

  const setUsageManual = useCallback(
    (manual: boolean) => {
      setPlanUsageManual(classId, manual).catch((error) => {
        logError(
          'Failed to switch plan usage detection',
          { error, manual },
          LOG_SOURCE,
        );
      });
    },
    [classId],
  );

  const markUsed = useCallback(
    (seating: SeatingArrangement, used: boolean, at: string) => {
      markPlanUsed(classId, seating, used, at).catch((error) => {
        logError('Failed to mark a plan as used', { error, used }, LOG_SOURCE);
      });
    },
    [classId],
  );

  const resetUsage = useCallback(
    () =>
      resetPlanUsage(classId).catch((error: unknown) => {
        logError('Failed to reset plan usage', { error }, LOG_SOURCE);
        return null;
      }),
    [classId],
  );

  const undoReset = useCallback(
    (snapshot: PlanUsageResetSnapshot) =>
      undoPlanUsageReset(classId, snapshot).catch((error: unknown) => {
        logError('Failed to undo a plan usage reset', { error }, LOG_SOURCE);
      }),
    [classId],
  );

  return {
    planUsage,
    planUsageSince,
    planUsageManual,
    setUsageConfirmed,
    setUsageManual,
    markUsed,
    resetUsage,
    undoReset,
  };
}
