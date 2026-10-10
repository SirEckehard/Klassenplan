// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The persist queue is the piece that decides *what actually reaches the
 * database* — it debounces writes, drops superseded ones and, most importantly,
 * discards jobs belonging to a class the user has already switched away from.
 * That last rule is what keeps one class's students from landing in another.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import type { MutableRefObject } from 'react';
import { usePersistQueue } from '../usePersistQueue';
import type { PersistErrorHandlingReturn } from '../usePersistErrorHandling';
import { retryPersistNow } from '../persistStatus';
import type { ISeatingPlanRepository } from '@/repositories';
import { createMockStudent } from '@/__tests__/utils';

// Queued idle work runs immediately so a test can await the flush. The page
// lifecycle tests flip `immediate` off, because their whole point is a queue
// whose idle callback never arrives.
const idleTasks = vi.hoisted(() => ({ immediate: true }));

vi.mock('@/utils/performance/idleTasks', () => ({
  scheduleIdleTask: (task: () => void) => {
    if (idleTasks.immediate) {
      task();
    }
  },
}));

const createErrorHandling = (): PersistErrorHandlingReturn => ({
  persistSnapshotResult: vi.fn(),
  reportPersistFailure: vi.fn(),
});

const storageFailure = {
  success: false,
  error: { type: 'STORAGE_ERROR', message: 'disk full' },
} as const;

type Harness = {
  repository: { saveClassSnapshot: ReturnType<typeof vi.fn> };
  errorHandling: PersistErrorHandlingReturn;
  activeClassIdRef: MutableRefObject<string | null>;
  isRestoringRef: MutableRefObject<boolean>;
};

const renderQueue = (activeClassId: string | null = 'class-1') => {
  const repository = {
    saveClassSnapshot: vi.fn(async () => ({ success: true, data: undefined })),
  };
  const errorHandling = createErrorHandling();

  const harness = {} as Harness;

  const view = renderHook(() => {
    const activeClassIdRef = useRef<string | null>(activeClassId);
    const isRestoringRef = useRef(false);
    harness.repository = repository;
    harness.errorHandling = errorHandling;
    harness.activeClassIdRef = activeClassIdRef;
    harness.isRestoringRef = isRestoringRef;
    return usePersistQueue(
      repository as unknown as ISeatingPlanRepository,
      errorHandling,
      activeClassIdRef,
      isRestoringRef,
    );
  });

  return { ...view, harness };
};

beforeEach(() => {
  vi.clearAllMocks();
  idleTasks.immediate = true;
});

describe('queuePersist', () => {
  it('writes a queued payload for the active class', async () => {
    const { result, harness } = renderQueue();
    const students = [createMockStudent({ name: 'Ada' })];

    await act(async () => {
      result.current.queuePersist('students', students);
    });

    expect(harness.repository.saveClassSnapshot).toHaveBeenCalledWith(
      'class-1',
      { students },
    );
  });

  it('ignores writes while a restore is running', async () => {
    const { result, harness } = renderQueue();
    harness.isRestoringRef.current = true;

    await act(async () => {
      result.current.queuePersist('students', []);
    });

    expect(harness.repository.saveClassSnapshot).not.toHaveBeenCalled();
  });

  it('keeps only the newest payload per key', async () => {
    const { result, harness } = renderQueue();
    const first = [createMockStudent({ name: 'First' })];
    const second = [createMockStudent({ name: 'Second' })];

    await act(async () => {
      result.current.queuePersist('students', first);
      result.current.queuePersist('students', second);
    });

    const written = harness.repository.saveClassSnapshot.mock.calls.at(-1);
    expect(written?.[1]).toEqual({ students: second });
  });

  it('skips a repeated write of the identical payload', async () => {
    const { result, harness } = renderQueue();
    const students = [createMockStudent({ name: 'Ada' })];

    await act(async () => {
      result.current.queuePersist('students', students);
    });
    await act(async () => {
      result.current.queuePersist('students', students);
    });

    expect(harness.repository.saveClassSnapshot).toHaveBeenCalledTimes(1);
  });
});

