import type React from 'react';
import type { StoreApi } from 'zustand/vanilla';
import type {
  Student,
  ClassroomScene,
  MixSettings,
  SavedPlan,
  MixResult,
  StatisticHighlightMode,
  StatisticHighlightState,
} from '@/types';
import type { CircleLayout, CircleGenerationStatus } from '@/types/Circle';
import type { CriterionFulfillment } from '@/utils/algorithm/seatingStatistics';
import type { LatestChangelogEntry } from '@/utils';
import type { NameColumnMode } from '@/utils/data/csvUtils';
import { logDebug } from '@/utils';

const FEATURE_STORE_LOG_SOURCE = 'featureStores';

/**
 * Shared helper that mirrors React's SetStateAction but keeps the stores framework agnostic.
 */
export type StateUpdater<TState> = TState | ((prev: TState) => TState);

export type FeatureStoreSlice<
  TState extends object,
  TActions extends object,
> = TState & TActions;

export type FeatureStoreApi<TSlice extends object> = StoreApi<TSlice>;

export interface FeatureStoreLogger {
  debug: (message: string, context?: Record<string, unknown>) => void;
}

/**
 * Creates a scoped logger for store instrumentation.
 */
export function createFeatureStoreLogger(scope: string): FeatureStoreLogger {
  return {
    debug(message: string, context?: Record<string, unknown>) {
      logDebug(
        message,
        { scope, ...(context ?? {}) },
        FEATURE_STORE_LOG_SOURCE,
      );
    },
  };
}

/**
 * Student management store contracts
 */
export interface StudentStoreState {
  students: Student[];
  hasPendingStudentUpdates: boolean;
}

export interface StudentStoreActions {
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
  setStudents: (next: StateUpdater<Student[]>) => void;
  importCsv: (file: File, mode?: NameColumnMode) => Promise<Student[]>;
  acknowledgeStudentUpdates: () => void;
}

export type StudentStoreSlice = FeatureStoreSlice<
  StudentStoreState,
  StudentStoreActions
>;

export type StudentStore = FeatureStoreApi<StudentStoreSlice>;

/**
 * Classroom layout & circle view store contracts
 */
export interface LayoutStoreState {
  classroomScene: ClassroomScene;
  seatCount: number;
  classroomEdited: boolean;
  seatingMode: 'table' | 'circle';
  circleLayout: CircleLayout | null;
  circleGenerationInProgress: boolean;
  circleGenerationStatus: CircleGenerationStatus | null;
}

export interface LayoutStoreActions {
  setClassroomScene: (next: StateUpdater<ClassroomScene>) => void;
  resetClassroomScene: () => void;
  setClassroomEdited: (edited: boolean) => void;
  setSeatingMode: (mode: 'table' | 'circle') => void;
  setCircleLayout: (next: StateUpdater<CircleLayout | null>) => void;
  setCircleGenerationInProgress: (value: boolean) => void;
  setCircleGenerationStatus: (
    value: StateUpdater<CircleGenerationStatus | null>,
  ) => void;
}

export type LayoutStoreSlice = FeatureStoreSlice<
  LayoutStoreState,
  LayoutStoreActions
>;

export type LayoutStore = FeatureStoreApi<LayoutStoreSlice>;

/**
 * Seating algorithm & workflow store contracts
 */
export interface AlgorithmStoreState {
  step: number;
  mixSettings: MixSettings;
  seatingHistory: SavedPlan[];
  mixHistory: MixResult[];
  planName: string;
  planNameError: boolean;
  lastStatistics: CriterionFulfillment[] | null;
  showStatisticsBadge: boolean;
  showPostUpdateNotice: boolean;
  latestChangelogEntry: LatestChangelogEntry | null;
  currentAppVersion: string;
  statisticsHighlight: StatisticHighlightState | null;
}

export interface AlgorithmStoreActions {
  setStep: (nextStep: number) => void;
  setMixSettings: (next: StateUpdater<MixSettings>) => void;
  setSeatingHistory: (next: StateUpdater<SavedPlan[]>) => void;
  setMixHistory: (next: StateUpdater<MixResult[]>) => void;
  addMixResult: (result: MixResult) => void;
  deleteMixResult: (id: number) => void;
  clearMixHistory: () => void;
  setPlanName: (value: StateUpdater<string>) => void;
  setPlanNameError: (value: boolean) => void;
  setLastStatistics: (
    next: StateUpdater<CriterionFulfillment[] | null>,
  ) => void;
  setShowStatisticsBadge: (value: StateUpdater<boolean>) => void;
  setStatisticsHighlight: (
    value: StateUpdater<StatisticHighlightState | null>,
  ) => void;
  setStatisticsHighlightMode: (value: StatisticHighlightMode | null) => void;
  clearStatisticsHighlight: () => void;
  setShowPostUpdateNotice: (value: boolean) => void;
  acknowledgePostUpdateNotice: () => void;
  setLatestChangelogEntry: (entry: LatestChangelogEntry | null) => void;
  setCurrentAppVersion: (version: string) => void;
}

export type AlgorithmStoreSlice = FeatureStoreSlice<
  AlgorithmStoreState,
  AlgorithmStoreActions
>;

export type AlgorithmStore = FeatureStoreApi<AlgorithmStoreSlice>;

/**
 * Generator-level utility actions that are shared across slices but not tied to a single domain.
 */
export interface GeneratorUtilityActions {
  importInputRef: React.RefObject<HTMLInputElement | null>;
  triggerImport: () => void;
  handleExportAll: () => void;
  handleImportFile: React.ChangeEventHandler<HTMLInputElement>;
  clearAllData: () => Promise<void>;
  handleHomeClick: React.MouseEventHandler<HTMLAnchorElement>;
}
