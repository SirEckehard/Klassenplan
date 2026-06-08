// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, test, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import {
  useIndexedDBState,
  useIndexedDBStateTuple,
  useIndexedDBPersist,
} from '../useIndexedDBState';
import { setupCleanStorage } from '../../__tests__/utils';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logError: vi.fn(),
}));

// Mock hasIndexedDB
vi.mock('@/utils/data/indexedDb', () => ({
  hasIndexedDB: vi.fn(() => true),
}));

beforeEach(() => {
  setupCleanStorage();
  vi.clearAllMocks();
  // Default mock implementations
  (idbGet as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (idbSet as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useIndexedDBState', () => {
  describe('initial load', () => {
    test('loads stored value on mount', async () => {
      const storedValue = { id: '1', name: 'Test' };
      (idbGet as ReturnType<typeof vi.fn>).mockResolvedValue(storedValue);

      const { result } = renderHook(() =>
        useIndexedDBState('test-key', { id: '', name: '' }),
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.value).toEqual(storedValue);
      expect(result.current.error).toBeNull();
      expect(idbGet).toHaveBeenCalledWith('test-key');
    });

    test('uses default value when nothing stored', async () => {
      const defaultValue = { count: 0 };
      (idbGet as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useIndexedDBState('empty-key', defaultValue),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.value).toEqual(defaultValue);
      expect(result.current.error).toBeNull();
    });

    test('uses default value when null is stored', async () => {
      const defaultValue = { count: 0 };
      (idbGet as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { result } = renderHook(() =>
        useIndexedDBState('null-key', defaultValue),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.value).toEqual(defaultValue);
    });

    test('handles load errors gracefully', async () => {
      const loadError = new Error('IndexedDB unavailable');
      (idbGet as ReturnType<typeof vi.fn>).mockRejectedValue(loadError);

      const { result } = renderHook(() =>
        useIndexedDBState('error-key', { data: 'default' }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.value).toEqual({ data: 'default' });
      expect(result.current.error).toEqual(loadError);
    });

    test('prevents race conditions with cleanup', async () => {
      let resolveLoad: (value: unknown) => void;
      const loadPromise = new Promise((resolve) => {
        resolveLoad = resolve;
      });
      (idbGet as ReturnType<typeof vi.fn>).mockReturnValue(loadPromise);

      const { unmount, result } = renderHook(() =>
        useIndexedDBState('race-key', { value: 'default' }),
      );

      expect(result.current.loading).toBe(true);

      // Unmount before load completes
      unmount();

      // Complete the load after unmount
      resolveLoad!({ value: 'loaded' });

      await waitFor(() => {
        // Value should not update after unmount
        expect(result.current.value).toEqual({ value: 'default' });
      });
    });

    test('skips initial load when skipInitialLoad is true', async () => {
      const { result } = renderHook(() =>
        useIndexedDBState(
          'skip-key',
          { data: 'default' },
          { skipInitialLoad: true },
        ),
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.value).toEqual({ data: 'default' });
      expect(idbGet).not.toHaveBeenCalled();
    });
  });

  describe('auto-save', () => {
    test('saves value changes to IndexedDB', async () => {
      (idbGet as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useIndexedDBState('save-key', { count: 0 }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setValue({ count: 1 });
      });

      await waitFor(() => {
        expect(idbSet).toHaveBeenCalledWith('save-key', { count: 1 });
      });
    });

    test('does not save during initial loading', async () => {
      (idbGet as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 5 });

      renderHook(() => useIndexedDBState('no-save-key', { count: 0 }));

      // idbSet should not be called during initial load
      expect(idbSet).not.toHaveBeenCalled();

      await waitFor(() => {
        // Even after load completes, no save for initial value
        expect(idbSet).not.toHaveBeenCalled();
      });
    });

    test('handles save errors gracefully', async () => {
      (idbGet as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      const saveError = new Error('Quota exceeded');
      (idbSet as ReturnType<typeof vi.fn>).mockRejectedValue(saveError);

      const { result } = renderHook(() =>
        useIndexedDBState('error-save-key', { data: 'test' }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setValue({ data: 'new' });
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(saveError);
      });
    });

    test('supports functional updates', async () => {
      (idbGet as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 5 });

      const { result } = renderHook(() =>
        useIndexedDBState('functional-key', { count: 0 }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setValue((prev) => ({ count: prev.count + 1 }));
      });

      await waitFor(() => {
        expect(result.current.value).toEqual({ count: 6 });
        expect(idbSet).toHaveBeenCalledWith('functional-key', { count: 6 });
      });
    });
  });

  describe('error handling', () => {
    test('calls custom error handler on load error', async () => {
      const loadError = new Error('Load failed');
      (idbGet as ReturnType<typeof vi.fn>).mockRejectedValue(loadError);

      const onError = vi.fn();

      renderHook(() =>
        useIndexedDBState('custom-error-key', { data: 'default' }, { onError }),
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(loadError, 'load');
      });
    });

    test('calls custom error handler on save error', async () => {
      (idbGet as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      const saveError = new Error('Save failed');
      (idbSet as ReturnType<typeof vi.fn>).mockRejectedValue(saveError);

      const onError = vi.fn();

      const { result } = renderHook(() =>
        useIndexedDBState(
          'custom-save-error-key',
          { data: 'test' },
          { onError },
        ),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setValue({ data: 'new' });
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(saveError, 'save');
      });
    });

    test('uses custom logger context', async () => {
      const { logError } = await import('../../utils/logger');
      const loadError = new Error('Context test');
      (idbGet as ReturnType<typeof vi.fn>).mockRejectedValue(loadError);

      renderHook(() =>
        useIndexedDBState(
          'logger-context-key',
          { data: 'default' },
          { loggerContext: 'CustomContext' },
        ),
      );

      await waitFor(() => {
        expect(logError).toHaveBeenCalledWith(
          expect.stringContaining('IndexedDB load failed'),
          expect.any(Object),
          'CustomContext',
        );
      });
    });
  });

  describe('IndexedDB availability', () => {
    test('skips operations when IndexedDB is not available', async () => {
      const { hasIndexedDB } = await import('../../utils/data/indexedDb');
      (hasIndexedDB as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const { result, rerender } = renderHook(() =>
        useIndexedDBState('no-idb-key', { data: 'default' }),
      );

      expect(result.current.loading).toBe(false);
      expect(idbGet).not.toHaveBeenCalled();

      act(() => {
        result.current.setValue({ data: 'new' });
      });

      rerender();

      await waitFor(() => {
        expect(idbSet).not.toHaveBeenCalled();
      });

      // Restore mock
      (hasIndexedDB as ReturnType<typeof vi.fn>).mockReturnValue(true);
    });
  });

  describe('useIndexedDBStateTuple', () => {
    test('returns tuple compatible with useState', async () => {
      const storedValue = { id: '1', name: 'Test' };
      (idbGet as ReturnType<typeof vi.fn>).mockResolvedValue(storedValue);

      const { result } = renderHook(() =>
        useIndexedDBStateTuple('tuple-key', { id: '', name: '' }),
      );

      await waitFor(() => {
        expect(result.current[2].loading).toBe(false);
      });

      const [value, setValue, meta] = result.current;

      expect(value).toEqual(storedValue);
      expect(typeof setValue).toBe('function');
      expect(meta.loading).toBe(false);
      expect(meta.error).toBeNull();
    });

    test('tuple setter works like useState', async () => {
      (idbGet as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

      const { result } = renderHook(() =>
        useIndexedDBStateTuple('tuple-setter-key', { count: 0 }),
      );

      await waitFor(() => {
        expect(result.current[2].loading).toBe(false);
      });

      act(() => {
        const [, setValue] = result.current;
        setValue({ count: 5 });
      });

      await waitFor(() => {
        const [value] = result.current;
        expect(value).toEqual({ count: 5 });
        expect(idbSet).toHaveBeenCalledWith('tuple-setter-key', { count: 5 });
      });
    });
  });

  describe('type safety', () => {
    test('preserves type information', async () => {
      interface TestType {
        id: string;
        count: number;
        tags: string[];
      }

      const defaultValue: TestType = {
        id: '',
        count: 0,
        tags: [],
      };

      (idbGet as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test',
        count: 42,
        tags: ['a', 'b'],
      });

      const { result } = renderHook(() =>
        useIndexedDBState('type-key', defaultValue),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // TypeScript should enforce type safety
      expect(result.current.value.id).toBe('test');
      expect(result.current.value.count).toBe(42);
      expect(result.current.value.tags).toEqual(['a', 'b']);
    });
  });
});

describe('useIndexedDBPersist', () => {
  test('persists value changes to IndexedDB', async () => {
    const { rerender } = renderHook(
      ({ value }) => useIndexedDBPersist('persist-key', value),
      {
        initialProps: { value: { count: 0 } },
      },
    );

    await waitFor(() => {
      expect(idbSet).toHaveBeenCalledWith('persist-key', { count: 0 });
    });

    vi.clearAllMocks();

    rerender({ value: { count: 1 } });

    await waitFor(() => {
      expect(idbSet).toHaveBeenCalledWith('persist-key', { count: 1 });
    });
  });

  test('does not persist when IndexedDB is unavailable', async () => {
    const { hasIndexedDB } = await import('../../utils/data/indexedDb');
    (hasIndexedDB as ReturnType<typeof vi.fn>).mockReturnValue(false);

    renderHook(() => useIndexedDBPersist('no-idb-persist', { data: 'test' }));

    await waitFor(() => {
      expect(idbSet).not.toHaveBeenCalled();
    });

    // Restore mock
    (hasIndexedDB as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  test('handles persist errors with custom error handler', async () => {
    const saveError = new Error('Persist failed');
    (idbSet as ReturnType<typeof vi.fn>).mockRejectedValue(saveError);

    const onError = vi.fn();

    renderHook(() =>
      useIndexedDBPersist('error-persist-key', { data: 'test' }, { onError }),
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(saveError, 'save');
    });
  });

  test('uses custom logger context', async () => {
    const { logError } = await import('../../utils/logger');
    const saveError = new Error('Persist error');
    (idbSet as ReturnType<typeof vi.fn>).mockRejectedValue(saveError);

    renderHook(() =>
      useIndexedDBPersist(
        'logger-persist-key',
        { data: 'test' },
        { loggerContext: 'CustomPersist' },
      ),
    );

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith(
        expect.stringContaining('IndexedDB persist failed'),
        expect.any(Object),
        'CustomPersist',
      );
    });
  });

  test('persists on every value change', async () => {
    const { rerender } = renderHook(
      ({ value }) => useIndexedDBPersist('multi-persist-key', value),
      {
        initialProps: { value: 0 },
      },
    );

    await waitFor(() => {
      expect(idbSet).toHaveBeenCalledWith('multi-persist-key', 0);
    });

    vi.clearAllMocks();

    rerender({ value: 1 });
    await waitFor(() => {
      expect(idbSet).toHaveBeenCalledWith('multi-persist-key', 1);
    });

    vi.clearAllMocks();

    rerender({ value: 2 });
    await waitFor(() => {
      expect(idbSet).toHaveBeenCalledWith('multi-persist-key', 2);
    });
  });

  test('works with complex object types', async () => {
    interface ComplexType {
      users: Array<{ id: string; name: string }>;
      settings: Record<string, boolean>;
    }

    const value: ComplexType = {
      users: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ],
      settings: { darkMode: true, notifications: false },
    };

    renderHook(() => useIndexedDBPersist('complex-persist-key', value));

    await waitFor(() => {
      expect(idbSet).toHaveBeenCalledWith('complex-persist-key', value);
    });
  });
});
