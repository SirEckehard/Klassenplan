// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * How a name is laid out on a seat: one line or two, and how large.
 *
 * A seat is 55 × 65 scene units whatever its table, and a name used to be
 * fitted to its width on one line: "Paul Zimmermann" came out at the smallest
 * size while most of the seat's height stood empty. Here a name may break
 * into two lines — between words, or after a hyphen in a name without a
 * space, never inside a word — when that makes it larger, and it takes the
 * height the seat has above its badges and beside its lock.
 *
 * The text is measured by arithmetic, not in the DOM, so jsdom, the export's
 * `renderToStaticMarkup` and the browser arrive at the same layout: the widths
 * of Instrument Sans — the font every view and every export draws in — are
 * measured once by `scripts/generate-name-glyph-widths.mjs`.
 *
 * A plan's names share one size (`planNameFontSize`): as large as the great
 * majority of seats allow, so a sheet reads calmly, while a conspicuously long
 * name shrinks on its own seat instead of shrinking everybody's.
 *
 * A name stays upright while its table turns, so the seat it sits on is a
 * turned rectangle in the name's frame. Name and badge pill are fitted against
 * that shape itself — every corner inside the seat, the lock as an obstacle —
 * rather than against a box drawn inside it: a seat turned 45° is a diamond,
 * widest across its middle, and a square inscribed in it left a name a third
 * of the room it has.
 */
import glyphWidthData from '@/data/nameGlyphWidths.json';

/** The weights a name is drawn in: regular, and bold in the projection's contrast mode. */
export type NameWeight = 400 | 700;

/** Line height of a name, as a multiple of its font size. */
export const NAME_LINE_HEIGHT = 1.15;

/** Smallest name, in scene units: below it a name is a smudge on paper. */
export const MIN_NAME_FONT_SIZE = 6;

/** Two lines have to come out this much larger than one to be worth the break. */
const TWO_LINE_GAIN = 1.03;

/**
 * A seat whose own fit is below this share of the plan's median size is an
 * outlier: it shrinks on its own rather than setting the size for the plan.
 */
const OUTLIER_RATIO = 0.8;

/** Space kept free between a name and the seat's edge, in scene units. */
const NAME_PADDING = 2.5;

/** Space kept free between a name and the edge of a round place. */
const TOKEN_PADDING = 3;

/** Gap between a name and the badge pill under it. */
const BADGE_GAP = 2;

/** The badge pill's distance from an upright seat's lower edge (`placeSeatBadgePill`). */
const SEAT_BADGE_BOTTOM_OFFSET = 6;

/** Diameter of the editor's lock toggle on a seat. */
const SEAT_LOCK_SIZE = 20;

/** Clearance a name keeps from the lock, beyond its outline. */
const LOCK_CLEARANCE = 1;

/** How far a name may step aside from the lock on a seat turned at a slant. */
const SIDE_STEPS = [0, 2, 4, 6, 8, 10, 12];

/** A name steps aside only when that makes it this much larger. */
const SIDE_STEP_GAIN = 1.05;

/** Within this many degrees of a quarter turn a seat counts as upright. */
const QUARTER_TOLERANCE = 5;

/**
 * Half the height of a line's glyphs around its centre, as a multiple of the
 * font size: the capitals and descenders, not the line's leading. The circle
 * tests its chords against it.
 */
const GLYPH_HALF_HEIGHT = 0.5;

type GlyphTable = Record<string, number>;
const GLYPH_WIDTHS = glyphWidthData.widths as Record<
  `${NameWeight}`,
  GlyphTable
>;

/** First code point of the CJK blocks, whose characters are a full em wide. */
const FULL_WIDTH_FROM = 0x2e80;

/**
 * Width of a text in the name font.
 *
 * A character the table does not know counts as wide as an "M" (as a full em
 * in the CJK blocks), so an unusual name errs towards fitting.
 */
export function measureNameWidth(
  text: string,
  fontSize = 1,
  weight: NameWeight = 400,
): number {
  const table = GLYPH_WIDTHS[weight];
  let width = 0;
  for (const char of text.normalize('NFC')) {
    const known = table[char];
    width +=
      known ??
      ((char.codePointAt(0) ?? 0) >= FULL_WIDTH_FROM ? 1 : (table.M ?? 1));
  }
  return width * fontSize;
}

/** The splits of a word after each hyphen that stands between two letters. */
function hyphenSplits(word: string): string[][] {
  const splits: string[][] = [];
  for (let index = 1; index < word.length - 1; index++) {
    if (word[index] === '-') {
      splits.push([word.slice(0, index + 1), word.slice(index + 1)]);
    }
  }
  return splits;
}

