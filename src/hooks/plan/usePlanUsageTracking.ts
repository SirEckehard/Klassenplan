// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Feeds the plan usage record from the signal only the generator knows about:
 * seats rearranged by hand.
 *
 * Presenting and exporting are raised by the pages that own those actions; the
 * one-time backfill from older saved plans runs where the class snapshot is
 * loaded, which is the only place a class id and its plans are guaranteed to
 * belong together.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { SeatingArrangement } from '@/types';
import { logError } from '@/utils';
import { recordPlanUsage } from '@/repositories/planUsageStore';

const LOG_SOURCE = 'usePlanUsageTracking';

/**
 * Quiet period after the last seat swap before the arrangement is recorded.
 * Rearranging a plan takes several drags, and only the result is interesting —
 * waiting also keeps a drag session from writing to storage on every drop.
 */
const EDIT_SIGNAL_DEBOUNCE_MS = 4000;

export interface PlanUsageTrackingParams {
  /** Active class; without one nothing is recorded. */
  classId: string | null;
  currentSeating: SeatingArrangement;
}

export interface PlanUsageTrackingReturn {
  /** Call after a seat swap; records the arrangement once the drags stop. */
  noteSeatingEdited: () => void;
}

export function usePlanUsageTracking({
  classId,
  currentSeating,
}: PlanUsageTrackingParams): PlanUsageTrackingReturn {
  // Read at fire time rather than captured, so the debounced signal records the
  // arrangement as it ends up, not as it was on the first drag.
  const seatingRef = useRef(currentSeating);
  const classIdRef = useRef(classId);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    seatingRef.current = currentSeating;
  }, [currentSeating]);

  // Switching class drops a pending edit signal. The arrangement is read at
  // fire time, so letting it through would record the class we just arrived in
  // under an edit that happened in the one we left.
  useEffect(() => {
    classIdRef.current = classId;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [classId]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const noteSeatingEdited = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      recordPlanUsage(classIdRef.current, seatingRef.current, 'edited').catch(
        (error) => {
          logError(
            'Failed to record plan usage signal',
            { error, source: 'edited' },
            LOG_SOURCE,
          );
        },
      );
    }, EDIT_SIGNAL_DEBOUNCE_MS);
  }, []);

  return { noteSeatingEdited };
}
