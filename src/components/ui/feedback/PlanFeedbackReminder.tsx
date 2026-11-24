// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { NotebookIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { usePlanFeedbackPrompt } from '@/hooks/plan/usePlanFeedbackPrompt';
import { formatLongDate, neutralButtonClass } from '@/utils';

/**
 * Asks once how the last plan in use went (decision 0054, addendum of
 * 2026-11-24), shaped as the question whether the markers still hold: on the
 * plan layer, one notice at a time. "Gut" and "Nicht gut" keep what the
 * plan's inspector keeps; the tables where it did not work are named there.
 */
export default function PlanFeedbackReminder() {
  const { t } = useTranslation('generator');
  const { record, planName, rate, later } = usePlanFeedbackPrompt();

  if (!record) return null;
  const since = formatLongDate(record.firstSeenAt);

  return (
    // Below `lg` the plan has to fit the page beside it: the card keeps its
    // question and its answers, the icon and the hint go.
    <section
      aria-labelledby="plan-feedback-prompt-title"
      className="mb-6 rounded-lg border border-(--border-card) bg-(--surface-card) px-4 py-5 text-(--text-page) max-lg:mb-3 max-lg:py-3"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-(--surface-sunken) text-(--text-muted) max-lg:hidden">
          <NotebookIcon aria-hidden="true" className="h-6 w-6" />
        </span>
        <div className="flex-1 space-y-3 max-lg:space-y-2">
          <div>
            <h2
              id="plan-feedback-prompt-title"
              className="text-xs font-semibold uppercase tracking-wide text-(--text-muted)"
            >
              {t('planFeedbackPrompt.eyebrow')}
            </h2>
            <p className="mt-2 text-sm">
              {planName
                ? t('planFeedbackPrompt.named', { name: planName, since })
                : t('planFeedbackPrompt.unnamed', { since })}
            </p>
            <p className="mt-1 text-sm text-(--text-muted) max-lg:hidden">
              {t('planFeedbackPrompt.why')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => rate('good')}
              className={neutralButtonClass}
            >
              {t('planFeedback.ratedGood')}
            </button>
            <button
              type="button"
              onClick={() => rate('poor')}
              className={neutralButtonClass}
            >
              {t('planFeedback.ratedPoor')}
            </button>
            <button
              type="button"
              onClick={later}
              className="text-sm font-medium text-(--text-muted) underline decoration-(--border-card) underline-offset-4 transition hover:text-(--text-page) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:ring-offset-2"
            >
              {t('planFeedbackPrompt.later')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
