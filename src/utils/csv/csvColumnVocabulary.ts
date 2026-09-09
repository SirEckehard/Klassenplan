// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { normalizeHeaderKey } from '@/utils/data/csvNormalization';

/**
 * Every column heading Klassenplan understands, in one place.
 *
 * This used to live inside `utils/data/csvUtils.ts`. It moved out unchanged so
 * three callers can share it without pulling the parser (and with it Papa,
 * the logger and `generateId`) along: the parser itself, the preamble skipper
 * that also runs inside the CSV worker, and the import preset detection.
 *
 * All entries are written in {@link normalizeHeaderKey} form — lower case,
 * without accents, spaces or punctuation. "Körpergröße", "Koerpergroesse" and
 * "Körper-Größe" therefore all resolve to the same entry.
 */

export const FIRST_NAME_VARIANTS: readonly string[] = [
  'vorname',
  'vornamen',
  'rufname',
  'firstname',
  'givenname',
  'forename',
];

/**
 * "Langname" is what WebUntis calls the surname; "Familienname" and "Zuname"
 * are the spellings the other German school systems use.
 */
export const LAST_NAME_VARIANTS: readonly string[] = [
  'nachname',
  'nachnamen',
  'familienname',
  'langname',
  'zuname',
  'lastname',
  'surname',
  'familyname',
];

export const FULL_NAME_VARIANTS: readonly string[] = [
  'name',
  'fullname',
  'schueler',
  'schuelerin',
  'schuelername',
  'vollstaendigername',
  'student',
  'studentname',
];

/** Column holding the class a row belongs to — used to split multi-class exports. */
export const CLASS_VARIANTS: readonly string[] = [
  'klasse',
  'klassen',
  'klassenbezeichnung',
  'stammklasse',
  'lerngruppe',
  'class',
];

/**
 * Accepted header spellings per attribute column, in lookup order.
 *
 * Both template languages must resolve here (`csvTemplateDownload.ts`), plus
 * the spellings teachers commonly use.
 */
export const COLUMN_ALIASES = {
  restless: ['unruhig', 'restless'],
  shy: ['schuechtern', 'shy'],
  concentrationIssues: [
    'ablenkbarkeit',
    'konzentration',
    'distracted',
    'distractible',
  ],
  needsFrontSeat: [
    'vordereplaetze',
    'hoerundsehschwaeche',
    'hoerschwaeche',
    'sehschwaeche',
    'frontrow',
    'frontseat',
  ],
  prefersWindow: [
    'fensterplatz',
    'amfenster',
    'fenster',
    'windowseat',
    'window',
  ],
  prefersDoor: ['tuerplatz', 'andertuer', 'tuer', 'doorseat', 'door'],
  performanceStrong: ['leistungsstark', 'highperformer', 'strong'],
  performanceWeak: ['leistungsschwach', 'lowperformer', 'weak'],
  gender: ['geschlecht', 'gender'],
  specialNeeds: ['besonderebeduerfnisse', 'besonderheiten', 'specialneeds'],
  wishPartner: ['wunschpartner', 'wishpartner', 'preferredpartner'],
  avoidPartner: ['distanzwunsch', 'distanzpartner', 'avoidpartner'],
} as const satisfies Record<string, readonly string[]>;

export type CsvAliasColumn = keyof typeof COLUMN_ALIASES;

/** Substring patterns — these columns are matched loosely on purpose. */
export const HEIGHT_KEY_PATTERNS: readonly string[] = [
  'height',
  'bodyheight',
  'groesse',
  'grosse',
  'koerpergroesse',
];

export const LANGUAGE_SKILL_KEY_PATTERNS: readonly string[] = [
  'sprachniveau',
  'sprache',
  'language',
  'languageskill',
  'languagelevel',
  'deutschkenntnisse',
];

export const SOCIAL_ROLE_KEY_PATTERNS: readonly string[] = [
  'sozialerolle',
  'rolle',
  'role',
  'socialrole',
  'social',
];

const EXACT_HEADERS = new Set<string>([
  ...FIRST_NAME_VARIANTS,
  ...LAST_NAME_VARIANTS,
  ...FULL_NAME_VARIANTS,
  ...Object.values(COLUMN_ALIASES).flat(),
]);

const SUBSTRING_PATTERNS: readonly string[] = [
  ...HEIGHT_KEY_PATTERNS,
  ...LANGUAGE_SKILL_KEY_PATTERNS,
  ...SOCIAL_ROLE_KEY_PATTERNS,
];

/** True when this single heading names a column Klassenplan understands. */
const isRecognizedCsvHeader = (header: string): boolean => {
  const normalized = normalizeHeaderKey(header);
  if (!normalized) return false;
  if (EXACT_HEADERS.has(normalized)) return true;
  return SUBSTRING_PATTERNS.some((pattern) => normalized.includes(pattern));
};

/**
 * True when at least one header names a column Klassenplan understands.
 *
 * The import uses this to tell two very different mistakes apart: a sheet with
 * headers but no name column ("rename a column") versus a sheet that starts
 * straight with student data ("add a header row").
 */
export const hasRecognizedCsvHeaders = (headers: readonly string[]): boolean =>
  headers.some(isRecognizedCsvHeader);
