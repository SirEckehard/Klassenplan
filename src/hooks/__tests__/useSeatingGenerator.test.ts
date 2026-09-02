// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { AutoMixTriggerHandler } from '../algorithm/useAutoMixTriggers';
import { renderHook, act } from '@testing-library/react';
import { useSeatingGenerator } from '../useSeatingGenerator';
import { useSeatingState } from '../useSeatingState';
import { useSeatingPersistence } from '../useSeatingPersistence';
import { useSeatingAlgorithm } from '../useSeatingAlgorithm';
import useDataBackup from '../useDataBackup';
import { useCircleActions } from '../useCircleSeating';
import { useSeatingWizard } from '../wizard/useSeatingWizard';
import { useAutoMixTrigger } from '../wizard/useAutoMixTrigger';
import { useAutoMixTriggers } from '../algorithm/useAutoMixTriggers';
import { useSeatingStatisticsUpdater } from '../useSeatingStatisticsUpdater';
import { neutralSettings, normalizeMixSettings } from '../../utils';
import type { Student, ClassroomScene, MixSettings } from '../../types';
import type { CircleLayout } from '../../types/Circle';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../useSeatingState', () => ({
  useSeatingState: vi.fn(),
}));

vi.mock('../useSeatingPersistence', () => ({
  useSeatingPersistence: vi.fn(),
}));

vi.mock('../useSeatingAlgorithm', () => ({
  useSeatingAlgorithm: vi.fn(),
}));

vi.mock('../useDataBackup', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../useCircleSeating', () => ({
  useCircleSeating: vi.fn(),
  useCircleActions: vi.fn(),
}));

vi.mock('../wizard/useSeatingWizard', () => ({
  useSeatingWizard: vi.fn(),
}));

vi.mock('../wizard/useAutoMixTrigger', () => ({
  useAutoMixTrigger: vi.fn(),
}));

vi.mock('../algorithm/useAutoMixTriggers', () => ({
  useAutoMixTriggers: vi.fn(),
}));

vi.mock('../useSeatingStatisticsUpdater', () => ({
  useSeatingStatisticsUpdater: vi.fn(),
}));

