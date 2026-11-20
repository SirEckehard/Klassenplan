// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CalendarBlankIcon } from '@phosphor-icons/react';
import type { MixSettings, Student } from '@/types';
import {
  criterionImportance,
  dataFamilyClass,
  dataHeadingClass,
  formatStoredDate,
} from '@/utils';
import {
  BADGE_FAMILY_ORDER,
  BADGE_MORE_KEY,
  getShownBadgeCriteria,
} from '@/utils/ui/seatBadges';
import {
  getAllStudentBadges,
  type StudentBadge,
} from '@/utils/ui/studentAppearance';
import type { StudentCard } from '@/hooks/student/useStudentCard';
import {
  BadgeLines,
  FloatingCard,
  badgeFamilyLabelKey,
  shownBadges,
} from '@/components/scene/BadgeTooltip';
import {
  CRITERIA_FAMILY_MAP,
  CRITERIA_ICON_MAP,
} from '@/utils/ui/criteriaIcons';
import ImportanceMeter from '@/components/ui/controls/ImportanceMeter';
import StudentAvatar from './StudentAvatar';

type Props = {
  card: StudentCard | null;
  allStudents: Student[];
  /** Without them the card says nothing about the mix. */
  mixSettings?: MixSettings;
};

/**
 * The card over the class list: a badge explained as on a seat, with what
 * the mix makes of it, or a student's markers at a glance.
 */
export default function StudentCardLayer({
  card,
  allStudents,
  mixSettings,
}: Props) {
  if (!card || typeof document === 'undefined') return null;
  const student = allStudents.find(
    (candidate) => candidate.id === card.studentId,
  );
  if (!student) return null;
  const badges = getAllStudentBadges(student, allStudents);

  if (card.kind === 'profile') {
    return createPortal(
      <FloatingCard rect={card.rect} wide>
        <ProfileCard student={student} badges={badges} />
      </FloatingCard>,
      document.body,
    );
  }

  const shown = shownBadges(badges, card.badgeKey, card.hiddenKeys);
  if (shown.length === 0) return null;
  const isMore = card.badgeKey === BADGE_MORE_KEY;
  return createPortal(
    <FloatingCard rect={card.rect} wide>
      <BadgeLines badges={shown} isMore={isMore} />
      {!isMore && mixSettings && (
        <MixNote badgeKey={card.badgeKey} mixSettings={mixSettings} />
      )}
    </FloatingCard>,
    document.body,
  );
}

/**
 * What the mix makes of a badge, built as the card's head is: a heading,
 * then a line per criterion it feeds — the criterion's icon and name, and
 * its importance as the criteria panel draws it, the scale with the word
 * beside it. Where every criterion is off, a line says the badge does not
 * count now, which is why its chip is drawn dashed in the list.
 */
function MixNote({
  badgeKey,
  mixSettings,
}: {
  badgeKey: string;
  mixSettings: MixSettings;
}) {
  const { t } = useTranslation(['students', 'generator']);
  const criteria = getShownBadgeCriteria(badgeKey);
  if (criteria.length === 0) return null;
  const levels = criteria.map((key) => ({
    key,
    level: criterionImportance(mixSettings, key),
  }));
  const allOff = levels.every(({ level }) => level === 'off');
  return (
    <div className="flex flex-col gap-1 border-t border-(--border-card) pt-2">
      <span className={`${dataHeadingClass} text-(--text-muted)`}>
        {t('students:card.mixHeading')}
      </span>
      {/* Three columns — the criterion, its scale, its word — so the
          scales stand one under another: the word's column is as wide as
          the longest word in this card, and a long name wraps in its own. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-1">
        {levels.map(({ key, level }) => {
          const Icon = CRITERIA_ICON_MAP[key];
          const family = CRITERIA_FAMILY_MAP[key];
          return (
            <React.Fragment key={key}>
              <span className="flex min-w-0 items-center gap-1.5 text-sm text-(--text-page)">
                <Icon
                  size={14}
                  aria-hidden="true"
                  className={`${dataFamilyClass[family]} shrink-0 text-(--data-chip-text)`}
                />
                {t(`generator:mix.criteria.${key}.label`)}
              </span>
              <ImportanceMeter value={level} family={family} />
              <span className="text-xs whitespace-nowrap text-(--text-muted)">
                {t(`generator:mix.importance.${level}`)}
              </span>
            </React.Fragment>
          );
        })}
      </div>
      {allOff && (
        <span className="text-xs text-(--text-muted)">
          {t('students:card.offNote')}
        </span>
      )}
    </div>
  );
}

/** A student's markers by family, and the day they last changed. */
function ProfileCard({
  student,
  badges,
}: {
  student: Student;
  badges: StudentBadge[];
}) {
  const { t } = useTranslation('students');
  const name = student.name || t('studentList.newStudent');
  return (
    <>
      <div className="flex items-center gap-2">
        <StudentAvatar student={student} size={28} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-(--text-page)">
            {name}
          </span>
          <span className="text-xs text-(--text-muted)">
            {badges.length > 0
              ? t('card.count', { count: badges.length })
              : t('card.none')}
          </span>
        </div>
      </div>
      {badges.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1">
          {BADGE_FAMILY_ORDER.map((family) => {
            const ofFamily = badges.filter((badge) => badge.family === family);
            if (ofFamily.length === 0) return null;
            return (
              <React.Fragment key={family}>
                <dt
                  className={`${dataHeadingClass} ${dataFamilyClass[family]}`}
                >
                  {t(badgeFamilyLabelKey(family))}
                </dt>
                <dd className="m-0 text-xs text-(--text-page)">
                  {ofFamily.map(badgeInWords).join(', ')}
                </dd>
              </React.Fragment>
            );
          })}
        </dl>
      )}
      {student.markersUpdatedAt && (
        <p className="flex items-center gap-1.5 border-t border-(--border-card) pt-2 text-xs text-(--text-muted)">
          <CalendarBlankIcon
            size={14}
            aria-hidden="true"
            className="shrink-0"
          />
          {t('card.changed', {
            date: formatStoredDate(student.markersUpdatedAt),
          })}
        </p>
      )}
    </>
  );
}

/** A badge as a word; a partner badge names the classmates it points at. */
const badgeInWords = (badge: StudentBadge): string =>
  badge.key === 'wishPartner' || badge.key === 'avoidPartner'
    ? badge.tooltip
    : badge.label;
