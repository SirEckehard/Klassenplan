// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The student list as CSV, in the column layout the import reads back
 * (docs/csv-import.md).
 */
import type { Student } from '@/types';
import {
  CSV_BYTE_ORDER_MARK,
  CSV_COLUMN_HEADERS,
  CSV_DELIMITER,
  CSV_GENDER_LABELS,
  CSV_HEIGHT_LABELS,
  CSV_LANGUAGE_SKILL_LABELS,
  CSV_SOCIAL_ROLE_LABELS,
  CSV_TRUE_VALUE,
  resolveCsvLanguage,
  type CsvLanguage,
} from './csvSchema';

export const buildStudentsCsvFilename = (className: string): string => {
  const sanitized = className.trim().replace(/[\\/:*?"<>|]/g, '_');
  return sanitized ? `${sanitized}.csv` : 'students.csv';
};

/**
 * One cell as the files hold it: quoted where it carries the delimiter, a
 * comma (the partner lists), a quote or a line break, and with a leading
 * formula sign defused so a spreadsheet does not run it.
 */
export const escapeCsvCell = (value: unknown, delimiter: string): string => {
  const str = String(value ?? '');
  const trimmed = str.trimStart();
  const originalFirst = str.charAt(0);
  const trimmedFirst = trimmed.charAt(0);
  // Prefix dangerous spreadsheet formula indicators to prevent CSV injection.
  const dangerousLeading =
    (trimmedFirst !== '' && ['=', '+', '-', '@'].includes(trimmedFirst)) ||
    ['\t', '\r', '\n'].includes(originalFirst);
  const sanitized = dangerousLeading ? `'${str}` : str;
  return sanitized.includes(delimiter) ||
    sanitized.includes(',') ||
    sanitized.includes('"') ||
    sanitized.includes('\n')
    ? `"${sanitized.replace(/"/g, '""')}"`
    : sanitized;
};

export const exportStudentsToCsv = (
  students: Student[],
  language: CsvLanguage = resolveCsvLanguage(),
): string => {
  // Columns and labels come from csvSchema so an export → import round trip
  // preserves every column, in either language.
  const delimiter = CSV_DELIMITER[language];
  const header = `${CSV_BYTE_ORDER_MARK}${CSV_COLUMN_HEADERS[language].join(delimiter)}\n`;
  const yes = CSV_TRUE_VALUE[language];
  const studentNameMap = students.reduce<Record<string, string>>((acc, s) => {
    acc[s.id] = s.name;
    return acc;
  }, {});
  const partnerNames = (
    ids: string[] | undefined,
    legacyId: string | null | undefined,
  ): string => {
    const resolved = ids?.length ? ids : legacyId ? [legacyId] : [];
    return resolved
      .map((id) => studentNameMap[id])
      .filter((name): name is string => Boolean(name))
      .join(', ');
  };
  const rows = students.map((s) => {
    const cells = [
      s.name,
      s.gender ? (CSV_GENDER_LABELS[language][s.gender] ?? '') : '',
      // A legacy 'medium' is no height at all.
      s.height && s.height !== 'medium'
        ? (CSV_HEIGHT_LABELS[language][s.height] ?? '')
        : '',
      s.languageSkill
        ? CSV_LANGUAGE_SKILL_LABELS[language][s.languageSkill]
        : '',
      s.socialRole ? CSV_SOCIAL_ROLE_LABELS[language][s.socialRole] : '',
      s.restless ? yes : '',
      s.shy ? yes : '',
      s.concentrationIssues ? yes : '',
      s.needsFrontSeat ? yes : '',
      s.prefersWindow ? yes : '',
      s.prefersDoor ? yes : '',
      s.performanceStrong ? yes : '',
      s.performanceWeak ? yes : '',
      partnerNames(s.wishPartnerIds, s.wishPartnerId),
      partnerNames(s.avoidPartnerIds, s.avoidPartnerId),
    ];
    return cells
      .map((value) => escapeCsvCell(value, delimiter))
      .join(delimiter);
  });
  return header + rows.join('\n');
};
