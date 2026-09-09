// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
export const normalizeCsvHeader = (header: string): string =>
  String(header ?? '')
    .trim()
    .toLowerCase();

/**
 * Reduce a header to letters and digits so it can be compared independent of
 * accents, punctuation and spacing.
 *
 * German umlauts are expanded to their ASCII transliteration rather than
 * stripped of their diacritics, because that is the spelling exports actually
 * use: "Vordere Plätze" and "Vordere Plaetze" both become "vordereplaetze",
 * "Körpergröße" and "Koerpergroesse" both become "koerpergroesse". Stripping
 * the diacritics instead would map them to "vordereplatze" and
 * "vordereplaetze" — two different keys for the same column.
 *
 * Normalizing to NFC first matters: a heading typed on macOS can arrive with
 * the umlaut as a combining mark, where a plain replace would not see it.
 *
 * Preset signatures, the column vocabulary and the parser's pattern lookups all
 * compare through this function, so a spelling that matches in one place cannot
 * silently miss in another.
 */
export const normalizeHeaderKey = (key: string): string =>
  String(key ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