/**
 * The ways a name may be set: on one line, and on two where it can break.
 *
 * A name with spaces breaks at the space that leaves the shorter longest line
 * ("Anna Maria Meier" → "Anna Maria" / "Meier"); a name without one breaks
 * after a hyphen ("Jan-Patrick" → "Jan-" / "Patrick"). Never more than two
 * lines, never inside a word.
 */
export function nameLineCandidates(
  label: string,
  weight: NameWeight = 400,
): string[][] {
  const text = label.trim().replace(/\s+/g, ' ');
  if (!text) {
    return [];
  }

  const words = text.split(' ');
  const splits =
    words.length > 1
      ? words
          .slice(1)
          .map((_, index) => [
            words.slice(0, index + 1).join(' '),
            words.slice(index + 1).join(' '),
          ])
      : hyphenSplits(text);

  let best: string[] | null = null;
  let bestWidth = Infinity;
  for (const lines of splits) {
    const width = Math.max(
      ...lines.map((line) => measureNameWidth(line, 1, weight)),
    );
    if (width < bestWidth) {
      best = lines;
      bestWidth = width;
    }
  }

  return best ? [[text], best] : [[text]];
}

/** A name as it is drawn: its lines, their size and where the block's centre sits. */
export type NameFit = {
  lines: string[];
  fontSize: number;
  /** Vertical offset of the line block's centre from the seat's centre. */
  centerY: number;
  /**
   * Sideways offset of the block: on a seat turned at a slant the name may
   * step aside from the lock, which sits where the seat is widest.
   */
  centerX: number;
};

/**
 * Where the block of `lineCount` lines sits in the band: on the seat's centre
 * where it fits there, so names line up across seats, and pushed only as far
 * as the lock or the badges require.
 */
function blockCenter(
  top: number,
  bottom: number,
  lineCount: number,
  fontSize: number,
): number {
  const half = (lineCount * NAME_LINE_HEIGHT * fontSize) / 2;
  if (top + half > bottom - half) {
    return (top + bottom) / 2;
  }
  return Math.min(Math.max(0, top + half), bottom - half);
}

/** Offset of each line's centre from the block's centre. */
export function nameLineOffsets(fit: Pick<NameFit, 'lines' | 'fontSize'>) {
  const step = NAME_LINE_HEIGHT * fit.fontSize;
  return fit.lines.map(
    (_, index) => (index - (fit.lines.length - 1) / 2) * step,
  );
}

/**
 * The largest size from `MIN_NAME_FONT_SIZE` to `maxFont` at which `fits`
 * holds; the minimum when nothing does — the name then runs over rather than
 * vanish. `fits` must hold for every size below one it holds for.
 */
