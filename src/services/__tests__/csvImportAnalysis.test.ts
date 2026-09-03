// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { analyzeCsvFile } from '@/services/csvImportService';
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
    await expect(
      analyzeCsvFile(csvFile('Schüler,Geschlecht\nMax,Junge\n')),
    ).rejects.toBeInstanceOf(CsvImportError);

    const message = singleErrorMessage();
    expect(message).toContain('klasse.csv');
    expect(message).toContain('Schüler');
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
