// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { isTopDialogLayer, useDialogLayer } from '@/hooks/ui/useDialogLayer';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import type {
  PlanFeedbackAnswer,
  PlanFeedbackQuestion,
} from '@/hooks/plan/usePlanFeedbackFlow';
import { formatLongDate, quietLinkClass, secondaryButtonClass } from '@/utils';

const BUTTON_SIZE_CLASS = 'h-8 px-3 text-xs pointer-coarse:h-11';

/**
 * What "Mischen" asks before it mixes a plan in use over (decision 0054,
 * addendum of 2026-11-27): how that plan went. It stands over the button
 * that asked, as a question before a deletion does (decision 0041), with
 * nothing dimmed, so the plan it is about stays in sight. The focus starts
 * on "Überspringen & mischen", so a reflexive Enter mixes as it always did;
 * Escape and a press anywhere else put it away without mixing.
 */
export default function MixFeedbackQuestion({
  question,
  onAnswer,
  insideRef,
}: {
  question: PlanFeedbackQuestion;
  onAnswer: (answer: PlanFeedbackAnswer) => void;
  /** What counts as inside besides the question: the button that asked. */
  insideRef: React.RefObject<HTMLElement | null>;
}) {
  const { t } = useTranslation('generator');
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const skipRef = React.useRef<HTMLButtonElement | null>(null);
  const titleId = React.useId();
  const detailId = React.useId();
  const layerId = useDialogLayer(true);

  const onAnswerRef = React.useRef(onAnswer);
  React.useLayoutEffect(() => {
    onAnswerRef.current = onAnswer;
  });

  React.useLayoutEffect(() => {
    skipRef.current?.focus();
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !isTopDialogLayer(layerId)) return;
      event.preventDefault();
      event.stopPropagation();
      onAnswerRef.current('dismiss');
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [layerId]);

  const insideRefs = React.useMemo(() => [rootRef, insideRef], [insideRef]);
  const dismiss = React.useCallback(() => onAnswerRef.current('dismiss'), []);
  useClickOutside(insideRefs, dismiss);

  const since = formatLongDate(question.record.firstSeenAt);

  return (
    <div
      ref={rootRef}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={detailId}
      className="absolute bottom-full left-1/2 z-30 mb-3 flex w-72 -translate-x-1/2 flex-col gap-2.5 rounded-lg border border-(--border-card) bg-(--surface-card) p-3 text-left shadow-lg"
    >
      <div className="min-w-0 text-control">
        <p id={titleId} className="font-semibold text-(--text-page)">
          {question.planName
            ? t('planFeedbackPrompt.named', { name: question.planName, since })
            : t('planFeedbackPrompt.unnamed', { since })}
        </p>
        <p id={detailId} className="text-(--text-muted)">
          {t('planFeedbackPrompt.effect')}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onAnswer('good')}
          title={t('planFeedback.good')}
          className={`${secondaryButtonClass} ${BUTTON_SIZE_CLASS}`}
        >
          {t('planFeedback.ratedGood')}
        </button>
        <button
          type="button"
          onClick={() => onAnswer('poor')}
          title={t('planFeedback.poor')}
          className={`${secondaryButtonClass} ${BUTTON_SIZE_CLASS}`}
        >
          {t('planFeedback.ratedPoor')}
        </button>
        <button
          ref={skipRef}
          type="button"
          onClick={() => onAnswer('skip')}
          className={`${quietLinkClass} ml-auto text-xs underline pointer-coarse:min-h-11`}
        >
          {t('planFeedbackPrompt.skip')}
        </button>
      </div>
    </div>
  );
}
