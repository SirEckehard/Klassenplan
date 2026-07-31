// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { ClassroomScene, SeatingArrangement } from '@/types';
import { calculateSeatPosition } from '@/utils/math/positionCalculations';

/** Radius of the lit circle around the highlighted seat, in scene units. */
const SPOTLIGHT_RADIUS = 78;

/** How far the surrounding classroom is darkened (0 = untouched, 1 = black). */
const DIM_STRENGTH = 0.55;

export interface SpotlightTarget {
  tableIndex: number;
  seatIndex: number;
}

interface PresentationSpotlightProps {
  scene: ClassroomScene;
  seating: SeatingArrangement;
  target: SpotlightTarget | null;
  /** Bounding box of the (possibly rotated) scene, in scene units. */
  boxWidth: number;
  boxHeight: number;
  /** Transform applied to the classroom group, so the hole lines up with it. */
  groupTransform: string;
}

/**
 * Darkens the projected classroom except for one seat.
 *
 * Implemented as an overlay layer rather than by threading a highlight flag
 * through `SceneTable`/`SeatGrid`: those render the editor, the export and the
 * presentation alike, and a projection-only effect has no business in them.
 *
 * The dim rect covers the whole viewBox and gets a mask with a hole punched at
 * the seat, so the lit area really is a spotlight and not a coloured ring.
 */
export default function PresentationSpotlight({
  scene,
  seating,
  target,
  boxWidth,
  boxHeight,
  groupTransform,
}: PresentationSpotlightProps) {
  const maskId = React.useId();

  const seatCenter = React.useMemo(() => {
    if (!target) return null;
    const table = scene.tables[target.tableIndex];
    if (!table) return null;
    // Guard against a seat that no longer exists (plan changed under us).
    if (!seating[target.tableIndex]?.[target.seatIndex]) return null;
    return calculateSeatPosition({
      mode: 'scene',
      table,
      seatIndex: target.seatIndex,
    });
  }, [scene.tables, seating, target]);

  if (!seatCenter) {
    return null;
  }

  return (
    <g pointerEvents="none" aria-hidden="true">
      <mask id={maskId}>
        {/* White keeps the dimming, black lets the classroom shine through. */}
        <rect x={0} y={0} width={boxWidth} height={boxHeight} fill="white" />
        <g transform={groupTransform}>
          <circle
            cx={seatCenter.x}
            cy={seatCenter.y}
            r={SPOTLIGHT_RADIUS}
            fill="black"
          />
        </g>
      </mask>
      <rect
        x={0}
        y={0}
        width={boxWidth}
        height={boxHeight}
        fill="#0f172a"
        opacity={DIM_STRENGTH}
        mask={`url(#${maskId})`}
      />
      <g transform={groupTransform}>
        <circle
          cx={seatCenter.x}
          cy={seatCenter.y}
          r={SPOTLIGHT_RADIUS}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={4}
        />
      </g>
    </g>
  );
}
