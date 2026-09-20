// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import ErrorReportLink from '@/components/errors/ErrorReportLink';

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
      title: t(
        'errors.layoutUnavailable',
        'Layout-Editor vorübergehend nicht verfügbar',
      ),
      description: t(
        'errors.layoutDescription',
        'Beim Rendern des Klassenzimmer-Layouts ist ein Fehler aufgetreten. Bitte versuche es erneut oder lade die Seite neu.',
      ),
    },
    plan: {
      title: t(
        'errors.planUnavailable',
        'Sitzplan-Ansicht konnte nicht angezeigt werden',
      ),
      description: t(
        'errors.planDescription',
        'Beim Rendern des Sitzplans ist ein Fehler aufgetreten. Bitte versuche es erneut oder lade die Seite neu.',
      ),
    },
  };

  const copy = variantCopyTranslated[variant];
  return (
    <div className="rounded-lg border border-(--button-danger-bg) bg-(--button-icon-danger-bg) p-6 text-(--text-page)">
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <p className="mt-2 text-sm text-(--text-muted)">{copy.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-(--button-primary-bg) px-4 py-2 text-sm font-medium text-(--button-primary-text) transition hover:bg-(--button-primary-bg-hover) focus:outline-none focus:ring-2 focus:ring-(--focus-ring-primary) focus:ring-offset-2"
        >
          {t('common.retry', 'Erneut versuchen')}
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md border border-(--border-option-selected) px-4 py-2 text-sm font-medium text-(--text-badge) transition hover:bg-(--surface-option-selected) focus:outline-none focus:ring-2 focus:ring-(--focus-ring-primary) focus:ring-offset-2"
        >
          {t('common.reloadPage', 'Seite neu laden')}
        </button>
      </div>
      <ErrorReportLink
        error={error}
        area={variant === 'layout' ? 'LayoutEditor' : 'SeatingPlanView'}
        tone="amber"
      />
      <details className="mt-4 text-xs text-(--text-muted)">
        <summary className="cursor-pointer font-medium">
          {t('common.errorDetails', 'Fehlerdetails')}
        </summary>
        <pre className="mt-2 whitespace-pre-wrap wrap-break-word rounded bg-(--surface-card) p-3 text-[11px] leading-relaxed text-(--text-muted) shadow-inner">
          {error.message}
        </pre>
      </details>
    </div>
  );
}
