// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { MixSettings, Student } from '@/types';
import { dataChipClass, dataChipOffClass, dataFamilyClass } from '@/utils';
import {
  BADGE_FAMILY_ORDER,
  BADGE_MORE_KEY,
  getShownBadgeCriteria,
  isBadgeCriterionActive,
} from '@/utils/ui/seatBadges';
import {
  getAllStudentBadges,
  type StudentBadge,
} from '@/utils/ui/studentAppearance';

type Props = {
  student: Student;
  /** The whole class — partner badges name the classmates they point at. */
  allStudents: Student[];
  /**
   * Words where the list is wide, the icons of the seats where it is narrow
   * (a phone, a tablet upright): one line per row, what does not fit
   * behind a "+N".
   */
  variant?: 'words' | 'icons';
  /** With them, a badge whose criteria are all off is drawn dashed. */
  mixSettings?: MixSettings;
  className?: string;
};

/** One icon of the strip: its box and the gaps around it, in px. */
const ICON_BOX = 22;
const ICON_GAP = 3;
const FAMILY_GAP = 8;
/** Room the "+N" takes at the end of the strip. */
const MORE_WIDTH = 30;

/** Whether the mix weighs nothing a badge feeds, so it does not count now. */
const countsForNothing = (badge: StudentBadge, settings?: MixSettings) =>
  settings !== undefined &&
  getShownBadgeCriteria(badge.key).length > 0 &&
  !isBadgeCriterionActive(badge, settings);

/**
 * How many of the badges fit into `width`, the families a gap apart; all of
 * them where nothing was measured (the first render, a test).
 */
export function fittingBadgeCount(
  badges: readonly StudentBadge[],
  width: number,
): number {
  if (width <= 0) return badges.length;
  let used = 0;
  const widths = badges.map((badge, index) => {
    const gap =
      index === 0
        ? 0
        : badges[index - 1].family === badge.family
          ? ICON_GAP
          : FAMILY_GAP;
    used += gap + ICON_BOX;
    return used;
  });
  if (widths[widths.length - 1] <= width) return badges.length;
  const room = width - MORE_WIDTH - FAMILY_GAP;
  const fit = widths.findIndex((end) => end > room);
  return Math.max(0, fit);
}

/** The width of an element, kept up to date. */
function useWidth(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  const [width, setWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    setWidth(element.clientWidth);
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, ref]);
  return width;
}

/**
 * The attributes a student actually has.
 *
 * Replaces the sixteen toggle columns of the old row. A badge appears only for
 * a value that is set, so an unfilled class shows nothing instead of four
 * hundred grey outlines, and "not decided yet" stops looking exactly like
 * "decided against". Each badge explains itself on hover or a long press
 * (`useStudentCard`, through `data-card-badge`).
 */
function StudentChips({
  student,
  allStudents,
  variant = 'words',
  mixSettings,
  className = '',
}: Props) {
  const { t } = useTranslation('generator');
  const badges = React.useMemo(
    () => getAllStudentBadges(student, allStudents),
    [allStudents, student],
  );
  const stripRef = React.useRef<HTMLDivElement>(null);
  const width = useWidth(stripRef, variant === 'icons' && badges.length > 0);

  if (badges.length === 0) return null;

  if (variant === 'icons') {
    const fit = fittingBadgeCount(badges, width);
    const shown = badges.slice(0, fit);
    const hidden = badges.slice(fit);
    return (
      <div
        ref={stripRef}
        className={`flex min-w-0 items-center overflow-hidden ${className}`}
      >
        {BADGE_FAMILY_ORDER.map((family) => {
          const ofFamily = shown.filter((badge) => badge.family === family);
          if (ofFamily.length === 0) return null;
          return (
            <span
              key={family}
              className={`${dataFamilyClass[family]} mr-2 flex shrink-0 gap-0.75 last:mr-0`}
            >
              {ofFamily.map((badge) => {
                const Icon = badge.icon;
                const off = countsForNothing(badge, mixSettings);
                return (
                  <span
                    key={badge.key}
                    role="img"
                    aria-label={badge.tooltip}
                    data-card-badge={badge.key}
                    data-card-student={student.id}
                    className={`flex size-5.5 items-center justify-center rounded-md text-(--data-chip-text) ${
                      off
                        ? 'border border-dashed border-(--data-chip-accent)'
                        : 'bg-(--data-chip-surface)'
                    }`}
                  >
                    <Icon size={14} aria-hidden="true" />
                  </span>
                );
              })}
            </span>
          );
        })}
        {hidden.length > 0 && (
          <span
            data-card-badge={BADGE_MORE_KEY}
            data-card-student={student.id}
            data-card-hidden={hidden.map((badge) => badge.key).join(' ')}
            aria-label={t('seat.badgeTooltip.more', { count: hidden.length })}
            role="img"
            className="ml-2 shrink-0 rounded-md border border-(--border-card) px-1.5 text-caption leading-5 font-semibold text-(--text-muted) tabular-nums first:ml-0"
          >
            +{hidden.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {badges.map((badge) => {
        const Icon = badge.icon;
        const off = countsForNothing(badge, mixSettings);
        return (
          <span
            key={badge.key}
            data-card-badge={badge.key}
            data-card-student={student.id}
            className={`${dataChipClass} ${dataFamilyClass[badge.family]} ${
              off ? dataChipOffClass : ''
            }`}
          >
            <Icon size={13} aria-hidden="true" />
            {/* One element with the names, so the chip's gap stays between
                the icon and the words and not before the colon. */}
            <span>
              {badge.label}
              {/* Where the list is wide, a partner badge names whom it
                  means, which a narrower list leaves to its card. */}
              {'names' in badge && (
                <span className="hidden @4xl:inline">
                  {': '}
                  <span className="font-semibold">
                    {badge.names.join(', ')}
                  </span>
                </span>
              )}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export default React.memo(StudentChips);
