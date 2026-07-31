// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Core persistence of the app: classes, their snapshots and the shared
 * classroom templates.
 *
 * The tests run against an in-memory stand-in for IndexedDB, so they cover the
 * repository's own rules — class isolation, active-class resolution, cloning of
 * stored data and the Result contract — rather than the browser's database.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const memory = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => ({})),
  get: vi.fn(async (key: string) => memory.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    memory.set(key, value);
  }),
  del: vi.fn(async (key: string) => {
    memory.delete(key);
  }),
  keys: vi.fn(async () => [...memory.keys()]),
  entries: vi.fn(async () => [...memory.entries()]),
  clear: vi.fn(async () => {
    memory.clear();
  }),
}));

import { IndexedDBRepository } from '../IndexedDBRepository';
import { RepositoryErrorType, type Result } from '../types';
import { createMockStudent, createMockClassroomScene } from '@/__tests__/utils';
import type { ClassroomTemplate } from '@/types';

/** Unwraps a successful Result, failing the test when it is a Failure. */
const expectData = <T>(result: Result<T>): T => {
  expect(result.success).toBe(true);
  if (!result.success) throw new Error(result.error.message);
  return result.data;
};

const expectFailure = <T>(result: Result<T>) => {
  expect(result.success).toBe(false);
  if (result.success) throw new Error('expected a failure');
  return result.error;
};

let repository: IndexedDBRepository;

