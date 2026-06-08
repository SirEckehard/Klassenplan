import { describe, it, expect } from 'vitest';
import { shuffleArray } from '../algorithm/shuffle';

describe('shuffleArray', () => {
  it('does not change length', () => {
    const arr = [1, 2, 3, 4, 5];
    const out = shuffleArray(arr);
    expect(out).toHaveLength(arr.length);
  });

  it('keeps the same elements (multiset equality)', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const out = shuffleArray(arr);
    expect([...out].sort()).toEqual([...arr].sort());
  });

  it('returns a new array (no in-place mutation of original input)', () => {
    const arr = [1, 2, 3];
    const out = shuffleArray(arr);
    // wenn deine Implementierung in-place ist, diesen Test anpassen:
    expect(out).not.toBe(arr);
  });
});
