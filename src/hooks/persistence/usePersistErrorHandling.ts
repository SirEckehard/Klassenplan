/**
 * Hook for handling persistence errors and navigation-aware error display.
 * Extracted from useSeatingPersistence for better separation of concerns.
 */
import { useCallback, useEffect, useRef } from 'react';
import { logError, logWarn, showToast, TOAST_MESSAGES } from '@/utils';
import {
  RepositoryErrorType,
  type RepositoryError,
  type Result,
} from '@/repositories';
import type { PersistKey, PersistErrorRefs } from './types';
import { PERSIST_CONTEXT_LABELS } from './types';

const PERSIST_ERROR_NAVIGATION_WINDOW_MS = 6000;

/**
 * Check if an error indicates a missing class (used to suppress expected errors).
 */
export const isMissingClassPersistError = (
  error?: RepositoryError | null,
): boolean =>
  Boolean(
    error &&
    (error.type === RepositoryErrorType.NOT_FOUND ||
      (error.type === RepositoryErrorType.VALIDATION_ERROR &&
        error.message === 'No active class selected')),
  );

export interface PersistErrorHandlingReturn {
  /** Show error toast with rate limiting */
  showPersistErrorToast: () => void;
  /** Try to display pending error if within navigation window */
  tryDisplayPersistError: () => void;
  /** Mark navigation intent timestamp */
  markNavigationIntent: () => void;
  /** Process persist result and handle errors */
  persistSnapshotResult: (
    result: Result<unknown>,
    contexts: PersistKey[],
  ) => void;
  /** Refs for error state */
  refs: PersistErrorRefs;
}

/**
 * Hook for managing persistence error handling and display.
 *
 * @param hasActiveClass - Whether there is an active class selected
 * @returns Error handling functions and refs
 */
export function usePersistErrorHandling(
  hasActiveClass: boolean,
): PersistErrorHandlingReturn {
  const pendingPersistErrorRef = useRef(false);
  const navigationIntentRef = useRef(0);
  const lastPersistErrorToastRef = useRef(0);

  const showPersistErrorToast = useCallback(() => {
    if (!hasActiveClass) {
      pendingPersistErrorRef.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastPersistErrorToastRef.current < 4000) {
      return;
    }
    lastPersistErrorToastRef.current = now;
    pendingPersistErrorRef.current = false;
    showToast('error', TOAST_MESSAGES.SAVE_ERROR);
  }, [hasActiveClass]);

  const tryDisplayPersistError = useCallback(() => {
    if (!pendingPersistErrorRef.current) {
      return;
    }
    const lastNavigationIntent = navigationIntentRef.current;
    if (!lastNavigationIntent) {
      return;
    }
    if (
      Date.now() - lastNavigationIntent >
      PERSIST_ERROR_NAVIGATION_WINDOW_MS
    ) {
      return;
    }
    showPersistErrorToast();
  }, [showPersistErrorToast]);

  const markNavigationIntent = useCallback(() => {
    navigationIntentRef.current = Date.now();
    tryDisplayPersistError();
  }, [tryDisplayPersistError]);

  const persistSnapshotResult = useCallback(
    (result: Result<unknown>, contexts: PersistKey[]) => {
      if (result.success) {
        if (pendingPersistErrorRef.current) {
          pendingPersistErrorRef.current = false;
        }
        return;
      }

      const contextLabel = contexts
        .map((key) => PERSIST_CONTEXT_LABELS[key] ?? key)
        .join(', ');

      if (isMissingClassPersistError(result.error)) {
        logWarn(
          `Persist ${contextLabel} skipped (no active class)`,
          { error: result.error },
          'usePersistErrorHandling',
        );
        return;
      }

      logError(
        `Persist ${contextLabel} failed`,
        { error: result.error },
        'usePersistErrorHandling',
      );
      pendingPersistErrorRef.current = true;
      tryDisplayPersistError();
    },
    [tryDisplayPersistError],
  );

  // Set up navigation event listeners
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        markNavigationIntent();
      }
    };
    const handleNavigationIntent = () => {
      markNavigationIntent();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleNavigationIntent);
    window.addEventListener('beforeunload', handleNavigationIntent);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleNavigationIntent);
      window.removeEventListener('beforeunload', handleNavigationIntent);
    };
  }, [markNavigationIntent]);

  return {
    showPersistErrorToast,
    tryDisplayPersistError,
    markNavigationIntent,
    persistSnapshotResult,
    refs: {
      pendingPersistErrorRef,
      navigationIntentRef,
      lastPersistErrorToastRef,
    },
  };
}