function largestFitting(
  maxFont: number,
  fits: (fontSize: number) => boolean,
): number {
  if (maxFont <= MIN_NAME_FONT_SIZE || fits(maxFont)) {
    return maxFont;
  }
  let low = MIN_NAME_FONT_SIZE;
  let high = maxFont;
  if (!fits(low)) {
    return low;
  }
  for (let step = 0; step < 20; step++) {
    const middle = (low + high) / 2;
    if (fits(middle)) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return low;
}

/**
 * Pick between one line and two: two only when they come out larger — or,
 * for a name too long for either at the smallest size, when they run over
 * less. With `split` a name that can break always does, so full names read
 * alike across a plan. `fitsAt` receives the lines' widths at size 1.
 */
function chooseLines(
  label: string,
  weight: NameWeight,
  maxFont: number,
  fitsAt: (lineWidths: number[], fontSize: number) => boolean,
  split = false,
): Pick<NameFit, 'lines' | 'fontSize'> {
  const all = nameLineCandidates(label, weight);
  if (all.length === 0) {
    return { lines: [], fontSize: maxFont };
  }
  const candidates = split && all.length > 1 ? [all[1]] : all;
  const sized = candidates.map((lines) => {
    const widths = lines.map((line) => measureNameWidth(line, 1, weight));
    const fontSize = largestFitting(maxFont, (size) => fitsAt(widths, size));
    return {
      lines,
      fontSize,
      fits: fitsAt(widths, fontSize),
      widest: Math.max(...widths),
    };
  });
  const [oneLine, twoLines] = sized;
  const pick = (choice: (typeof sized)[number]) => ({
    lines: choice.lines,
    fontSize: choice.fontSize,
  });
  if (!twoLines) {
    return pick(oneLine);
  }
  if (twoLines.fontSize > oneLine.fontSize * TWO_LINE_GAIN) {
    return pick(twoLines);
  }
  if (!oneLine.fits && (twoLines.fits || twoLines.widest < oneLine.widest)) {
    return pick(twoLines);
  }
  return pick(oneLine);
}

type FitOptions = {
  weight?: NameWeight;
  /** The largest size the name may take: the seat's own cap, or the plan's size. */
  maxFont: number;
  /** Break every name that can break, not only where that makes it larger. */
  split?: boolean;
};

/**
 * Fit a name into a round seat of the circle, between `top` and `bottom`
 * (relative to its centre): every line has to fit the chord at its height.
 */
export function fitNameInCircle(
  label: string,
  {
    radius,
    top,
    bottom,
  }: {
    radius: number;
    top: number;
    bottom: number;
  },
  { weight = 400, maxFont, split = false }: FitOptions,
): NameFit {
  const inner = radius - TOKEN_PADDING;
  const chordAt = (y: number) =>
    2 * Math.sqrt(Math.max(0, inner * inner - y * y));
  const linesFit = (widths: number[], size: number) => {
    const lineCount = widths.length;
    if (lineCount * NAME_LINE_HEIGHT * size > bottom - top) {
      return false;
    }
    const center = blockCenter(top, bottom, lineCount, size);
    const step = NAME_LINE_HEIGHT * size;
    return widths.every((width, index) => {
      const lineCenter = center + (index - (lineCount - 1) / 2) * step;
      const farthest = Math.abs(lineCenter) + GLYPH_HALF_HEIGHT * size;
      return width * size <= chordAt(farthest);
    });
  };
  const chosen = chooseLines(label, weight, maxFont, linesFit, split);
  return {
    ...chosen,
    centerY: blockCenter(top, bottom, chosen.lines.length, chosen.fontSize),
    centerX: 0,
  };
}

/** Largest name on a seat, in scene units: 17.6 on the 55 × 65 seat. */
export const seatNameMaxFontSize = (seatWidth: number, seatHeight: number) =>
  Math.min(seatWidth, seatHeight) * 0.32;

/** Largest name on a round seat: 18 on the circle's 60-unit token. */
export const tokenNameMaxFontSize = (radius: number) => radius * 0.6;

/**
 * The seat's box as the name sees it, upright on the screen.
 *
 * A name stays upright while its table turns, so at a quarter turn the seat's
 * width is the name's height — on a plan turned for the board, the export in
 * portrait and the projection, a name on a 55 × 65 seat has 65 units across.
 * At any other angle it is the square inscribed in the seat; the badge pill
 * takes its size from this frame.
 */
const isQuarterTurn = (rotation: number) => {
  const normalized = ((rotation % 360) + 360) % 360;
  return (
    Math.abs(normalized - Math.round(normalized / 90) * 90) <= QUARTER_TOLERANCE
  );
};

export function getUprightSeatFrame(
  seatWidth: number,
  seatHeight: number,
  rotation: number,
): { width: number; height: number } {
  const normalized = ((rotation % 360) + 360) % 360;
  const quarter = Math.round(normalized / 90) % 4;
  if (isQuarterTurn(rotation)) {
    return quarter % 2 === 1
      ? { width: seatHeight, height: seatWidth }
      : { width: seatWidth, height: seatHeight };
  }
  const radians = (normalized * Math.PI) / 180;
  const side =
    Math.min(seatWidth, seatHeight) /
    (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians)));
  return { width: side, height: side };
}

/**
 * Offset of the lock toggle inside a seat, anchored near the seat's top-left
 * corner so it does not jump between corners when the table rotates; a seat
 * too small for it centres it instead.
 */
export function seatLockOffset(
  seatWidth: number,
  seatHeight: number,
): { x: number; y: number } {
  const touchTargetSize = 24;
  const padding = 1;
  const resolve = (dimension: number) =>
    dimension <= touchTargetSize + padding * 2
      ? Math.max(padding, (dimension - touchTargetSize) / 2)
      : padding;
  return { x: resolve(seatWidth), y: resolve(seatHeight) };
}

/** A seat as its name sees it. */
export type SeatShape = {
  seatWidth: number;
  seatHeight: number;
  /**
   * The name's rotation against its seat (`seatTextRotation`), 0 where the
   * name turns with the table.
   */
  rotation: number;
  /** Whether the editor's lock toggle sits on the seat. */
  lock?: boolean;
};

