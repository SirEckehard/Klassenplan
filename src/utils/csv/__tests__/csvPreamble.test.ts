// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, test } from 'vitest';
import { stripCsvPreamble } from '@/utils/csv/csvPreamble';

describe('stripCsvPreamble', () => {
  test('drops a title line above the header row', () => {
    const chunk =
      'Schülerliste 5a — Stand 01.09.2026\nVorname,Nachname\nAnna,Müller\n';

    expect(stripCsvPreamble(chunk)).toBe('Vorname,Nachname\nAnna,Müller\n');
  });

  test('drops a title line and the blank line after it', () => {
    const chunk = 'Export 5a\n\nVorname;Nachname\nAnna;Müller\n';

    expect(stripCsvPreamble(chunk)).toBe('Vorname;Nachname\nAnna;Müller\n');
  });

  test('leaves a file whose first line is already the header', () => {
    expect(stripCsvPreamble('Vorname,Nachname\nAnna,Müller\n')).toBeUndefined();
  });

  test('leaves a file with no recognisable header alone', () => {
    // Better to let the import report "no header row" than to throw away a
    // line that might be a student.
    expect(stripCsvPreamble('Anna,Müller\nBen,Schmidt\n')).toBeUndefined();
  });

  test('gives up after five lines', () => {
    const chunk = 'a\nb\nc\nd\ne\nf\nVorname,Nachname\nAnna,Müller\n';

    expect(stripCsvPreamble(chunk)).toBeUndefined();
  });

  test('does not treat a single-column line as a header row', () => {
    // "Name" on its own is a title, not a table.
    expect(stripCsvPreamble('Klassenliste\nName\nAnna\n')).toBeUndefined();
  });
});
