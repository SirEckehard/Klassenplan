// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type Papa from 'papaparse';

/**
 * Types shared by the parser, the import presets and the UI.
 *
 * They live apart from `utils/data/csvUtils.ts` so preset detection can name
 * them without importing the parser that consumes the presets.
 */

export type CsvParseResult = Papa.ParseResult<Record<string, unknown>>;

/**
 * Which name column(s) an import reads.
 *
 * `fullName` combines a first-name and a last-name column; `nameColumn` uses a
 * single column that already holds the whole name. Keeping those apart matters
 * for exports that carry all three, where "Name" is its own column next to
 * "Vorname" and "Nachname".
 */
export type NameColumnMode =
  'firstName' | 'lastName' | 'fullName' | 'nameColumn';

/** Information about detected name columns in CSV */
export type NameColumnInfo = {
  hasFirstName: boolean;
  hasLastName: boolean;
  hasFullName: boolean;
  firstNameKey?: string;
  lastNameKey?: string;
  fullNameKey?: string;
};

/**
 * What the teacher decided about an import, once the analysis has asked.
 *
 * Carried as one object rather than a growing list of positional arguments,
 * because every layer between the dialog and the parser only passes it on.
 */
export type CsvImportSelection = {
  /** Which name column(s) to read. */
  mode?: NameColumnMode;
  /** Import only this class, for files holding several. */
  className?: string;
  /** False imports a recognised export without applying its preset. */
  usePreset?: boolean;
};
