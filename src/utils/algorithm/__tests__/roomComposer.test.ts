// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import type { ClassroomScene, ClassroomTable } from '@/types';
import { DEFAULT_BOARD_FEATURE } from '@/utils';
import { createRng } from '@/utils/algorithm/rng';
import { composeRoom } from '../roomComposer';
import { roomProblems } from '../roomRules';

const WALLS = ['right', 'left', 'top', 'bottom'] as const;

const seatsOf = (tables: ClassroomTable[]) =>
  tables.reduce((sum, table) => sum + table.seatCount, 0);

describe('composeRoom', () => {
  it.each(WALLS)(
    'puts rooms together that keep every rule, towards a board on the %s wall',
    (wall) => {
      for (let students = 1; students <= 36; students++) {
        for (let seed = 1; seed <= 6; seed++) {
          const room = composeRoom(students, wall, {
            rng: createRng(seed * 101 + students),
          });
          if (!room) continue;
          const label = `${students} students, seed ${seed}`;
          expect(roomProblems(room.tables, { board: wall }), label).toEqual([]);
          expect(seatsOf(room.tables), label).toBeGreaterThanOrEqual(students);
          // At most a table of six to spare.
          expect(seatsOf(room.tables) - students, label).toBeLessThanOrEqual(5);
          expect(
            new Set(room.tables.map((table) => table.templateType)).size,
            label,
          ).toBeLessThanOrEqual(3);
          expect(room.zones.length, label).toBeGreaterThan(0);
        }
      }
    },
  );

  it('finds a room for an ordinary class every time', () => {
    for (let students = 12; students <= 32; students++) {
      for (let seed = 1; seed <= 10; seed++) {
        expect(
          composeRoom(students, 'right', { rng: createRng(seed) }),
          `${students} students, seed ${seed}`,
        ).not.toBeNull();
      }
    }
  });

  it('puts different rooms together roll by roll', () => {
    const combinations = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      combinations.add(
        composeRoom(24, 'right', { rng: createRng(seed) })!.zones.join('+'),
      );
    }
    expect(combinations.size).toBeGreaterThanOrEqual(12);
  });

  it('puts the same room together for the same seed', () => {
    const once = composeRoom(24, 'right', { rng: createRng(42) });
    const twice = composeRoom(24, 'right', { rng: createRng(42) });
    expect(twice).toEqual(once);
  });

  it('keeps the way to a door on a side wall free', () => {
    const scene: ClassroomScene = {
      tables: [],
      totalStudents: 24,
      features: [
        DEFAULT_BOARD_FEATURE,
        {
          id: 'door-side',
          type: 'door',
          x: 380,
          y: 0,
          width: 70,
          height: 20,
          anchor: 'top',
          movable: false,
          rotation: 0,
        },
      ],
    };
    for (let seed = 1; seed <= 20; seed++) {
      const room = composeRoom(24, scene, { rng: createRng(seed) });
      expect(room).not.toBeNull();
      expect(roomProblems(room!.tables, { features: scene.features })).toEqual(
        [],
      );
    }
  });
});
