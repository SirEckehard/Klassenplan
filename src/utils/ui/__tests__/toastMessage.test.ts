// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, test, expect } from 'vitest';
import { getToastMessage } from '@/utils/ui/toast';

describe('getToastMessage', () => {
  test('resolves a namespaced translation key', () => {
    expect(getToastMessage('toast:csv.showExample')).not.toBe(
      'toast:csv.showExample',
    );
  });

  test('leaves already translated text untouched', () => {
    expect(getToastMessage('Alles gespeichert')).toBe('Alles gespeichert');
  });

  test('keeps a sentence that happens to contain a colon', () => {
    // i18next would read "Gefundene Spalten" as a namespace and return only the
    // rest of the sentence — the CSV import messages rely on this guard.
    const sentence = 'Gefundene Spalten: Vorname, Nachname. Bitte umbenennen.';
    expect(getToastMessage(sentence)).toBe(sentence);
  });
});
