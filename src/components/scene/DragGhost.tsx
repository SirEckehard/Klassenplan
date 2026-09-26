// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ArrowsLeftRightIcon, type Icon } from '@phosphor-icons/react';
import { cardSurfaceClass, type DataFamily } from '@/utils';
import {
  BADGE_PILL_COLORS,
  calculateBadgePillLayout,
  getBadgeColor,
} from '@/utils/ui/studentAppearance';

type GhostBadge = {
  key: string;
  icon: Icon;
  tooltip: string;
  family: DataFamily;
};

export type DragGhostProps = {
  /** The pointer, in client coordinates. */
  x: number;
  y: number;
  /** A seat of the table plan or a token of the circle. */
  shape: 'seat' | 'token';
  /** The seat or token as drawn, in plan units; the ghost keeps its shape. */
  width: number;
  height: number;
  /** Screen pixels per plan unit. */
  viewportScale: number;
  name: string;
  appearance: { fill: string; stroke: string; text: string };
  badges: GhostBadge[];
  /** Who would take the dragged student's place, while that is a swap. */
  swapWith?: string | null;
  isDark: boolean;
};

/**
 * The student being dragged, in the plan and in the circle alike.
 *
 * It floats above the pointer rather than on it: the seat under the pointer
 * is where the student lands, and its ring has to stay in sight — under a
 * fingertip, too. Over a taken place it says whom the student would swap with.
 */
export default function DragGhost(props: DragGhostProps) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: props.x,
        top: props.y,
        transform: 'translate(-50%, calc(-100% - 12px))',
      }}
    >
      <GhostCard {...props} />
    </div>,
    document.body,
  );
}

function GhostCard({
  shape,
  width: plannedWidth,
  height: plannedHeight,
  viewportScale,
  name,
  appearance,
  badges,
  swapWith,
  isDark,
}: DragGhostProps) {
  const { t } = useTranslation('generator');
  const pillMode = isDark ? 'dark' : 'light';
  const clampedViewportScale = Math.max(0.3, Math.min(1, viewportScale * 0.92));
  const targetSize = Math.max(24, Math.min(68, 60 * clampedViewportScale));
  const sizeScale = targetSize / Math.max(plannedWidth, plannedHeight, 1);
  const width = Math.max(24, plannedWidth * sizeScale);
  const height = Math.max(24, plannedHeight * sizeScale);
  const badgeLayout =
    badges.length > 0
      ? calculateBadgePillLayout({
          availableWidth: Math.max(width - 14, 30),
          iconCount: badges.length,
          baseIconSize: Math.max(7, Math.min(10, width * 0.18)),
          minIconSize: 6,
          horizontalPadding: 6,
          verticalPadding: 1,
          rowGap: 2,
          minIconsForWrap: 5,
        })
      : null;

  return (
    <div
      className={`${cardSurfaceClass} pointer-events-none flex flex-col items-center gap-1.5 bg-(--surface-card) px-2 py-2 shadow-lg backdrop-blur-sm`}
    >
      <div
        className={`relative flex items-center justify-center ${
          shape === 'token' ? 'rounded-full' : 'rounded-md'
        }`}
        style={{
          width,
          height,
          backgroundColor: appearance.fill,
          border: `2px solid ${appearance.stroke}`,
        }}
      >
        <span
          className="text-xs font-semibold"
          style={{ color: appearance.text }}
        >
          {name}
        </span>
        {badgeLayout && (
          <div
            className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full border"
            style={{
              width: badgeLayout.width,
              height: badgeLayout.height,
              backgroundColor: BADGE_PILL_COLORS.fill[pillMode],
              borderColor: BADGE_PILL_COLORS.stroke[pillMode],
            }}
          >
            <div className="relative h-full w-full">
              {badges.map((badge, index) => {
                const position = badgeLayout.iconPositions[index];
                if (!position) return null;
                const BadgeIcon = badge.icon;
                return (
                  <span
                    key={badge.key}
                    className="absolute flex items-center justify-center"
                    style={{
                      left: position.x,
                      top: position.y,
                      width: badgeLayout.iconSize,
                      height: badgeLayout.iconSize,
                    }}
                  >
                    <BadgeIcon
                      size={badgeLayout.iconSize}
                      color={getBadgeColor(badge, isDark)}
                      aria-hidden="true"
                    />
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {swapWith && (
        <span className="flex max-w-40 items-center gap-1 text-xs text-(--text-muted)">
          <ArrowsLeftRightIcon size={12} aria-hidden="true" />
          <span className="truncate">
            {t('drag.swapWith', { name: swapWith })}
          </span>
        </span>
      )}
    </div>
  );
}
