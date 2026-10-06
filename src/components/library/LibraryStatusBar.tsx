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
  statusBarWordClass,
} from '@/components/shell/StatusBarFrame';
import HintTooltip from '@/components/ui/feedback/HintTooltip';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import { primaryButtonClass } from '@/utils';

export interface LibraryCrumb {
  key: string;
  label: string;
}

/**
 * The status bar of "Bibliothek": where the selection is, as a file
 * manager's path bar has it — each step a way back up — and what to do with
 * it: back where the page was opened from, and the one blue button that
 * opens it. A selection that cannot be opened keeps the button in its place
 * and says why.
 */
export default function LibraryStatusBar({
  rootLabel,
  crumbs,
  onCrumb,
  onBack,
  open,
}: {
  rootLabel: string;
  crumbs: LibraryCrumb[];
  /** Goes up to a step of the path; `-1` is the root. */
  onCrumb: (index: number) => void;
  onBack: () => void;
  open: {
    label: string;
    onOpen: () => void;
    /** Why there is nothing to open, while there is not. */
    hint?: string;
  };
}) {
  const { t } = useTranslation('generator');
  const hintId = React.useId();
  // A phone's bar keeps the last two steps; the rest are a click up anyway.
  const shortened = crumbs.length > 2;

  return (
    <StatusBarFrame
      start={
        <nav
          aria-label={t('library.path')}
          data-tour={TOUR_ANCHORS.libraryPath}
          className="flex min-w-0 items-center gap-1 text-xs text-(--text-muted) sm:text-sm"
        >
          <button
            type="button"
            onClick={() => onCrumb(-1)}
            className="hidden shrink-0 rounded px-1 hover:text-(--text-page) focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:outline-none sm:inline"
          >
            {rootLabel}
          </button>
          {shortened && (
            <span aria-hidden="true" className="shrink-0 sm:hidden">
              …
            </span>
          )}
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            // Below `sm` only the last two steps show.
            const phoneHidden = index < crumbs.length - 2;
            return (
              <span
                key={crumb.key}
                className={`min-w-0 items-center gap-1 ${
                  phoneHidden ? 'hidden sm:flex' : 'flex'
                }`}
              >
                <CaretRightIcon
                  size={12}
                  aria-hidden="true"
                  className="shrink-0"
                />
                <button
                  type="button"
                  onClick={() => onCrumb(index)}
                  aria-current={isLast ? 'location' : undefined}
                  className={`min-w-0 truncate rounded px-1 hover:text-(--text-page) focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:outline-none ${
                    isLast ? 'font-medium text-(--text-page)' : ''
                  }`}
                >
                  {crumb.label}
                </button>
              </span>
            );
          })}
        </nav>
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
              onClick={open.hint ? undefined : open.onOpen}
              aria-label={open.label}
              aria-disabled={open.hint ? true : undefined}
              aria-describedby={open.hint ? hintId : undefined}
              title={open.hint ? undefined : t('library.openTitle')}
              className={`${primaryButtonClass} flex items-center gap-2 whitespace-nowrap ${
                open.hint ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <ArrowSquareOutIcon className="h-4 w-4" aria-hidden="true" />
              <span className={statusBarWordClass}>{open.label}</span>
            </button>
            {open.hint && <HintTooltip id={hintId} hint={open.hint} />}
          </div>
        </>
      }
    />
  );
}
