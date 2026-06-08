/**
 * @internal
 * Internal hook used by useSeatingGenerator. Do not import directly.
 * Use SeatingPlanGeneratorProvider context hooks instead.
 */
import { useCallback, useState, useEffect, useMemo } from 'react';
import { useStudentsState } from './state/useStudentsState';
import { useLockState } from './state/useLockState';
import { useClassroomSceneState } from './state/useClassroomSceneState';
import { useAutoMixSettings } from './domains/useAutoMixSettings';
import { useAlgorithmStore } from '@/stores/algorithmStore';
import { shallow } from 'zustand/shallow';
import { createStudentSyncMap, syncStudentReference } from '@/utils';
import type {
  Student,
  SavedPlan,
  SeatingArrangement,
  LockedPositions,
  MixSettings,
  ClassroomScene,
  MixResult,
  ClassSummary,
  StatisticHighlightMode,
  StatisticHighlightState,
  ActiveClassState,
} from '@/types';
import { DEFAULT_ACTIVE_CLASS } from '@/types';
import type { CircleLayout, CircleGenerationStatus } from '@/types/Circle';
import type { CriterionFulfillment } from '@/utils/algorithm/seatingStatistics';
import type { NameColumnMode } from '@/utils/data/csvUtils';

export type SeatingPlanStore<TSnapshot> = {
  getSnapshot: () => TSnapshot;
  subscribe: (listener: () => void) => () => void;
};

export type SeatingPlanEqualityFn<TValue> = (a: TValue, b: TValue) => boolean;

export type SeatingState = {
  studentState: {
    students: Student[];
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
    addStudent: (
      name: string,
      gender?: 'boy' | 'girl' | 'diverse',
      restless?: boolean,
      shy?: boolean,
      concentrationIssues?: boolean,
      needsFrontSeat?: boolean,
    ) => Student;
    addBulkPlaceholderStudents: (count: number) => Student[];
    removeStudent: (id: string) => void;
    clearStudents: () => void;
    updateStudent: (id: string, patch: Partial<Student>) => void;
    importCsv: (file: File, mode?: NameColumnMode) => Promise<Student[]>;
    moveStudent: (
      fromTable: number,
      fromSeat: number,
      toTable: number,
      toSeat: number,
    ) => boolean;
    hasPendingStudentUpdates: boolean;
    acknowledgeStudentUpdates: () => void;
  };
  sceneState: {
    classroomScene: ClassroomScene;
    setClassroomScene: React.Dispatch<React.SetStateAction<ClassroomScene>>;
    classroomEdited: boolean;
    setClassroomEdited: (edited: boolean) => void;
    seatCount: number;
    removeTables: (
      indices: number[],
      options?: { skipSeatingUpdate?: boolean },
    ) => void;
    seatingMode: 'table' | 'circle';
    setSeatingMode: (mode: 'table' | 'circle') => void;
    circleLayout: CircleLayout | null;
    setCircleLayout: React.Dispatch<React.SetStateAction<CircleLayout | null>>;
    circleGenerationInProgress: boolean;
    setCircleGenerationInProgress: (value: boolean) => void;
    circleGenerationStatus: CircleGenerationStatus | null;
    setCircleGenerationStatus: React.Dispatch<
      React.SetStateAction<CircleGenerationStatus | null>
    >;
  };
  algorithmState: {
    mixSettings: MixSettings;
    setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
    lockedPositions: LockedPositions;
    setLockedPositions: React.Dispatch<React.SetStateAction<LockedPositions>>;
    toggleLock: (studentId: string, table: number, seat: number) => void;
    isSeatLocked: (table: number, seat: number) => boolean;
    lastStatistics: CriterionFulfillment[] | null;
    setLastStatistics: React.Dispatch<
      React.SetStateAction<CriterionFulfillment[] | null>
    >;
    showStatisticsBadge: boolean;
    setShowStatisticsBadge: (value: boolean) => void;
    statisticsHighlight: StatisticHighlightState | null;
    setStatisticsHighlight: React.Dispatch<
      React.SetStateAction<StatisticHighlightState | null>
    >;
    setStatisticsHighlightMode: (mode: StatisticHighlightMode | null) => void;
    clearStatisticsHighlight: () => void;
  };
  historyState: {
    seatingHistory: SavedPlan[];
    setSeatingHistory: React.Dispatch<React.SetStateAction<SavedPlan[]>>;
    mixHistory: MixResult[];
    setMixHistory: React.Dispatch<React.SetStateAction<MixResult[]>>;
    addMixResult: (result: MixResult) => void;
    deleteMixResult: (id: number) => void;
    clearMixHistory: () => void;
  };
  planState: {
    currentSeating: SeatingArrangement;
    setCurrentSeating: React.Dispatch<React.SetStateAction<SeatingArrangement>>;
    planName: string;
    setPlanName: React.Dispatch<React.SetStateAction<string>>;
    planNameError: boolean;
    setPlanNameError: (value: boolean) => void;
    activePlanId: string | null;
    setActivePlanId: React.Dispatch<React.SetStateAction<string | null>>;
  };
  classState: {
    classSummaries: ClassSummary[];
    setClassSummaries: React.Dispatch<React.SetStateAction<ClassSummary[]>>;
    activeClass: ActiveClassState;
    setActiveClass: React.Dispatch<React.SetStateAction<ActiveClassState>>;
  };
};

