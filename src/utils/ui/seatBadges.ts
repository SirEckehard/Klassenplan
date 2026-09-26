// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The badges on a seat: which of them a view shows, how many fit, and whom a
 * badge points at when it is hovered.
 *
 * The badges themselves — their icon, word, family and order — are defined in
 * `studentAppearance`. This is what the seat renderers (the plan, the circle,
 * the projection and the exports) do with them, kept pure so the rules can be
 * tested without drawing anything.
 */
import type { MixSettings, SeatingArrangement, Student } from '@/types';
import type { DataFamily } from './designTokens';
import type { SeatHighlightLookup } from './statisticsHighlight';
import {
  calculateBadgePillLayout,
  getAllStudentBadges,
  getBadgeCriteria,
  sortBadges,
  type BadgePillLayout,
  type StudentBadge,
} from './studentAppearance';
import {
  getAvoidPartnerIds,
  getWishPartnerIds,
} from '@/utils/student/partnerUtils';

/** Which badges a view shows; without one it shows every badge. */
export type BadgeFilter = (badge: StudentBadge) => boolean;

/**
 * What the seats in the editor show: every badge, only those whose mix
 * criterion is on, or none.
 */
export type BadgeDisplayMode = 'all' | 'active' | 'off';

export const BADGE_DISPLAY_MODES: readonly BadgeDisplayMode[] = [
  'all',
  'active',
  'off',
];

/**
 * What pointing at a badge does: explain it in a tooltip, and mark everyone
 * who shares it. Both on unless the teacher switches them off.
 */
export type BadgeHoverSettings = { tooltip: boolean; highlight: boolean };

export const DEFAULT_BADGE_HOVER: BadgeHoverSettings = {
  tooltip: true,
  highlight: true,
};

/** A stored value read back safely: anything but `false` keeps the default. */
export function normalizeBadgeHover(value: unknown): BadgeHoverSettings {
  const record =
    value && typeof value === 'object'
      ? (value as Partial<Record<keyof BadgeHoverSettings, unknown>>)
      : {};
  return {
    tooltip: record.tooltip !== false,
    highlight: record.highlight !== false,
  };
}

/** The families a badge can belong to, in the order they are read. */
export const BADGE_FAMILY_ORDER: readonly DataFamily[] = [
  'behavior',
  'social',
  'learning',
  'language',
  'space',
];

/** Whether the mix weighs at least one of the criteria a badge feeds. */
export function isBadgeCriterionActive(
  badge: { key: string },
  settings: Partial<MixSettings>,
): boolean {
  return getBadgeCriteria(badge.key).some((key) => (settings[key] ?? 0) > 0);
}

/**
 * The filter behind a display mode. "All" needs none; "active" keeps what the
 * current mix weighs, so a switched-off criterion's icon leaves the plan.
 */
export function createBadgeDisplayFilter(
  mode: BadgeDisplayMode,
  settings: Partial<MixSettings>,
): BadgeFilter | undefined {
  if (mode === 'off') return () => false;
  if (mode === 'active') {
    return (badge) => isBadgeCriterionActive(badge, settings);
  }
  return undefined;
}

/** A filter that leaves out whole families, e.g. what a printout omits. */
export function createHiddenFamiliesFilter(
  hidden: readonly DataFamily[] | undefined,
): BadgeFilter | undefined {
  if (!hidden || hidden.length === 0) return undefined;
  const hiddenSet = new Set(hidden);
  return (badge) => !hiddenSet.has(badge.family);
}

/**
 * The badges a seat carries: the same four switches every seat renderer
 * passes, then the view's own filter.
 */
export function getSeatBadges(
  student: Student | null,
  allStudents: Student[],
  showSpecialNeeds = true,
  filter?: BadgeFilter,
): StudentBadge[] {
  const badges = getAllStudentBadges(student, allStudents, {
    showSpecialNeeds,
    showPartners: showSpecialNeeds,
    showHeight: showSpecialNeeds,
    showEnvironment: showSpecialNeeds,
  });
  return filter ? badges.filter(filter) : badges;
}

