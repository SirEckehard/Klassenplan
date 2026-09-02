// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, type MockedFunction } from 'vitest';
import { neutralSettings, type LatestChangelogEntry } from '../../utils';
import type {
  Student,
  ClassroomScene,
  ClassroomTable,
  SavedPlan,
  MixResult,
  SeatingArrangement,
  MixSettings,
  ClassroomTemplate,
  ClassSummary,
  CreateClassPayload,
  UpdateClassMetadataPayload,
  ActiveClassState,
} from '../../types';
import type { CircleLayout } from '../../types/Circle';
import type { CriterionFulfillment } from '../../utils/algorithm/seatingStatistics';
import type { Props as SeatingPlanViewProps } from '../../components/SeatingPlanGenerator/SeatingPlanView';
import type { StudentInputProps } from '../../components/StudentInput';
import type { NameColumnMode } from '../../utils/data/csvUtils';
import { SeatingPlanGeneratorProvider } from '../../contexts/SeatingPlanContext';

const createMockFn = <T extends (...args: any[]) => any>() => vi.fn<T>();
let mockIdCounter = 0;
const createMockId = () => `mock-id-${mockIdCounter++}`;
const toMock = <F extends (...args: any[]) => any>(fn: F) =>
  fn as unknown as MockedFunction<F>;

interface MockSeatingGeneratorState {
  students: Student[];
  classroomScene: ClassroomScene;
  currentSeating: SeatingArrangement;
  mixSettings: MixSettings;
  step: number;
  seatCount: number;
  classroomEdited: boolean;
  planName: string;
  planNameError: boolean;
  planNameInputRef: React.RefObject<HTMLInputElement | null>;
  autoMixing: boolean;
  autoMixError: string | null;
  seatingHistory: SavedPlan[];
  mixHistory: MixResult[];
  circleLayout: CircleLayout | null;
  circleGenerationInProgress: boolean;
  lastStatistics: CriterionFulfillment[] | null;
  showStatisticsBadge: boolean;
  seatingMode: 'table' | 'circle';
  showPostUpdateNotice: boolean;
  latestChangelogEntry: LatestChangelogEntry | null;
  currentAppVersion: string;
  hasPendingStudentUpdates: boolean;
  classSummaries: ClassSummary[];
  activeClass: ActiveClassState;
}

interface MockSeatingGeneratorActions {
  handleStepChange: (next: number) => void;
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
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  importCsv: (file: File, mode?: NameColumnMode) => Promise<Student[]>;
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
  setPlanName: (value: string) => void;
  setPlanNameError: (value: boolean) => void;
  handleSaveSeatingPlan: (name: string, scene: ClassroomScene) => void;
  isSeatLocked: (table: number, seat: number) => boolean;
  toggleLock: (studentId: string, table: number, seat: number) => void;
  saveTemplate: (name: string, scene: ClassroomScene) => Promise<boolean>;
  updateTemplate: (id: number, scene: ClassroomScene) => Promise<boolean>;
  loadTemplate: () => Promise<ClassroomTemplate[]>;
  deleteTemplate: (id: number) => Promise<void>;
  renameTemplate: (id: number, newName: string) => Promise<boolean>;
  handleHistoryLoad: (plan: SavedPlan) => void;
  deleteSeatingPlan: (id: string) => void;
  renameSeatingPlan: (id: string, name: string) => boolean;
  handleMixLoad: (result: MixResult) => void;
  deleteMixResult: (id: number) => void;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
  setCurrentSeating: React.Dispatch<React.SetStateAction<SeatingArrangement>>;
  handleHomeClick: React.MouseEventHandler<HTMLAnchorElement>;
  importInputRef: React.RefObject<HTMLInputElement | null>;
  triggerImport: () => void;
  handleExportAll: () => void;
  handleImportFile: React.ChangeEventHandler<HTMLInputElement>;
  generateCircleSeating: () => Promise<CircleLayout | null>;
  regenerateCircle: () => Promise<CircleLayout | null>;
  updateStudentPosition: (studentId: string, newAngle: number) => void;
  swapStudentPositions: (studentId: string, targetPosition: number) => void;
  batchSwapStudentPositions: (
    swaps: Array<{ studentId: string; targetPosition: number }>,
  ) => void;
  clearCircleLayout: () => void;
  syncCircleFromTable: () => Promise<CircleLayout | null>;
  setLastStatistics: React.Dispatch<
    React.SetStateAction<CriterionFulfillment[] | null>
  >;
  setShowStatisticsBadge: React.Dispatch<React.SetStateAction<boolean>>;
  setSeatingMode: (mode: 'table' | 'circle') => void;
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
}

