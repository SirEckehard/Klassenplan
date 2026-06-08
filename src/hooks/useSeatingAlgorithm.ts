/**
 * @internal
 * Internal hook used by useSeatingGenerator. Do not import directly.
 * Use SeatingPlanGeneratorProvider context hooks instead.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  MixSettings,
  ClassroomScene,
  SeatingArrangement,
  MixResult,
} from '@/types';
import type { SeatingState } from './useSeatingState';
import { calculateCurrentStatistics } from './useSeatingStatisticsUpdater';
import {
  logDebug,
  DEFAULT_MIX_WEIGHTS,
  DEFAULT_NEIGHBOR_WEIGHTS,
  MIX_HISTORY_LIMIT,
  mergeNeighborWeights,
  normalizeMixSettings,
} from '@/utils';
import { algorithmWorkerClient } from '@/workers/algorithmWorkerClient';

/**
 * Provide algorithms to generate and refine seating arrangements.
 * @param state Shared seating state
 * @returns Functions for generating and refining plans
 */
export function useSeatingAlgorithm(state: SeatingState) {
  const {
    studentState: { students },
    historyState: { seatingHistory, mixHistory, addMixResult },
    algorithmState: { lockedPositions, setLastStatistics },
    planState: { currentSeating, setCurrentSeating },
  } = state;

  const mixHistoryRef = useRef(mixHistory);
  const recentSeatingRef = useRef<SeatingArrangement | null>(
    currentSeating.length > 0 ? currentSeating : null,
  );

  // Update refs in effect to avoid writing during render
  useEffect(() => {
    mixHistoryRef.current = mixHistory;
  }, [mixHistory]);

  useEffect(() => {
    recentSeatingRef.current =
      currentSeating.length > 0 ? currentSeating : null;
  }, [currentSeating]);

  // Note: studentById and lockedPositionIds could be used for further optimizations
  // in the seating algorithm utils, but are currently prepared for future use

  // Cache for algorithm results to avoid repeated calculations
  const algorithmCache = useMemo(
    () => new Map<string, SeatingArrangement>(),
    [],
  );

  const lockedCount = useMemo(
    () => Object.keys(lockedPositions).length,
    [lockedPositions],
  );

  const lockedSignature = useMemo(() => {
    const entries = Object.entries(lockedPositions).map(
      ([studentId, position]) =>
        `${studentId}:${position.table}:${position.seat}`,
    );
    entries.sort();
    return entries.join('|');
  }, [lockedPositions]);

  // Create cache key for algorithm parameters
  const createCacheKey = useCallback(
    (
      settings: Partial<MixSettings>,
      scene: ClassroomScene,
      studentIds: string[],
      historyLength: number,
      mixHistoryLength: number,
      mixSignature: number[],
      forceNew = false,
    ): string => {
      return JSON.stringify({
        settings,
        tables: scene.tables.map((t) => ({
          x: t.x,
          y: t.y,
          width: t.width,
          height: t.height,
          seatCount: t.seatCount,
          rotation: t.rotation,
        })),
        studentIds: studentIds.sort(),
        historyLength,
        mixHistoryLength,
        mixSignature,
        lockedCount,
        lockedSignature,
        // Add timestamp for fresh generation requests
        timestamp: forceNew ? Date.now() : undefined,
      });
    },
    [lockedCount, lockedSignature],
  );

  const generateSeatingPlan = useCallback(
    (
      settings: Partial<MixSettings>,
      scene: ClassroomScene,
      forceNew = true, // Default to force new for actual generation
    ): Promise<SeatingArrangement> => {
      const normalizedSettings: Partial<MixSettings> = {
        ...settings,
        neighborWeights: mergeNeighborWeights(
          settings.neighborWeights,
          DEFAULT_NEIGHBOR_WEIGHTS,
        ),
      };

      // Check cache first only if not forcing new generation
      const historyForPairs = mixHistoryRef.current;
      const lastSeating = recentSeatingRef.current ?? undefined;
      const mixSignature = historyForPairs.slice(-3).map((mix) => mix.id);

      const cacheKey = createCacheKey(
        normalizedSettings,
        scene,
        students.map((s) => s.id),
        seatingHistory.length,
        historyForPairs.length,
        mixSignature,
        forceNew,
      );

      if (!forceNew) {
        const cached = algorithmCache.get(cacheKey);
        if (cached) {
          logDebug(
            'Using cached seating arrangement',
            { cacheKey },
            'useSeatingAlgorithm',
          );
          setCurrentSeating(cached);
          return Promise.resolve(cached);
        }
      }

      return algorithmWorkerClient
        .callOperation('mix:generate', {
          students,
          seatingHistory,
          mixHistory: historyForPairs,
          lockedPositions,
          classroomScene: scene,
          mixSettings: normalizedSettings,
          lastSeating: lastSeating ?? null,
          forceNew,
        })
        .then(({ seating: arrangement }) => {
          // Cache the result only for non-forced generations
          if (!forceNew) {
            algorithmCache.set(cacheKey, arrangement);
            // Limit cache size to prevent memory issues
            if (algorithmCache.size > 50) {
              const firstKey = algorithmCache.keys().next().value;
              if (firstKey) {
                algorithmCache.delete(firstKey);
              }
            }
          }

          const persistedSettings = normalizeMixSettings(
            normalizedSettings,
            DEFAULT_MIX_WEIGHTS,
          );

          setCurrentSeating(arrangement);
          recentSeatingRef.current = arrangement;
          const result: MixResult = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            seating: arrangement,
            mixSettings: persistedSettings,
          };
          const updatedMixHistory = [...historyForPairs, result];
          mixHistoryRef.current =
            updatedMixHistory.length > MIX_HISTORY_LIMIT
              ? updatedMixHistory.slice(-MIX_HISTORY_LIMIT)
              : updatedMixHistory;
          addMixResult(result);

          // Calculate statistics using shared utility
          const topCriteria = calculateCurrentStatistics(
            arrangement,
            students,
            normalizedSettings,
            seatingHistory,
            scene,
            historyForPairs,
          );
          setLastStatistics(topCriteria);

          return arrangement;
        });
    },
    [
      createCacheKey,
      algorithmCache,
      students,
      seatingHistory,
      lockedPositions,
      setCurrentSeating,
      addMixResult,
      setLastStatistics,
    ],
  );

  const refineSeatingLocal = useCallback(
    (
      settings: Partial<MixSettings>,
      scene: ClassroomScene,
      options?: { triesPerPass?: number; passes?: number },
      start?: SeatingArrangement,
    ): Promise<SeatingArrangement> => {
      const normalizedSettings: Partial<MixSettings> = {
        ...settings,
        neighborWeights: mergeNeighborWeights(
          settings.neighborWeights,
          DEFAULT_NEIGHBOR_WEIGHTS,
        ),
      };

      return algorithmWorkerClient
        .callOperation('mix:refine', {
          students,
          seatingHistory,
          mixHistory: mixHistoryRef.current,
          lockedPositions,
          classroomScene: scene,
          currentSeating,
          mixSettings: normalizedSettings,
          options,
          start: start ?? null,
        })
        .then(({ seating: arrangement }) => {
          recentSeatingRef.current =
            arrangement.length > 0 ? arrangement : null;
          setCurrentSeating(arrangement);
          return arrangement;
        });
    },
    [
      students,
      seatingHistory,
      lockedPositions,
      currentSeating,
      setCurrentSeating,
    ],
  );

  return { generateSeatingPlan, refineSeatingLocal };
}
