// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';
import type { CircleLayout } from '@/types/Circle';
import { tableRowsFromFront } from '@/utils/algorithm/seatTargets';

/**
 * The note list: the class on paper, with room for handwriting beside every
 * name — a few ruled lines for observations, or a grid of empty columns to
 * tick off. The sheet stays blank on purpose: nothing written on it ever
 * comes back into the app, so no note about a child is stored anywhere.
 */

/** Ruled lines per student, or a grid of empty columns. */
export type NoteListForm = 'lines' | 'grid';

/**
 * Who comes first: by table as in the plan (front to back, then along the
 * board), round the circle, or by name.
 */
export type NoteListOrder = 'tables' | 'circle' | 'alphabetical';

export const NOTE_LIST_LINE_COUNTS = [1, 2, 3] as const;
export const NOTE_LIST_COLUMN_COUNTS = [5, 8, 12] as const;

export type NoteListSettings = {
  form: NoteListForm;
  lines: (typeof NOTE_LIST_LINE_COUNTS)[number];
  columns: (typeof NOTE_LIST_COLUMN_COUNTS)[number];
  order: NoteListOrder;
  orientation: 'portrait' | 'landscape';
  showPhotos: boolean;
  /**
   * Off by default: a list left lying on a desk should not say who is
   * restless.
   */
  showBadges: boolean;
};

export const DEFAULT_NOTE_LIST_SETTINGS: NoteListSettings = {
  form: 'lines',
  lines: 2,
  columns: 8,
  order: 'tables',
  orientation: 'portrait',
  showPhotos: false,
  showBadges: false,
};

const pick = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** Read stored settings, keeping every valid field and defaulting the rest. */
export function normalizeNoteListSettings(stored: unknown): NoteListSettings {
  const source =
    stored && typeof stored === 'object'
      ? (stored as Record<string, unknown>)
      : {};
  const d = DEFAULT_NOTE_LIST_SETTINGS;
  return {
    form: pick(source.form, ['lines', 'grid'] as const, d.form),
    lines: pick(source.lines, NOTE_LIST_LINE_COUNTS, d.lines),
    columns: pick(source.columns, NOTE_LIST_COLUMN_COUNTS, d.columns),
    order: pick(
      source.order,
      ['tables', 'circle', 'alphabetical'] as const,
      d.order,
    ),
    orientation: pick(
      source.orientation,
      ['portrait', 'landscape'] as const,
      d.orientation,
    ),
    showPhotos:
      typeof source.showPhotos === 'boolean' ? source.showPhotos : d.showPhotos,
    showBadges:
      typeof source.showBadges === 'boolean' ? source.showBadges : d.showBadges,
  };
}

export type NoteListEntry = {
  student: Student;
  /** Running number on the list, from 1. */
  number: number;
  /**
   * By table only: the table's number on the list (1, 2, …), or `null` for a
   * student without a seat. Absent in the other orders.
   */
  table?: number | null;
  /** The first student of a table, where a stronger rule separates groups. */
  groupStart: boolean;
};

/**
 * The students in the order the list prints them.
 *
 * By table, the tables come row by row away from the board and, within a
 * row, along it as drawn — the way a teacher walks the room, which is what
 * makes the list more than the roster. Only tables someone sits at get a
 * number, a table out of the mix included when a student was put there by
 * hand. Round the circle the order is the circle's. In both, whoever has no
 * place comes last. A seat that names a student no longer in the class is
 * skipped.
 */
export function buildNoteListEntries(
  students: readonly Student[],
  {
    order,
    seating,
    scene,
    circleLayout,
    locale,
  }: {
    order: NoteListOrder;
    seating?: SeatingArrangement;
    scene?: ClassroomScene;
    circleLayout?: CircleLayout | null;
    locale?: string;
  },
): NoteListEntry[] {
  if (order === 'alphabetical') {
    return [...students]
      .sort((a, b) =>
        a.name.localeCompare(b.name, locale, { sensitivity: 'base' }),
      )
      .map((student, index) => ({
        student,
        number: index + 1,
        groupStart: false,
      }));
  }

  const byId = new Map(students.map((student) => [student.id, student]));
  const placed = new Set<string>();
  const take = (seat: Student | null | undefined): Student | null => {
    if (!seat) return null;
    const student = byId.get(seat.id);
    if (!student || placed.has(student.id)) return null;
    placed.add(student.id);
    return student;
  };

  const entries: NoteListEntry[] = [];
  const push = (student: Student, table: number | null | undefined) => {
    const previous = entries[entries.length - 1];
    entries.push({
      student,
      number: entries.length + 1,
      ...(order === 'tables' ? { table } : {}),
      groupStart:
        order === 'tables' && entries.length > 0 && previous?.table !== table,
    });
  };

  if (order === 'circle') {
    for (const position of circleLayout?.students ?? []) {
      const student = take(position?.student);
      if (student) push(student, undefined);
    }
  } else {
    const tableOrder = scene
      ? tableRowsFromFront(scene, () => true).flatMap((row) =>
          [...row]
            .sort((a, b) => a.lateral - b.lateral || a.index - b.index)
            .map(({ index }) => index),
        )
      : [];
    // Tables the scene does not know (a stale arrangement) follow in order.
    const known = new Set(tableOrder);
    (seating ?? []).forEach((_, index) => {
      if (!known.has(index)) tableOrder.push(index);
    });

    let tableNumber = 0;
    for (const index of tableOrder) {
      const seated = (seating?.[index] ?? [])
        .map(take)
        .filter((student): student is Student => student !== null);
      if (seated.length === 0) continue;
      tableNumber += 1;
      for (const student of seated) push(student, tableNumber);
    }
  }

  for (const student of students) {
    if (!placed.has(student.id)) {
      placed.add(student.id);
      push(student, order === 'tables' ? null : undefined);
    }
  }
  return entries;
}

/**
 * Vertical measures of the list in PostScript points (72 per inch), the unit
 * of the export page. A handwritten line wants about 8 mm.
 */
export const NOTE_LIST_METRICS = {
  /** The column heads; the grid's are taller, for a date or a topic. */
  headRow: { lines: 18, grid: 30 },
  linePitch: 22,
  gridRowMin: 18,
  gridRowMax: 30,
  /** The page number at the foot of the area. */
  footer: 14,
} as const;

/**
 * The height of one student's row. Ruled lines take a fixed pitch; the grid
 * shares the page between the class, between a comfortable and a tight row,
 * so a small class gets room to write and a full one fits on one page.
 */
export function noteListRowHeight(
  settings: Pick<NoteListSettings, 'form' | 'lines'>,
  count: number,
  available: number,
): number {
  if (settings.form === 'lines') {
    return settings.lines * NOTE_LIST_METRICS.linePitch;
  }
  const share = count > 0 ? available / count : NOTE_LIST_METRICS.gridRowMax;
  return Math.max(
    NOTE_LIST_METRICS.gridRowMin,
    Math.min(NOTE_LIST_METRICS.gridRowMax, Math.floor(share * 10) / 10),
  );
}

/**
 * Cut the list into pages of as many rows as the area holds. Every page
 * holds at least one row, and an empty list is one empty page.
 */
export function paginateNoteList<T>(
  entries: readonly T[],
  rowHeight: number,
  available: number,
): T[][] {
  const perPage = Math.max(1, Math.floor(available / rowHeight));
  if (entries.length === 0) return [[]];
  const pages: T[][] = [];
  for (let start = 0; start < entries.length; start += perPage) {
    pages.push(entries.slice(start, start + perPage));
  }
  return pages;
}
