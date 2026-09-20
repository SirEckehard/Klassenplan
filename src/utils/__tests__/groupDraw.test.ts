// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { buildGroups, planGroupSizes } from '@/utils';
import { createRng } from '@/utils/algorithm/rng';
import { createMockStudent } from '@/__tests__/utils';

const classOf = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    createMockStudent({ id: `s${index + 1}`, name: `Kind ${index + 1}` }),
  );

describe('planGroupSizes', () => {
  it('spreads the remainder instead of leaving a group of one', () => {
    expect(planGroupSizes(24, 4)).toEqual([4, 4, 4, 4, 4, 4]);
    // 25 in fours: six groups, the first one takes the extra student.
    expect(planGroupSizes(25, 4)).toEqual([5, 4, 4, 4, 4, 4]);
    expect(planGroupSizes(22, 5)).toEqual([5, 5, 6, 6].sort((a, b) => b - a));
    expect(planGroupSizes(0, 4)).toEqual([]);
  });

  it('keeps everyone in a group', () => {
    for (const total of [3, 7, 13, 24, 31]) {
      for (const size of [2, 3, 4, 5, 6]) {
        const sizes = planGroupSizes(total, size);
        expect(sizes.reduce((sum, value) => sum + value, 0)).toBe(total);
      }
    }
  });
});

describe('buildGroups', () => {
  it('seats every named student exactly once', () => {
    const students = classOf(23);

    const { groups } = buildGroups(students, { size: 4, rng: createRng(7) });

    const drawn = groups.flat().map((student) => student.id);
    expect(drawn).toHaveLength(23);
    expect(new Set(drawn).size).toBe(23);
  });

  it('draws the same groups from the same seed', () => {
    const students = classOf(12);

    const first = buildGroups(students, { size: 3, rng: createRng(42) });
    const second = buildGroups(students, { size: 3, rng: createRng(42) });

    expect(first.groups.map((group) => group.map((s) => s.id))).toEqual(
      second.groups.map((group) => group.map((s) => s.id)),
    );
  });

  it('keeps a distance wish apart while a group has room', () => {
    const students = classOf(8);
    students[0] = { ...students[0], avoidPartnerId: students[1].id };

    for (let seed = 1; seed <= 20; seed += 1) {
      const { groups, conflicts } = buildGroups(students, {
        size: 4,
        rng: createRng(seed),
      });
      const together = groups.some(
        (group) =>
          group.some((student) => student.id === 's1') &&
          group.some((student) => student.id === 's2'),
      );
      expect(together).toBe(false);
      expect(conflicts).toEqual([]);
    }
  });

  it('says so when the sizes cannot honour a distance wish', () => {
    // Three students who all avoid each other, in one group of three.
    const students = classOf(3).map((student, index, all) => ({
      ...student,
      avoidPartnerIds: all
        .filter((other) => other.id !== student.id)
        .map((other) => other.id),
    }));

    const { groups, conflicts } = buildGroups(students, {
      size: 3,
      rng: createRng(1),
    });

    expect(groups).toHaveLength(1);
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it('leaves out students without a name', () => {
    const students = [
      ...classOf(3),
      createMockStudent({ id: 'blank', name: '  ' }),
    ];

    const { groups } = buildGroups(students, { size: 2, rng: createRng(3) });

    expect(groups.flat().map((student) => student.id)).not.toContain('blank');
  });
});
