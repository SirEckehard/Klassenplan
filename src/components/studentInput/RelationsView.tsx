// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowsLeftRightIcon,
  ArrowRightIcon,
  GraphIcon,
} from '@phosphor-icons/react';
import type { Student } from '@/types';
import { useInspector } from '@/contexts/InspectorContext';
import {
  dataChipClass,
  dataFamilyClass,
  getAvoidPartnerIds,
  getWishPartnerIds,
  listContainerClass,
} from '@/utils';

type Pair = {
  key: string;
  from: Student;
  to: Student;
  /** Both named each other; the algorithm weighs that pair more heavily. */
  mutual: boolean;
};

/**
 * Who wants to sit next to whom — the whole class in one reading.
 *
 * The same wishes are editable one student at a time in the inspector, which
 * answers "what do I know about Ben". It cannot answer "does anybody want to
 * sit next to Ben, and did he say so back", and that question is the one that
 * decides whether a plan will feel fair. A pair named by both sides is marked,
 * because that is exactly the case the algorithm treats differently.
 */
export default function RelationsView({ students }: { students: Student[] }) {
  const { t } = useTranslation('students');
  const { selectStudent } = useInspector();

  const byId = React.useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );

  const { wishes, avoids } = React.useMemo(() => {
    const collect = (read: (student: Student) => string[]) => {
      const pairs: Pair[] = [];
      const seen = new Set<string>();
      for (const student of students) {
        for (const partnerId of read(student)) {
          const partner = byId.get(partnerId);
          if (!partner) continue;
          // One row per pair: a mutual wish is one relationship, not two.
          const mutual = read(partner).includes(student.id);
          const key = mutual
            ? [student.id, partner.id].sort().join('~')
            : `${student.id}>${partner.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          pairs.push({ key, from: student, to: partner, mutual });
        }
      }
      return pairs;
    };

    return {
      wishes: collect(getWishPartnerIds),
      avoids: collect(getAvoidPartnerIds),
    };
  }, [byId, students]);

  const nameOf = (student: Student) =>
    student.name.trim() || t('relations.unknownStudent');

  if (wishes.length === 0 && avoids.length === 0) {
    return (
      <div
        className={`${listContainerClass} flex flex-col items-center gap-3 px-6 py-12 text-center`}
      >
        <GraphIcon
          size={28}
          className="text-(--text-muted)"
          aria-hidden="true"
        />
        <p className="text-sm font-semibold">{t('relations.noRelations')}</p>
        <p className="max-w-md text-xs leading-relaxed text-(--text-muted)">
          {t('relations.noRelationsHint')}
        </p>
      </div>
    );
  }

  const renderGroup = (
    heading: string,
    pairs: Pair[],
    family: string,
    countLabel: string,
  ) => (
    <section className={`${listContainerClass} p-4`}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className={`${dataChipClass} ${family}`}>{heading}</h3>
        <span className="text-xs tabular-nums text-(--text-muted)">
          {countLabel}
        </span>
      </div>
      {pairs.length === 0 ? (
        <p className="text-sm text-(--text-muted)">
          {t('relations.noRelations')}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {pairs.map((pair) => (
            <li
              key={pair.key}
              className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-(--surface-sunken)"
            >
              <button
                type="button"
                onClick={() => selectStudent(pair.from.id)}
                className={nameButtonClass}
              >
                {nameOf(pair.from)}
              </button>
              <span className="text-(--text-muted)" aria-hidden="true">
                {pair.mutual ? (
                  <ArrowsLeftRightIcon size={14} />
                ) : (
                  <ArrowRightIcon size={14} />
                )}
              </span>
              <button
                type="button"
                onClick={() => selectStudent(pair.to.id)}
                className={nameButtonClass}
              >
                {nameOf(pair.to)}
              </button>
              <span className="text-xs text-(--text-muted)">
                {pair.mutual ? t('relations.mutual') : t('relations.oneSided')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-(--text-muted)">
        {t('relations.description')}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {renderGroup(
          t('relations.wishHeading'),
          wishes,
          dataFamilyClass.social,
          t('relations.countWishes', { count: wishes.length }),
        )}
        {renderGroup(
          t('relations.avoidHeading'),
          avoids,
          dataFamilyClass.social,
          t('relations.countAvoids', { count: avoids.length }),
        )}
      </div>
    </div>
  );
}

const nameButtonClass =
  'cursor-pointer rounded px-1 font-medium underline decoration-dotted underline-offset-2 transition hover:text-(--text-badge) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)';
