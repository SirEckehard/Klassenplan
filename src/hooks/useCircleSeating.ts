// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useRef } from 'react';
import type {
  CircleLayout,
  CircleGenerationOptions,
  CircleStudentPosition,
  NeighborhoodAnalysis,
  CircleGenerationStatus,
} from '@/types/Circle';
import type { CircleStateRequirements } from './circle/useCircleStateAdapter';
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';
import {
  logError,
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  createStudentSyncMap,
  syncStudentReference,
} from '@/utils';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import { algorithmWorkerClient } from '@/workers/algorithmWorkerClient';
import type { WorkerProgressPayload } from '@/workers/algorithmWorker.types';
import {
  updateCircleStudentPosition,
  swapCircleStudents,
  batchSwapCircleStudents,
} from '@/services/circleLayoutService';
import { useLayoutStore } from '@/stores/layoutStore';
import {
  calculateCircleDimensions,
  distributeStudentsInCircle,
  calculateCircleNeighbors,
  getAngleBetweenPoints,
} from '@/utils/math/circleGeometry';
import {
  calculateSeatLayout,
  calculateSeatPosition,
} from '@/utils/math/positionCalculations';
import {
  analyzeNeighborhoods,
  calculatePreservationRate,
  updateNeighborhoodPreservation,
  calculateNewNeighborhoods,
} from '@/utils/algorithm/neighborhoodAnalysis';

interface CircleSeatingHook {
  circleLayout: CircleLayout | null;
  setCircleLayout: React.Dispatch<React.SetStateAction<CircleLayout | null>>;
  generateCircleSeating: (
    options?: Partial<CircleGenerationOptions>,
  ) => Promise<CircleLayout | null>;
  regenerateCircle: (
    options?: Partial<CircleGenerationOptions>,
  ) => Promise<CircleLayout | null>;
  updateStudentPosition: (studentId: string, newAngle: number) => void;
  swapStudentPositions: (studentId: string, targetPosition: number) => void;
  batchSwapStudentPositions: (
    swaps: Array<{ studentId: string; targetPosition: number }>,
  ) => void;
  clearCircleLayout: () => void;
  circleGenerationInProgress: boolean;
  circleGenerationStatus: CircleGenerationStatus | null;
  cancelCircleGeneration: () => void;
  syncCircleFromTable: () => Promise<CircleLayout | null>;
}

type CircleActions = Omit<
  CircleSeatingHook,
  'circleLayout' | 'circleGenerationInProgress' | 'circleGenerationStatus'
>;

const CLASSROOM_CENTER = {
  x: CLASSROOM_WIDTH / 2,
  y: CLASSROOM_HEIGHT / 2,
};

type SeatOrderingResult = {
  orderedStudents: Student[];
  startAngle: number;
};

function getOrderedStudentsFromSeating(
  scene: ClassroomScene,
  arrangement?: SeatingArrangement,
): SeatOrderingResult {
  if (!arrangement || arrangement.length === 0) {
    return { orderedStudents: [], startAngle: 0 };
  }

  const entries: Array<{ student: Student; angle: number }> = [];
  const layoutCache = new Map<number, ReturnType<typeof calculateSeatLayout>>();

  arrangement.forEach((tableSeats, tableIndex) => {
    if (!tableSeats) {
      return;
    }

    const table = scene.tables[tableIndex];
    const getLayout = () => {
      if (!table) {
        return undefined;
      }
      if (!layoutCache.has(tableIndex)) {
        layoutCache.set(tableIndex, calculateSeatLayout(table));
      }
      return layoutCache.get(tableIndex);
    };
    const layout = getLayout();

    tableSeats.forEach((student, seatIndex) => {
      if (!student) {
        return;
      }

      let angle = (((tableIndex * 37 + seatIndex * 11) % 360) + 360) % 360;

      if (table && layout) {
        const { x, y } = calculateSeatPosition({
          mode: 'scene',
          table,
          seatIndex,
          layout,
        });
        angle = getAngleBetweenPoints(CLASSROOM_CENTER, { x, y });
      }

      entries.push({ student, angle });
    });
  });

  entries.sort((a, b) => a.angle - b.angle);
  const orderedStudents = entries.map((entry) => entry.student);
  const startAngle = entries[0]?.angle ?? 0;

  return { orderedStudents, startAngle };
}

