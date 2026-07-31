// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Message protocol of the algorithm worker.
 *
 * The worker itself owns no algorithm any more — only request validation,
 * progress relaying and error shaping. That protocol is what these tests pin
 * down; the computation is covered via `algorithmOperations`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createWorkerErrorPayload,
  isAlgorithmWorkerRequest,
} from '../algorithmWorker.types';

describe('isAlgorithmWorkerRequest', () => {
  it('accepts a well-formed request', () => {
    expect(
      isAlgorithmWorkerRequest({
        requestId: 'r1',
        operation: 'mix:generate',
        payload: {},
      }),
    ).toBe(true);
  });

  it.each([
    ['null', null],
    ['a primitive', 'nope'],
    ['a missing request id', { operation: 'mix:generate', payload: {} }],
    ['a missing operation', { requestId: 'r1', payload: {} }],
    ['a missing payload', { requestId: 'r1', operation: 'mix:generate' }],
  ])('rejects %s', (_label, message) => {
    expect(isAlgorithmWorkerRequest(message)).toBe(false);
  });
});

describe('createWorkerErrorPayload', () => {
  it('keeps name, message and stack of an Error', () => {
    const error = new TypeError('bad seat index');

    const payload = createWorkerErrorPayload(error);

    expect(payload).toMatchObject({
      name: 'TypeError',
      message: 'bad seat index',
    });
    expect(payload.stack).toBeTruthy();
  });

  it('passes a thrown string through as the message', () => {
    expect(createWorkerErrorPayload('plain failure')).toMatchObject({
      message: 'plain failure',
    });
  });

  it('describes an unknown object without leaking unbounded detail', () => {
    const weird = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`k${i}`, i]),
    );

    const payload = createWorkerErrorPayload(weird);

    expect(payload.message).toBe('Unknown worker error');
    expect(Object.keys(payload.details ?? {})).toHaveLength(8);
  });
});

describe('worker message loop', () => {
  type Listener = (event: { data: unknown }) => void;

  let listener: Listener | undefined;
  let posted: unknown[];

  const loadWorker = async () => {
    vi.resetModules();
    posted = [];
    listener = undefined;
    vi.stubGlobal('self', {
      addEventListener: (type: string, handler: Listener) => {
        if (type === 'message') listener = handler;
      },
      postMessage: (message: unknown) => posted.push(message),
    });
    await import('../algorithmWorker');
  };

  const send = async (data: unknown) => {
    listener?.({ data });
    // The handler is async; let its promise chain settle.
    for (let i = 0; i < 10; i++) await Promise.resolve();
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('answers a warmup with a success message', async () => {
    await loadWorker();

    await send({ requestId: 'r1', operation: 'worker:warmup', payload: {} });

    expect(posted).toEqual([
      {
        requestId: 'r1',
        operation: 'worker:warmup',
        status: 'success',
        result: { ready: true },
      },
    ]);
  });

  it('ignores a malformed message instead of answering it', async () => {
    await loadWorker();

    await send({ nonsense: true });

    expect(posted).toEqual([]);
  });

  it('answers an unsupported operation with an error message', async () => {
    await loadWorker();

    await send({ requestId: 'r2', operation: 'mix:teleport', payload: {} });

    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({
      requestId: 'r2',
      status: 'error',
      error: { message: expect.stringContaining('Unsupported operation') },
    });
  });
});
