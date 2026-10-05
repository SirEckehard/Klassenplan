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
import StudentAvatar from '@/components/students/StudentAvatar';
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
 * decides whether a plan will feel fair. A pair named by both sides is marked
 * and comes first, because that is exactly the case the algorithm treats
 * differently. Faces, not only names: a teacher reads a class by its faces.
 */
export default function RelationsView({ students }: { students: Student[] }) {
  const { t } = useTranslation('students');
  const { selectStudent, selection } = useInspector();
  const openedId = selection?.kind === 'student' ? selection.id : null;

  const byId = React.useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );

  const { wishes, avoids, withoutWish } = React.useMemo(() => {
    const collect = (read: (student: Student) => string[]) => {
      const pairs: Pair[] = [];
      const seen = new Set<string>();
      for (const student of students) {
        for (const partnerId of read(student)) {
          const partner = byId.get(partnerId);
          if (!partner) continue;
          // One card per pair: a mutual wish is one relationship, not two.
          const mutual = read(partner).includes(student.id);
          const key = mutual
            ? [student.id, partner.id].sort().join('~')
            : `${student.id}>${partner.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          pairs.push({ key, from: student, to: partner, mutual });
        }
      }
      // Mutual pairs first; within each kind the class list's order stays.
      return [
        ...pairs.filter((pair) => pair.mutual),
        ...pairs.filter((pair) => !pair.mutual),
      ];
    };

    return {
      wishes: collect(getWishPartnerIds),
      avoids: collect(getAvoidPartnerIds),
      // Who has not named anybody yet: what is still to ask, not a verdict.
      withoutWish: students.filter(
        (student) =>
          !getWishPartnerIds(student).some((partnerId) => byId.has(partnerId)),
      ),
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

  const renderPerson = (student: Student) => (
    <button
      type="button"
      onClick={() => selectStudent(student.id)}
      aria-label={t('listStatus.openStudent', { name: nameOf(student) })}
      aria-current={student.id === openedId ? 'true' : undefined}
      // The student open in the inspector keeps the hover's grey wherever
      // they appear, so the pairs framed in blue show who they are about.
      className={`${personButtonClass} ${
        student.id === openedId ? 'bg-(--surface-sunken)' : ''
      }`}
    >
      <StudentAvatar student={student} size={56} />
      <span className="line-clamp-2 text-sm leading-tight font-medium wrap-break-word">
        {nameOf(student)}
      </span>
    </button>
  );

  const renderGroup = (heading: string, pairs: Pair[], countLabel: string) => {
    const mutualCount = pairs.filter((pair) => pair.mutual).length;
    return (
      <section className={`${listContainerClass} @container p-4`}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className={`${dataChipClass} ${dataFamilyClass.social}`}>
            {heading}
          </h3>
          <span className="text-xs tabular-nums text-(--text-muted)">
            {countLabel}
            {mutualCount > 0 &&
              ` · ${t('relations.countMutual', { count: mutualCount })}`}
          </span>
        </div>
        {pairs.length === 0 ? (
          <p className="text-sm text-(--text-muted)">
            {t('relations.noneInGroup')}
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0 @md:grid-cols-2 @3xl:grid-cols-3">
            {pairs.map((pair) => {
              const isOpened =
                openedId !== null &&
                (pair.from.id === openedId || pair.to.id === openedId);
              return (
                <li
                  key={pair.key}
                  // The pairs of the student open in the inspector are framed
                  // in blue, so editing one shows where it stands.
                  className={`flex items-start gap-1 rounded-xl border p-2 transition ${
                    isOpened
                      ? 'border-(--border-option-selected)'
                      : 'border-(--border-card)'
                  } bg-(--surface-card)`}
                >
                  {renderPerson(pair.from)}
                  <span className="flex w-20 shrink-0 flex-col items-center gap-1 pt-4 text-center">
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        pair.mutual
                          ? `${dataFamilyClass.social} bg-(--data-chip-surface) text-(--data-chip-text)`
                          : 'bg-(--surface-sunken) text-(--text-muted)'
                      }`}
                    >
                      {pair.mutual ? (
                        <ArrowsLeftRightIcon size={16} weight="bold" />
                      ) : (
                        <ArrowRightIcon size={16} weight="bold" />
                      )}
                    </span>
                    <span className="text-xs leading-tight text-(--text-muted)">
                      {pair.mutual
                        ? t('relations.mutual')
                        : t('relations.oneSided')}
                    </span>
                  </span>
                  {renderPerson(pair.to)}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  };

  // Side by side only when both have something to show; an empty group is a
  // line, and half the stage beside it would stay blank.
  const sideBySide = wishes.length > 0 && avoids.length > 0;

  return (
    <div className="@container flex flex-col gap-4">
      <p className="text-sm text-(--text-muted)">
        {t('relations.description')}
      </p>
      <div
        className={`grid items-start gap-4 ${sideBySide ? '@5xl:grid-cols-2' : ''}`}
      >
        {renderGroup(
          t('relations.wishHeading'),
          wishes,
          t('relations.countWishes', { count: wishes.length }),
        )}
        {renderGroup(
          t('relations.avoidHeading'),
          avoids,
          t('relations.countAvoids', { count: avoids.length }),
        )}
      </div>

      {withoutWish.length > 0 && (
        <section className={`${listContainerClass} p-4`}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className={`${dataChipClass} ${dataFamilyClass.social}`}>
              {t('relations.withoutWishHeading')}
            </h3>
            <span className="text-xs text-(--text-muted)">
              {t('relations.withoutWishHint')}
            </span>
          </div>
          <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
            {withoutWish.map((student) => (
              <li key={student.id} className="w-24">
                {renderPerson(student)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** A face and the name under it, one button that opens the student. */
const personButtonClass =
  'flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-lg px-1 py-1.5 text-center text-(--text-page) transition hover:bg-(--surface-sunken) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)';
