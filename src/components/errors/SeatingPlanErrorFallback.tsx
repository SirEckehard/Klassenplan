// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';

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
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900 shadow-sm dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-100">
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <p className="mt-2 text-sm text-amber-800 dark:text-amber-100">
        {copy.description}
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
      <details className="mt-4 text-xs text-amber-700 dark:text-amber-100">
        <summary className="cursor-pointer font-medium">
          {t('common.errorDetails', 'Fehlerdetails')}
        </summary>
        <pre className="mt-2 whitespace-pre-wrap wrap-break-word rounded bg-white/70 p-3 text-[11px] leading-relaxed text-amber-700 shadow-inner dark:bg-gray-900/60 dark:text-amber-100">
          {error.message}
        </pre>
      </details>
    </div>
  );
}