describe('version invalidation', () => {
  it('drops queued jobs after all versions were incremented', async () => {
    const { result, harness } = renderQueue();
    harness.isRestoringRef.current = true;

    act(() => {
      // Queue directly into the ref: `queuePersist` would refuse while
      // restoring, and this is exactly the state the guard protects.
      result.current.refs.persistQueueRef.current = {
        students: {
          version: result.current.refs.persistVersionsRef.current.students,
          data: [],
          context: 'students',
          classId: 'class-1',
        },
      };
      // A restore bumps every version, which retroactively marks the job above
      // as stale — it holds data the restore is about to overwrite.
      result.current.incrementAllVersions();
    });

    await act(async () => {
      await result.current.flushPersistQueue();
    });

    expect(harness.repository.saveClassSnapshot).not.toHaveBeenCalled();
  });
});

describe('class switch', () => {
  it('never writes a job of the previous class into the new one', async () => {
    const { result, harness } = renderQueue();

    act(() => {
      // A job that was queued for class-1 but not flushed yet…
      result.current.refs.persistQueueRef.current = {
        students: {
          version: result.current.refs.persistVersionsRef.current.students,
          data: [createMockStudent({ name: 'From class 1' })],
          context: 'students',
          classId: 'class-1',
        },
      };
      // …while the user is already on class-2.
      harness.activeClassIdRef.current = 'class-2';
    });

    await act(async () => {
      await result.current.flushPersistQueue();
    });

    expect(harness.repository.saveClassSnapshot).not.toHaveBeenCalled();
  });
});

describe('error handling', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports a failed write through the error handler', async () => {
    const { result, harness } = renderQueue();
    harness.repository.saveClassSnapshot.mockResolvedValueOnce(storageFailure);

    await act(async () => {
      result.current.queuePersist('students', []);
    });

    expect(harness.errorHandling.persistSnapshotResult).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
      ['students'],
    );
  });

  it('surfaces a throwing repository instead of losing the error', async () => {
    const { result, harness } = renderQueue();
    const error = new Error('connection lost');
    harness.repository.saveClassSnapshot.mockRejectedValueOnce(error);

    await act(async () => {
      result.current.queuePersist('students', []);
    });

    expect(harness.errorHandling.reportPersistFailure).toHaveBeenCalledWith(
      error,
    );
  });

  it('writes a failed job again after a second', async () => {
    vi.useFakeTimers();
    const { result, harness } = renderQueue();
    const students = [createMockStudent({ name: 'Ada' })];
    harness.repository.saveClassSnapshot.mockResolvedValueOnce(storageFailure);

    await act(async () => {
      result.current.queuePersist('students', students);
    });
    expect(harness.repository.saveClassSnapshot).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(harness.repository.saveClassSnapshot).toHaveBeenCalledTimes(2);
    expect(harness.repository.saveClassSnapshot).toHaveBeenLastCalledWith(
      'class-1',
      { students },
    );
  });

  it('writes the newer payload rather than the failed one', async () => {
    vi.useFakeTimers();
    const { result, harness } = renderQueue();
    const first = [createMockStudent({ name: 'First' })];
    const second = [createMockStudent({ name: 'Second' })];
    let finishWrite: (value: typeof storageFailure) => void = () => {};
    harness.repository.saveClassSnapshot.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishWrite = resolve;
        }),
    );

    await act(async () => {
      result.current.queuePersist('students', first);
    });
    // A newer edit arrives while the first write is still under way, which
    // then fails: the failed payload must not come back over the newer one.
    await act(async () => {
      result.current.queuePersist('students', second);
      finishWrite(storageFailure);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(harness.repository.saveClassSnapshot).toHaveBeenLastCalledWith(
      'class-1',
      { students: second },
    );
  });

  it('waits twice as long after every failure and stops trying on its own', async () => {
    vi.useFakeTimers();
    const { result, harness } = renderQueue();
    harness.repository.saveClassSnapshot.mockResolvedValue(storageFailure);

    await act(async () => {
      result.current.queuePersist('students', []);
    });
    // 1 + 2 + 4 + 8 + 16 + 30 + 30 + 30 seconds: eight attempts of its own.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000);
    });

    expect(harness.repository.saveClassSnapshot).toHaveBeenCalledTimes(9);
  });

  it('tries again at once when asked from the status bar', async () => {
    vi.useFakeTimers();
    const { result, harness } = renderQueue();
    harness.repository.saveClassSnapshot.mockResolvedValueOnce(storageFailure);

    await act(async () => {
      result.current.queuePersist('students', []);
    });
    await act(async () => {
      retryPersistNow();
    });

    expect(harness.repository.saveClassSnapshot).toHaveBeenCalledTimes(2);
    // The scheduled attempt was taken over, not added on top.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(harness.repository.saveClassSnapshot).toHaveBeenCalledTimes(2);
  });

  it('does not retry a write for a class that no longer exists', async () => {
    vi.useFakeTimers();
    const { result, harness } = renderQueue();
    harness.repository.saveClassSnapshot.mockResolvedValueOnce({
      success: false,
      error: { type: 'NOT_FOUND', message: 'Class not found' },
    });

    await act(async () => {
      result.current.queuePersist('students', []);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(harness.repository.saveClassSnapshot).toHaveBeenCalledTimes(1);
  });
});