type MockSeatingGenerator = MockSeatingGeneratorState &
  MockSeatingGeneratorActions & {
    state: MockSeatingGeneratorState;
    actions: MockSeatingGeneratorActions;
  };

type SeatingGeneratorOverrides = Partial<
  Omit<MockSeatingGenerator, 'state' | 'actions'>
> & {
  state?: Partial<MockSeatingGeneratorState>;
  actions?: Partial<MockSeatingGeneratorActions>;
};

const createDefaultMockState = (): MockSeatingGeneratorState => ({
  students: [],
  classroomScene: createMockClassroomScene(),
  currentSeating: [],
  mixSettings: neutralSettings,
  step: 1,
  seatCount: 0,
  classroomEdited: false,
  planName: '',
  planNameError: false,
  planNameInputRef: React.createRef<HTMLInputElement>(),
  autoMixing: false,
  autoMixError: null,
  seatingHistory: [],
  mixHistory: [],
  circleLayout: null,
  circleGenerationInProgress: false,
  lastStatistics: null,
  showStatisticsBadge: false,
  seatingMode: 'table',
  showPostUpdateNotice: false,
  latestChangelogEntry: null,
  currentAppVersion: '1.2.0',
  hasPendingStudentUpdates: false,
  classSummaries: [],
  activeClass: { id: null, name: 'Mock-Klasse' },
});

