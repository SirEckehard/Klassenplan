// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, test } from 'vitest';
import {
  applyCsvPreset,
  detectCsvPreset,
} from '@/utils/csv/csvPresetDetection';
import { CSV_PRESETS, type CsvPreset } from '@/utils/csv/csvPresets';
import type { CsvParseResult } from '@/utils/csv/csvTypes';

const presetById = (id: CsvPreset['id']): CsvPreset => {
  const preset = CSV_PRESETS.find((entry) => entry.id === id);
  if (!preset) throw new Error(`Unknown preset: ${id}`);
  return preset;
};

const parseResult = (
  fields: string[],
  data: Array<Record<string, unknown>>,
): CsvParseResult =>
  ({
    data,
    errors: [],
    meta: {
      fields,
      delimiter: ',',
      linebreak: '\n',
      aborted: false,
      truncated: false,
      cursor: 0,
    },
  }) as unknown as CsvParseResult;

describe('detectCsvPreset', () => {
  test('recognises a WebUntis export by its Langname column', () => {
    const match = detectCsvPreset([
      'langname',
      'vorname',
      'kurzname',
      'klasse',
    ]);

    expect(match?.preset.id).toBe('webuntis');
  });

  test('recognises a Schulmanager export by its address block', () => {
    const match = detectCsvPreset([
      'nachname',
      'vorname',
      'klasse',
      'strasse',
      'plz',
      'ort',
    ]);

    expect(match?.preset.id).toBe('schulmanager');
  });

  test('recognises a SchILD export by its statistics columns', () => {
    const match = detectCsvPreset([
      'nachname',
      'vorname',
      'jahrgang',
      'schuelerid',
    ]);

    expect(match?.preset.id).toBe('schild');
  });

  test('claims nothing for an ordinary class list', () => {
    // Required headings alone must never be enough — otherwise every hand-made
    // list would be attributed to some vendor.
    expect(detectCsvPreset(['nachname', 'vorname', 'klasse'])).toBeNull();
    expect(detectCsvPreset(['name', 'geschlecht'])).toBeNull();
  });

  test('compares headings independent of case and punctuation', () => {
    const match = detectCsvPreset(['Lang-Name', 'Vorname ', 'Kurzname']);

    expect(match?.preset.id).toBe('webuntis');
  });
});

describe('applyCsvPreset', () => {
  const renamingPreset: CsvPreset = {
    id: 'webuntis',
    vendor: 'Test',
    required: [],
    signals: [],
    rename: { langname: 'nachname', bemerkung: 'besonderheiten' },
    defaultNameMode: 'firstName',
  };

  test('renames headings and rows together', () => {
    const result = applyCsvPreset(
      parseResult(
        ['langname', 'vorname'],
        [{ langname: 'Müller', vorname: 'Anna' }],
      ),
      renamingPreset,
    );

    expect(result.meta.fields).toEqual(['nachname', 'vorname']);
    expect(result.data[0]).toEqual({ nachname: 'Müller', vorname: 'Anna' });
  });

  test('keeps a column the file already has instead of overwriting it', () => {
    const result = applyCsvPreset(
      parseResult(
        ['langname', 'nachname', 'vorname'],
        [{ langname: 'Kürzel', nachname: 'Müller', vorname: 'Anna' }],
      ),
      renamingPreset,
    );

    expect(result.meta.fields).toEqual(['langname', 'nachname', 'vorname']);
    expect(result.data[0]).toMatchObject({
      langname: 'Kürzel',
      nachname: 'Müller',
    });
  });

  test('preserves column order', () => {
    const result = applyCsvPreset(
      parseResult(
        ['vorname', 'langname', 'geschlecht'],
        [{ vorname: 'Anna', langname: 'Müller', geschlecht: 'w' }],
      ),
      renamingPreset,
    );

    expect(Object.keys(result.data[0])).toEqual([
      'vorname',
      'nachname',
      'geschlecht',
    ]);
  });

  test('decodes the SchILD gender codes', () => {
    const result = applyCsvPreset(
      parseResult(
        ['nachname', 'vorname', 'geschlecht'],
        [
          { nachname: 'Müller', vorname: 'Anna', geschlecht: '4' },
          { nachname: 'Schmidt', vorname: 'Ben', geschlecht: '3' },
        ],
      ),
      presetById('schild'),
    );

    expect(result.data.map((row) => row.geschlecht)).toEqual(['w', 'm']);
  });

  test('leaves values the decode table does not know untouched', () => {
    // This is what makes a wrongly matched preset harmless: only exact hits are
    // replaced, everything else passes through.
    const result = applyCsvPreset(
      parseResult(
        ['nachname', 'vorname', 'geschlecht'],
        [{ nachname: 'Müller', vorname: 'Anna', geschlecht: 'weiblich' }],
      ),
      presetById('schild'),
    );

    expect(result.data[0].geschlecht).toBe('weiblich');
  });

  test('returns the input unchanged when there is nothing to do', () => {
    const input = parseResult(['nachname', 'vorname'], [{ nachname: 'A' }]);

    expect(applyCsvPreset(input, presetById('webuntis'))).toBe(input);
  });
});
