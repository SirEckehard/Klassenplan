// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import type { ClassroomFeature, ClassroomTable } from '@/types';
import { portraitPlanTurn, turnPlanScene } from '@/utils/ui/portraitPlan';

const table = (overrides: Partial<ClassroomTable> = {}): ClassroomTable => ({
  x: 100,
  y: 50,
  width: 60,
  height: 130,
  rotation: 0,
  seatCount: 2,
  locked: false,
  zIndex: 0,
  templateType: 'double',
  ...overrides,
});

const wall = (
  anchor: ClassroomFeature['anchor'],
  box: Pick<ClassroomFeature, 'x' | 'y' | 'width' | 'height'>,
  type: ClassroomFeature['type'] = 'board',
): ClassroomFeature => ({
  id: `${type}-${anchor}`,
  type,
  anchor,
  movable: false,
  ...box,
});

const board = (anchor: ClassroomFeature['anchor']) =>
  wall(
    anchor,
    anchor === 'left' || anchor === 'right'
      ? { x: anchor === 'left' ? 0 : 880, y: 200, width: 20, height: 200 }
      : { x: 350, y: anchor === 'top' ? 0 : 580, width: 200, height: 20 },
  );

describe('portraitPlanTurn', () => {
  it('turns the board on a side wall to the bottom', () => {
    expect(portraitPlanTurn({ features: [board('right')] })).toBe(90);
    expect(portraitPlanTurn({ features: [board('left')] })).toBe(270);
  });

  it('leaves a room whose board is on the top or bottom wall as it is', () => {
    expect(portraitPlanTurn({ features: [board('top')] })).toBeNull();
    expect(portraitPlanTurn({ features: [board('bottom')] })).toBeNull();
  });

  it('turns a room without a board as the default room turns', () => {
    expect(portraitPlanTurn({ features: [] })).toBe(90);
  });
});

describe('turnPlanScene', () => {
  it('swaps the room and turns a table about the room, keeping its size', () => {
    const turned = turnPlanScene([table()], [], 270, 900, 600);

    expect(turned.width).toBe(600);
    expect(turned.height).toBe(900);
    // Centre (130, 115) goes to (115, 900 - 130 = 770).
    expect(turned.tables[0]).toMatchObject({
      x: 115 - 30,
      y: 770 - 65,
      width: 60,
      height: 130,
      rotation: 270,
    });
  });

  it('turns the other way for a board on the left', () => {
    const turned = turnPlanScene([table({ rotation: 45 })], [], 90, 900, 600);

    // Centre (130, 115) goes to (600 - 115 = 485, 130).
    expect(turned.tables[0]).toMatchObject({
      x: 485 - 30,
      y: 130 - 65,
      rotation: 135,
    });
  });

  it('brings the board from the right wall to the top, laid along it', () => {
    const turned = turnPlanScene([], [board('right')], 270, 900, 600);

    expect(turned.features[0]).toMatchObject({
      anchor: 'top',
      x: 200,
      y: 0,
      width: 200,
      height: 20,
    });
  });

  it('brings the board from the right wall to the bottom for the teacher', () => {
    const turned = turnPlanScene([], [board('right')], 90, 900, 600);

    expect(turned.features[0]).toMatchObject({
      anchor: 'bottom',
      x: 200,
      y: 880,
      width: 200,
      height: 20,
    });
  });

  it('moves every wall element to the wall the turn brings its own to', () => {
    const window = wall(
      'left',
      { x: 0, y: 90, width: 20, height: 150 },
      'window',
    );
    const door = wall(
      'bottom',
      { x: 700, y: 580, width: 80, height: 20 },
      'door',
    );
    const turned = turnPlanScene([], [window, door], 270, 900, 600);

    expect(turned.features[0]).toMatchObject({
      anchor: 'bottom',
      x: 90,
      y: 880,
      width: 150,
      height: 20,
    });
    expect(turned.features[1]).toMatchObject({
      anchor: 'right',
      x: 580,
      y: 120,
      width: 20,
      height: 80,
    });
  });

  it('turns a freely placed element about its centre', () => {
    const cabinet: ClassroomFeature = {
      id: 'cabinet',
      type: 'cabinet',
      anchor: 'free',
      movable: true,
      x: 400,
      y: 280,
      width: 100,
      height: 40,
      rotation: 0,
    };
    const turned = turnPlanScene([], [cabinet], 270, 900, 600);

    // Centre (450, 300) goes to (300, 450).
    expect(turned.features[0]).toMatchObject({
      x: 250,
      y: 430,
      width: 100,
      height: 40,
      rotation: 270,
    });
  });

  it('keeps every table in its place in the list, which is all a seat index knows', () => {
    const tables = [table({ x: 10 }), table({ x: 300 }), table({ x: 600 })];
    const turned = turnPlanScene(tables, [], 270, 900, 600);

    expect(turned.tables.map((entry) => entry.y)).toEqual([
      900 - 40 - 65,
      900 - 330 - 65,
      900 - 630 - 65,
    ]);
  });
});
