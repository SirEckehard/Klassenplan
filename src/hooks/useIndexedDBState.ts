import { useEffect, useState, useRef } from 'react';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { hasIndexedDB } from '@/utils/data/indexedDb';
import { logError } from '@/utils';

export interface UseIndexedDBStateOptions {
  /**
   * Skip initial load from IndexedDB (useful for write-only scenarios)
   */
  skipInitialLoad?: boolean;
  /**
   * Custom error handler for load/save operations
   */
  onError?: (error: Error, operation: 'load' | 'save') => void;
  /**
   * Custom logger context for error messages
   */
  loggerContext?: string;
}

export interface UseIndexedDBStateReturn<T> {
  /**
   * Current state value
   */
  value: T;
  /**
   * State setter (behaves like useState setter)
   */
  setValue: React.Dispatch<React.SetStateAction<T>>;
  /**
   * Loading state during initial load
   */
  loading: boolean;
  /**
   * Error state from last operation
   */
  error: Error | null;
}

/**
 * Persist a state value in IndexedDB with automatic synchronization.
 * Similar to `usePersistentState` but for IndexedDB instead of localStorage.
 *
 * Features:
 * - Lazy initial loading with race condition prevention
 * - Auto-persistence on state changes
 * - Error handling with centralized logging
 * - TypeScript generics for type safety
 * - Loading state for UI feedback
 *
 * @example
 * ```typescript
 * const { value: students, setValue: setStudents, loading } = useIndexedDBState(
 *   DB_KEYS.students,
 *   [] as Student[]
 * );
 * ```
 *
 * @param key IndexedDB storage key
 * @param defaultValue Initial value when nothing is stored
 * @param options Optional configuration
 * @returns Object with value, setValue, loading, and error state
 */
export function useIndexedDBState<T>(
  key: string,
  defaultValue: T,
  options: UseIndexedDBStateOptions = {},
): UseIndexedDBStateReturn<T> {
  const {
    skipInitialLoad = false,
    onError,
    loggerContext = 'useIndexedDBState',
  } = options;

  const [value, setValue] = useState<T>(defaultValue);
  const shouldLoad = !skipInitialLoad && hasIndexedDB();
  const [loading, setLoading] = useState<boolean>(shouldLoad);
  const [error, setError] = useState<Error | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Load persisted data on mount
  useEffect(() => {
    if (!shouldLoad) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const stored = await idbGet(key);
        if (cancelled || !isMountedRef.current) return;

        if (stored !== undefined && stored !== null) {
          setValue(stored as T);
        }
        setLoading(false);
        setError(null);
      } catch (e) {
        if (cancelled || !isMountedRef.current) return;

        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        setLoading(false);

        logError(
          `IndexedDB load failed for key "${key}"`,
          { error: e, key },
          loggerContext,
        );

        if (onError) {
          onError(err, 'load');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key, onError, loggerContext, shouldLoad]);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-save on value changes
  useEffect(() => {
    // Skip initial save during first render (before data is loaded)
    if (loading) return;
    if (!hasIndexedDB()) return;

    idbSet(key, value).catch((e) => {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);

      logError(
        `IndexedDB save failed for key "${key}"`,
        { error: e, key },
        loggerContext,
      );

      if (onError) {
        onError(err, 'save');
      }
    });
  }, [value, key, loading, onError, loggerContext]);

  return {
    value,
    setValue,
    loading,
    error,
  };
}

/**
 * Variant that returns a tuple like useState for easier migration.
 *
 * @example
 * ```typescript
 * const [students, setStudents, { loading }] = useIndexedDBStateTuple(
 *   DB_KEYS.students,
 *   [] as Student[]
 * );
 * ```
 */
export function useIndexedDBStateTuple<T>(
  key: string,
  defaultValue: T,
  options: UseIndexedDBStateOptions = {},
): [
  T,
  React.Dispatch<React.SetStateAction<T>>,
  { loading: boolean; error: Error | null },
] {
  const { value, setValue, loading, error } = useIndexedDBState(
    key,
    defaultValue,
    options,
  );
  return [value, setValue, { loading, error }];
}

/**
 * Auto-persist a value to IndexedDB without managing state.
 * Useful when state is managed elsewhere but needs persistence.
 *
 * @example
 * ```typescript
 * const [students, setStudents] = useState<Student[]>([]);
 * useIndexedDBPersist(DB_KEYS.students, students);
 * ```
 *
 * @param key IndexedDB storage key
 * @param value Value to persist
 * @param options Optional configuration
 */
type PersistOptions = Omit<UseIndexedDBStateOptions, 'skipInitialLoad'> & {
  enabled?: boolean;
};

export function useIndexedDBPersist<T>(
  key: string,
  value: T,
  options: PersistOptions = {},
): void {
  const {
    onError,
    loggerContext = 'useIndexedDBPersist',
    enabled = true,
  } = options;

  useEffect(() => {
    if (!enabled || !hasIndexedDB()) return;

    idbSet(key, value).catch((e) => {
      const err = e instanceof Error ? e : new Error(String(e));

      logError(
        `IndexedDB persist failed for key "${key}"`,
        { error: e, key },
        loggerContext,
      );

      if (onError) {
        onError(err, 'save');
      }
    });
  }, [value, key, onError, loggerContext, enabled]);
}
