// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Student } from '@/types';
import {
  detectNameColumns,
  hasRecognizedCsvHeaders,
  needsNameColumnSelection,
  parseCsvFlexible,
  parseCsvRecords,
  shouldUseCsvWorker,
  type NameColumnInfo,
  type NameColumnMode,
} from '@/utils/data/csvUtils';
import { logError, MAX_STUDENTS } from '@/utils';
import {
  CsvImportError,
  diagnoseCsvStructure,
  diagnoseMissingNames,
  diagnoseUnsupportedFile,
  type CsvDiagnosis,
} from '@/utils/csv/csvImportDiagnostics';
import { openCsvFormatHelp } from '@/utils/ui/csvFormatHelp';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import i18n from '@/i18n';

const CSV_PREVIEW_ROWS = 5;
/**
 * Import errors explain what to change and carry an action button, so they need
 * noticeably longer on screen than the 5s an error toast gets by default.
 */
const CSV_PROBLEM_TOAST_MS = 12_000;
/** Enough of the file to hold its header line in every realistic class list. */
const RAW_HEADER_BYTES = 8_192;

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

/**
 * Header spellings as the teacher typed them.
 *
 * `meta.fields` has already been through `normalizeCsvHeader`, so quoting those
 * back would show "schüler" for a column labelled "Schüler". Falls back to the
 * normalized headers whenever the raw line does not line up (quoted headers
 * containing the delimiter, an unreadable file).
 */
const readOriginalHeaders = async (
  file: File,
  delimiter: string,
  normalizedHeaders: string[],
): Promise<string[]> => {
  try {
    const head = await file.slice(0, RAW_HEADER_BYTES).text();
    const firstLine = (head.split(/\r?\n/, 1)[0] ?? '').replace(/^\ufeff/, '');
    const cells = firstLine.split(delimiter || ',').map((cell) =>
      cell
        .trim()
        .replace(/^"(.*)"$/, '$1')
        .trim(),
    );
    return cells.length === normalizedHeaders.length
      ? cells
      : normalizedHeaders;
  } catch {
    return normalizedHeaders;
  }
};

const buildSuccessMessage = (count: number): string =>
  i18n.t('toast:csv.importedCount', { count });

/**
 * Show a classified import problem. The action button opens the format example
 * so the user can compare their file against a valid one without downloading
 * the template first.
 */
const showCsvProblem = (diagnosis: CsvDiagnosis): void => {
  showToast('error', i18n.t(diagnosis.messageKey, diagnosis.values), {
    duration: CSV_PROBLEM_TOAST_MS,
    action: diagnosis.offerFormatHelp
      ? {
          label: i18n.t('toast:csv.showExample'),
          onClick: openCsvFormatHelp,
        }
      : undefined,
  });
};

/** Toast + throw, so callers stop on a problem the user already knows about. */
function rejectWith(diagnosis: CsvDiagnosis): never {
  showCsvProblem(diagnosis);
  throw new CsvImportError(diagnosis);
}

export async function analyzeCsvFile(file: File): Promise<CsvAnalysisResult> {
  if (!isCsvFile(file)) {
    rejectWith(diagnoseUnsupportedFile(file));
  }

  let parseResult: Awaited<ReturnType<typeof parseCsvRecords>>;
  try {
    parseResult = await parseCsvRecords(file, {
      previewRows: CSV_PREVIEW_ROWS,
      useWorker: shouldUseCsvWorker(file),
    });
  } catch (error) {
    // Only real read failures land here — structural problems below get their
    // own message instead of being swallowed by this catch.
    logError('CSV analysis failed', { error }, 'csvImportService');
    showToast('error', TOAST_MESSAGES.CSV_READ_ERROR);
    throw error instanceof Error
      ? error
      : new Error('CSV analysis parse error');
  }

  const headers = (parseResult.meta?.fields ?? []).map((field) =>
    String(field ?? '').trim(),
  );
  const rows = Array.isArray(parseResult.data) ? parseResult.data : [];
  const nameInfo = detectNameColumns(headers);
  const displayHeaders = await readOriginalHeaders(
    file,
    parseResult.meta?.delimiter ?? ',',
    headers,
  );

  const structuralProblem = diagnoseCsvStructure({
    fileName: file.name,
    headers: displayHeaders,
    rowCount: rows.length,
    hasNameColumn: nameInfo !== null,
    hasRecognizedHeaders: hasRecognizedCsvHeaders(headers),
  });
  if (structuralProblem || !nameInfo) {
    rejectWith(structuralProblem ?? diagnoseMissingNames(file.name));
  }

  return {
    nameInfo,
    previewData: rows.slice(0, CSV_PREVIEW_ROWS),
    requiresNameSelection: needsNameColumnSelection(nameInfo),
  };
}

export async function importStudentsFromCsv({
  file,
  currentStudentCount,
  mode,
}: CsvImportParams): Promise<Student[]> {
  if (!isCsvFile(file)) {
    showCsvProblem(diagnoseUnsupportedFile(file));
    return [];
  }

  try {
    const parsedStudents = await parseCsvFlexible(file, mode, {
      useWorker: shouldUseCsvWorker(file),
    });

    if (parsedStudents.length === 0) {
      // The file parsed, so the header was fine — every name cell was empty.
      showCsvProblem(diagnoseMissingNames(file.name));
      return [];
    }

    const availableSlots = Math.max(0, MAX_STUDENTS - currentStudentCount);
    if (availableSlots === 0) {
      showToast('error', TOAST_MESSAGES.STUDENT_MAX_REACHED);
      return [];
    }

    const acceptedStudents = parsedStudents.slice(0, availableSlots);
    if (acceptedStudents.length < parsedStudents.length) {
      showToast(
        'warning',
        i18n.t('toast:csv.partialImport', {
          imported: acceptedStudents.length,
          total: parsedStudents.length,
          max: MAX_STUDENTS,
        }),
        { duration: CSV_PROBLEM_TOAST_MS },
      );
      return acceptedStudents;
    }

    showToast('success', buildSuccessMessage(acceptedStudents.length));
    return acceptedStudents;
  } catch (error) {
    if (error instanceof CsvImportError) {
      showCsvProblem(error.diagnosis);
      return [];
    }
    logError('CSV parsing failed', { error }, 'csvImportService');
    showCsvProblem({
      messageKey: TOAST_MESSAGES.CSV_PARSE_ERROR,
      values: { fileName: file.name },
      offerFormatHelp: true,
    });
    return [];
  }
}
