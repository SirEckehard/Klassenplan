// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { downloadBlob } from '@/utils';
import {
  CSV_COLUMN_HEADERS,
  resolveCsvLanguage,
  type CsvLanguage,
} from '@/utils/csv/csvSchema';

/**
 * Example rows for the import template, one set per UI language.
 *
 * The headers come from `csvSchema.ts` so template and export never drift
 * apart. "Wunschpartner"/"Distanzwunsch" hold up to three comma-separated
 * names in a single quoted cell — the rows show that explicitly, because the
 * limit is invisible from a one-name example.
 */
const EXAMPLE_ROWS: Record<CsvLanguage, readonly string[]> = {
  de: [
    'Max Mustermann,Junge,Mittel,Muttersprache,,ja,,ja,,ja,,,ja,"Tom Weber, Lisa Müller",Kim Fischer',
    'Anna Beispiel,Mädchen,Klein,Fließend,Mediator,,ja,,,ja,,ja,,Lisa Müller,',
    'Tom Weber,Junge,Groß,Anfänger,Einzelgänger,,,ja,ja,,,,,Max Mustermann,"Anna Beispiel, Kim Fischer"',
    'Lisa Müller,Mädchen,,Fortgeschritten,Mittelpunkt,,,,,,ja,,,"Anna Beispiel, Max Mustermann, Tom Weber",',
    'Kim Fischer,Divers,Groß,DaZ-Förderung,Anführer,,ja,,ja,,,ja,,,Tom Weber',
  ],
  en: [
    'Max Sample,Boy,Medium,Native,,yes,,yes,,yes,,,yes,"Tom Baker, Lisa Miller",Kim Fisher',
    'Anna Example,Girl,Small,Fluent,Mediator,,yes,,,yes,,yes,,Lisa Miller,',
    'Tom Baker,Boy,Tall,Beginner,Loner,,,yes,yes,,,,,Max Sample,"Anna Example, Kim Fisher"',
    'Lisa Miller,Girl,,Intermediate,Social hub,,,,,,yes,,,"Anna Example, Max Sample, Tom Baker",',
    'Kim Fisher,Diverse,Tall,Language support,Leader,,yes,,yes,,,yes,,,Tom Baker',
  ],
};

/**
 * Names from the template's example rows, in order.
 *
 * The in-app format example (`CsvFormatHelpDialog`) shows the same people as
 * the downloadable template, so a teacher comparing the two sees one example,
 * not two. The first field of a row is never quoted, hence the plain split.
 */
export const getCsvExampleNames = (language: CsvLanguage): string[] =>
  EXAMPLE_ROWS[language].map((row) => row.split(',')[0] ?? '');

const TEMPLATE_FILENAMES: Record<CsvLanguage, string> = {
  de: 'klassenliste_vorlage.csv',
  en: 'class_list_template.csv',
};

/**
 * Build the template contents for a language. Exported for tests, which assert
 * that the template survives a round trip through the parser.
 */
export function buildCsvTemplate(language: CsvLanguage): string {
  return `${CSV_COLUMN_HEADERS[language].join(',')}\n${EXAMPLE_ROWS[language].join('\n')}\n`;
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
