// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SparkleIcon } from '@phosphor-icons/react';
import QuickNameEntryDialog from '@/components/students/QuickNameEntryDialog';
import { cardSurfaceClass, primaryButtonClass } from '@/utils';
import type { Student } from '@/types';

type MissingNameNoticeProps = {
  students: Student[];
  updateStudent: (id: string, patch: Partial<Student>) => void;
};

const MissingNameNotice = ({
  students,
  updateStudent,
}: MissingNameNoticeProps) => {
  const { t } = useTranslation('students');
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const missingNameCount = useMemo(
    () => students.filter((entry) => entry.name.trim().length === 0).length,
    [students],
  );

  useEffect(() => {
    if (isQuickEntryOpen && missingNameCount === 0) {
      queueMicrotask(() => {
        setIsQuickEntryOpen(false);
      });
    }
  }, [isQuickEntryOpen, missingNameCount]);

  const handleQuickEntryOpen = useCallback(() => {
    setIsQuickEntryOpen(true);
  }, []);

  const handleQuickEntryClose = useCallback(() => {
    setIsQuickEntryOpen(false);
  }, []);

  if (missingNameCount === 0) {
    return (
      <QuickNameEntryDialog
        open={false}
        students={students}
        updateStudent={updateStudent}
        onClose={handleQuickEntryClose}
      />
    );
  }

  const label =
    missingNameCount === 1
      ? t('quickEntry.noticeTitleSingular', 'Ein Schüler hat noch keinen Namen.')
      : t('quickEntry.noticeTitlePlural', '{{count}} Schüler haben noch keinen Namen.', { count: missingNameCount });

  return (
    <>
      <div
        className={`${cardSurfaceClass} flex flex-col gap-4 border border-blue-200/70 bg-blue-50/80 p-4 text-blue-900 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-100`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-200/60 bg-white/90 text-blue-600 shadow-sm dark:border-blue-900/40 dark:bg-gray-900/60 dark:text-blue-300">
            <SparkleIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-sm leading-relaxed text-blue-900/90 dark:text-blue-100/80">
              {t('quickEntry.noticeDescription', 'Starte die Schnell-Namenerfassung, um alle fehlenden Namen zu ergänzen.')}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-blue-900/80 dark:text-blue-100/70">
            {t('quickEntry.noticeHint', 'Hinweis: Alle weiteren Schülerdetails pflegst du direkt in der Schülerliste hinzu.')}
          </p>
          <button
            type="button"
            onClick={handleQuickEntryOpen}
            className={`${primaryButtonClass} w-full justify-center gap-2 sm:w-auto`}
            title={t('quickEntry.startButtonTitle', 'Fehlende Namen schnell hinzufügen')}
          >
            <SparkleIcon className="h-4 w-4" aria-hidden="true" />
            {t('quickEntry.startButton', 'Schnell-Namenerfassung starten')}
          </button>
        </div>
      </div>
      <QuickNameEntryDialog
        open={isQuickEntryOpen}
        students={students}
        updateStudent={updateStudent}
        onClose={handleQuickEntryClose}
      />
    </>
  );
};

export default MissingNameNotice;
