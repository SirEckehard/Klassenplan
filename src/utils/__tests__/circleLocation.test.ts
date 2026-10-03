// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { findCircleLocation } from '@/utils';
import { createMockStudent } from '@/__tests__/utils';
import type { CircleLayout } from '@/types/Circle';

const circleOf = (names: string[]): CircleLayout =>
  ({
    students: names.map((name, index) => ({
      student: createMockStudent({ id: name, name }),
      position: index,
    })),
  }) as unknown as CircleLayout;

describe('findCircleLocation', () => {
  it('names the two who sit on either side', () => {
    const location = findCircleLocation(
      circleOf(['Ada', 'Ben', 'Cem', 'Dan']),
      'Ben',
    );

    expect(location?.position).toBe(2);
    expect(location?.neighbors.map((student) => student.name)).toEqual([
      'Ada',
      'Cem',
    ]);
  });

  // A circle has no ends: the first sits beside the last.
  it('wraps round from the first place to the last', () => {
    const location = findCircleLocation(circleOf(['Ada', 'Ben', 'Cem']), 'Ada');

    expect(location?.neighbors.map((student) => student.name)).toEqual([
      'Cem',
      'Ben',
    ]);
  });

  it('names one neighbour in a circle of two', () => {
    const location = findCircleLocation(circleOf(['Ada', 'Ben']), 'Ada');

    expect(location?.neighbors.map((student) => student.name)).toEqual(['Ben']);
  });

  it('knows nobody who is not in the circle', () => {
    expect(findCircleLocation(circleOf(['Ada']), 'Zoe')).toBeNull();
  });
});