/** A rectangle in the name's upright frame, relative to the seat's centre. */
export type SeatRect = { x: number; y: number; width: number; height: number };

type Interval = [number, number];

/** Exact zeros and ones at quarter turns, so a turned edge is not tilted by rounding. */
const snapUnit = (value: number) =>
  Math.abs(value) < 1e-9
    ? 0
    : Math.abs(Math.abs(value) - 1) < 1e-9
      ? Math.sign(value)
      : value;

function seatTurn(rotation: number) {
  const radians = (rotation * Math.PI) / 180;
  return { cos: snapUnit(Math.cos(radians)), sin: snapUnit(Math.sin(radians)) };
}

const intersect = (a: Interval, b: Interval): Interval | null => {
  const range: Interval = [Math.max(a[0], b[0]), Math.min(a[1], b[1])];
  return range[0] <= range[1] + 1e-9 ? range : null;
};

/**
 * How far the point (x, y + t) of the upright frame may be moved up or down —
 * the shifts t — and stay on the seat, `pad` inside its edges.
 *
 * In the seat's own axes the point is (cos·x − sin·(y + t), sin·x + cos·(y + t)),
 * which is linear in t, so each edge bounds t from one side.
 */
function pointShifts(
  shape: SeatShape,
  x: number,
  y: number,
  pad: number,
): Interval | null {
  const { cos, sin } = seatTurn(shape.rotation);
  let range: Interval | null = [-Infinity, Infinity];
  const bound = (offset: number, slope: number, half: number) => {
    if (!range) return;
    if (slope === 0) {
      if (Math.abs(offset) > half + 1e-9) range = null;
      return;
    }
    const a = (-half - offset) / slope;
    const b = (half - offset) / slope;
    range = intersect(range, [Math.min(a, b), Math.max(a, b)]);
  };
  bound(cos * x - sin * y, -sin, shape.seatWidth / 2 - pad);
  bound(sin * x + cos * y, cos, shape.seatHeight / 2 - pad);
  return range;
}

/**
 * The shifts at which a rectangle `width` wide around `centerX`, from `top` to
 * `bottom` before the shift, stays on the seat: the seat is convex, so its
 * four corners decide.
 */
function rectShifts(
  shape: SeatShape,
  width: number,
  top: number,
  bottom: number,
  pad: number,
  centerX = 0,
): Interval | null {
  let range: Interval | null = [-Infinity, Infinity];
  for (const x of [centerX - width / 2, centerX + width / 2]) {
    for (const y of [top, bottom]) {
      const corner = pointShifts(shape, x, y, pad);
      range = corner && range ? intersect(range, corner) : null;
      if (!range) return null;
    }
  }
  return range;
}

/** The lock in the name's frame: its centre and the reach a name keeps from it. */
function lockInFrame(shape: SeatShape) {
  const offset = seatLockOffset(shape.seatWidth, shape.seatHeight);
  const x = offset.x + SEAT_LOCK_SIZE / 2 - shape.seatWidth / 2;
  const y = offset.y + SEAT_LOCK_SIZE / 2 - shape.seatHeight / 2;
  const { cos, sin } = seatTurn(shape.rotation);
  return {
    x: cos * x + sin * y,
    y: -sin * x + cos * y,
    reach: SEAT_LOCK_SIZE / 2 + LOCK_CLEARANCE,
  };
}

/**
 * Where a seat's badge pill goes: centred, as low on the seat as it fits —
 * `SEAT_BADGE_BOTTOM_OFFSET` above the lower edge of an upright seat, nearer
 * the middle of a turned one, where the seat is wide enough for it.
 */
export function placeSeatBadgePill(
  shape: SeatShape,
  width: number,
  height: number,
): SeatRect {
  for (const pad of [SEAT_BADGE_BOTTOM_OFFSET, 2, 0]) {
    const range = rectShifts(shape, width, 0, height, pad);
    if (range) {
      return { x: -width / 2, y: range[1], width, height };
    }
  }
  const frame = getUprightSeatFrame(
    shape.seatWidth,
    shape.seatHeight,
    shape.rotation,
  );
  return {
    x: -width / 2,
    y: frame.height / 2 - SEAT_BADGE_BOTTOM_OFFSET - height,
    width,
    height,
  };
}

/**
 * Fit a name onto a table seat, above its badge pill and clear of the lock.
 *
 * At a given size the line block may move up and down within an interval —
 * every corner of every line on the seat, the last line above the pill — less
 * the stretches where a line would run into the lock. The block takes the
 * point of that set nearest the seat's centre, so names line up across seats
 * and move only as far as they must. On a seat turned at a slant the lock sits
 * where the seat is widest, so there the name may also step aside from it,
 * when that makes it clearly larger.
 */
