// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Logging wrapper around prefetch work.
 *
 * It used to keep a 40-entry telemetry ring and expose a start/complete/fail/
 * cancel lifecycle, all of which existed for the performance dashboard. Nothing
 * ever read the ring, and the three callers — `routePreloader`,
 * `generatorPrefetch` and `prefetchHints` — only ever used `trackJob` and
 * `recordHint`. What is left is those two.
 */
import { logDebug, logError } from '@/utils';

const PREFETCH_CONTEXT = 'prefetchOrchestrator';

const getTimestamp = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

export type PrefetchJobType = 'route' | 'generator-step' | 'asset';
export type PrefetchTrigger = 'auto' | 'hover' | 'navigation' | 'warmup';

export interface PrefetchJobDescriptor {
  type: PrefetchJobType;
  target: string;
  trigger?: PrefetchTrigger;
}

class PrefetchOrchestrator {
  /**
   * Runs a prefetch task and logs how it went. Failures are logged and
   * rethrown — the caller decides whether a missed prefetch matters.
   */
  async trackJob<T>(
    descriptor: PrefetchJobDescriptor,
    task: () => Promise<T>,
  ): Promise<T> {
    const startedAt = getTimestamp();
    const context = {
      type: descriptor.type,
      target: descriptor.target,
      trigger: descriptor.trigger ?? 'auto',
    };

    try {
      const result = await task();
      logDebug(
        'Prefetch job completed',
        { ...context, durationMs: Math.round(getTimestamp() - startedAt) },
        PREFETCH_CONTEXT,
      );
      return result;
    } catch (error) {
      logError(
        'Prefetch job failed',
        {
          ...context,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        PREFETCH_CONTEXT,
      );
      throw error;
    }
  }

  recordHint(target: string, importance: string = 'low'): void {
    logDebug(
      'Prefetch hint registered',
      { target, importance },
      PREFETCH_CONTEXT,
    );
  }
}

export const prefetchOrchestrator = new PrefetchOrchestrator();
