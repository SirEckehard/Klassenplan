import type { Student } from '@/types';
import {
  detectNameColumns,
  needsNameColumnSelection,
  parseCsvFlexible,
  parseCsvRecords,
  shouldUseCsvWorker,
  type NameColumnInfo,
  type NameColumnMode,
} from '@/utils/data/csvUtils';
import { logError, MAX_STUDENTS, numberValidation } from '@/utils';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import i18n from '@/i18n';

const CSV_PREVIEW_ROWS = 5;

type CsvAnalysisResult = {
  nameInfo: NameColumnInfo;
  previewData: Array<Record<string, unknown>>;
  requiresNameSelection: boolean;
};

type CsvImportParams = {
  file: File;
  currentStudentCount: number;
  mode?: NameColumnMode;
};

const isCsvFile = (file: File): boolean => {
  if (!file) {
    return false;
  }
  const fileName = file.name.toLowerCase();
  return (
    file.type.includes('csv') ||
    fileName.endsWith('.csv') ||
    file.type === 'application/vnd.ms-excel'
  );
};

const buildSuccessMessage = (count: number): string =>
  i18n.t('toast:csv.importedCount', { count });

export async function analyzeCsvFile(file: File): Promise<CsvAnalysisResult> {
  if (!isCsvFile(file)) {
    showToast('error', TOAST_MESSAGES.CSV_INVALID_FILE);
    throw new Error(TOAST_MESSAGES.CSV_INVALID_FILE);
  }

  try {
    const parseResult = await parseCsvRecords(file, {
      previewRows: CSV_PREVIEW_ROWS,
      useWorker: shouldUseCsvWorker(file),
    });
    const headers =
      parseResult.meta?.fields?.map((field) =>
        String(field ?? '')
          .trim()
          .toLowerCase(),
      ) ?? [];
    const nameInfo = detectNameColumns(headers);

    if (!nameInfo) {
      const nameColumnError = i18n.t('toast:csv.nameColumnError');
      showToast('error', nameColumnError);
      throw new Error(nameColumnError);
    }

    return {
      nameInfo,
      previewData: Array.isArray(parseResult.data)
        ? parseResult.data.slice(0, CSV_PREVIEW_ROWS)
        : [],
      requiresNameSelection: needsNameColumnSelection(nameInfo),
    };
  } catch (error) {
    logError('CSV analysis failed', { error }, 'csvImportService');
    showToast('error', TOAST_MESSAGES.CSV_READ_ERROR);
    throw error instanceof Error
      ? error
      : new Error('CSV analysis parse error');
  }
}

export async function importStudentsFromCsv({
  file,
  currentStudentCount,
  mode,
}: CsvImportParams): Promise<Student[]> {
  if (!isCsvFile(file)) {
    showToast('error', TOAST_MESSAGES.CSV_INVALID_FILE);
    return [];
  }

  try {
    const parsedStudents = await parseCsvFlexible(file, mode, {
      useWorker: shouldUseCsvWorker(file),
    });

    if (parsedStudents.length === 0) {
      return [];
    }

    const requestedCount = currentStudentCount + parsedStudents.length;
    const countValidation = numberValidation.validateStudentCount(
      requestedCount,
      MAX_STUDENTS,
    );
    if (!countValidation.isValid) {
      showToast('error', TOAST_MESSAGES.STUDENT_MAX_REACHED);
    }

    const availableSlots = Math.max(0, MAX_STUDENTS - currentStudentCount);
    const acceptedStudents =
      availableSlots > 0 ? parsedStudents.slice(0, availableSlots) : [];

    if (acceptedStudents.length > 0) {
      showToast('success', buildSuccessMessage(acceptedStudents.length));
    }

    return acceptedStudents;
  } catch (error) {
    logError('CSV parsing failed', { error }, 'csvImportService');
    showToast('error', TOAST_MESSAGES.CSV_PARSE_ERROR);
    return [];
  }
}
