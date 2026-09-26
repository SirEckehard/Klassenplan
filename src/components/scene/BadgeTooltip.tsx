// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import {
  dataFamilyClass,
  dataHeadingClass,
  menuSurfaceClass,
  type DataFamily,
} from '@/utils';
import { BADGE_MORE_KEY, type BadgeFocus } from '@/utils/ui/seatBadges';
import {
  describeBadge,
  getAllStudentBadges,
  type StudentBadge,
} from '@/utils/ui/studentAppearance';
import { useBadgeHover, type HoveredBadge } from '@/hooks/scene/useBadgeHover';

/** The family's name, as the inspector's groups call it. */
export const badgeFamilyLabelKey = (family: DataFamily) =>
  `students:inspector.groups.${family}`;

/** Half the tooltip's widest, plus a margin to the window edge. */
const EDGE_CLEARANCE = 136;
/** Below this distance to the top of the window the tooltip opens downwards. */
const ROOM_ABOVE = 140;

/**
 * The tooltip of the badges on the seats of one SVG: what the icon under the
 * pointer means, or — on a "+N" — which badges it stands for.
 *
 * Mouse and pen hover, a finger taps (see `useBadgeHover`). `onFocusChange`
 * reports the hovered badge, so the host can light the seats it points at;
 * the "+N" points at nothing and reports no badge.
 */
export default function BadgeTooltipLayer({
  svgRef,
  allStudents,
  enabled = true,
  showTooltip = true,
  onFocusChange,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>;
  allStudents: Student[];
  /** False while a seat is dragged: nothing is explained mid-move. */
  enabled?: boolean;
  /** False keeps the tooltip away and only reports the badge pointed at. */
  showTooltip?: boolean;
  /** Without it, pointing at a badge marks nobody. */
  onFocusChange?: (focus: BadgeFocus | null) => void;
}) {
  // With neither a tooltip nor anyone to tell, there is nothing to look for.
  const hovered = useBadgeHover(svgRef, {
    enabled: enabled && (showTooltip || Boolean(onFocusChange)),
  });
  const badgeKey = hovered?.badgeKey ?? null;
  const studentId = hovered?.studentId ?? null;

  React.useEffect(() => {
    onFocusChange?.(
      badgeKey && badgeKey !== BADGE_MORE_KEY ? { badgeKey, studentId } : null,
    );
  }, [badgeKey, studentId, onFocusChange]);

  if (!hovered || !showTooltip || typeof document === 'undefined') {
    return null;
  }
  return createPortal(
    <BadgeTooltip hovered={hovered} allStudents={allStudents} />,
    document.body,
  );
}

function BadgeTooltip({
  hovered,
  allStudents,
}: {
  hovered: HoveredBadge;
  allStudents: Student[];
}) {
  const { t } = useTranslation(['generator', 'students']);
  const student = allStudents.find(
    (candidate) => candidate.id === hovered.studentId,
  );
  const badges = student ? getAllStudentBadges(student, allStudents) : [];
  const isMore = hovered.badgeKey === BADGE_MORE_KEY;
  const shown = isMore
    ? hovered.hiddenKeys
        .map((key) => badges.find((badge) => badge.key === key))
        .filter((badge): badge is StudentBadge => Boolean(badge))
    : badges.filter((badge) => badge.key === hovered.badgeKey);
  if (shown.length === 0) return null;

  const { rect } = hovered;
  const viewportWidth = window.innerWidth;
  const centerX = Math.min(
    Math.max(rect.left + rect.width / 2, EDGE_CLEARANCE),
    Math.max(EDGE_CLEARANCE, viewportWidth - EDGE_CLEARANCE),
  );
  const above = rect.top > ROOM_ABOVE;

  return (
    <div
      role="tooltip"
      className={`${menuSurfaceClass} pointer-events-none fixed z-50 flex max-w-64 flex-col gap-2 px-3 py-2`}
      style={{
        left: centerX,
        top: above ? rect.top - 6 : rect.top + rect.height + 6,
        transform: above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      }}
    >
      {isMore && (
        <p className={`${dataHeadingClass} text-(--text-muted)`}>
          {t('generator:seat.badgeTooltip.more', { count: shown.length })}
        </p>
      )}
      {shown.map((badge) => (
        <BadgeLine key={badge.key} badge={badge} />
      ))}
    </div>
  );
}

/** One badge in words: its family, what it is, and what it means. */
function BadgeLine({ badge }: { badge: StudentBadge }) {
  const { t } = useTranslation('students');
  const { heading, detail } = describeBadge(badge);
  const Icon = badge.icon;
  return (
    <div className={`${dataFamilyClass[badge.family]} flex items-start gap-2`}>
      <Icon
        size={16}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-(--data-chip-text)"
      />
      <div className="flex min-w-0 flex-col">
        <span className={dataHeadingClass}>
          {t(badgeFamilyLabelKey(badge.family))}
        </span>
        <span className="text-sm font-semibold text-(--text-page) first-letter:uppercase">
          {heading}
        </span>
        {detail && (
          <span className="text-xs text-(--text-muted)">{detail}</span>
        )}
      </div>
    </div>
  );
}
