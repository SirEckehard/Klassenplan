// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  CaretRightIcon,
} from '@phosphor-icons/react';
import StatusBarFrame, {
  statusBarBackButtonClass,
  statusBarHistoryButtonClass,
  statusBarHistoryGroupClass,
  statusBarWordClass,
} from '@/components/shell/StatusBarFrame';
import { touchHitAreaBorderlessClass } from '@/components/shell/shellTokens';
import UndoRedoButtons from '@/components/ui/buttons/UndoRedoButtons';
import HintTooltip from '@/components/ui/feedback/HintTooltip';
import { useRefusalHint } from '@/hooks/ui/useRefusalHint';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import { primaryButtonClass } from '@/utils';

export interface LibraryCrumb {
  key: string;
  label: string;
}

/**
 * The status bar of "Bibliothek": where the selection is, as a file
 * manager's path bar has it — each step a way back up, from `lg` up —, undo and redo in the
 * middle as on the layers, and what to do with the selection: back where the
 * page was opened from, and the one blue button that opens it. A selection
 * that cannot be opened keeps the button in its place and says why.
 */
export default function LibraryStatusBar({
  path,
  onBack,
  history,
  open,
}: {
  /**
   * The path, from `lg` up; below it the path stands above the columns
   * (`LibraryPathHead`), where it has the width the bar does not have.
   */
  path?: {
    rootLabel: string;
    crumbs: LibraryCrumb[];
    /** Goes up to a step of the path; `-1` is the root. */
    onCrumb: (index: number) => void;
  };
  onBack: () => void;
  history: {
    onUndo: () => void;
    canUndo: boolean;
    onRedo: () => void;
    canRedo: boolean;
  };
  open: {
    label: string;
    onOpen: () => void;
    /** Why there is nothing to open, while there is not. */
    hint?: string;
  };
}) {
  const { t } = useTranslation('generator');
  const hintId = React.useId();
  const refusal = useRefusalHint(open.hint);

  return (
    <StatusBarFrame
      start={
        path && (
          <nav
            aria-label={t('library.path')}
            className="flex min-w-0 items-center gap-1 text-sm text-(--text-muted)"
          >
            <button
              type="button"
              onClick={() => path.onCrumb(-1)}
              className="shrink-0 rounded px-1 pointer-coarse:-my-1 pointer-coarse:h-11 hover:text-(--text-page) focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:outline-none"
            >
              {path.rootLabel}
            </button>
            {path.crumbs.map((crumb, index) => {
              const isLast = index === path.crumbs.length - 1;
              return (
                <span
                  key={crumb.key}
                  className="flex min-w-0 items-center gap-1"
                >
                  <CaretRightIcon
                    size={12}
                    aria-hidden="true"
                    className="shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => path.onCrumb(index)}
                    aria-current={isLast ? 'location' : undefined}
                    className={`min-w-0 truncate rounded px-1 pointer-coarse:-my-1 pointer-coarse:h-11 hover:text-(--text-page) focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:outline-none ${
                      isLast ? 'font-medium text-(--text-page)' : ''
                    }`}
                  >
                    {crumb.label}
                  </button>
                </span>
              );
            })}
          </nav>
        )
      }
      middle={
        <UndoRedoButtons
          {...history}
          undoTitle={t('canvas.undo')}
          redoTitle={t('canvas.redo')}
          undoLabel={t('canvas.undoLabel')}
          redoLabel={t('canvas.redoLabel')}
          buttonClass={statusBarHistoryButtonClass}
          groupClass={statusBarHistoryGroupClass}
        />
      }
      end={
        <>
          <button
            type="button"
            onClick={onBack}
            aria-label={t('wizard.back')}
            title={t('library.backTitle')}
            className={statusBarBackButtonClass}
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            <span className={statusBarWordClass}>{t('wizard.back')}</span>
          </button>
          <div
            data-tour={TOUR_ANCHORS.libraryOpen}
            className="group relative shrink-0"
          >
            <button
              type="button"
              onClick={open.hint ? refusal.show : open.onOpen}
              aria-label={open.label}
              aria-disabled={open.hint ? true : undefined}
              aria-describedby={open.hint ? hintId : undefined}
              title={open.hint ? undefined : t('library.openTitle')}
              className={`${primaryButtonClass} ${touchHitAreaBorderlessClass} flex h-9 items-center gap-2 whitespace-nowrap ${
                open.hint ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <ArrowSquareOutIcon className="h-4 w-4" aria-hidden="true" />
              <span className={statusBarWordClass}>{open.label}</span>
            </button>
            {open.hint && (
              <HintTooltip id={hintId} hint={open.hint} open={refusal.open} />
            )}
          </div>
        </>
      }
    />
  );
}
