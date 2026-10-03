// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Holds the plan usage records of the active class.
 *
 * Signals are raised from several places, some of them on other routes, so the
 * hook subscribes to the store rather than reloading at chosen moments — that
 * way the neighbourhood view and the repetition scoring always read the same,
 * current set of records.
 */
import { useCallback, useEffect, useState } from 'react';
import type { PlanUsage } from '@/types';
import { logError } from '@/utils';
import {
  loadPlanUsage,
  loadPlanUsageResetAt,
  resetPlanUsage,
  setPlanUsageConfirmed,
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
  /** Answer the confirmation for one record; the store push updates the list. */
  setUsageConfirmed: (usageId: string, confirmed: boolean) => void;
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

  useEffect(() => {
    let active = true;

    const load = () => {
      Promise.all([loadPlanUsage(classId), loadPlanUsageResetAt(classId)])
        .then(([records, resetAt]) => {
          if (!active) return;
          setPlanUsage(records);
          setPlanUsageSince(resetAt);
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
    setUsageConfirmed,
    resetUsage,
    undoReset,
  };
}
