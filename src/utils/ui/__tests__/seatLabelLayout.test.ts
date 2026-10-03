// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  fitNameInCircle,
  fitNameOnSeat,
  getUprightSeatFrame,
  MIN_NAME_FONT_SIZE,
  measureNameWidth,
  NAME_LINE_HEIGHT,
  nameLineCandidates,
  nameLineOffsets,
  placeSeatBadgePill,
  planNameFontSize,
  seatNameMaxFontSize,
  tokenNameMaxFontSize,
  type SeatShape,
} from '../seatLabelLayout';

// Every table seat is 55 × 65 scene units.
const SEAT = { seatWidth: 55, seatHeight: 65 };
const maxFont = seatNameMaxFontSize(SEAT.seatWidth, SEAT.seatHeight);

describe('measureNameWidth', () => {
  it('measures each character of Instrument Sans', () => {
    // A wide "m" against a narrow "i": the old flat estimate took both alike.
    expect(measureNameWidth('m')).toBeGreaterThan(measureNameWidth('i') * 3);
    expect(measureNameWidth('Anna', 10)).toBeCloseTo(
      measureNameWidth('Anna') * 10,
    );
  });

  it('measures the bold weight wider', () => {
    expect(measureNameWidth('Zimmermann', 1, 700)).toBeGreaterThan(
      measureNameWidth('Zimmermann', 1, 400),
    );
  });

  it('counts an unknown character as wide as an M, and CJK as a full em', () => {
    expect(measureNameWidth('Ж')).toBeCloseTo(measureNameWidth('M'));
    expect(measureNameWidth('李')).toBe(1);
  });

  it('measures a decomposed accent like the composed letter', () => {
    expect(measureNameWidth('Zoé')).toBeCloseTo(measureNameWidth('Zoé'));
  });
});

describe('nameLineCandidates', () => {
  it('offers one line and the best break between words', () => {
    expect(nameLineCandidates('Paul Zimmermann')).toEqual([
      ['Paul Zimmermann'],
      ['Paul', 'Zimmermann'],
    ]);
    expect(nameLineCandidates('Anna Maria Meier')).toEqual([
      ['Anna Maria Meier'],
      ['Anna Maria', 'Meier'],
    ]);
  });

  it('breaks a name without a space after its hyphen', () => {
    expect(nameLineCandidates('Jan-Patrick')).toEqual([
      ['Jan-Patrick'],
      ['Jan-', 'Patrick'],
    ]);
  });

  it('never breaks inside a word', () => {
    expect(nameLineCandidates('Maximilian')).toEqual([['Maximilian']]);
    expect(nameLineCandidates('  ')).toEqual([]);
  });

  it('keeps a hyphenated first name whole when there is a space', () => {
    expect(nameLineCandidates('Jan-Patrick Schmidt')).toEqual([
      ['Jan-Patrick Schmidt'],
      ['Jan-Patrick', 'Schmidt'],
    ]);
  });
});

const upright: SeatShape = { ...SEAT, rotation: 0 };

/** Whether a point of the name's frame lies on the seat, `pad` inside its edges. */
const onSeat = (shape: SeatShape, x: number, y: number, pad = 0) => {
  const radians = (shape.rotation * Math.PI) / 180;
  const localX = Math.cos(radians) * x - Math.sin(radians) * y;
  const localY = Math.sin(radians) * x + Math.cos(radians) * y;
  return (
    Math.abs(localX) <= shape.seatWidth / 2 - pad + 1e-6 &&
    Math.abs(localY) <= shape.seatHeight / 2 - pad + 1e-6
  );
};

/** The rectangles a fit's lines take, in the name's frame. */
const lineRects = (fit: ReturnType<typeof fitNameOnSeat>) =>
  fit.lines.map((line, index) => {
    const half = width(line, fit.fontSize) / 2;
    const center = fit.centerY + nameLineOffsets(fit)[index];
    const halfHeight = (NAME_LINE_HEIGHT * fit.fontSize) / 2;
    return {
      left: fit.centerX - half,
      right: fit.centerX + half,
      top: center - halfHeight,
      bottom: center + halfHeight,
    };
  });
const width = (line: string, size: number) => measureNameWidth(line, size);

const expectOnSeat = (
  shape: SeatShape,
  fit: ReturnType<typeof fitNameOnSeat>,
) => {
  for (const rect of lineRects(fit)) {
    for (const x of [rect.left, rect.right]) {
      for (const y of [rect.top, rect.bottom]) {
        expect(onSeat(shape, x, y)).toBe(true);
      }
    }
  }
};

