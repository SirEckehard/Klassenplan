// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useMemo, useState } from 'react';
import { useClassManagementContext } from '@/contexts/seatingPlan/ClassManagementContext';
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';
import { logError, toIsoDate } from '@/utils';
import {
  isMarkerReviewSnoozed,
  MARKER_REVIEW_AGE_WEEKS,
  snoozeMarkerReview,
  staleMarkerCount,
} from '@/utils/data/markerReview';

export interface MarkerReviewView {
  /** How many students' markers stood still past the review age */
  stale: number;
  /** Whether the question is due: stale markers, no snooze running */
  isDue: boolean;
  /** After how many weeks unchanged markers are asked about */
  weeks: number;
  /** When "Passt noch" was last pressed, `YYYY-MM-DD` */
  reviewedAt?: string;
  /** "Passt noch": the class's markers hold as of today */
  confirm: () => void;
  /** "Später": asks again in a week */
  later: () => void;
}

/**
 * Whether the open class's markers are due for a look (decision 0044), and
 * the two answers to the question.
 */
export function useMarkerReview(): MarkerReviewView {
  const { activeClass, updateClassMetadata } = useClassManagementContext();
  const { students } = useSeatingPlanState();
  // "Später" writes to localStorage, which renders nothing by itself.
  const [, setSnoozes] = useState(0);
  const classId = activeClass.id;

  const stale = useMemo(
    () =>
      classId
        ? staleMarkerCount({
            students,
            createdAt: activeClass.createdAt,
            reviewedAt: activeClass.markersReviewedAt,
          })
        : 0,
    [classId, students, activeClass.createdAt, activeClass.markersReviewedAt],
  );
  // Read on every render: a look into localStorage, and a snooze ends with
  // the clock, not with an event.
  const snoozed = classId ? isMarkerReviewSnoozed(classId) : false;

  const confirm = useCallback(() => {
    if (!classId) return;
    updateClassMetadata(classId, { markersReviewedAt: toIsoDate() }).catch(
      (error: unknown) => {
        logError(
          'Could not note the marker review',
          { error },
          'useMarkerReview',
        );
      },
    );
  }, [classId, updateClassMetadata]);

  const later = useCallback(() => {
    if (!classId) return;
    snoozeMarkerReview(classId);
    setSnoozes((count) => count + 1);
  }, [classId]);

  return {
    stale,
    isDue: stale > 0 && !snoozed,
    weeks: MARKER_REVIEW_AGE_WEEKS,
    reviewedAt: activeClass.markersReviewedAt,
    confirm,
    later,
  };
}