const createDefaultMockActions = (): MockSeatingGeneratorActions => {
  const actions: MockSeatingGeneratorActions = {
    handleStepChange:
      createMockFn<MockSeatingGeneratorActions['handleStepChange']>(),
    addStudent: createMockFn<MockSeatingGeneratorActions['addStudent']>(),
    addBulkPlaceholderStudents:
      createMockFn<MockSeatingGeneratorActions['addBulkPlaceholderStudents']>(),
    removeStudent: createMockFn<MockSeatingGeneratorActions['removeStudent']>(),
    clearStudents: createMockFn<MockSeatingGeneratorActions['clearStudents']>(),
    updateStudent: createMockFn<MockSeatingGeneratorActions['updateStudent']>(),
    setStudents: createMockFn<MockSeatingGeneratorActions['setStudents']>(),
    importCsv: createMockFn<MockSeatingGeneratorActions['importCsv']>(),
    downloadStudentsCsv:
      createMockFn<MockSeatingGeneratorActions['downloadStudentsCsv']>(),
    updateClassroomScene:
      createMockFn<MockSeatingGeneratorActions['updateClassroomScene']>(),
    removeTables: createMockFn<MockSeatingGeneratorActions['removeTables']>(),
    generateSeatingPlan:
      createMockFn<MockSeatingGeneratorActions['generateSeatingPlan']>(),
    moveStudent: createMockFn<MockSeatingGeneratorActions['moveStudent']>(),
    refineSeatingLocal:
      createMockFn<MockSeatingGeneratorActions['refineSeatingLocal']>(),
    onMix: createMockFn<MockSeatingGeneratorActions['onMix']>(),
    setPlanName: createMockFn<MockSeatingGeneratorActions['setPlanName']>(),
    setPlanNameError:
      createMockFn<MockSeatingGeneratorActions['setPlanNameError']>(),
    handleSaveSeatingPlan:
      createMockFn<MockSeatingGeneratorActions['handleSaveSeatingPlan']>(),
    isSeatLocked: createMockFn<MockSeatingGeneratorActions['isSeatLocked']>(),
    toggleLock: createMockFn<MockSeatingGeneratorActions['toggleLock']>(),
    saveTemplate: createMockFn<MockSeatingGeneratorActions['saveTemplate']>(),
    updateTemplate:
      createMockFn<MockSeatingGeneratorActions['updateTemplate']>(),
    loadTemplate: createMockFn<MockSeatingGeneratorActions['loadTemplate']>(),
    deleteTemplate:
      createMockFn<MockSeatingGeneratorActions['deleteTemplate']>(),
    renameTemplate:
      createMockFn<MockSeatingGeneratorActions['renameTemplate']>(),
    handleHistoryLoad:
      createMockFn<MockSeatingGeneratorActions['handleHistoryLoad']>(),
    deleteSeatingPlan:
      createMockFn<MockSeatingGeneratorActions['deleteSeatingPlan']>(),
    renameSeatingPlan:
      createMockFn<MockSeatingGeneratorActions['renameSeatingPlan']>(),
    handleMixLoad: createMockFn<MockSeatingGeneratorActions['handleMixLoad']>(),
    deleteMixResult:
      createMockFn<MockSeatingGeneratorActions['deleteMixResult']>(),
    setMixSettings:
      createMockFn<MockSeatingGeneratorActions['setMixSettings']>(),
    setCurrentSeating:
      createMockFn<MockSeatingGeneratorActions['setCurrentSeating']>(),
    handleHomeClick:
      createMockFn<MockSeatingGeneratorActions['handleHomeClick']>(),
    importInputRef: React.createRef<HTMLInputElement>(),
    triggerImport: createMockFn<MockSeatingGeneratorActions['triggerImport']>(),
    handleExportAll:
      createMockFn<MockSeatingGeneratorActions['handleExportAll']>(),
    handleImportFile:
      createMockFn<MockSeatingGeneratorActions['handleImportFile']>(),
    generateCircleSeating:
      createMockFn<MockSeatingGeneratorActions['generateCircleSeating']>(),
    regenerateCircle:
      createMockFn<MockSeatingGeneratorActions['regenerateCircle']>(),
    updateStudentPosition:
      createMockFn<MockSeatingGeneratorActions['updateStudentPosition']>(),
    swapStudentPositions:
      createMockFn<MockSeatingGeneratorActions['swapStudentPositions']>(),
    batchSwapStudentPositions:
      createMockFn<MockSeatingGeneratorActions['batchSwapStudentPositions']>(),
    clearCircleLayout:
      createMockFn<MockSeatingGeneratorActions['clearCircleLayout']>(),
    syncCircleFromTable:
      createMockFn<MockSeatingGeneratorActions['syncCircleFromTable']>(),
    setLastStatistics:
      createMockFn<MockSeatingGeneratorActions['setLastStatistics']>(),
    setShowStatisticsBadge:
      createMockFn<MockSeatingGeneratorActions['setShowStatisticsBadge']>(),
    setSeatingMode:
      createMockFn<MockSeatingGeneratorActions['setSeatingMode']>(),
    acknowledgePostUpdateNotice:
      createMockFn<
        MockSeatingGeneratorActions['acknowledgePostUpdateNotice']
      >(),
    acknowledgeStudentUpdates:
      createMockFn<MockSeatingGeneratorActions['acknowledgeStudentUpdates']>(),
    selectClass: createMockFn<MockSeatingGeneratorActions['selectClass']>(),
    createClass: createMockFn<MockSeatingGeneratorActions['createClass']>(),
    updateClassMetadata:
      createMockFn<MockSeatingGeneratorActions['updateClassMetadata']>(),
    duplicateClass:
      createMockFn<MockSeatingGeneratorActions['duplicateClass']>(),
    deleteClass: createMockFn<MockSeatingGeneratorActions['deleteClass']>(),
  };

  toMock(actions.addStudent).mockImplementation(
    (
      name: string,
      gender?: Student['gender'],
      restless = false,
      shy = false,
      concentrationIssues = false,
      needsFrontSeat = false,
    ) =>
      createMockStudent({
        name,
        gender,
        restless,
        shy,
        concentrationIssues,
        needsFrontSeat,
      }),
  );
  toMock(actions.addBulkPlaceholderStudents).mockImplementation(
    (count: number) => createMockStudents(count),
  );
  toMock(actions.importCsv).mockResolvedValue([]);
  toMock(actions.generateSeatingPlan).mockResolvedValue(
    [] as SeatingArrangement,
  );
  toMock(actions.refineSeatingLocal).mockResolvedValue(
    [] as SeatingArrangement,
  );
  toMock(actions.isSeatLocked).mockReturnValue(false);
  toMock(actions.saveTemplate).mockResolvedValue(true);
  toMock(actions.updateTemplate).mockResolvedValue(true);
  toMock(actions.loadTemplate).mockResolvedValue([]);
  toMock(actions.deleteTemplate).mockResolvedValue(undefined);
  toMock(actions.renameTemplate).mockResolvedValue(true);
  toMock(actions.renameSeatingPlan).mockReturnValue(true);
  toMock(actions.generateCircleSeating).mockResolvedValue({
    students: [],
    radius: { horizontal: 150, vertical: 100 },
    center: { x: 450, y: 300 },
    preservedNeighborhoods: 0,
    totalOriginalNeighborhoods: 0,
    newNeighborhoods: 0,
    preservationRate: 0,
    mode: 'preserve-neighbors',
    timestamp: Date.now(),
    neighborhoodPairs: [],
  } as CircleLayout);
  toMock(actions.regenerateCircle).mockResolvedValue(null);
  toMock(actions.syncCircleFromTable).mockResolvedValue(null);
  toMock(actions.removeStudent).mockImplementation(() => undefined);
  toMock(actions.clearStudents).mockImplementation(() => undefined);
  toMock(actions.updateStudent).mockImplementation(() => undefined);
  toMock(actions.setStudents).mockImplementation(() => undefined);
  toMock(actions.downloadStudentsCsv).mockImplementation(() => undefined);
  toMock(actions.updateClassroomScene).mockImplementation(() => undefined);
  toMock(actions.removeTables).mockImplementation(() => undefined);
  toMock(actions.moveStudent).mockReturnValue(true);
  toMock(actions.onMix).mockImplementation(() => undefined);
  toMock(actions.handleStepChange).mockImplementation(() => undefined);
  toMock(actions.acknowledgeStudentUpdates).mockImplementation(() => undefined);
  toMock(actions.selectClass).mockResolvedValue(true);
  toMock(actions.createClass).mockResolvedValue(true);
  toMock(actions.updateClassMetadata).mockResolvedValue(true);
  toMock(actions.duplicateClass).mockResolvedValue(true);
  toMock(actions.deleteClass).mockResolvedValue(true);
  toMock(actions.addBulkPlaceholderStudents).mockImplementation(
    (count: number) => createMockStudents(count),
  );

  return actions;
};

