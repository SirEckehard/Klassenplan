// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Two tabs of the app — or the installed app beside a browser tab — each have
 * a repository of their own on the same database. Each used to keep a copy of
 * the class collection and write it back whole, so the tab that wrote last
 * put every class back to what it had read: a student added in one tab was
 * gone after the other tab saved anything.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));
vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);

import { IndexedDBRepository } from '../IndexedDBRepository';
import type { Result } from '../types';
import { createMockStudent } from '@/__tests__/utils';

const expectData = <T>(result: Result<T>): T => {
  expect(result.success).toBe(true);
  if (!result.success) throw new Error(result.error.message);
  return result.data;
};

/** What a tab opened later reads: the stored names per class. */
const storedNames = async () => {
  const collection = expectData(
    await new IndexedDBRepository().loadClassCollection(),
  );
  return Object.fromEntries(
    collection.classes.map((entry) => [
      entry.name,
      entry.students.map((student) => student.name),
    ]),
  );
};

/** Tab A makes 7a (open) and 8b; tab B opens afterwards. */
const twoTabs = async () => {
  const tabA = new IndexedDBRepository();
  const sevenA = expectData(
    await tabA.createClass({ name: '7a' }, { activate: true }),
  );
  const eightB = expectData(await tabA.createClass({ name: '8b' }));
  const tabB = new IndexedDBRepository();
  expectData(await tabB.loadClassCollection());
  return { tabA, tabB, sevenA, eightB };
};

describe('two tabs on one database', () => {
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps what one tab saved when the other saves another class', async () => {
    const { tabA, tabB, sevenA, eightB } = await twoTabs();

    await tabA.saveClassSnapshot(sevenA.id, {
      students: [createMockStudent({ name: 'Mia' })],
    });
    await tabB.saveClassSnapshot(eightB.id, {
      students: [createMockStudent({ name: 'Noah' })],
    });

    expect(await storedNames()).toEqual({ '7a': ['Mia'], '8b': ['Noah'] });
  });

  it('keeps a class the other tab created', async () => {
    const { tabA, tabB, eightB } = await twoTabs();

    expectData(await tabA.createClass({ name: '9c' }));
    await tabB.saveClassSnapshot(eightB.id, {
      students: [createMockStudent({ name: 'Noah' })],
    });

    expect(Object.keys(await storedNames())).toEqual(['7a', '8b', '9c']);
  });

  it('reads what the other tab saved when it opens that class', async () => {
    const { tabA, tabB, eightB } = await twoTabs();

    await tabA.saveClassSnapshot(eightB.id, {
      students: [createMockStudent({ name: 'Noah' })],
    });
    expectData(await tabB.setActiveClass(eightB.id));

    const snapshot = expectData(await tabB.loadActiveClassSnapshot());
    expect(snapshot.students?.map((student) => student.name)).toEqual(['Noah']);
  });

  it('stays with its own class when the other tab opens another one', async () => {
    const { tabA, tabB, sevenA, eightB } = await twoTabs();

    expectData(await tabA.setActiveClass(eightB.id));
    await tabB.saveActiveClassSnapshot({
      students: [createMockStudent({ name: 'Mia' })],
    });

    expect(expectData(await tabB.loadClassCollection()).activeClassId).toBe(
      sevenA.id,
    );
    expect(await storedNames()).toEqual({ '7a': ['Mia'], '8b': [] });
    // The next start opens what was opened last.
    expect(
      expectData(await new IndexedDBRepository().loadClassCollection())
        .activeClassId,
    ).toBe(eightB.id);
  });

  it('moves on when the other tab deletes its open class', async () => {
    const { tabA, tabB, sevenA, eightB } = await twoTabs();

    expectData(await tabA.deleteClass(sevenA.id));

    expect(expectData(await tabB.loadClassCollection()).activeClassId).toBe(
      eightB.id,
    );
  });
});

describe('telling another window’s changes to the open class', () => {
  // Every write stamps the class; a second apart, two stamps never match by
  // chance, as two writes within one millisecond would.
  let now = Date.parse('2026-10-22T08:00:00.000Z');
  const later = () => {
    now += 1000;
    vi.setSystemTime(now);
  };

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const changedElsewhere = async (tab: IndexedDBRepository) =>
    expectData(await tab.isOpenClassChangedElsewhere());

  it('knows of no change before the open class was read', async () => {
    const { tabA, tabB, sevenA } = await twoTabs();
    later();
    await tabA.saveClassSnapshot(sevenA.id, { currentSeating: [] });

    expect(await changedElsewhere(tabB)).toBe(false);
  });

  it('tells a tab that the other window changed its open class', async () => {
    const { tabA, tabB, sevenA } = await twoTabs();
    expectData(await tabB.loadActiveClassSnapshot());
    later();
    await tabA.saveClassSnapshot(sevenA.id, {
      students: [createMockStudent({ name: 'Mia' })],
    });

    expect(await changedElsewhere(tabB)).toBe(true);
  });

  it('counts neither its own writes nor another class', async () => {
    const { tabA, tabB, eightB } = await twoTabs();
    expectData(await tabB.loadActiveClassSnapshot());
    later();
    await tabB.saveActiveClassSnapshot({
      students: [createMockStudent({ name: 'Mia' })],
    });
    later();
    await tabA.saveClassSnapshot(eightB.id, {
      students: [createMockStudent({ name: 'Noah' })],
    });

    expect(await changedElsewhere(tabB)).toBe(false);
  });

  it('stays behind when it wrote onto the other window’s change', async () => {
    const { tabA, tabB, sevenA } = await twoTabs();
    expectData(await tabB.loadActiveClassSnapshot());
    later();
    await tabA.saveClassSnapshot(sevenA.id, {
      students: [createMockStudent({ name: 'Mia' })],
    });
    later();
    await tabB.saveActiveClassSnapshot({ currentSeating: [] });

    expect(await changedElsewhere(tabB)).toBe(true);
  });

  it('is in step again once it read the class anew', async () => {
    const { tabA, tabB, sevenA } = await twoTabs();
    expectData(await tabB.loadActiveClassSnapshot());
    later();
    await tabA.saveClassSnapshot(sevenA.id, { currentSeating: [] });

    expectData(await tabB.loadActiveClassSnapshot());

    expect(await changedElsewhere(tabB)).toBe(false);
  });

  it('counts the open class deleted in the other window', async () => {
    const { tabA, tabB, sevenA, eightB } = await twoTabs();
    expectData(await tabB.loadActiveClassSnapshot());
    later();
    expectData(await tabA.deleteClass(sevenA.id));

    expect(await changedElsewhere(tabB)).toBe(true);
    expect(expectData(await tabB.loadClassCollection()).activeClassId).toBe(
      eightB.id,
    );
  });
});
