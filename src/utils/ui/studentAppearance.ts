// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Student, LanguageSkillLevel, SocialRole } from '@/types';
import i18n from '@/i18n';
import { STUDENT_FLAGS, getWishPartnerIds, getAvoidPartnerIds } from '@/utils';
import {
  HeartIcon,
  HeartBreakIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  DoorIcon,
  ImageIcon,
  // Language skill icons
  ChatCircleIcon,
  ChatDotsIcon,
  BookOpenIcon,
  StudentIcon,
  RocketIcon,
  // Social role icons
  HandshakeIcon,
  CrownIcon,
  SignpostIcon,
  SparkleIcon,
  type Icon,
} from '@phosphor-icons/react';

// Badge labels/tooltips are user-facing and must follow the active language
// (they end up in SVG <title> elements and exports). Fallbacks keep the badge
// readable if a key is ever missing.
const ts = (key: string, fallback: string) =>
  i18n.t(key, { ns: 'students', defaultValue: fallback });

/**
 * Centralized student appearance configuration
 * Single source of truth for seat fills, empty seats and locked seats
 *
 * A seat used to be tinted by the student's gender — lavender, mint, cornflower
 * — which made a plan read as a colour-coded map of who is a girl and who is a
 * boy, at every distance, to everybody in the room. Gender is one of sixteen
 * criteria, no louder than the rest, and colour in this app describes pedagogy
 * only where it comes with an icon and a word (`docs/DESIGNSYSTEM.md` § 4). A
 * seat is paper and ink now, and the gender mix is read where it is actually
 * acted on: the criterion, its fulfilment and the statistics.
 *
 * The four student buckets are kept apart from `empty` and `locked` on purpose:
 * those two are states of the seat, not of a person, and they stay tellable.
 * See `docs/decisions/0017-seats-are-paper-and-ink.md`.
 */
const SEAT_PAPER = {
  fill: {
    light: '#ffffff', // --canvas-bg
    dark: '#181a1d', // --canvas-bg, dark
  },
  stroke: {
    light: '#cec8bb', // --border-option-hover: one step darker than a hairline
    dark: '#3a3e44',
  },
} as const;

export const STUDENT_COLORS = {
  girl: SEAT_PAPER,
  boy: SEAT_PAPER,
  diverse: SEAT_PAPER,
  neutral: SEAT_PAPER,
  empty: {
    fill: {
      light: '#f3f1ec', // --surface-sunken
      dark: '#202327',
    },
    stroke: {
      light: '#e3dfd6', // --border-card
      dark: '#2a2d31',
    },
  },
  locked: {
    fill: {
      light: '#eaf0fe', // --surface-option-selected: held by hand
      dark: '#16243f',
    },
    stroke: {
      light: '#2563eb', // --border-option-selected
      dark: '#4f86f7',
    },
  },
} as const;

/**
 * Additional UI colors for seat interactions
 */
export const SEAT_UI_COLORS = {
  text: {
    light: '#17181a', // --text-page
    dark: '#f2f1ee',
  },
  lockIcon: {
    light: '#d97706', // amber-600
    dark: '#facc15', // yellow-400
  },
  unlockIcon: {
    light: '#6b7280', // gray-500
    dark: '#e5e7eb', // gray-200
  },
  lockButtonBackground: {
    light: 'rgba(255, 255, 255, 0.7)', // bg-white/70 from muted icon button token
    dark: 'rgba(3, 7, 18, 0.6)', // dark:bg-gray-950/60 from muted icon button token
  },
  lockButtonBorder: {
    light: '#dbeafe', // border-blue-100
    dark: 'rgba(29, 78, 216, 0.4)', // dark:border-blue-900/40
  },
} as const;

/**
 * Student appearance data structure
 */
export type StudentAppearance = {
  fill: string;
  stroke: string;
  text: string;
  flags: typeof STUDENT_FLAGS;
};

/**
 * Get visual appearance (colors) for a student seat
 *
 * @param student - The student to get appearance for (null for empty seat)
 * @param isDark - Whether dark mode is active
 * @param locked - Whether the seat is locked (optional, defaults to false)
 * @returns Object with fill, stroke, and text colors
 *
 * @example
 * ```typescript
 * const appearance = getStudentAppearance(student, isDark, locked);
 * // Returns: { fill: '#ffffff', stroke: '#cec8bb', text: '#17181a' }
 * ```
 */
