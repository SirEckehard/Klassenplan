// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  AlgorithmWorkerOperation,
  AlgorithmWorkerRequestMap,
  AlgorithmWorkerResponse,
  AlgorithmWorkerSuccessResponse,
  WorkerProgressPayload,
} from '@/workers/algorithmWorker.types';
import { logDebug, logError, logWarn } from '@/utils';

type WorkerResult<T extends AlgorithmWorkerOperation> =
  AlgorithmWorkerRequestMap[T]['result'];

interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  onProgress?: (payload: WorkerProgressPayload) => void;
}

interface InternalRequestOptions extends RequestOptions {
  skipInitialization?: boolean;
}

interface PendingRequest<T extends AlgorithmWorkerOperation> {
  operation: T;
  resolve: (value: WorkerResult<T>) => void;
  reject: (reason: unknown) => void;
  options: RequestOptions;
  timeoutId?: ReturnType<typeof setTimeout>;
  abortHandler?: () => void;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const INITIAL_WARMUP_TIMEOUT_MS = 2_000;
const RETRY_WARMUP_TIMEOUT_MS = 8_000;
const MAX_INIT_RETRIES = 2;
const WORKER_CONTEXT = 'algorithmWorkerClient';

const createRequestId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isWorkerSupported = (): boolean =>
  typeof window !== 'undefined' && 'Worker' in window;

const isValidResponse = (
  data: unknown,
): data is AlgorithmWorkerResponse<AlgorithmWorkerOperation> => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Partial<AlgorithmWorkerResponse>;
  return (
    typeof candidate.requestId === 'string' &&
    typeof candidate.operation === 'string' &&
    typeof candidate.status === 'string'
  );
};

const toWorkerError = (response: AlgorithmWorkerResponse) => {
  if (response.status !== 'error') {
    return null;
  }

  const error = new Error(response.error.message);
  error.name = response.error.name ?? 'AlgorithmWorkerError';
  if (response.error.stack) {
    Object.defineProperty(error, 'stack', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: response.error.stack,
    });
  }
  if (response.error.details) {
    Object.assign(error, { details: response.error.details });
  }
  return error;
};

const toInitializationError = (
  error: unknown,
  fallbackMessage: string,
): Error => {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') {
      return new Error(message);
    }
  }
  return new Error(fallbackMessage);
};

const buildErrorContext = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    };
  }
  if (typeof error === 'string') {
    return { errorMessage: error };
  }
  if (error && typeof error === 'object') {
    const { name, message } = error as { name?: unknown; message?: unknown };
    return {
      errorName: typeof name === 'string' ? name : undefined,
      errorMessage: typeof message === 'string' ? message : undefined,
    };
  }
  return { errorMessage: 'Unknown error' };
};

class AlgorithmWorkerClient {
  private worker: Worker | null = null;
  private readonly pending = new Map<
    string,
    PendingRequest<AlgorithmWorkerOperation>
  >();
  private readonly supported = isWorkerSupported();
  private initPromise: Promise<void> | null = null;
  private initError: Error | null = null;
  private initAttempts = 0;

  // Bind handlers once to avoid re-registering
  private readonly handleMessageBound = (event: MessageEvent) =>
    this.handleMessage(event);
  private readonly handleErrorBound = (event: ErrorEvent) =>
    this.handleWorkerError(event);

  async callOperation<T extends AlgorithmWorkerOperation>(
    operation: T,
    payload: AlgorithmWorkerRequestMap[T]['payload'],
    options: RequestOptions = {},
  ): Promise<WorkerResult<T>> {
    if (operation === 'worker:warmup') {
      return this.dispatch(operation, payload, {
        ...options,
        skipInitialization: true,
      });
    }

    if (!this.supported) {
      logDebug(
        'Web Workers not supported, using inline fallback',
        { operation },
        WORKER_CONTEXT,
      );
      return this.executeFallback(operation, payload);
    }

    try {
      await this.ensureInitialized();
    } catch (error) {
      logWarn(
        'Worker initialization failed, using inline fallback',
        {
          ...buildErrorContext(error),
          operation,
          attempt: this.initAttempts,
        },
        WORKER_CONTEXT,
      );
      return this.executeFallback(operation, payload);
    }

    try {
      return await this.dispatch(operation, payload, options);
    } catch (error) {
      logError(
        'Worker request failed, using inline fallback',
        { error, operation },
        WORKER_CONTEXT,
      );
      return this.executeFallback(operation, payload);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.supported) {
      throw new Error('Web Workers are not supported in this environment');
    }

    if (this.initError && this.initAttempts < MAX_INIT_RETRIES) {
      this.resetInitializationState();
    }

    if (this.initError) {
      throw this.initError;
    }
    if (!this.initPromise) {
      this.initPromise = this.initializeWorker(this.getWarmupTimeout());
    }
    return this.initPromise;
  }

