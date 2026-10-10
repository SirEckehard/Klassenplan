// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { downloadBlob } from '@/utils';
import { escapeCsvCell } from '@/utils/csv/csvExport';
import {
  CSV_BYTE_ORDER_MARK,
  CSV_COLUMN_HEADERS,
  CSV_DELIMITER,
  resolveCsvLanguage,
  type CsvLanguage,
} from '@/utils/csv/csvSchema';

/**
 * Example rows for the import template, one set per UI language. Their cells
 * are split by `|`, which no example holds; the file puts the language's
 * delimiter between them (`CSV_DELIMITER`).
 *
 * The headers come from `csvSchema.ts` so template and export never drift
 * apart. "Wunschpartner"/"Distanzwunsch" hold up to three comma-separated
 * names in a single cell — the rows show that explicitly, because the limit is
 * invisible from a one-name example.
 */
const EXAMPLE_ROWS: Record<CsvLanguage, readonly string[]> = {
  de: [
    'Max Mustermann|Männlich||Erstsprache||ja||ja||ja|||ja|Tom Weber, Lisa Müller|Kim Fischer',
    'Anna Beispiel|Weiblich|Klein|Fließend|Mediator||ja|||ja||ja||Lisa Müller|',
    'Tom Weber|Männlich|Groß|Anfänger|Einzelgänger|||ja|ja|||||Max Mustermann|Anna Beispiel, Kim Fischer',
    'Lisa Müller|Weiblich||Fortgeschritten|Mittelpunkt||||||ja|||Anna Beispiel, Max Mustermann, Tom Weber|',
    'Kim Fischer|Divers|Groß|DaZ-Förderung|Anführer||ja||ja|||ja|||Tom Weber',
  ],
  en: [
    'Max Sample|Boy||First language||yes||yes||yes|||yes|Tom Baker, Lisa Miller|Kim Fisher',
    'Anna Example|Girl|Small|Fluent|Mediator||yes|||yes||yes||Lisa Miller|',
    'Tom Baker|Boy|Tall|Beginner|Loner|||yes|yes|||||Max Sample|Anna Example, Kim Fisher',
    'Lisa Miller|Girl||Intermediate|Social hub||||||yes|||Anna Example, Max Sample, Tom Baker|',
    'Kim Fisher|Diverse|Tall|Language support|Leader||yes||yes|||yes|||Tom Baker',
  ],
};

/**
 * Names from the template's example rows, in order.
 *
 * The in-app format example (`CsvFormatHelpDialog`) shows the same people as
 * the downloadable template, so a teacher comparing the two sees one example,
 * not two.
 */
export const getCsvExampleNames = (language: CsvLanguage): string[] =>
  EXAMPLE_ROWS[language].map((row) => row.split('|')[0] ?? '');

const TEMPLATE_FILENAMES: Record<CsvLanguage, string> = {
  de: 'klassenliste_vorlage.csv',
  en: 'class_list_template.csv',
};

/**
 * Build the template contents for a language. Exported for tests, which assert
 * that the template survives a round trip through the parser.
 */
export function buildCsvTemplate(language: CsvLanguage): string {
  const delimiter = CSV_DELIMITER[language];
  const line = (cells: readonly string[]) =>
    cells.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter);
  const rows = [
    CSV_COLUMN_HEADERS[language],
    ...EXAMPLE_ROWS[language].map((row) => row.split('|')),
  ];
  return `${CSV_BYTE_ORDER_MARK}${rows.map(line).join('\n')}\n`;
}

/**
 * Downloads a CSV template file for student list import.
 * The template includes all supported fields with example data.
 */
export function downloadCsvTemplate(): void {
  const language = resolveCsvLanguage();
  downloadBlob(
    buildCsvTemplate(language),
    TEMPLATE_FILENAMES[language],
    'text/csv;charset=utf-8',
    {
      logContext: 'downloadCsvTemplate',
      filePickerTypes: [
        {
          description: 'CSV',
          accept: { 'text/csv': ['.csv'] },
        },
      ],
    },
  ).catch(() => undefined);
}
