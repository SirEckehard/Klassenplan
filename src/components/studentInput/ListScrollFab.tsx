// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { ArrowDownIcon, ArrowUpIcon } from '@phosphor-icons/react';
import { mutedIconButtonClass } from '@/utils';
import type { ListScrollHint } from '@/components/studentInput/hooks/useStudentListLayout';

type ListScrollFabProps = {
  /** Which way to jump, or `null` to render nothing. */
  hint: ListScrollHint;
  onScroll: () => void;
};

/**
 * Jumps between the two ends of the step-1 class list.
 *
 * Below `lg` the list has no inner scroll container — it flows in the page
 * scroll, so a class of 30 puts several thousand pixels between the toolbar at
 * the top and the action row at the bottom. One button covers both ways: it
 * points down until the proceed button is in reach, then back up to the
 * toolbar. Two permanent arrows would cost twice the area on the viewport that
 * has the least of it, and the direction is unambiguous from the scroll
 * position anyway.
 *
 * It hangs above the status bar's right end (`StatusBarPortal`, slot
 * `float`) and moves with the bar. Measured from the window's bottom edge
 * instead, it slid into the bar on an iPhone, where Safari ends the window
 * below the bar's sticky edge.
 */
export default function ListScrollFab({ hint, onScroll }: ListScrollFabProps) {
  const { t } = useTranslation('students');

  if (!hint) {
    return null;
  }

  const label =
    hint === 'up'
      ? t('studentInput.scrollToListTop', 'Zum Listenanfang')
      : t('studentInput.scrollToActions', 'Zum Ende der Liste');
  const ArrowIcon = hint === 'up' ? ArrowUpIcon : ArrowDownIcon;

  return (
    <button
      type="button"
      onClick={onScroll}
      className={`${mutedIconButtonClass} h-12 w-12 shadow-lg lg:hidden`}
      aria-label={label}
      title={label}
    >
      <ArrowIcon size={20} aria-hidden />
    </button>
  );
}
