// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassRecord } from '@/types';
import i18n from '@/i18n';
import type { ConfirmFact } from './ConfirmDialog';

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
