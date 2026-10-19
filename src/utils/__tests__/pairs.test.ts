// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import { buildPreviousPairs, MAX_PAIR_WEIGHT } from '../pairs';
import {
  collectSeatingPairKeys,
  computePlanFingerprint,
} from '../data/planUsage';
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
    // Four students keep a window of seven plans: the plan before the newest
    // weighs 0.25^(1/6), whatever the number of plans, and a pair that sat
    // together in both adds up (decision 0031).
    const second = 0.25 ** (1 / 6);
    expect(result.get('1::2')).toBeCloseTo(1 + second, 5);
    expect(result.get('1::3')).toBeCloseTo(second, 5);
    expect(result.get('2::3')).toBeCloseTo(second, 5);
    expect(result.get('3::4')).toBe(1);
  });

  it('gewichtet einen Plan nach seinem Rang, nicht nach der Zahl der Pläne', () => {
    const plan = (id: string, seating: SavedPlan['seating']): SavedPlan => ({
      id,
      name: id,
      date: `2024-01-0${id}`,
      seating,
      scene: { tables: [], totalStudents: 0 },
    });
    const lastWeek = plan('2', [[alice, bob]]);
    const newest = plan('3', [[carol, dave]]);
    const few = buildPreviousPairs([lastWeek, newest], { studentCount: 4 });
    const many = buildPreviousPairs(
      [plan('1', [[alice, dave]]), lastWeek, newest],
      { studentCount: 4 },
    );
    expect(few.get('1::2')).toBeCloseTo(many.get('1::2')!, 10);
  });

  it('lässt häufige Paare schwerer wiegen, bis zur Obergrenze', () => {
    const history: SavedPlan[] = [1, 2, 3, 4, 5].map((day) => ({
      id: `${day}`,
      name: `Plan${day}`,
      date: `2024-01-0${day}`,
      seating: [[alice, bob]],
      scene: { tables: [], totalStudents: 0 },
    }));
    const result = buildPreviousPairs(history, { studentCount: 4 });
    expect(result.get('1::2')).toBe(MAX_PAIR_WEIGHT);
  });

  it('ordnet gespeicherte Pläne nach ihrem Datum, nicht nach der Liste', () => {
    const history: SavedPlan[] = [
      {
        id: 'newest',
        name: 'Neu',
        date: '2024-03-01',
        seating: [[alice, bob]],
        scene: { tables: [], totalStudents: 0 },
      },
      {
        id: 'older',
        name: 'Alt',
        date: '2024-01-01',
        seating: [[carol, dave]],
        scene: { tables: [], totalStudents: 0 },
      },
    ];
    const result = buildPreviousPairs(history, { studentCount: 4 });
    expect(result.get('1::2')).toBe(1);
    expect(result.get('3::4')).toBeCloseTo(0.25 ** (1 / 6), 5);
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

// Only plans that were really in use count; a mix is an experiment and has
// no say (decision 0032).
describe('buildPreviousPairs: nur genutzte Pläne', () => {
  it('übergeht die automatische Sicherung', () => {
    const result = buildPreviousPairs(
      [
        { ...planOf([[alice, bob]]), id: 'auto', autoSaved: true },
        { ...planOf([[carol, dave]]), id: 'named' },
      ],
      { studentCount: 4 },
    );

    expect(result.get('1::2')).toBeUndefined();
    expect(result.get('3::4')).toBe(1);
  });

  it('lässt den gelesenen Plan aus seiner eigenen Aufzeichnung heraus', () => {
    const plan = [[alice, bob]];
    const pairs = collectSeatingPairKeys(plan);
    const result = buildPreviousPairs([], {
      plan,
      planUsage: [
        usageOf({ pairs, fingerprint: computePlanFingerprint(pairs) }),
        usageOf({ id: 'u2', fingerprint: 'f-other', pairs: ['3::4'] }),
      ],
      studentCount: 4,
    });

    expect(result.get('1::2')).toBeUndefined();
    expect(result.get('3::4')).toBe(1);
  });

  it('lässt den gelesenen Plan unter den gespeicherten Plänen heraus', () => {
    const plan = [[alice, bob]];
    const result = buildPreviousPairs(
      [
        { ...planOf(plan), id: 'same' },
        { ...planOf([[carol, dave]]), id: 'other' },
      ],
      { plan, studentCount: 4 },
    );

    expect(result.get('1::2')).toBeUndefined();
    expect(result.get('3::4')).toBe(1);
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

  it('greift von Hand markierend nie auf die gespeicherten Pläne zurück', () => {
    const result = buildPreviousPairs([planOf([[carol, dave]])], {
      planUsage: [usageOf({ confirmed: false })],
      manual: true,
      studentCount: 4,
    });

    expect(result.get('1::2')).toBeUndefined();
    expect(result.get('3::4')).toBeUndefined();
  });

  it('wertet von Hand markierend auch ohne jeden Datensatz keinen gespeicherten Plan', () => {
    const result = buildPreviousPairs([planOf([[carol, dave]])], {
      planUsage: [],
      manual: true,
      studentCount: 4,
    });

    expect(result.size).toBe(0);
  });

  it('ignoriert reine Handanpassungen ohne Bestätigung', () => {
    const result = buildPreviousPairs([], {
      planUsage: [usageOf({ sources: ['edited'], confidence: 0.3 })],
      studentCount: 4,
    });

    expect(result.get('1::2')).toBeUndefined();
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

    // The newer record counts fully, the older one by its rank.
    expect(result.get('1::2')).toBe(1);
    expect(result.get('3::4')).toBeCloseTo(0.25 ** (1 / 6), 5);
  });
});

// "Nachbarschaften zurücksetzen": what came before the reset no longer
// counts — saved plans dated up to that day.
describe('buildPreviousPairs nach dem Zurücksetzen', () => {
  // Mid-morning of 3 October wherever the test runs: saved plans carry a
  // local day.
  const resetAt = new Date(2026, 9, 3, 10, 0).toISOString();
  const datedPlan = (date: string, seating: SavedPlan['seating']): SavedPlan =>
    ({ ...planOf(seating), date }) as SavedPlan;

  it('übergeht gespeicherte Pläne bis zum Tag des Zurücksetzens', () => {
    const history = [
      datedPlan('2026-09-01', [[alice, bob]]),
      datedPlan('2026-10-03', [[alice, carol]]),
      datedPlan('2026-10-04', [[carol, dave]]),
    ];

    const result = buildPreviousPairs(history, {
      since: resetAt,
      studentCount: 4,
    });

    expect(result.get('1::2')).toBeUndefined();
    expect(result.get('1::3')).toBeUndefined();
    expect(result.get('3::4')).toBe(1);
  });

  it('ändert ohne Zurücksetzen nichts', () => {
    const history = [datedPlan('2026-09-01', [[alice, bob]])];

    expect(
      buildPreviousPairs(history, { since: null, studentCount: 4 }),
    ).toEqual(buildPreviousPairs(history, { studentCount: 4 }));
  });
});
