// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import type {
  PlanUsage,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import {
  buildBackfillUsage,
  buildNeighborhoodStats,
  isCountedUsage,
  usageBelongsToClass,
  collectSeatingPairKeys,
  computePlanFingerprint,
  confidenceForSources,
  mergePlanUsageSignal,
  PLAN_USAGE_LIMIT,
  storedPlanDateToTimestamp,
  trimPlanUsage,
} from '../planUsage';

const student = (id: string): Student => ({ id, name: id }) as Student;

const seatingOf = (tables: string[][]): SeatingArrangement =>
  tables.map((table) => table.map(student)) as SeatingArrangement;

/** Ids for records, handed out in order so assertions stay exact. */
function idFactory(prefix = 'u') {
  let next = 0;
  return () => `${prefix}${++next}`;
}

describe('collectSeatingPairKeys', () => {
  it('builds one sorted key per pair sharing a table', () => {
    expect(collectSeatingPairKeys(seatingOf([['b', 'a'], ['c']]))).toEqual([
      'a::b',
    ]);
  });

  it('pairs everyone at a group table with everyone else', () => {
    expect(collectSeatingPairKeys(seatingOf([['a', 'b', 'c']]))).toEqual([
      'a::b',
      'a::c',
      'b::c',
    ]);
  });

  it('ignores empty seats and empty arrangements', () => {
    const withGaps = [
      [student('a'), null, student('b')],
      [null],
    ] as SeatingArrangement;
    expect(collectSeatingPairKeys(withGaps)).toEqual(['a::b']);
    expect(collectSeatingPairKeys([])).toEqual([]);
    expect(collectSeatingPairKeys(null)).toEqual([]);
  });
});

describe('computePlanFingerprint', () => {
  it('is stable for the same neighbourhoods', () => {
    const pairs = collectSeatingPairKeys(seatingOf([['a', 'b']]));
    expect(computePlanFingerprint(pairs)).toBe(computePlanFingerprint(pairs));
  });

  it('ignores which table a pair sits at', () => {
    const left = collectSeatingPairKeys(
      seatingOf([
        ['a', 'b'],
        ['c', 'd'],
      ]),
    );
    const right = collectSeatingPairKeys(
      seatingOf([
        ['d', 'c'],
        ['b', 'a'],
      ]),
    );
    expect(computePlanFingerprint(left)).toBe(computePlanFingerprint(right));
  });

  it('differs once a single pair changes', () => {
    const before = collectSeatingPairKeys(
      seatingOf([
        ['a', 'b'],
        ['c', 'd'],
      ]),
    );
    const after = collectSeatingPairKeys(
      seatingOf([
        ['a', 'c'],
        ['b', 'd'],
      ]),
    );
    expect(computePlanFingerprint(before)).not.toBe(
      computePlanFingerprint(after),
    );
  });
});

describe('confidenceForSources', () => {
  it('rates a record by its strongest signal, not by their sum', () => {
    expect(confidenceForSources(['edited'])).toBe(0.3);
    expect(confidenceForSources(['edited', 'saved'])).toBe(0.8);
    expect(confidenceForSources(['saved', 'presented'])).toBe(1);
    expect(confidenceForSources([])).toBe(0);
  });
});