describe('useSeatingGenerator', () => {
  const student = (id: string, name: string): Student => ({
    id,
    name,
    gender: 'diverse',
    restless: false,
    shy: false,
    concentrationIssues: false,
    needsFrontSeat: false,
    performanceStrong: false,
    performanceWeak: false,
    wishPartnerId: null,
  });

  const classroomScene: ClassroomScene = {
    totalStudents: 2,
    tables: [
      {
        x: 0,
        y: 0,
        width: 100,
        height: 60,
        rotation: 0,
        seatCount: 2,
        locked: false,
        zIndex: 0,
      },
    ],
  };

  const mixSettings: MixSettings = normalizeMixSettings(neutralSettings);

  const circleLayoutTemplate: CircleLayout = {
    students: [
      {
        student: student('1', 'Alice'),
        angle: 0,
        x: 0,
        y: 0,
        preservedNeighbors: [],
        lostNeighbors: [],
        newNeighbors: [],
      },
    ],
    radius: { horizontal: 100, vertical: 80 },
    center: { x: 0, y: 0 },
    preservedNeighborhoods: 0,
    totalOriginalNeighborhoods: 0,
    newNeighborhoods: 0,
    preservationRate: 0,
    mode: 'preserve-neighbors',
    timestamp: Date.now(),
    neighborhoodPairs: [],
  };

  const mockedUseSeatingState = vi.mocked(useSeatingState);
  const mockedUseSeatingPersistence = vi.mocked(useSeatingPersistence);
  const mockedUseSeatingAlgorithm = vi.mocked(useSeatingAlgorithm);
  const mockedUseDataBackup = vi.mocked(useDataBackup);
  const mockedUseCircleActions = vi.mocked(useCircleActions);
  const mockedUseSeatingWizard = vi.mocked(useSeatingWizard);
  const mockedUseAutoMixTrigger = vi.mocked(useAutoMixTrigger);
  const mockedUseAutoMixTriggers = vi.mocked(useAutoMixTriggers);
  const mockedUseSeatingStatisticsUpdater = vi.mocked(
    useSeatingStatisticsUpdater,
  );

  let mockMoveStudent: ReturnType<typeof vi.fn>;
  let mockSetShouldRegenerateCircle: Mock<(should: boolean) => void>;
  let mockRequestAutoRefine: Mock<() => void>;
  let mockHandleMix: Mock<() => void>;
  let mockTriggerAutoMixEvent: Mock<AutoMixTriggerHandler>;
  let circleLayout: CircleLayout | null;

  type SeatingStateSlice = ReturnType<typeof useSeatingState>;

  const mockStudents = [student('1', 'Alice'), student('2', 'Bob')];

  const createSeatingStateMock = (overrides: any = {}): SeatingStateSlice => {
    const baseState = {
      studentState: {
        students: mockStudents,
        // The undo history reads the committed list synchronously; the mocked
        // actions never write, so this always returns the initial two.
        getStudents: () => mockStudents,
        setStudents: vi.fn(),
        addStudent: vi.fn(),
        addBulkPlaceholderStudents: vi.fn(),
        removeStudent: vi.fn(),
        removeStudents: vi.fn(),
        clearStudents: vi.fn(),
        updateStudent: vi.fn(),
        updateStudents: vi.fn(),
        importCsv: vi.fn(),
        moveStudent: mockMoveStudent,
        hasPendingStudentUpdates: false,
        acknowledgeStudentUpdates: vi.fn(),
      },
      sceneState: {
        classroomScene,
        setClassroomScene: vi.fn(),
        classroomEdited: false,
        setClassroomEdited: vi.fn(),
        seatCount: 2,
        removeTables: vi.fn(),
        seatingMode: 'table' as const,
        setSeatingMode: vi.fn(),
        circleLayout,
        setCircleLayout: vi.fn(),
        circleGenerationInProgress: false,
        setCircleGenerationInProgress: vi.fn(),
        circleGenerationStatus: null,
        setCircleGenerationStatus: vi.fn(),
      },
      algorithmState: {
        mixSettings,
        setMixSettings: vi.fn(),
        lockedPositions: {},
        setLockedPositions: vi.fn(),
        toggleLock: vi.fn(),
        isSeatLocked: vi.fn().mockReturnValue(false),
        lastStatistics: null,
        setLastStatistics: vi.fn(),
        showStatisticsBadge: false,
        setShowStatisticsBadge: vi.fn(),
        statisticsHighlight: null,
        setStatisticsHighlight: vi.fn(),
        setStatisticsHighlightMode: vi.fn(),
        clearStatisticsHighlight: vi.fn(),
      },
      historyState: {
        seatingHistory: [],
        setSeatingHistory: vi.fn(),
        mixHistory: [],
        setMixHistory: vi.fn(),
        addMixResult: vi.fn(),
        deleteMixResult: vi.fn(),
        clearMixHistory: vi.fn(),
      },
      planState: {
        currentSeating: [[student('1', 'Alice'), student('2', 'Bob')]],
        setCurrentSeating: vi.fn(),
        planName: 'Plan',
        setPlanName: vi.fn(),
        planNameError: false,
        setPlanNameError: vi.fn(),
        activePlanId: null,
        setActivePlanId: vi.fn(),
      },
      classState: {
        classSummaries: [],
        setClassSummaries: vi.fn(),
        activeClass: { id: 'mock-class', name: 'Mock Klasse' },
        setActiveClass: vi.fn(),
      },
    };

    return {
      ...baseState,
      ...overrides,
      studentState: { ...baseState.studentState, ...overrides.studentState },
      sceneState: { ...baseState.sceneState, ...overrides.sceneState },
      algorithmState: {
        ...baseState.algorithmState,
        ...overrides.algorithmState,
      },
      historyState: { ...baseState.historyState, ...overrides.historyState },
      planState: { ...baseState.planState, ...overrides.planState },
      classState: { ...baseState.classState, ...overrides.classState },
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockMoveStudent = vi.fn().mockReturnValue(true);
    mockSetShouldRegenerateCircle = vi.fn();
    mockRequestAutoRefine = vi.fn();
    mockHandleMix = vi.fn();
    mockTriggerAutoMixEvent = vi.fn();
    circleLayout = circleLayoutTemplate;

    // Mock useSeatingState
    mockedUseSeatingState.mockReturnValue(createSeatingStateMock());

    // Mock useSeatingPersistence
    mockedUseSeatingPersistence.mockReturnValue({
      saveSeatingPlan: vi.fn().mockReturnValue(true),
      loadSeatingPlan: vi.fn(),
      deleteSeatingPlan: vi.fn(),
      renameSeatingPlan: vi.fn(),
      saveTemplate: vi.fn(),
      updateTemplate: vi.fn(),
      loadTemplate: vi.fn(),
      deleteTemplate: vi.fn(),
      renameTemplate: vi.fn(),
      downloadStudentsCsv: vi.fn(),
      exportAllAsJson: vi.fn(),
      importAllFromJson: vi.fn(),
      clearAllData: vi.fn(),
      reloadCurrentClassData: vi.fn().mockResolvedValue({
        currentSeating: [],
        circleLayout: null,
        lockedPositions: {},
      }),
    } as unknown as ReturnType<typeof useSeatingPersistence>);

    // Mock useSeatingAlgorithm
    mockedUseSeatingAlgorithm.mockReturnValue({
      generateSeatingPlan: vi.fn(),
      refineSeatingLocal: vi.fn(),
    } as unknown as ReturnType<typeof useSeatingAlgorithm>);

    mockedUseDataBackup.mockReturnValue({
      importInputRef: { current: null },
      triggerImport: vi.fn(),
      handleExportAll: vi.fn(),
      handleImportFile: vi.fn(),
    });

    mockedUseCircleActions.mockImplementation(() => ({
      setCircleLayout: vi.fn(),
      generateCircleSeating: vi.fn().mockResolvedValue(null),
      regenerateCircle: vi.fn().mockResolvedValue(null),
      updateStudentPosition: vi.fn(),
      swapStudentPositions: vi.fn(),
      batchSwapStudentPositions: vi.fn(),
      clearCircleLayout: vi.fn(),
      circleGenerationInProgress: false,
      syncCircleFromTable: vi.fn().mockResolvedValue(null),
      cancelCircleGeneration: vi.fn(),
    }));

    mockedUseSeatingWizard.mockImplementation(() => ({
      step: 3,
      classroomEdited: false,
      planNameError: false,
      planNameInputRef: { current: null },
      autoMixing: false,
      autoMixError: null,
      handleStepChange: vi.fn(),
      setStep: vi.fn(),
      setClassroomEdited: vi.fn(),
      setPlanNameError: vi.fn(),
    }));

    mockedUseAutoMixTrigger.mockReturnValue({
      pendingRefine: false,
      shouldRegenerateCircle: false,
      requestAutoRefine: mockRequestAutoRefine,
      setShouldRegenerateCircle: mockSetShouldRegenerateCircle,
      handleMix: mockHandleMix,
      triggerAutoMixEvent: mockTriggerAutoMixEvent,
    });

    mockedUseAutoMixTriggers.mockReturnValue(mockTriggerAutoMixEvent);
    mockedUseSeatingStatisticsUpdater.mockImplementation(() => undefined);
  });

  it('bietet gruppierte state- und action-Objekte für den Kontext', () => {
    const { result } = renderHook(() => useSeatingGenerator());

    expect(result.current.state).toBeDefined();
    expect(result.current.actions).toBeDefined();
    expect(result.current.state.step).toBe(3);
    const mockedStateStore = mockedUseSeatingState.mock.results[0].value;
    expect(result.current.state.students).toEqual(
      mockedStateStore.studentState.students,
    );
    const wizardInvocation =
      mockedUseSeatingWizard.mock.results[
        mockedUseSeatingWizard.mock.results.length - 1
      ];
    expect(result.current.actions.handleStepChange).toBe(
      wizardInvocation.value.handleStepChange,
    );
  });

  it('plant einen Circle-Refresh nach manuellem Verschieben mit Kreislayout', () => {
    const { result } = renderHook(() => useSeatingGenerator());

    act(() => {
      result.current.moveStudent(0, 0, 0, 1);
    });

    expect(mockMoveStudent).toHaveBeenCalledWith(0, 0, 0, 1);
    expect(mockSetShouldRegenerateCircle).toHaveBeenCalledTimes(1);
    expect(mockSetShouldRegenerateCircle).toHaveBeenCalledWith(true);
  });

  it('fordert keinen Circle-Refresh an, wenn das Verschieben blockiert wird', () => {
    mockMoveStudent.mockReturnValueOnce(false);
    const { result } = renderHook(() => useSeatingGenerator());

    act(() => {
      result.current.moveStudent(0, 0, 0, 1);
    });

    expect(mockMoveStudent).toHaveBeenCalledWith(0, 0, 0, 1);
    expect(mockSetShouldRegenerateCircle).not.toHaveBeenCalled();
  });

  it('löst ohne Kreislayout keinen Circle-Refresh aus', () => {
    mockedUseSeatingState.mockReturnValueOnce(
      createSeatingStateMock({ sceneState: { circleLayout: null } }),
    );

    const { result } = renderHook(() => useSeatingGenerator());

    act(() => {
      result.current.moveStudent(0, 0, 0, 1);
    });

    expect(mockMoveStudent).toHaveBeenCalledWith(0, 0, 0, 1);
    expect(mockSetShouldRegenerateCircle).not.toHaveBeenCalled();
  });

  it('plant nach Mix-Aktion automatisch eine Nachverfeinerung', () => {
    const { result } = renderHook(() => useSeatingGenerator());

    act(() => {
      result.current.onMix();
    });

    expect(mockTriggerAutoMixEvent).toHaveBeenCalledTimes(1);
    expect(mockTriggerAutoMixEvent).toHaveBeenCalledWith(
      'manual-mix',
      expect.objectContaining({ source: 'manual-mix' }),
    );
    expect(mockHandleMix).toHaveBeenCalledTimes(1);
  });

  it('reicht Auto-Mix-Trigger weiter, um Nachverfeinerungen zu starten', () => {
    renderHook(() => useSeatingGenerator());

    const lastWizardCall =
      mockedUseSeatingWizard.mock.calls[
        mockedUseSeatingWizard.mock.calls.length - 1
      ];
    const wizardArgs = lastWizardCall?.[0];
    expect(wizardArgs?.onAutoMixTriggered).toBeTypeOf('function');

    act(() => {
      wizardArgs?.onAutoMixTriggered?.();
    });

    expect(mockTriggerAutoMixEvent).toHaveBeenCalledWith(
      'wizard-auto-mix',
      expect.objectContaining({ source: 'wizard' }),
    );
  });

  it('setzt Pending-Updates nicht bei reiner Namensänderung', () => {
    const { result, rerender } = renderHook(() => useSeatingGenerator());

    expect(result.current.hasPendingStudentUpdates).toBe(false);

    act(() => {
      result.current.updateStudent('1', { name: 'Alice Neu' });
    });

    mockedUseSeatingState.mockReturnValueOnce(
      createSeatingStateMock({
        studentState: { hasPendingStudentUpdates: false },
      }),
    );
    rerender();

    expect(result.current.hasPendingStudentUpdates).toBe(false);

    act(() => {
      result.current.updateStudent('1', { gender: 'girl' });
    });

    mockedUseSeatingState.mockReturnValueOnce(
      createSeatingStateMock({
        studentState: { hasPendingStudentUpdates: true },
      }),
    );
    rerender();

    expect(result.current.hasPendingStudentUpdates).toBe(true);
  });
});
