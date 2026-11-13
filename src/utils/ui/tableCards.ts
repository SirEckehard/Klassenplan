// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';
import type { CardFontId, CardFontMetrics } from '@/utils/export/cardFonts';
import { buildNoteListEntries } from './noteList';

/**
 * Table cards (decision 0047): a card for every child, to stand on the desk
 * or to wear, set in a font for beginners, with a motif of its own, a tint of
 * coloured paper and lines to write on. They belong to the children, so they
 * may carry colour, which no other sheet does.
 *
 * Everything here is measured in millimetres on A4, the unit the card sheet's
 * SVG is drawn in.
 */

/**
 * - `tentLarge`: one card on an A4 page across, folded along its middle — a
 *   front and a back, the back upside down so both stand upright.
 * - `tentSmall`: two such cards on an A4 page upright, cut apart across the
 *   middle, then each folded.
 * - `badge`: eight name badges, 105 × 74 mm, to cut out.
 */
export type TableCardFormat = 'tentLarge' | 'tentSmall' | 'badge';

export const TABLE_CARD_FORMATS: readonly TableCardFormat[] = [
  'tentSmall',
  'tentLarge',
  'badge',
];

/** The motif each child gets: from one of these sets, the teacher's own picture, or none. */
export type CardMotifSet =
  'animals' | 'vehicles' | 'nature' | 'food' | 'all' | 'own' | 'none';

export const CARD_MOTIF_SETS: readonly CardMotifSet[] = [
  'animals',
  'vehicles',
  'nature',
  'food',
  'all',
  'own',
  'none',
];

/** Six calm tints of coloured paper. */
const CARD_TONES = [
  'sand',
  'mint',
  'sky',
  'lilac',
  'rose',
  'lemon',
] as const;
export type CardToneName = (typeof CARD_TONES)[number];

/** White paper, a tint for every child, or one tint for all. */
export type CardTone = 'paper' | 'mixed' | CardToneName;

export const CARD_TONE_CHOICES: readonly CardTone[] = [
  'mixed',
  'paper',
  ...CARD_TONES,
];

/** The paper and the ink of its motif, spelled out for the serialised SVG. */
export const CARD_TONE_COLOURS: Record<
  CardToneName,
  { paper: string; ink: string }
> = {
  sand: { paper: '#f4e9d0', ink: '#8b6a2e' },
  mint: { paper: '#dcefe4', ink: '#2f7a55' },
  sky: { paper: '#dceaf6', ink: '#2f6a9e' },
  lilac: { paper: '#e9e1f4', ink: '#6a4e9c' },
  rose: { paper: '#f7e0e4', ink: '#a14a5e' },
  lemon: { paper: '#f5f0c8', ink: '#7e7224' },
};

export type CardBorder = 'none' | 'dots' | 'wave';
export const CARD_BORDERS: readonly CardBorder[] = ['none', 'dots', 'wave'];

/** As the plan reads, table by table, or by name. */
export type CardOrder = 'tables' | 'alphabetical';

export type TableCardSettings = {
  format: TableCardFormat;
  font: CardFontId;
  motifs: CardMotifSet;
  tone: CardTone;
  border: CardBorder;
  /** Four writing lines behind the name, as in a first-year exercise book. */
  writingLines: boolean;
  /** The motif large and the name hollow, for the children to colour in. */
  colouring: boolean;
  showLastName: boolean;
  showPhoto: boolean;
  /** "Tisch 3", by the plan. */
  showPlace: boolean;
  showClass: boolean;
  order: CardOrder;
};

export const DEFAULT_TABLE_CARD_SETTINGS: TableCardSettings = {
  format: 'tentSmall',
  font: 'andika',
  motifs: 'animals',
  tone: 'mixed',
  border: 'none',
  writingLines: true,
  colouring: false,
  showLastName: false,
  showPhoto: false,
  showPlace: false,
  showClass: true,
  order: 'tables',
};

const CARD_FONT_CHOICES: readonly CardFontId[] = [
  'andika',
  'abeezee',
  'patrickHand',
  'openDyslexic',
  'atkinson',
  'own',
];

const pick = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const flag = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

