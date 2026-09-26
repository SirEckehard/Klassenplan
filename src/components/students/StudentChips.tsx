// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { Student } from '@/types';
import { dataChipClass, dataFamilyClass } from '@/utils';
import { getAllStudentBadges } from '@/utils/ui/studentAppearance';

type Props = {
  student: Student;
  /** The whole class — partner badges name the classmates they point at. */
  allStudents: Student[];
  className?: string;
};

/**
 * The attributes a student actually has, as labelled chips.
 *
 * Replaces the sixteen toggle columns of the old row. A chip appears only for
 * a value that is set, so an unfilled class shows nothing instead of four
 * hundred grey outlines, and "not decided yet" stops looking exactly like
 * "decided against".
 */
function StudentChips({ student, allStudents, className = '' }: Props) {
  const badges = React.useMemo(
    () => getAllStudentBadges(student, allStudents),
    [allStudents, student],
  );

  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {badges.map((badge) => {
        const Icon = badge.icon;
        return (
          <span
            key={badge.key}
            className={`${dataChipClass} ${dataFamilyClass[badge.family]}`}
            title={badge.tooltip}
          >
            <Icon size={13} aria-hidden="true" />
            {badge.label}
          </span>
        );
      })}
    </div>
  );
}

export default React.memo(StudentChips);
