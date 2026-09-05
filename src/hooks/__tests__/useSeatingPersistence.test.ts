// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, test, beforeEach } from 'vitest';
import { exportStudentsToCsv } from '../useSeatingPersistence';
import { parseCsvFlexible } from '@/utils/data/csvUtils';
import { createMockStudent, setupCleanStorage } from '../../__tests__/utils';

beforeEach(() => {
  setupCleanStorage();
});

const readFirstCell = (row: string): string => {
  if (row.startsWith('"')) {
    let index = 1;
    let value = '';
    while (index < row.length) {
      const char = row[index];
      if (char === '"') {
        if (row[index + 1] === '"') {
          value += '"';
          index += 2;
          continue;
        }
        break;
      }
      value += char;
      index += 1;
    }
    return value;
  }
  const commaIndex = row.indexOf(',');
  return commaIndex === -1 ? row : row.slice(0, commaIndex);
};

const collectNameCells = (csv: string): string[] =>
  csv
    .split('\n')
    .slice(1)
    .filter((line) => line.length > 0)
    .map((line) => readFirstCell(line));

describe('exportStudentsToCsv', () => {
  test('escapes values starting with formula indicators', () => {
    const csv = exportStudentsToCsv([
      createMockStudent({ id: '1', name: '=SUM(A1:A2)' }),
      createMockStudent({ id: '2', name: '+100' }),
      createMockStudent({ id: '3', name: '-42' }),
      createMockStudent({ id: '4', name: '@cmd' }),
      createMockStudent({
        id: '5',
        name: '\t=HYPERLINK("http://example.com")',
      }),
      createMockStudent({ id: '6', name: '  =danger' }),
    ]);
    expect(collectNameCells(csv)).toEqual([
      "'=SUM(A1:A2)",
      "'+100",
      "'-42",
      "'@cmd",
      '\'\t=HYPERLINK("http://example.com")',
      "'  =danger",
    ]);
  });

  test('leaves regular values unchanged', () => {
    const csv = exportStudentsToCsv([
      createMockStudent({ id: 'safe', name: 'Alice' }),
    ]);
    expect(collectNameCells(csv)).toEqual(['Alice']);
  });

  test('keeps escape when CSV quoting is required', () => {
    const formulaName = '=SUM("A1",A2)';
    const csv = exportStudentsToCsv([
      createMockStudent({ id: 'quote', name: formulaName }),
    ]);
    expect(collectNameCells(csv)).toEqual([`'${formulaName}`]);
  });

  test('exports all student properties including performance flags', () => {
    const students = [
      createMockStudent({
        id: '1',
        name: 'Max Strong',
        gender: 'boy',
        height: 'tall',
        performanceStrong: true,
        performanceWeak: false,
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        wishPartnerId: '2',
      }),
      createMockStudent({
        id: '2',
        name: 'Anna Weak',
        gender: 'girl',
        height: 'small',
        performanceStrong: false,
        performanceWeak: true,
        restless: true,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
        avoidPartnerId: '1',
      }),
      createMockStudent({
        id: '3',
        name: 'Tom Neutral',
        gender: 'boy',
        height: 'medium',
        performanceStrong: false,
        performanceWeak: false,
        restless: false,
        shy: true,
        concentrationIssues: true,
        needsFrontSeat: true,
      }),
    ];

    const csv = exportStudentsToCsv(students, 'de');
    const lines = csv.split('\n');

    // Check header includes all columns (must match the import template)
    expect(lines[0]).toBe(
      'Name,Geschlecht,Körpergröße,Sprachniveau,Soziale Rolle,Unruhig,Schüchtern,Ablenkbarkeit,Vordere Plätze,Fensterplatz,Türplatz,Leistungsstark,Leistungsschwach,Wunschpartner,Distanzwunsch',
    );

    // Check Max Strong - performanceStrong=true
    expect(lines[1]).toBe(
      [
        'Max Strong',
        'Männlich',
        'Groß',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'ja',
        '',
        'Anna Weak',
        '',
      ].join(','),
    );

    // Check Anna Weak - performanceWeak=true, restless=true
    expect(lines[2]).toBe(
      [
        'Anna Weak',
        'Weiblich',
        'Klein',
        '',
        '',
        'ja',
        '',
        '',
        '',
        '',
        '',
        '',
        'ja',
        '',
        'Max Strong',
      ].join(','),
    );

    // Check Tom Neutral - no performance flags, but other attributes
    expect(lines[3]).toBe(
      [
        'Tom Neutral',
        'Männlich',
        'Mittel',
        '',
        '',
        '',
        'ja',
        'ja',
        'ja',
        '',
        '',
        '',
        '',
        '',
        '',
      ].join(','),
    );
  });

  test('exports complete round-trip with performance flags', () => {
    const original = [
      createMockStudent({
        id: '1',
        name: 'Test Student',
        gender: 'diverse',
        performanceStrong: true,
        performanceWeak: false,
        restless: true,
        shy: true,
        concentrationIssues: true,
        needsFrontSeat: true,
      }),
    ];

    const csv = exportStudentsToCsv(original, 'de');
    const lines = csv.split('\n');

    // Verify all attributes are exported
    expect(lines[1]).toBe(
      [
        'Test Student',
        'Divers',
        '',
        '',
        '',
        'ja',
        'ja',
        'ja',
        'ja',
        '',
        '',
        'ja',
        '',
        '',
        '',
      ].join(','),
    );
  });

  test('exports window and door preferences', () => {
    const csv = exportStudentsToCsv(
      [
        createMockStudent({
          id: 'env',
          name: 'Pref Student',
          prefersWindow: true,
          prefersDoor: true,
        }),
      ],
      'de',
    );

    const [, line] = csv.split('\n');
    const cells = line?.split(',') ?? [];

    expect(cells[9]).toBe('ja');
    expect(cells[10]).toBe('ja');
  });

  test('exports language skill and social role labels', () => {
    const csv = exportStudentsToCsv(
      [
        createMockStudent({
          id: 'lang',
          name: 'Kim Fischer',
          languageSkill: 'daz',
          socialRole: 'leader',
        }),
      ],
      'de',
    );

    const [, line] = csv.split('\n');
    const cells = line?.split(',') ?? [];

    expect(cells[3]).toBe('DaZ-Förderung');
    expect(cells[4]).toBe('Anführer');
  });

  test('exports all wish and avoid partners from the plural id arrays', () => {
    const csv = exportStudentsToCsv([
      createMockStudent({
        id: '1',
        name: 'Anna',
        wishPartnerIds: ['2', '3', '4'],
        avoidPartnerIds: ['3'],
      }),
      createMockStudent({ id: '2', name: 'Ben' }),
      createMockStudent({ id: '3', name: 'Cem' }),
      createMockStudent({ id: '4', name: 'Dana' }),
    ]);

    const [, line] = csv.split('\n');
    expect(line).toContain('"Ben, Cem, Dana"');
    expect(line?.endsWith(',Cem')).toBe(true);
  });

  test('exports English headers and labels for the English UI language', () => {
    const csv = exportStudentsToCsv(
      [
        createMockStudent({
          id: 'en',
          name: 'Kim Fisher',
          gender: 'diverse',
          height: 'tall',
          languageSkill: 'daz',
          socialRole: 'leader',
          restless: true,
          prefersWindow: true,
        }),
      ],
      'en',
    );
    const [header, line] = csv.split('\n');

    expect(header).toBe(
      'Name,Gender,Height,Language level,Social role,Restless,Shy,Distracted,Front row,Window seat,Door seat,High performer,Low performer,Wish partner,Avoid partner',
    );
    expect(line?.split(',')).toEqual([
      'Kim Fisher',
      'Diverse',
      'Tall',
      'Language support',
      'Leader',
      'yes',
      '',
      '',
      '',
      'yes',
      '',
      '',
      '',
      '',
      '',
    ]);
  });

  test.each(['de', 'en'] as const)(
    'round-trip export → import preserves all attributes and partners (%s)',
    async (language) => {
      const original = [
        createMockStudent({
          id: '1',
          name: 'Anna',
          gender: 'girl',
          height: 'small',
          languageSkill: 'fluent',
          socialRole: 'mediator',
          restless: true,
          prefersDoor: true,
          wishPartnerIds: ['2', '3'],
          avoidPartnerIds: [],
        }),
        createMockStudent({
          id: '2',
          name: 'Ben',
          gender: 'boy',
          height: 'tall',
          languageSkill: 'native',
          performanceStrong: true,
          performanceWeak: false,
          prefersWindow: true,
          avoidPartnerIds: ['3'],
        }),
        createMockStudent({
          id: '3',
          name: 'Cem',
          socialRole: 'loner',
          shy: true,
          concentrationIssues: true,
          needsFrontSeat: true,
          performanceStrong: false,
          performanceWeak: true,
        }),
      ];

      const csv = exportStudentsToCsv(original, language);
      const file = new File([csv], 'roundtrip.csv', { type: 'text/csv' });
      const imported = await parseCsvFlexible(file, undefined, {
        useWorker: false,
      });

      expect(imported).toHaveLength(3);
      const byName = new Map(imported.map((s) => [s.name, s]));
      const anna = byName.get('Anna');
      const ben = byName.get('Ben');
      const cem = byName.get('Cem');

      expect(anna).toMatchObject({
        gender: 'girl',
        height: 'small',
        languageSkill: 'fluent',
        socialRole: 'mediator',
        restless: true,
        prefersDoor: true,
      });
      expect(anna?.wishPartnerIds).toEqual([ben?.id, cem?.id]);
      expect(ben).toMatchObject({
        gender: 'boy',
        height: 'tall',
        languageSkill: 'native',
        performanceStrong: true,
        prefersWindow: true,
      });
      expect(ben?.avoidPartnerIds).toEqual([cem?.id]);
      expect(cem).toMatchObject({
        socialRole: 'loner',
        shy: true,
        concentrationIssues: true,
        needsFrontSeat: true,
        performanceWeak: true,
      });
    },
  );
});
