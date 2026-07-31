// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Behaviour of the worker client around its inline fallback.
 *
 * The interesting question is not "does it compute a plan" — that is the
 * algorithm's job — but *when* it silently re-runs the work on the main thread.
 * A cancelled or timed-out request must never do that.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ClassroomScene } from '@/types';

const operationMocks = vi.hoisted(() => ({
  executeAlgorithmOperation: vi.fn(async () => ({ seating: [] })),
}));

vi.mock('../algorithmOperations', () => operationMocks);

const scene = { totalStudents: 0, tables: [], features: [] } as ClassroomScene;

const mixPayload = {
  students: [],
  seatingHistory: [],
  mixHistory: [],
  lockedPositions: {},
  classroomScene: scene,
  mixSettings: {},
  lastSeating: null,
};

type PostedMessage = {
  requestId: string;
  operation: string;
  payload: unknown;
};

/** Worker stub whose responses the test drives message by message. */
class FakeWorker {
  static instances: FakeWorker[] = [];

  posted: PostedMessage[] = [];
  terminated = false;
  private listeners = new Map<string, Set<(event: unknown) => void>>();

  constructor() {
    FakeWorker.instances.push(this);
  }

  addEventListener(type: string, handler: (event: unknown) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(handler);
  }

  removeEventListener(type: string, handler: (event: unknown) => void): void {
    this.listeners.get(type)?.delete(handler);
  }

  postMessage(message: PostedMessage): void {
    this.posted.push(message);
    // Warmup is answered automatically so initialisation always succeeds.
    if (message.operation === 'worker:warmup') {
      queueMicrotask(() =>
        this.emit('message', {
          requestId: message.requestId,
          operation: message.operation,
          status: 'success',
          result: { ready: true },
        }),
      );
    }
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(type: string, data: unknown): void {
    for (const handler of this.listeners.get(type) ?? []) {
      handler({ data } as MessageEvent);
    }
  }

  /** Request id of the last non-warmup message. */
  get lastRequestId(): string {
    const real = this.posted.filter((m) => m.operation !== 'worker:warmup');
    return real[real.length - 1]!.requestId;
  }
}

const loadClient = async () => {
  vi.resetModules();
  return import('../algorithmWorkerClient');
};

/** Lets queued microtasks (warmup handshake, dispatch) settle. */
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  vi.clearAllMocks();
  FakeWorker.instances = [];
  vi.stubGlobal('Worker', FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('without worker support', () => {
  it('runs the operation on the main thread', async () => {
    // `isWorkerSupported` checks `'Worker' in window`, so remove it there.
    const originalWorker = (window as unknown as { Worker?: unknown }).Worker;
    // @ts-expect-error - deleting an optional global for the test
    delete window.Worker;

    try {
      const { algorithmWorkerClient } = await loadClient();
      await algorithmWorkerClient.callOperation('mix:generate', mixPayload);

      expect(operationMocks.executeAlgorithmOperation).toHaveBeenCalledWith(
        'mix:generate',
        mixPayload,
      );
    } finally {
      (window as unknown as { Worker?: unknown }).Worker = originalWorker;
    }
  });
});

describe('with a working worker', () => {
  it('resolves from the worker response without touching the fallback', async () => {
    const { algorithmWorkerClient } = await loadClient();

    const pending = algorithmWorkerClient.callOperation(
      'mix:generate',
      mixPayload,
    );
    await flush();

    const worker = FakeWorker.instances[0]!;
    worker.emit('message', {
      requestId: worker.lastRequestId,
      operation: 'mix:generate',
      status: 'success',
      result: { seating: [['from-worker']] },
    });

    await expect(pending).resolves.toEqual({ seating: [['from-worker']] });
    expect(operationMocks.executeAlgorithmOperation).not.toHaveBeenCalled();
  });

  it('relays progress updates and keeps the request open', async () => {
    const { algorithmWorkerClient } = await loadClient();
    const onProgress = vi.fn();

    const pending = algorithmWorkerClient.callOperation(
      'circle:generate',
      { students: [], classroomScene: scene },
      { onProgress },
    );
    await flush();

    const worker = FakeWorker.instances[0]!;
    worker.emit('message', {
      requestId: worker.lastRequestId,
      operation: 'circle:generate',
      status: 'progress',
      progress: { progress: 0.5, stage: 'arranging' },
    });
    worker.emit('message', {
      requestId: worker.lastRequestId,
      operation: 'circle:generate',
      status: 'success',
      result: { layout: { students: [] } },
    });

    await pending;
    expect(onProgress).toHaveBeenCalledWith({
      progress: 0.5,
      stage: 'arranging',
    });
  });

  it('falls back to the main thread when the worker reports an error', async () => {
    const { algorithmWorkerClient } = await loadClient();

    const pending = algorithmWorkerClient.callOperation(
      'mix:generate',
      mixPayload,
    );
    await flush();

    const worker = FakeWorker.instances[0]!;
    worker.emit('message', {
      requestId: worker.lastRequestId,
      operation: 'mix:generate',
      status: 'error',
      error: { message: 'boom' },
    });

    await pending;
    expect(operationMocks.executeAlgorithmOperation).toHaveBeenCalledTimes(1);
  });
});

describe('cancellation and timeouts', () => {
  it('rejects an aborted request instead of computing it inline', async () => {
    const { algorithmWorkerClient } = await loadClient();
    const controller = new AbortController();

    const pending = algorithmWorkerClient.callOperation(
      'mix:generate',
      mixPayload,
      { signal: controller.signal },
    );
    await flush();

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    // The whole point: a cancelled mix must not keep running anywhere.
    expect(operationMocks.executeAlgorithmOperation).not.toHaveBeenCalled();
  });

  it('rejects a timed-out request and drops the stuck worker', async () => {
    vi.useFakeTimers();
    const { algorithmWorkerClient, AlgorithmWorkerTimeoutError } =
      await loadClient();

    const pending = algorithmWorkerClient.callOperation(
      'mix:generate',
      mixPayload,
      { timeoutMs: 50 },
    );
    // Attach the expectation before the timer fires, otherwise the rejection
    // is reported as unhandled.
    const rejection = expect(pending).rejects.toBeInstanceOf(
      AlgorithmWorkerTimeoutError,
    );

    // Fake timers still let queued microtasks run, so the warmup completes.
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60);

    await rejection;
    // Re-running a job that already hung for the full timeout would freeze the
    // UI for just as long.
    expect(operationMocks.executeAlgorithmOperation).not.toHaveBeenCalled();
    expect(FakeWorker.instances[0]!.terminated).toBe(true);
  });
});