  private getWarmupTimeout(): number {
    return this.initAttempts > 0
      ? RETRY_WARMUP_TIMEOUT_MS
      : INITIAL_WARMUP_TIMEOUT_MS;
  }

  private resetInitializationState(): void {
    this.disposeWorker();
    this.initPromise = null;
    this.initError = null;
  }

  private async initializeWorker(
    warmupTimeoutMs: number = INITIAL_WARMUP_TIMEOUT_MS,
  ): Promise<void> {
    try {
      this.worker = new Worker(
        new URL('./algorithmWorker.ts', import.meta.url),
        {
          type: 'module',
          name: 'algorithm-worker',
        },
      );
      this.worker.addEventListener('message', this.handleMessageBound);
      this.worker.addEventListener('error', this.handleErrorBound);

      await this.dispatch(
        'worker:warmup',
        {} as AlgorithmWorkerRequestMap['worker:warmup']['payload'],
        {
          skipInitialization: true,
          timeoutMs: warmupTimeoutMs,
        },
      );
      this.initAttempts = 0;
      this.initError = null;
      logDebug('Algorithm worker initialized', undefined, WORKER_CONTEXT);
    } catch (error) {
      this.initError = toInitializationError(
        error,
        'Failed to initialize algorithm worker',
      );
      this.initAttempts += 1;
      this.disposeWorker();
      this.initPromise = null;
      throw this.initError;
    }
  }

  private disposeWorker(): void {
    if (this.worker) {
      this.worker.removeEventListener('message', this.handleMessageBound);
      this.worker.removeEventListener('error', this.handleErrorBound);
      this.worker.terminate();
      this.worker = null;
    }
    this.pending.forEach((entry, requestId) => {
      if (entry.timeoutId) {
        clearTimeout(entry.timeoutId);
      }
      if (entry.abortHandler && entry.options.signal) {
        entry.options.signal.removeEventListener('abort', entry.abortHandler);
      }
      entry.reject(
        new Error('Worker terminated before completing the request'),
      );
      this.pending.delete(requestId);
    });
  }

  private async dispatch<T extends AlgorithmWorkerOperation>(
    operation: T,
    payload: AlgorithmWorkerRequestMap[T]['payload'],
    options: InternalRequestOptions = {},
  ): Promise<WorkerResult<T>> {
    if (this.worker === null && !options.skipInitialization) {
      await this.ensureInitialized();
    }

    if (this.worker === null) {
      throw new Error('Worker is not available');
    }

    const requestId = createRequestId();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    return new Promise<WorkerResult<T>>((resolve, reject) => {
      if (options.signal?.aborted) {
        reject(new DOMException('The request was aborted', 'AbortError'));
        return;
      }

      const timeoutId = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('Worker request timed out'));
      }, timeoutMs);

      const abortHandler = () => {
        if (options.signal) {
          options.signal.removeEventListener('abort', abortHandler);
        }
        clearTimeout(timeoutId);
        this.pending.delete(requestId);
        reject(new DOMException('The request was aborted', 'AbortError'));
      };

      if (options.signal) {
        options.signal.addEventListener('abort', abortHandler);
      }

      this.pending.set(requestId, {
        operation,
        resolve,
        reject,
        options,
        timeoutId,
        abortHandler: options.signal ? abortHandler : undefined,
      });