/** Read stored settings, keeping every valid field and defaulting the rest. */
export function normalizeTableCardSettings(stored: unknown): TableCardSettings {
  const source =
    stored && typeof stored === 'object'
      ? (stored as Record<string, unknown>)
      : {};
  const d = DEFAULT_TABLE_CARD_SETTINGS;
  return {
    format: pick(source.format, TABLE_CARD_FORMATS, d.format),
    font: pick(source.font, CARD_FONT_CHOICES, d.font),
    motifs: pick(source.motifs, CARD_MOTIF_SETS, d.motifs),
    tone: pick(source.tone, CARD_TONE_CHOICES, d.tone),
    border: pick(source.border, CARD_BORDERS, d.border),
    writingLines: flag(source.writingLines, d.writingLines),
    colouring: flag(source.colouring, d.colouring),
    showLastName: flag(source.showLastName, d.showLastName),
    showPhoto: flag(source.showPhoto, d.showPhoto),
    showPlace: flag(source.showPlace, d.showPlace),
    showClass: flag(source.showClass, d.showClass),
    order: pick(source.order, ['tables', 'alphabetical'] as const, d.order),
  };
}

// ── The sheet ────────────────────────────────────────────────────────────

/** A rectangle on the page, in millimetres. */
export type CardRect = { x: number; y: number; width: number; height: number };

/**
 * One face of a card: where it lies on the page and whether it is printed
 * upside down — the back of a folded card, so it stands upright too.
 */
export type CardPanel = CardRect & { upsideDown: boolean };

/** A line on the page: where to cut, or where to fold. */
export type CardLine = { x1: number; y1: number; x2: number; y2: number };

export type CardSheetLayout = {
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
  /** Each card's faces; a folded card has a back and a front. */
  cards: CardPanel[][];
  cuts: CardLine[];
  folds: CardLine[];
};

const A4_SHORT = 210;
const A4_LONG = 297;

/** A card folded across its middle: the back above, upside down, the front below. */
const tent = (x: number, y: number, width: number, height: number) => {
  const half = height / 2;
  return {
    faces: [
      { x, y, width, height: half, upsideDown: true },
      { x, y: y + half, width, height: half, upsideDown: false },
    ],
    fold: { x1: x, y1: y + half, x2: x + width, y2: y + half },
  };
};

/** Where the cards of one page lie, and where to cut and fold. */
export function cardSheetLayout(format: TableCardFormat): CardSheetLayout {
  switch (format) {
    case 'tentLarge': {
      const card = tent(0, 0, A4_LONG, A4_SHORT);
      return {
        orientation: 'landscape',
        width: A4_LONG,
        height: A4_SHORT,
        cards: [card.faces],
        cuts: [],
        folds: [card.fold],
      };
    }
    case 'tentSmall': {
      const half = A4_LONG / 2;
      const top = tent(0, 0, A4_SHORT, half);
      const bottom = tent(0, half, A4_SHORT, half);
      return {
        orientation: 'portrait',
        width: A4_SHORT,
        height: A4_LONG,
        cards: [top.faces, bottom.faces],
        cuts: [{ x1: 0, y1: half, x2: A4_SHORT, y2: half }],
        folds: [top.fold, bottom.fold],
      };
    }
    case 'badge': {
      const width = A4_SHORT / 2;
      const height = A4_LONG / 4;
      const cards: CardPanel[][] = [];
      for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 2; column += 1) {
          cards.push([
            {
              x: column * width,
              y: row * height,
              width,
              height,
              upsideDown: false,
            },
          ]);
        }
      }
      return {
        orientation: 'portrait',
        width: A4_SHORT,
        height: A4_LONG,
        cards,
        cuts: [
          { x1: width, y1: 0, x2: width, y2: A4_LONG },
          ...[1, 2, 3].map((row) => ({
            x1: 0,
            y1: row * height,
            x2: A4_SHORT,
            y2: row * height,
          })),
        ],
        folds: [],
      };
    }
  }
}

