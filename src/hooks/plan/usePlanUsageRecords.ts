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
  setPlanUsageConfirmed,
  subscribeToPlanUsage,
} from '@/repositories/planUsageStore';

const LOG_SOURCE = 'usePlanUsageRecords';

export interface PlanUsageRecordsReturn {
  /** Records of the active class; empty until the first load resolves. */
  planUsage: PlanUsage[];
  /** Answer the confirmation for one record; the store push updates the list. */
  setUsageConfirmed: (usageId: string, confirmed: boolean) => void;
}

export function usePlanUsageRecords(
  classId: string | null,
): PlanUsageRecordsReturn {
  const [planUsage, setPlanUsage] = useState<PlanUsage[]>([]);

  useEffect(() => {
    let active = true;

    const load = () => {
      loadPlanUsage(classId)
        .then((records) => {
          if (active) setPlanUsage(records);
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

  return { planUsage, setUsageConfirmed };
}
