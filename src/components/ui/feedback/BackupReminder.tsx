// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { ArrowRightIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { LocalizedLink } from '@/components/LocalizedLink';
import { useSeatingPlanActions } from '@/contexts/SeatingPlanContext';
import { useClassManagementContext } from '@/contexts/seatingPlan/ClassManagementContext';
import { useBackupReminder } from '@/hooks/useBackupReminder';
import { logError } from '@/utils';

/**
 * Asks for a backup once the last one has aged out.
 *
 * Everything lives in this browser, so an evicted origin or a new laptop means
 * the classes are gone unless a backup file exists. The reminder is the only
 * place the app ever says so on its own — hence the explicit "never again",
 * which a teacher who keeps backups elsewhere is entitled to.
 */
export default function BackupReminder() {
  const { t } = useTranslation('generator');
  const { classSummaries } = useClassManagementContext();
  const { handleExportAll } = useSeatingPlanActions();
  const {
    isDue,
    ageInDays,
    hasEverBackedUp,
    remindLater,
    neverRemind,
    refresh,
  } = useBackupReminder(classSummaries.length > 0);

  const handleCreateBackup = React.useCallback(() => {
    handleExportAll()
      // A cancelled password prompt or save dialog writes nothing, so asking
      // the stored state is the only honest way to tell whether the reminder
      // has been answered.
      .then(refresh)
      .catch((error: unknown) => {
        logError('Backup export failed', { error }, 'BackupReminder');
      });
  }, [handleExportAll, refresh]);

  if (!isDue) {
    return null;
  }

  return (
    <section
      aria-live="polite"
      role="status"
      className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-5 text-amber-900 shadow-xs backdrop-blur dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-100"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600/15 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200">
          <FloppyDiskIcon aria-hidden="true" className="h-6 w-6" />
        </span>
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-200">
              {t('backupReminder.eyebrow')}
            </p>
            <p className="mt-2 text-sm text-amber-900/90 dark:text-amber-100/90">
              {hasEverBackedUp
                ? t('backupReminder.aged', { count: ageInDays })
                : t('backupReminder.never')}
            </p>
            <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
              {t('backupReminder.why')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCreateBackup}
              className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
            >
              {t('backupReminder.create')}
            </button>
            <button
              type="button"
              onClick={remindLater}
              className="inline-flex items-center justify-center rounded-xl border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 dark:border-amber-500/50 dark:text-amber-100 dark:hover:bg-amber-900/50 dark:focus-visible:ring-offset-gray-900"
            >
              {t('backupReminder.later')}
            </button>
            <button
              type="button"
              onClick={neverRemind}
              className="text-sm font-medium text-amber-800 underline decoration-amber-400 underline-offset-4 transition hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 dark:text-amber-200 dark:hover:text-amber-100 dark:focus-visible:ring-offset-gray-900"
            >
              {t('backupReminder.neverAgain')}
            </button>
          </div>
          <LocalizedLink
            to="/faq#backups"
            className="inline-flex items-center gap-1 text-sm font-medium text-amber-800 underline decoration-amber-400 underline-offset-4 transition hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 dark:text-amber-200 dark:hover:text-amber-100 dark:focus-visible:ring-offset-gray-900"
          >
            {t('backupReminder.faqLink')}
            <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
          </LocalizedLink>
        </div>
      </div>
    </section>
  );
}