function applyNeighborhoodMetadata(
  positions: CircleStudentPosition[],
  analysis: NeighborhoodAnalysis,
  circleNeighborMap: Map<string, string[]>,
): CircleStudentPosition[] {
  return positions.map((position) => {
    const originalNeighbors =
      analysis.studentPartnerMap?.get(position.student.id) ??
      analysis.studentNeighborMap.get(position.student.id) ??
      [];
    const circleNeighbors = circleNeighborMap.get(position.student.id) || [];

    const preservedNeighbors = originalNeighbors.filter((id) =>
      circleNeighbors.includes(id),
    );
    const lostNeighbors = originalNeighbors.filter(
      (id) => !circleNeighbors.includes(id),
    );
    const newNeighbors = circleNeighbors.filter(
      (id) => !originalNeighbors.includes(id),
    );

    return {
      ...position,
      preservedNeighbors,
      lostNeighbors,
      newNeighbors,
    };
  });
}

/**
 * Hook for managing circle seating functionality.
 * Integrates with the main seating generator system via CircleStateAdapter.
 *
 * @param state - Minimal state requirements from CircleStateAdapter
 * @param currentSeating - Current seating arrangement (optional)
 * @returns Circle seating operations and state
 *
 * @see CircleStateRequirements for required state properties
 * @see createCircleStateAdapter for adapter creation
 */
