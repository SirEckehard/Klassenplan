// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import {
  readSvgTurn,
  turnPoint,
  turnTransform,
  unturnDirection,
  unturnPoint,
  type PlanTurn,
} from '@/utils/canvas/turn';
import {
  convertClientPointToScene,
  convertScenePointToClient,
} from '@/utils/canvas/coordinates';
import { turnPlanScene } from '@/utils/ui/portraitPlan';

const W = 900;
const H = 600;

/** Applies an SVG `translate(a b) rotate(r)` the way a browser does. */
const applyTransform = (transform: string, x: number, y: number) => {
  const [, tx, ty, r] = /translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)/
    .exec(transform)!
    .map(Number);
  const rad = (r * Math.PI) / 180;
  return {
    x: Math.round(x * Math.cos(rad) - y * Math.sin(rad) + tx),
    y: Math.round(x * Math.sin(rad) + y * Math.cos(rad) + ty),
  };
};

describe('turn', () => {
  it.each<PlanTurn>([90, 270])(
    'draws a point where its SVG transform puts it and turns it back (%i°)',
    (turn) => {
      const point = { x: 130, y: 470 };
      const shown = turnPoint(turn, point, W, H);

      expect(
        applyTransform(turnTransform(turn, W, H), point.x, point.y),
      ).toEqual(shown);
      expect(unturnPoint(turn, shown, W, H)).toEqual(point);
    },
  );

  it('agrees with the plan, which draws a turned copy', () => {
    const table = {
      x: 100,
      y: 50,
      width: 60,
      height: 130,
      rotation: 0,
      seatCount: 2,
      locked: false,
      zIndex: 0,
    };
    const [turned] = turnPlanScene([table], [], 90, W, H).tables;
    const centre = turnPoint(90, { x: 130, y: 115 }, W, H);

    expect(turned.x + turned.width / 2).toBe(centre.x);
    expect(turned.y + turned.height / 2).toBe(centre.y);
  });

  it('turns an arrow key back into the stored room', () => {
    expect(unturnDirection(null, 'up')).toBe('up');
    expect(unturnDirection(90, 'up')).toBe('left');
    expect(unturnDirection(90, 'right')).toBe('up');
    expect(unturnDirection(270, 'up')).toBe('right');
    expect(unturnDirection(270, 'left')).toBe('up');
  });

  describe('pointers on a turned drawing', () => {
    // A 300 × 450 drawing at (10, 20): the 600 × 900 turned room at half size.
    const svg = (turn: PlanTurn | null) => {
      const node = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      );
      if (turn !== null) node.setAttribute('data-turn', String(turn));
      node.getBoundingClientRect = () =>
        ({
          left: 10,
          top: 20,
          width: turn === null ? 450 : 300,
          height: turn === null ? 300 : 450,
        }) as DOMRect;
      return node;
    };

    it('reads the turn the drawing carries', () => {
      expect(readSvgTurn(svg(90))).toBe(90);
      expect(readSvgTurn(svg(null))).toBeNull();
    });

    it('turns a pointer back into the stored room, and a point of it onto the screen', () => {
      const node = svg(90);
      // Turned clockwise, the right wall lies along the bottom: the drawing's
      // bottom left corner is the stored room's bottom right one.
      const scene = convertClientPointToScene({
        svg: node,
        clientX: 10,
        clientY: 20 + 450,
        sceneWidth: W,
        sceneHeight: H,
      });
      expect(scene.x).toBeCloseTo(900);
      expect(scene.y).toBeCloseTo(600);

      const client = convertScenePointToClient({
        svg: node,
        point: { x: 300, y: 200 },
        sceneWidth: W,
        sceneHeight: H,
      });
      const back = convertClientPointToScene({
        svg: node,
        clientX: client.x,
        clientY: client.y,
        sceneWidth: W,
        sceneHeight: H,
      });
      expect(back.x).toBeCloseTo(300);
      expect(back.y).toBeCloseTo(200);
    });

    it('leaves a drawing that is not turned as it was', () => {
      expect(
        convertClientPointToScene({
          svg: svg(null),
          clientX: 10 + 225,
          clientY: 20 + 150,
          sceneWidth: W,
          sceneHeight: H,
        }),
      ).toEqual({ x: 450, y: 300 });
    });
  });
});
