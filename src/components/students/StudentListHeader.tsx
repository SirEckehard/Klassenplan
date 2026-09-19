// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { cardSurfaceClass } from '@/utils';

/**
 * StudentListHeader
 *
 * Sticky caption row for the student list.
 *
 * It used to carry fourteen abbreviated column headings — Geschl., schüch.,
 * ablenk. — one per icon column of the old row, each aligned to a 44px cell.
 * The row has no icon columns any more, so the captions are down to the three
 * things it still has, and the select-all checkbox they always accompanied.
 *
 * Rendered as the first, sticky child inside the scroll container so it shares
 * the rows' content width (no scrollbar offset) and stays visible while
 * scrolling.
 */
type Props = {
  /**
   * Multi-select state for the visible students. Omitting `onToggleAllVisible`
   * hides the checkbox and its column, matching the rows.
   */
  allVisibleSelected?: boolean;
  /** True while only part of the visible students are selected. */
  someVisibleSelected?: boolean;
  onToggleAllVisible?: () => void;
};

export default function StudentListHeader({
  allVisibleSelected = false,
  someVisibleSelected = false,
  onToggleAllVisible,
}: Props) {
  const { t } = useTranslation('students');
  const selectAllRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        !allVisibleSelected && someVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  return (
    <div
      className={`${cardSurfaceClass} sticky top-0 z-10 flex items-center gap-3 bg-white! px-3 py-1.5 dark:bg-gray-950!`}
    >
      {onToggleAllVisible && (
        <input
          ref={selectAllRef}
          type="checkbox"
          checked={allVisibleSelected}
          onChange={onToggleAllVisible}
          className="h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
          aria-label={t('listToolbar.selectAll')}
        />
      )}
      {/* The captions describe controls that carry their own accessible names,
          so they are decoration for the eye only. */}
      <div
        className="flex min-w-0 flex-1 items-center gap-3 text-[10px] font-medium tracking-tight text-(--text-muted)"
        aria-hidden="true"
      >
        <span className="min-w-6 shrink-0">{t('listHeader.number')}</span>
        <span className="w-10 shrink-0 text-center">
          {t('listHeader.photo')}
        </span>
        <span className="shrink-0 pl-3">{t('listHeader.name')}</span>
        <span className="hidden min-w-0 flex-1 lg:block">
          {t('listHeader.attributes')}
        </span>
      </div>
    </div>
  );
}