// Re-export commonly used constants
export { neutralSettings };

// ===== MOCK PROVIDERS =====

/**
 * Mock SeatingPlanProvider that doesn't have circular dependencies
 */
export const MockSeatingPlanProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // Create mock context values
  const mockState = createDefaultMockState();
  const mockActions = createDefaultMockActions();

  const MockStateContext = React.createContext(mockState);
  const MockActionsContext = React.createContext(mockActions);

  return React.createElement(
    MockStateContext.Provider,
    { value: mockState },
    React.createElement(
      MockActionsContext.Provider,
      { value: mockActions },
      children,
    ),
  );
};

// ===== MOCK DATA FACTORIES =====

/**
 * Create a mock Student with default values and optional overrides
 */
export const createMockStudent = (overrides?: Partial<Student>): Student => {
  const base: Student = {
    id: overrides?.id ?? createMockId(),
    name: 'Test Student',
    gender: 'diverse',
    restless: false,
    shy: false,
    concentrationIssues: false,
    needsFrontSeat: false,
    wishPartnerId: null,
    performanceStrong: false,
    performanceWeak: false,
    prefersWindow: false,
    prefersDoor: false,
  };

  return {
    ...base,
    ...overrides,
  } as Student;
};

/**
 * Create multiple mock students at once
 */