      this.worker!.postMessage({
        requestId,
        operation,
        payload,
      });
    });
  }

  private handleMessage(event: MessageEvent): void {
    if (!isValidResponse(event.data)) {
      return;
    }
    const response = event.data as AlgorithmWorkerResponse;
    const pending = this.pending.get(response.requestId);
    if (!pending) {
      logWarn(
        'Received response for unknown request',
        { requestId: response.requestId, operation: response.operation },
        WORKER_CONTEXT,
      );
      return;
    }

    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
    }
    if (pending.abortHandler && pending.options.signal) {
      pending.options.signal.removeEventListener('abort', pending.abortHandler);
    }

    if (response.status === 'progress') {
      if (pending.options.onProgress) {
        pending.options.onProgress(response.progress);
      }
      // Keep request pending for future updates
      this.pending.set(response.requestId, pending);
      return;
    }

    this.pending.delete(response.requestId);

    if (response.status === 'success') {
      if (response.operation !== pending.operation) {
        pending.reject(
          new Error('Worker response operation mismatch for pending request'),
        );
        return;
      }
      const successResponse = response as AlgorithmWorkerSuccessResponse<
        typeof pending.operation
      >;
      pending.resolve(successResponse.result);
      return;
    }

    const error = toWorkerError(response) ?? new Error('Worker error');
    pending.reject(error);
  }

  private handleWorkerError(event: ErrorEvent): void {
    logError(
      'Algorithm worker encountered a runtime error',
      {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
      },
      WORKER_CONTEXT,
    );
    this.initError = toInitializationError(
      event.error ?? event.message,
      'Algorithm worker encountered a runtime error',
    );
    this.initAttempts += 1;
    this.initPromise = null;
    this.disposeWorker();
  }

  private async executeFallback<T extends AlgorithmWorkerOperation>(
    operation: T,
    payload: AlgorithmWorkerRequestMap[T]['payload'],
  ): Promise<WorkerResult<T>> {
    switch (operation) {
      case 'mix:generate': {
        const { generateSeatingPlan } =
          await import('@/utils/algorithm/seatingAlgorithm');
        const {
          students,
          seatingHistory,
          mixHistory,
          lockedPositions,
          classroomScene,
          mixSettings,
          lastSeating,
        } = payload as AlgorithmWorkerRequestMap['mix:generate']['payload'];
        const seating = generateSeatingPlan(
          students,
          seatingHistory,
          mixHistory,
          lockedPositions,
          mixSettings,
          classroomScene,
          lastSeating ?? undefined,
        );
        return { seating } as WorkerResult<T>;
      }
      case 'mix:refine': {
        const { refineSeatingLocal } =
          await import('@/utils/algorithm/seatingAlgorithm');
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
        } = payload as AlgorithmWorkerRequestMap['mix:refine']['payload'];
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
        return { seating } as WorkerResult<T>;
      }
      case 'circle:generate': {
        const { generateCircleLayout } =
          await import('@/utils/algorithm/circleArrangement');
        const { students, classroomScene, currentSeating } =
          payload as AlgorithmWorkerRequestMap['circle:generate']['payload'];
        const layout = generateCircleLayout(
          students,
          classroomScene,
          currentSeating ?? undefined,
        );
        return { layout } as WorkerResult<T>;
      }
      case 'circle:optimized': {
        const { generateOptimizedCircleLayout } =
          await import('@/utils/algorithm/CircleSeatingAlgorithm');
        const {
          students,
          classroomScene,
          mixSettings,
          seatingHistory,
          currentSeating,
        } = payload as AlgorithmWorkerRequestMap['circle:optimized']['payload'];
        const layout = generateOptimizedCircleLayout(
          students,
          classroomScene,
          mixSettings,
          seatingHistory,
          currentSeating ?? undefined,
        );
        return { layout } as WorkerResult<T>;
      }
      case 'worker:warmup':
        return { ready: true } as WorkerResult<T>;
      default:
        throw new Error(`Unsupported operation ${operation}`);
    }
  }
}

export const algorithmWorkerClient = new AlgorithmWorkerClient();

export type { RequestOptions as AlgorithmWorkerRequestOptions };
