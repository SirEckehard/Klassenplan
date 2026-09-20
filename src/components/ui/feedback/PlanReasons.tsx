// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import type { PlanReason } from '@/utils/algorithm/planReasons';
import { CRITERIA_FAMILY_MAP } from '@/utils/ui/criteriaIcons';
import {
  dataFamilyClass,
  dataHeadingClass,
  getDisplayNameForMode,
  resolveLocale,
  type NameDisplayMode,
} from '@/utils';

/**
 * Why the plan looks like this, in three sentences under the criteria that
 * caused it.
 *
 * Every sentence is built from what the mix actually scored — which students
 * sit where, and how many of the cases came out right. There is no template of
 * encouraging phrases behind it: with nothing to report, nothing is shown.
 */
export default function PlanReasons({
  reasons,
  students,
  nameDisplay,
}: {
  reasons: PlanReason[];
  students: Student[];
  /** The same shortening the seats use, so a sentence names what is on them. */
  nameDisplay?: NameDisplayMode;
}) {
  const { t, i18n } = useTranslation('generator');

  const nameById = React.useMemo(() => {
    const byId = new Map<string, string>();
    for (const student of students) {
      byId.set(student.id, student.name);
    }
    return byId;
  }, [students]);

  const listFormat = React.useMemo(
    () =>
      new Intl.ListFormat(resolveLocale(i18n.language), {
        style: 'long',
        type: 'conjunction',
      }),
    [i18n.language],
  );

  if (reasons.length === 0) {
    return null;
  }

  return (
    <section className="mt-3 border-t border-(--border-card) pt-3">
      <h3 className={`${dataHeadingClass} mb-2 text-(--text-muted)`}>
        {t('mix.reasons.title')}
      </h3>
      <ul className="flex flex-col gap-2">
        {reasons.map((reason) => {
          const names = reason.studentIds
            .map((id) => nameById.get(id))
            .filter((name): name is string => Boolean(name?.trim()))
            .map((name) => getDisplayNameForMode(name, 'full', nameDisplay));
          const nameList =
            reason.moreStudents > 0
              ? t('mix.reasons.andMore', {
                  names: listFormat.format(names),
                  more: reason.moreStudents,
                })
              : listFormat.format(names);
          // A sentence about people with nobody to name would have a hole in
          // it; the plain count says the same thing and is still true.
          const key =
            reason.named && names.length === 0
              ? `mix.reasons.generic.${reason.tone}`
              : `mix.reasons.${reason.key}.${reason.tone}`;
          const family =
            dataFamilyClass[
              CRITERIA_FAMILY_MAP[
                reason.key as keyof typeof CRITERIA_FAMILY_MAP
              ]
            ];

          return (
            <li key={reason.key} className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className={`${family} mt-1.5 size-1.5 shrink-0 rounded-full bg-(--data-chip-text)`}
              />
              <span className="text-xs leading-relaxed text-(--text-page)">
                {t(key, {
                  names: nameList,
                  criterion: t(`mix.criteria.${reason.key}.label`),
                  done: reason.fulfilled,
                  total: reason.total,
                  percentage: Math.round(reason.percentage),
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
