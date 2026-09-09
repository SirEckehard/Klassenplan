// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, test } from 'vitest';
import { normalizeHeaderKey } from '@/utils/data/csvNormalization';
import { hasRecognizedCsvHeaders } from '@/utils/csv/csvColumnVocabulary';

describe('normalizeHeaderKey', () => {
  test('maps umlauts and their ASCII spelling to the same key', () => {
    expect(normalizeHeaderKey('Körpergröße')).toBe(
      normalizeHeaderKey('Koerpergroesse'),
    );
    expect(normalizeHeaderKey('Vordere Plätze')).toBe(
      normalizeHeaderKey('Vordere-Plaetze'),
    );
    expect(normalizeHeaderKey('Schüchtern')).toBe(
      normalizeHeaderKey('Schuechtern'),
    );
  });

  test('sees a combining umlaut the same as a precomposed one', () => {
    // Headings typed on macOS can arrive decomposed: "a" plus U+0308.
    expect(normalizeHeaderKey('Scha\u0308fer')).toBe('schaefer');
    expect(normalizeHeaderKey('Sch\u00e4fer')).toBe('schaefer');
  });

  test('drops case, spacing and punctuation', () => {
    expect(normalizeHeaderKey('  First Name ')).toBe('firstname');
    expect(normalizeHeaderKey('Schüler*in')).toBe('schuelerin');
  });

  test('strips other accents without expanding them', () => {
    expect(normalizeHeaderKey('Café')).toBe('cafe');
  });

  test('returns an empty string for an empty heading', () => {
    expect(normalizeHeaderKey('   ')).toBe('');
  });
});

describe('hasRecognizedCsvHeaders', () => {
  test('recognises name and attribute columns', () => {
    expect(hasRecognizedCsvHeaders(['Vorname', 'Irgendwas'])).toBe(true);
    expect(hasRecognizedCsvHeaders(['Langname'])).toBe(true);
    expect(hasRecognizedCsvHeaders(['Sprachniveau'])).toBe(true);
  });

  test('rejects a row of student data', () => {
    expect(hasRecognizedCsvHeaders(['Max Mustermann', 'Junge'])).toBe(false);
  });
});