export function getStudentAppearance(
  student: Student | null,
  isDark: boolean,
  locked = false,
): Omit<StudentAppearance, 'flags'> {
  const mode = isDark ? 'dark' : 'light';

  // A held seat is a state of the seat, and outranks everything else.
  if (locked) {
    return {
      fill: STUDENT_COLORS.locked.fill[mode],
      stroke: STUDENT_COLORS.locked.stroke[mode],
      text: SEAT_UI_COLORS.text[mode],
    };
  }

  // Empty seats
  if (!student) {
    return {
      fill: STUDENT_COLORS.empty.fill[mode],
      stroke: STUDENT_COLORS.empty.stroke[mode],
      text: SEAT_UI_COLORS.text[mode],
    };
  }

  // Every occupied seat is the same paper; who is sitting there is the name
  // on it, and what is known about them is the chips beside it.
  return {
    fill: STUDENT_COLORS.neutral.fill[mode],
    stroke: STUDENT_COLORS.neutral.stroke[mode],
    text: SEAT_UI_COLORS.text[mode],
  };
}

/**
 * Partner badge type (for wish/avoid partners)
 */
export type PartnerBadge = {
  key: 'wishPartner' | 'avoidPartner';
  label: string;
  icon: Icon;
  tooltip: string;
  color: string;
};

export type HeightBadge = {
  key: 'heightSmall' | 'heightTall';
  label: string;
  icon: Icon;
  tooltip: string;
  color: string;
};

export type EnvironmentBadge = {
  key: 'prefersWindow' | 'prefersDoor';
  label: string;
  icon: Icon;
  tooltip: string;
  color: string;
};

export type LanguageSkillBadge = {
  key: `languageSkill_${LanguageSkillLevel}`;
  label: string;
  icon: Icon;
  tooltip: string;
  color: string;
};

export type SocialRoleBadge = {
  key: `socialRole_${SocialRole}`;
  label: string;
  icon: Icon;
  tooltip: string;
  color: string;
};

/**
 * Combined badge type (special needs + partner badges + language + social role)
 */
export type StudentBadge =
  | (typeof STUDENT_FLAGS)[number]
  | PartnerBadge
  | HeightBadge
  | EnvironmentBadge
  | LanguageSkillBadge
  | SocialRoleBadge;

export type BadgePillLayout = {
  iconSize: number;
  gap: number;
  width: number;
  height: number;
  paddingX: number;
  paddingY: number;
  contentWidth: number;
  contentHeight: number;
  rows: number;
  rowGap: number;
  iconsPerRow: number[];
  rowContentWidths: number[];
  iconPositions: {
    x: number;
    y: number;
    row: number;
    column: number;
  }[];
};

