// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, test, beforeEach } from 'vitest';
import { exportStudentsToCsv } from '../useSeatingPersistence';
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
      '\'=SUM(A1:A2)',
      '\'+100',
      '\'-42',
      '\'@cmd',
      '\'\t=HYPERLINK("http://example.com")',
      '\'  =danger',
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

    const csv = exportStudentsToCsv(students);
    const lines = csv.split('\n');

    // Check header includes all columns
    expect(lines[0]).toBe(
      'Name,Geschlecht,Körpergröße,Unruhig,Schüchtern,Ablenkbarkeit,Vordere Plätze,Fensterplatz,Türnähe,Wunschpartner,Distanzwunsch,Leistungsstark,Leistungsschwach',
    );

    // Check Max Strong - performanceStrong=true
    expect(lines[1]).toBe(
      [
        'Max Strong',
        'Junge',
        'Groß',
        '',
        '',
        '',
        '',
        '',
        '',
        'Anna Weak',
        '',
        'ja',
        '',
      ].join(','),
    );

    // Check Anna Weak - performanceWeak=true, restless=true
    expect(lines[2]).toBe(
      [
        'Anna Weak',
        'Mädchen',
        'Klein',
        'ja',
        '',
        '',
        '',
        '',
        '',
        '',
        'Max Strong',
        '',
        'ja',
      ].join(','),
    );

    // Check Tom Neutral - no performance flags, but other attributes
    expect(lines[3]).toBe(
      [
        'Tom Neutral',
        'Junge',
        'Mittel',
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

    const csv = exportStudentsToCsv(original);
    const lines = csv.split('\n');

    // Verify all attributes are exported
    expect(lines[1]).toBe(
      [
        'Test Student',
        'Divers',
        '',
        'ja',
        'ja',
        'ja',
        'ja',
        '',
        '',
        '',
        '',
        'ja',
        '',
      ].join(','),
    );
  });

  test('exports window and door preferences', () => {
    const csv = exportStudentsToCsv([
      createMockStudent({
        id: 'env',
        name: 'Pref Student',
        prefersWindow: true,
        prefersDoor: true,
      }),
    ]);

    const [, line] = csv.split('\n');
    const cells = line?.split(',') ?? [];

    expect(cells[7]).toBe('ja');
    expect(cells[8]).toBe('ja');
  });
});
