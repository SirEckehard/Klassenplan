import { describe, expect, test } from 'vitest';
import { generateId } from '../id';

describe('generateId', () => {
  test('returns unique ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateId()));
    expect(ids.size).toBe(1000);
  });
});
