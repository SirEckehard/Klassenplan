// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import { createRng, randomInt, randomPick } from '../rng';

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(12345);
    const b = createRng(12345);

    const first = Array.from({ length: 20 }, () => a());
    const second = Array.from({ length: 20 }, () => b());

    expect(first).toEqual(second);
  });

  it('produces different sequences for different seeds', () => {
    const a = Array.from({ length: 10 }, createRng(1));
    const b = Array.from({ length: 10 }, createRng(2));

    expect(a).not.toEqual(b);
  });

  it('stays inside [0, 1)', () => {
    const rng = createRng(99);
    for (let i = 0; i < 500; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('handles a zero and a negative seed without leaving the range', () => {
    for (const seed of [0, -1, -987654]) {
      const rng = createRng(seed);
      const values = Array.from({ length: 50 }, () => rng());
      expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
      // A constant sequence would mean the state got stuck.
      expect(new Set(values).size).toBeGreaterThan(1);
    }
  });

  it('spreads values across the unit interval', () => {
    const rng = createRng(2024);
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 10_000; i++) {
      buckets[Math.floor(rng() * 10)]++;
    }
    // With 10k draws every decile should be far away from empty.
    expect(Math.min(...buckets)).toBeGreaterThan(700);
  });
});

describe('randomInt', () => {
  it('returns values within the requested range', () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const value = randomInt(rng, 5);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(5);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('returns 0 for an empty range instead of NaN', () => {
    const rng = createRng(7);
    expect(randomInt(rng, 0)).toBe(0);
    expect(randomInt(rng, -3)).toBe(0);
  });
});

describe('randomPick', () => {
  it('picks an element of the list', () => {
    const rng = createRng(42);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(randomPick(rng, items));
    }
  });

  it('returns undefined for an empty list', () => {
    expect(randomPick(createRng(1), [])).toBeUndefined();
  });
});
