// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Builds the legend/key for a printed seating plan: the badge icons and the
 * gender fill colours that are *actually used* by the current class, so the PDF
 * is self-explanatory without overwhelming it with every possible symbol.
 *
 * Shared by the table export ({@link SceneSvg}) and the circle export
 * ({@link CirclePrintView}); pure so it can be unit tested.
 */
import type { Student } from '@/types';
import type { Icon } from '@phosphor-icons/react';
import { getAllStudentBadges } from './studentAppearance';

export interface LegendBadgeEntry {
  key: string;
  label: string;
  icon: Icon;
  color: string;
}

/** Fallback colour for badges that don't carry their own (special-need flags). */
const DEFAULT_BADGE_COLOR = '#d97706';

type BadgeOptions = Parameters<typeof getAllStudentBadges>[2];

/**
 * Collect the distinct badges present across the class, deduplicated by badge
 * `key` (e.g. several "wish partner" badges collapse into one legend row).
 */
export function getPresentBadgeLegend(
  students: Student[],
  options?: BadgeOptions,
): LegendBadgeEntry[] {
  const seen = new Map<string, LegendBadgeEntry>();
  for (const student of students) {
    const badges = getAllStudentBadges(student, students, options);
    for (const badge of badges) {
      if (seen.has(badge.key)) continue;
      seen.set(badge.key, {
        key: badge.key,
        label: badge.label,
        icon: badge.icon,
        color: 'color' in badge ? badge.color : DEFAULT_BADGE_COLOR,
      });
    }
  }
  return [...seen.values()];
}

/** A laid-out legend item positioned within the legend band (local coords). */
export type LegendLayoutItem = {
  kind: 'badge';
  x: number;
  y: number;
  label: string;
  icon: Icon;
  color: string;
};

export interface LegendLayout {
  /** Total height the legend occupies (title + wrapped rows), 0 when empty. */
  height: number;
  /** Baseline y of the title line (relative to the legend origin). */
  titleY: number;
  /** Positioned items; each `y` is the row's baseline-ish centre. */
  items: LegendLayoutItem[];
}

export interface LegendLayoutParams {
  students: Student[];
  /** Available width for the legend band. */
  width: number;
  fontSize: number;
  iconSize: number;
  showSpecialNeeds?: boolean;
}

/** Rough monospace-ish width estimate for SVG label flow (no DOM measuring). */
function estimateTextWidth(label: string, fontSize: number): number {
  return label.length * fontSize * 0.55;
}

/**
 * Lay out the legend into wrapped rows within `width`. Pure so the export views
 * can both reserve the right vertical space *and* render the same positions.
 */
export function buildLegendLayout(params: LegendLayoutParams): LegendLayout {
  const { students, width, fontSize, iconSize, showSpecialNeeds } = params;

  const badges = getPresentBadgeLegend(students, {
    showSpecialNeeds,
    showPartners: showSpecialNeeds,
    showHeight: showSpecialNeeds,
    showEnvironment: showSpecialNeeds,
  });

  const titleLineHeight = fontSize + 5;
  const rowHeight = Math.max(iconSize, fontSize) + 6;
  const itemGap = 14;

  const items: LegendLayoutItem[] = [];
  let cursorX = 0;
  let cursorY = titleLineHeight + rowHeight / 2;

  const place = (estWidth: number): { x: number; y: number } => {
    if (cursorX > 0 && cursorX + estWidth > width) {
      cursorX = 0;
      cursorY += rowHeight;
    }
    const pos = { x: cursorX, y: cursorY };
    cursorX += estWidth + itemGap;
    return pos;
  };

  for (const badge of badges) {
    const estWidth = iconSize + 4 + estimateTextWidth(badge.label, fontSize);
    const pos = place(estWidth);
    items.push({
      kind: 'badge',
      x: pos.x,
      y: pos.y,
      label: badge.label,
      icon: badge.icon,
      color: badge.color,
    });
  }

  if (items.length === 0) {
    return { height: 0, titleY: 0, items: [] };
  }

  return {
    height: cursorY + rowHeight / 2,
    titleY: fontSize,
    items,
  };
}