export const createMockStudents = (
  count: number,
  baseOverrides?: Partial<Student>,
): Student[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockStudent({
      name: `Student ${index + 1}`,
      ...baseOverrides,
    }),
  );
};

/**
 * Create a mock ClassroomTable with default values (using new template system)
 */
export const createMockTable = (
  overrides?: Partial<ClassroomTable>,
): ClassroomTable => ({
  x: 100,
  y: 100,
  width: 55, // Default to new double table dimensions
  height: 130,
  rotation: 0, // All tables use 0° rotation now
  seatCount: 2,
  locked: false,
  zIndex: 0,
  templateType: 'double',
  ...overrides,
});

/**
 * Create a mock ClassroomScene with tables and student count
 */
export const createMockClassroomScene = (
  tableCount: number = 0,
  overrides?: Partial<ClassroomScene>,
): ClassroomScene => ({
  totalStudents: tableCount * 2, // Assuming double tables by default (2 seats each)
  tables: Array.from({ length: tableCount }, (_, index) =>
    createMockTable({
      x: 100 + (index % 3) * 100, // Use new table width (55) + spacing
      y: 100 + Math.floor(index / 3) * 150, // Use new table height (130) + spacing
      zIndex: index,
    }),
  ),
  features: overrides?.features ?? [],
  ...overrides,
});

/**
 * Create a mock SavedPlan
 */
export const createMockSavedPlan = (
  overrides?: Partial<SavedPlan>,
): SavedPlan => ({
  id: createMockId(),
  name: 'Test Plan',
  scene: createMockClassroomScene(4),
  seating: [],
  date: new Date().toLocaleDateString('de-DE'),
  ...overrides,
});

/**
 * Create a mock MixResult
 */
export const createMockMixResult = (
  overrides?: Partial<MixResult>,
): MixResult => ({
  id: 1,
  seating: [],
  mixSettings: neutralSettings,
  timestamp: new Date().toISOString(),
  ...overrides,
});

/**
 * Create a mock ClassroomTemplate
 */
export const createMockTemplate = (
  overrides?: Partial<ClassroomTemplate>,
): ClassroomTemplate => ({
  id: 1,
  name: 'Test Template',
  scene: createMockClassroomScene(6),
  ...overrides,
});

/**
 * Create a mock SeatingArrangement
 */
export const createMockSeatingArrangement = (
  students: Student[] = [],
  scene: ClassroomScene = createMockClassroomScene(),
): SeatingArrangement => {
  const arrangement: SeatingArrangement = [];

  scene.tables.forEach((table, tableIndex) => {
    const tableSeats = [];
    const seatsPerTable = table.seatCount; // Use the seatCount property

    for (let seatIndex = 0; seatIndex < seatsPerTable; seatIndex++) {
      const studentIndex = tableIndex * seatsPerTable + seatIndex;
      tableSeats.push(students[studentIndex] || null);
    }

    arrangement.push(tableSeats);
  });

  return arrangement;
};

// ===== RENDER HELPERS =====

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withRouter?: boolean;
  withProvider?: boolean;
  routerProps?: {
    initialEntries?: string[];
    initialIndex?: number;
  };
}