export function calculateBadgePillLayout({
  availableWidth,
  iconCount,
  baseIconSize,
  minIconSize = 6,
  horizontalPadding = 6,
  verticalPadding = 2,
  maxRows = 2,
  rowGap,
  minIconsForWrap = 4,
  maxHeight,
}: {
  availableWidth: number;
  iconCount: number;
  baseIconSize: number;
  minIconSize?: number;
  horizontalPadding?: number;
  verticalPadding?: number;
  maxRows?: number;
  rowGap?: number;
  minIconsForWrap?: number;
  maxHeight?: number;
}): BadgePillLayout | null {
  if (iconCount <= 0 || availableWidth <= 0) {
    return null;
  }

  const safeMinIconSize = Math.max(2, minIconSize);
  const safeBaseIconSize = Math.max(safeMinIconSize, baseIconSize);
  const safeAvailableWidth = Math.max(
    availableWidth,
    safeMinIconSize + horizontalPadding * 2,
  );

  const safeMinIconsForWrap = Math.max(1, minIconsForWrap);
  // Keep icons compact once we reach the wrap threshold to avoid overlapping labels
  const compactIconThreshold = Math.max(5, safeMinIconsForWrap);
  const shouldForceCompactIcons = iconCount >= compactIconThreshold;
  const allowWrapping = maxRows > 1 && iconCount >= safeMinIconsForWrap;
  const safeMaxRows = allowWrapping
    ? Math.max(1, Math.min(maxRows, iconCount))
    : 1;
  const safeMaxHeight =
    typeof maxHeight === 'number' && Number.isFinite(maxHeight) && maxHeight > 0
      ? maxHeight
      : undefined;
  const maxIconSize = shouldForceCompactIcons
    ? safeMinIconSize
    : safeBaseIconSize;

  const distributeIcons = (count: number, rows: number) => {
    const base = Math.floor(count / rows);
    let remainder = count % rows;
    return Array.from({ length: rows }, () => {
      const value = base + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);
      return value;
    });
  };

  const rowCandidateSet = new Set<number>();
  if (allowWrapping) {
    rowCandidateSet.add(Math.min(2, safeMaxRows));
  }
  for (let rows = 1; rows <= safeMaxRows; rows += 1) {
    rowCandidateSet.add(rows);
  }
  // Descending order: try more rows first. Perfect fits (score=2) still return
  // immediately. For equal-score fallbacks, more rows win → avoids the long
  // single-row overflow that occurs when multi-row layouts are rejected by maxHeight.
  const rowCandidates = Array.from(rowCandidateSet).sort((a, b) => b - a);

  type LayoutCandidate = { layout: BadgePillLayout; score: number };
  let bestFallback: LayoutCandidate | null = null;

  for (const rows of rowCandidates) {
    const iconsPerRow = distributeIcons(iconCount, rows);
    const maxIconsInRow = Math.max(...iconsPerRow);
    const maxContentWidth = safeAvailableWidth - horizontalPadding * 2;
    const minGap = maxIconsInRow > 1 ? 1 : 0;

    let rowFallback: LayoutCandidate | null = null;

    for (
      let iconSize = maxIconSize;
      iconSize >= safeMinIconSize;
      iconSize -= 1
    ) {
      let gap = Math.max(2, Math.round(iconSize * 0.45));
      const requiredWidth =
        iconSize * maxIconsInRow + Math.max(0, maxIconsInRow - 1) * gap;

      if (
        maxIconsInRow > 1 &&
        requiredWidth > maxContentWidth &&
        maxContentWidth > 0
      ) {
        const adjustedGap = Math.max(
          minGap,
          Math.floor(
            Math.max(0, maxContentWidth - iconSize * maxIconsInRow) /
              Math.max(1, maxIconsInRow - 1),
          ),
        );
        gap = Math.min(gap, adjustedGap);
      }

      const rowContentWidths = iconsPerRow.map(
        (count) => count * iconSize + Math.max(0, count - 1) * gap,
      );
      const contentWidth = Math.max(0, ...rowContentWidths);
      const width = Math.min(
        safeAvailableWidth,
        contentWidth + horizontalPadding * 2,
      );
      const effectiveRowGap =
        rows > 1 ? (rowGap ?? Math.max(2, Math.round(iconSize * 0.5))) : 0;
      const contentHeight =
        rows * iconSize + Math.max(0, rows - 1) * effectiveRowGap;
      const height = contentHeight + verticalPadding * 2;

      const iconPositions: BadgePillLayout['iconPositions'] = [];
      let iconIndex = 0;
      iconsPerRow.forEach((iconsInRow, rowIndex) => {
        const rowWidth = rowContentWidths[rowIndex] ?? 0;
        // Clamp to 0 so icons never start left of the pill rect in fallback layouts.
        const rowStartX = Math.max(0, (width - rowWidth) / 2);
        const rowStartY =
          verticalPadding + rowIndex * (iconSize + effectiveRowGap);

        for (let column = 0; column < iconsInRow; column += 1) {
          const x = rowStartX + column * (iconSize + gap);
          const y = rowStartY;
          iconPositions[iconIndex] = { x, y, row: rowIndex, column };
          iconIndex += 1;
        }
      });

      const layout: BadgePillLayout = {
        iconSize,
        gap,
        width,
        height,
        paddingX: horizontalPadding,
        paddingY: verticalPadding,
        contentWidth,
        contentHeight,
        rows,
        rowGap: effectiveRowGap,
        iconsPerRow,
        rowContentWidths,
        iconPositions,
      };

      const fitsWidth =
        contentWidth + horizontalPadding * 2 <= safeAvailableWidth + 0.001;
      const fitsHeight =
        safeMaxHeight === undefined || height <= safeMaxHeight + 0.001;
      const score = (fitsWidth ? 1 : 0) + (fitsHeight ? 1 : 0);

      if (fitsWidth && fitsHeight) {
        return layout;
      }

      if (!rowFallback || score > rowFallback.score) {
        rowFallback = { layout, score };
      }
    }

    if (rowFallback) {
      if (!bestFallback || rowFallback.score > bestFallback.score) {
        bestFallback = rowFallback;
      }
    }
  }

  return bestFallback?.layout ?? null;
}