describe('fitNameOnSeat', () => {
  it('sets a full name on two lines, far larger than on one', () => {
    const fit = fitNameOnSeat('Paul Zimmermann', upright, null, { maxFont });
    expect(fit.lines).toEqual(['Paul', 'Zimmermann']);
    // The single line came out at the old minimum of 6 and ran over.
    expect(fit.fontSize).toBeGreaterThan(7.5);
    expectOnSeat(upright, fit);
  });

  it('keeps a short name on one line where one line reaches the size', () => {
    expect(
      fitNameOnSeat('Leon H.', upright, null, { maxFont: 13 }),
    ).toMatchObject({ lines: ['Leon H.'], fontSize: 13 });
  });

  it('breaks a short name only when that makes it larger', () => {
    const fit = fitNameOnSeat('Leon H.', upright, null, { maxFont });
    expect(fit.lines).toEqual(['Leon', 'H.']);
    expect(fit.fontSize).toBe(maxFont);
  });

  it('keeps one line when the plan size caps both alike', () => {
    expect(
      fitNameOnSeat('Anna M.', upright, null, { maxFont: 9 }),
    ).toMatchObject({ lines: ['Anna M.'], fontSize: 9 });
  });

  it('breaks every name that can break when asked to, as full names are', () => {
    expect(
      fitNameOnSeat('Mia Wolf', upright, null, { maxFont: 9, split: true })
        .lines,
    ).toEqual(['Mia', 'Wolf']);
    expect(
      fitNameOnSeat('Maximilian', upright, null, { maxFont: 9, split: true })
        .lines,
    ).toEqual(['Maximilian']);
  });

  it('centres the block on the seat when it fits there', () => {
    expect(fitNameOnSeat('Leon H.', upright, null, { maxFont }).centerY).toBe(
      0,
    );
  });

  it('falls to the minimum and the narrower layout for a name too long for the seat', () => {
    const fit = fitNameOnSeat('Konstantinopoulos-Wiederhold', upright, null, {
      maxFont,
    });
    expect(fit.fontSize).toBe(MIN_NAME_FONT_SIZE);
    expect(fit.lines).toEqual(['Konstantinopoulos-', 'Wiederhold']);
  });

  it('spaces two lines one line height apart around the block centre', () => {
    const offsets = nameLineOffsets({ lines: ['a', 'b'], fontSize: 10 });
    expect(offsets).toEqual([-5.75, 5.75]);
  });

  it('keeps the name above the badge pill', () => {
    const pill = placeSeatBadgePill(upright, 30, 12);
    const fit = fitNameOnSeat('Paul Zimmermann', upright, pill, { maxFont });
    const last = lineRects(fit).at(-1)!;
    expect(last.bottom).toBeLessThanOrEqual(pill.y - 2 + 1e-6);
  });

  it('keeps the name clear of the lock in the upper left', () => {
    const fit = fitNameOnSeat(
      'Paul Zimmermann',
      { ...upright, lock: true },
      null,
      { maxFont },
    );
    // The lock reaches 21.5 below the seat's top edge, one unit to spare.
    expect(lineRects(fit)[0].top).toBeGreaterThanOrEqual(-32.5 + 22 - 1e-6);
  });

  it('stays centred on an upright seat, lock or not', () => {
    const fit = fitNameOnSeat(
      'Paul Zimmermann',
      { ...upright, lock: true },
      null,
      { maxFont },
    );
    expect(fit.centerX).toBe(0);
  });

  it('steps aside from the lock on a seat turned at a slant', () => {
    // Turned 45°, the lock sits at the left of the upright name, where the
    // seat is widest.
    const shape: SeatShape = { ...SEAT, rotation: 45, lock: true };
    const fit = fitNameOnSeat(
      'Finn Neumann',
      shape,
      placeSeatBadgePill(shape, 28, 10),
      { maxFont, split: true },
    );
    expect(fit.centerX).toBeGreaterThan(0);
  });

  it('gives a name turned a quarter against its seat the seat height across', () => {
    const turned = fitNameOnSeat(
      'Paul Zimmermann',
      { ...SEAT, rotation: -90 },
      null,
      { maxFont },
    );
    const straight = fitNameOnSeat('Paul Zimmermann', upright, null, {
      maxFont,
    });
    expect(turned.fontSize).toBeGreaterThan(straight.fontSize);
  });

  // A double desk turned 45° either way in the editor, with its lock and a
  // pill of badges: the name used to shrink to the minimum and slide under
  // the pill.
  describe.each([-45, 45, -135, 135])('on a seat turned %i°', (turn) => {
    const shape: SeatShape = { ...SEAT, rotation: -turn, lock: true };
    const pill = placeSeatBadgePill(shape, 28, 10);

    it('uses the width the seat has across its middle', () => {
      const fit = fitNameOnSeat('Finn Neumann', shape, pill, {
        maxFont,
        split: true,
      });
      expect(fit.lines).toEqual(['Finn', 'Neumann']);
      expect(fit.fontSize).toBeGreaterThan(8);
      expectOnSeat(shape, fit);
    });

    it('keeps the name above the pill', () => {
      const fit = fitNameOnSeat('Alex Kowalski', shape, pill, {
        maxFont,
        split: true,
      });
      expect(lineRects(fit).at(-1)!.bottom).toBeLessThanOrEqual(
        pill.y - 2 + 1e-6,
      );
    });
  });
});

