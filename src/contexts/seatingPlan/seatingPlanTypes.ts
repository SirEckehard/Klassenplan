// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type React from 'react';
import type {
  Student,
  ClassroomScene,
  SeatingArrangement,
  MixSettings,
  SavedPlan,
  MixResult,
  ClassroomTemplate,
  ClassSummary,
  CreateClassPayload,
  UpdateClassMetadataPayload,
  StatisticHighlightMode,
  StatisticHighlightState,
  ActiveClassState,
  SaveTemplateResult,
} from '@/types';
import type { CircleLayout, CircleGenerationStatus } from '@/types/Circle';
import type { CriterionFulfillment } from '@/utils/algorithm/seatingStatistics';
import type { LatestChangelogEntry } from '@/utils';
import type { SeatingPlanStore } from '@/hooks/useSeatingState';
import type { NameColumnMode } from '@/utils/data/csvUtils';

export interface SeatingPlanState {
  students: Student[];
  classroomScene: ClassroomScene;
  currentSeating: SeatingArrangement;
  mixSettings: MixSettings;
  step: number;
  seatCount: number;
  classroomEdited: boolean;
  hasUnsavedSeatingChanges: boolean;
  planName: string;
  planNameError: boolean;
  planNameInputRef: React.RefObject<HTMLInputElement | null>;
  autoMixing: boolean;
  autoMixError: string | null;
  seatingHistory: SavedPlan[];
  mixHistory: MixResult[];
  circleLayout: CircleLayout | null;
  circleGenerationInProgress: boolean;
  circleGenerationStatus: CircleGenerationStatus | null;
  seatingMode: 'table' | 'circle';
  lastStatistics: CriterionFulfillment[] | null;
  showStatisticsBadge: boolean;
  hasPendingStudentUpdates: boolean;
  showPostUpdateNotice: boolean;
  latestChangelogEntry: LatestChangelogEntry | null;
  currentAppVersion: string;
  classSummaries: ClassSummary[];
  activeClass: ActiveClassState;
  statisticsHighlight: StatisticHighlightState | null;
  /** Seating-plan undo/redo availability (mixing, drag swaps, locks, circle). */
  canUndoSeating: boolean;
  canRedoSeating: boolean;
  /** Class-list undo/redo availability (step 1: add, remove, edit, import). */
  canUndoStudents: boolean;
  canRedoStudents: boolean;
}

export interface SeatingPlanActions {
  handleStepChange: (n: number) => void;
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
  /** Remove a whole selection as one undo step and one store write. */
  removeStudents: (ids: string[]) => void;
  clearStudents: () => void;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  /** Apply one patch to a whole selection as one undo step and one store write. */
  updateStudents: (ids: string[], patch: Partial<Student>) => void;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  importCsv: (file: File, mode?: NameColumnMode) => Promise<Student[]>;
  undoStudents: () => void;
  redoStudents: () => void;
  downloadStudentsCsv: () => void;
  updateClassroomScene: (next: React.SetStateAction<ClassroomScene>) => void;
  removeTables: (
    indices: number[],
    options?: { skipSeatingUpdate?: boolean },
  ) => void;
  generateSeatingPlan: (
    settings: Partial<MixSettings>,
    scene: ClassroomScene,
  ) => Promise<SeatingArrangement>;
  moveStudent: (
    fromTable: number,
    fromSeat: number,
    toTable: number,
    toSeat: number,
  ) => boolean;
  refineSeatingLocal: (
    settings: Partial<MixSettings>,
    scene: ClassroomScene,
    options?: { triesPerPass?: number; passes?: number },
    start?: SeatingArrangement,
  ) => Promise<SeatingArrangement>;
  /**
   * Refine the arrangement currently on screen instead of drawing a new one.
   * Exposes the local-search pass that so far only ran implicitly after a mix.
   */
  refineCurrentSeating: (options?: {
    triesPerPass?: number;
    passes?: number;
  }) => Promise<SeatingArrangement>;
  onMix: () => void;
  undoSeating: () => void;
  redoSeating: () => void;
  setPlanName: (v: string) => void;
  setPlanNameError: (v: boolean) => void;
  handleSaveSeatingPlan: (name: string, scene: ClassroomScene) => void;
  isSeatLocked: (table: number, seat: number) => boolean;
  toggleLock: (studentId: string, table: number, seat: number) => void;
  saveTemplate: (
    name: string,
    scene: ClassroomScene,
  ) => Promise<SaveTemplateResult>;
  loadTemplate: () => Promise<ClassroomTemplate[]>;
  updateTemplate: (id: number, scene: ClassroomScene) => Promise<boolean>;
  deleteTemplate: (id: number) => Promise<void>;
  renameTemplate: (
    id: number,
    newName: string,
  ) => Promise<{ success: boolean; error?: 'empty' | 'duplicate' | 'storage' }>;
  handleHistoryLoad: (p: SavedPlan) => void;
  deleteSeatingPlan: (id: string) => void;
  renameSeatingPlan: (id: string, name: string) => boolean;
  handleMixLoad: (r: MixResult) => void;
  deleteMixResult: (id: number) => void;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
  handleHomeClick: React.MouseEventHandler<HTMLAnchorElement>;
  importInputRef: React.RefObject<HTMLInputElement | null>;
  triggerImport: () => void;
  handleExportAll: () => Promise<void>;
  handleImportFile: React.ChangeEventHandler<HTMLInputElement>;
  clearAllData: () => Promise<void>;
  generateCircleSeating: () => Promise<CircleLayout | null>;
  regenerateCircle: () => Promise<CircleLayout | null>;
  updateStudentPosition: (studentId: string, newAngle: number) => void;
  swapStudentPositions: (studentId: string, targetPosition: number) => void;
  batchSwapStudentPositions: (
    swaps: Array<{ studentId: string; targetPosition: number }>,
  ) => void;
  clearCircleLayout: () => void;
  syncCircleFromTable: () => Promise<CircleLayout | null>;
  setCircleLayoutValue: (
    value: React.SetStateAction<CircleLayout | null>,
  ) => void;
  cancelCircleGeneration: () => void;
  setSeatingMode: (mode: 'table' | 'circle') => void;
  setLastStatistics: React.Dispatch<
    React.SetStateAction<CriterionFulfillment[] | null>
  >;
  setShowStatisticsBadge: (value: boolean) => void;
  setStatisticsHighlight: React.Dispatch<
    React.SetStateAction<StatisticHighlightState | null>
  >;
  setStatisticsHighlightMode: (mode: StatisticHighlightMode | null) => void;
  clearStatisticsHighlight: () => void;
  acknowledgePostUpdateNotice: () => void;
  acknowledgeStudentUpdates: () => void;
  selectClass: (classId: string) => Promise<boolean>;
  createClass: (
    payload: CreateClassPayload,
    options?: { activate?: boolean },
  ) => Promise<boolean>;
  updateClassMetadata: (
    classId: string,
    patch: UpdateClassMetadataPayload,
  ) => Promise<boolean>;
  duplicateClass: (
    classId: string,
    overrides?: UpdateClassMetadataPayload & { name?: string },
  ) => Promise<boolean>;
  deleteClass: (classId: string) => Promise<boolean>;
  setCurrentSeating: React.Dispatch<React.SetStateAction<SeatingArrangement>>;
}

export type SeatingPlanSnapshot = {
  state: SeatingPlanState;
  actions: SeatingPlanActions;
  combined: SeatingPlanCombined;
};

export type SeatingPlanCombined = SeatingPlanState & SeatingPlanActions;

export type SeatingPlanStoreValue = SeatingPlanStore<SeatingPlanSnapshot>;
