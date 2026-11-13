// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { createMockClassroomScene, createMockStudent } from '@/__tests__/utils';
import { ESTIMATED_CARD_METRICS } from '@/utils/export/cardFonts';
import {
  buildTableCards,
  cardFaceLayout,
  cardNameSizes,
  cardSheetLayout,
  DEFAULT_TABLE_CARD_SETTINGS,
  normalizeTableCardSettings,
  paginateCards,
  splitCardName,
  spreadSlots,
  wavyFramePath,
  writingLines,
} from '../tableCards';
import { cardMotifs } from '../tableCardMotifs';

const area = (rect: { width: number; height: number }) =>
  rect.width * rect.height;

describe('table card sheets', () => {
  it('lays a large tent card across a page, its back upside down above the fold', () => {
    const sheet = cardSheetLayout('tentLarge');
    expect(sheet).toMatchObject({
      orientation: 'landscape',
      width: 297,
      height: 210,
    });
    expect(sheet.cards).toEqual([
      [
        { x: 0, y: 0, width: 297, height: 105, upsideDown: true },
        { x: 0, y: 105, width: 297, height: 105, upsideDown: false },
      ],
    ]);
    expect(sheet.folds).toEqual([{ x1: 0, y1: 105, x2: 297, y2: 105 }]);
    expect(sheet.cuts).toEqual([]);
  });

  it('puts two small tent cards on a page upright, cut apart across the middle', () => {
    const sheet = cardSheetLayout('tentSmall');
    expect(sheet.orientation).toBe('portrait');
    expect(sheet.cards).toHaveLength(2);
    expect(sheet.cuts).toEqual([{ x1: 0, y1: 148.5, x2: 210, y2: 148.5 }]);
    expect(sheet.folds.map((fold) => fold.y1)).toEqual([74.25, 222.75]);
    for (const [back, front] of sheet.cards) {
      expect(back!.upsideDown).toBe(true);
      expect(front!.upsideDown).toBe(false);
      expect(front!.y).toBeCloseTo(back!.y + back!.height);
    }
  });

  it('fills a page with eight name badges that cover it exactly', () => {
    const sheet = cardSheetLayout('badge');
    expect(sheet.cards).toHaveLength(8);
    const faces = sheet.cards.flat();
    expect(faces.every((face) => !face.upsideDown)).toBe(true);
    expect(faces.reduce((sum, face) => sum + area(face), 0)).toBeCloseTo(
      210 * 297,
    );
    expect(faces[0]).toMatchObject({ width: 105, height: 74.25 });
    expect(sheet.cuts).toHaveLength(4);
    expect(sheet.folds).toEqual([]);
  });

  it('needs pages for a full class as each format holds cards', () => {
    const cards = Array.from({ length: 36 }, (_, index) => index);
    expect(paginateCards(cards, 'tentLarge')).toHaveLength(36);
    expect(paginateCards(cards, 'tentSmall')).toHaveLength(18);
    expect(paginateCards(cards, 'badge')).toHaveLength(5);
    expect(paginateCards(cards, 'badge').at(-1)).toEqual([32, 33, 34, 35]);
    expect(paginateCards([], 'badge')).toEqual([[]]);
  });
});

