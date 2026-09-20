// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import ErrorReportLink from '@/components/errors/ErrorReportLink';

type StudentListErrorFallbackProps = {
  error: Error;
  onRetry: () => void;
};

export default function StudentListErrorFallback({
  error,
  onRetry,
}: StudentListErrorFallbackProps) {
  const { t } = useTranslation('common');

  return (
    <div className="rounded-lg border border-(--button-danger-bg) bg-(--button-icon-danger-bg) p-6 text-(--text-page)">
      <h2 className="text-lg font-semibold">
        {t(
          'errors.studentListUnavailable',
          'Klassenliste konnte nicht geladen werden',
        )}
      </h2>
      <p className="mt-2 text-sm text-(--text-muted)">
        {t(
          'errors.studentListDescription',
          'Beim Rendern des Klassenlisten-Schritts ist ein Fehler aufgetreten. Du kannst es erneut versuchen oder die Seite neu laden.',
        )}
      </p>
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
      <ErrorReportLink error={error} area="StudentList" tone="red" />
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
