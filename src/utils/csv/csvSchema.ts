// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import i18n from '@/i18n';
import type { HeightCategory, Student } from '@/types';

/**
 * Shared column contract for the CSV import template and the student export.
 *
 * These strings are deliberately NOT translation keys: they are part of a file
 * format, and `utils/data/csvUtils.ts` matches against them when parsing. A
 * translator editing "Fließend" in a locale file would silently break import,
 * so both spellings live here next to the parser they have to satisfy — and
 * every value below has a counterpart in the parser's alias/pattern lists.
 */
export type CsvLanguage = 'de' | 'en';

/** Pick the CSV language from the active UI language (German is the fallback). */
export const resolveCsvLanguage = (): CsvLanguage =>
  i18n.language?.startsWith('en') ? 'en' : 'de';

export const CSV_COLUMN_HEADERS: Record<CsvLanguage, readonly string[]> = {
  de: [
    'Name',
    'Geschlecht',
    'Körpergröße',
    'Sprachniveau',
    'Soziale Rolle',
    'Unruhig',
    'Schüchtern',
    'Ablenkbarkeit',
    'Vordere Plätze',
    'Fensterplatz',
    'Türplatz',
    'Leistungsstark',
    'Leistungsschwach',
    'Wunschpartner',
    'Distanzwunsch',
  ],
  en: [
    'Name',
    'Gender',
    'Height',
    'Language level',
    'Social role',
    'Restless',
    'Shy',
    'Distracted',
    'Front row',
    'Window seat',
    'Door seat',
    'High performer',
    'Low performer',
    'Wish partner',
    'Avoid partner',
  ],
};

/** Cell value marking a boolean column as set. */
/**
 * The delimiter the template and the export write. Excel set to German splits
 * a file on the semicolon and shows a comma-separated one as a single column;
 * set to English it splits on the comma. The import guesses the delimiter, so
 * it reads either.
 */
export const CSV_DELIMITER: Record<CsvLanguage, string> = {
  de: ';',
  en: ',',
};

/**
 * Starts every file the app writes: without it, Excel reads UTF-8 in the
 * system's legacy encoding and "Müller" opens as "MÃ¼ller". The import drops
 * it again.
 */
export const CSV_BYTE_ORDER_MARK = '\uFEFF';

export const CSV_TRUE_VALUE: Record<CsvLanguage, string> = {
  de: 'ja',
  en: 'yes',
};

export const CSV_GENDER_LABELS: Record<
  CsvLanguage,
  Record<NonNullable<Student['gender']>, string>
> = {
  de: { boy: 'Männlich', girl: 'Weiblich', diverse: 'Divers' },
  en: { boy: 'Male', girl: 'Female', diverse: 'Diverse' },
};

export const CSV_HEIGHT_LABELS: Record<
  CsvLanguage,
  Record<HeightCategory, string>
> = {
  de: { small: 'Klein', tall: 'Groß' },
  en: { small: 'Small', tall: 'Tall' },
};

export const CSV_LANGUAGE_SKILL_LABELS: Record<
  CsvLanguage,
  Record<NonNullable<Student['languageSkill']>, string>
> = {
  de: {
    native: 'Erstsprache',
    fluent: 'Fließend',
    intermediate: 'Fortgeschritten',
    beginner: 'Anfänger',
    daz: 'DaZ-Förderung',
  },
  en: {
    native: 'First language',
    fluent: 'Fluent',
    intermediate: 'Intermediate',
    beginner: 'Beginner',
    daz: 'Language support',
  },
};

export const CSV_SOCIAL_ROLE_LABELS: Record<
  CsvLanguage,
  Record<NonNullable<Student['socialRole']>, string>
> = {
  de: {
    mediator: 'Mediator',
    leader: 'Anführer',
    loner: 'Einzelgänger',
    socialHub: 'Mittelpunkt',
  },
  en: {
    mediator: 'Mediator',
    leader: 'Leader',
    loner: 'Loner',
    socialHub: 'Social hub',
  },
};
