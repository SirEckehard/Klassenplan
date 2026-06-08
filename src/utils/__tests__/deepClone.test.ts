import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deepClone } from '../deepClone';

// Mock the logger to avoid circular dependencies in tests
vi.mock('../logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

describe('deepClone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should deep clone objects using structuredClone when available', () => {
    const original = {
      name: 'Test',
      nested: { value: 42, array: [1, 2, 3] },
      date: new Date('2023-01-01'),
    };

    const cloned = deepClone(original);

    // Should be deeply equal but not the same reference
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.nested).not.toBe(original.nested);
    expect(cloned.nested.array).not.toBe(original.nested.array);
    expect(cloned.date).not.toBe(original.date);
  });

  it('should fall back to JSON method when structuredClone is not available', () => {
    // Mock structuredClone as undefined
    const originalStructuredClone = global.structuredClone;
    // @ts-expect-error - intentionally setting to undefined for test
    global.structuredClone = undefined;

    const original = {
      name: 'Test',
      nested: { value: 42, array: [1, 2, 3] },
    };

    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.nested).not.toBe(original.nested);

    // Restore original structuredClone
    global.structuredClone = originalStructuredClone;
  });

  it('should fall back to JSON method when structuredClone fails', async () => {
    const { logWarn } = await import('../logger');
    const originalStructuredClone = global.structuredClone;

    // Mock structuredClone to throw an error
    global.structuredClone = vi.fn(() => {
      throw new Error('structuredClone failed');
    });

    const original = {
      id: 123,
      name: 'Test',
    };

    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(logWarn).toHaveBeenCalledWith(
      'structuredClone failed, falling back to JSON method',
      expect.objectContaining({ error: expect.any(Error) }),
      'deepClone',
    );

    // Restore original structuredClone
    global.structuredClone = originalStructuredClone;
  });

  it('should handle simple values', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('test')).toBe('test');
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
  });

  it('should handle arrays', () => {
    const original = [1, { nested: 'value' }, [2, 3]];
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned[1]).not.toBe(original[1]);
    expect(cloned[2]).not.toBe(original[2]);
  });

  it('should throw error when both structuredClone and JSON methods fail', async () => {
    const { logError } = await import('../logger');
    const originalStructuredClone = global.structuredClone;
    const originalStringify = JSON.stringify;

    // Mock both methods to fail
    // @ts-expect-error - intentionally setting to undefined for test
    global.structuredClone = undefined;
    JSON.stringify = vi.fn(() => {
      throw new Error('JSON.stringify failed');
    });

    interface CircularRef {
      name: string;
      self?: CircularRef;
    }

    const circularRef: CircularRef = { name: 'test' };
    circularRef.self = circularRef;

    expect(() => deepClone(circularRef)).toThrow('Failed to deep clone object');
    expect(logError).toHaveBeenCalledWith(
      'Deep clone failed',
      expect.objectContaining({ error: expect.any(Error) }),
      'deepClone',
    );

    // Restore originals
    global.structuredClone = originalStructuredClone;
    JSON.stringify = originalStringify;
  });

  it('should preserve Date objects when using structuredClone', () => {
    const date = new Date('2023-01-01');
    const original = { date };

    const cloned = deepClone(original);

    expect(cloned.date).toEqual(date);
    expect(cloned.date).toBeInstanceOf(Date);
    expect(cloned.date).not.toBe(date);
  });
});

// isStructuredCloneAvailable function was removed in Phase 2.3 tree-shaking cleanup
// These tests are no longer needed as the function is now internal to deepClone
