// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import type { Student } from '@/types';
import { getPresentBadgeLegend } from '../ui/classBadgeLegend';

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
