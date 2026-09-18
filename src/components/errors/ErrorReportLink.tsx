// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, CopyIcon, EnvelopeSimpleIcon } from '@phosphor-icons/react';
import { buildErrorReport, buildErrorReportMailto, logWarn } from '@/utils';
import { CONTACT_EMAIL } from '@/config/links';

type ErrorReportTone = 'red' | 'amber';

type ErrorReportLinkProps = {
  error: Error;
  /** Where the error was caught, e.g. `LayoutEditor`. Not translated. */
  area: string;
  tone: ErrorReportTone;
};

type CopyState = 'idle' | 'copied' | 'failed';

/** How long the copy button keeps showing its result. */
const COPY_FEEDBACK_MS = 2500;

// Each fallback keeps the colours of the box it sits in.
const toneClasses: Record<
  ErrorReportTone,
  { container: string; title: string; body: string; code: string }
> = {
  red: {
    container:
      'border-red-200 bg-white/60 dark:border-red-800 dark:bg-gray-900/40',
    title: 'text-red-900 dark:text-red-100',
    body: 'text-red-700 dark:text-red-300',
    code: 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-100',
  },
  amber: {
    container:
      'border-amber-300 bg-white/60 dark:border-amber-600 dark:bg-gray-900/40',
    title: 'text-amber-900 dark:text-amber-100',
    body: 'text-amber-800 dark:text-amber-100',
    code: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100',
  },
};

const actionClass =
  'inline-flex items-center gap-1.5 rounded-md font-medium underline underline-offset-2 transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-offset-gray-900';

/**
 * Offers the one thing a teacher can do with an error: report it.
 *
 * The mail is prepared locally and only ever sent by the user — there is no
 * telemetry (decision 0008). The copy button is the way out when no mail client
 * is set up, which is the common case on a school machine.
 */
export default function ErrorReportLink({
  error,
  area,
  tone,
}: ErrorReportLinkProps) {
  const { t, i18n } = useTranslation('common');
  const [copyState, setCopyState] = React.useState<CopyState>('idle');
  const language = i18n.language;

  const report = React.useMemo(
    () => buildErrorReport({ error, area, language }),
    [error, area, language],
  );

  const mailtoHref = React.useMemo(() => {
    const body = [
      t('errors.report.mailGreeting'),
      '',
      t('errors.report.mailIntro'),
      '',
      t('errors.report.mailPrompt'),
      t('errors.report.mailPlaceholder'),
      '',
      t('errors.report.mailDetails'),
      report.details,
    ].join('\n');

    return buildErrorReportMailto({
      email: CONTACT_EMAIL,
      subject: t('errors.report.mailSubject', { code: report.code }),
      body,
    });
  }, [report, t]);

  React.useEffect(() => {
    if (copyState === 'idle') return;
    const timer = window.setTimeout(
      () => setCopyState('idle'),
      COPY_FEEDBACK_MS,
    );
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const handleCopy = React.useCallback(() => {
    const clipboard =
      typeof navigator === 'undefined' ? undefined : navigator.clipboard;
    if (!clipboard?.writeText) {
      setCopyState('failed');
      return;
    }
    clipboard
      .writeText(report.details)
      .then(() => setCopyState('copied'))
      .catch((copyError: unknown) => {
        logWarn(
          'Copying the error report failed',
          { error: copyError },
          'ErrorReportLink',
        );
        setCopyState('failed');
      });
  }, [report.details]);

  const styles = toneClasses[tone];
  const copyLabel =
    copyState === 'copied'
      ? t('errors.report.copied')
      : copyState === 'failed'
        ? t('errors.report.copyFailed')
        : t('errors.report.copy');

  return (
    <div className={`mt-6 rounded-xl border px-4 py-3 ${styles.container}`}>
      <p className={`text-sm font-semibold ${styles.title}`}>
        {t('errors.report.title')}
      </p>
      <p className={`mt-1 text-xs ${styles.body}`}>{t('errors.report.hint')}</p>
      <div
        className={`mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs ${styles.body}`}
      >
        <a className={actionClass} href={mailtoHref}>
          <EnvelopeSimpleIcon aria-hidden="true" className="h-4 w-4" />
          {t('errors.report.mailLink')}
        </a>
        <button type="button" className={actionClass} onClick={handleCopy}>
          {copyState === 'copied' ? (
            <CheckIcon aria-hidden="true" className="h-4 w-4" />
          ) : (
            <CopyIcon aria-hidden="true" className="h-4 w-4" />
          )}
          {copyLabel}
        </button>
      </div>
      <p className={`mt-3 text-xs ${styles.body}`}>
        {t('errors.report.code')}:{' '}
        <code className={`rounded px-1.5 py-0.5 font-mono ${styles.code}`}>
          {report.code}
        </code>
      </p>
    </div>
  );
}