describe('page lifecycle flush', () => {
  const setVisibilityState = (state: DocumentVisibilityState) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => state,
    });
  };

  afterEach(() => {
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('writes a pending job when the tab is hidden', async () => {
    idleTasks.immediate = false;
    const { result, harness } = renderQueue();
    const students = [createMockStudent({ name: 'Ada' })];

    act(() => {
      result.current.queuePersist('students', students);
    });
    // The idle callback never fired, so nothing has reached the database yet —
    // this is the window in which closing the tab used to lose the edit.
    expect(harness.repository.saveClassSnapshot).not.toHaveBeenCalled();

    await act(async () => {
      setVisibilityState('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(harness.repository.saveClassSnapshot).toHaveBeenCalledWith(
      'class-1',
      { students },
    );
  });

  it('writes a pending job on pagehide', async () => {
    idleTasks.immediate = false;
    const { result, harness } = renderQueue();
    const students = [createMockStudent({ name: 'Grace' })];

    act(() => {
      result.current.queuePersist('students', students);
    });

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(harness.repository.saveClassSnapshot).toHaveBeenCalledWith(
      'class-1',
      { students },
    );
  });

  it('ignores a tab that merely becomes visible again', async () => {
    idleTasks.immediate = false;
    const { result, harness } = renderQueue();

    act(() => {
      result.current.queuePersist('students', []);
    });

    await act(async () => {
      setVisibilityState('visible');
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(harness.repository.saveClassSnapshot).not.toHaveBeenCalled();
  });

  it('does not write when the queue is empty', async () => {
    const { harness } = renderQueue();

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(harness.repository.saveClassSnapshot).not.toHaveBeenCalled();
  });

  it('stops listening once the hook unmounts', async () => {
    idleTasks.immediate = false;
    const { result, harness, unmount } = renderQueue();

    act(() => {
      result.current.queuePersist('students', []);
    });
    unmount();

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(harness.repository.saveClassSnapshot).not.toHaveBeenCalled();
  });
});

describe('clearQueue', () => {
  it('empties queue and snapshot so the next write is not deduplicated away', async () => {
    const { result, harness } = renderQueue();
    const students = [createMockStudent({ name: 'Ada' })];

    await act(async () => {
      result.current.queuePersist('students', students);
    });
    act(() => {
      result.current.clearQueue();
    });
    await act(async () => {
      result.current.queuePersist('students', students);
    });

    expect(harness.repository.saveClassSnapshot).toHaveBeenCalledTimes(2);
  });
});
