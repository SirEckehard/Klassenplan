// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { PrinterIcon } from '@phosphor-icons/react';
import StatusBarFrame from '@/components/shell/StatusBarFrame';
import { primaryButtonClass, secondaryButtonClass } from '@/utils';

type Props = {
  hasPlan: boolean;
  /** "A4 · Hochformat" — the sheet as it will come out of the printer. */
  sheetLabel: string;
  studentCount: number;
  /** Set while the circle is being built for the first time. */
  circleGeneration: {
    message: string;
    progress: number | null;
    onCancel: () => void;
  } | null;
  onPrint: () => void;
};

/**
 * The export page's status bar: what the sheet is, and printing it.
 *
 * The frame is the workspace's, so the settings and the toolbar's switch stay
 * where they were a click ago. The line says what will come out of the printer
 * — or, while the circle is still being built, how far that has got, with the
 * way to stop it beside it; it used to float over the preview. Printing is the
 * page's one primary action; the files to save sit at the bottom of the
 * toolbar.
 */
export default function ExportStatusBar({
  hasPlan,
  sheetLabel,
  studentCount,
  circleGeneration,
  onPrint,
}: Props) {
  const { t } = useTranslation('generator');

  const line = !hasPlan
    ? t('shell.status.noPlan')
    : circleGeneration
      ? circleGeneration.progress === null
        ? circleGeneration.message
        : `${circleGeneration.message} ${circleGeneration.progress} %`
      : [sheetLabel, t('shell.status.students', { count: studentCount })].join(
          ' · ',
        );

  return (
    <StatusBarFrame
      start={
        <p className="flex min-w-0 items-center gap-2 text-xs tabular-nums text-(--text-muted) sm:text-sm">
          <span className="min-w-0 truncate">{line}</span>
          {circleGeneration && (
            <button
              type="button"
              onClick={circleGeneration.onCancel}
              className={`${secondaryButtonClass} h-8 shrink-0 px-2.5 text-xs`}
            >
              {t('export.cancelCircleGeneration')}
            </button>
          )}
        </p>
      }
      end={
        hasPlan && (
          <button
            type="button"
            onClick={onPrint}
            title={t('export.printShortcut')}
            className={`${primaryButtonClass} flex items-center gap-2 whitespace-nowrap`}
          >
            <PrinterIcon className="h-4 w-4" aria-hidden="true" />
            {t('actions.print')}
          </button>
        )
      }
    />
  );
}
