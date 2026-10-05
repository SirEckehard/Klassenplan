// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import type { ClassSummary, MixResult, PlanUsage, SavedPlan } from '@/types';
import type { LibraryClass } from '@/hooks/library/useClassLibrary';
import {
  createMockClassroomScene,
  createMockMixResult,
  createMockSavedPlan,
  createMockStudent,
  createMockTemplate,
} from '@/__tests__/utils';
import {
  buildLibraryColumns,
  defaultLibraryPath,
  libraryKey,
  neighboursByStudent,
} from '../libraryColumns';

const t = i18n.getFixedT('de', 'generator');

const summary = (id: string, name: string): ClassSummary => ({
  id,
  name,
  createdAt: '2026-10-04',
  updatedAt: '2026-10-04',
  studentCount: 24,
});

const plan = (id: string, roomId: string, extra: Partial<SavedPlan> = {}) =>
  createMockSavedPlan({ id, name: id, roomId, date: '2026-10-04', ...extra });

const mix = (id: number, timestamp: string): MixResult =>
  createMockMixResult({ id, timestamp, roomId: 'lab' });

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

const library: LibraryClass = {
  id: '7b',
  name: '7b',
  isOpen: true,
  students: [
    createMockStudent({ id: 'c', name: 'Carla' }),
    createMockStudent({ id: 'a', name: 'Anna' }),
    createMockStudent({ id: 'b', name: 'Ben' }),
  ],
  rooms: [
    {
      id: 'classroom',
      name: 'Klassenraum',
      scene: createMockClassroomScene(2),
      isOpen: true,
    },
    {
      id: 'lab',
      name: 'Labor',
      scene: createMockClassroomScene(3),
      isOpen: false,
    },
  ],
  activeRoomId: 'classroom',
  activePlanId: 'oct',
  plans: [
    plan('sept', 'classroom'),
    plan('oct', 'classroom'),
    plan('auto', 'classroom', { autoSaved: true }),
    plan('chem', 'lab'),
  ],
  mixes: [
    mix(1, '2026-10-01T08:00:00.000Z'),
    mix(2, '2026-10-03T08:00:00.000Z'),
  ],
};

const usage = [
  record('u1', ['a::b', 'a::c'], '2026-09-01T08:00:00.000Z'),
  record('u2', ['a::b'], '2026-10-01T08:00:00.000Z'),
  record('u3', ['b::c'], '2026-10-02T08:00:00.000Z', { confirmed: false }),
];

const build = (
  path: string[],
  selected: LibraryClass | null = library,
  planUsage: PlanUsage[] = usage,
) =>
  buildLibraryColumns({
    path,
    classes: [summary('7b', '7b'), summary('8c', '8c')],
    openClassId: '7b',
    selected,
    loadingClass: false,
    templates: [createMockTemplate({ id: 5, name: 'Turnhalle' })],
    planUsage,
    t,
  });

const labelsOf = (
  columns: ReturnType<typeof build>['columns'],
  index: number,
) =>
  columns[index]!.groups.flatMap((group) =>
    group.items.map((item) => item.label),
  );

const classKey = libraryKey({ kind: 'class', classId: '7b' });
const classroomKey = libraryKey({
  kind: 'room',
  classId: '7b',
  roomId: 'classroom',
});

