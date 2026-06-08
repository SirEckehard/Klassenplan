import { describe, it, expect } from 'vitest';
import { buildPreviousPairs } from '../pairs';
import type { SavedPlan, Student } from '../../types';

const alice: Student = {
  id: '1',
  name: 'Alice',
  gender: 'girl',
  restless: false,
  shy: false,
  concentrationIssues: false,
  needsFrontSeat: false,
};
const bob: Student = {
  id: '2',
  name: 'Bob',
  gender: 'boy',
  restless: false,
  shy: false,
  concentrationIssues: false,
  needsFrontSeat: false,
};
const carol: Student = {
  id: '3',
  name: 'Carol',
  gender: 'girl',
  restless: false,
  shy: false,
  concentrationIssues: false,
  needsFrontSeat: false,
};
const dave: Student = {
  id: '4',
  name: 'Dave',
  gender: 'boy',
  restless: false,
  shy: false,
  concentrationIssues: false,
  needsFrontSeat: false,
};

describe('buildPreviousPairs', () => {
  it('gibt eine leere Map zurück, wenn keine Historie vorhanden ist', () => {
    expect(buildPreviousPairs([]).size).toBe(0);
    expect(buildPreviousPairs(undefined).size).toBe(0);
  });

  it('erfasst Paare eindeutig über mehrere Pläne', () => {
    const history: SavedPlan[] = [
      {
        id: '1',
        name: 'Plan1',
        date: '2024-01-01',
        seating: [[alice, bob, carol]],
        scene: { tables: [], totalStudents: 0 },
      },
      {
        id: '2',
        name: 'Plan2',
        date: '2024-01-02',
        seating: [
          [bob, alice],
          [carol, dave],
        ],
        scene: { tables: [], totalStudents: 0 },
      },
    ];
    const result = buildPreviousPairs(history, { studentCount: 4 });
    expect(result.get('1::2')).toBe(1);
    expect(result.get('1::3')).toBeCloseTo(0.25, 5);
    expect(result.get('2::3')).toBeCloseTo(0.25, 5);
    expect(result.get('3::4')).toBe(1);
  });

  it('ignoriert leere Plätze', () => {
    const history: SavedPlan[] = [
      {
        id: '1',
        name: 'Plan1',
        date: '2024-01-01',
        seating: [[alice, null, bob]],
        scene: { tables: [], totalStudents: 0 },
      },
    ];
    const pairs = buildPreviousPairs(history, { studentCount: 2 });
    expect(pairs.get('1::2')).toBe(1);
  });
});