/**
 * Compose seating related state hooks into a single interface.
 * @returns Collection of state values and mutating functions
 */
export function useSeatingState(): SeatingState {
  const {
    mixSettings,
    setMixSettings,
    seatingHistory,
    setSeatingHistory,
    mixHistory,
    setMixHistory,
    addMixResult,
    deleteMixResult,
    clearMixHistory,
    planName,
    setPlanName,
    planNameError,
    setPlanNameError,
    lastStatistics,
    setLastStatistics,
    showStatisticsBadge,
    setShowStatisticsBadge,
    statisticsHighlight,
    setStatisticsHighlight,
    setStatisticsHighlightMode,
    clearStatisticsHighlight,
  } = useAlgorithmStore(
    (state) => ({
      mixSettings: state.mixSettings,
      setMixSettings: state.setMixSettings,
      seatingHistory: state.seatingHistory,
      setSeatingHistory: state.setSeatingHistory,
      mixHistory: state.mixHistory,
      setMixHistory: state.setMixHistory,
      addMixResult: state.addMixResult,
      deleteMixResult: state.deleteMixResult,
      clearMixHistory: state.clearMixHistory,
      planName: state.planName,
      setPlanName: state.setPlanName,
      planNameError: state.planNameError,
      setPlanNameError: state.setPlanNameError,
      lastStatistics: state.lastStatistics,
      setLastStatistics: state.setLastStatistics,
      showStatisticsBadge: state.showStatisticsBadge,
      setShowStatisticsBadge: state.setShowStatisticsBadge,
      statisticsHighlight: state.statisticsHighlight,
      setStatisticsHighlight: state.setStatisticsHighlight,
      setStatisticsHighlightMode: state.setStatisticsHighlightMode,
      clearStatisticsHighlight: state.clearStatisticsHighlight,
    }),
    shallow,
  );
  const [currentSeating, setCurrentSeating] = useState<SeatingArrangement>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([]);
  const [activeClass, setActiveClass] =
    useState<ActiveClassState>(DEFAULT_ACTIVE_CLASS);
  const {
    students,
    setStudents,
    hasPendingStudentUpdates,
    acknowledgeStudentUpdates,
    addStudent,
    addBulkPlaceholderStudents,
    removeStudent: removeStudentInternal,
    clearStudents: clearStudentsInternal,
    updateStudent,
    importCsv,
  } = useStudentsState();

  useEffect(() => {
    queueMicrotask(() => {
      setCurrentSeating((prev: SeatingArrangement) => {
        if (prev.length === 0) {
          return prev;
        }

        const syncMap = createStudentSyncMap(students);
        let hasChanges = false;

        const next = prev.map((table) => {
          if (!table || table.length === 0) {
            return table;
          }

          let tableChanged = false;
          const updatedSeats = table.map((seat) => {
            if (!seat) {
              return seat;
            }

            const { nextStudent, hasChanged } = syncStudentReference(
              seat,
              syncMap,
            );

            if (!hasChanged) {
              return seat;
            }

            hasChanges = true;
            tableChanged = true;
            return nextStudent;
          });

          return tableChanged ? updatedSeats : table;
        });

        return hasChanges ? next : prev;
      });
    });
  }, [students, setCurrentSeating]);

  const {
    lockedPositions,
    setLockedPositions,
    toggleLock,
    isSeatLocked,
    removeLock,
    clearLocks,
  } = useLockState(currentSeating);

  const {
    classroomScene,
    seatCount,
    classroomEdited,
    setClassroomScene,
    resetClassroomScene,
    setClassroomEdited,
    seatingMode,
    setSeatingMode,
    circleLayout,
    setCircleLayout,
    circleGenerationInProgress,
    setCircleGenerationInProgress,
    circleGenerationStatus,
    setCircleGenerationStatus,
  } = useClassroomSceneState();

  useAutoMixSettings(
    students,
    mixSettings,
    setMixSettings,
    activeClass.id ?? undefined,
  );

  /**
   * Remove student and related locks.
   * @param id Student identifier
   */
  const removeStudent = useCallback(
    (id: string) => {
      removeStudentInternal(id);
      removeLock(id);
    },
    [removeStudentInternal, removeLock],
  );

  /**
   * Clear all students and reset dependent state.
   */
  const clearStudents = useCallback(() => {
    clearStudentsInternal();
    setCurrentSeating([]);
    clearLocks();
    resetClassroomScene();
    setCircleLayout(null);
    setCircleGenerationInProgress(false);
  }, [
    clearStudentsInternal,
    clearLocks,
    resetClassroomScene,
    setCircleGenerationInProgress,
    setCircleLayout,
  ]);

  /**
   * Swap two seat positions unless either is locked.
   */
  const moveStudent = useCallback(
    (fromTable: number, fromSeat: number, toTable: number, toSeat: number) => {
      let didMove = false;
      setCurrentSeating((prev) => {
        const next = prev.map((t) => [...t]);
        if (!next[fromTable] || !next[toTable]) return prev;
        const src = next[fromTable]![fromSeat];
        const dst = next[toTable]![toSeat];
        if (src) {
          const lp = lockedPositions[src.id];
          if (lp && lp.table === fromTable && lp.seat === fromSeat) return prev;
        }
        if (dst) {
          const lp = lockedPositions[dst.id];
          if (lp && lp.table === toTable && lp.seat === toSeat) return prev;
        }
        next[fromTable]![fromSeat] = dst ?? null;
        next[toTable]![toSeat] = src ?? null;
        didMove = true;
        return next;
      });
      return didMove;
    },
    [lockedPositions, setCurrentSeating],
  );

  /**
   * Remove tables and adjust locked positions accordingly.
   * @param indices Array of table indices to remove
   * @param options Optional flags (skipSeatingUpdate avoids triggering setCurrentSeating)
   */
  const removeTables = useCallback(
    (indices: number[], options?: { skipSeatingUpdate?: boolean }) => {
      if (indices.length === 0) return;
      const sorted = [...indices].sort((a, b) => b - a);
      if (!options?.skipSeatingUpdate) {
        setCurrentSeating((prev) => {
          const next = [...prev];
          sorted.forEach((i) => {
            if (i >= 0 && i < next.length) next.splice(i, 1);
          });
          return next;
        });
      }
      setLockedPositions((prev) => {
        const next: LockedPositions = {};
        Object.entries(prev).forEach(([sid, pos]) => {
          const { table, seat } = pos;
          if (sorted.includes(table)) return;
          const shift = sorted.filter((i) => i < table).length;
          next[sid] = { table: table - shift, seat };
        });
        return next;
      });
    },
    [setCurrentSeating, setLockedPositions],
  );

  return useMemo(
    () => ({
      studentState: {
        students,
        setStudents,
        addStudent,
        addBulkPlaceholderStudents,
        removeStudent,
        clearStudents,
        updateStudent,
        importCsv,
        moveStudent,
        hasPendingStudentUpdates,
        acknowledgeStudentUpdates,
      },
      sceneState: {
        classroomScene,
        setClassroomScene,
        classroomEdited,
        setClassroomEdited,
        seatCount,
        removeTables,
        seatingMode,
        setSeatingMode,
        circleLayout,
        setCircleLayout,
        circleGenerationInProgress,
        setCircleGenerationInProgress,
        circleGenerationStatus,
        setCircleGenerationStatus,
      },
      algorithmState: {
        mixSettings,
        setMixSettings,
        lockedPositions,
        setLockedPositions,
        toggleLock,
        isSeatLocked,
        lastStatistics,
        setLastStatistics,
        showStatisticsBadge,
        setShowStatisticsBadge,
        statisticsHighlight,
        setStatisticsHighlight,
        setStatisticsHighlightMode,
        clearStatisticsHighlight,
      },
      historyState: {
        seatingHistory,
        setSeatingHistory,
        mixHistory,
        setMixHistory,
        addMixResult,
        deleteMixResult,
        clearMixHistory,
      },
      planState: {
        currentSeating,
        setCurrentSeating,
        planName,
        setPlanName,
        planNameError,
        setPlanNameError,
        activePlanId,
        setActivePlanId,
      },
      classState: {
        classSummaries,
        setClassSummaries,
        activeClass,
        setActiveClass,
      },
    }),
    [
      students,
      setStudents,
      addStudent,
      addBulkPlaceholderStudents,
      removeStudent,
      clearStudents,
      updateStudent,
      importCsv,
      moveStudent,
      hasPendingStudentUpdates,
      acknowledgeStudentUpdates,
      classroomScene,
      setClassroomScene,
      classroomEdited,
      setClassroomEdited,
      seatCount,
      removeTables,
      seatingMode,
      setSeatingMode,
      circleLayout,
      setCircleLayout,
      circleGenerationInProgress,
      setCircleGenerationInProgress,
      circleGenerationStatus,
      setCircleGenerationStatus,
      mixSettings,
      setMixSettings,
      lockedPositions,
      setLockedPositions,
      toggleLock,
      isSeatLocked,
      lastStatistics,
      setLastStatistics,
      showStatisticsBadge,
      setShowStatisticsBadge,
      statisticsHighlight,
      setStatisticsHighlight,
      setStatisticsHighlightMode,
      clearStatisticsHighlight,
      seatingHistory,
      setSeatingHistory,
      mixHistory,
      setMixHistory,
      addMixResult,
      deleteMixResult,
      clearMixHistory,
      currentSeating,
      setCurrentSeating,
      planName,
      setPlanName,
      planNameError,
      setPlanNameError,
      activePlanId,
      setActivePlanId,
      classSummaries,
      setClassSummaries,
      activeClass,
      setActiveClass,
    ],
  );
}
