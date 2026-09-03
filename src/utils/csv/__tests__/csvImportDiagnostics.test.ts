// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, test, expect } from 'vitest';
import {
  diagnoseCsvStructure,
  diagnoseUnsupportedFile,
  formatColumnList,
  getFileExtension,
} from '@/utils/csv/csvImportDiagnostics';

const file = (name: string): File => new File(['x'], name);

describe('getFileExtension', () => {
  test.each([
    ['klasse.csv', 'csv'],
    ['Klassenliste 8B.XLSX', 'xlsx'],
    ['archiv.tar.gz', 'gz'],
    ['ohnePunkt', ''],
    ['.gitignore', ''],
    ['endetMitPunkt.', ''],
  ])('%s → "%s"', (name, expected) => {
    expect(getFileExtension(name)).toBe(expected);
  });
});

describe('formatColumnList', () => {
  test('lists columns as they were spelled in the file', () => {
    expect(formatColumnList(['Vorname', 'Nachname'])).toBe('Vorname, Nachname');
  });

  test('truncates long header rows', () => {
    expect(formatColumnList(['a', 'b', 'c', 'd', 'e', 'f'])).toBe(
      'a, b, c, d …',
    );
  });
});

describe('diagnoseUnsupportedFile', () => {
  test.each([
    ['liste.xlsx', 'toast:csv.fileTypeExcel'],
    ['liste.xls', 'toast:csv.fileTypeExcel'],
    ['liste.ods', 'toast:csv.fileTypeSpreadsheet'],
    ['liste.numbers', 'toast:csv.fileTypeSpreadsheet'],
    ['backup.json', 'toast:csv.fileTypeBackup'],
    ['liste.txt', 'toast:csv.fileTypeText'],
    ['liste.pdf', 'toast:csv.fileTypeDocument'],
    ['foto.HEIC', 'toast:csv.fileTypeImage'],
    ['liste.xyz', 'toast:csv.fileTypeUnknown'],
    ['liste', 'toast:csv.fileTypeUnknown'],
  ])('%s → %s', (name, messageKey) => {
    const diagnosis = diagnoseUnsupportedFile(file(name));
    expect(diagnosis.messageKey).toBe(messageKey);
    expect(diagnosis.values.fileName).toBe(name);
  });

  test('does not offer the CSV example for a backup file', () => {
    // A backup is not a malformed CSV — the fix is a different button.
    expect(diagnoseUnsupportedFile(file('backup.json')).offerFormatHelp).toBe(
      false,
    );
    expect(diagnoseUnsupportedFile(file('liste.xlsx')).offerFormatHelp).toBe(
      true,
    );
  });
});

describe('diagnoseCsvStructure', () => {
  const base = {
    fileName: 'klasse.csv',
    headers: ['Name', 'Geschlecht'],
    rowCount: 3,
    hasNameColumn: true,
    hasRecognizedHeaders: true,
  };

  test('passes a usable file', () => {
    expect(diagnoseCsvStructure(base)).toBeNull();
  });

  test('reports an empty file', () => {
    expect(
      diagnoseCsvStructure({ ...base, headers: [], rowCount: 0 })?.messageKey,
    ).toBe('toast:csv.emptyFile');
  });

  test('treats blank-only headers as empty', () => {
    expect(
      diagnoseCsvStructure({ ...base, headers: ['', '  '] })?.messageKey,
    ).toBe('toast:csv.emptyFile');
  });

  test('reports a single column full of semicolons as a delimiter problem', () => {
    expect(
      diagnoseCsvStructure({
        ...base,
        headers: ['Name;Geschlecht;Unruhig'],
        hasNameColumn: false,
        hasRecognizedHeaders: false,
      })?.messageKey,
    ).toBe('toast:csv.delimiterMismatch');
  });

  test('asks to rename a column when headers exist but none is a name', () => {
    const diagnosis = diagnoseCsvStructure({
      ...base,
      headers: ['Schüler', 'Geschlecht'],
      hasNameColumn: false,
    });
    expect(diagnosis?.messageKey).toBe('toast:csv.noNameColumn');
    expect(diagnosis?.values.columns).toBe('Schüler, Geschlecht');
  });

  test('asks for a header row when the file starts with data', () => {
    const diagnosis = diagnoseCsvStructure({
      ...base,
      headers: ['Max Mustermann', 'Junge'],
      hasNameColumn: false,
      hasRecognizedHeaders: false,
    });
    expect(diagnosis?.messageKey).toBe('toast:csv.noHeaderRow');
  });

  test('reports a header-only file', () => {
    expect(diagnoseCsvStructure({ ...base, rowCount: 0 })?.messageKey).toBe(
      'toast:csv.noRows',
    );
  });
});
