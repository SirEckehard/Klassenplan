// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Decision 0036 as properties: a lock follows its table by id. While the table
 * is gone the lock rests and binds nothing; when the table comes back — an
 * undo, in any order of the list — the lock binds its seat again.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { LockedPositions } from '@/types';
import { anchorLocks, RESTING_LOCK_TABLE } from '@/utils/data/tableIds';
import {
  locksArb,
  sceneArb,
  seatingArb,
  studentsArb,
} from '@/__tests__/utils/arbitraries';

const RUNS = { numRuns: 200 };

/** A room, its locks, and which of its tables are taken away in what order. */
const roomArb = fc
  .tuple(studentsArb({ minLength: 1 }), sceneArb())
  .chain(([students, scene]) =>
    seatingArb(students, scene).chain((seating) =>
      fc.record({
        scene: fc.constant(scene),
        locks: locksArb(seating, scene),
        kept: fc.shuffledSubarray(scene.tables),
      }),
    ),
  );

describe('locks follow their table', () => {
  it('rest while their table is gone and find the others where they went', () => {
    fc.assert(
      fc.property(roomArb, ({ scene, locks, kept }) => {
        const anchored = anchorLocks(locks, kept);
        for (const [studentId, lock] of Object.entries(locks)) {
          const index = kept.findIndex((table) => table.id === lock.tableId);
          expect(anchored[studentId]!.table).toBe(
            index === -1 ? RESTING_LOCK_TABLE : index,
          );
          expect(anchored[studentId]!.seat).toBe(lock.seat);
        }
        expect(Object.keys(anchored)).toEqual(Object.keys(locks));
        expect(scene.tables.length).toBeGreaterThanOrEqual(kept.length);
      }),
      RUNS,
    );
  });

  it('bind their seats again when the room comes back', () => {
    fc.assert(
      fc.property(roomArb, ({ scene, locks, kept }) => {
        const back = anchorLocks(anchorLocks(locks, kept), scene.tables);
        expect(back).toEqual(locks);
      }),
      RUNS,
    );
  });

  it('change nothing when every table stands where the lock says', () => {
    fc.assert(
      fc.property(roomArb, ({ scene, locks }) => {
        expect(anchorLocks(locks, scene.tables)).toBe(locks);
      }),
      RUNS,
    );
  });

  it('take the id of the table at their index when they have none', () => {
    fc.assert(
      fc.property(roomArb, ({ scene, locks }) => {
        const bare: LockedPositions = Object.fromEntries(
          Object.entries(locks).map(([id, { table, seat }]) => [
            id,
            { table, seat },
          ]),
        );
        expect(anchorLocks(bare, scene.tables)).toEqual(locks);
      }),
      RUNS,
    );
  });
});