describe('table cards', () => {
  const students = [
    createMockStudent({ id: 'b', name: 'Ben Yilmaz' }),
    createMockStudent({ id: 'a', name: 'Anna Maria Becker' }),
    createMockStudent({ id: 'c', name: 'Cem' }),
  ];

  it('puts the first name big and the rest of the name small', () => {
    expect(splitCardName('Anna Maria Becker')).toEqual({
      firstName: 'Anna',
      lastName: 'Maria Becker',
    });
    expect(splitCardName('  Cem ')).toEqual({ firstName: 'Cem', lastName: '' });
  });

  it('reads the plan table by table and names each card’s table', () => {
    const scene = createMockClassroomScene();
    const seating = scene.tables.map(() => []) as (typeof students)[];
    seating[0] = [students[2]!, students[0]!];
    const cards = buildTableCards(students, {
      order: 'tables',
      tone: 'mixed',
      seating,
      scene,
    });
    expect(cards.map((card) => [card.firstName, card.table])).toEqual([
      ['Cem', 1],
      ['Ben', 1],
      ['Anna', null],
    ]);
  });

  it('orders by name and keeps the tables to print', () => {
    const scene = createMockClassroomScene();
    const seating = scene.tables.map(() => []) as (typeof students)[];
    seating[0] = [students[0]!];
    const cards = buildTableCards(students, {
      order: 'alphabetical',
      tone: 'sky',
      seating,
      scene,
    });
    expect(cards.map((card) => card.firstName)).toEqual(['Anna', 'Ben', 'Cem']);
    expect(cards.find((card) => card.firstName === 'Ben')?.table).toBe(1);
    expect(cards.every((card) => card.tone === 'sky')).toBe(true);
  });

  it('gives a child the same tint every time it prints', () => {
    const once = buildTableCards(students, {
      order: 'alphabetical',
      tone: 'mixed',
    });
    const again = buildTableCards([...students].reverse(), {
      order: 'alphabetical',
      tone: 'mixed',
    });
    expect(again.map((card) => card.tone)).toEqual(
      once.map((card) => card.tone),
    );
  });

  it('hands out tints and motifs so none repeats while one is free', () => {
    const ids = Array.from({ length: 14 }, (_, index) => `student-${index}`);
    const slots = spreadSlots(ids, 10);
    // Ten children, ten motifs: each one once.
    expect(new Set(spreadSlots(ids.slice(0, 10), 10)).size).toBe(10);
    // Fourteen: every motif in use, four of them twice.
    expect(new Set(slots).size).toBe(10);
    // In any order, each child keeps its own.
    expect(spreadSlots([...ids].reverse(), 10)).toEqual([...slots].reverse());
    expect(cardMotifs('own')).toEqual([]);
    expect(cardMotifs('animals').length).toBeGreaterThan(0);
  });
});

describe('a card face', () => {
  const face = cardFaceLayout(210, 74.25, {
    colouring: false,
    hasPicture: true,
    hasLastName: false,
    hasFoot: true,
  });

  it('keeps everything inside a printer’s margin, the name right of the picture', () => {
    expect(face.margin).toBeGreaterThanOrEqual(6);
    expect(face.picture.x).toBe(face.margin);
    expect(face.name.x).toBeGreaterThan(face.picture.x + face.picture.width);
    expect(face.name.x + face.name.width).toBeCloseTo(210 - face.margin);
    expect(face.picture.y + face.picture.height).toBeLessThanOrEqual(
      74.25 - face.margin + 0.001,
    );
  });

  it('gives the class one name size, and a name far too long one of its own', () => {
    const names = ['Amira', 'Finn', 'Zeynep', 'Lina', 'Maximilian-Alexander'];
    const { shared, sizes } = cardNameSizes(
      names,
      face,
      ESTIMATED_CARD_METRICS,
    );
    // The longest ordinary name sets the size for all of them.
    expect(shared).toBeCloseTo(
      face.name.width / ESTIMATED_CARD_METRICS.width('Zeynep'),
    );
    expect(sizes.slice(0, 4)).toEqual([shared, shared, shared, shared]);
    expect(sizes[4]).toBeLessThan(shared);
    expect(
      ESTIMATED_CARD_METRICS.width('Maximilian-Alexander') * sizes[4]!,
    ).toBeCloseTo(face.name.width);
  });

  it('lets short names take the largest size the card allows', () => {
    const { shared } = cardNameSizes(
      ['Ben', 'Mia'],
      face,
      ESTIMATED_CARD_METRICS,
    );
    expect(shared).toBeCloseTo(
      Math.min(
        face.maxNameSize,
        face.name.width / ESTIMATED_CARD_METRICS.width('Ben'),
      ),
    );
  });

  it('draws the four writing lines from top to bottom', () => {
    const lines = writingLines(40, 20, ESTIMATED_CARD_METRICS);
    expect(lines.ascender).toBeLessThan(lines.xHeight);
    expect(lines.xHeight).toBeLessThan(lines.baseline);
    expect(lines.baseline).toBeLessThan(lines.descender);
    expect(lines.baseline - lines.xHeight).toBeCloseTo(10);
  });

  it('closes a wavy frame where it began', () => {
    const path = wavyFramePath({ x: 2, y: 2, width: 100, height: 60 }, 1, 7);
    expect(path.startsWith('M2.00 2.00L')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });
});

describe('table card settings', () => {
  it('keeps what is valid and defaults the rest', () => {
    expect(normalizeTableCardSettings(null)).toEqual(
      DEFAULT_TABLE_CARD_SETTINGS,
    );
    expect(
      normalizeTableCardSettings({
        format: 'badge',
        font: 'comicSans',
        tone: 'lilac',
        writingLines: 'yes',
        colouring: true,
      }),
    ).toEqual({
      ...DEFAULT_TABLE_CARD_SETTINGS,
      format: 'badge',
      tone: 'lilac',
      colouring: true,
    });
  });
});