/**
 * Custom render function that wraps components with common providers
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {},
) => {
  const {
    withRouter = false,
    withProvider = true,
    routerProps = {},
    ...renderOptions
  } = options;

  const BaseWrapper: React.ComponentType<{ children: React.ReactNode }> = ({
    children,
  }) => children as React.ReactElement;
  BaseWrapper.displayName = 'BaseWrapper';
  let Wrapper: React.ComponentType<{ children: React.ReactNode }> = BaseWrapper;

  if (withRouter) {
    const PreviousWrapper = Wrapper;
    const RouterWrapper: React.ComponentType<{ children: React.ReactNode }> = ({
      children,
    }) =>
      React.createElement(
        PreviousWrapper,
        null,
        React.createElement(MemoryRouter, routerProps, children),
      );
    RouterWrapper.displayName = 'RouterWrapper';
    Wrapper = RouterWrapper;
  }

  if (withProvider) {
    const PreviousWrapper = Wrapper;
    const ProviderWrapper: React.ComponentType<{
      children: React.ReactNode;
    }> = ({ children }) =>
      React.createElement(
        PreviousWrapper,
        null,
        React.createElement(SeatingPlanGeneratorProvider, null, children),
      );
    ProviderWrapper.displayName = 'ProviderWrapper';
    Wrapper = ProviderWrapper;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

/**
 * Render with both SeatingPlanProvider and MemoryRouter
 */
export const renderWithProvidersAndRouter = (
  ui: React.ReactElement,
  options?: CustomRenderOptions,
) => {
  return renderWithProviders(ui, {
    withRouter: true,
    withProvider: true,
    ...options,
  });
};

// ===== MOCK FUNCTION FACTORIES =====

/**
 * Create a complete mock for useSeatingGenerator hook
 */
const buildSeatingGeneratorBase = (): MockSeatingGenerator => {
  const state = createDefaultMockState();
  const actions = createDefaultMockActions();

  return {
    ...state,
    ...actions,
    state,
    actions,
  };
};

export const createMockSeatingGenerator = (
  overrides: SeatingGeneratorOverrides = {},
): MockSeatingGenerator => {
  const base = buildSeatingGeneratorBase();

  const mergedState = overrides.state
    ? { ...base.state, ...overrides.state }
    : base.state;
  const mergedActions = overrides.actions
    ? { ...base.actions, ...overrides.actions }
    : base.actions;

  return {
    ...base,
    ...overrides,
    ...mergedState,
    ...mergedActions,
    state: mergedState,
    actions: mergedActions,
  };
};

export const createMockSeatingPlanViewProps = (
  overrides: Partial<SeatingPlanViewProps> = {},
): SeatingPlanViewProps => {
  const defaultProps: SeatingPlanViewProps = {
    currentSeating: [],
    generateSeatingPlan:
      createMockFn<SeatingPlanViewProps['generateSeatingPlan']>(),
    settings: neutralSettings,
    setMixSettings: createMockFn<SeatingPlanViewProps['setMixSettings']>(),
    classroomScene: createMockClassroomScene(),
    students: [],
    studentsCount: 0,
    planName: '',
    setPlanName: createMockFn<SeatingPlanViewProps['setPlanName']>(),
    saveSeatingPlan: createMockFn<SeatingPlanViewProps['saveSeatingPlan']>(),
    planNameError: false,
    setPlanNameError: createMockFn<SeatingPlanViewProps['setPlanNameError']>(),
    planNameInputRef: React.createRef<HTMLInputElement>(),
    updateClassroomScene:
      createMockFn<SeatingPlanViewProps['updateClassroomScene']>(),
    removeTables: createMockFn<SeatingPlanViewProps['removeTables']>(),
    onEditStudents: createMockFn<SeatingPlanViewProps['onEditStudents']>(),
    onEditLayout: createMockFn<SeatingPlanViewProps['onEditLayout']>(),
    onProceedToPlan: createMockFn<SeatingPlanViewProps['onProceedToPlan']>(),
    step: 2,
    moveStudent:
      createMockFn<NonNullable<SeatingPlanViewProps['moveStudent']>>(),
    isSeatLocked:
      createMockFn<NonNullable<SeatingPlanViewProps['isSeatLocked']>>(),
    toggleLock: createMockFn<NonNullable<SeatingPlanViewProps['toggleLock']>>(),
    refineSeatingLocal:
      createMockFn<NonNullable<SeatingPlanViewProps['refineSeatingLocal']>>(),
    onMix: createMockFn<NonNullable<SeatingPlanViewProps['onMix']>>(),
    seatingMode: 'table',
    onModeChange:
      createMockFn<NonNullable<SeatingPlanViewProps['onModeChange']>>(),
    showModeToggle: false,
    lastStatistics: null,
    onCloseStatistics:
      createMockFn<NonNullable<SeatingPlanViewProps['onCloseStatistics']>>(),
    onOpenStatistics:
      createMockFn<NonNullable<SeatingPlanViewProps['onOpenStatistics']>>(),
    showStatisticsBadge: false,
    hasPendingStudentUpdates: false,
    onAcknowledgeStudentUpdates:
      createMockFn<
        NonNullable<SeatingPlanViewProps['onAcknowledgeStudentUpdates']>
      >(),
    autoMixing: false,
    autoMixError: null,
  };

  toMock(defaultProps.generateSeatingPlan).mockResolvedValue(
    [] as SeatingArrangement,
  );
  if (defaultProps.moveStudent) {
    toMock(defaultProps.moveStudent).mockReturnValue(true);
  }
  if (defaultProps.isSeatLocked) {
    toMock(defaultProps.isSeatLocked).mockReturnValue(false);
  }
  if (defaultProps.refineSeatingLocal) {
    toMock(defaultProps.refineSeatingLocal).mockResolvedValue(
      [] as SeatingArrangement,
    );
  }

  return {
    ...defaultProps,
    ...overrides,
  };
};

