// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import type { ClassSummary, MixResult, SavedPlan } from '@/types';
import type { LibraryClass } from '@/hooks/library/useClassLibrary';
import {
  createMockClassroomScene,
  createMockMixResult,
  createMockSavedPlan,
  createMockTemplate,
} from '@/__tests__/utils';
import {
  buildLibraryColumns,
  defaultLibraryPath,
  libraryKey,
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

const library: LibraryClass = {
  id: '7b',
  name: '7b',
  isOpen: true,
  students: [],
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

const build = (path: string[], selected: LibraryClass | null = library) =>
  buildLibraryColumns({
    path,
    classes: [summary('7b', '7b'), summary('8c', '8c')],
    openClassId: '7b',
    selected,
    loadingClass: false,
    templates: [createMockTemplate({ id: 5, name: 'Turnhalle' })],
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
      t,
    });

    expect(columns[1]!.groups).toEqual([]);
    expect(columns[1]!.emptyText).toMatch(/geladen/);
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