type PillParams = Omit<
  Parameters<typeof calculateBadgePillLayout>[0],
  'iconCount'
>;

/**
 * Smallest icon a seat draws where a tooltip can stand in for what did not
 * fit. Below it an icon is a coloured speck, not a symbol.
 */
export const LEGIBLE_BADGE_ICON_SIZE = 7;

/**
 * The pill geometry of a table seat.
 *
 * `collapse` is for the screens that can explain themselves on hover: icons
 * stay legible, the pill keeps clear of the name in the middle of the seat,
 * and what does not fit becomes "+N". A printout cannot be hovered, so it
 * keeps the older rule of shrinking the icons until every one fits.
 */
export function getSeatBadgePillParams(
  seatWidth: number,
  seatHeight: number,
  collapse: boolean,
): PillParams {
  return {
    availableWidth: Math.max(seatWidth - 12, 30),
    baseIconSize: Math.max(7, Math.min(10, seatWidth * 0.2)),
    minIconSize: collapse ? LEGIBLE_BADGE_ICON_SIZE : 5,
    horizontalPadding: Math.max(4, Math.round(seatWidth * 0.08)),
    verticalPadding: 1,
    rowGap: 2,
    maxRows: 3,
    maxHeight: collapse
      ? Math.max(14, seatHeight / 2 - 12)
      : Math.max(14, seatHeight * 0.45),
    minIconsForWrap: 5,
  };
}

export type SeatBadgeFit = {
  layout: BadgePillLayout;
  /** Drawn, in reading order. */
  visible: StudentBadge[];
  /** Behind the "+N", in reading order; empty when everything fits. */
  hidden: StudentBadge[];
};

const layoutFits = (layout: BadgePillLayout | null, params: PillParams) =>
  layout !== null &&
  layout.contentWidth + layout.paddingX * 2 <= params.availableWidth + 0.001 &&
  (params.maxHeight === undefined || layout.height <= params.maxHeight + 0.001);

/**
 * Lay the badges out on a pill.
 *
 * Without `collapse` this is {@link calculateBadgePillLayout} for all of them.
 * With it, badges that do not fit at a legible size give way to a "+N" slot:
 * the ones whose criterion is active (`prioritize`) keep their place first,
 * and whatever is drawn stays in reading order.
 */
export function fitSeatBadges(
  badges: StudentBadge[],
  params: PillParams,
  {
    collapse = false,
    prioritize,
  }: { collapse?: boolean; prioritize?: (badge: StudentBadge) => boolean } = {},
): SeatBadgeFit | null {
  if (badges.length === 0) return null;

  const all = calculateBadgePillLayout({ ...params, iconCount: badges.length });
  if (!all) return null;
  if (!collapse || layoutFits(all, params)) {
    return { layout: all, visible: badges, hidden: [] };
  }

  const ranked = prioritize
    ? [...badges].sort((a, b) => Number(prioritize(b)) - Number(prioritize(a)))
    : badges;

  for (let shown = badges.length - 1; shown >= 0; shown -= 1) {
    // One slot more than the icons shown: the last one carries the "+N".
    const layout = calculateBadgePillLayout({
      ...params,
      iconCount: shown + 1,
    });
    if (!layoutFits(layout, params)) continue;
    const kept = new Set(ranked.slice(0, shown));
    return {
      layout: layout!,
      visible: badges.filter((badge) => kept.has(badge)),
      hidden: badges.filter((badge) => !kept.has(badge)),
    };
  }

  // Not even the "+N" fits: draw everything as small as it takes.
  return { layout: all, visible: badges, hidden: [] };
}

/**
 * The students a hovered badge points at, to be marked in the plan.
 *
 * A wish or a distance points at people: the student it belongs to and the
 * classmates it names. Every other badge is a trait, and it points at everyone
 * who shares it. Without a source student (a legend row) a partner badge
 * marks everyone who has one.
 */