function useCircleSeatingInternal(
  state: CircleStateRequirements,
  currentSeating?: SeatingArrangement,
): CircleSeatingHook {
  const circleLayout = useLayoutStore((store) => store.circleLayout);
  const setCircleLayoutState = useLayoutStore((store) => store.setCircleLayout);
  const circleGenerationInProgress = useLayoutStore(
    (store) => store.circleGenerationInProgress,
  );
  const setCircleGenerationInProgressState = useLayoutStore(
    (store) => store.setCircleGenerationInProgress,
  );
  const circleGenerationStatus = useLayoutStore(
    (store) => store.circleGenerationStatus,
  );
  const setCircleGenerationStatusState = useLayoutStore(
    (store) => store.setCircleGenerationStatus,
  );
  const generationAbortRef = useRef<AbortController | null>(null);

  const setCircleLayout = useCallback(
    (value: React.SetStateAction<CircleLayout | null>) => {
      setCircleLayoutState(value);
    },
    [setCircleLayoutState],
  );

  const setCircleGenerationInProgress = useCallback(
    (value: boolean) => {
      setCircleGenerationInProgressState(value);
    },
    [setCircleGenerationInProgressState],
  );

  const setCircleGenerationStatus = useCallback(
    (value: React.SetStateAction<CircleGenerationStatus | null>) => {
      setCircleGenerationStatusState(value);
    },
    [setCircleGenerationStatusState],
  );

  const updateGenerationStatus = useCallback(
    (payload: WorkerProgressPayload | undefined, startedAt: number) => {
      const progressValue =
        typeof payload?.progress === 'number'
          ? Math.min(Math.max(payload.progress, 0), 1)
          : 0;
      setCircleGenerationStatus({
        progress: progressValue,
        stage: payload?.stage,
        message: payload?.message ?? 'Sitzkreis wird erstellt...',
        startedAt,
        updatedAt: Date.now(),
      });
    },
    [setCircleGenerationStatus],
  );

  // Setter without direct persistence logic (handled via persistence layer)
  useEffect(() => {
    if (!circleLayout) {
      return;
    }

    const syncMap = createStudentSyncMap(state.students);

    setCircleLayout((currentLayout) => {
      if (!currentLayout) {
        return currentLayout;
      }

      let hasChanges = false;
      const updatedStudents = currentLayout.students.map((position) => {
        const { nextStudent, hasChanged } = syncStudentReference(
          position.student,
          syncMap,
          { removeOnMissing: false },
        );

        if (!hasChanged || !nextStudent) {
          return position;
        }

        hasChanges = true;
        return {
          ...position,
          student: nextStudent,
        };
      });

      if (!hasChanges) {
        return currentLayout;
      }

      return {
        ...currentLayout,
        students: updatedStudents,
        timestamp: currentLayout.timestamp,
      };
    });
  }, [circleLayout, setCircleLayout, state.students]);

  const generateCircleSeating = useCallback(
    async (options: Partial<CircleGenerationOptions> = {}) => {
      if (generationAbortRef.current) {
        generationAbortRef.current.abort();
      }

      const startedAt = Date.now();
      const abortController = new AbortController();
      generationAbortRef.current = abortController;
      setCircleGenerationInProgress(true);
      updateGenerationStatus(
        {
          progress: 0,
          stage: 'initializing',
          message: 'Sitzkreis wird vorbereitet...',
        },
        startedAt,
      );

      try {
        const useOptimized =
          options.mode === 'preserve-neighbors' || !options.mode;

        const { layout } = await (useOptimized
          ? algorithmWorkerClient.callOperation(
              'circle:optimized',
              {
                students: state.students,
                classroomScene: state.classroomScene,
                mixSettings: state.mixSettings,
                seatingHistory: state.seatingHistory,
                options,
                currentSeating,
              },
              {
                signal: abortController.signal,
                onProgress: (payload) =>
                  updateGenerationStatus(payload, startedAt),
              },
            )
          : algorithmWorkerClient.callOperation(
              'circle:generate',
              {
                students: state.students,
                classroomScene: state.classroomScene,
                options,
                currentSeating,
              },
              {
                signal: abortController.signal,
                onProgress: (payload) =>
                  updateGenerationStatus(payload, startedAt),
              },
            ));

        setCircleLayout(layout);
        return layout;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return null;
        }
        logError(
          'Circle seating generation failed',
          { error, options },
          'useCircleSeating',
        );
        showToast('error', TOAST_MESSAGES.GENERATION_ERROR);
        return null;
      } finally {
        if (generationAbortRef.current === abortController) {
          generationAbortRef.current = null;
        }
        setCircleGenerationInProgress(false);
        setCircleGenerationStatus(null);
      }
    },
    [
      currentSeating,
      setCircleGenerationInProgress,
      setCircleGenerationStatus,
      setCircleLayout,
      state.classroomScene,
      state.mixSettings,
      state.seatingHistory,
      state.students,
      updateGenerationStatus,
    ],
  );

  const regenerateCircle = useCallback(
    (options: Partial<CircleGenerationOptions> = {}) =>
      generateCircleSeating(options),
    [generateCircleSeating],
  );

  const updateStudentPosition = useCallback(
    (studentId: string, newAngle: number) => {
      if (!circleLayout) return;

      setCircleLayout((currentLayout) => {
        if (!currentLayout) return null;
        return updateCircleStudentPosition(currentLayout, studentId, newAngle);
      });
    },
    [circleLayout, setCircleLayout],
  );

  const swapStudentPositions = useCallback(
    (studentId: string, targetPosition: number) => {
      if (!circleLayout) return;

      setCircleLayout((currentLayout) => {
        if (!currentLayout) return null;
        return swapCircleStudents(currentLayout, studentId, targetPosition);
      });
    },
    [circleLayout, setCircleLayout],
  );

  const batchSwapStudentPositions = useCallback(
    (swaps: Array<{ studentId: string; targetPosition: number }>) => {
      if (!circleLayout || swaps.length === 0) {
        return;
      }

      setCircleLayout((currentLayout) => {
        if (!currentLayout) {
          return currentLayout;
        }
        return batchSwapCircleStudents(currentLayout, swaps);
      });
    },
    [circleLayout, setCircleLayout],
  );

  const clearCircleLayout = useCallback(() => {
    setCircleLayout(null);
  }, [setCircleLayout]);

  const cancelCircleGeneration = useCallback(() => {
    if (!generationAbortRef.current && !circleGenerationInProgress) {
      return;
    }
    if (generationAbortRef.current) {
      generationAbortRef.current.abort();
    }
    setCircleGenerationInProgress(false);
    setCircleGenerationStatus(null);
    showToast('info', TOAST_MESSAGES.CIRCLE_GENERATION_CANCELLED);
  }, [
    circleGenerationInProgress,
    setCircleGenerationInProgress,
    setCircleGenerationStatus,
  ]);

  const syncCircleFromTable = useCallback(async () => {
    const arrangement =
      (currentSeating && currentSeating.length > 0 && currentSeating) ||
      (state.currentSeating && state.currentSeating.length > 0
        ? state.currentSeating
        : null);

    if (!arrangement) {
      return generateCircleSeating({ mode: 'preserve-neighbors' });
    }

    const { orderedStudents, startAngle } = getOrderedStudentsFromSeating(
      state.classroomScene,
      arrangement,
    );

    if (!orderedStudents.length) {
      return generateCircleSeating({ mode: 'preserve-neighbors' });
    }

    const orderedList = [...orderedStudents];
    const placedIds = new Set(orderedList.map((student) => student.id));
    const missingStudents = state.students.filter(
      (student) => !placedIds.has(student.id),
    );

    if (missingStudents.length) {
      const sortedMissing = [...missingStudents].sort((a, b) =>
        a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }),
      );
      orderedList.push(...sortedMissing);
    }

    const startedAt = Date.now();
    setCircleGenerationInProgress(true);
    setCircleGenerationStatus({
      progress: 0,
      stage: 'sync',
      message: 'Sitzkreis wird aus dem Sitzplan übernommen...',
      startedAt,
      updatedAt: startedAt,
    });

    try {
      const { center, radius } = calculateCircleDimensions(orderedList.length);
      const neighborhoodAnalysis = analyzeNeighborhoods(
        state.classroomScene,
        state.students,
        arrangement,
      );

      const positions = distributeStudentsInCircle(
        orderedList,
        center,
        radius,
        startAngle,
      );
      const circleNeighborMap = calculateCircleNeighbors(positions);
      const preservationRate = calculatePreservationRate(
        neighborhoodAnalysis,
        circleNeighborMap,
      );
      const updatedAnalysis = updateNeighborhoodPreservation(
        neighborhoodAnalysis,
        circleNeighborMap,
      );
      const newNeighborhoods = calculateNewNeighborhoods(
        circleNeighborMap,
        neighborhoodAnalysis,
      );
      const enrichedPositions = applyNeighborhoodMetadata(
        positions,
        neighborhoodAnalysis,
        circleNeighborMap,
      );

      const layout: CircleLayout = {
        students: enrichedPositions,
        radius,
        center,
        preservedNeighborhoods: Math.round(
          preservationRate * neighborhoodAnalysis.neighborhoodPairs.length,
        ),
        totalOriginalNeighborhoods:
          neighborhoodAnalysis.neighborhoodPairs.length,
        newNeighborhoods: newNeighborhoods.length,
        preservationRate,
        mode: 'preserve-neighbors',
        timestamp: Date.now(),
        neighborhoodPairs: updatedAnalysis.neighborhoodPairs,
      };

      setCircleLayout(layout);
      return layout;
    } catch (error) {
      logError(
        'Failed to sync circle layout from seating',
        { error },
        'useCircleSeating',
      );
      showToast('error', TOAST_MESSAGES.UPDATE_ERROR);
      return null;
    } finally {
      setCircleGenerationInProgress(false);
      setCircleGenerationStatus(null);
    }
  }, [
    currentSeating,
    state.currentSeating,
    state.classroomScene,
    state.students,
    generateCircleSeating,
    setCircleGenerationInProgress,
    setCircleGenerationStatus,
    setCircleLayout,
  ]);

  return {
    circleLayout,
    setCircleLayout,
    generateCircleSeating,
    regenerateCircle,
    updateStudentPosition,
    swapStudentPositions,
    batchSwapStudentPositions,
    clearCircleLayout,
    circleGenerationInProgress,
    circleGenerationStatus,
    cancelCircleGeneration,
    syncCircleFromTable,
  };
}

export function useCircleSeating(
  state: CircleStateRequirements,
  currentSeating?: SeatingArrangement,
): CircleSeatingHook {
  return useCircleSeatingInternal(state, currentSeating);
}

export function useCircleActions(
  state: CircleStateRequirements,
  currentSeating?: SeatingArrangement,
): CircleActions {
  const {
    circleLayout: _circleLayout,
    circleGenerationInProgress: _circleGenerationInProgress,
    circleGenerationStatus: _circleGenerationStatus,
    ...actions
  } = useCircleSeatingInternal(state, currentSeating);
  void _circleLayout;
  void _circleGenerationInProgress;
  void _circleGenerationStatus;
  return actions;
}