/** The cards in pages of as many as a page holds; no card makes one empty page. */
export function paginateCards<T>(
  cards: readonly T[],
  format: TableCardFormat,
): T[][] {
  const perPage = cardSheetLayout(format).cards.length;
  if (cards.length === 0) return [[]];
  const pages: T[][] = [];
  for (let start = 0; start < cards.length; start += perPage) {
    pages.push(cards.slice(start, start + perPage));
  }
  return pages;
}

// ── The cards ────────────────────────────────────────────────────────────

/** What one card says, before it is laid out. */
export type TableCard = {
  student: Student;
  /** The big line: the first name. */
  firstName: string;
  /** The small line: the rest of the name, where there is one. */
  lastName: string;
  /** The table's number on the plan, read as the note list reads it. */
  table: number | null;
  /** The tone of this child's card: its paper and the ink of its motif. */
  tone: CardToneName;
};

/** A small, stable number from a text: the same child, the same card. */
function stableHash(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Hands each child one of `size` things — a tint, a motif — so that no two
 * share one until every one is taken, and each keeps its own as long as the
 * class stays as it is: the children take their turn in the order of their
 * ids' hashes, whatever order they come in, each the slot its hash points to
 * or the next free one. Returns each id's slot, in the order of `ids`.
 */
export function spreadSlots(ids: readonly string[], size: number): number[] {
  if (size <= 0) return ids.map(() => 0);
  const turn = [...new Set(ids)].sort(
    (a, b) => stableHash(a) - stableHash(b) || a.localeCompare(b),
  );
  const slots = new Map<string, number>();
  let taken = new Set<number>();
  for (const id of turn) {
    if (taken.size === size) taken = new Set();
    let slot = stableHash(id) % size;
    while (taken.has(slot)) slot = (slot + 1) % size;
    taken.add(slot);
    slots.set(id, slot);
  }
  return ids.map((id) => slots.get(id) ?? 0);
}

/** The first word big, the rest of the name small. */
export function splitCardName(name: string): {
  firstName: string;
  lastName: string;
} {
  const [first = '', ...rest] = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: first, lastName: rest.join(' ') };
}

/**
 * The class's cards in the order they print: table by table as the plan
 * reads — front to back, along the board — or by name, which is also the
 * order without a plan. A child without a seat comes last, without a table.
 */
export function buildTableCards(
  students: readonly Student[],
  {
    order,
    tone,
    seating,
    scene,
    locale,
  }: {
    order: CardOrder;
    tone: CardTone;
    seating?: SeatingArrangement;
    scene?: ClassroomScene;
    locale?: string;
  },
): TableCard[] {
  const byTables = buildNoteListEntries(students, {
    order: 'tables',
    seating,
    scene,
    locale,
  });
  const tableOf = new Map(
    byTables.map((entry) => [entry.student.id, entry.table ?? null]),
  );
  const ordered =
    order === 'tables'
      ? byTables.map((entry) => entry.student)
      : buildNoteListEntries(students, { order: 'alphabetical', locale }).map(
          (entry) => entry.student,
        );
  const tones = spreadSlots(
    ordered.map((student) => student.id),
    CARD_TONES.length,
  );
  return ordered.map((student, index) => ({
    student,
    ...splitCardName(student.name),
    table: tableOf.get(student.id) ?? null,
    tone:
      tone === 'paper' || tone === 'mixed' ? CARD_TONES[tones[index]!]! : tone,
  }));
}

// ── One face ─────────────────────────────────────────────────────────────

/** Where everything stands on one face, relative to its top left corner. */
export type CardFaceLayout = {
  /** How far everything keeps from the edge: a printer's margin and air. */
  margin: number;
  /** The picture: a square on the left. */
  picture: CardRect;
  /** The room the name has, right of the picture. */
  name: CardRect;
  /** The size of the small lines (last name, class, place). */
  smallSize: number;
  /** The largest the name may be, by the height of its room. */
  maxNameSize: number;
};

/**
 * One face's frame. The picture takes the left, nearly as high as the face
 * and no more than a third of its width — to colour in, a little larger; the
 * name the rest, above a foot line for the class and the place.
 */
