// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import type { ClassroomScene, Student } from '@/types';
import type { CircleLayout } from '@/types/Circle';
import { createMockStudent, createMockTable } from '@/__tests__/utils';
import {
  buildNoteListEntries,
  DEFAULT_NOTE_LIST_SETTINGS,
  NOTE_LIST_METRICS,
  normalizeNoteListSettings,
  noteListRowHeight,
  paginateNoteList,
} from '../noteList';

/**
 * Two rows of two double desks under a board on the top wall, the second
 * desk of each row drawn first so the index order is not the reading order:
 *
 *        [ board ]
 *   t1        t0      row 1
 *   t3        t2      row 2
 */
const scene: ClassroomScene = {
  totalStudents: 8,
  tables: [
    createMockTable({ x: 500, y: 100, width: 120, height: 60 }),
    createMockTable({ x: 200, y: 100, width: 120, height: 60 }),
    createMockTable({ x: 500, y: 300, width: 120, height: 60 }),
    createMockTable({ x: 200, y: 300, width: 120, height: 60 }),
  ],
  features: [
    {
      id: 'board-1',
      type: 'board',
      x: 300,
      y: 0,
      width: 300,
      height: 20,
      anchor: 'top',
      movable: true,
    },
  ],
};

const student = (id: string, name = id): Student =>
  createMockStudent({ id, name });

const names = (entries: { student: Student }[]) =>
  entries.map((entry) => entry.student.id);

describe('buildNoteListEntries', () => {
  const [a, b, c, d, e] = ['a', 'b', 'c', 'd', 'e'].map((id) => student(id));

  it('goes row by row from the board, and along each row as drawn', () => {
    const seating = [[a!, null], [b!, c!], [d!], []];

    const entries = buildNoteListEntries([a!, b!, c!, d!], {
      order: 'tables',
      seating,
      scene,
    });

    expect(names(entries)).toEqual(['b', 'c', 'a', 'd']);
    expect(entries.map((entry) => entry.table)).toEqual([1, 1, 2, 3]);
    expect(entries.map((entry) => entry.number)).toEqual([1, 2, 3, 4]);
    expect(entries.map((entry) => entry.groupStart)).toEqual([
      false,
      false,
      true,
      true,
    ]);
  });

  it('numbers only the tables someone sits at', () => {
    const seating = [[a!], [], [], [b!]];

    const entries = buildNoteListEntries([a!, b!], {
      order: 'tables',
      seating,
      scene,
    });

    expect(entries.map((entry) => entry.table)).toEqual([1, 2]);
  });

  it('lists a student put by hand at a table out of the mix', () => {
    const withInactive: ClassroomScene = {
      ...scene,
      tables: scene.tables.map((table, index) =>
        index === 1 ? { ...table, inactive: true } : table,
      ),
    };

    const entries = buildNoteListEntries([a!, b!], {
      order: 'tables',
      seating: [[b!], [a!], [], []],
      scene: withInactive,
    });

    expect(names(entries)).toEqual(['a', 'b']);
  });

  it('puts whoever has no seat last, without a table', () => {
    const entries = buildNoteListEntries([e!, a!], {
      order: 'tables',
      seating: [[a!], [], [], []],
      scene,
    });

    expect(names(entries)).toEqual(['a', 'e']);
    expect(entries[1]).toMatchObject({ table: null, groupStart: true });
  });

  it('skips a seat whose student has left the class', () => {
    const entries = buildNoteListEntries([a!], {
      order: 'tables',
      seating: [[student('gone'), a!], [], [], []],
      scene,
    });

    expect(names(entries)).toEqual(['a']);
  });

  it('follows the circle and leaves out the table column', () => {
    const circleLayout = {
      students: [{ student: c! }, { student: null }, { student: a! }],
    } as unknown as CircleLayout;

    const entries = buildNoteListEntries([a!, b!, c!], {
      order: 'circle',
      circleLayout,
    });

    expect(names(entries)).toEqual(['c', 'a', 'b']);
    expect(entries.every((entry) => entry.table === undefined)).toBe(true);
    expect(entries.some((entry) => entry.groupStart)).toBe(false);
  });

  it('sorts by name, umlauts where German puts them', () => {
    const entries = buildNoteListEntries(
      [student('1', 'Zoe'), student('2', 'Ömer'), student('3', 'Anna')],
      { order: 'alphabetical', locale: 'de' },
    );

    expect(entries.map((entry) => entry.student.name)).toEqual([
      'Anna',
      'Ömer',
      'Zoe',
    ]);
  });
});

describe('normalizeNoteListSettings', () => {
  it('defaults what is missing or invalid and keeps the rest', () => {
    expect(
      normalizeNoteListSettings({ form: 'grid', lines: 7, order: 'nonsense' }),
    ).toEqual({ ...DEFAULT_NOTE_LIST_SETTINGS, form: 'grid' });
  });

  it('survives a value that is not an object', () => {
    expect(normalizeNoteListSettings('grid')).toEqual(
      DEFAULT_NOTE_LIST_SETTINGS,
    );
  });
});

describe('row height and pages', () => {
  it('gives ruled lines a fixed pitch', () => {
    expect(noteListRowHeight({ form: 'lines', lines: 3 }, 36, 700)).toBe(
      3 * NOTE_LIST_METRICS.linePitch,
    );
  });

  it('shares the page among a small class, up to a comfortable row', () => {
    expect(noteListRowHeight({ form: 'grid', lines: 2 }, 10, 700)).toBe(
      NOTE_LIST_METRICS.gridRowMax,
    );
  });

  it('fits a full class onto one portrait page as a grid', () => {
    const available = 700;
    const rowHeight = noteListRowHeight({ form: 'grid', lines: 2 }, 36, 700);

    expect(rowHeight).toBeGreaterThanOrEqual(NOTE_LIST_METRICS.gridRowMin);
    expect(
      paginateNoteList(Array.from({ length: 36 }), rowHeight, available),
    ).toHaveLength(1);
  });

  it('cuts a longer list into full pages', () => {
    const pages = paginateNoteList(
      Array.from({ length: 36 }, (_, i) => i),
      44,
      700,
    );

    expect(pages.map((page) => page.length)).toEqual([15, 15, 6]);
  });

  it('draws an empty list as one empty page', () => {
    expect(paginateNoteList([], 44, 700)).toEqual([[]]);
  });
});