export function getBadgeHighlightStudentIds(
  badgeKey: string,
  sourceStudentId: string | null,
  allStudents: Student[],
): Set<string> {
  const ids = new Set<string>();
  const present = new Set(allStudents.map((student) => student.id));

  if (
    sourceStudentId &&
    (badgeKey === 'wishPartner' || badgeKey === 'avoidPartner')
  ) {
    const source = allStudents.find(
      (student) => student.id === sourceStudentId,
    );
    if (!source) return ids;
    ids.add(source.id);
    const partners =
      badgeKey === 'wishPartner'
        ? getWishPartnerIds(source)
        : getAvoidPartnerIds(source);
    for (const id of partners) {
      if (present.has(id)) ids.add(id);
    }
    return ids;
  }

  for (const student of allStudents) {
    const badges = getAllStudentBadges(student, allStudents);
    if (badges.some((badge) => badge.key === badgeKey)) {
      ids.add(student.id);
    }
  }
  return ids;
}

/**
 * Every badge the class carries once, in reading order — what a legend has to
 * explain. The first student to carry a key stands for it.
 */
export function getClassBadges(
  students: Student[],
  filter?: BadgeFilter,
): StudentBadge[] {
  const seen = new Map<string, StudentBadge>();
  for (const student of students) {
    for (const badge of getSeatBadges(student, students, true, filter)) {
      if (!seen.has(badge.key)) seen.set(badge.key, badge);
    }
  }
  return sortBadges([...seen.values()]);
}

/** Entries grouped by family, in {@link BADGE_FAMILY_ORDER}, empty ones left out. */
export function groupBadgesByFamily<T extends { family: DataFamily }>(
  entries: readonly T[],
): Array<{ family: DataFamily; entries: T[] }> {
  return BADGE_FAMILY_ORDER.map((family) => ({
    family,
    entries: entries.filter((entry) => entry.family === family),
  })).filter((group) => group.entries.length > 0);
}

/**
 * How a view draws the badges on its seats. Without one a seat shows every
 * badge and shrinks them until they fit — what an export wants.
 */
export type SeatBadgeView = {
  /** Leaves badges out altogether (the display mode, the printed families). */
  filter?: BadgeFilter;
  /** Legible icons and a "+N" instead of shrinking (screens with a tooltip). */
  collapse?: boolean;
  /** Which badges keep their place first when not all of them fit. */
  prioritize?: BadgeFilter;
};

/** The slot key of the "+N" that stands in for the badges that did not fit. */
export const BADGE_MORE_KEY = '__more';

/**
 * What a badge points at in the plan: a badge key and, where the pointer is on
 * a seat, whose badge it is. A legend row has no student.
 */
export type BadgeFocus = { badgeKey: string; studentId: string | null };

/**
 * The seats of the students a badge points at, in the shape the criterion
 * highlights use, so a hovered badge lights its seats the way a hovered
 * criterion does.
 */
export function buildBadgeHighlightLookup(
  focus: BadgeFocus | null,
  arrangement: SeatingArrangement,
  allStudents: Student[],
): SeatHighlightLookup | null {
  if (!focus || focus.badgeKey === BADGE_MORE_KEY) return null;
  const ids = getBadgeHighlightStudentIds(
    focus.badgeKey,
    focus.studentId,
    allStudents,
  );
  if (ids.size === 0) return null;

  const lookup: SeatHighlightLookup = new Map();
  arrangement.forEach((table, tableIndex) => {
    table.forEach((student, seatIndex) => {
      if (!student || !ids.has(student.id)) return;
      lookup.set(`${tableIndex}-${seatIndex}`, {
        status: 'ok',
        percentage: 100,
        mode: 'hover',
        tone: 'focus',
        target: { type: 'seat', tableIndex, seatIndex, studentId: student.id },
      });
    });
  });
  return lookup.size > 0 ? lookup : null;
}