describe('placeSeatBadgePill', () => {
  it('sits six units above the lower edge of an upright seat', () => {
    expect(placeSeatBadgePill(upright, 30, 12)).toEqual({
      x: -15,
      y: 14.5,
      width: 30,
      height: 12,
    });
  });

  it('sits on the lower edge of a seat turned a quarter', () => {
    expect(placeSeatBadgePill({ ...SEAT, rotation: -90 }, 30, 12).y).toBe(9.5);
  });

  it('stays on a seat turned at a slant', () => {
    const shape: SeatShape = { ...SEAT, rotation: 45 };
    const pill = placeSeatBadgePill(shape, 28, 10);
    for (const x of [pill.x, pill.x + pill.width]) {
      for (const y of [pill.y, pill.y + pill.height]) {
        expect(onSeat(shape, x, y, 6)).toBe(true);
      }
    }
  });
});

describe('getUprightSeatFrame', () => {
  it('turns the seat a quarter where the name is turned against it', () => {
    expect(getUprightSeatFrame(55, 65, 0)).toEqual({ width: 55, height: 65 });
    expect(getUprightSeatFrame(55, 65, -90)).toEqual({ width: 65, height: 55 });
    expect(getUprightSeatFrame(55, 65, 270)).toEqual({ width: 65, height: 55 });
    expect(getUprightSeatFrame(55, 65, 182)).toEqual({ width: 55, height: 65 });
  });

  it('keeps to the inscribed square at a slant', () => {
    const frame = getUprightSeatFrame(55, 65, 45);
    expect(frame.width).toBeCloseTo(55 / Math.SQRT2);
    expect(frame.height).toBe(frame.width);
  });
});

describe('fitNameInCircle', () => {
  const radius = 30;
  const circleMax = tokenNameMaxFontSize(radius);

  it('fits every line into the chord at its height', () => {
    const fit = fitNameInCircle(
      'Paul Zimmermann',
      { radius, top: -27, bottom: 27 },
      { maxFont: circleMax },
    );
    expect(fit.lines).toEqual(['Paul', 'Zimmermann']);
    const inner = radius - 3;
    const lineCenter = fit.centerY + nameLineOffsets(fit)[1];
    const farthest = Math.abs(lineCenter) + fit.fontSize / 2;
    const chord = 2 * Math.sqrt(inner * inner - farthest * farthest);
    expect(measureNameWidth('Zimmermann', fit.fontSize)).toBeLessThanOrEqual(
      chord + 0.01,
    );
  });

  it('stays above the badges', () => {
    const fit = fitNameInCircle(
      'Leon H.',
      { radius, top: -27, bottom: 8 },
      { maxFont: circleMax },
    );
    expect(
      fit.centerY + (NAME_LINE_HEIGHT * fit.fontSize) / 2,
    ).toBeLessThanOrEqual(8.01);
  });
});

describe('planNameFontSize', () => {
  it('takes the smallest size among the seats that are not outliers', () => {
    // Median 12; 0.8 × 12 = 9.6 leaves the 7 out.
    expect(planNameFontSize([12, 14, 7, 11, 12, 13])).toBe(11);
  });

  it('is the only size of a plan with one name, and undefined without', () => {
    expect(planNameFontSize([9])).toBe(9);
    expect(planNameFontSize([])).toBeUndefined();
  });
});
