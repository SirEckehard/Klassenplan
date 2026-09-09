// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { NameColumnMode } from '@/utils/csv/csvTypes';

/**
 * Import presets for the class list exports German schools actually produce.
 *
 * A preset is a *recognition* plus a translation layer, never a second parser:
 * it renames the vendor's column headings into the vocabulary
 * `utils/data/csvUtils.ts` already understands and decodes the vendor's value
 * codes. Everything after that is the unchanged import path, so a preset can
 * never influence seating results.
 *
 * ## Why the tables below are deliberately thin
 *
 * The spellings here were assembled without a real export from any of these
 * systems at hand. A signature that is wrong merely fails to match, which costs
 * nothing — but a `rename` that is wrong silently feeds the wrong column into
 * the seating plan. So the shipped presets carry signatures, a label and a
 * sensible default, while `rename` stays empty until a genuine export confirms
 * the headings. The mechanism is complete and tested; filling the tables in is
 * a data change, not a code change.
 *
 * The common German spellings that *are* safe — "Langname", "Familienname",
 * "Rufname", "Zuname" — are handled globally in `csvColumnVocabulary.ts`
 * instead, so they also work for exports no preset recognises.
 */

export type CsvPresetId = 'webuntis' | 'schulmanager' | 'schild';

export type CsvPreset = {
  id: CsvPresetId;
  /** Product name shown to the user. A proper noun — never translated. */
  vendor: string;
  /**
   * Headings that must *all* be present, in {@link normalizeHeaderKey} form.
   * A signature alone never wins: at least one {@link signals} entry has to
   * match as well.
   */
  required: readonly string[];
  /**
   * Headings characteristic of this vendor. Generic ones ("Klasse",
   * "Geburtsdatum") are left out on purpose — they appear in every export and
   * would let one vendor's preset claim another's file.
   */
  signals: readonly string[];
  /** Source heading → a heading the existing parser already accepts. */
  rename: Readonly<Record<string, string>>;
  /**
   * Cell values to translate, per target column: `{ column: { from: to } }`.
   * Only exact (trimmed, lower-cased) matches are replaced, so a decode table
   * that is applied to the wrong file leaves every value untouched.
   */
  decode?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** Preselected in the name column dialog. */
  defaultNameMode: NameColumnMode;
};

export const CSV_PRESETS: readonly CsvPreset[] = [
  {
    id: 'webuntis',
    vendor: 'WebUntis',
    // "Langname" is WebUntis' word for the surname and is the column that most
    // reliably tells its export apart from a hand-written list.
    required: ['langname', 'vorname'],
    signals: [
      'kurzname',
      'externername',
      'externeid',
      'schuelernummer',
      'eintrittsdatum',
      'austrittsdatum',
    ],
    rename: {},
    defaultNameMode: 'firstName',
  },
  {
    id: 'schulmanager',
    vendor: 'Schulmanager Online',
    required: ['nachname', 'vorname', 'klasse'],
    // The address block is what sets a Schulmanager student export apart.
    signals: ['strasse', 'plz', 'ort', 'telefon', 'anrede', 'mobil'],
    rename: {},
    defaultNameMode: 'firstName',
  },
  {
    id: 'schild',
    vendor: 'SchILD-NRW',
    required: ['nachname', 'vorname'],
    signals: [
      'jahrgang',
      'schuelerid',
      'fachklasse',
      'schulnummer',
      'statistikkennzeichen',
    ],
    rename: {},
    // SchILD stores the gender as the numeric code of the official school
    // statistics. Mapped to the short forms the parser already reads, so no
    // German label has to live in a utils module.
    decode: {
      geschlecht: { '3': 'm', '4': 'w', '6': 'd' },
    },
    defaultNameMode: 'firstName',
  },
];