beforeEach(() => {
  memory.clear();
  vi.stubGlobal('indexedDB', {});
  repository = new IndexedDBRepository();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('availability', () => {
  it('fails with a storage error when IndexedDB is missing', async () => {
    vi.stubGlobal('indexedDB', undefined);

    const error = expectFailure(await repository.loadClassCollection());

    expect(error.type).toBe(RepositoryErrorType.STORAGE_ERROR);
  });
});

describe('class collection', () => {
  it('starts with an initialised collection', async () => {
    const collection = expectData(await repository.loadClassCollection());

    expect(collection.classes).toBeInstanceOf(Array);
  });

  it('creates a class and can activate it right away', async () => {
    const record = expectData(
      await repository.createClass({ name: 'Klasse 5a' }, { activate: true }),
    );

    expect(record.name).toBe('Klasse 5a');

    const collection = expectData(await repository.loadClassCollection());
    expect(collection.activeClassId).toBe(record.id);
  });

  it('rejects a duplicate class name regardless of case and padding', async () => {
    await repository.createClass({ name: 'Klasse 5a' });

    const error = expectFailure(
      await repository.createClass({ name: '  klasse 5A  ' }),
    );

    expect(error.type).toBe(RepositoryErrorType.DUPLICATE_KEY);
  });

  it('lists classes as summaries', async () => {
    await repository.createClass({ name: 'A' });
    await repository.createClass({ name: 'B' });

    const summaries = expectData(await repository.listClasses());

    expect(summaries.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(['A', 'B']),
    );
  });

  it('reports NOT_FOUND when activating an unknown class', async () => {
    const error = expectFailure(await repository.setActiveClass('nope'));

    expect(error.type).toBe(RepositoryErrorType.NOT_FOUND);
  });

  it('moves the active class on when the active one is deleted', async () => {
    const first = expectData(
      await repository.createClass({ name: 'First' }, { activate: true }),
    );
    const second = expectData(await repository.createClass({ name: 'Second' }));

    expectData(await repository.deleteClass(first.id));

    const collection = expectData(await repository.loadClassCollection());
    expect(collection.classes.map((entry) => entry.id)).toEqual([second.id]);
    expect(collection.activeClassId).toBe(second.id);
  });

  it('reports NOT_FOUND when deleting an unknown class', async () => {
    const error = expectFailure(await repository.deleteClass('ghost'));

    expect(error.type).toBe(RepositoryErrorType.NOT_FOUND);
  });

  it('renames a class', async () => {
    const record = expectData(
      await repository.createClass({ name: 'Old' }, { activate: true }),
    );

    expectData(
      await repository.updateClassMetadata(record.id, { name: 'New' }),
    );

    const summaries = expectData(await repository.listClasses());
    expect(summaries.find((entry) => entry.id === record.id)?.name).toBe('New');
  });

  it('duplicates a class including its students', async () => {
    const source = expectData(
      await repository.createClass(
        { name: 'Source', students: [createMockStudent({ name: 'Ada' })] },
        { activate: true },
      ),
    );

    const copy = expectData(
      await repository.duplicateClass(source.id, { name: 'Copy' }),
    );

    expect(copy.id).not.toBe(source.id);
    expect(copy.students?.map((s) => s.name)).toEqual(['Ada']);
  });
});

describe('active class snapshot', () => {
  beforeEach(async () => {
    await repository.createClass({ name: 'Active' }, { activate: true });
  });

  it('returns empty defaults for a fresh class', async () => {
    const snapshot = expectData(await repository.loadActiveClassSnapshot());

    expect(snapshot).toMatchObject({
      students: [],
      seatingHistory: [],
      mixHistory: [],
      currentSeating: [],
      lockedPositions: {},
      mixSettings: null,
      classroomScene: null,
      circleLayout: null,
      activePlanId: null,
    });
  });

  it('round-trips students and the classroom scene', async () => {
    const students = [createMockStudent({ name: 'Ada' })];
    const scene = createMockClassroomScene(2);

    expectData(await repository.saveStudents(students));
    expectData(await repository.saveClassroomScene(scene));

    const snapshot = expectData(await repository.loadActiveClassSnapshot());
    expect(snapshot.students?.map((s) => s.name)).toEqual(['Ada']);
    expect(snapshot.classroomScene?.tables).toHaveLength(2);
  });

  it('stores a copy, so a later mutation by the caller cannot leak in', async () => {
    const students = [createMockStudent({ name: 'Ada' })];
    expectData(await repository.saveStudents(students));

    students[0]!.name = 'Mutated after saving';

    const stored = expectData(await repository.loadStudents());
    expect(stored[0]?.name).toBe('Ada');
  });

  it('only overwrites the keys a partial snapshot contains', async () => {
    expectData(
      await repository.saveStudents([createMockStudent({ name: 'Ada' })]),
    );
    expectData(
      await repository.saveLockedPositions({ s1: { table: 0, seat: 1 } }),
    );

    expectData(
      await repository.saveActiveClassSnapshot({ activePlanId: 'plan-7' }),
    );

    const snapshot = expectData(await repository.loadActiveClassSnapshot());
    expect(snapshot.activePlanId).toBe('plan-7');
    expect(snapshot.students).toHaveLength(1);
    expect(snapshot.lockedPositions).toEqual({ s1: { table: 0, seat: 1 } });
  });

  it('heals a missing active id by falling back to the first class', async () => {
    const collection = expectData(await repository.loadClassCollection());
    expectData(
      await repository.saveClassCollection({
        ...collection,
        activeClassId: null,
      }),
    );

    const healed = expectData(await repository.loadClassCollection());
    expect(healed.activeClassId).toBe(healed.classes[0]?.id);
  });
});

describe('class isolation', () => {
  it('keeps each class snapshot to itself', async () => {
    const a = expectData(
      await repository.createClass({ name: 'A' }, { activate: true }),
    );
    const b = expectData(await repository.createClass({ name: 'B' }));

    expectData(
      await repository.saveClassSnapshot(a.id, {
        students: [createMockStudent({ name: 'From A' })],
      }),
    );
    expectData(
      await repository.saveClassSnapshot(b.id, {
        students: [createMockStudent({ name: 'From B' })],
      }),
    );

    expect(expectData(await repository.loadStudents())[0]?.name).toBe('From A');

    expectData(await repository.setActiveClass(b.id));
    expect(expectData(await repository.loadStudents())[0]?.name).toBe('From B');
  });

  it('refuses to read a snapshot when no class exists at all', async () => {
    const empty = new IndexedDBRepository();
    expectData(
      await empty.saveClassCollection({
        ...expectData(await empty.loadClassCollection()),
        classes: [],
        activeClassId: null,
      }),
    );

    const error = expectFailure(await empty.loadActiveClassSnapshot());
    expect(error.type).toBe(RepositoryErrorType.VALIDATION_ERROR);
  });

  it('reports NOT_FOUND when writing a snapshot for an unknown class', async () => {
    await repository.createClass({ name: 'A' }, { activate: true });

    const error = expectFailure(
      await repository.saveClassSnapshot('ghost', { students: [] }),
    );

    expect(error.type).toBe(RepositoryErrorType.NOT_FOUND);
  });
});

describe('classroom templates', () => {
  const template = (id: number, name: string): ClassroomTemplate => ({
    id,
    name,
    scene: createMockClassroomScene(1),
  });

  it('returns an empty list when nothing was stored', async () => {
    expect(expectData(await repository.loadTemplates())).toEqual([]);
  });

  it('appends, updates, renames and deletes templates', async () => {
    expectData(await repository.saveTemplate(template(1, 'Standard')));
    expectData(await repository.saveTemplate(template(2, 'U-Form')));
    expect(expectData(await repository.loadTemplates())).toHaveLength(2);

    const newScene = createMockClassroomScene(3);
    expectData(await repository.updateTemplate(1, newScene));
    expectData(await repository.renameTemplate(2, 'Kreis'));

    const templates = expectData(await repository.loadTemplates());
    expect(templates.find((t) => t.id === 1)?.scene.tables).toHaveLength(3);
    expect(templates.find((t) => t.id === 2)?.name).toBe('Kreis');

    expectData(await repository.deleteTemplate(1));
    expect(
      expectData(await repository.loadTemplates()).map((t) => t.id),
    ).toEqual([2]);
  });

  it('templates are shared, not per class', async () => {
    const a = expectData(
      await repository.createClass({ name: 'A' }, { activate: true }),
    );
    expectData(await repository.saveTemplate(template(1, 'Shared')));

    const b = expectData(await repository.createClass({ name: 'B' }));
    expectData(await repository.setActiveClass(b.id));

    expect(expectData(await repository.loadTemplates())).toHaveLength(1);
    expect(a.id).not.toBe(b.id);
  });
});

describe('clearAll', () => {
  it('removes every stored key', async () => {
    await repository.createClass({ name: 'A' }, { activate: true });
    await repository.saveTemplate({
      id: 1,
      name: 'T',
      scene: createMockClassroomScene(1),
    });

    expectData(await repository.clearAll());

    expect(memory.size).toBe(0);
  });
});

describe('storage failures', () => {
  it('turns a rejecting driver into a Result failure', async () => {
    const idb = await import('idb-keyval');
    vi.mocked(idb.set).mockRejectedValueOnce(new Error('quota exceeded'));

    const error = expectFailure(await repository.saveTemplates([]));

    expect(error.type).toBe(RepositoryErrorType.STORAGE_ERROR);
    expect(error.message).toContain('classroom templates');
  });
});
