// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import type { ClassroomTable, Student } from '@/types';
import { createMockStudent } from '@/__tests__/utils';
import { computePlanNameFontSize } from '../planNameSize';
import { fitNameOnSeat, seatNameMaxFontSize } from '../seatLabelLayout';

// A double desk: two 55 × 65 seats one above the other.
const desk = (x: number, rotation = 0): ClassroomTable => ({
  x,
  y: 100,
  width: 55,
  height: 130,
  rotation,
  seatCount: 2,
  locked: false,
  zIndex: 0,
  templateType: 'double',
});

const plain = (name: string, id: string): Student =>
  createMockStudent({ id, name, gender: undefined });

const sizeOf = (
  tables: ClassroomTable[],
  seating: (Student | null)[][],
  extra: Partial<Parameters<typeof computePlanNameFontSize>[0]> = {},
) =>
  computePlanNameFontSize({
    tables,
    seating,
    labelFor: (student) => student.name,
    allStudents: seating.flat().filter((s): s is Student => s !== null),
    showSpecialNeeds: false,
    ...extra,
  });

describe('computePlanNameFontSize', () => {
  it('is undefined for a plan without names', () => {
    expect(sizeOf([desk(100)], [[null, null]])).toBeUndefined();
  });

  it('lets a conspicuously long name shrink on its own', () => {
    const names = ['Leo', 'Mia', 'Tom', 'Ida', 'Ben'];
    const seating = [
      ...names.map((name, index) => [plain(name, `s${index}`), null]),
      [plain('Konstantinopoulos-Wiederhold', 'long'), null],
    ];
    const tables = seating.map((_, index) => desk(100 + index * 70));
    const size = sizeOf(tables, seating);
    // Five short names reach the seat's cap; the long one does not set it.
    expect(size).toBeCloseTo(seatNameMaxFontSize(55, 65));
  });

  it('measures the seats as the table plan draws them', () => {
    const anna = plain('Paul Zimmermann', 'a');
    const upright = sizeOf([desk(100)], [[anna, null]]);
    const expected = fitNameOnSeat(
      'Paul Zimmermann',
      { seatWidth: 55, seatHeight: 65, rotation: 0 },
      null,
      { maxFont: seatNameMaxFontSize(55, 65) },
    ).fontSize;
    expect(upright).toBeCloseTo(expected);
  });

  it('gives turned names the seat height across', () => {
    const anna = plain('Paul Zimmermann', 'a');
    const upright = sizeOf([desk(100)], [[anna, null]]);
    // The export's portrait sheet turns every name back a quarter.
    const turned = sizeOf([desk(100)], [[anna, null]], { labelRotation: -90 });
    expect(turned).toBeGreaterThan(upright!);
  });

  it('keeps clear of the editor lock', () => {
    const anna = plain('Paul Zimmermann', 'a');
    const free = sizeOf([desk(100)], [[anna, null]]);
    const locked = sizeOf([desk(100)], [[anna, null]], { lock: true });
    expect(locked).toBeLessThanOrEqual(free!);
  });

  it('measures full names broken in two, as the seats set them', () => {
    const mia = plain('Mia Wolf', 'a');
    const auto = sizeOf([desk(100)], [[mia, null]]);
    const split = sizeOf([desk(100)], [[mia, null]], { split: true });
    // Short enough for one line at the seat's cap, broken it is capped too.
    expect(split).toBeCloseTo(auto!);
  });
});
