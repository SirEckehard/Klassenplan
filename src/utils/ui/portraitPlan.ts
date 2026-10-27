// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The table plan turned a quarter for a screen held upright.
 *
 * The room is 900 × 600 and a phone or a tablet in portrait is about twice as
 * tall as wide, so the plan took a third of the stage and left the rest
 * empty. Turned so the board stands at the bottom — the room as the teacher
 * sees it from the front, as the projection's teacher view and the exported
 * sheet in portrait show it — it takes 1.5 times the width
 * and most of the height. Only what is drawn turns: the plan layer writes no
 * geometry, so the view renders a turned copy of the tables and the room
 * elements, and saving, the criteria and the highlights keep the room as it
 * is stored. The seats keep their order, which is all the seating knows of
 * them; names stand upright on their own, since a seat's label is laid out
 * against its table's rotation, and the drag, the arrow keys and the badges'
 * tooltips read the seats where they are on screen.
 */
import type {
  ClassroomFeature,
  ClassroomFeatureAnchor,
  ClassroomScene,
  ClassroomTable,
} from '@/types';
import { getBoardEdge } from '@/utils/ui/boardOrientation';

import type { PlanTurn } from '@/utils/canvas/turn';

export type { PlanTurn };

/**
 * How wide a turned plan or room may be: half again as tall as wide, it is
 * held to what fits between the header and the status bar, so a tablet shows
 * it whole without scrolling.
 */
export const TURNED_FRAME_MAX_WIDTH =
  'min(100%, calc((100dvh - 3.5rem - var(--shell-bottom-inset, 3.5rem) - 2.5rem) * 2 / 3))';

/**
 * The quarter turn that brings the board to the bottom, or null where none
 * helps: a board on the top or bottom wall already gives the front an edge of
 * the screen's width, and a quarter turn would put it at a side. A room
 * without a board turns as the default room does, whose board is on the
 * right.
 */
export function portraitPlanTurn(
  scene: Pick<ClassroomScene, 'features'>,
): PlanTurn | null {
  const hasBoard = (scene.features ?? []).some((f) => f.type === 'board');
  if (!hasBoard) return 90;
  const edge = getBoardEdge(scene as ClassroomScene);
  if (edge === 'right') return 90;
  if (edge === 'left') return 270;
  return null;
}

/** Where a wall goes under each turn. */
const TURNED_ANCHOR: Record<
  PlanTurn,
  Record<Exclude<ClassroomFeatureAnchor, 'free'>, ClassroomFeatureAnchor>
> = {
  // Counter-clockwise on screen: the right wall comes to the top.
  270: { right: 'top', top: 'left', left: 'bottom', bottom: 'right' },
  // Clockwise on screen: the left wall comes to the top.
  90: { left: 'top', top: 'right', right: 'bottom', bottom: 'left' },
};

const normalise = (degrees: number) => ((degrees % 360) + 360) % 360;

/**
 * The tables and the room elements turned about the room, in a room of the
 * swapped size. A table or a freely placed element keeps its own size and
 * turns about its centre; a wall element moves to the wall the turn brings
 * its own to, laid along that wall as wall elements are stored.
 */
export function turnPlanScene(
  tables: readonly ClassroomTable[],
  features: readonly ClassroomFeature[],
  turn: PlanTurn,
  width: number,
  height: number,
): {
  tables: ClassroomTable[];
  features: ClassroomFeature[];
  width: number;
  height: number;
} {
  const turnPoint = (x: number, y: number) =>
    turn === 270 ? { x: y, y: width - x } : { x: height - y, y: x };

  const turnAboutCentre = <T extends ClassroomTable | ClassroomFeature>(
    item: T,
  ): T => {
    const centre = turnPoint(item.x + item.width / 2, item.y + item.height / 2);
    return {
      ...item,
      x: centre.x - item.width / 2,
      y: centre.y - item.height / 2,
      rotation: normalise((item.rotation ?? 0) + turn),
    };
  };

  return {
    tables: tables.map(turnAboutCentre),
    features: features.map((feature) => {
      if (feature.anchor === 'free') return turnAboutCentre(feature);
      return {
        ...feature,
        anchor: TURNED_ANCHOR[turn][feature.anchor],
        x: turn === 270 ? feature.y : height - feature.y - feature.height,
        y: turn === 270 ? width - feature.x - feature.width : feature.x,
        width: feature.height,
        height: feature.width,
      };
    }),
    width: height,
    height: width,
  };
}
