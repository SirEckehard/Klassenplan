// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSeatingGenerator } from '../useSeatingGenerator';
import { useSeatingState } from '../useSeatingState';
import { useSeatingPersistence } from '../useSeatingPersistence';
import { useSeatingAlgorithm } from '../useSeatingAlgorithm';
import useDataBackup from '../useDataBackup';
import { useCircleActions } from '../useCircleSeating';
import { useSeatingWizard } from '../wizard/useSeatingWizard';
import { useCircleAfterMix } from '../circle/useCircleAfterMix';
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

vi.mock('../circle/useCircleAfterMix', () => ({
  useCircleAfterMix: vi.fn(),
}));

vi.mock('../useSeatingStatisticsUpdater', () => ({
  useSeatingStatisticsUpdater: vi.fn(),
}));

// Asked whether another window changed the open class; nothing else here
// reaches the repository.
const { repositoryStub } = vi.hoisted(() => ({
  repositoryStub: { isOpenClassChangedElsewhere: vi.fn() },
}));

vi.mock('../useSeatingRepository', () => ({
  useSeatingRepository: () => repositoryStub,
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
  const mockedUseCircleAfterMix = vi.mocked(useCircleAfterMix);
  const mockedUseSeatingStatisticsUpdater = vi.mocked(
    useSeatingStatisticsUpdater,
  );

  let mockMoveStudent: ReturnType<typeof vi.fn>;
  let mockSetShouldRegenerateCircle: Mock<(should: boolean) => void>;
  let mockHandleMix: Mock<() => void>;
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
      roomState: {
        rooms: [],
        setRooms: vi.fn(),
        activeRoomId: null,
        setActiveRoomId: vi.fn(),
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
      roomState: { ...baseState.roomState, ...overrides.roomState },
      classState: { ...baseState.classState, ...overrides.classState },
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockMoveStudent = vi.fn().mockReturnValue(true);
    mockSetShouldRegenerateCircle = vi.fn();
    mockHandleMix = vi.fn();
    circleLayout = circleLayoutTemplate;

    // Mock useSeatingState
    mockedUseSeatingState.mockReturnValue(createSeatingStateMock());
    repositoryStub.isOpenClassChangedElsewhere.mockResolvedValue({
      success: true,
      data: false,
    });

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
    } as unknown as ReturnType<typeof useSeatingAlgorithm>);

    mockedUseDataBackup.mockReturnValue({
      importInputRef: { current: null },
      triggerImport: vi.fn(),
      handleExportAll: vi.fn(),
      handleImportFile: vi.fn(),
      importBackupFile: vi.fn(),
    });

    mockedUseCircleActions.mockImplementation(() => ({
      setCircleLayout: vi.fn(),
      generateCircleSeating: vi.fn().mockResolvedValue(null),
      regenerateCircle: vi.fn().mockResolvedValue(null),
      updateStudentPosition: vi.fn(),
      swapStudentPositions: vi.fn(),
      batchSwapStudentPositions: vi.fn(),
      toggleCircleLock: vi.fn(),
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

    mockedUseCircleAfterMix.mockReturnValue({
      shouldRegenerateCircle: false,
      setShouldRegenerateCircle: mockSetShouldRegenerateCircle,
      handleMix: mockHandleMix,
    });
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

  it('zeichnet nach dem Mischen nur den Sitzkreis neu, ohne nachzuverfeinern', () => {
    const { result } = renderHook(() => useSeatingGenerator());

    act(() => {
      result.current.onMix();
    });

    expect(mockHandleMix).toHaveBeenCalledTimes(1);
    // A mix refines in its own session (decision 0027); the wizard's own mix
    // gets no hook to start a second refinement either.
    const wizardArgs = mockedUseSeatingWizard.mock.calls.at(-1)?.[0];
    expect(wizardArgs).not.toHaveProperty('onAutoMixTriggered');
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

  describe('coming back to the window', () => {
    let visibility: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      visibility = vi
        .spyOn(document, 'visibilityState', 'get')
        .mockReturnValue('visible');
    });

    afterEach(() => {
      visibility.mockRestore();
    });

    const comeBack = async () => {
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
        // The check and the reload settle after the event.
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    };

    const reloads = () =>
      mockedUseSeatingPersistence.mock.results.at(-1)!.value
        .reloadCurrentClassData as Mock;

    it('loads the open class anew when another window changed it', async () => {
      repositoryStub.isOpenClassChangedElsewhere.mockResolvedValue({
        success: true,
        data: true,
      });
      const { result } = renderHook(() => useSeatingGenerator());

      await comeBack();

      expect(reloads()).toHaveBeenCalledTimes(1);
      expect(result.current.state.reloadGeneration).toBe(1);
    });

    it('leaves the class alone when no other window changed it', async () => {
      const { result } = renderHook(() => useSeatingGenerator());

      await comeBack();

      expect(repositoryStub.isOpenClassChangedElsewhere).toHaveBeenCalled();
      expect(reloads()).not.toHaveBeenCalled();
      expect(result.current.state.reloadGeneration).toBe(0);
    });
  });

  describe('restoring a backup', () => {
    /**
     * A list the mocked actions really change, so the class list's undo
     * history records a step.
     */
    const renderWithEditableList = () => {
      let list = [...mockStudents];
      mockedUseSeatingState.mockReturnValue(
        createSeatingStateMock({
          studentState: {
            getStudents: () => list,
            removeStudent: vi.fn((id: string) => {
              list = list.filter((entry) => entry.id !== id);
            }),
          },
        }),
      );
      const view = renderHook(() => useSeatingGenerator());
      act(() => {
        view.result.current.actions.removeStudent('1');
        view.result.current.moveStudent(0, 0, 0, 1);
      });
      expect(view.result.current.state.canUndoStudents).toBe(true);
      expect(view.result.current.state.canUndoSeating).toBe(true);
      return view;
    };

    const restore = async (outcome: { merge: boolean }) => {
      vi.mocked(
        mockedUseSeatingPersistence.mock.results.at(-1)!.value
          .importAllFromJson,
      ).mockResolvedValue(outcome);
      const { importAllFromJson } = mockedUseDataBackup.mock.calls.at(-1)![0];
      await act(async () => {
        await importAllFromJson('{}', { merge: outcome.merge });
      });
    };

    it('drops the undo steps and starts the views afresh when it replaced everything', async () => {
      const { result } = renderWithEditableList();
      expect(result.current.state.reloadGeneration).toBe(0);

      await restore({ merge: false });

      expect(result.current.state.canUndoStudents).toBe(false);
      expect(result.current.state.canUndoSeating).toBe(false);
      expect(result.current.state.reloadGeneration).toBe(1);
    });

    it('keeps the open class’s undo steps after a merge', async () => {
      const { result } = renderWithEditableList();

      await restore({ merge: true });

      expect(result.current.state.canUndoStudents).toBe(true);
      expect(result.current.state.canUndoSeating).toBe(true);
      expect(result.current.state.reloadGeneration).toBe(0);
    });
  });
});
