// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Storage keeps who sits where by id, the app gets the students (decision
 * 0035): a plan, a mix, a parked room and a circle copied every student, and
 * kept the class as it was rather than as it is.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));
vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);

import { IndexedDBRepository } from '../IndexedDBRepository';
import type { Result } from '../types';
import type {
  ClassCollectionState,
  ClassRecord,
  SeatingArrangement,
  Student,
} from '@/types';
import type { CircleLayout } from '@/types/Circle';
import { createMockClassroomScene, createMockStudent } from '@/__tests__/utils';
import { DB_KEYS } from '@/utils/data/storageKeys';

const expectData = <T>(result: Result<T>): T => {
  expect(result.success).toBe(true);
  if (!result.success) throw new Error(result.error.message);
  return result.data;
};

const stored = () =>
  memory.get(`default::${DB_KEYS.classCollection}`) as ClassCollectionState;
const storedClass = () => stored().classes[0] as unknown as ClassRecord;

const circleOf = (students: Student[]): CircleLayout => ({
  students: students.map((student, index) => ({
    student,
    angle: index * 90,
    x: 100 + index,
    y: 100,
    preservedNeighbors: [],
    lostNeighbors: [],
    newNeighbors: [],
  })),
  radius: { horizontal: 200, vertical: 150 },
  center: { x: 450, y: 300 },
  preservedNeighborhoods: 0,
  totalOriginalNeighborhoods: 0,
  newNeighborhoods: 0,
  preservationRate: 0,
  mode: 'preserve-neighbors',
  timestamp: 1,
  neighborhoodPairs: [],
});

describe('seats in storage', () => {
  const anna = createMockStudent({ id: 'anna', name: 'Anna' });
  const ben = createMockStudent({ id: 'ben', name: 'Ben' });
  const seating: SeatingArrangement = [[anna, ben]];

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const classWithAPlan = async () => {
    const repository = new IndexedDBRepository();
    expectData(
      await repository.createClass(
        { name: '7a', students: [anna, ben] },
        { activate: true },
      ),
    );
    expectData(
      await repository.saveActiveClassSnapshot({
        currentSeating: seating,
        circleLayout: circleOf([anna, ben]),
        classroomScene: createMockClassroomScene(1),
        seatingHistory: [
          {
            id: 'plan-1',
            name: 'Deutsch',
            date: '2026-11-01',
            seating,
            scene: createMockClassroomScene(1),
            circleLayout: circleOf([ben, anna]),
          },
        ],
        mixHistory: [
          {
            id: 1,
            timestamp: '2026-11-01T08:00:00.000Z',
            seating,
            mixSettings: {} as never,
          },
        ],
      }),
    );
    return repository;
  };

  it('stores every seat and every place of a circle as an id', async () => {
    await classWithAPlan();

    const record = storedClass();
    expect(record.currentSeating).toEqual([['anna', 'ben']]);
    expect(record.seatingHistory[0].seating).toEqual([['anna', 'ben']]);
    expect(record.mixHistory[0].seating).toEqual([['anna', 'ben']]);
    expect(
      (record.circleLayout?.students as unknown as { studentId: string }[]).map(
        (place) => place.studentId,
      ),
    ).toEqual(['anna', 'ben']);
    expect(record.circleLayout?.students[0]).not.toHaveProperty('student');
    expect(
      (
        record.seatingHistory[0].circleLayout?.students as unknown as {
          studentId: string;
        }[]
      ).map((place) => place.studentId),
    ).toEqual(['ben', 'anna']);
    // The class list itself stays whole.
    expect(record.students.map((student) => student.name)).toEqual([
      'Anna',
      'Ben',
    ]);
  });

  it('reads the students back onto the seats, as they are now', async () => {
    const repository = await classWithAPlan();
    // Ben is renamed; the plan names him as he is called now.
    expectData(
      await repository.saveActiveClassSnapshot({
        students: [anna, { ...ben, name: 'Benjamin' }],
      }),
    );

    const snapshot = expectData(
      await new IndexedDBRepository().loadActiveClassSnapshot(),
    );
    expect(snapshot.currentSeating![0].map((seat) => seat?.name)).toEqual([
      'Anna',
      'Benjamin',
    ]);
    expect(
      snapshot.seatingHistory![0].seating[0].map((seat) => seat?.name),
    ).toEqual(['Anna', 'Benjamin']);
    expect(
      snapshot.circleLayout?.students.map((place) => place.student.name),
    ).toEqual(['Anna', 'Benjamin']);
  });

  it('leaves the seat of a student deleted since empty', async () => {
    const repository = await classWithAPlan();
    expectData(await repository.saveActiveClassSnapshot({ students: [anna] }));

    const snapshot = expectData(
      await new IndexedDBRepository().loadActiveClassSnapshot(),
    );
    expect(snapshot.seatingHistory![0].seating).toEqual([[anna, null]]);
    expect(snapshot.mixHistory![0].seating).toEqual([[anna, null]]);
    expect(
      snapshot.circleLayout?.students.map((place) => place.student.id),
    ).toEqual(['anna']);
  });

  it('reads data from before, with whole students on the seats', async () => {
    const repository = await classWithAPlan();
    // As a build before decision 0035 wrote it.
    const record = storedClass();
    record.currentSeating = [[anna, ben]];
    record.seatingHistory[0].seating = [[ben, anna]];

    const snapshot = expectData(
      await new IndexedDBRepository().loadActiveClassSnapshot(),
    );
    expect(snapshot.currentSeating).toEqual([[anna, ben]]);
    expect(snapshot.seatingHistory![0].seating).toEqual([[ben, anna]]);

    // The next write stores it by id.
    expectData(
      await repository.saveActiveClassSnapshot({ lockedPositions: {} }),
    );
    expect(storedClass().seatingHistory[0].seating).toEqual([['ben', 'anna']]);
  });
});
