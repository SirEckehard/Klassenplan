// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// In-memory stand-in for idb-keyval (default store only).
const memory = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  set: vi.fn(async (key: string, value: unknown) => {
    memory.set(key, value);
  }),
  get: vi.fn(async (key: string) => memory.get(key)),
  del: vi.fn(async (key: string) => {
    memory.delete(key);
  }),
}));

import {
  backfillPlanUsage,
  setPlanUsageConfirmed,
  subscribeToPlanUsage,
  getAllPlanUsage,
  loadPlanUsage,
  recordPlanUsage,
  restorePlanUsage,
  sweepOrphanPlanUsage,
} from '../planUsageStore';
import type { SavedPlan, SeatingArrangement, Student } from '@/types';

const student = (id: string): Student => ({ id, name: id }) as Student;

const seatingOf = (tables: string[][]): SeatingArrangement =>
  tables.map((table) => table.map(student)) as SeatingArrangement;

const planOf = (
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

beforeEach(() => {
  memory.clear();
  // hasIndexedDB() must return true for the store to perform operations.
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('recordPlanUsage', () => {
  it('stores a record for the arrangement that was used', async () => {
    await recordPlanUsage('c1', seatingOf([['a', 'b']]), 'presented');

    const entries = await loadPlanUsage('c1');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      pairs: ['a::b'],
      sources: ['presented'],
      confidence: 1,
    });
  });

  it('extends the record instead of adding one when the plan repeats', async () => {
    await recordPlanUsage('c1', seatingOf([['a', 'b']]), 'saved');
    await recordPlanUsage('c1', seatingOf([['b', 'a']]), 'presented');

    const entries = await loadPlanUsage('c1');
    expect(entries).toHaveLength(1);
    expect(entries[0].sources).toEqual(['saved', 'presented']);
  });

  it('keeps classes apart', async () => {
    await recordPlanUsage('c1', seatingOf([['a', 'b']]), 'exported');
    await recordPlanUsage('c2', seatingOf([['c', 'd']]), 'exported');

    expect(await loadPlanUsage('c1')).toHaveLength(1);
    expect((await loadPlanUsage('c2'))[0].pairs).toEqual(['c::d']);
  });

  it('does nothing without an active class or without neighbours', async () => {
    await recordPlanUsage(null, seatingOf([['a', 'b']]), 'presented');
    await recordPlanUsage('c1', seatingOf([['a'], ['b']]), 'presented');
    await recordPlanUsage('c1', [], 'presented');

    expect(await getAllPlanUsage()).toBeUndefined();
  });

  it('survives concurrent signals instead of losing one', async () => {
    await Promise.all([
      recordPlanUsage('c1', seatingOf([['a', 'b']]), 'presented'),
      recordPlanUsage('c1', seatingOf([['c', 'd']]), 'exported'),
    ]);

    expect(await loadPlanUsage('c1')).toHaveLength(2);
  });
});

describe('backfillPlanUsage', () => {
  it('seeds a class from the plans it saved earlier', async () => {
    await backfillPlanUsage('c1', [
      planOf('p1', '2026-08-01', [['a', 'b']]),
      planOf('p2', '2026-09-01', [['a', 'c']], true),
    ]);

    const entries = await loadPlanUsage('c1');
    expect(entries).toHaveLength(1);
    expect(entries[0].pairs).toEqual(['a::b']);
  });

  it('runs only once per class', async () => {
    await backfillPlanUsage('c1', [planOf('p1', '2026-08-01', [['a', 'b']])]);
    await backfillPlanUsage('c1', [
      planOf('p1', '2026-08-01', [['a', 'b']]),
      planOf('p2', '2026-09-01', [['c', 'd']]),
    ]);

    expect(await loadPlanUsage('c1')).toHaveLength(1);
  });

  it('does not overwrite a record a live signal already wrote', async () => {
    await recordPlanUsage('c1', seatingOf([['a', 'b']]), 'presented');
    await backfillPlanUsage('c1', [planOf('p1', '2026-08-01', [['a', 'b']])]);

    const entries = await loadPlanUsage('c1');
    expect(entries).toHaveLength(1);
    expect(entries[0].sources).toEqual(['presented']);
  });
});

/** Class roster in the shape the sweep expects. */
const rosters = (entries: Record<string, string[]>): Map<string, Set<string>> =>
  new Map(
    Object.entries(entries).map(([classId, ids]) => [classId, new Set(ids)]),
  );

describe('sweepOrphanPlanUsage', () => {
  it('drops records of classes that no longer exist', async () => {
    await recordPlanUsage('c1', seatingOf([['a', 'b']]), 'presented');
    await recordPlanUsage('c2', seatingOf([['c', 'd']]), 'presented');

    await sweepOrphanPlanUsage(rosters({ c1: ['a', 'b'] }));

    expect(await loadPlanUsage('c1')).toHaveLength(1);
    expect(await loadPlanUsage('c2')).toEqual([]);
  });

  it('drops records that name nobody from the class they sit under', async () => {
    // The shape cross-class contamination takes: another class's pairs filed
    // under this class, which showed up as pairs of unknown students.
    await recordPlanUsage('c1', seatingOf([['x', 'y']]), 'presented');
    await recordPlanUsage('c1', seatingOf([['a', 'b']]), 'presented');

    await sweepOrphanPlanUsage(rosters({ c1: ['a', 'b'] }));

    const entries = await loadPlanUsage('c1');
    expect(entries).toHaveLength(1);
    expect(entries[0].pairs).toEqual(['a::b']);
  });

  it('keeps a record when only some of its students left the class', async () => {
    await recordPlanUsage('c1', seatingOf([['a', 'b']]), 'presented');

    await sweepOrphanPlanUsage(rosters({ c1: ['a'] }));

    expect(await loadPlanUsage('c1')).toHaveLength(1);
  });

  it('matches pair keys that were written with names', async () => {
    await recordPlanUsage('c1', seatingOf([['Anna', 'Ben']]), 'presented');

    await sweepOrphanPlanUsage(rosters({ c1: ['s1', 'Anna'] }));

    expect(await loadPlanUsage('c1')).toHaveLength(1);
  });

  it('leaves an untouched record alone', async () => {
    await recordPlanUsage('c1', seatingOf([['a', 'b']]), 'presented');
    const before = await loadPlanUsage('c1');

    await sweepOrphanPlanUsage(rosters({ c1: ['a', 'b'] }));

    expect(await loadPlanUsage('c1')).toEqual(before);
  });

  it('lets a swept class be seeded again', async () => {
    await backfillPlanUsage('c1', [planOf('p1', '2026-08-01', [['a', 'b']])]);
    await sweepOrphanPlanUsage(rosters({}));
    await backfillPlanUsage('c1', [planOf('p1', '2026-08-01', [['a', 'b']])]);

    expect(await loadPlanUsage('c1')).toHaveLength(1);
  });
});

describe('restorePlanUsage', () => {
  it('replaces everything on a full import', async () => {
    await recordPlanUsage('c1', seatingOf([['a', 'b']]), 'presented');

    await restorePlanUsage({ c9: [] });

    expect(await loadPlanUsage('c1')).toEqual([]);
    expect(await getAllPlanUsage()).toEqual({ c9: [] });
  });

  it('clears the store when the backup carried no records', async () => {
    await recordPlanUsage('c1', seatingOf([['a', 'b']]), 'presented');

    await restorePlanUsage(undefined);

    expect(await getAllPlanUsage()).toBeUndefined();
  });

  it('keeps existing classes on a merge and only adds unknown ones', async () => {
    await recordPlanUsage('c1', seatingOf([['a', 'b']]), 'presented');
    const kept = await loadPlanUsage('c1');

    await restorePlanUsage({ c1: [], c2: [] }, { merge: true });

    expect(await loadPlanUsage('c1')).toEqual(kept);
    expect(await loadPlanUsage('c2')).toEqual([]);
  });
});

describe('getAllPlanUsage', () => {
  it('reports nothing while the record is empty', async () => {
    expect(await getAllPlanUsage()).toBeUndefined();
  });

  it('returns every class once records exist', async () => {
    await recordPlanUsage('c1', seatingOf([['a', 'b']]), 'presented');

    expect(Object.keys((await getAllPlanUsage()) ?? {})).toEqual(['c1']);
  });
});

describe('recordPlanUsage outcome', () => {
  it('reports the first signal for an arrangement as a new record', async () => {
    const outcome = await recordPlanUsage(
      'c1',
      seatingOf([['a', 'b']]),
      'presented',
    );

    expect(outcome).toMatchObject({ created: true, firstStrongSignal: true });
  });

  it('reports a repeat as neither new nor a first strong signal', async () => {
    await recordPlanUsage('c1', seatingOf([['a', 'b']]), 'presented');
    const outcome = await recordPlanUsage(
      'c1',
      seatingOf([['a', 'b']]),
      'exported',
    );

    expect(outcome).toMatchObject({ created: false, firstStrongSignal: false });
  });

  it('still reports a first strong signal after a hand edit', async () => {
    await recordPlanUsage('c1', seatingOf([['a', 'b']]), 'edited');
    const outcome = await recordPlanUsage(
      'c1',
      seatingOf([['a', 'b']]),
      'exported',
    );

    expect(outcome).toMatchObject({ created: false, firstStrongSignal: true });
  });

  it('never reports a hand edit as a strong signal', async () => {
    const outcome = await recordPlanUsage(
      'c1',
      seatingOf([['a', 'b']]),
      'edited',
    );

    expect(outcome).toMatchObject({ created: true, firstStrongSignal: false });
  });

  it('reports nothing when there was nothing to record', async () => {
    expect(await recordPlanUsage(null, seatingOf([['a', 'b']]), 'saved')).toBe(
      null,
    );
  });
});

describe('setPlanUsageConfirmed', () => {
  it('takes a plan out of the count without deleting it', async () => {
    const outcome = await recordPlanUsage(
      'c1',
      seatingOf([['a', 'b']]),
      'presented',
    );

    await setPlanUsageConfirmed('c1', outcome!.id, false);

    const entries = await loadPlanUsage('c1');
    expect(entries).toHaveLength(1);
    expect(entries[0].confirmed).toBe(false);
  });

  it('is carried into the outcome of a later signal', async () => {
    const first = await recordPlanUsage(
      'c1',
      seatingOf([['a', 'b']]),
      'presented',
    );
    await setPlanUsageConfirmed('c1', first!.id, false);

    const second = await recordPlanUsage(
      'c1',
      seatingOf([['a', 'b']]),
      'exported',
    );
    expect(second?.confirmed).toBe(false);
  });

  it('ignores an id that does not exist', async () => {
    await recordPlanUsage('c1', seatingOf([['a', 'b']]), 'presented');
    await setPlanUsageConfirmed('c1', 'nope', false);

    expect((await loadPlanUsage('c1'))[0].confirmed).toBeUndefined();
  });
});

describe('subscribeToPlanUsage', () => {
  it('notifies watchers after a write', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToPlanUsage(listener);

    await recordPlanUsage('c1', seatingOf([['a', 'b']]), 'presented');
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    await recordPlanUsage('c1', seatingOf([['c', 'd']]), 'presented');
    expect(listener).toHaveBeenCalledOnce();
  });

  it('stays quiet when a call changed nothing', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToPlanUsage(listener);

    await setPlanUsageConfirmed('c1', 'nope', false);
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });
});
