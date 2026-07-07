// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ClassroomFeature } from '@/types';
import { FEATURE_CORNER_RADIUS } from '@/utils';
import type { FeatureStyles } from '@/utils/ui';
import { FEATURE_TYPE_ICONS, FEATURE_TYPE_LABEL_KEYS } from '@/utils/ui';

/** Features thinner than this render as a plain colored rect without icon. */
const MIN_ICON_EDGE = 20;
/** Uniform glyph size so podium/cabinet icons match the thin wall elements. */
const ICON_SIZE = 16;
/** Selection stroke matching the table selection color. */
const ACTIVE_STROKE = '#3b82f6';

type FeatureShapeProps = {
  feature: ClassroomFeature;
  /** Resolved palette from `getFeatureStyles` (fill/stroke + icon color). */
  styles: FeatureStyles;
  /**
   * Rotation applied by an outer scene transform (presentation rotation,
   * portrait export). The icon counter-rotates by the feature's own rotation
   * plus this value so it stays upright on the final page/screen.
   */
  extraIconRotation?: number;
  /** Editor selection: switches the always-on frame to the selection color. */
  isActive?: boolean;
  /** Extra props for the rect, e.g. pointer handlers in the editor. */
  rectProps?: React.SVGProps<SVGRectElement>;
  /**
   * Extra props for the outer group, e.g. hover tracking in the editor
   * (covers the rect and the rotate handle, so the hover state doesn't
   * flicker when the pointer moves onto the handle).
   */
  groupProps?: React.SVGProps<SVGGElement>;
  /**
   * Rendered inside the rotated feature frame (local coordinates), e.g. the
   * editor's rotate handle. Must stay inside the frame so handle anchor math
   * keeps working.
   */
  children?: React.ReactNode;
};

/**
 * Shared visual for classroom features (window, door, board, podium, …):
 * a rounded rect with a centered, always-upright icon instead of a text
 * label. Used by the layout editor, the seating plan canvas, the
 * presentation view and the PDF export (icons are plain nested SVG, so they
 * survive `renderToStaticMarkup` + rasterization).
 */
export default function FeatureShape({
  feature,
  styles,
  extraIconRotation = 0,
  isActive = false,
  rectProps,
  groupProps,
  children,
}: FeatureShapeProps) {
  const { t } = useTranslation('generator');

  const { width, height } = feature;
  const rotation = feature.anchor === 'free' ? (feature.rotation ?? 0) : 0;
  const transform =
    `translate(${feature.x + width / 2} ${feature.y + height / 2}) ` +
    `rotate(${rotation}) translate(${-width / 2} ${-height / 2})`;

  const name = t(FEATURE_TYPE_LABEL_KEYS[feature.type], feature.label ?? '');
  const IconGlyph = FEATURE_TYPE_ICONS[feature.type];
  const minEdge = Math.min(width, height);
  const iconSize = ICON_SIZE;
  const iconRotation = ((-(rotation + extraIconRotation) % 360) + 360) % 360;

  return (
    <g
      data-feature-id={feature.id}
      transform={transform}
      role="img"
      aria-label={name}
      {...groupProps}
    >
      <title>{name}</title>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={FEATURE_CORNER_RADIUS}
        fill={styles.fill}
        stroke={isActive ? ACTIVE_STROKE : styles.stroke}
        strokeWidth={isActive ? 2.4 : 1.5}
        {...rectProps}
      />
      {minEdge >= MIN_ICON_EDGE && (
        <g
          pointerEvents="none"
          transform={
            iconRotation !== 0
              ? `rotate(${iconRotation} ${width / 2} ${height / 2})`
              : undefined
          }
        >
          <IconGlyph
            x={width / 2 - iconSize / 2}
            y={height / 2 - iconSize / 2}
            size={iconSize}
            color={styles.text}
            aria-hidden="true"
          />
        </g>
      )}
      {children}
    </g>
  );
}