describe('mergePlanUsageSignal', () => {
  const pairs = ['a::b'];
  const fingerprint = computePlanFingerprint(pairs);

  const signal = (
    source: PlanUsage['sources'][number],
    at: string,
    id = 'u1',
  ) => ({ pairs, fingerprint, source, at, id });

  it('creates a record for an arrangement seen for the first time', () => {
    const [entry] = mergePlanUsageSignal(
      [],
      signal('presented', '2026-09-01T10:00:00.000Z'),
    );

    expect(entry).toMatchObject({
      id: 'u1',
      fingerprint,
      pairs,
      sources: ['presented'],
      confidence: 1,
      firstSeenAt: '2026-09-01T10:00:00.000Z',
      lastSeenAt: '2026-09-01T10:00:00.000Z',
    });
  });

  it('extends the existing record when the same plan shows up again', () => {
    const first = mergePlanUsageSignal(
      [],
      signal('saved', '2026-09-01T10:00:00.000Z'),
    );
    const second = mergePlanUsageSignal(
      first,
      signal('presented', '2026-09-15T08:00:00.000Z', 'u2'),
    );

    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({
      id: 'u1',
      sources: ['saved', 'presented'],
      confidence: 1,
      firstSeenAt: '2026-09-01T10:00:00.000Z',
      lastSeenAt: '2026-09-15T08:00:00.000Z',
    });
  });

  it('does not repeat a source it already holds', () => {
    const first = mergePlanUsageSignal(
      [],
      signal('presented', '2026-09-01T10:00:00.000Z'),
    );
    const second = mergePlanUsageSignal(
      first,
      signal('presented', '2026-09-08T10:00:00.000Z', 'u2'),
    );

    expect(second[0].sources).toEqual(['presented']);
    expect(second[0].lastSeenAt).toBe('2026-09-08T10:00:00.000Z');
  });

  it('keeps the earliest timestamp when a signal arrives out of order', () => {
    const first = mergePlanUsageSignal(
      [],
      signal('presented', '2026-09-10T10:00:00.000Z'),
    );
    const second = mergePlanUsageSignal(
      first,
      signal('saved', '2026-09-02T10:00:00.000Z', 'u2'),
    );

    expect(second[0].firstSeenAt).toBe('2026-09-02T10:00:00.000Z');
    expect(second[0].lastSeenAt).toBe('2026-09-10T10:00:00.000Z');
  });

  it('promotes a hand-edited record instead of adding a second one', () => {
    const edited = mergePlanUsageSignal(
      [],
      signal('edited', '2026-09-01T10:00:00.000Z'),
    );
    expect(edited[0].confidence).toBe(0.3);

    const presented = mergePlanUsageSignal(
      edited,
      signal('presented', '2026-09-01T11:00:00.000Z', 'u2'),
    );

    expect(presented).toHaveLength(1);
    expect(presented[0]).toMatchObject({
      sources: ['edited', 'presented'],
      confidence: 1,
    });
  });

  it('drops a hand-edited record once a different arrangement turns up', () => {
    const edited = mergePlanUsageSignal(
      [],
      signal('edited', '2026-09-01T10:00:00.000Z'),
    );

    const otherPairs = ['c::d'];
    const next = mergePlanUsageSignal(edited, {
      pairs: otherPairs,
      fingerprint: computePlanFingerprint(otherPairs),
      source: 'presented',
      at: '2026-09-02T10:00:00.000Z',
      id: 'u2',
    });

    expect(next).toHaveLength(1);
    expect(next[0].pairs).toEqual(otherPairs);
  });

  it('keeps a record that was only edited but is already confirmed', () => {
    const confirmed: PlanUsage = {
      id: 'u1',
      fingerprint,
      pairs,
      firstSeenAt: '2026-09-01T10:00:00.000Z',
      lastSeenAt: '2026-09-01T10:00:00.000Z',
      sources: ['edited'],
      confidence: 0.3,
      confirmed: true,
    };

    const otherPairs = ['c::d'];
    const next = mergePlanUsageSignal([confirmed], {
      pairs: otherPairs,
      fingerprint: computePlanFingerprint(otherPairs),
      source: 'presented',
      at: '2026-09-02T10:00:00.000Z',
      id: 'u2',
    });

    expect(next).toHaveLength(2);
  });
});

describe('trimPlanUsage', () => {
  it('drops the oldest records beyond the limit', () => {
    const entries: PlanUsage[] = Array.from(
      { length: PLAN_USAGE_LIMIT + 3 },
      (_, index) => ({
        id: `u${index}`,
        fingerprint: `f${index}`,
        pairs: [],
        firstSeenAt: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
        lastSeenAt: '2026-06-01T00:00:00.000Z',
        sources: ['saved'],
        confidence: 0.8,
      }),
    );

    const trimmed = trimPlanUsage(entries);

    expect(trimmed).toHaveLength(PLAN_USAGE_LIMIT);
    expect(trimmed[0].id).toBe('u3');
  });
});

describe('storedPlanDateToTimestamp', () => {
  it('reads an ISO date as local midnight', () => {
    const iso = storedPlanDateToTimestamp('2026-09-03');
    expect(iso).toBe(new Date(2026, 8, 3).toISOString());
  });

  it('converts the German strings written before the ISO switch', () => {
    const iso = storedPlanDateToTimestamp('31.07.2026');
    expect(iso).toBe(new Date(2026, 6, 31).toISOString());
  });

  it('returns null for something unparseable', () => {
    expect(storedPlanDateToTimestamp('irgendwann')).toBeNull();
    expect(storedPlanDateToTimestamp('')).toBeNull();
  });
});

describe('buildBackfillUsage', () => {
  const plan = (
    id: string,
    date: string,
    tables: string[][],
    autoSaved?: boolean,
  ): SavedPlan =>
    ({
      id,
      name: id,
      date,
      seating: seatingOf(tables),
      scene: { tables: [] },
      ...(autoSaved ? { autoSaved: true } : {}),
    }) as unknown as SavedPlan;

  it('seeds one record per named plan', () => {
    const entries = buildBackfillUsage(
      [
        plan('p1', '2026-08-01', [['a', 'b']]),
        plan('p2', '2026-09-01', [['a', 'c']]),
      ],
      idFactory(),
    );

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.sources)).toEqual([
      ['saved'],
      ['saved'],
    ]);
    expect(entries[0].firstSeenAt).toBe(new Date(2026, 7, 1).toISOString());
  });

  it('skips auto-saves, which say nothing about a plan being used', () => {
    const entries = buildBackfillUsage(
      [
        plan('p1', '2026-08-01', [['a', 'b']], true),
        plan('p2', '2026-09-01', [['a', 'c']]),
      ],
      idFactory(),
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].pairs).toEqual(['a::c']);
  });

  it('collapses plans that seat the same people together', () => {
    const entries = buildBackfillUsage(
      [
        plan('p1', '2026-08-01', [['a', 'b']]),
        plan('p2', '2026-09-01', [['b', 'a']]),
      ],
      idFactory(),
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      firstSeenAt: new Date(2026, 7, 1).toISOString(),
      lastSeenAt: new Date(2026, 8, 1).toISOString(),
    });
  });

  it('skips plans without a usable date or without neighbours', () => {
    const entries = buildBackfillUsage(
      [
        plan('p1', 'irgendwann', [['a', 'b']]),
        plan('p2', '2026-09-01', [['a'], ['b']]),
      ],
      idFactory(),
    );

    expect(entries).toEqual([]);
  });
});

