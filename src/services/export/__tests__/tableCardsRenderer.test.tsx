// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import '@/i18n';
import { renderTableCardSvgPages } from '@/services/export/sceneRenderer';
import type { TableCardsInput } from '@/components/scene/TableCardsSheet';
import { createMockStudent } from '@/__tests__/utils';
import {
  cardFontFamily,
  ESTIMATED_CARD_METRICS,
} from '@/utils/export/cardFonts';
import {
  buildTableCards,
  CARD_TONE_COLOURS,
  DEFAULT_TABLE_CARD_SETTINGS,
  type TableCardSettings,
} from '@/utils/ui/tableCards';

const students = Array.from({ length: 5 }, (_, index) =>
  createMockStudent({
    id: `s${index}`,
    name: ['Ben Yilmaz', 'Mia Schulz', 'Cem Kaya', 'Lea Fischer', 'Ole Berg'][
      index
    ],
    hasPhoto: index === 0,
  }),
);

const inputWith = (
  settings: Partial<TableCardSettings> = {},
  extra: Partial<TableCardsInput> = {},
): TableCardsInput => {
  const full = { ...DEFAULT_TABLE_CARD_SETTINGS, ...settings };
  return {
    cards: buildTableCards(students, {
      order: 'alphabetical',
      tone: full.tone,
    }),
    settings: full,
    fontFamily: cardFontFamily(full.font),
    metrics: ESTIMATED_CARD_METRICS,
    classLine: '3a · 2026/27',
    ...extra,
  };
};

const parse = (markup: string) =>
  new DOMParser().parseFromString(markup, 'image/svg+xml');

const texts = (markup: string) =>
  Array.from(parse(markup).querySelectorAll('text')).map(
    (node) => node.textContent,
  );

describe('renderTableCardSvgPages', () => {
  it('prints two folded cards to a page, every name on its front and its back', async () => {
    const pages = await renderTableCardSvgPages(inputWith());
    expect(pages).toHaveLength(3);
    const first = parse(pages[0]!);
    expect(first.documentElement.getAttribute('viewBox')).toBe('0 0 210 297');
    expect(texts(pages[0]!).filter((text) => text === 'Ben')).toHaveLength(2);
    // The back of each card is turned, so it stands upright once folded.
    expect(
      Array.from(first.querySelectorAll('g[transform*="rotate(180)"]')),
    ).toHaveLength(2);
    // The class at the foot, the font named but not carried.
    expect(texts(pages[0]!)).toContain('3a · 2026/27');
    expect(pages[0]).not.toContain('@font-face');
    expect(pages[0]).toContain('KP Card Andika');
  });

  it('tints each card in its child’s paper and draws a motif', async () => {
    const [page] = await renderTableCardSvgPages(inputWith({ tone: 'mint' }));
    expect(page).toContain(CARD_TONE_COLOURS.mint.paper);
    // A Phosphor motif: an SVG of its own on the card.
    expect(parse(page!).querySelectorAll('svg svg').length).toBeGreaterThan(0);
  });

  it('leaves the paper white and the name hollow for colouring in', async () => {
    const [page] = await renderTableCardSvgPages(
      inputWith({ colouring: true, tone: 'mint' }),
    );
    expect(page).not.toContain(CARD_TONE_COLOURS.mint.paper);
    const name = Array.from(parse(page!).querySelectorAll('text')).find(
      (node) => node.textContent === 'Ben',
    );
    expect(name?.getAttribute('fill')).toBe('#ffffff');
    expect(name?.getAttribute('stroke')).toBeTruthy();
  });

  it('shows the photo, the last name and the table where asked for', async () => {
    const cards = buildTableCards(students, {
      order: 'alphabetical',
      tone: 'mixed',
    }).map((card) => ({ ...card, table: 4 }));
    const [page] = await renderTableCardSvgPages(
      inputWith(
        { showPhoto: true, showLastName: true, showPlace: true },
        {
          cards,
          photoDataUrls: new Map([['s0', 'data:image/jpeg;base64,AAAA']]),
        },
      ),
    );
    expect(page).toContain('data:image/jpeg;base64,AAAA');
    expect(texts(page!)).toContain('Yilmaz');
    expect(texts(page!)).toContain('Tisch 4');
  });

  it('puts eight badges on a page and marks every cut', async () => {
    const pages = await renderTableCardSvgPages(
      inputWith({ format: 'badge', motifs: 'none' }),
    );
    expect(pages).toHaveLength(1);
    const doc = parse(pages[0]!);
    expect(
      doc.querySelectorAll('line[stroke-dasharray="2.4 1.6"]'),
    ).toHaveLength(4);
    expect(doc.querySelectorAll('g[transform*="rotate(180)"]')).toHaveLength(0);
  });

  it('sets the teacher’s own picture on every card', async () => {
    const pages = await renderTableCardSvgPages(
      inputWith(
        { motifs: 'own' },
        { ownImageDataUrl: 'data:image/png;base64,BBBB' },
      ),
    );
    const images = pages.flatMap((page) =>
      Array.from(parse(page).querySelectorAll('image')),
    );
    // A front and a back for each of the five.
    expect(images).toHaveLength(10);
  });
});
