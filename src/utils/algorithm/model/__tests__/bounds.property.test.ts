// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The bounds the fulfilment counts against (decision 0031): what a plan could
 * reach at most. Too low a bound reads a plan the mixing could improve as
 * 100 %, too high a bound keeps the best plan below it — so both are held to
 * a search through every possibility on rooms small enough to search.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { maxMatching, mostBalancedUnits } from '../bounds';

const RUNS = { numRuns: 200 };

/** The largest matching, by trying every edge in and out. */
const matchingBySearch = (edges: ReadonlyArray<[number, number]>): number => {
  const search = (index: number, used: Set<number>): number => {
    if (index === edges.length) return 0;
    const [a, b] = edges[index]!;
    const without = search(index + 1, used);
    if (a === b || used.has(a) || used.has(b)) return without;
    const next = new Set(used).add(a).add(b);
    return Math.max(without, 1 + search(index + 1, next));
  };
  return search(0, new Set());
};

/** The most balanced units, by trying every choice of seats for `others`. */
const balancedBySearch = (units: number[][], others: number): number => {
  const seats = [...new Set(units.flat())];
  let best = 0;
  for (let mask = 0; mask < 1 << seats.length; mask++) {
    const chosen = new Set(seats.filter((_, index) => mask & (1 << index)));
    if (chosen.size > others) continue;
    const balanced = units.filter(
      (unit) =>
        unit.length >= 2 &&
        unit.filter((seat) => chosen.has(seat)).length >=
          Math.floor(unit.length / 2),
    ).length;
    best = Math.max(best, balanced);
  }
  return best;
};

const edgesArb = fc.array(
  fc.tuple(fc.integer({ min: 0, max: 9 }), fc.integer({ min: 0, max: 9 })),
  { maxLength: 16 },
);

/** Units over at most ten seats, each a set of distinct seats. */
const unitsArb = fc.array(
  fc.uniqueArray(fc.integer({ min: 0, max: 9 }), {
    minLength: 1,
    maxLength: 6,
  }),
  { maxLength: 8 },
);

describe('maxMatching', () => {
  it('finds as many pairs as a search through every matching', () => {
    fc.assert(
      fc.property(edgesArb, (edges) => {
        expect(maxMatching(10, edges)).toBe(matchingBySearch(edges));
      }),
      RUNS,
    );
  });

  it('pairs a desk with a single on either side as two pairs', () => {
    // Single 0, desk 1–2, single 3, in a row: the desk's seats go to the
    // joins, which a matching that pairs the desk first would miss.
    expect(
      maxMatching(4, [
        [0, 1],
        [1, 2],
        [2, 3],
      ]),
    ).toBe(2);
  });
});

describe('mostBalancedUnits', () => {
  it('balances as many units as a search through every placement', () => {
    fc.assert(
      fc.property(unitsArb, fc.integer({ min: 0, max: 6 }), (units, others) => {
        expect(mostBalancedUnits(units, others)).toBe(
          balancedBySearch(units, others),
        );
      }),
      RUNS,
    );
  });

  it('lets one student in the middle of a row balance both joins', () => {
    expect(
      mostBalancedUnits(
        [
          [0, 1],
          [1, 2],
        ],
        1,
      ),
    ).toBe(2);
  });
});
