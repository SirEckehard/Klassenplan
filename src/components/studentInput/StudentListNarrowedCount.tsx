// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { XIcon } from '@phosphor-icons/react';
import { quietIconButtonClass } from '@/utils';

/**
 * How many of the class a search or a filter leaves in the list, and the way
 * to let both go. It stands beside the search where the row has room for it,
 * and in the list's head on a phone, whose row is the search alone.
 */
export default function StudentListNarrowedCount({
  visibleCount,
  totalCount,
  onClear,
}: {
  visibleCount: number;
  totalCount: number;
  onClear: () => void;
}) {
  const { t } = useTranslation('students');
  const clearLabel = t('listToolbar.clear');

  return (
    <span className="flex shrink-0 items-center gap-1 text-sm tabular-nums text-(--text-muted)">
      {t('listToolbar.countNarrowed', {
        visible: visibleCount,
        total: totalCount,
      })}
      <button
        type="button"
        onClick={onClear}
        className={`${quietIconButtonClass} h-7 w-7 pointer-coarse:h-11 pointer-coarse:w-11`}
        aria-label={clearLabel}
        title={clearLabel}
      >
        <XIcon size={14} aria-hidden />
      </button>
    </span>
  );
}
