// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { logError } from '@/utils';
import i18n from '@/i18n';
import ErrorReportLink from '@/components/errors/ErrorReportLink';

function RootErrorFallback({ error }: { error: Error }) {
  const t = (key: string, fallback: string) =>
    i18n.t(key, { ns: 'common', defaultValue: fallback });

  return (
    <div className="flex min-h-screen items-start justify-center bg-(--surface-card) px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-(--button-danger-bg) bg-(--button-icon-danger-bg) p-8 shadow-lg">
        <h1 className="text-xl font-bold text-(--text-page)">
          {t('errors.generic', 'Ein Fehler ist aufgetreten')}
        </h1>
        <p className="mt-2 text-sm text-(--button-danger-bg)">
          {t('errors.tryAgain', 'Bitte versuche es erneut')}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-(--button-danger-bg) px-5 py-2.5 text-sm font-semibold text-(--button-danger-text) shadow-sm transition hover:bg-(--button-danger-bg-hover) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-danger)"
          >
            {t('common.reloadPage', 'Seite neu laden')}
          </button>
        </div>
        <ErrorReportLink error={error} area="App" tone="red" />
        <details className="mt-6 text-xs text-(--button-danger-bg)">
          <summary className="cursor-pointer font-medium select-none">
            {t('common.errorDetails', 'Fehlerdetails')}
          </summary>
          <pre className="mt-2 whitespace-pre-wrap wrap-break-word rounded-lg bg-(--surface-card) p-3 text-[11px] leading-relaxed">
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