/**
 * Get student badges (special needs flags only)
 *
 * @param student - The student to get badges for
 * @param showSpecialNeeds - Whether to show special needs badges (optional, defaults to true)
 * @returns Array of active student flags
 *
 * @example
 * ```typescript
 * const badges = getStudentBadges(student, true);
 * // Returns: [{ key: 'restless', label: 'unruhig', icon: Activity, ... }]
 * ```
 */
export function getStudentBadges(
  student: Student | null,
  showSpecialNeeds = true,
): typeof STUDENT_FLAGS {
  if (!student || !showSpecialNeeds) {
    return [];
  }

  return STUDENT_FLAGS.filter((flag) => student[flag.key]).map((flag) => ({
    ...flag,
    label: ts(`studentFlags.${flag.key}.label`, flag.label),
    tooltip: ts(`studentFlags.${flag.key}.tooltip`, flag.tooltip),
  }));
}

/** Names of the referenced students, skipping ids that no longer exist. */
const partnerNames = (ids: string[], allStudents: Student[]): string[] =>
  ids
    .map((id) => allStudents.find((s) => s.id === id)?.name)
    .filter((name): name is string => Boolean(name));

/**
 * Get partner badges (wish/avoid partners)
 *
 * @param student - The student to get partner badges for
 * @param allStudents - All students (to check if partner exists)
 * @param showPartners - Whether to show partner badges (optional, defaults to true)
 * @returns Array of active partner badges
 *
 * @example
 * ```typescript
 * const partnerBadges = getPartnerBadges(student, allStudents, true);
 * // Returns: [{ key: 'wishPartner', label: 'Wunschpartner', icon: HeartHandshake, ... }]
 * ```
 */
export function getPartnerBadges(
  student: Student | null,
  allStudents: Student[],
  showPartners = true,
): PartnerBadge[] {
  if (!student || !showPartners) {
    return [];
  }

  const badges: PartnerBadge[] = [];

  // One badge per direction, naming every partner in priority order
  const wishNames = partnerNames(getWishPartnerIds(student), allStudents);
  if (wishNames.length > 0) {
    const label = ts('partners.wishPartner', 'Wunschpartner');
    badges.push({
      key: 'wishPartner',
      label,
      icon: HeartIcon,
      tooltip: `${label}: ${wishNames.join(', ')}`,
      color: '#22c55e', // green-500
    });
  }

  const avoidNames = partnerNames(getAvoidPartnerIds(student), allStudents);
  if (avoidNames.length > 0) {
    const label = ts('partners.distancePartner', 'Distanzwunsch');
    badges.push({
      key: 'avoidPartner',
      label,
      icon: HeartBreakIcon,
      tooltip: `${label}: ${avoidNames.join(', ')}`,
      color: '#f43f5e', // rose-500
    });
  }

  return badges;
}

/**
 * Get height badge (only for small/tall, not medium)
 *
 * @param student - The student to get height badge for
 * @returns Height badge or null if medium/undefined
 *
 * @example
 * ```typescript
 * const heightBadge = getHeightBadge(student);
 * // Returns: { key: 'heightSmall', label: 'Klein', icon: ArrowDown, ... } or null
 * ```
 */
