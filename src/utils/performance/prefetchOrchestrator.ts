import { logDebug, logError, logInfo } from '@/utils';

const PREFETCH_CONTEXT = 'prefetchOrchestrator';
const TELEMETRY_LIMIT = 40;

const createJobId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getTimestamp = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

export type PrefetchJobType = 'route' | 'generator-step' | 'asset';
export type PrefetchTrigger = 'auto' | 'hover' | 'navigation' | 'warmup';

export type PrefetchTelemetryEvent = {
  id: string;
  type: PrefetchJobType;
  target: string;
  trigger: PrefetchTrigger;
  status: 'completed' | 'failed' | 'cancelled';
  durationMs: number;
  timestamp: number;
  error?: string;
};

type PrefetchJobRecord = {
  id: string;
  type: PrefetchJobType;
  target: string;
  trigger: PrefetchTrigger;
  startedAt: number;
};

export interface PrefetchJobDescriptor {
  type: PrefetchJobType;
  target: string;
  trigger?: PrefetchTrigger;
}

export class PrefetchOrchestrator {
  private activeJobs = new Map<string, PrefetchJobRecord>();
  private telemetry: PrefetchTelemetryEvent[] = [];

  startJob(descriptor: PrefetchJobDescriptor): string {
    const id = createJobId();
    const record: PrefetchJobRecord = {
      id,
      type: descriptor.type,
      target: descriptor.target,
      trigger: descriptor.trigger ?? 'auto',
      startedAt: getTimestamp(),
    };
    this.activeJobs.set(id, record);
    logDebug(
      'Prefetch job started',
      {
        id,
        type: record.type,
        target: record.target,
        trigger: record.trigger,
      },
      PREFETCH_CONTEXT,
    );
    return id;
  }

  completeJob(id: string): void {
    const record = this.activeJobs.get(id);
    if (!record) {
      return;
    }
    this.storeTelemetry(record, 'completed');
    this.activeJobs.delete(id);
  }

  failJob(id: string, error: unknown): void {
    const record = this.activeJobs.get(id);
    if (!record) {
      return;
    }
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown prefetch error';
    this.storeTelemetry(record, 'failed', errorMessage);
    this.activeJobs.delete(id);
    logError(
      'Prefetch job failed',
      {
        id,
        type: record.type,
        target: record.target,
        error: errorMessage,
      },
      PREFETCH_CONTEXT,
    );
  }

  cancelJob(id: string): void {
    const record = this.activeJobs.get(id);
    if (!record) {
      return;
    }
    this.storeTelemetry(record, 'cancelled');
    this.activeJobs.delete(id);
    logDebug(
      'Prefetch job cancelled',
      { id, type: record.type, target: record.target },
      PREFETCH_CONTEXT,
    );
  }

  async trackJob<T>(
    descriptor: PrefetchJobDescriptor,
    task: () => Promise<T>,
  ): Promise<T> {
    const id = this.startJob(descriptor);
    try {
      const result = await task();
      this.completeJob(id);
      return result;
    } catch (error) {
      this.failJob(id, error);
      throw error;
    }
  }

  recordHint(target: string, importance: string = 'low'): void {
    logInfo(
      'Prefetch hint registered',
      { target, importance },
      PREFETCH_CONTEXT,
    );
  }

  getTelemetrySnapshot(): PrefetchTelemetryEvent[] {
    return [...this.telemetry];
  }

  private storeTelemetry(
    record: PrefetchJobRecord,
    status: PrefetchTelemetryEvent['status'],
    error?: string,
  ): void {
    const durationMs = getTimestamp() - record.startedAt;
    const entry: PrefetchTelemetryEvent = {
      id: record.id,
      type: record.type,
      target: record.target,
      trigger: record.trigger,
      status,
      durationMs,
      timestamp: Date.now(),
      error,
    };
    this.telemetry.push(entry);
    if (this.telemetry.length > TELEMETRY_LIMIT) {
      this.telemetry.shift();
    }
    if (status === 'completed') {
      logDebug(
        'Prefetch job completed',
        {
          id: record.id,
          target: record.target,
          durationMs: Math.round(durationMs),
        },
        PREFETCH_CONTEXT,
      );
    }
  }
}

export const prefetchOrchestrator = new PrefetchOrchestrator();
