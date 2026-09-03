// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, test, expect, vi, beforeEach } from 'vitest';
import * as csvUtils from '@/utils/data/csvUtils';
import { importStudentsFromCsv } from '@/services/csvImportService';
import { MAX_STUDENTS } from '@/utils';
import {
  CsvImportError,
  diagnoseTooManyRows,
} from '@/utils/csv/csvImportDiagnostics';
import { createMockStudent } from '@/__tests__/utils/testHelpers';

vi.mock('@/utils/ui/toast', () => ({
  showToast: vi.fn(),
  TOAST_MESSAGES: {
    CSV_PARSE_ERROR: 'CSV_PARSE_ERROR',
    STUDENT_MAX_REACHED: 'STUDENT_MAX_REACHED',
    CSV_READ_ERROR: 'CSV_READ_ERROR',
  },
}));
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';

const mockedShowToast = vi.mocked(showToast);

beforeEach(() => {
  vi.clearAllMocks();
});

const createCsvFile = () =>
  new File(['name,gender\nAlice,girl'], 'students.csv', {
    type: 'text/csv',
  });

/** All error messages shown during a call, already resolved to text. */
const errorMessages = (): string[] =>
  mockedShowToast.mock.calls
    .filter(([type]) => type === 'error')
    .map(([, message]) => message);

describe('csvImportService.importStudentsFromCsv', () => {
  test('names the actual file type instead of a generic rejection', async () => {
    const file = new File(['data'], 'Klassenliste.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const result = await importStudentsFromCsv({
      file,
      currentStudentCount: 0,
    });

    expect(result).toEqual([]);
    // The message has to name the file and say what to do with it.
    expect(errorMessages()[0]).toContain('Klassenliste.xlsx');
    expect(errorMessages()[0]).toMatch(/CSV/i);
  });

  test('offers the format example on a rejected file', async () => {
    await importStudentsFromCsv({
      file: new File(['x'], 'liste.pdf', { type: 'application/pdf' }),
      currentStudentCount: 0,
    });

    const [, , options] = mockedShowToast.mock.calls[0];
    expect(options?.action?.label).toBeTruthy();
    expect(typeof options?.action?.onClick).toBe('function');
  });

  test('points a backup file at the backup import, without the CSV example', async () => {
    await importStudentsFromCsv({
      file: new File(['{}'], 'klassenplan-backup.json', {
        type: 'application/json',
      }),
      currentStudentCount: 0,
    });

    const [, message, options] = mockedShowToast.mock.calls[0];
    expect(message).toContain('klassenplan-backup.json');
    expect(options?.action).toBeUndefined();
  });

  test('handles parse errors gracefully', async () => {
    const parseSpy = vi
      .spyOn(csvUtils, 'parseCsvFlexible')
      .mockRejectedValue(new Error('fail'));

    const result = await importStudentsFromCsv({
      file: createCsvFile(),
      currentStudentCount: 0,
    });

    expect(result).toEqual([]);
    expect(errorMessages()).toContain(TOAST_MESSAGES.CSV_PARSE_ERROR);
    parseSpy.mockRestore();
  });

  test('keeps the specific message of a diagnosed parser failure', async () => {
    const parseSpy = vi
      .spyOn(csvUtils, 'parseCsvFlexible')
      .mockRejectedValue(new CsvImportError(diagnoseTooManyRows(40, 36)));

    await importStudentsFromCsv({
      file: createCsvFile(),
      currentStudentCount: 0,
    });

    expect(errorMessages()[0]).toContain('40');
    expect(errorMessages()[0]).toContain('36');
    parseSpy.mockRestore();
  });

  test('reports a file whose name column is empty', async () => {
    const parseSpy = vi
      .spyOn(csvUtils, 'parseCsvFlexible')
      .mockResolvedValue([]);

    const result = await importStudentsFromCsv({
      file: createCsvFile(),
      currentStudentCount: 0,
    });

    expect(result).toEqual([]);
    expect(errorMessages()[0]).toContain('students.csv');
    parseSpy.mockRestore();
  });

  test('limits CSV import to MAX_STUDENTS and explains the truncation', async () => {
    const parseSpy = vi
      .spyOn(csvUtils, 'parseCsvFlexible')
      .mockResolvedValue([
        createMockStudent({ id: 's-1', name: 'Student 1' }),
        createMockStudent({ id: 's-2', name: 'Student 2' }),
      ]);

    const result = await importStudentsFromCsv({
      file: createCsvFile(),
      currentStudentCount: MAX_STUDENTS - 1,
    });

    expect(result).toHaveLength(1);
    const warning = mockedShowToast.mock.calls.find(
      ([type]) => type === 'warning',
    );
    expect(warning?.[1]).toContain('1');
    expect(warning?.[1]).toContain(String(MAX_STUDENTS));
    expect(
      mockedShowToast.mock.calls.some(([type]) => type === 'success'),
    ).toBe(false);
    parseSpy.mockRestore();
  });

  test('rejects an import into a class that is already full', async () => {
    const parseSpy = vi
      .spyOn(csvUtils, 'parseCsvFlexible')
      .mockResolvedValue([createMockStudent({ id: 's-1', name: 'Student 1' })]);

    const result = await importStudentsFromCsv({
      file: createCsvFile(),
      currentStudentCount: MAX_STUDENTS,
    });

    expect(result).toEqual([]);
    expect(errorMessages()).toContain(TOAST_MESSAGES.STUDENT_MAX_REACHED);
    parseSpy.mockRestore();
  });

  test('parst CSV-Dateien immer ohne Worker für bessere Kompatibilität', async () => {
    const parseSpy = vi
      .spyOn(csvUtils, 'parseCsvFlexible')
      .mockResolvedValue([createMockStudent({ id: 's-1', name: 'Student 1' })]);

    await importStudentsFromCsv({
      file: createCsvFile(),
      currentStudentCount: 0,
    });

    expect(parseSpy).toHaveBeenCalledWith(
      expect.any(File),
      undefined,
      expect.objectContaining({ useWorker: false }),
    );
  });
});
