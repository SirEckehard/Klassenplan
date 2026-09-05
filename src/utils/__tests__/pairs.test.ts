// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import { buildPreviousPairs } from '../pairs';
import { createMockMixResult } from '@/__tests__/utils';
import type { PlanUsage, SavedPlan, Student } from '../../types';

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

const planOf = (seating: SavedPlan['seating']): SavedPlan => ({
  id: 'p1',
  name: 'Plan',
  date: '2024-01-01',
  seating,
  scene: { tables: [], totalStudents: 0 },
});

const usageOf = (overrides: Partial<PlanUsage> = {}): PlanUsage => ({
  id: 'u1',
  fingerprint: 'f1',
  pairs: ['1::2'],
  firstSeenAt: '2026-08-01T00:00:00.000Z',
  lastSeenAt: '2026-08-01T00:00:00.000Z',
  sources: ['presented'],
  confidence: 1,
  ...overrides,
});

/** A shuffling session long enough to fill the whole window on its own. */
const shufflingSession = (seating: SavedPlan['seating']) =>
  Array.from({ length: 20 }, (_, index) =>
    createMockMixResult({ id: index, seating }),
  );

describe('buildPreviousPairs mit Misch-Historie', () => {
  it('lässt gespeicherte Pläne nicht von einer vollen Misch-Historie verdrängen', () => {
    const result = buildPreviousPairs([planOf([[alice, bob]])], {
      mixHistory: shufflingSession([[carol, dave]]),
      studentCount: 4,
    });

    expect(result.get('1::2')).toBe(1);
  });

  it('gewichtet eine Mischung halb so stark wie einen echten Plan', () => {
    const result = buildPreviousPairs([], {
      mixHistory: [createMockMixResult({ id: 1, seating: [[alice, bob]] })],
      studentCount: 4,
    });

    expect(result.get('1::2')).toBeCloseTo(0.5, 5);
  });
});

describe('buildPreviousPairs mit Nutzungsaufzeichnung', () => {
  it('zieht die Aufzeichnung den gespeicherten Plänen vor', () => {
    const result = buildPreviousPairs([planOf([[carol, dave]])], {
      planUsage: [usageOf()],
      studentCount: 4,
    });

    expect(result.get('1::2')).toBe(1);
    expect(result.get('3::4')).toBeUndefined();
  });

  it('gewichtet nach Konfidenz des Datensatzes', () => {
    const result = buildPreviousPairs([], {
      planUsage: [usageOf({ confidence: 0.8 })],
      studentCount: 4,
    });

    expect(result.get('1::2')).toBeCloseTo(0.8, 5);
  });

  it('ignoriert Pläne, die aus der Wertung genommen wurden', () => {
    const result = buildPreviousPairs([planOf([[carol, dave]])], {
      planUsage: [usageOf({ confirmed: false })],
      studentCount: 4,
    });

    // Nothing counted leaves the saved plans as the history of record.
    expect(result.get('1::2')).toBeUndefined();
    expect(result.get('3::4')).toBe(1);
  });

  it('ignoriert reine Handanpassungen ohne Bestätigung', () => {
    const result = buildPreviousPairs([], {
      planUsage: [usageOf({ sources: ['edited'], confidence: 0.3 })],
      studentCount: 4,
    });

    expect(result.get('1::2')).toBeUndefined();
  });

  it('behält die Aufzeichnung neben einer vollen Misch-Historie', () => {
    const result = buildPreviousPairs([], {
      planUsage: [usageOf()],
      mixHistory: shufflingSession([[carol, dave]]),
      studentCount: 4,
    });

    expect(result.get('1::2')).toBe(1);
  });

  it('ordnet die Aufzeichnung nach Aktualität', () => {
    const result = buildPreviousPairs([], {
      planUsage: [
        usageOf({
          id: 'old',
          fingerprint: 'f-old',
          pairs: ['3::4'],
          lastSeenAt: '2026-01-01T00:00:00.000Z',
        }),
        usageOf({ lastSeenAt: '2026-08-01T00:00:00.000Z' }),
      ],
      studentCount: 4,
    });

    // The newer record counts fully, the older one decays.
    expect(result.get('1::2')).toBe(1);
    expect(result.get('3::4')).toBeCloseTo(0.25, 5);
  });
});
