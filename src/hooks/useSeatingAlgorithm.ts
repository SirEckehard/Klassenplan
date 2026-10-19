// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * @internal
 * Internal hook used by useSeatingGenerator. Do not import directly.
 * Use SeatingPlanGeneratorProvider context hooks instead.
 */
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type {
  MixSettings,
  ClassroomScene,
  SeatingArrangement,
  MixResult,
  PlanUsage,
} from '@/types';
import type { SeatingState } from './useSeatingState';
import { calculateCurrentStatistics } from './useSeatingStatisticsUpdater';
import {
  DEFAULT_MIX_WEIGHTS,
  DEFAULT_NEIGHBOR_WEIGHTS,
  hasActiveWeights,
  mergeNeighborWeights,
  normalizeMixSettings,
} from '@/utils';
import { algorithmWorkerClient } from '@/workers/algorithmWorkerClient';
import type { WorkerProgressPayload } from '@/workers/algorithmWorker.types';

/**
 * Cross-cutting controls for one algorithm run.
 *
 * Kept out of the algorithm settings on purpose: these say how the caller wants
 * to observe and interrupt the run, not what the result should look like.
 */
export interface AlgorithmRunOptions {
  /** Aborts the worker request; the promise rejects with an `AbortError`. */
  signal?: AbortSignal;
  /** Coarse stage plus a 0..1 fraction, forwarded from the worker. */
  onProgress?: (payload: WorkerProgressPayload) => void;
}

/**
 * A run that outlived its class or room: another one opened while the worker
 * was busy. Its arrangement was made for the tables and students it started
 * with, so it is dropped the way an aborted run's is — writing it would put
 * it into the plan and the mix history of what is open now.
 */
type OpenScope = { classId: string | null; roomId: string | null };
const isSameScope = (a: OpenScope, b: OpenScope) =>
  a.classId === b.classId && a.roomId === b.roomId;

const scopeChangedError = () =>
  new DOMException('Another class or room opened during the run', 'AbortError');

/**
 * Provides "Mischen": one mix session in the worker (decision 0027).
 * @param state Shared seating state
 * @param planUsage Records of plans that were really in use; see `buildPreviousPairs`
 * @param planUsageSince When the neighbourhoods were last reset, if ever
 * @param planUsageManual Whether the class marks its plans by hand
 * @returns The function that mixes a plan
 */
export function useSeatingAlgorithm(
  state: SeatingState,
  planUsage: PlanUsage[] = [],
  planUsageSince: string | null = null,
  planUsageManual = false,
) {
  const {
    studentState: { students },
    historyState: { seatingHistory, addMixResult },
    algorithmState: { lockedPositions, setLastStatistics },
    planState: { setCurrentSeating },
    roomState: { activeRoomId },
    classState: { activeClass },
  } = state;

  // What is open, read when a run ends — current by then: a class or room
  // switch commits in `flushSync`, and layout effects run inside that commit.
  const openScopeRef = useRef<OpenScope>({
    classId: activeClass.id,
    roomId: activeRoomId,
  });
  useLayoutEffect(() => {
    openScopeRef.current = { classId: activeClass.id, roomId: activeRoomId };
  }, [activeClass.id, activeRoomId]);

  // Held in refs: the records change on signals raised from other routes, and
  // that must not rebuild the algorithm callbacks. Updated in effects to avoid
  // writing during render.
  const planUsageRef = useRef(planUsage);
  const planUsageSinceRef = useRef(planUsageSince);
  const planUsageManualRef = useRef(planUsageManual);

  useEffect(() => {
    planUsageRef.current = planUsage;
  }, [planUsage]);

  useEffect(() => {
    planUsageSinceRef.current = planUsageSince;
  }, [planUsageSince]);

  useEffect(() => {
    planUsageManualRef.current = planUsageManual;
  }, [planUsageManual]);

  /**
   * Mixes the plan: the construction and — while a criterion carries weight —
   * its refinement run as one session in the worker, which avoids the pairs
   * of the plans in use, never those of an earlier mix (decision 0032). The
   * mix history gains the arrangement the session settled on, which is the
   * one on screen (decision 0014).
   */
  const generateSeatingPlan = useCallback(
    (
      settings: Partial<MixSettings>,
      scene: ClassroomScene,
      run?: AlgorithmRunOptions,
    ): Promise<SeatingArrangement> => {
      const normalizedSettings: Partial<MixSettings> = {
        ...settings,
        neighborWeights: mergeNeighborWeights(
          settings.neighborWeights,
          DEFAULT_NEIGHBOR_WEIGHTS,
        ),
      };

      const refine = hasActiveWeights(normalizedSettings);

      const scope = openScopeRef.current;
      return algorithmWorkerClient
        .callOperation(
          'mix:run',
          {
            students,
            seatingHistory,
            planUsage: planUsageRef.current,
            planUsageSince: planUsageSinceRef.current,
            planUsageManual: planUsageManualRef.current,
            lockedPositions,
            classroomScene: scene,
            mixSettings: normalizedSettings,
            refine,
          },
          { signal: run?.signal, onProgress: run?.onProgress },
        )
        .then(({ seating: arrangement }) => {
          if (!isSameScope(openScopeRef.current, scope)) {
            throw scopeChangedError();
          }
          const persistedSettings = normalizeMixSettings(
            normalizedSettings,
            DEFAULT_MIX_WEIGHTS,
          );

          setCurrentSeating(arrangement);
          const result: MixResult = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            seating: arrangement,
            mixSettings: persistedSettings,
            // The room the mix was made for (decision 0024).
            ...(scope.roomId && { roomId: scope.roomId }),
          };
          addMixResult(result);

          const topCriteria = calculateCurrentStatistics(
            arrangement,
            students,
            normalizedSettings,
            seatingHistory,
            scene,
            {
              planUsage: planUsageRef.current,
              planUsageSince: planUsageSinceRef.current,
              planUsageManual: planUsageManualRef.current,
            },
          );
          setLastStatistics(topCriteria);

          return arrangement;
        });
    },
    [
      students,
      seatingHistory,
      lockedPositions,
      setCurrentSeating,
      addMixResult,
      setLastStatistics,
    ],
  );

  return { generateSeatingPlan };
}