export function fitNameOnSeat(
  label: string,
  shape: SeatShape,
  pill: SeatRect | null,
  { weight = 400, maxFont, split = false }: FitOptions,
): NameFit {
  const lock = shape.lock ? lockInFrame(shape) : null;

  /** Where the block's centre may go at `size`, `sideways` across; null if nowhere. */
  const placeBlock = (
    widths: number[],
    size: number,
    sideways: number,
  ): number | null => {
    const half = (NAME_LINE_HEIGHT * size) / 2;
    const offsets = widths.map(
      (_, index) => (index - (widths.length - 1) / 2) * NAME_LINE_HEIGHT * size,
    );
    let range: Interval | null = [-Infinity, Infinity];
    widths.forEach((width, index) => {
      const line = range
        ? rectShifts(
            shape,
            width * size,
            offsets[index] - half,
            offsets[index] + half,
            NAME_PADDING,
            sideways,
          )
        : null;
      range = line && range ? intersect(range, line) : null;
    });
    if (range && pill) {
      const lastBottom = offsets[offsets.length - 1] + half;
      range = intersect(range, [-Infinity, pill.y - BADGE_GAP - lastBottom]);
    }
    if (!range) return null;
    const [low, high] = range;

    // A line that reaches the lock across has to pass above or below it.
    const blocked: Interval[] = lock
      ? widths.flatMap((width, index) =>
          sideways - (width * size) / 2 < lock.x + lock.reach &&
          sideways + (width * size) / 2 > lock.x - lock.reach
            ? [
                [
                  lock.y - lock.reach - (offsets[index] + half),
                  lock.y + lock.reach - (offsets[index] - half),
                ] as Interval,
              ]
            : [],
        )
      : [];
    const candidates = [0, low, high, ...blocked.flat()].map((shift) =>
      Math.min(Math.max(shift, low), high),
    );
    let best: number | null = null;
    for (const shift of candidates) {
      const free = blocked.every(
        ([from, to]) => shift <= from + 1e-9 || shift >= to - 1e-9,
      );
      if (free && (best === null || Math.abs(shift) < Math.abs(best))) {
        best = shift;
      }
    }
    return best;
  };

  const fitWith = (sideSteps: number[]): NameFit => {
    const chosen = chooseLines(
      label,
      weight,
      maxFont,
      (widths, size) =>
        sideSteps.some(
          (sideways) => placeBlock(widths, size, sideways) !== null,
        ),
      split,
    );
    if (chosen.lines.length === 0) {
      return { ...chosen, centerY: 0, centerX: 0 };
    }
    const widths = chosen.lines.map((line) =>
      measureNameWidth(line, 1, weight),
    );
    for (const sideways of sideSteps) {
      const placed = placeBlock(widths, chosen.fontSize, sideways);
      if (placed !== null) {
        return { ...chosen, centerY: placed, centerX: sideways };
      }
    }
    // Too long for the seat even at the smallest size: it runs over, but
    // stays above the pill.
    const blockHalf =
      (chosen.lines.length * NAME_LINE_HEIGHT * chosen.fontSize) / 2;
    return {
      ...chosen,
      centerY: pill ? Math.min(0, pill.y - BADGE_GAP - blockHalf) : 0,
      centerX: 0,
    };
  };

  const centred = fitWith([0]);
  if (!lock || isQuarterTurn(shape.rotation)) {
    return centred;
  }
  // Away from the lock: it lies on the left or the right of the upright name.
  const away = lock.x < 0 ? 1 : -1;
  const aside = fitWith(SIDE_STEPS.map((step) => step * away));
  return aside.fontSize > centred.fontSize * SIDE_STEP_GAIN ? aside : centred;
}

/**
 * The size a plan's names share.
 *
 * Every seat's own largest size goes in; the plan takes the smallest of those
 * that are not outliers — at least `OUTLIER_RATIO` of the median — so the
 * great majority of names come out the same size and one long name does not
 * shrink the rest. A seat that cannot reach it keeps its own smaller size.
 * Undefined for a plan without names.
 */
export function planNameFontSize(sizes: readonly number[]): number | undefined {
  if (sizes.length === 0) {
    return undefined;
  }
  const sorted = [...sizes].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  return sorted.find((size) => size >= median * OUTLIER_RATIO);
}
