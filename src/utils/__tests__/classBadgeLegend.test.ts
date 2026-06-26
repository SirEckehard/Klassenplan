// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import type { Student } from '@/types';
import {
  getPresentBadgeLegend,
  getPresentGenderLegend,
} from '../ui/classBadgeLegend';

function makeStudent(overrides: Partial<Student>): Student {
  return {
    id: overrides.id ?? 'id',
    name: overrides.name ?? 'Test',
    restless: false,
    shy: false,
    concentrationIssues: false,
    needsFrontSeat: false,
    ...overrides,
  } as Student;
}

describe('classBadgeLegend', () => {
  it('lists only the gender swatches actually present, in a stable order', () => {
    const students = [
      makeStudent({ id: '1', gender: 'boy' }),
      makeStudent({ id: '2', gender: 'girl' }),
      makeStudent({ id: '3' }), // no gender → neutral
    ];
    const legend = getPresentGenderLegend(students);
    expect(legend.map((g) => g.key)).toEqual(['girl', 'boy', 'neutral']);
    // Each swatch carries light-mode colours.
    expect(legend.every((g) => g.fill && g.stroke)).toBe(true);
  });

  it('omits genders that no student uses', () => {
    const students = [makeStudent({ id: '1', gender: 'boy' })];
    const legend = getPresentGenderLegend(students);
    expect(legend.map((g) => g.key)).toEqual(['boy']);
  });

  it('deduplicates badges by key across the class', () => {
    const students = [
      makeStudent({ id: '1', restless: true }),
      makeStudent({ id: '2', restless: true, shy: true }),
    ];
    const badges = getPresentBadgeLegend(students, { showSpecialNeeds: true });
    const keys = badges.map((b) => b.key);
    // restless appears once despite two restless students; shy also present.
    expect(keys.filter((k) => k === 'restless')).toHaveLength(1);
    expect(keys).toContain('shy');
    expect(badges.every((b) => Boolean(b.label && b.color))).toBe(true);
    expect(badges.every((b) => b.icon != null)).toBe(true);
  });

  it('returns no badges when nothing is flagged', () => {
    const students = [makeStudent({ id: '1' })];
    expect(getPresentBadgeLegend(students, { showSpecialNeeds: true })).toEqual(
      [],
    );
  });
});
