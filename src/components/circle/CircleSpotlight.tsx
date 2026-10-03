// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import {
  DIM_BLEED,
  DIM_COLOR,
  DIM_STRENGTH,
  SPOTLIGHT_MARGIN,
  SPOTLIGHT_RING_COLOR,
} from '@/components/scene/PresentationSpotlight';

/**
 * Darkens the projected circle except for one place — the circle's
 * counterpart of `PresentationSpotlight`, with the same ink, strength and
 * ring, so "Wer kommt dran?" reads alike on the tables and in the circle.
 * The hole is a circle round the token rather than the seat's box.
 */
export default function CircleSpotlight({
  cx,
  cy,
  tokenRadius,
  viewBox,
}: {
  cx: number;
  cy: number;
  tokenRadius: number;
  /** Visible area, in the circle's own units — the SVG's viewBox. */
  viewBox: { x: number; y: number; width: number; height: number };
}) {
  const maskId = React.useId();
  const radius = tokenRadius + SPOTLIGHT_MARGIN;
  const dimArea = {
    x: viewBox.x - DIM_BLEED,
    y: viewBox.y - DIM_BLEED,
    width: viewBox.width + DIM_BLEED * 2,
    height: viewBox.height + DIM_BLEED * 2,
  };

  return (
    <g pointerEvents="none" aria-hidden="true" data-circle-spotlight="">
      <mask id={maskId}>
        {/* White keeps the dimming, black lets the circle shine through. */}
        <rect {...dimArea} fill="white" />
        <circle cx={cx} cy={cy} r={radius} fill="black" />
      </mask>
      <rect
        {...dimArea}
        fill={DIM_COLOR}
        opacity={DIM_STRENGTH}
        mask={`url(#${maskId})`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={SPOTLIGHT_RING_COLOR}
        strokeWidth={4}
      />
    </g>
  );
}
