// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  AlgorithmWorkerOperation,
  AlgorithmWorkerRequestMap,
} from './algorithmWorker.types';

/**
 * Coarse phase of a long-running operation. Sent to the UI as an i18n key —
 * the worker must not produce user-facing text, it does not know the language.
 */
export type AlgorithmProgressStage = 'initializing' | 'analyzing' | 'arranging';

export type ProgressReporter = (
  progress: number,
  stage: AlgorithmProgressStage,
) => void;

const noopProgress: ProgressReporter = () => {};

/**
 * Refinement defaults applied when the caller does not specify otherwise.
 *
 * Simulated Annealing is on by default because it escapes local optima the
 * greedy pass gets stuck in. This lives here, and only here, so worker and
 * main-thread fallback can never disagree about it.
 */
export const DEFAULT_REFINE_OPTIONS = { useAnnealing: true } as const;

const loadSeatingAlgorithmModule = () =>
  import('@/utils/algorithm/seatingAlgorithm');

const loadCircleArrangementModule = () =>
  import('@/utils/algorithm/circleArrangement');

const loadCircleOptimizedModule = () =>
  import('@/utils/algorithm/CircleSeatingAlgorithm');

/**
 * Runs one algorithm operation.
 *
 * This is the single implementation behind both execution paths: the web worker
 * calls it off the main thread, and `algorithmWorkerClient` calls it directly
 * when no worker is available. Keeping one body means the two paths cannot
 * drift apart in defaults or argument order.
 *
 * @param operation - Which algorithm to run
 * @param payload - Operation payload, see `AlgorithmWorkerRequestMap`
 * @param reportProgress - Optional phase callback; ignored by the fallback path
 */
export async function executeAlgorithmOperation<
  T extends AlgorithmWorkerOperation,
>(
  operation: T,
  payload: AlgorithmWorkerRequestMap[T]['payload'],
  reportProgress: ProgressReporter = noopProgress,
): Promise<AlgorithmWorkerRequestMap[T]['result']> {
  type Result = AlgorithmWorkerRequestMap[T]['result'];

  switch (operation) {
    case 'mix:generate': {
      const { generateSeatingPlan } = await loadSeatingAlgorithmModule();
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
      return { seating } as Result;
    }

    case 'mix:refine': {
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
      } = payload as AlgorithmWorkerRequestMap['mix:refine']['payload'];

      const seating = refineSeatingLocal(
        students,
        seatingHistory,
        mixHistory,
        lockedPositions,
        currentSeating,
        mixSettings,
        classroomScene,
        { ...DEFAULT_REFINE_OPTIONS, ...options },
        start ?? undefined,
      );
      return { seating } as Result;
    }

    case 'circle:generate': {
      const { generateCircleLayout } = await loadCircleArrangementModule();
      const { students, classroomScene, currentSeating } =
        payload as AlgorithmWorkerRequestMap['circle:generate']['payload'];

      reportProgress(0.15, 'initializing');
      const layout = generateCircleLayout(
        students,
        classroomScene,
        currentSeating ?? undefined,
      );
      reportProgress(0.65, 'arranging');

      return { layout } as Result;
    }

    case 'circle:optimized': {
      const { generateOptimizedCircleLayout } =
        await loadCircleOptimizedModule();
      const {
        students,
        classroomScene,
        mixSettings,
        seatingHistory,
        currentSeating,
      } = payload as AlgorithmWorkerRequestMap['circle:optimized']['payload'];

      reportProgress(0.1, 'initializing');
      const layout = generateOptimizedCircleLayout(
        students,
        classroomScene,
        mixSettings,
        seatingHistory,
        currentSeating ?? undefined,
      );
      reportProgress(0.45, 'analyzing');
      reportProgress(0.8, 'arranging');

      return { layout } as Result;
    }

    case 'worker:warmup':
      return { ready: true } as Result;

    default:
      throw new Error(`Unsupported operation ${String(operation)}`);
  }
}
