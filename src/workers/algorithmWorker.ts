// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/// <reference lib="webworker" />
import {
  createWorkerErrorPayload,
  isAlgorithmWorkerRequest,
  type AlgorithmWorkerRequest,
  type AlgorithmWorkerResponse,
  type AlgorithmWorkerOperation,
} from './algorithmWorker.types';
import { logDebug, logError, logWarn } from '@/utils';

declare const self: DedicatedWorkerGlobalScope;

type ResponseMessage = AlgorithmWorkerResponse;

const postWorkerMessage = (message: ResponseMessage) => {
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
    'algorithmWorker',
  );
  postWorkerMessage({
    requestId: request.requestId,
    operation: request.operation,
    status: 'error',
    error: payload,
  });
};

const reportProgress = (
  request: AlgorithmWorkerRequest,
  progress: number,
  stage: string,
  message: string,
) => {
  postWorkerMessage({
    requestId: request.requestId,
    operation: request.operation,
    status: 'progress',
    progress: {
      progress,
      stage,
      message,
    },
  });
};

const handleWarmup = (request: AlgorithmWorkerRequest<'worker:warmup'>) => {
  logDebug(
    'Worker warmup acknowledged',
    { requestId: request.requestId },
    'algorithmWorker',
  );
  postWorkerMessage({
    requestId: request.requestId,
    operation: request.operation,
    status: 'success',
    result: { ready: true },
  });
};

const loadSeatingAlgorithmModule = () =>
  import('@/utils/algorithm/seatingAlgorithm');

const loadCircleArrangementModule = () =>
  import('@/utils/algorithm/circleArrangement');

const loadCircleOptimizedModule = () =>
  import('@/utils/algorithm/CircleSeatingAlgorithm');

const handleMixGenerate = async (
  request: AlgorithmWorkerRequest<'mix:generate'>,
) => {
  const { generateSeatingPlan } = await loadSeatingAlgorithmModule();
  const {
    students,
    seatingHistory,
    mixHistory,
    lockedPositions,
    classroomScene,
    mixSettings,
    lastSeating,
  } = request.payload;

  const seating = generateSeatingPlan(
    students,
    seatingHistory,
    mixHistory,
    lockedPositions,
    mixSettings,
    classroomScene,
    lastSeating ?? undefined,
  );

  postWorkerMessage({
    requestId: request.requestId,
    operation: request.operation,
    status: 'success',
    result: { seating },
  });
};

const handleMixRefine = async (
  request: AlgorithmWorkerRequest<'mix:refine'>,
) => {
  const { refineSeatingLocal } = await loadSeatingAlgorithmModule();
  const {
    students,
    seatingHistory,
    mixHistory,
    lockedPositions,
    classroomScene,
    currentSeating,
    mixSettings,
    options,
    start,
  } = request.payload;

  const seating = refineSeatingLocal(
    students,
    seatingHistory,
    mixHistory,
    lockedPositions,
    currentSeating,
    mixSettings,
    classroomScene,
    // MT-1: Enable Simulated Annealing by default for better optimization
    { useAnnealing: true, ...options },
    start ?? undefined,
  );

  postWorkerMessage({
    requestId: request.requestId,
    operation: request.operation,
    status: 'success',
    result: { seating },
  });
};

const handleCircleGenerate = async (
  request: AlgorithmWorkerRequest<'circle:generate'>,
) => {
  const { generateCircleLayout } = await loadCircleArrangementModule();
  const { students, classroomScene, currentSeating } = request.payload;
  reportProgress(
    request,
    0.15,
    'initializing',
    'Sitzkreis wird vorbereitet...',
  );

  const layout = generateCircleLayout(
    students,
    classroomScene,
    currentSeating ?? undefined,
  );

  reportProgress(
    request,
    0.65,
    'arranging',
    'Schüler:innen werden angeordnet...',
  );

  postWorkerMessage({
    requestId: request.requestId,
    operation: request.operation,
    status: 'success',
    result: { layout },
  });
};

const handleCircleOptimized = async (
  request: AlgorithmWorkerRequest<'circle:optimized'>,
) => {
  const { generateOptimizedCircleLayout } = await loadCircleOptimizedModule();
  const {
    students,
    classroomScene,
    mixSettings,
    seatingHistory,
    currentSeating,
  } = request.payload;
  reportProgress(request, 0.1, 'initializing', 'Sitzkreis wird vorbereitet...');

  const layout = generateOptimizedCircleLayout(
    students,
    classroomScene,
    mixSettings,
    seatingHistory,
    currentSeating ?? undefined,
  );

  reportProgress(
    request,
    0.45,
    'analyzing',
    'Originaler Sitzplan wird analysiert...',
  );
  reportProgress(
    request,
    0.8,
    'arranging',
    'Schüler:innen werden angeordnet...',
  );

  postWorkerMessage({
    requestId: request.requestId,
    operation: request.operation,
    status: 'success',
    result: { layout },
  });
};

type OperationHandler<T extends AlgorithmWorkerOperation> = (
  request: AlgorithmWorkerRequest<T>,
) => void | Promise<void>;

const operationHandlers: {
  [K in AlgorithmWorkerOperation]: OperationHandler<K>;
} = {
  'worker:warmup': handleWarmup,
  'mix:generate': handleMixGenerate,
  'mix:refine': handleMixRefine,
  'circle:generate': handleCircleGenerate,
  'circle:optimized': handleCircleOptimized,
};

self.addEventListener('message', (event: MessageEvent) => {
  const data = event.data;

  if (!isAlgorithmWorkerRequest(data)) {
    logWarn('Ignored unknown message payload', { data }, 'algorithmWorker');
    return;
  }

  const handler = operationHandlers[data.operation] as OperationHandler<
    typeof data.operation
  >;
  if (!handler) {
    logWarn(
      'No handler registered for worker operation',
      { operation: data.operation },
      'algorithmWorker',
    );
    respondWithError(data, new Error('Unsupported worker operation'));
    return;
  }

  try {
    const result = handler(
      data as AlgorithmWorkerRequest<typeof data.operation>,
    );
    if (result instanceof Promise) {
      result.catch((error) => respondWithError(data, error));
    }
  } catch (error) {
    respondWithError(data, error);
  }
});
