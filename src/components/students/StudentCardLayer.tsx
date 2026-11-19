// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  CalendarBlankIcon,
  SlidersHorizontalIcon,
} from '@phosphor-icons/react';
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
      <FloatingCard rect={card.rect}>
        <ProfileCard student={student} badges={badges} />
      </FloatingCard>,
      document.body,
    );
  }

  const shown = shownBadges(badges, card.badgeKey, card.hiddenKeys);
  if (shown.length === 0) return null;
  const isMore = card.badgeKey === BADGE_MORE_KEY;
  return createPortal(
    <FloatingCard rect={card.rect}>
      <BadgeLines badges={shown} isMore={isMore} />
      {!isMore && mixSettings && (
        <MixNote badgeKey={card.badgeKey} mixSettings={mixSettings} />
      )}
    </FloatingCard>,
    document.body,
  );
}

/**
 * What the mix makes of a badge: the criteria it feeds and how important
 * each is, or that none of them counts right now — which is why its chip is
 * drawn dashed in the list.
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
    label: t(`generator:mix.criteria.${key}.label`),
    level: criterionImportance(mixSettings, key),
  }));
  const allOff = levels.every(({ level }) => level === 'off');
  const text = allOff
    ? t('students:card.mixOff', {
        criteria: levels.map(({ label }) => label).join(', '),
      })
    : t('students:card.mix', {
        criteria: levels
          .map(({ label, level }) =>
            t('students:card.criterion', {
              criterion: label,
              importance: t(`generator:mix.importance.${level}`),
            }),
          )
          .join(', '),
      });
  return (
    <p className="flex items-start gap-1.5 border-t border-(--border-card) pt-2 text-xs text-(--text-muted)">
      <SlidersHorizontalIcon
        size={14}
        aria-hidden="true"
        className="mt-px shrink-0"
      />
      {text}
    </p>
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
