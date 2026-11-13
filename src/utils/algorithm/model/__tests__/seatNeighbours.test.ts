// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Decision 0043 as the mixing and the fulfilment see it: a student needing
 * the seat beside them free gets it while the room has seats to spare, a
 * left-hander gets a left side without a right-hander, and the fulfilment
 * counts both against what the room allows.
 */
import { describe, expect, it } from 'vitest';
import type {
  ClassroomFeature,
  ClassroomScene,
  MixSettings,
  SeatingArrangement,
  Student,
} from '@/types';
import { createRng } from '../../rng';
import arrangeTables from '../../autoArrange';
import { neutralSettings } from '../../../mixSettings';
import { runMixSession } from '../../seatingAlgorithm';
import { calculateSeatingStatistics } from '../../seatingStatistics';
import { getSeatLayout } from '../seatRelations';

const board: ClassroomFeature = {
  id: 'board',
  type: 'board',
  x: 880,
  y: 200,
  width: 20,
  height: 200,
  anchor: 'right',
  movable: false,
};

const roomOf = (tables: ClassroomScene['tables']): ClassroomScene => ({
  totalStudents: 0,
  tables,
  features: [board],
});

const classOf = (
  count: number,
  extra: (index: number) => Partial<Student> = () => ({}),
): Student[] =>
  Array.from(
    { length: count },
    (_, index) =>
      ({
        id: `s${index}`,
        name: `Student ${index}`,
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        ...extra(index),
      }) as Student,
  );

const settings = (extra: Partial<MixSettings>): MixSettings => ({
  ...neutralSettings,
  ...extra,
});

/** The occupant of every flat seat index, by student id. */
const occupantIds = (
  scene: ClassroomScene,
  seating: SeatingArrangement,
): (string | null)[] => {
  const layout = getSeatLayout(scene);
  return Array.from(
    { length: layout.size },
    (_, seat) =>
      seating[layout.tableOf[seat]!]?.[layout.seatOf[seat]!]?.id ?? null,
  );
};

describe('a free seat beside', () => {
  const scene = roomOf(arrangeTables('double', 8));
  const students = classOf(12, (index) =>
    index < 2 ? { needsFreeNeighbourSeat: true } : {},
  );
  const weights = settings({
    keepNeighbourSeatFree: 8,
    considerWishPartners: 0,
  });

  it.each([1, 2, 3, 4, 5])(
    'is kept for every student who needs it (seed %i)',
    (seed) => {
      const seating = runMixSession(students, [], {}, weights, scene, {
        rng: createRng(seed),
        refine: true,
      });
      const layout = getSeatLayout(scene);
      const occupants = occupantIds(scene, seating);
      for (const id of ['s0', 's1']) {
        const seat = occupants.indexOf(id);
        expect(seat).toBeGreaterThanOrEqual(0);
        const neighbours = layout.relations[seat]!.filter(
          (relation) => relation.kind === 0 || relation.kind === 4,
        );
        for (const { seat: other } of neighbours) {
          expect(occupants[other]).toBeNull();
        }
      }
      const cases = calculateSeatingStatistics(
        seating,
        students,
        weights,
        [],
        scene,
      ).criteria.keepNeighbourSeatFree!;
      expect(cases.total).toBe(2);
      expect(cases.full).toBe(2);
    },
  );

  it('counts no case where the room has no seat to spare', () => {
    const full = classOf(16, (index) =>
      index === 0 ? { needsFreeNeighbourSeat: true } : {},
    );
    const seating = runMixSession(full, [], {}, weights, scene, {
      rng: createRng(7),
      refine: true,
    });
    const cases = calculateSeatingStatistics(seating, full, weights, [], scene)
      .criteria.keepNeighbourSeatFree!;

    expect(cases.total).toBe(0);
  });

  it('counts a student at a desk of their own as free', () => {
    const singles = roomOf(arrangeTables('single', 6));
    const few = classOf(6, (index) =>
      index === 0 ? { needsFreeNeighbourSeat: true } : {},
    );
    const seating = runMixSession(few, [], {}, weights, singles, {
      rng: createRng(3),
      refine: true,
    });
    const cases = calculateSeatingStatistics(seating, few, weights, [], singles)
      .criteria.keepNeighbourSeatFree!;

    expect(cases.total).toBe(1);
    expect(cases.full).toBe(1);
  });
});

describe('left-handers', () => {
  const scene = roomOf(arrangeTables('double', 10));
  const students = classOf(20, (index) =>
    index % 4 === 0 ? { leftHanded: true } : {},
  );
  const lefties = students.filter((student) => student.leftHanded);
  const weights = settings({ seatLeftHandersLeft: 5 });

  it.each([1, 2, 3, 4, 5])(
    'sit with nobody writing right-handed to their left (seed %i)',
    (seed) => {
      const seating = runMixSession(students, [], {}, weights, scene, {
        rng: createRng(seed),
        refine: true,
      });
      const layout = getSeatLayout(scene);
      const occupants = occupantIds(scene, seating);
      const isLefty = new Set(lefties.map((student) => student.id));
      for (const student of lefties) {
        const seat = occupants.indexOf(student.id);
        const left = layout.leftOf[seat]!;
        const neighbour = left >= 0 ? occupants[left] : null;
        expect(neighbour === null || isLefty.has(neighbour)).toBe(true);
      }
      const cases = calculateSeatingStatistics(
        seating,
        students,
        weights,
        [],
        scene,
      ).criteria.seatLeftHandersLeft!;
      expect(cases.total).toBe(lefties.length);
      expect(cases.full).toBe(lefties.length);
    },
  );

  it('count a right-hander to the left against the plan', () => {
    const layout = getSeatLayout(scene);
    // Every desk holds a right-hander on the left, the left-hander beside.
    const seating: SeatingArrangement = scene.tables.map(() => [null, null]);
    const rightHanders = students.filter((student) => !student.leftHanded);
    lefties.forEach((lefty, index) => {
      const first = layout.offsets[index]!;
      const [own, left] =
        layout.leftOf[first] === first + 1
          ? [first, first + 1]
          : [first + 1, first];
      expect(layout.leftOf[own]).toBe(left);
      seating[index]![layout.seatOf[own]!] = lefty;
      seating[index]![layout.seatOf[left]!] = rightHanders[index]!;
    });
    const cases = calculateSeatingStatistics(
      seating,
      students,
      weights,
      [],
      scene,
    ).criteria.seatLeftHandersLeft!;

    expect(cases.total).toBe(lefties.length);
    expect(cases.full).toBe(0);
  });
});