describe('isCountedUsage', () => {
  const base: PlanUsage = {
    id: 'u1',
    fingerprint: 'f1',
    pairs: ['a::b'],
    firstSeenAt: '2026-08-01T00:00:00.000Z',
    lastSeenAt: '2026-08-01T00:00:00.000Z',
    sources: ['presented'],
    confidence: 1,
  };

  it('counts a record backed by a strong signal', () => {
    expect(isCountedUsage(base)).toBe(true);
  });

  it('does not count a record that was only rearranged by hand', () => {
    expect(
      isCountedUsage({ ...base, sources: ['edited'], confidence: 0.3 }),
    ).toBe(false);
  });

  it('never counts a record the teacher took out', () => {
    expect(isCountedUsage({ ...base, confirmed: false })).toBe(false);
  });

  it('counts a hand-edited record the teacher confirmed', () => {
    expect(
      isCountedUsage({ ...base, sources: ['edited'], confirmed: true }),
    ).toBe(true);
  });
});

describe('buildNeighborhoodStats', () => {
  const record = (
    id: string,
    pairs: string[],
    lastSeenAt: string,
    overrides: Partial<PlanUsage> = {},
  ): PlanUsage => ({
    id,
    fingerprint: `f-${id}`,
    pairs,
    firstSeenAt: lastSeenAt,
    lastSeenAt,
    sources: ['presented'],
    confidence: 1,
    ...overrides,
  });

  it('counts how many plans sat a pair together', () => {
    const stats = buildNeighborhoodStats([
      record('u1', ['a::b', 'c::d'], '2026-08-01T00:00:00.000Z'),
      record('u2', ['a::b'], '2026-09-01T00:00:00.000Z'),
    ]);

    expect(stats).toEqual([
      {
        key: 'a::b',
        studentIdA: 'a',
        studentIdB: 'b',
        count: 2,
        lastSeenAt: '2026-09-01T00:00:00.000Z',
      },
      {
        key: 'c::d',
        studentIdA: 'c',
        studentIdB: 'd',
        count: 1,
        lastSeenAt: '2026-08-01T00:00:00.000Z',
      },
    ]);
  });

  it('leaves out records that do not count', () => {
    const stats = buildNeighborhoodStats([
      record('u1', ['a::b'], '2026-08-01T00:00:00.000Z', { confirmed: false }),
      record('u2', ['c::d'], '2026-08-02T00:00:00.000Z', {
        sources: ['edited'],
      }),
      record('u3', ['e::f'], '2026-08-03T00:00:00.000Z'),
    ]);

    expect(stats.map((stat) => stat.key)).toEqual(['e::f']);
  });

  it('returns nothing when no record counts', () => {
    expect(buildNeighborhoodStats([])).toEqual([]);
  });
});

describe('usageBelongsToClass', () => {
  const record = (pairs: string[]): PlanUsage => ({
    id: 'u1',
    fingerprint: 'f1',
    pairs,
    firstSeenAt: '2026-08-01T00:00:00.000Z',
    lastSeenAt: '2026-08-01T00:00:00.000Z',
    sources: ['presented'],
    confidence: 1,
  });

  it('accepts a record naming somebody from the class', () => {
    expect(usageBelongsToClass(record(['a::b']), new Set(['a']))).toBe(true);
  });

  it('rejects a record that names nobody from the class', () => {
    expect(usageBelongsToClass(record(['x::y']), new Set(['a', 'b']))).toBe(
      false,
    );
  });

  it('keeps a record when only some of its students left', () => {
    expect(usageBelongsToClass(record(['a::b', 'a::c']), new Set(['a']))).toBe(
      true,
    );
  });

  it('rejects a record without pairs', () => {
    expect(usageBelongsToClass(record([]), new Set(['a']))).toBe(false);
  });

  it('matches ids that contain the separator characters', () => {
    expect(usageBelongsToClass(record(['a:1::b:2']), new Set(['b:2']))).toBe(
      true,
    );
  });
});
