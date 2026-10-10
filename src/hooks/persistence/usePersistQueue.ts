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
import {
  isMissingClassPersistError,
  type PersistErrorHandlingReturn,
} from './usePersistErrorHandling';
import { registerPersistRetry } from './persistStatus';

/** The first attempt after a failed write waits this long… */
const PERSIST_RETRY_BASE_MS = 1000;
/** …and every further one twice as long, up to this. */
const PERSIST_RETRY_MAX_MS = 30_000;
/**
 * Attempts the queue makes on its own, about three minutes' worth. A store
 * that stays full would otherwise be rewritten every half minute for good;
 * after them the next edit or the status bar's button tries again.
 */
const PERSIST_RETRY_LIMIT = 8;

export interface PersistQueueReturn {
  /** Add a job to the persist queue */
  queuePersist: <K extends PersistKey>(
    key: K,
    payload: PersistPayloadMap[K],
  ) => void;
  /** Flush all pending jobs to storage */
  flushPersistQueue: () => Promise<void>;
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
 * A write that fails puts its jobs back, unless a newer one for the same key
 * arrived meanwhile, and the queue tries again — after a second, then twice as
 * long each time up to half a minute, and right away when the teacher asks
 * from the status bar (`retryPersistNow`). Before, a failed job was dropped
 * and its data stayed unsaved until the same field happened to change again.
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
  const { persistSnapshotResult, reportPersistFailure } = errorHandling;

  // Queue state refs
  const persistVersionsRef = useRef<Record<PersistKey, number>>({
    ...INITIAL_PERSIST_VERSIONS,
  });
  const persistQueueRef = useRef<PersistJobMap>({});
  const flushScheduledRef = useRef(false);
  const isFlushingRef = useRef(false);
  const lastPersistedSnapshotRef = useRef<PersistSnapshot>({});
  // Failed writes in a row, and the attempt waiting for its turn.
  const failureCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelRetry = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const clearQueue = useCallback(() => {
    persistQueueRef.current = {};
    lastPersistedSnapshotRef.current = {};
    if (flushScheduledRef.current) {
      flushScheduledRef.current = false;
    }
    // What failed belonged to the queue just emptied.
    cancelRetry();
    failureCountRef.current = 0;
  }, [cancelRetry]);

  const incrementAllVersions = useCallback(() => {
    (Object.keys(persistVersionsRef.current) as PersistKey[]).forEach((key) => {
      persistVersionsRef.current[key] += 1;
    });
  }, []);

  const flushPersistQueueRef = useRef<() => Promise<void>>(async () => {});

  const runFlush = useCallback(() => {
    flushPersistQueueRef.current().catch((error: unknown) => {
      logError('Persist flush failed', { error }, 'usePersistQueue');
    });
  }, []);

  /**
   * Puts the jobs of a failed write back, each unless a newer job for its
   * key was queued or versioned meanwhile — the newer one carries the data.
   */
  const requeue = useCallback((jobs: PersistJobMap, keys: PersistKey[]) => {
    for (const key of keys) {
      const job = jobs[key];
      if (!job || persistVersionsRef.current[key] !== job.version) continue;
      if (persistQueueRef.current[key]) continue;
      (
        persistQueueRef.current as Record<
          PersistKey,
          PersistJob<PersistKey> | undefined
        >
      )[key] = job as PersistJob<PersistKey>;
    }
  }, []);

  const scheduleRetry = useCallback(() => {
    failureCountRef.current += 1;
    if (retryTimerRef.current !== null) return;
    if (failureCountRef.current > PERSIST_RETRY_LIMIT) return;
    const delay = Math.min(
      PERSIST_RETRY_MAX_MS,
      PERSIST_RETRY_BASE_MS * 2 ** (failureCountRef.current - 1),
    );
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      runFlush();
    }, delay);
  }, [runFlush]);

  const flushPersistQueue = useCallback(async () => {
    if (isFlushingRef.current) {
      return;
    }

    isFlushingRef.current = true;
    const queuedJobs = persistQueueRef.current;
    persistQueueRef.current = {};
    // Whether a write of this flush failed: then the retry, the next edit or
    // the status bar's button go on, not an immediate second round.
    let failed = false;

    try {
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

          if (result.success) {
            if (isActiveClass) {
              failureCountRef.current = 0;
              cancelRetry();
            }
          } else if (
            isActiveClass &&
            !isMissingClassPersistError(result.error)
          ) {
            failed = true;
            requeue(classJobs, changedKeys);
            scheduleRetry();
          }
        }
      }
    } catch (error) {
      // The repository returns its failures; a throw is unexpected, so every
      // job of this flush that is still current goes back for the next try.
      failed = true;
      requeue(queuedJobs, Object.keys(queuedJobs) as PersistKey[]);
      reportPersistFailure(error);
      scheduleRetry();
    } finally {
      isFlushingRef.current = false;
    }

    // What arrived during the write goes next — unless a write failed: the
    // retry takes it along, and storage that just refused gets no second
    // round at once.
    if (
      Object.keys(persistQueueRef.current).length > 0 &&
      !flushScheduledRef.current &&
      !failed
    ) {
      flushScheduledRef.current = true;
      scheduleIdleTask(
        () => {
          flushScheduledRef.current = false;
          runFlush();
        },
        { timeout: 250, fallbackDelay: 80 },
      );
    }
  }, [
    activeClassIdRef,
    cancelRetry,
    persistSnapshotResult,
    reportPersistFailure,
    repository,
    requeue,
    runFlush,
    scheduleRetry,
  ]);

  useLayoutEffect(() => {
    flushPersistQueueRef.current = flushPersistQueue;
  });

  // The status bar's "Nicht gespeichert" writes what failed right away.
  useEffect(
    () =>
      registerPersistRetry(() => {
        cancelRetry();
        runFlush();
      }),
    [cancelRetry, runFlush],
  );

  // A retry must not outlive the queue it belongs to.
  useEffect(() => cancelRetry, [cancelRetry]);

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
          runFlush();
        },
        { timeout: 250, fallbackDelay: 80 },
      );
    },
    [activeClassIdRef, isRestoringRef, runFlush],
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
      clearQueue,
      incrementAllVersions,
      refs,
    }),
    [queuePersist, flushPersistQueue, clearQueue, incrementAllVersions, refs],
  );
}
