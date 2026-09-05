// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Hook for managing the persistence queue with debouncing and version control.
 * Extracted from useSeatingPersistence for better separation of concerns.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from 'react';
import { logError } from '@/utils';
import { scheduleIdleTask } from '@/utils/performance/idleTasks';
import type { ISeatingPlanRepository } from '@/repositories';
import type {
  PersistKey,
  PersistPayloadMap,
  PersistJob,
  PersistJobMap,
  PersistSnapshot,
  PersistQueueRefs,
} from './types';
import { INITIAL_PERSIST_VERSIONS } from './types';
import type { PersistErrorHandlingReturn } from './usePersistErrorHandling';

export interface PersistQueueReturn {
  /** Add a job to the persist queue */
  queuePersist: <K extends PersistKey>(
    key: K,
    payload: PersistPayloadMap[K],
  ) => void;
  /** Flush all pending jobs to storage */
  flushPersistQueue: () => Promise<void>;
  /** Prepare queue for class switch (clears queue, increments versions) */
  prepareClassSwitch: (targetClassId: string) => void;
  /** Clear queue and snapshot refs */
  clearQueue: () => void;
  /** Increment all persist versions to invalidate queued jobs */
  incrementAllVersions: () => void;
  /** Queue refs for external access */
  refs: PersistQueueRefs;
}

/**
 * Hook for managing the persistence queue.
 *
 * @param repository - Repository for saving data
 * @param errorHandling - Error handling utilities
 * @param activeClassIdRef - Ref to current active class ID
 * @param isRestoringRef - Ref indicating if restore is in progress
 * @returns Queue operations and refs
 */
