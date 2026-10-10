// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Hook for handling persistence errors.
 * Extracted from useSeatingPersistence for better separation of concerns.
 */
import { useCallback, useEffect, useRef } from 'react';
import { logError, logWarn, showToast, TOAST_MESSAGES } from '@/utils';
import {
  RepositoryErrorType,
  type RepositoryError,
  type Result,
} from '@/repositories';
import type { PersistKey } from './types';
import { PERSIST_CONTEXT_LABELS } from './types';
import { getPersistStatus, setPersistStatus } from './persistStatus';

/** At most one error toast in this time, however many writes fail. */
const PERSIST_ERROR_TOAST_INTERVAL_MS = 4000;

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
  /** Process persist result and handle errors */
  persistSnapshotResult: (
    result: Result<unknown>,
    contexts: PersistKey[],
  ) => void;
  /** A write that threw instead of returning a failure. */
  reportPersistFailure: (error: unknown) => void;
}

/**
 * Hook for managing persistence error handling and display.
 *
 * A failed write is said the moment it happens — once per run of failures,
 * not per attempt — and the status bar keeps saying it ("Nicht gespeichert")
 * until a write succeeds, which the queue keeps trying. Before, the message
 * waited for the tab to be hidden and then showed for five seconds in a tab
 * nobody looked at, so a teacher went on working on data that never reached
 * storage. While writes fail, leaving the page asks first.
 *
 * @param hasActiveClass - Whether there is an active class selected
 * @returns Error handling functions
 */
export function usePersistErrorHandling(
  hasActiveClass: boolean,
): PersistErrorHandlingReturn {
  const lastPersistErrorToastRef = useRef(0);

  const markFailed = useCallback(() => {
    if (!hasActiveClass) return;
    const firstFailure = getPersistStatus() !== 'failed';
    setPersistStatus('failed');
    const now = Date.now();
    if (
      !firstFailure ||
      now - lastPersistErrorToastRef.current < PERSIST_ERROR_TOAST_INTERVAL_MS
    ) {
      return;
    }
    lastPersistErrorToastRef.current = now;
    showToast('error', TOAST_MESSAGES.SAVE_ERROR);
  }, [hasActiveClass]);

  const markSaved = useCallback(() => {
    if (getPersistStatus() !== 'failed') return;
    setPersistStatus('saved');
    showToast('success', TOAST_MESSAGES.SAVE_RECOVERED);
  }, []);

  const persistSnapshotResult = useCallback(
    (result: Result<unknown>, contexts: PersistKey[]) => {
      if (result.success) {
        markSaved();
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
      markFailed();
    },
    [markFailed, markSaved],
  );

  const reportPersistFailure = useCallback(
    (error: unknown) => {
      logError('Persist snapshot threw', { error }, 'usePersistErrorHandling');
      markFailed();
    },
    [markFailed],
  );

  // Changes that never reached storage are lost with the page: the browser
  // asks before leaving while writes fail. Its own wording, which a page
  // cannot replace.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (getPersistStatus() !== 'failed') return;
      event.preventDefault();
      // Older browsers only ask when a return value is set.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return {
    persistSnapshotResult,
    reportPersistFailure,
  };
}
