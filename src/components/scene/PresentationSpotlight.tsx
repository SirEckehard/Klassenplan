// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { ClassroomScene, SeatingArrangement } from '@/types';
import {
  calculateSeatLayout,
  calculateSeatPosition,
} from '@/utils/math/positionCalculations';

/**
 * How far the lit area reaches past the seat's own box, in scene units.
 *
 * The radii follow the seat instead of being a fixed number: a seat is 55×65,
 * so a constant radius large enough for a group table swallowed the neighbours
 * above and below and pointed at three students at once.
 */
const SPOTLIGHT_MARGIN = 10;

/** How far the surrounding classroom is darkened (0 = untouched, 1 = black). */
const DIM_STRENGTH = 0.55;

/**
 * The ink the dimming is mixed from — the interface's own, as in `--scrim`,
 * rather than a blue-black that reads as a tinted box on the neutral page.
 */
const DIM_COLOR = '#17181a';

/**
 * How far the dimming reaches past the viewBox, in scene units. The SVG keeps
 * its aspect ratio, so a box that is wider or taller than the plan shows scene
 * space beyond the viewBox on two sides; stopping at the viewBox left those
 * bands undimmed and the plan sitting in a dark rectangle of its own.
 */
const DIM_BLEED = 10000;

export interface SpotlightTarget {
  tableIndex: number;
  seatIndex: number;
}

interface PresentationSpotlightProps {
  scene: ClassroomScene;
  seating: SeatingArrangement;
  target: SpotlightTarget | null;
  /** Visible area of the scene, in scene units — the SVG's own viewBox. */
  viewBox: { x: number; y: number; width: number; height: number };
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
 * The dim rect covers the whole visible area and gets a mask with a hole
 * punched at the seat, so the lit area really is a spotlight and not a coloured
 * ring. The hole is an ellipse around the seat's own box rather than a fixed
 * circle — otherwise it lights up the neighbours as well and the class cannot
 * tell who was drawn.
 */
export default function PresentationSpotlight({
  scene,
  seating,
  target,
  viewBox,
  groupTransform,
}: PresentationSpotlightProps) {
  const maskId = React.useId();

  const seat = React.useMemo(() => {
    if (!target) return null;
    const table = scene.tables[target.tableIndex];
    if (!table) return null;
    // Guard against a seat that no longer exists (plan changed under us).
    if (!seating[target.tableIndex]?.[target.seatIndex]) return null;
    const layout = calculateSeatLayout(table);
    const center = calculateSeatPosition({
      mode: 'scene',
      table,
      seatIndex: target.seatIndex,
      layout,
    });
    return {
      center,
      radiusX: layout.seatWidth / 2 + SPOTLIGHT_MARGIN,
      radiusY: layout.seatHeight / 2 + SPOTLIGHT_MARGIN,
      // The seat box turns with its table, so the lit ellipse has to as well.
      rotation: table.rotation ?? 0,
    };
  }, [scene.tables, seating, target]);

  if (!seat) {
    return null;
  }

  const seatTransform = `rotate(${seat.rotation} ${seat.center.x} ${seat.center.y})`;
  const dimArea = {
    x: viewBox.x - DIM_BLEED,
    y: viewBox.y - DIM_BLEED,
    width: viewBox.width + DIM_BLEED * 2,
    height: viewBox.height + DIM_BLEED * 2,
  };

  return (
    <g pointerEvents="none" aria-hidden="true">
      <mask id={maskId}>
        {/* White keeps the dimming, black lets the classroom shine through. */}
        <rect {...dimArea} fill="white" />
        <g transform={groupTransform}>
          <ellipse
            cx={seat.center.x}
            cy={seat.center.y}
            rx={seat.radiusX}
            ry={seat.radiusY}
            transform={seatTransform}
            fill="black"
          />
        </g>
      </mask>
      <rect
        {...dimArea}
        fill={DIM_COLOR}
        opacity={DIM_STRENGTH}
        mask={`url(#${maskId})`}
      />
      <g transform={groupTransform}>
        <ellipse
          cx={seat.center.x}
          cy={seat.center.y}
          rx={seat.radiusX}
          ry={seat.radiusY}
          transform={seatTransform}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={4}
        />
      </g>
    </g>
  );
}
