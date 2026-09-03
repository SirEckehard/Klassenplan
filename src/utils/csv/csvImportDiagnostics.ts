// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/**
 * Turns a failed CSV import into a specific, actionable message.
 *
 * The import used to answer every problem with "Bitte gültige CSV-Datei
 * auswählen", which leaves a teacher who just dropped an Excel export with no
 * idea what to change. Each function here returns an i18n key plus the values
 * that make the message concrete (file name, found columns, row counts) — no
 * user-facing strings, per the utils rule; the caller resolves them.
 */

/** A classified import problem, ready to be resolved and shown as a toast. */
export type CsvDiagnosis = {
  /** Key in the `toast` namespace. */
  messageKey: string;
  /** Interpolation values for {@link messageKey}. */
  values: Record<string, string | number>;
  /** True when the format example dialog helps the user fix this problem. */
  offerFormatHelp: boolean;
};

/**
 * Error carrying a {@link CsvDiagnosis} so a failure deep in the parser keeps
 * its specific message on the way up instead of collapsing into a generic one.
 */
export class CsvImportError extends Error {
  readonly diagnosis: CsvDiagnosis;

  constructor(diagnosis: CsvDiagnosis) {
    super(diagnosis.messageKey);
    this.name = 'CsvImportError';
    this.diagnosis = diagnosis;
  }
}

/** How many column names a "found columns" list shows before it is truncated. */
const MAX_LISTED_COLUMNS = 4;

/** Separators a mis-saved spreadsheet uses when the parser sees one column. */
const FOREIGN_DELIMITERS = [';', '\t', '|'] as const;

/**
 * File extensions that get their own explanation. The order matters only in
 * that the first match wins; the groups are disjoint.
 */
const FILE_TYPE_HINTS: ReadonlyArray<{
  extensions: readonly string[];
  messageKey: string;
}> = [
  {
    extensions: ['xlsx', 'xls', 'xlsm', 'xlsb'],
    messageKey: 'toast:csv.fileTypeExcel',
  },
  {
    extensions: ['ods', 'numbers', 'gsheet', 'fods'],
    messageKey: 'toast:csv.fileTypeSpreadsheet',
  },
  { extensions: ['json'], messageKey: 'toast:csv.fileTypeBackup' },
  { extensions: ['txt', 'tsv', 'tab'], messageKey: 'toast:csv.fileTypeText' },
  {
    extensions: ['pdf', 'doc', 'docx', 'odt', 'rtf', 'pages'],
    messageKey: 'toast:csv.fileTypeDocument',
  },
  {
    extensions: ['png', 'jpg', 'jpeg', 'heic', 'heif', 'webp', 'gif', 'bmp'],
    messageKey: 'toast:csv.fileTypeImage',
  },
];

/** Lower-cased extension without the dot, or an empty string when there is none. */
export const getFileExtension = (fileName: string): string => {
  const trimmed = String(fileName ?? '').trim();
  const dotIndex = trimmed.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === trimmed.length - 1) {
    return '';
  }
  return trimmed.slice(dotIndex + 1).toLowerCase();
};

/**
 * Render found column names as a readable list. Quoting is left to the
 * translated sentence around it, so the list stays language-neutral here.
 */
export const formatColumnList = (headers: readonly string[]): string => {
  const listed = headers.slice(0, MAX_LISTED_COLUMNS).map((h) => h.trim());
  const rest = headers.length - listed.length;
  return rest > 0 ? `${listed.join(', ')} …` : listed.join(', ');
};

/** Explains why a picked file cannot be a class list at all. */
export function diagnoseUnsupportedFile(file: File): CsvDiagnosis {
  const fileName = file?.name ?? '';
  const extension = getFileExtension(fileName);
  const hint = FILE_TYPE_HINTS.find((entry) =>
    entry.extensions.includes(extension),
  );

  return {
    messageKey: hint?.messageKey ?? 'toast:csv.fileTypeUnknown',
    values: { fileName },
    // A backup file is the one case where the fix is a different button, not a
    // different file format — the CSV example would only distract there.
    offerFormatHelp: hint?.messageKey !== 'toast:csv.fileTypeBackup',
  };
}

type CsvStructureInput = {
  fileName: string;
  /** Headers in their original spelling, for quoting back at the user. */
  headers: readonly string[];
  /** Data rows in the parsed preview. */
  rowCount: number;
  /** Whether a name column was detected. */
  hasNameColumn: boolean;
  /** Whether any header matched a column Klassenplan knows. */
  hasRecognizedHeaders: boolean;
};

/**
 * Inspects a parsed but unusable CSV. Returns `null` when the structure is
 * fine, so callers can treat a diagnosis as "stop here".
 */
export function diagnoseCsvStructure({
  fileName,
  headers,
  rowCount,
  hasNameColumn,
  hasRecognizedHeaders,
}: CsvStructureInput): CsvDiagnosis | null {
  const usableHeaders = headers.filter((header) => header.trim().length > 0);

  if (usableHeaders.length === 0) {
    return {
      messageKey: 'toast:csv.emptyFile',
      values: { fileName },
      offerFormatHelp: true,
    };
  }

  // One column holding separators means the delimiter guess failed — usually a
  // sheet exported with semicolons that also quotes the whole line.
  const foreignDelimiter =
    usableHeaders.length === 1
      ? FOREIGN_DELIMITERS.find((delimiter) =>
          usableHeaders[0].includes(delimiter),
        )
      : undefined;
  if (foreignDelimiter) {
    return {
      messageKey: 'toast:csv.delimiterMismatch',
      values: { fileName },
      offerFormatHelp: true,
    };
  }

  if (!hasNameColumn) {
    // No header matched anything known: the first line is almost certainly
    // already a student, so the fix is adding a header row — not renaming one.
    return {
      messageKey: hasRecognizedHeaders
        ? 'toast:csv.noNameColumn'
        : 'toast:csv.noHeaderRow',
      values: { fileName, columns: formatColumnList(usableHeaders) },
      offerFormatHelp: true,
    };
  }

  if (rowCount === 0) {
    return {
      messageKey: 'toast:csv.noRows',
      values: { fileName },
      offerFormatHelp: true,
    };
  }

  return null;
}

/** The file parsed, but every name cell was empty. */
export const diagnoseMissingNames = (fileName: string): CsvDiagnosis => ({
  messageKey: 'toast:csv.noNames',
  values: { fileName },
  offerFormatHelp: true,
});

/** The file holds more students than a class can take. */
export const diagnoseTooManyRows = (
  rowCount: number,
  max: number,
): CsvDiagnosis => ({
  messageKey: 'toast:csv.tooManyRows',
  // Not `count`: that would make i18next look for plural variants of a key
  // whose wording is identical for every number.
  values: { rows: rowCount, max },
  offerFormatHelp: false,
});
