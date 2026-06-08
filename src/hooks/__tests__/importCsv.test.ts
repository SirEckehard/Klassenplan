import { describe, test, expect, vi, beforeEach } from 'vitest';
import * as csvUtils from '@/utils/data/csvUtils';
import { importStudentsFromCsv } from '@/services/csvImportService';
import { MAX_STUDENTS } from '@/utils';
import { createMockStudent } from '@/__tests__/utils/testHelpers';

vi.mock('@/utils/ui/toast', () => ({
  showToast: vi.fn(),
  TOAST_MESSAGES: {
    CSV_INVALID_FILE: 'CSV_INVALID_FILE',
    CSV_PARSE_ERROR: 'CSV_PARSE_ERROR',
    STUDENT_MAX_REACHED: 'STUDENT_MAX_REACHED',
    CSV_READ_ERROR: 'CSV_READ_ERROR',
  },
}));
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';

beforeEach(() => {
  vi.clearAllMocks();
});

const createCsvFile = () =>
  new File(['name,gender\nAlice,girl'], 'students.csv', {
    type: 'text/csv',
  });

describe('csvImportService.importStudentsFromCsv', () => {
  test('returns empty array for non-CSV files', async () => {
    const file = new File(['data'], 'data.txt', { type: 'text/plain' });
    const result = await importStudentsFromCsv({
      file,
      currentStudentCount: 0,
    });

    expect(result).toEqual([]);
    expect(showToast).toHaveBeenCalledWith(
      'error',
      TOAST_MESSAGES.CSV_INVALID_FILE,
    );
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
    expect(showToast).toHaveBeenCalledWith(
      'error',
      TOAST_MESSAGES.CSV_PARSE_ERROR,
    );
    parseSpy.mockRestore();
  });

  test('limits CSV import to MAX_STUDENTS and shows toast', async () => {
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
    expect(showToast).toHaveBeenCalledWith(
      'error',
      TOAST_MESSAGES.STUDENT_MAX_REACHED,
    );
    expect(showToast).toHaveBeenCalledWith(
      'success',
      '1 student imported successfully',
    );
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
