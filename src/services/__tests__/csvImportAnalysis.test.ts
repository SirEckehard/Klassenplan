// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  analyzeCsvFile,
  importStudentsFromCsv,
} from '@/services/csvImportService';
import { CsvImportError } from '@/utils/csv/csvImportDiagnostics';

vi.mock('@/utils/ui/toast', () => ({
  showToast: vi.fn(),
  TOAST_MESSAGES: {
    CSV_PARSE_ERROR: 'CSV_PARSE_ERROR',
    STUDENT_MAX_REACHED: 'STUDENT_MAX_REACHED',
    CSV_READ_ERROR: 'CSV_READ_ERROR',
  },
}));
import { showToast } from '@/utils/ui/toast';

const mockedShowToast = vi.mocked(showToast);

beforeEach(() => {
  vi.clearAllMocks();
});

const csvFile = (content: string, name = 'klasse.csv'): File =>
  new File([content], name, { type: 'text/csv' });

const singleErrorMessage = (): string => {
  const errors = mockedShowToast.mock.calls.filter(
    ([type]) => type === 'error',
  );
  // One problem must produce exactly one toast — two used to stack up here.
  expect(errors).toHaveLength(1);
  return errors[0][1];
};

describe('csvImportService.analyzeCsvFile', () => {
  test('accepts a well-formed class list', async () => {
    const analysis = await analyzeCsvFile(
      csvFile('Name,Geschlecht\nMax Mustermann,Junge\n'),
    );

    expect(analysis.nameInfo.hasFullName).toBe(true);
    expect(analysis.requiresNameSelection).toBe(false);
    expect(analysis.previewData).toHaveLength(1);
    expect(mockedShowToast).not.toHaveBeenCalled();
  });

  test('asks which name column to use when the file has several', async () => {
    const analysis = await analyzeCsvFile(
      csvFile('Vorname,Nachname\nMax,Mustermann\n'),
    );

    expect(analysis.requiresNameSelection).toBe(true);
  });

  test('reports a missing name column once, naming the found columns', async () => {
    // Known columns, but none of them holds a name.
    await expect(
      analyzeCsvFile(csvFile('Geschlecht,Unruhig\nJunge,ja\n')),
    ).rejects.toBeInstanceOf(CsvImportError);

    const message = singleErrorMessage();
    expect(message).toContain('klasse.csv');
    expect(message).toContain('Geschlecht');
  });

  test('accepts "Schüler" as the name column', async () => {
    const analysis = await analyzeCsvFile(
      csvFile('Schüler,Geschlecht\nMax,Junge\n'),
    );

    expect(analysis.nameInfo.hasFullName).toBe(true);
    expect(analysis.requiresNameSelection).toBe(false);
  });

  test('reports a missing header row when the file starts with data', async () => {
    await expect(
      analyzeCsvFile(csvFile('Max Mustermann,Junge\nAnna Beispiel,Mädchen\n')),
    ).rejects.toBeInstanceOf(CsvImportError);

    expect(singleErrorMessage()).toContain('Max Mustermann');
  });

  test('reports a file that only has headers', async () => {
    await expect(
      analyzeCsvFile(csvFile('Name,Geschlecht\n')),
    ).rejects.toBeInstanceOf(CsvImportError);

    expect(singleErrorMessage()).toContain('klasse.csv');
  });

  test('reports a wrong file type before trying to parse it', async () => {
    await expect(
      analyzeCsvFile(new File(['x'], 'klasse.xlsx')),
    ).rejects.toBeInstanceOf(CsvImportError);

    expect(singleErrorMessage()).toContain('klasse.xlsx');
  });
});

describe('csvImportService.analyzeCsvFile preset and class detection', () => {
  test('reports the recognised export format', async () => {
    const analysis = await analyzeCsvFile(
      csvFile('Langname,Vorname,Kurzname\nMüller,Anna,MUEA\n', 'untis.csv'),
    );

    expect(analysis.preset?.id).toBe('webuntis');
    expect(analysis.preset?.vendor).toBe('WebUntis');
  });

  test('reports no format for an ordinary class list', async () => {
    const analysis = await analyzeCsvFile(
      csvFile('Vorname,Nachname\nAnna,Müller\n'),
    );

    expect(analysis.preset).toBeNull();
  });

  test('lists the classes of a multi-class export', async () => {
    const analysis = await analyzeCsvFile(
      csvFile(
        'Vorname,Nachname,Klasse\nAnna,Müller,5a\nBen,Schmidt,8b\n',
        'schule.csv',
      ),
    );

    expect(analysis.classOptions).toEqual(['5a', '8b']);
    expect(analysis.classKey).toBe('klasse');
  });

  test('stays quiet about classes when the file holds only one', async () => {
    const analysis = await analyzeCsvFile(
      csvFile('Vorname,Nachname,Klasse\nAnna,Müller,5a\nBen,Schmidt,5a\n'),
    );

    expect(analysis.classOptions).toEqual([]);
    expect(analysis.classKey).toBeUndefined();
  });

  test('imports a file whose header row sits below a title line', async () => {
    const analysis = await analyzeCsvFile(
      csvFile('Schülerliste 5a\nVorname,Nachname\nAnna,Müller\n', 'titel.csv'),
    );

    expect(analysis.nameInfo.hasFirstName).toBe(true);
    expect(
      mockedShowToast.mock.calls.filter(([type]) => type === 'error'),
    ).toHaveLength(0);
  });
});

describe('csvImportService feedback', () => {
  const toastsOfType = (type: string): string[] =>
    mockedShowToast.mock.calls
      .filter(([kind]) => kind === type)
      .map(([, message]) => message);

  test('names the recognised export format in the success message', async () => {
    const students = await importStudentsFromCsv({
      file: csvFile(
        'Nachname,Vorname,Geschlecht,Jahrgang\nMüller,Anna,4,5\n',
        'schild.csv',
      ),
      currentStudentCount: 0,
    });

    expect(students).toHaveLength(1);
    expect(toastsOfType('success')[0]).toContain('SchILD-NRW');
  });

  test('falls back to the plain success message without a preset', async () => {
    await importStudentsFromCsv({
      file: csvFile('Vorname,Nachname\nAnna,Müller\n'),
      currentStudentCount: 0,
      mode: 'firstName',
    });

    expect(toastsOfType('success')[0]).not.toContain('SchILD');
  });

  test('points out that a file was read as a Windows export', async () => {
    // "Name,Geschlecht\nMüller,w\n" in windows-1252.
    const bytes = Uint8Array.from([
      0x4e, 0x61, 0x6d, 0x65, 0x2c, 0x47, 0x65, 0x73, 0x63, 0x68, 0x6c, 0x65,
      0x63, 0x68, 0x74, 0x0a, 0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72, 0x2c, 0x77,
      0x0a,
    ]);

    await analyzeCsvFile(
      new File([bytes as BlobPart], 'cp1252.csv', { type: 'text/csv' }),
    );

    expect(toastsOfType('info')[0]).toContain('cp1252.csv');
  });

  test('stays quiet about the encoding for a UTF-8 file', async () => {
    await analyzeCsvFile(csvFile('Vorname,Nachname\nAnna,Müller\n'));

    expect(toastsOfType('info')).toHaveLength(0);
  });
});
