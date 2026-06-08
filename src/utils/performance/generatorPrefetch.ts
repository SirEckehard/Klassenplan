// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { logDebug, logError } from '@/utils';
import { ensurePrefetchHints } from '@/utils/performance/prefetchHints';
import { scheduleIdleTask } from '@/utils/performance/idleTasks';
import { prefetchOrchestrator } from '@/utils/performance/prefetchOrchestrator';

const GENERATOR_STEP_QUERY = (step: number): string => {
  const base =
    typeof import.meta.env.BASE_URL === 'string'
      ? import.meta.env.BASE_URL
      : '/';

  const normalizedBase = base.endsWith('/') ? base : `${base}/`;

  return `${normalizedBase}generator?step=${step}`;
};

const generatorStepHints = new Map<number, ReadonlyArray<string>>([
  [1, [GENERATOR_STEP_QUERY(2), GENERATOR_STEP_QUERY(3)]],
  [2, [GENERATOR_STEP_QUERY(3)]],
  [3, []],
]);

type PrefetchTrigger = 'hover' | 'auto';

type ModuleLoader = () => Promise<unknown>;

const stepModuleLoaders: Record<number, ReadonlyArray<ModuleLoader>> = {
  1: [
    () => import('@/components/StudentInput'),
    () => import('@/components/SeatingPlanGenerator/EnhancedSeatingPlanView'),
  ],
  2: [
    () => import('@/components/SeatingPlanGenerator/EnhancedSeatingPlanView'),
  ],
  3: [
    () => import('@/components/circle/SimpleCircleView'),
    () => import('@/components/circle/CircleControlBar'),
  ],
};

const prefetchedSteps = new Set<number>();

export const prefetchGeneratorStep = async (
  step: number,
  trigger: PrefetchTrigger = 'auto',
): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  if (prefetchedSteps.has(step)) {
    return;
  }

  const loaders = stepModuleLoaders[step];

  if (!loaders?.length) {
    logDebug(
      'No generator modules registered for prefetch',
      { step, trigger },
      'generatorPrefetch',
    );
    return;
  }

  try {
    await prefetchOrchestrator.trackJob(
      { type: 'generator-step', target: `step-${step}`, trigger },
      async () => {
        await Promise.all(loaders.map((loader) => loader()));
      },
    );
    prefetchedSteps.add(step);

    logDebug(
      'Prefetched generator modules',
      { step, trigger },
      'generatorPrefetch',
    );
  } catch (error) {
    logError(
      'Failed to prefetch generator modules',
      { step, trigger, error },
      'generatorPrefetch',
    );
  }
};

export const prefetchGeneratorSteps = (currentStep: number): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const nextHints = generatorStepHints.get(currentStep);

  if (nextHints?.length) {
    ensurePrefetchHints(
      nextHints.map((href) => ({
        href,
        options: { as: 'document', importance: 'low' },
      })),
    );
  }

  const nextSteps =
    currentStep === 1
      ? [2, 3]
      : currentStep === 2
        ? [3]
        : currentStep === 3
          ? []
          : [];

  nextSteps.forEach((step) => {
    scheduleIdleTask(() => {
      void prefetchGeneratorStep(step);
    });
  });
};