export function getHeightBadge(student: Student | null): HeightBadge | null {
  if (!student?.height || student.height === 'medium') {
    return null; // Medium ist Neutralzustand
  }

  const heightTitle = ts('height.title', 'Körpergröße');

  if (student.height === 'small') {
    const label = ts('height.small', 'Klein');
    return {
      key: 'heightSmall',
      label,
      icon: ArrowDownIcon,
      tooltip: `${heightTitle}: ${label}`,
      color: '#60a5fa', // blue-400
    };
  }

  // student.height === 'tall'
  const label = ts('height.tall', 'Groß');
  return {
    key: 'heightTall',
    label,
    icon: ArrowUpIcon,
    tooltip: `${heightTitle}: ${label}`,
    color: '#f97316', // orange-500
  };
}

export function getEnvironmentBadges(
  student: Student | null,
  showEnvironment = true,
): EnvironmentBadge[] {
  if (!student || !showEnvironment) {
    return [];
  }

  const badges: EnvironmentBadge[] = [];

  if (student.prefersWindow) {
    badges.push({
      key: 'prefersWindow',
      label: ts('listHeader.windowFull', 'Fensterplatz'),
      icon: ImageIcon,
      tooltip: ts('environment.windowTooltip', 'Bevorzugt Plätze am Fenster'),
      color: '#38bdf8', // sky-400
    });
  }

  if (student.prefersDoor) {
    badges.push({
      key: 'prefersDoor',
      label: ts('listHeader.doorFull', 'Türnähe'),
      icon: DoorIcon,
      tooltip: ts('environment.doorTooltip', 'Bevorzugt Plätze in Türnähe'),
      color: '#fb923c', // orange-400
    });
  }

  return badges;
}

/**
 * Language skill configuration with icons and colors
 */
const LANGUAGE_SKILL_CONFIG: Record<
  LanguageSkillLevel,
  { icon: Icon; label: string; color: string }
> = {
  native: { icon: ChatCircleIcon, label: 'Muttersprache', color: '#22c55e' }, // green-500
  fluent: { icon: ChatDotsIcon, label: 'Fließend', color: '#3b82f6' }, // blue-500
  intermediate: {
    icon: BookOpenIcon,
    label: 'Fortgeschritten',
    color: '#8b5cf6',
  }, // purple-500
  beginner: { icon: StudentIcon, label: 'Anfänger', color: '#f59e0b' }, // amber-500
  daz: { icon: RocketIcon, label: 'DaZ-Förderung', color: '#ef4444' }, // red-500
};

/**
 * Get language skill badge
 */
export function getLanguageSkillBadge(
  student: Student | null,
  showLanguage = true,
): LanguageSkillBadge | null {
  if (!student?.languageSkill || !showLanguage) {
    return null;
  }

  const config = LANGUAGE_SKILL_CONFIG[student.languageSkill];
  const label = ts(`languageSkill.${student.languageSkill}`, config.label);
  return {
    key: `languageSkill_${student.languageSkill}`,
    label,
    icon: config.icon,
    tooltip: `${ts('languageSkill.title', 'Sprachniveau')}: ${label}`,
    color: config.color,
  };
}

/**
 * Social role configuration with icons and colors
 */
const SOCIAL_ROLE_CONFIG: Record<
  SocialRole,
  { icon: Icon; label: string; color: string }
> = {
  mediator: { icon: HandshakeIcon, label: 'Mediator', color: '#22c55e' }, // green-500
  leader: { icon: CrownIcon, label: 'Anführer', color: '#f59e0b' }, // amber-500
  loner: { icon: SignpostIcon, label: 'Einzelgänger', color: '#6b7280' }, // gray-500
  socialHub: { icon: SparkleIcon, label: 'Mittelpunkt', color: '#ec4899' }, // pink-500
};

/**
 * Get social role badge
 */
export function getSocialRoleBadge(
  student: Student | null,
  showSocialRole = true,
): SocialRoleBadge | null {
  if (!student?.socialRole || !showSocialRole) {
    return null;
  }

  const config = SOCIAL_ROLE_CONFIG[student.socialRole];
  const label = ts(`socialRole.${student.socialRole}`, config.label);
  return {
    key: `socialRole_${student.socialRole}`,
    label,
    icon: config.icon,
    tooltip: `${ts('socialRole.title', 'Soziale Rolle')}: ${label}`,
    color: config.color,
  };
}

