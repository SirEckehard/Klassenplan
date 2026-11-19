// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarBlankIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import type { MixSettings, Student } from '@/types';
import {
  dataFamilyClass,
  dataHeadingClass,
  formatStoredDate,
  getAvoidPartnerIds,
  getWishPartnerIds,
} from '@/utils';
import {
  BADGE_FAMILY_ORDER,
  getShownBadgeCriteria,
  isBadgeCriterionActive,
} from '@/utils/ui/seatBadges';
import {
  describeBadge,
  getAllStudentBadges,
  type StudentBadge,
} from '@/utils/ui/studentAppearance';
import { badgeFamilyLabelKey } from '@/components/scene/BadgeTooltip';

type Props = {
  id: string;
  student: Student;
  allStudents: Student[];
  mixSettings?: MixSettings;
  /** A partner's name, pressed: that student's row comes into view. */
  onShowStudent?: (studentId: string) => void;
  /** Opens the student in the inspector, where markers are changed. */
  onEdit: () => void;
  className?: string;
};

/**
 * A row's markers in words, unfolded in place below `lg` (decision 0051):
 * each family under its heading, what a marker means, whom a partner badge
 * names — as buttons that bring their rows into view — and the day the
 * markers last changed. Reading only; "Bearbeiten" leads to the inspector.
 */
export default function StudentMarkerDetails({
  id,
  student,
  allStudents,
  mixSettings,
  onShowStudent,
  onEdit,
  className = '',
}: Props) {
  const { t } = useTranslation('students');
  const badges = React.useMemo(
    () => getAllStudentBadges(student, allStudents),
    [allStudents, student],
  );

  const partnersOf = (badge: StudentBadge): Student[] => {
    const ids =
      badge.key === 'wishPartner'
        ? getWishPartnerIds(student)
        : badge.key === 'avoidPartner'
          ? getAvoidPartnerIds(student)
          : [];
    return ids
      .map((partnerId) => allStudents.find((other) => other.id === partnerId))
      .filter((other): other is Student => Boolean(other));
  };

  return (
    <div
      id={id}
      className={`flex flex-col gap-2.5 rounded-xl bg-(--surface-sunken) px-3 py-2.5 ${className}`}
    >
      {BADGE_FAMILY_ORDER.map((family) => {
        const ofFamily = badges.filter((badge) => badge.family === family);
        if (ofFamily.length === 0) return null;
        return (
          <section
            key={family}
            className={`${dataFamilyClass[family]} flex flex-col gap-1`}
          >
            <h3 className={dataHeadingClass}>
              {t(badgeFamilyLabelKey(family))}
            </h3>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {ofFamily.map((badge) => {
                const Icon = badge.icon;
                const partners = partnersOf(badge);
                const { heading, detail } = describeBadge(badge);
                const off =
                  mixSettings !== undefined &&
                  getShownBadgeCriteria(badge.key).length > 0 &&
                  !isBadgeCriterionActive(badge, mixSettings);
                return (
                  <li
                    key={badge.key}
                    className="flex items-baseline gap-2 text-sm text-(--text-page)"
                  >
                    <Icon
                      size={14}
                      aria-hidden="true"
                      className="shrink-0 translate-y-0.5 text-(--data-chip-text)"
                    />
                    <span className="min-w-0">
                      {partners.length > 0 ? (
                        <>
                          {badge.label}:{' '}
                          {partners.map((partner, index) => (
                            <React.Fragment key={partner.id}>
                              {index > 0 && ', '}
                              <button
                                type="button"
                                onClick={() => onShowStudent?.(partner.id)}
                                className="cursor-pointer font-semibold text-(--text-badge) underline underline-offset-2 pointer-coarse:py-1"
                              >
                                {partner.name || t('studentList.newStudent')}
                              </button>
                            </React.Fragment>
                          ))}
                        </>
                      ) : (
                        <span className="first-letter:uppercase">
                          {heading}
                        </span>
                      )}
                      {partners.length === 0 && detail && (
                        <span className="text-xs text-(--text-muted)">
                          {' · '}
                          {detail}
                        </span>
                      )}
                      {off && (
                        <span className="text-xs text-(--text-muted)">
                          {' · '}
                          {t('card.offShort')}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <div className="flex items-center justify-between gap-3 border-t border-(--border-card) pt-2 text-xs text-(--text-muted)">
        <span className="flex items-center gap-1.5">
          {student.markersUpdatedAt && (
            <>
              <CalendarBlankIcon size={14} aria-hidden="true" />
              {t('card.changed', {
                date: formatStoredDate(student.markersUpdatedAt),
              })}
            </>
          )}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2 font-semibold text-(--text-page) hover:bg-(--surface-card) pointer-coarse:min-h-11"
        >
          <PencilSimpleIcon size={14} aria-hidden="true" />
          {t('expand.edit')}
        </button>
      </div>
    </div>
  );
}
