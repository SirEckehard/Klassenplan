// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';

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
    <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-red-900 shadow-sm dark:border-red-700 dark:bg-red-900/30 dark:text-red-100">
      <h2 className="text-lg font-semibold">
        {t(
          'errors.studentListUnavailable',
          'Klassenliste konnte nicht geladen werden',
        )}
      </h2>
      <p className="mt-2 text-sm text-red-800 dark:text-red-200">
        {t(
          'errors.studentListDescription',
          'Beim Rendern des Klassenlisten-Schritts ist ein Fehler aufgetreten. Du kannst es erneut versuchen oder die Seite neu laden.',
        )}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          {t('common.retry', 'Erneut versuchen')}
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-blue-200 dark:hover:bg-blue-900/30 dark:focus:ring-offset-gray-900"
        >
          {t('common.reloadPage', 'Seite neu laden')}
        </button>
      </div>
      <details className="mt-4 text-xs text-red-700 dark:text-red-200">
        <summary className="cursor-pointer font-medium">
          {t('common.errorDetails', 'Fehlerdetails')}
        </summary>
        <pre className="mt-2 whitespace-pre-wrap wrap-break-word rounded bg-white/70 p-3 text-[11px] leading-relaxed text-red-700 shadow-inner dark:bg-gray-900/60 dark:text-red-200">
          {error.message}
        </pre>
      </details>
    </div>
  );
}
