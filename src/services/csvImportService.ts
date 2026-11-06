// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Student } from '@/types';
import {
  collectCsvClassNames,
  detectNameColumns,
  findCsvClassKey,
  hasRecognizedCsvHeaders,
  needsNameColumnSelection,
  parseCsvFlexible,
  parseCsvRecords,
  shouldUseCsvWorker,
  type NameColumnInfo,
  type NameColumnMode,
} from '@/utils/data/csvUtils';
import { sniffCsvEncoding } from '@/utils/csv/csvEncoding';
import { detectCsvPreset } from '@/utils/csv/csvPresetDetection';
import type { CsvPreset } from '@/utils/csv/csvPresets';
import { logError, MAX_STUDENTS } from '@/utils';
import {
  getAvoidPartnerIds,
  getWishPartnerIds,
  withoutPartners,
} from '@/utils/student/partnerUtils';
import {
  CsvImportError,
  diagnoseCsvStructure,
  diagnoseMissingNames,
  diagnoseUnsupportedFile,
  type CsvDiagnosis,
} from '@/utils/csv/csvImportDiagnostics';
import { openCsvFormatHelp } from '@/utils/ui/csvFormatHelp';
import { announce, showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import i18n from '@/i18n';

/**
 * Rows handed to the dialog. More than it shows at once, so it can still find
 * three examples after narrowing them down to one class.
 */
const CSV_PREVIEW_ROWS = 50;
/**
 * Import errors explain what to change and carry an action button, so they need
 * noticeably longer on screen than the 5s an error toast gets by default.
 */
const CSV_PROBLEM_TOAST_MS = 12_000;
/** Enough of the file to hold its header line in every realistic class list. */
const RAW_HEADER_BYTES = 8_192;

export type CsvAnalysisResult = {
  nameInfo: NameColumnInfo;
  previewData: Array<Record<string, unknown>>;
  requiresNameSelection: boolean;
  /** The recognised export format, when the headings identify one. */
  preset: CsvPreset | null;
  /**
   * Class names found in the file, listed only when there is more than one —
   * that is the case where the teacher has to say which class is meant.
   */
  classOptions: string[];
  /** Header of the class column, so the dialog can preview one class at a time. */
  classKey?: string;
};

type CsvImportParams = {
  file: File;
  /** The class the rows join: its names are skipped, its size bounds them. */
  currentStudents: readonly Student[];
  mode?: NameColumnMode;
  /** Import only this class; set when the file holds several. */
  className?: string;
  /** False imports a recognised export without applying its preset. */
  usePreset?: boolean;
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

const buildSuccessMessage = (
  count: number,
  preset: CsvPreset | null,
): string =>
  preset
    ? i18n.t('toast:csv.importedWithPreset', { count, vendor: preset.vendor })
    : i18n.t('toast:csv.importedCount', { count });

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

/** A name as adding and renaming a student compare it. */
const nameKey = (name: string) => name.trim().toLowerCase();

/**
 * The rows of names the class does not have yet — compared as "Schüler
 * hinzufügen" does, so a class list read in again after two arrivals adds the
 * two. A name twice in the file comes once. A wish or a distance aimed at a
 * skipped row is aimed at the student of that name instead.
 */
function skipKnownNames(
  parsed: Student[],
  currentStudents: readonly Student[],
): { fresh: Student[]; skipped: number } {
  const idByName = new Map(
    currentStudents.map((student) => [nameKey(student.name), student.id]),
  );
  const redirect = new Map<string, string>();
  const fresh: Student[] = [];
  for (const student of parsed) {
    const known = idByName.get(nameKey(student.name));
    if (known) {
      redirect.set(student.id, known);
      continue;
    }
    idByName.set(nameKey(student.name), student.id);
    fresh.push(student);
  }
  if (redirect.size === 0) return { fresh, skipped: 0 };

  const aim = (ids: string[]) => [
    ...new Set(ids.map((id) => redirect.get(id) ?? id)),
  ];
  return {
    fresh: fresh.map((student) => {
      const wish = getWishPartnerIds(student);
      const avoid = getAvoidPartnerIds(student);
      if (![...wish, ...avoid].some((id) => redirect.has(id))) return student;
      const wishPartnerIds = aim(wish).filter((id) => id !== student.id);
      const avoidPartnerIds = aim(avoid).filter((id) => id !== student.id);
      return {
        ...student,
        wishPartnerIds,
        wishPartnerId: wishPartnerIds[0] ?? null,
        avoidPartnerIds,
        avoidPartnerId: avoidPartnerIds[0] ?? null,
      };
    }),
    skipped: redirect.size,
  };
}

/** Partners are the class's students and the rows that join it, no one else. */
function dropPartnersOutside(
  students: Student[],
  currentStudents: readonly Student[],
): Student[] {
  const present = new Set(
    [...currentStudents, ...students].map((student) => student.id),
  );
  const missing = new Set(
    students
      .flatMap((student) => [
        ...getWishPartnerIds(student),
        ...getAvoidPartnerIds(student),
      ])
      .filter((id) => !present.has(id)),
  );
  return withoutPartners(students, missing);
}

/** Toast + throw, so callers stop on a problem the user already knows about. */
function rejectWith(diagnosis: CsvDiagnosis): never {
  showCsvProblem(diagnosis);
  throw new CsvImportError(diagnosis);
}

export async function analyzeCsvFile(file: File): Promise<CsvAnalysisResult> {
  if (!isCsvFile(file)) {
    rejectWith(diagnoseUnsupportedFile(file));
  }

  const encoding = await sniffCsvEncoding(file);

  let parseResult: Awaited<ReturnType<typeof parseCsvRecords>>;
  try {
    // Parsed in full rather than previewed: the class column can only be
    // surveyed across every row, and class lists are small.
    parseResult = await parseCsvRecords(file, {
      useWorker: shouldUseCsvWorker(file),
      encoding,
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

  if (encoding === 'windows-1252') {
    // Worth saying out loud: the file was readable, but only because it was
    // decoded as a Windows export. If that guess is wrong the umlauts are the
    // place it shows.
    showToast(
      'info',
      i18n.t('toast:csv.encodingFallback', { fileName: file.name }),
      {
        duration: CSV_PROBLEM_TOAST_MS,
      },
    );
  }

  const classNames = collectCsvClassNames(parseResult);
  const multipleClasses = classNames.length > 1;

  return {
    nameInfo,
    previewData: rows.slice(0, CSV_PREVIEW_ROWS),
    requiresNameSelection: needsNameColumnSelection(nameInfo),
    preset: detectCsvPreset(parseResult.meta?.fields ?? [])?.preset ?? null,
    classOptions: multipleClasses ? classNames : [],
    classKey: multipleClasses
      ? findCsvClassKey(parseResult.meta?.fields ?? [])
      : undefined,
  };
}

export async function importStudentsFromCsv({
  file,
  currentStudents,
  mode,
  className,
  usePreset,
}: CsvImportParams): Promise<Student[]> {
  if (!isCsvFile(file)) {
    showCsvProblem(diagnoseUnsupportedFile(file));
    return [];
  }

  let appliedPreset: CsvPreset | null = null;

  try {
    const parsedStudents = await parseCsvFlexible(file, mode, {
      useWorker: shouldUseCsvWorker(file),
      className,
      usePreset,
      onPresetApplied: (preset) => {
        appliedPreset = preset;
      },
    });

    if (parsedStudents.length === 0) {
      // The file parsed, so the header was fine — every name cell was empty.
      showCsvProblem(diagnoseMissingNames(file.name));
      return [];
    }

    const { fresh, skipped } = skipKnownNames(parsedStudents, currentStudents);
    if (fresh.length === 0) {
      showToast(
        'info',
        i18n.t('toast:csv.allKnown', { count: parsedStudents.length }),
      );
      return [];
    }

    const availableSlots = Math.max(0, MAX_STUDENTS - currentStudents.length);
    if (availableSlots === 0) {
      showToast('error', TOAST_MESSAGES.STUDENT_MAX_REACHED);
      return [];
    }

    // Partners are names of the same file or of the class: one cut off with
    // the rest is no partner of anyone left.
    const acceptedStudents = dropPartnersOutside(
      fresh.slice(0, availableSlots),
      currentStudents,
    );
    if (acceptedStudents.length < fresh.length) {
      showToast(
        'warning',
        i18n.t('toast:csv.partialImport', {
          imported: acceptedStudents.length,
          total: fresh.length,
          max: MAX_STUDENTS,
        }),
        { duration: CSV_PROBLEM_TOAST_MS },
      );
      return acceptedStudents;
    }

    if (skipped > 0) {
      // The list shows who came, not who was skipped.
      showToast(
        'info',
        i18n.t('toast:csv.importedSkipping', {
          count: acceptedStudents.length,
          known: skipped,
        }),
      );
      return acceptedStudents;
    }

    // The list shows them and the status bar counts them (decision 0037).
    announce(buildSuccessMessage(acceptedStudents.length, appliedPreset));
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
