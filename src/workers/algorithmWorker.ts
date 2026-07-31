// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/// <reference lib="webworker" />
import {
  createWorkerErrorPayload,
  isAlgorithmWorkerRequest,
  type AlgorithmWorkerRequest,
  type AlgorithmWorkerResponse,
} from './algorithmWorker.types';
import {
  executeAlgorithmOperation,
  type AlgorithmProgressStage,
} from './algorithmOperations';
import { logDebug, logError, logWarn } from '@/utils';

declare const self: DedicatedWorkerGlobalScope;

const WORKER_CONTEXT = 'algorithmWorker';

const postWorkerMessage = (message: AlgorithmWorkerResponse) => {
  self.postMessage(message);
};

const respondWithError = (
  request: AlgorithmWorkerRequest,
  error: unknown,
): void => {
  const payload = createWorkerErrorPayload(error);
  logError(
    'Algorithm worker request failed',
    { error: payload, operation: request.operation },
    WORKER_CONTEXT,
  );
  postWorkerMessage({
    requestId: request.requestId,
    operation: request.operation,
    status: 'error',
    error: payload,
  });
};

const createProgressReporter =
  (request: AlgorithmWorkerRequest) =>
  (progress: number, stage: AlgorithmProgressStage) => {
    postWorkerMessage({
      requestId: request.requestId,
      operation: request.operation,
      status: 'progress',
      progress: { progress, stage },
    });
  };

/**
 * Message loop of the algorithm worker.
 *
 * The worker owns only the messaging protocol — request validation, progress
 * relaying and error shaping. The algorithms themselves live in
 * `algorithmOperations`, shared with the main-thread fallback.
 */
self.addEventListener('message', (event: MessageEvent) => {
  const data = event.data;

  if (!isAlgorithmWorkerRequest(data)) {
    logWarn('Ignored unknown message payload', { data }, WORKER_CONTEXT);
    return;
  }

  if (data.operation === 'worker:warmup') {
    logDebug(
      'Worker warmup acknowledged',
      { requestId: data.requestId },
      WORKER_CONTEXT,
    );
  }

  executeAlgorithmOperation(
    data.operation,
    data.payload,
    createProgressReporter(data),
  )
    .then((result) => {
      postWorkerMessage({
        requestId: data.requestId,
        operation: data.operation,
        status: 'success',
        result,
      });
    })
    .catch((error: unknown) => respondWithError(data, error));
});
