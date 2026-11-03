// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassRecord } from '@/types';
import i18n from '@/i18n';
import type { ConfirmFact } from './ConfirmDialog';

/** What a question counts, in the words of the language on screen. */
type FactKind =
  'classes' | 'students' | 'rooms' | 'plans' | 'mixes' | 'templates';

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

/** What goes with everything: each class's contents, and the templates. */
export function allDataFacts(
  classes: readonly ClassContents[],
  templateCount: number,
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
    fact('templates', templateCount),
  ];
}
