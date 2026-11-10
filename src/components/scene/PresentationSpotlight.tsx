// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { ClassroomScene, SeatingArrangement } from '@/types';
import {
  calculateSeatLayout,
  calculateSeatPosition,
} from '@/utils/math/positionCalculations';
import { CLASSROOM_HEIGHT, CLASSROOM_WIDTH } from '@/utils';
import { dimPathWithHole } from '@/utils/ui/spotlightHole';

/**
 * How far the lit area reaches past the seat's own box, in scene units.
 *
 * The radii follow the seat instead of being a fixed number: a seat is 55×65,
 * so a constant radius large enough for a group table swallowed the neighbours
 * above and below and pointed at three students at once.
 */
export const SPOTLIGHT_MARGIN = 10;

/** How far the surrounding classroom is darkened (0 = untouched, 1 = black). */
export const DIM_STRENGTH = 0.55;

/**
 * The ink the dimming is mixed from — the interface's own, as in `--scrim`,
 * rather than a blue-black that reads as a tinted box on the neutral page.
 */
export const DIM_COLOR = '#17181a';

/**
 * How far the dimming reaches past the viewBox, in scene units. The SVG keeps
 * its aspect ratio, so a box that is wider or taller than the plan shows scene
 * space beyond the viewBox on two sides; stopping at the viewBox left those
 * bands undimmed and the plan sitting in a dark rectangle of its own.
 */
export const DIM_BLEED = 10000;

/** The ring round the drawn seat: amber, lit, never the interface's blue. */
export const SPOTLIGHT_RING_COLOR = '#f59e0b';

/**
 * The lit seat's own fill, the ring's amber made into a surface. Dimming the
 * rest alone left the seat as dark as it was — in the dark theme a grey seat
 * among grey seats — so the seat itself lights up, its name in bold.
 * Literal colours, as the ring's: the plan is drawn for the projection's
 * contrast mode and the export too, where the theme's tokens do not reach.
 */
export function spotlightSeatFill(isDark: boolean): string {
  return isDark ? '#5c4511' : '#fde7b0';
}

/**
 * How the projection places the classroom: turned by `rotation` degrees
 * about its centre and set in the middle of a box this size.
 */
export interface PresentationGroupFrame {
  rotation: number;
  boxWidth: number;
  boxHeight: number;
}

/** The classroom group's transform, for the scene and its spotlight alike. */
export function presentationGroupTransform({
  rotation,
  boxWidth,
  boxHeight,
}: PresentationGroupFrame): string {
  return (
    `translate(${boxWidth / 2} ${boxHeight / 2}) rotate(${rotation}) ` +
    `translate(${-CLASSROOM_WIDTH / 2} ${-CLASSROOM_HEIGHT / 2})`
  );
}

/** A point of the classroom where `presentationGroupTransform` puts it. */
function toFrame(
  point: { x: number; y: number },
  { rotation, boxWidth, boxHeight }: PresentationGroupFrame,
): { x: number; y: number } {
  const angle = (rotation * Math.PI) / 180;
  const x = point.x - CLASSROOM_WIDTH / 2;
  const y = point.y - CLASSROOM_HEIGHT / 2;
  return {
    x: x * Math.cos(angle) - y * Math.sin(angle) + boxWidth / 2,
    y: x * Math.sin(angle) + y * Math.cos(angle) + boxHeight / 2,
  };
}

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
  /** How the classroom group is placed, so the hole lines up with it. */
  frame: PresentationGroupFrame;
  /**
   * Whether the rest of the classroom is darkened. The projection does, for
   * the back row; a phone held close keeps every name readable and lets the
   * lit seat and its ring speak.
   */
  dim?: boolean;
}

/**
 * Darkens the projected classroom except for one seat.
 *
 * Implemented as an overlay layer rather than by threading a highlight flag
 * through `SceneTable`/`SeatGrid`: those render the editor, the export and the
 * presentation alike, and a projection-only effect has no business in them.
 *
 * The dimming covers the whole visible area with a hole left at the seat, so
 * the lit area really is a spotlight and not a coloured ring. The hole is an
 * ellipse around the seat's own box rather than a fixed circle — otherwise it
 * lights up the neighbours as well and the class cannot tell who was drawn.
 * It is one path with an even-odd fill, not a mask (`dimPathWithHole`).
 */
export default function PresentationSpotlight({
  scene,
  seating,
  target,
  viewBox,
  frame,
  dim = true,
}: PresentationSpotlightProps) {
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
    // Drawn where the projection shows the seat: the seat box turns with
    // its table and the classroom with the perspective, so the ellipse
    // turns by both.
    const { x, y } = toFrame(center, frame);
    return {
      cx: x,
      cy: y,
      rx: layout.seatWidth / 2 + SPOTLIGHT_MARGIN,
      ry: layout.seatHeight / 2 + SPOTLIGHT_MARGIN,
      rotation: (table.rotation ?? 0) + frame.rotation,
    };
  }, [scene.tables, seating, target, frame]);

  if (!seat) {
    return null;
  }

  const dimArea = {
    x: viewBox.x - DIM_BLEED,
    y: viewBox.y - DIM_BLEED,
    width: viewBox.width + DIM_BLEED * 2,
    height: viewBox.height + DIM_BLEED * 2,
  };

  return (
    <g pointerEvents="none" aria-hidden="true" data-spotlight="">
      {dim && (
        <path
          d={dimPathWithHole(dimArea, seat)}
          fillRule="evenodd"
          fill={DIM_COLOR}
          opacity={DIM_STRENGTH}
        />
      )}
      <ellipse
        cx={seat.cx}
        cy={seat.cy}
        rx={seat.rx}
        ry={seat.ry}
        transform={`rotate(${seat.rotation} ${seat.cx} ${seat.cy})`}
        fill="none"
        stroke={SPOTLIGHT_RING_COLOR}
        strokeWidth={4}
      />
    </g>
  );
}