/**
 * Get all student badges (special needs + partner badges + height badge combined)
 *
 * @param student - The student to get badges for
 * @param allStudents - All students (to check if partner exists)
 * @param options - Optional configuration
 * @returns Array of all active badges
 *
 * @example
 * ```typescript
 * const allBadges = getAllStudentBadges(student, allStudents, {
 *   showSpecialNeeds: true,
 *   showPartners: true,
 *   showHeight: true
 * });
 * // Returns: [...specialNeedsBadges, ...partnerBadges, heightBadge?]
 * ```
 */
export function getAllStudentBadges(
  student: Student | null,
  allStudents: Student[],
  options?: {
    showSpecialNeeds?: boolean;
    showPartners?: boolean;
    showHeight?: boolean;
    showEnvironment?: boolean;
    showLanguage?: boolean;
    showSocialRole?: boolean;
  },
): StudentBadge[] {
  const {
    showSpecialNeeds = true,
    showPartners = true,
    showHeight = true,
    showEnvironment,
    showLanguage,
    showSocialRole,
  } = options ?? {};

  const shouldShowEnvironment =
    typeof showEnvironment === 'boolean' ? showEnvironment : showSpecialNeeds;
  const shouldShowLanguage =
    typeof showLanguage === 'boolean' ? showLanguage : showSpecialNeeds;
  const shouldShowSocialRole =
    typeof showSocialRole === 'boolean' ? showSocialRole : showSpecialNeeds;

  const combinedSpecialNeeds = getStudentBadges(student, showSpecialNeeds);
  const partners = getPartnerBadges(student, allStudents, showPartners);
  const height = showHeight ? getHeightBadge(student) : null;
  const environmentBadges = getEnvironmentBadges(
    student,
    shouldShowEnvironment,
  );
  const languageBadge = getLanguageSkillBadge(student, shouldShowLanguage);
  const socialRoleBadge = getSocialRoleBadge(student, shouldShowSocialRole);

  // Badge order follows Option A: Identität → Fähigkeiten → Verhalten → Soziales → Raum
  const performanceKeys = new Set(['performanceStrong', 'performanceWeak']);
  const behaviorBadges = combinedSpecialNeeds.filter(
    (badge) => !performanceKeys.has(badge.key),
  );
  const performanceBadges = combinedSpecialNeeds.filter((badge) =>
    performanceKeys.has(badge.key),
  );

  const orderedBadges: StudentBadge[] = [];
  // Identität: height first
  if (height) {
    orderedBadges.push(height);
  }
  // Fähigkeiten: language, then performance
  if (languageBadge) {
    orderedBadges.push(languageBadge);
  }
  orderedBadges.push(...performanceBadges);
  // Verhalten: behavior flags (restless, shy, concentration, sensory)
  orderedBadges.push(...behaviorBadges);
  // Soziales: social role, then partners
  if (socialRoleBadge) {
    orderedBadges.push(socialRoleBadge);
  }
  orderedBadges.push(...partners);
  // Raum: environment preferences last
  orderedBadges.push(...environmentBadges);

  return orderedBadges;
}

/**
 * Get complete student appearance including badges
 *
 * @param student - The student to get appearance for
 * @param isDark - Whether dark mode is active
 * @param options - Optional configuration
 * @returns Complete appearance object with colors and badges
 *
 * @example
 * ```typescript
 * const appearance = getCompleteStudentAppearance(student, isDark, {
 *   locked: false,
 *   showSpecialNeeds: true
 * });
 * // Returns: { fill, stroke, text, flags }
 * ```
 */
export function getCompleteStudentAppearance(
  student: Student | null,
  isDark: boolean,
  options?: {
    locked?: boolean;
    showSpecialNeeds?: boolean;
  },
): StudentAppearance {
  const { locked = false, showSpecialNeeds = true } = options ?? {};

  return {
    ...getStudentAppearance(student, isDark, locked),
    flags: getStudentBadges(student, showSpecialNeeds),
  };
}
