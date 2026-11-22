// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Says how a plan in use went, or takes it back (decision 0054), for one
 * class. The store tells every holder of the class's records, so the plan
 * layer, "Bibliothek" and the mixing read the change alike.
 */
import { useCallback } from 'react';
import type { PlanFeedback, SeatingArrangement } from '@/types';
import { logError } from '@/utils';
import { setPlanFeedback } from '@/repositories/planUsageStore';

const LOG_SOURCE = 'useSetPlanFeedback';

/**
 * @param classId The class the plans belong to
 * @returns Keeps feedback on a plan's arrangement, or takes it back with
 *   `null`; `at` dates a record it creates (ISO 8601)
 */
export function useSetPlanFeedback(
  classId: string | null,
): (
  seating: SeatingArrangement,
  feedback: PlanFeedback | null,
  at: string,
) => void {
  return useCallback(
    (seating, feedback, at) => {
      setPlanFeedback(classId, seating, feedback, at).catch((error) => {
        logError(
          'Failed to keep how a plan went',
          { error, rating: feedback?.rating ?? null },
          LOG_SOURCE,
        );
      });
    },
    [classId],
  );
}
