// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import ErrorReportLink from '@/components/errors/ErrorReportLink';
import WorkspaceErrorStage from '@/components/errors/WorkspaceErrorStage';

type SeatingPlanErrorFallbackProps = {
  error: Error;
  onRetry: () => void;
  variant: 'layout' | 'plan';
};

export default function SeatingPlanErrorFallback({
  error,
  onRetry,
  variant,
}: SeatingPlanErrorFallbackProps) {
  const { t } = useTranslation('common');

  const variantCopyTranslated = {
    layout: {
      title: t('errors.layoutUnavailable'),
      description: t('errors.layoutDescription'),
    },
    plan: {
      title: t('errors.planUnavailable'),
      description: t('errors.planDescription'),
    },
  };

  const copy = variantCopyTranslated[variant];
  return (
    <WorkspaceErrorStage>
      <div className="rounded-lg border border-(--button-danger-bg) bg-(--button-icon-danger-bg) p-6 text-(--text-page)">
        <h2 className="text-lg font-semibold">{copy.title}</h2>
        <p className="mt-2 text-sm text-(--text-muted)">{copy.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-(--button-primary-bg) px-4 py-2 text-sm font-medium text-(--button-primary-text) transition hover:bg-(--button-primary-bg-hover) focus:outline-none focus:ring-2 focus:ring-(--focus-ring-primary) focus:ring-offset-2"
          >
            {t('common.retry')}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border border-(--border-option-selected) px-4 py-2 text-sm font-medium text-(--text-badge) transition hover:bg-(--surface-option-selected) focus:outline-none focus:ring-2 focus:ring-(--focus-ring-primary) focus:ring-offset-2"
          >
            {t('common.reloadPage')}
          </button>
        </div>
        <ErrorReportLink
          error={error}
          area={variant === 'layout' ? 'LayoutEditor' : 'SeatingPlanView'}
          tone="amber"
        />
        <details className="mt-4 text-xs text-(--text-muted)">
          <summary className="cursor-pointer font-medium">
            {t('common.errorDetails')}
          </summary>
          <pre className="mt-2 whitespace-pre-wrap wrap-break-word rounded bg-(--surface-card) p-3 text-caption leading-relaxed text-(--text-muted) shadow-inner">
            {error.message}
          </pre>
        </details>
      </div>
    </WorkspaceErrorStage>
  );
}
