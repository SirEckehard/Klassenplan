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

/** Smallest advance that is worth a message across the worker boundary. */
const PROGRESS_REPORT_STEP = 0.02;

/**
 * Wrap a reporter so it only fires on a meaningful advance.
 *
 * Simulated Annealing cools in a couple of hundred steps; posting every one of
 * them would put more traffic on the message channel than the UI can use.
 */
const throttleFraction = (
  report: (fraction: number) => void,
): ((fraction: number) => void) => {
  let lastReported = 0;
  return (fraction) => {
    if (fraction < 1 && fraction - lastReported < PROGRESS_REPORT_STEP) {
      return;
    }
    lastReported = fraction;
    report(fraction);
  };
};

const loadSeatingAlgorithmModule = () =>
  import('@/utils/algorithm/seatingAlgorithm');

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
    case 'mix:run': {
      reportProgress(0.05, 'initializing');
      const { runMixSession } = await loadSeatingAlgorithmModule();
      const {
        students,
        seatingHistory,
        mixHistory,
        planUsage,
        planUsageSince,
        planUsageManual,
        lockedPositions,
        classroomScene,
        mixSettings,
        lastSeating,
        refine,
      } = payload as AlgorithmWorkerRequestMap['mix:run']['payload'];

      // The construction is a single greedy pass with no inner loop to
      // sample, so it stays a stage marker; the refinement after it reports
      // its own fraction of the rest.
      reportProgress(0.1, 'arranging');
      const seating = runMixSession(
        students,
        seatingHistory,
        mixHistory,
        lockedPositions,
        mixSettings,
        classroomScene,
        lastSeating ?? undefined,
        {
          planUsage,
          planUsageSince,
          planUsageManual,
          refine: Boolean(refine),
          // Injected here, not carried in the payload: a callback cannot be
          // structured-cloned into the worker.
          onProgress: throttleFraction((fraction) =>
            reportProgress(0.1 + fraction * 0.9, 'arranging'),
          ),
        },
      );
      reportProgress(1, 'arranging');
      return { seating } as Result;
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
