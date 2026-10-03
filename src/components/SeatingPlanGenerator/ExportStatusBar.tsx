// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, PrinterIcon } from '@phosphor-icons/react';
import StatusBarFrame, {
  statusBarBackButtonClass,
  statusBarWordClass,
} from '@/components/shell/StatusBarFrame';
import {
  formatPercent,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/utils';

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
  /**
   * Back to the plan the sheet was made from. Left out while there is no
   * plan: the empty page is that one button already.
   */
  onBack?: () => void;
};

/**
 * The export page's status bar: what the sheet is, and printing it.
 *
 * The frame is the workspace's, so the settings and the toolbar's switch stay
 * where they were a click ago. The line says what will come out of the printer
 * — or, while the circle is still being built, how far that has got, with the
 * way to stop it beside it; it used to float over the preview. Printing is the
 * page's one primary action, with the way back to the plan beside it as on
 * every layer; the files to save sit in the toolbar.
 */
export default function ExportStatusBar({
  hasPlan,
  sheetLabel,
  studentCount,
  circleGeneration,
  onPrint,
  onBack,
}: Props) {
  const { t } = useTranslation('generator');

  const line = !hasPlan
    ? t('shell.status.noPlan')
    : circleGeneration
      ? circleGeneration.progress === null
        ? circleGeneration.message
        : `${circleGeneration.message} ${formatPercent(circleGeneration.progress)}`
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
        <>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={t('export.backToSeating')}
              title={t('export.backToSeatingShortcut')}
              className={statusBarBackButtonClass}
            >
              <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
              <span className={statusBarWordClass}>{t('wizard.back')}</span>
            </button>
          )}
          {hasPlan && (
            <button
              type="button"
              onClick={onPrint}
              title={t('export.printShortcut')}
              // A phone and a tablet show the printer alone; the name stays.
              aria-label={t('actions.print')}
              className={`${primaryButtonClass} flex items-center gap-2 whitespace-nowrap`}
            >
              <PrinterIcon className="h-4 w-4" aria-hidden="true" />
              <span className={statusBarWordClass}>{t('actions.print')}</span>
            </button>
          )}
        </>
      }
    />
  );
}
