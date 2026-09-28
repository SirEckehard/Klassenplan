// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * "Zufällig mischen" in the circle: a random order of the free places, every
 * order as likely as any other, locked students where they were.
 */
import { describe, expect, it } from 'vitest';
import { createMockStudent } from '@/__tests__/utils';
import { createRng } from '@/utils/algorithm/rng';
import type { CircleLayout } from '@/types/Circle';
import {
  batchSwapCircleStudents,
  circleShuffleSwaps,
} from '../circleLayoutService';

const circle = (ids: string[], lockedStudentIds?: string[]): CircleLayout => ({
  students: ids.map((id, index) => ({
    student: createMockStudent({ id, name: id.toUpperCase() }),
    angle: index * 45,
    x: index * 10,
    y: index * 20,
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
  timestamp: 0,
  neighborhoodPairs: [],
  lockedStudentIds,
});

const order = (layout: CircleLayout) =>
  layout.students.map((position) => position.student.id);

const shuffled = (layout: CircleLayout, rng: () => number) =>
  batchSwapCircleStudents(layout, circleShuffleSwaps(layout, rng));

describe('circleShuffleSwaps', () => {
  it('produces one fixed order for one seed', () => {
    const layout = circle(['a', 'b', 'c', 'd', 'e', 'f']);

    const first = order(shuffled(layout, createRng(7)));
    const again = order(shuffled(layout, createRng(7)));

    expect(first).toEqual(again);
    expect([...first].sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('leaves locked students on their places', () => {
    const layout = circle(['a', 'b', 'c', 'd', 'e'], ['b', 'e']);

    for (let seed = 1; seed <= 20; seed += 1) {
      const result = order(shuffled(layout, createRng(seed)));
      expect(result[1]).toBe('b');
      expect(result[4]).toBe('e');
    }
  });

  it('has nothing to do with fewer than two free places', () => {
    expect(circleShuffleSwaps(circle(['a']))).toEqual([]);
    expect(circleShuffleSwaps(circle(['a', 'b'], ['a']))).toEqual([]);
  });

  it('makes every order of three equally likely', () => {
    // 6 orders, 6000 draws: each should come up about 1000 times. The old
    // loop of random swaps favoured the orders it started from.
    const layout = circle(['a', 'b', 'c']);
    const rng = createRng(42);
    const counts = new Map<string, number>();
    for (let draw = 0; draw < 6000; draw += 1) {
      const key = order(shuffled(layout, rng)).join('');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    expect(counts.size).toBe(6);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(850);
      expect(count).toBeLessThan(1150);
    }
  });
});