export function cardFaceLayout(
  width: number,
  height: number,
  {
    colouring,
    hasPicture,
    hasLastName,
    hasFoot,
  }: {
    colouring: boolean;
    hasPicture: boolean;
    hasLastName: boolean;
    hasFoot: boolean;
  },
): CardFaceLayout {
  const margin = Math.min(12, Math.max(6, height * 0.1));
  const inner = height - 2 * margin;
  const smallSize = inner * 0.11;
  const side = hasPicture
    ? Math.min(
        inner * (colouring ? 0.9 : 0.82),
        width * (colouring ? 0.32 : 0.3),
      )
    : 0;
  const gap = hasPicture ? Math.max(4, inner * 0.08) : 0;
  const foot = hasFoot ? smallSize * 1.6 : 0;
  const name: CardRect = {
    x: margin + side + gap,
    y: margin,
    width: width - 2 * margin - side - gap,
    height: inner - foot,
  };
  // Ascender and descender of a beginner's font come to about 1.05 em; the
  // last name takes a line of its own below.
  const lastLine = hasLastName ? smallSize * 1.45 : 0;
  return {
    margin,
    picture: {
      x: margin,
      y: margin + (inner - side) / 2,
      width: side,
      height: side,
    },
    name,
    smallSize,
    maxNameSize: Math.max(0, (name.height - lastLine) / 1.05),
  };
}

/**
 * One size for every name of the class, so the cards on the desks look
 * alike: the largest at which every name still fits — but a name far longer
 * than the others (it would fit only below three fifths of the size the
 * middle name of the class allows) does not shrink the rest; it gets a size
 * of its own.
 */
export function cardNameSizes(
  names: readonly string[],
  face: Pick<CardFaceLayout, 'name' | 'maxNameSize'>,
  metrics: Pick<CardFontMetrics, 'width'>,
): { shared: number; sizes: number[] } {
  const fits = names.map((name) => {
    const width = metrics.width(name);
    return width > 0
      ? Math.min(face.maxNameSize, face.name.width / width)
      : face.maxNameSize;
  });
  if (fits.length === 0) return { shared: face.maxNameSize, sizes: [] };
  const sorted = [...fits].sort((a, b) => a - b);
  const median = sorted[Math.floor((sorted.length - 1) / 2)]!;
  const shared = Math.min(...fits.filter((fit) => fit >= median * 0.6));
  return {
    shared,
    sizes: fits.map((fit) => Math.min(shared, fit)),
  };
}

/**
 * The four writing lines of a German first-year exercise book, for a name
 * whose baseline lies at `baseline`: the ascender line, the top of the
 * x-height, the baseline and the descender line.
 */
export function writingLines(
  baseline: number,
  size: number,
  metrics: Pick<CardFontMetrics, 'xHeight' | 'capHeight' | 'descent'>,
): { ascender: number; xHeight: number; baseline: number; descender: number } {
  return {
    ascender: baseline - Math.max(metrics.capHeight, 0.68) * size,
    xHeight: baseline - metrics.xHeight * size,
    baseline,
    descender: baseline + Math.max(metrics.descent, 0.2) * size,
  };
}

/**
 * A frame of gentle waves round a rectangle, as an SVG path: each side holds
 * a whole number of waves, so they meet at the corners without a kink.
 */
export function wavyFramePath(
  rect: CardRect,
  amplitude: number,
  wavelength: number,
): string {
  const { x, y, width, height } = rect;
  const corners: [number, number][] = [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ];
  const points: string[] = [];
  corners.forEach(([fromX, fromY], index) => {
    const [toX, toY] = corners[(index + 1) % corners.length]!;
    const length = Math.hypot(toX - fromX, toY - fromY);
    const waves = Math.max(1, Math.round(length / wavelength));
    const steps = waves * 8;
    // Outward is to the left of the direction of travel round the frame.
    const normalX = (toY - fromY) / length;
    const normalY = -(toX - fromX) / length;
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      const offset = amplitude * Math.sin(t * waves * 2 * Math.PI);
      const px = fromX + (toX - fromX) * t - normalX * offset;
      const py = fromY + (toY - fromY) * t - normalY * offset;
      points.push(`${px.toFixed(2)} ${py.toFixed(2)}`);
    }
  });
  return `M${points.join('L')}Z`;
}
