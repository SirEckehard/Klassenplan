// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The persist queue is the piece that decides *what actually reaches the
 * database* — it debounces writes, drops superseded ones and, most importantly,
 * discards jobs belonging to a class the user has already switched away from.
 * That last rule is what keeps one class's students from landing in another.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import type { MutableRefObject } from 'react';
import { usePersistQueue } from '../usePersistQueue';
import type { PersistErrorHandlingReturn } from '../usePersistErrorHandling';
import type { ISeatingPlanRepository } from '@/repositories';
import { createMockStudent } from '@/__tests__/utils';

// Run queued idle work immediately so a test can await the flush.
vi.mock('@/utils/performance/idleTasks', () => ({
  scheduleIdleTask: (task: () => void) => {
    task();
  },
}));

const createErrorHandling = (): PersistErrorHandlingReturn =>
  ({
    markNavigationIntent: vi.fn(),
    persistSnapshotResult: vi.fn(),
    tryDisplayPersistError: vi.fn(),
    refs: {
      pendingPersistErrorRef: { current: false },
      navigationIntentRef: { current: 0 },
      lastPersistErrorToastRef: { current: 0 },
    },
  }) as unknown as PersistErrorHandlingReturn;

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

describe('prepareClassSwitch', () => {
  it('clears the queue and blocks further writes until the restore finishes', async () => {
    const { result, harness } = renderQueue();

    act(() => {
      result.current.queuePersist('students', []);
      result.current.prepareClassSwitch('class-2');
    });

    expect(result.current.refs.persistQueueRef.current).toEqual({});
    expect(harness.activeClassIdRef.current).toBe('class-2');
    expect(harness.isRestoringRef.current).toBe(true);
    expect(harness.errorHandling.markNavigationIntent).toHaveBeenCalled();
  });

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
  it('reports a failed write through the error handler', async () => {
    const { result, harness } = renderQueue();
    harness.repository.saveClassSnapshot.mockResolvedValueOnce({
      success: false,
      error: { type: 'STORAGE_ERROR', message: 'disk full' },
    });

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
    harness.repository.saveClassSnapshot.mockRejectedValueOnce(
      new Error('connection lost'),
    );

    await act(async () => {
      result.current.queuePersist('students', []);
    });

    expect(harness.errorHandling.tryDisplayPersistError).toHaveBeenCalled();
    expect(harness.errorHandling.refs.pendingPersistErrorRef.current).toBe(
      true,
    );
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
