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
  SaveSeatingPlanOptions,
  SaveTemplateResult,
  PlanUsage,
  RoomRecord,
  RoomWorkingState,
} from '@/types';
import type { CircleLayout, CircleGenerationStatus } from '@/types/Circle';
import type { CriterionFulfillment } from '@/utils/algorithm/seatingStatistics';
import type { LatestChangelogEntry } from '@/utils';
import type { SeatingPlanStore } from '@/hooks/useSeatingState';
import type { CsvImportSelection } from '@/utils/data/csvUtils';
import type { RoomNameProblem } from '@/utils/data/classRooms';
import type {
  PlanMoveTarget,
  RoomRemovalProblem,
} from '@/hooks/domains/useRoomManagement';

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
  /** The saved plan on screen, or null while it has never been saved. */
  activePlanId: string | null;
  /** The rooms of the open class (decision 0024). */
  rooms: RoomRecord[];
  /** The open room, whose tables, seating and plan are on screen. */
  activeRoomId: string | null;
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
  /** Records of plans that were really in use; see `buildPreviousPairs`. */
  planUsage: PlanUsage[];
  /** When the class's neighbourhoods were last reset; null if never. */
  planUsageSince: string | null;
  /** Whether the class marks its plans by hand; see `buildPreviousPairs`. */
  planUsageManual: boolean;
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
  importCsv: (file: File, selection?: CsvImportSelection) => Promise<Student[]>;
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
  onMix: () => void;
  undoSeating: () => void;
  redoSeating: () => void;
  setPlanName: (v: string) => void;
  setPlanNameError: (v: boolean) => void;
  /**
   * Saves the plan on screen under `name` and reports whether it was saved.
   * `rename` keeps writing to the open plan under a new name rather than
   * starting a new one beside it.
   */
  handleSaveSeatingPlan: (
    name: string,
    scene: ClassroomScene,
    options?: Pick<SaveSeatingPlanOptions, 'rename'>,
  ) => boolean;
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
  /**
   * Lets go of the open plan, name and all, so the next save starts a new
   * entry — what replacing the room as a whole calls for.
   */
  releaseOpenPlan: () => void;
  renameSeatingPlan: (id: string, name: string) => boolean;
  /**
   * Puts a mix back on screen in the room it was made in; `false` when it no
   * longer fits that room's tables.
   */
  handleMixLoad: (r: MixResult) => boolean;
  /** Opens a room of the class as it was left (decision 0024). */
  openRoom: (roomId: string) => boolean;
  /** Makes a room — empty, or with a given state — and opens it. */
  createRoom: (options?: {
    name?: string;
    state?: RoomWorkingState;
  }) => RoomRecord | null;
  /** Adds a room without opening it; the room, or what speaks against it. */
  addRoom: (name: string) => RoomRecord | RoomNameProblem | 'room-limit';
  /** A copy of a saved plan beside it, under a free name. */
  duplicateSeatingPlan: (id: string) => SavedPlan | null;
  /** A template loaded as a room of its own; the message offers the way back. */
  createRoomFromTemplate: (template: ClassroomTemplate) => string | null;
  renameRoom: (roomId: string, name: string) => RoomNameProblem | null;
  deleteRoom: (roomId: string) => RoomRemovalProblem | null;
  movePlanToRoom: (
    planId: string,
    target: PlanMoveTarget,
  ) => RoomNameProblem | 'not-found' | 'room-limit' | null;
  deleteMixResult: (id: number) => void;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
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
  /** Locks a student to their place in the circle, or lets them go. */
  toggleCircleLock: (studentId: string) => void;
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
