// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { ClockCounterClockwiseIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import {
  useSeatingAlgorithmContext,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import { useMarkerReview } from '@/hooks/useMarkerReview';
import { neutralButtonClass } from '@/utils';

/**
 * Asks once whether a class's markers still hold (decision 0044): on the plan
 * layer, where they act, after they stood still for the review age.
 * Nothing changes by itself — the teacher looks at the class list, says they
 * hold, or is asked again in a week.
 */
export default function MarkerReviewReminder() {
  const { t } = useTranslation('generator');
  const { step } = useSeatingAlgorithmContext();
  const { handleStepChange } = useSeatingPlanActions();
  const { isDue, stale, weeks, confirm, later } = useMarkerReview();

  if (step !== 3 || !isDue) return null;

  return (
    <section
      aria-labelledby="marker-review-title"
      className="mb-6 rounded-lg border border-(--border-card) bg-(--surface-card) px-4 py-5 text-(--text-page)"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-(--surface-sunken) text-(--text-muted)">
          <ClockCounterClockwiseIcon aria-hidden="true" className="h-6 w-6" />
        </span>
        <div className="flex-1 space-y-3">
          <div>
            <h2
              id="marker-review-title"
              className="text-xs font-semibold uppercase tracking-wide text-(--text-muted)"
            >
              {t('markerReview.eyebrow')}
            </h2>
            <p className="mt-2 text-sm">
              {t('markerReview.stale', {
                count: stale,
                weeks,
              })}
            </p>
            <p className="mt-1 text-sm text-(--text-muted)">
              {t('markerReview.why')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleStepChange(1)}
              className={neutralButtonClass}
            >
              {t('markerReview.review')}
            </button>
            <button
              type="button"
              onClick={confirm}
              className={neutralButtonClass}
            >
              {t('markerReview.confirm')}
            </button>
            <button
              type="button"
              onClick={later}
              className="text-sm font-medium text-(--text-muted) underline decoration-(--border-card) underline-offset-4 transition hover:text-(--text-page) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:ring-offset-2"
            >
              {t('markerReview.later')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
