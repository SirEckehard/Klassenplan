// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { logError } from '@/utils';
import i18n from '@/i18n';

function RootErrorFallback({ error }: { error: Error }) {
  const t = (key: string, fallback: string) =>
    i18n.t(key, { ns: 'common', defaultValue: fallback });

  return (
    <div className="flex min-h-screen items-start justify-center bg-white px-4 py-16 dark:bg-gray-950">
      <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-red-50 p-8 shadow-lg dark:border-red-800 dark:bg-red-950/40">
        <h1 className="text-xl font-bold text-red-900 dark:text-red-100">
          {t('errors.generic', 'Ein Fehler ist aufgetreten')}
        </h1>
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          {t('errors.tryAgain', 'Bitte versuche es erneut')}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {t('common.reloadPage', 'Seite neu laden')}
          </button>
        </div>
        <details className="mt-6 text-xs text-red-600 dark:text-red-400">
          <summary className="cursor-pointer font-medium select-none">
            {t('common.errorDetails', 'Fehlerdetails')}
          </summary>
          <pre className="mt-2 whitespace-pre-wrap wrap-break-word rounded-lg bg-white/70 p-3 text-[11px] leading-relaxed dark:bg-gray-900/60">
            {error.message}
          </pre>
        </details>
      </div>
    </div>
  );
}

// Error boundary to catch errors from descendant components
export default class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logError(
      'RootErrorBoundary captured an error',
      { error, info },
      'RootErrorBoundary',
    );
    this.setState({ hasError: true, error });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return <RootErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
