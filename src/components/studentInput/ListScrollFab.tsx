// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownIcon, ArrowUpIcon } from '@phosphor-icons/react';
import { mutedIconButtonClass } from '@/utils';
import type { ListScrollHint } from '@/components/studentInput/hooks/useStudentListLayout';

type ListScrollFabProps = {
  /** Which way to jump, or `null` to render nothing. */
  hint: ListScrollHint;
  onScroll: () => void;
  /** Safe-area and cookie-banner aware offsets from `useFloatingActionOffset`. */
  offsets: CSSProperties;
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
 * `z-40` matches the other floating controls (offline badge, sidebar trigger)
 * and stays below modals and toasts.
 */
export default function ListScrollFab({
  hint,
  onScroll,
  offsets,
}: ListScrollFabProps) {
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
      style={offsets}
      className={`${mutedIconButtonClass} fixed z-40 h-12 w-12 shadow-lg lg:hidden`}
      aria-label={label}
      title={label}
    >
      <ArrowIcon size={20} aria-hidden />
    </button>
  );
}