describe('buildLibraryColumns', () => {
  it('lists the classes and, apart from them, the templates', () => {
    const { columns } = build([]);

    expect(columns).toHaveLength(1);
    expect(labelsOf(columns, 0)).toEqual(['7b', '8c', 'Raumvorlagen']);
  });

  it('shows a class with its rooms, its recent mixes and neighbourhoods', () => {
    const { columns, path } = build([classKey]);

    expect(path).toEqual([classKey]);
    expect(columns[1]!.groups.map((group) => group.label)).toEqual([
      'Räume',
      'Verlauf',
    ]);
    expect(labelsOf(columns, 1)).toEqual([
      'Klassenraum',
      'Labor',
      'Letzte Mischungen',
      'Nachbarschaften',
    ]);
  });

  it('lists a room’s plans newest first and nothing of other rooms', () => {
    const { columns } = build([classKey, classroomKey]);

    expect(labelsOf(columns, 2)).toEqual(['auto', 'oct', 'sept']);
  });

  it('lists the recent mixes newest first', () => {
    const { columns } = build([
      classKey,
      libraryKey({ kind: 'mixes', classId: '7b' }),
    ]);

    const items = columns[2]!.groups[0]!.items;
    expect(items.map((item) => item.key)).toEqual([
      libraryKey({ kind: 'mix', classId: '7b', mixId: 2 }),
      libraryKey({ kind: 'mix', classId: '7b', mixId: 1 }),
    ]);
    expect(items[0]!.meta).toBe('Labor');
  });

  // A pair of two full names does not fit a column: the students stand in
  // one, a student's neighbours in the next.
  it('lists the students under the neighbourhoods, by name', () => {
    const neighboursKey = libraryKey({ kind: 'neighbours', classId: '7b' });

    const { columns } = build([classKey, neighboursKey]);

    const folder = columns[1]!.groups[1]!.items[1]!;
    expect(folder.isFolder).toBe(true);
    expect(folder.meta).toBe('2 gewertete Pläne');
    expect(labelsOf(columns, 2)).toEqual(['Anna', 'Ben', 'Carla']);
    expect(columns[2]!.groups[0]!.items.map((item) => item.meta)).toEqual([
      'neben 2 Mitschülern',
      'neben 1 Mitschüler',
      'neben 1 Mitschüler',
    ]);
  });

  it('lists a student’s neighbours, most often first', () => {
    const { columns, path } = build([
      classKey,
      libraryKey({ kind: 'neighbours', classId: '7b' }),
      libraryKey({ kind: 'neighbourStudent', classId: '7b', studentId: 'a' }),
      libraryKey({
        kind: 'neighbourPair',
        classId: '7b',
        studentId: 'a',
        neighbourId: 'b',
      }),
    ]);

    expect(path).toHaveLength(4);
    expect(labelsOf(columns, 3)).toEqual(['Ben', 'Carla']);
  });

  it('says so when a student sat next to nobody yet', () => {
    const { columns } = build(
      [
        classKey,
        libraryKey({ kind: 'neighbours', classId: '7b' }),
        libraryKey({ kind: 'neighbourStudent', classId: '7b', studentId: 'c' }),
      ],
      library,
      [],
    );

    expect(columns[2]!.groups[0]!.items[2]!.meta).toBe('noch neben niemandem');
    expect(labelsOf(columns, 3)).toEqual([]);
    expect(columns[3]!.emptyText).toMatch(/Carla/);
  });

  it('lists the templates under their folder', () => {
    const { columns } = build(['templates']);

    expect(labelsOf(columns, 1)).toEqual(['Turnhalle']);
  });

  it('ends the path where an entry is no longer there', () => {
    const gone = libraryKey({ kind: 'plan', classId: '7b', planId: 'gone' });

    const { path, columns } = build([classKey, classroomKey, gone]);

    expect(path).toEqual([classKey, classroomKey]);
    expect(columns[2]!.selectedKey).toBeNull();
  });

  it('says a class is being read until it is', () => {
    const { columns } = buildLibraryColumns({
      path: [libraryKey({ kind: 'class', classId: '8c' })],
      classes: [summary('7b', '7b'), summary('8c', '8c')],
      openClassId: '7b',
      selected: null,
      loadingClass: true,
      templates: [],
      planUsage: [],
      t,
    });

    expect(columns[1]!.groups).toEqual([]);
    expect(columns[1]!.emptyText).toMatch(/geladen/);
  });
});

describe('neighboursByStudent', () => {
  it('counts each pair from both sides and leaves withdrawn plans out', () => {
    const byStudent = neighboursByStudent(usage);

    expect(byStudent.get('a')).toEqual([
      { studentId: 'b', count: 2, lastSeenAt: '2026-10-01T08:00:00.000Z' },
      { studentId: 'c', count: 1, lastSeenAt: '2026-09-01T08:00:00.000Z' },
    ]);
    expect(byStudent.get('c')).toEqual([
      { studentId: 'a', count: 1, lastSeenAt: '2026-09-01T08:00:00.000Z' },
    ]);
  });
});

describe('defaultLibraryPath', () => {
  it('leads to the open plan in its room in its class', () => {
    expect(defaultLibraryPath('7b', 'classroom', 'oct')).toEqual([
      classKey,
      classroomKey,
      libraryKey({ kind: 'plan', classId: '7b', planId: 'oct' }),
    ]);
    expect(defaultLibraryPath('7b', 'classroom', null)).toEqual([
      classKey,
      classroomKey,
    ]);
    expect(defaultLibraryPath(null, null, null)).toEqual([]);
  });
});
