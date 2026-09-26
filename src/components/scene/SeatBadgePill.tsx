// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { BADGE_MORE_KEY, type SeatBadgeFit } from '@/utils/ui/seatBadges';
import { BADGE_PILL_COLORS, getBadgeColor } from '@/utils/ui/studentAppearance';

type Props = {
  fit: SeatBadgeFit;
  /** Whose badges these are; the hover lookup reads it off the pill. */
  studentId: string;
  isDark: boolean;
  /** Top-left corner of the pill in the parent's coordinates. */
  x: number;
  y: number;
};

/**
 * The row of badge icons on a seat — in the plan, the circle, the projection
 * and every export alike.
 *
 * Each icon speaks in its family's ink on a paper pill. The pill and its
 * slots carry `data-badge-*` attributes: the layer is not a pointer target
 * (dragging the seat underneath has to keep working), so the tooltip finds
 * the icon under the pointer by its box instead (`useBadgeHover`).
 */
export default function SeatBadgePill({ fit, studentId, isDark, x, y }: Props) {
  const { layout, visible, hidden } = fit;
  const mode = isDark ? 'dark' : 'light';
  const size = layout.iconSize;
  const morePosition =
    hidden.length > 0 ? layout.iconPositions[visible.length] : undefined;

  return (
    <g transform={`translate(${x} ${y})`} data-badge-pill={studentId}>
      <rect
        width={layout.width}
        height={layout.height}
        rx={layout.height / 2}
        fill={BADGE_PILL_COLORS.fill[mode]}
        stroke={BADGE_PILL_COLORS.stroke[mode]}
        strokeWidth={0.8}
      />
      {visible.map((badge, index) => {
        const position = layout.iconPositions[index];
        if (!position) return null;
        const Icon = badge.icon;
        return (
          <g
            key={badge.key}
            transform={`translate(${position.x} ${position.y})`}
            data-badge-key={badge.key}
          >
            {/* The slot's box, so the hover lookup measures the whole
                square rather than the icon's strokes. */}
            <rect width={size} height={size} fill="transparent" />
            <Icon size={size} color={getBadgeColor(badge, isDark)}>
              <title>{badge.tooltip}</title>
            </Icon>
          </g>
        );
      })}
      {morePosition && (
        <g
          transform={`translate(${morePosition.x} ${morePosition.y})`}
          data-badge-key={BADGE_MORE_KEY}
          data-badge-hidden={hidden.map((badge) => badge.key).join(' ')}
        >
          <rect width={size} height={size} fill="transparent" />
          <text
            x={size / 2}
            y={size / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.9}
            fontWeight={600}
            fill={BADGE_PILL_COLORS.more[mode]}
          >
            <title>{hidden.map((badge) => badge.label).join(', ')}</title>
            {`+${hidden.length}`}
          </text>
        </g>
      )}
    </g>
  );
}
