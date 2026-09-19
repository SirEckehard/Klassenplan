// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { Student } from '@/types';
import { dataChipClass, dataFamilyClass, type DataFamily } from '@/utils';
import { getAllStudentBadges } from '@/utils/ui/studentAppearance';

/**
 * Which pedagogical family a badge belongs to.
 *
 * The badge keys come from `studentAppearance`, which the SVG scene and the
 * exports already share; this map is the one place that says what colour each
 * of them speaks in. Anything unmapped falls back to the neutral person
 * family rather than picking a colour at random.
 */
const BADGE_FAMILY: Record<string, DataFamily> = {
  restless: 'behavior',
  concentrationIssues: 'behavior',
  shy: 'social',
  wishPartner: 'social',
  avoidPartner: 'social',
  performanceStrong: 'learning',
  performanceWeak: 'learning',
  needsFrontSeat: 'space',
  heightSmall: 'space',
  heightTall: 'space',
  prefersWindow: 'space',
  prefersDoor: 'space',
};

const familyFor = (key: string): DataFamily => {
  if (key.startsWith('languageSkill_')) return 'language';
  if (key.startsWith('socialRole_')) return 'social';
  return BADGE_FAMILY[key] ?? 'person';
};

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
            className={`${dataChipClass} ${dataFamilyClass[familyFor(badge.key)]}`}
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