export function usePersistQueue(
  repository: ISeatingPlanRepository,
  errorHandling: PersistErrorHandlingReturn,
  activeClassIdRef: MutableRefObject<string | null>,
  isRestoringRef: MutableRefObject<boolean>,
): PersistQueueReturn {
  const {
    markNavigationIntent,
    persistSnapshotResult,
    tryDisplayPersistError,
  } = errorHandling;

  // Queue state refs
  const persistVersionsRef = useRef<Record<PersistKey, number>>({
    ...INITIAL_PERSIST_VERSIONS,
  });
  const persistQueueRef = useRef<PersistJobMap>({});
  const flushScheduledRef = useRef(false);
  const isFlushingRef = useRef(false);
  const lastPersistedSnapshotRef = useRef<PersistSnapshot>({});

  const clearQueue = useCallback(() => {
    persistQueueRef.current = {};
    lastPersistedSnapshotRef.current = {};
    if (flushScheduledRef.current) {
      flushScheduledRef.current = false;
    }
  }, []);

  const incrementAllVersions = useCallback(() => {
    (Object.keys(persistVersionsRef.current) as PersistKey[]).forEach((key) => {
      persistVersionsRef.current[key] += 1;
    });
  }, []);

  const flushPersistQueueRef = useRef<() => Promise<void>>(async () => {});

  // eslint-disable-next-line react-hooks/immutability -- errorHandling.refs contains a ref object; mutation is intentional
  const flushPersistQueue = useCallback(async () => {
    if (isFlushingRef.current) {
      return;
    }

    isFlushingRef.current = true;

    try {
      const queuedJobs = persistQueueRef.current;
      persistQueueRef.current = {};

      // Capture current class ID at flush time to detect stale jobs
      const currentClassId = activeClassIdRef.current;

      // Group jobs by classId
      const jobsByClass: Record<string, PersistJobMap> = {};

      (Object.keys(queuedJobs) as PersistKey[]).forEach((key) => {
        const job = queuedJobs[key];
        const isLatest = job && persistVersionsRef.current[key] === job.version;
        if (!job || !isLatest) {
          return;
        }

        // CRITICAL: Skip jobs for classes that are no longer active
        // This prevents race conditions during class switches
        if (job.classId !== currentClassId && job.classId !== '') {
          return;
        }

        const classId = job.classId;
        if (!jobsByClass[classId]) {
          jobsByClass[classId] = {};
        }
        // @ts-expect-error - Types are tricky here but safe
        jobsByClass[classId][key] = job;
      });

      for (const [classId, jobs] of Object.entries(jobsByClass)) {
        const snapshot: PersistSnapshot = {};
        const snapshotVersions: Partial<Record<PersistKey, number>> = {};
        const classJobs = jobs as PersistJobMap;

        (Object.keys(classJobs) as PersistKey[]).forEach((key) => {
          const job = classJobs[key];
          if (!job) return;
          (snapshot as Record<PersistKey, PersistPayloadMap[PersistKey]>)[key] =
            job.data as PersistPayloadMap[PersistKey];
          snapshotVersions[key] = job.version;
        });

        const snapshotKeys = Object.keys(snapshot) as PersistKey[];
        // If saving for the active class, check against lastPersistedSnapshotRef to avoid redundant writes.
        // For other classes (pending from before switch), always write to be safe.
        const isActiveClass = classId === activeClassIdRef.current;
        const changedKeys = isActiveClass
          ? snapshotKeys.filter(
              (key) =>
                !Object.is(
                  lastPersistedSnapshotRef.current[key],
                  snapshot[key],
                ),
            )
          : snapshotKeys;

        if (snapshotKeys.length > 0 && changedKeys.length > 0) {
          const persistPayload: PersistSnapshot = {};
          changedKeys.forEach((key) => {
            (
              persistPayload as Record<
                PersistKey,
                PersistPayloadMap[PersistKey]
              >
            )[key] = snapshot[key] as PersistPayloadMap[PersistKey];
          });

          const result = await repository.saveClassSnapshot(
            classId,
            persistPayload,
          );

          const isLatestSnapshot = changedKeys.every(
            (key) => persistVersionsRef.current[key] === snapshotVersions[key],
          );

          if (isLatestSnapshot && isActiveClass) {
            persistSnapshotResult(result, changedKeys);
            if (result.success) {
              changedKeys.forEach((key) => {
                (
                  lastPersistedSnapshotRef.current as Record<
                    PersistKey,
                    PersistPayloadMap[PersistKey] | undefined
                  >
                )[key] = snapshot[key];
              });
            }
          } else if (!result.success) {
            // Log error for background saves too
            persistSnapshotResult(result, changedKeys);
          }
        }
      }
    } catch (error) {
      logError('Persist snapshot threw', { error }, 'usePersistQueue');
      errorHandling.refs.pendingPersistErrorRef.current = true; // eslint-disable-line react-hooks/immutability -- writing to a ref, not state
      tryDisplayPersistError();
    } finally {
      isFlushingRef.current = false;
    }

    if (
      Object.keys(persistQueueRef.current).length > 0 &&
      !flushScheduledRef.current
    ) {
      flushScheduledRef.current = true;
      scheduleIdleTask(
        () => {
          flushScheduledRef.current = false;
          void flushPersistQueueRef.current();
        },
        { timeout: 250, fallbackDelay: 80 },
      );
    }
  }, [
    activeClassIdRef,
    errorHandling.refs.pendingPersistErrorRef,
    persistSnapshotResult,
    repository,
    tryDisplayPersistError,
  ]);

  useLayoutEffect(() => {
    flushPersistQueueRef.current = flushPersistQueue;
  });

  // Queued writes wait for an idle callback that never arrives once the tab is
  // hidden or torn down, so the last edit before closing would be lost. Both
  // lifecycle events start the write immediately instead.
  //
  // `visibilitychange` is the one that reliably fires on mobile, and the page
  // usually stays alive long enough for the write to finish; `pagehide` covers
  // desktop tab closes and bfcache entry. Neither can be awaited, but starting
  // the transaction is what matters — the browser lets an open IndexedDB write
  // run to completion in the common cases.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const flushNow = () => {
      if (Object.keys(persistQueueRef.current).length === 0) {
        return;
      }
      flushPersistQueueRef.current().catch((error: unknown) => {
        logError(
          'Flush on page lifecycle event failed',
          { error },
          'usePersistQueue',
        );
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushNow();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', flushNow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', flushNow);
    };
  }, []);

  const queuePersist = useCallback(
    <K extends PersistKey>(key: K, payload: PersistPayloadMap[K]) => {
      if (isRestoringRef.current) {
        return;
      }
      const currentClassId = activeClassIdRef.current;
      const nextVersion = persistVersionsRef.current[key] + 1;
      persistVersionsRef.current[key] = nextVersion;
      const job: PersistJob<K> = {
        version: nextVersion,
        data: payload,
        context: key,
        classId: currentClassId ?? '',
      };
      (
        persistQueueRef.current as Record<
          PersistKey,
          PersistJob<PersistKey> | undefined
        >
      )[key] = job as PersistJob<PersistKey>;

      if (isFlushingRef.current || flushScheduledRef.current) {
        return;
      }

      flushScheduledRef.current = true;
      scheduleIdleTask(
        () => {
          flushScheduledRef.current = false;
          void flushPersistQueueRef.current();
        },
        { timeout: 250, fallbackDelay: 80 },
      );
    },
    [activeClassIdRef, isRestoringRef],
  );

  const prepareClassSwitch = useCallback(
    (targetClassId: string) => {
      markNavigationIntent();
      isRestoringRef.current = true;
      activeClassIdRef.current = targetClassId ?? '';
      clearQueue();
      incrementAllVersions();
    },
    [
      activeClassIdRef,
      clearQueue,
      incrementAllVersions,
      isRestoringRef,
      markNavigationIntent,
    ],
  );

  const refs = useMemo(
    () => ({
      persistVersionsRef,
      persistQueueRef,
      flushScheduledRef,
      isFlushingRef,
      lastPersistedSnapshotRef,
    }),
    [
      persistVersionsRef,
      persistQueueRef,
      flushScheduledRef,
      isFlushingRef,
      lastPersistedSnapshotRef,
    ],
  );

  return useMemo(
    () => ({
      queuePersist,
      flushPersistQueue,
      prepareClassSwitch,
      clearQueue,
      incrementAllVersions,
      refs,
    }),
    [
      queuePersist,
      flushPersistQueue,
      prepareClassSwitch,
      clearQueue,
      incrementAllVersions,
      refs,
    ],
  );
}
