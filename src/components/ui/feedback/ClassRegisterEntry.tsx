// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { cardSurfaceClass, formatDate } from '@/utils';

type ClassRegisterEntryProps = {
  date: Date;
  entry: React.ReactNode;
  remark: React.ReactNode;
  className?: string;
};

/**
 * One line of a class register — date, entry, remark under small headings,
 * the date ruled off from the rest. Paper and ink only: the register's red
 * margin would be rose here, and rose means "destructive".
 *
 * Where the app winks at a teacher (AGENTS.md § Easter eggs): the page that
 * is missing, "unentschuldigt".
 */
export default function ClassRegisterEntry({
  date,
  entry,
  remark,
  className = '',
}: ClassRegisterEntryProps) {
  const { t } = useTranslation('common');
  const headClass =
    'border-b border-(--border-card) px-3 pt-1 pb-1.5 text-left text-micro font-semibold tracking-wider text-(--text-muted) uppercase';

  return (
    <div className={`${cardSurfaceClass} w-full max-w-md ${className}`}>
      <table className="w-full border-collapse text-sm">
        <caption className="px-3 pt-2.5 text-left text-micro font-semibold tracking-wider text-(--text-muted) uppercase">
          {t('classRegister.title')}
        </caption>
        <thead>
          <tr>
            <th scope="col" className={`${headClass} w-px`}>
              {t('classRegister.date')}
            </th>
            <th scope="col" className={headClass}>
              {t('classRegister.entry')}
            </th>
            <th scope="col" className={`${headClass} w-px`}>
              {t('classRegister.remark')}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-r border-(--border-card) px-3 py-2.5 whitespace-nowrap text-(--text-muted) tabular-nums">
              {formatDate(date)}
            </td>
            <td className="px-3 py-2.5 font-medium wrap-anywhere text-(--text-page)">
              {entry}
            </td>
            <td className="px-3 py-2.5 whitespace-nowrap text-(--text-muted)">
              {remark}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
