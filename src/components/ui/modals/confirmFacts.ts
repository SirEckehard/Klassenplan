// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassRecord } from '@/types';
import i18n from '@/i18n';
import type { ConfirmComparison, ConfirmFact } from './ConfirmDialog';

/** What a question counts, in the words of the language on screen. */
type FactKind =
  | 'classes'
  | 'students'
  | 'rooms'
  | 'plans'
  | 'mixes'
  | 'templates'
  | 'presets'
  | 'duties'
  | 'photos'
  | 'tables'
  | 'seats'
  | 'cardFiles';

function fact(kind: FactKind, count: number): ConfirmFact {
  return {
    label: i18n.t(`dialogs.facts.${kind}`, { ns: 'common', count }),
    count,
  };
}

type ClassContents = Pick<
  ClassRecord,
  'students' | 'rooms' | 'seatingHistory' | 'mixHistory'
>;

/** What goes with a class. */
export function classFacts(record: ClassContents): ConfirmFact[] {
  return [
    fact('students', record.students.length),
    fact('rooms', record.rooms?.length ?? 0),
    fact('plans', record.seatingHistory.length),
    fact('mixes', record.mixHistory.length),
  ];
}

/** What goes with a room: its saved plans and its mixes. */
export function roomFacts(planCount: number, mixCount: number): ConfirmFact[] {
  return [fact('plans', planCount), fact('mixes', mixCount)];
}

/** What a room brings: its tables and their seats. */
export function tableFacts(tables: number, seats: number): ConfirmFact[] {
  return [fact('tables', tables), fact('seats', seats)];
}

/** What is kept beside the classes, counted for a wipe of everything. */
export type StoredBesideClasses = {
  templates: number;
  /** The teacher's own presets (decision 0038). */
  presets: number;
  duties: number;
  photos: number;
  /** The table cards' own font and picture (decision 0047). */
  cardFiles: number;
};

/**
 * What goes with everything: each class's contents, the templates, the own
 * presets, the duties, the photos and the table cards' own files.
 */
export function allDataFacts(
  classes: readonly ClassContents[],
  beside: StoredBesideClasses,
): ConfirmFact[] {
  const sum = (count: (entry: ClassContents) => number) =>
    classes.reduce((total, entry) => total + count(entry), 0);
  return [
    fact('classes', classes.length),
    fact(
      'students',
      sum((entry) => entry.students.length),
    ),
    fact(
      'plans',
      sum((entry) => entry.seatingHistory.length),
    ),
    fact(
      'mixes',
      sum((entry) => entry.mixHistory.length),
    ),
    fact('templates', beside.templates),
    fact('presets', beside.presets),
    fact('duties', beside.duties),
    fact('photos', beside.photos),
    fact('cardFiles', beside.cardFiles),
  ];
}

/**
 * The classes of two states counted side by side: how many classes, students,
 * rooms, plans and mixes each holds. The label takes the larger count's form.
 */
export function compareClassFacts(
  first: readonly ClassContents[],
  second: readonly ClassContents[],
): ConfirmComparison['rows'] {
  const counts: [FactKind, (entry: ClassContents) => number][] = [
    ['classes', () => 1],
    ['students', (entry) => entry.students.length],
    ['rooms', (entry) => entry.rooms?.length ?? 0],
    ['plans', (entry) => entry.seatingHistory.length],
    ['mixes', (entry) => entry.mixHistory.length],
  ];
  const sum = (
    classes: readonly ClassContents[],
    count: (entry: ClassContents) => number,
  ) => classes.reduce((total, entry) => total + count(entry), 0);
  return counts.map(([kind, count]) => {
    const pair = [sum(first, count), sum(second, count)] as const;
    return {
      label: i18n.t(`dialogs.facts.${kind}`, {
        ns: 'common',
        count: Math.max(...pair),
      }),
      counts: pair,
    };
  });
}