export const createMockStudentInputProps = (
  overrides: Partial<StudentInputProps> = {},
): StudentInputProps => {
  const defaultProps: StudentInputProps = {
    students: [],
    addStudent: createMockFn<StudentInputProps['addStudent']>(),
    addBulkPlaceholderStudents:
      createMockFn<StudentInputProps['addBulkPlaceholderStudents']>(),
    removeStudent: createMockFn<StudentInputProps['removeStudent']>(),
    removeStudents: createMockFn<StudentInputProps['removeStudents']>(),
    updateStudent: createMockFn<StudentInputProps['updateStudent']>(),
    updateStudents: createMockFn<StudentInputProps['updateStudents']>(),
    importCsv: createMockFn<StudentInputProps['importCsv']>(),
    downloadStudentsCsv:
      createMockFn<StudentInputProps['downloadStudentsCsv']>(),
    onProceedToLayout: createMockFn<StudentInputProps['onProceedToLayout']>(),
    onProceedToPlan: createMockFn<StudentInputProps['onProceedToPlan']>(),
  };

  toMock(defaultProps.addStudent).mockImplementation(
    (name: string, gender?: Student['gender']) =>
      createMockStudent({ name, gender }),
  );
  toMock(defaultProps.addBulkPlaceholderStudents).mockImplementation(
    (count: number) => createMockStudents(count),
  );
  toMock(defaultProps.importCsv).mockResolvedValue([]);

  return {
    ...defaultProps,
    ...overrides,
  };
};

// ===== TEST SETUP HELPERS =====

/**
 * Common beforeEach setup for tests that need clean localStorage
 */
export const setupCleanStorage = () => {
  // This can be imported and used in beforeEach blocks
  const clearProjectLocalStorage = () => {
    // Clear all localStorage items that start with app-specific prefixes
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('klassenplan-') || key.startsWith('seating-')) {
        localStorage.removeItem(key);
      }
    });
  };

  clearProjectLocalStorage();
};

/**
 * Create a test file object for CSV import tests
 */
export const createMockCsvFile = (
  content: string,
  filename = 'test.csv',
): File => {
  return new File([content], filename, { type: 'text/csv' });
};

/**
 * Create a test JSON file object for backup import tests
 */
export const createMockJsonFile = (
  content: object,
  filename = 'backup.json',
): File => {
  return new File([JSON.stringify(content)], filename, {
    type: 'application/json',
  });
};
