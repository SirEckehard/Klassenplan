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
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSeatingWizard, type WizardConfig } from '../useSeatingWizard';
import type {
  Student,
  ClassroomScene,
  SeatingArrangement,
} from '../../../types';
import type { CircleLayout } from '../../../types/Circle';
import { confirmDialog } from '../../../services/ui/dialogs';
import { neutralSettings, normalizeMixSettings, TOAST_MESSAGES } from '@/utils';
import i18n from '@/i18n';
import { resetAlgorithmStore } from '@/stores/algorithmStore';

// Mock dependencies
let mockLocationState: { step?: number } | null = null;
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ state: mockLocationState }),
}));

const { showToastMock, logErrorMock } = vi.hoisted(() => ({
  showToastMock: vi.fn(),
  logErrorMock: vi.fn(),
}));
vi.mock('@/utils', async () => {
  const actual = await vi.importActual<typeof import('@/utils')>('@/utils');
  return {
    ...actual,
    showToast: showToastMock,
    logError: logErrorMock,
  };
});

vi.mock('@/services/ui/dialogs', () => ({
  confirmDialog: vi.fn(),
}));

vi.mock('@/utils/ui/scroll', () => ({
  triggerScrollToTop: vi.fn(),
}));

describe('useSeatingWizard', () => {
  let mockConfig: WizardConfig;
  let mockSaveSeatingPlanWithCircle: Mock<WizardConfig['saveSeatingPlan']>;
  let markClassroomSyncedMock: Mock<WizardConfig['markClassroomSynced']>;
  let syncSeatingSnapshotMock: Mock<WizardConfig['syncSeatingSnapshot']>;

  const createMockStudent = (
    id: string,
    name: string,
    overrides: Partial<Student> = {},
  ): Student => ({
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
    ...overrides,
  });

  const createMockScene = (): ClassroomScene => ({
    totalStudents: 4,
    tables: [
      {
        x: 100,
        y: 100,
        width: 100,
        height: 60,
        rotation: 0,
        seatCount: 4,
        locked: false,
        zIndex: 0,
      },
    ],
  });

  const createMockCircleLayout = (): CircleLayout => ({
    students: [
      {
        student: createMockStudent('1', 'Alice'),
        angle: 0,
        x: 600,
        y: 300,
        preservedNeighbors: [],
        lostNeighbors: [],
        newNeighbors: [],
      },
    ],
    radius: { horizontal: 200, vertical: 150 },
    center: { x: 0, y: 0 },
    preservedNeighborhoods: 0,
    totalOriginalNeighborhoods: 0,
    newNeighborhoods: 0,
    preservationRate: 0,
    mode: 'preserve-neighbors',
    timestamp: 0,
    neighborhoodPairs: [],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resetAlgorithmStore();
    mockLocationState = null;
    mockSaveSeatingPlanWithCircle = vi.fn().mockReturnValue(true);
    markClassroomSyncedMock = vi.fn();
    syncSeatingSnapshotMock = vi.fn();

    mockConfig = {
      students: [
        createMockStudent('1', 'Alice'),
        createMockStudent('2', 'Bob'),
      ],
      currentSeating: [
        [createMockStudent('1', 'Alice'), null],
        [null, null],
      ],
      planName: 'Test Plan',
      hasUnsavedSeatingChanges: true,
      classroomScene: createMockScene(),
      classroomEdited: false,
      mixSettings: normalizeMixSettings(neutralSettings),
      saveSeatingPlan: mockSaveSeatingPlanWithCircle,
      circleLayout: null,
      setPlanName: vi.fn(),
      setMixSettings: vi.fn(),
      generateSeatingPlan: vi.fn(),
      setClassroomEdited: vi.fn(),
      markClassroomSynced: markClassroomSyncedMock,
      syncSeatingSnapshot: syncSeatingSnapshotMock,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('location state handling', () => {
    it('applies location.state.step once and allows manual navigation afterwards', async () => {
      mockLocationState = { step: 3 };
      const { result } = renderHook(() => useSeatingWizard(mockConfig));

      await waitFor(() => {
        expect(result.current.step).toBe(3);
      });

      act(() => {
        result.current.setStep(2);
      });

      expect(result.current.step).toBe(2);
    });
  });

  describe('Circle Layout Persistence', () => {
    it('saves circle layout when navigating backward from step 3 with benanntem plan', async () => {
      const circleLayout = createMockCircleLayout();
      mockConfig.circleLayout = circleLayout;

      const { result } = renderHook(() => useSeatingWizard(mockConfig));

      // Simulate being on step 3
      act(() => {
        result.current.setStep(3);
      });

      // Navigate backward to step 2
      await act(async () => {
        await result.current.handleStepChange(2);
      });

      expect(mockSaveSeatingPlanWithCircle).toHaveBeenCalledWith(
        'Test Plan',
        mockConfig.classroomScene,
        circleLayout,
        { autoSave: false },
      );
      expect(markClassroomSyncedMock).toHaveBeenCalledWith(
        mockConfig.classroomScene,
      );
      expect(syncSeatingSnapshotMock).toHaveBeenCalled();
    });

    it('saves circle layout with fallback name when plan name is empty', async () => {
      const circleLayout = createMockCircleLayout();
      mockConfig.circleLayout = circleLayout;
      mockConfig.planName = '';

      const { result } = renderHook(() => useSeatingWizard(mockConfig));

      // Simulate being on step 3
      act(() => {
        result.current.setStep(3);
      });

      // Navigate backward to step 2
      await act(async () => {
        await result.current.handleStepChange(2);
      });

      expect(mockSaveSeatingPlanWithCircle).toHaveBeenCalledTimes(1);
      const [planName, scene, layout, options] =
        mockSaveSeatingPlanWithCircle.mock.calls[0];
      // The timestamp follows the active UI language, so both the German
      // (31.07.2026, 14:05:03) and the English (07/31/2026, 02:05:03 PM)
      // spelling are valid — which one appears depends on the test environment.
      expect(planName).toMatch(
        /^Plan \d{1,2}[./]\d{1,2}[./]\d{4}, \d{1,2}:\d{2}:\d{2}(?:\s[AP]M)?$/,
      );
      expect(scene).toBe(mockConfig.classroomScene);
      expect(layout).toBe(circleLayout);
      // Generated name ⇒ throwaway auto-save that replaces the previous one.
      expect(options).toEqual({ autoSave: true });
      expect(markClassroomSyncedMock).toHaveBeenCalledWith(scene);
      expect(syncSeatingSnapshotMock).toHaveBeenCalled();
    });

    it('saves null when circle layout is not present', async () => {
      mockConfig.circleLayout = null;

      const { result } = renderHook(() => useSeatingWizard(mockConfig));

      // Simulate being on step 3
      act(() => {
        result.current.setStep(3);
      });

      // Navigate backward to step 2
      await act(async () => {
        await result.current.handleStepChange(2);
      });

      expect(mockSaveSeatingPlanWithCircle).toHaveBeenCalledWith(
        'Test Plan',
        mockConfig.classroomScene,
        null,
        { autoSave: false },
      );
      expect(markClassroomSyncedMock).toHaveBeenCalledWith(
        mockConfig.classroomScene,
      );
      expect(syncSeatingSnapshotMock).toHaveBeenCalled();
    });

    it('skips autosave when no unsaved seating changes exist', async () => {
      mockConfig.hasUnsavedSeatingChanges = false;

      const { result } = renderHook(() => useSeatingWizard(mockConfig));
      act(() => {
        result.current.setStep(3);
      });

      await act(async () => {
        await result.current.handleStepChange(2);
      });

      expect(mockSaveSeatingPlanWithCircle).not.toHaveBeenCalled();
      expect(syncSeatingSnapshotMock).not.toHaveBeenCalled();
      expect(result.current.step).toBe(2);
    });

    it('prompts user when save fails due to duplicate name', async () => {
      const circleLayout = createMockCircleLayout();
      mockConfig.circleLayout = circleLayout;
      mockSaveSeatingPlanWithCircle.mockReturnValue(false);
      vi.mocked(confirmDialog).mockResolvedValue(true);

      const { result } = renderHook(() => useSeatingWizard(mockConfig));

      // Simulate being on step 3
      act(() => {
        result.current.setStep(3);
      });

      // Navigate backward to step 2
      await act(async () => {
        await result.current.handleStepChange(2);
      });

      expect(mockSaveSeatingPlanWithCircle).toHaveBeenCalledWith(
        'Test Plan',
        mockConfig.classroomScene,
        circleLayout,
        { autoSave: false },
      );
      expect(confirmDialog).toHaveBeenCalledWith(
        i18n.t('dialogs.savePlanFailedConfirm', { ns: 'common' }),
      );
      expect(result.current.step).toBe(2);
      expect(markClassroomSyncedMock).not.toHaveBeenCalled();
      expect(syncSeatingSnapshotMock).not.toHaveBeenCalled();
    });

    it('does not navigate backward when user cancels after save failure', async () => {
      mockSaveSeatingPlanWithCircle.mockReturnValue(false);
      vi.mocked(confirmDialog).mockResolvedValue(false);

      const { result } = renderHook(() => useSeatingWizard(mockConfig));

      // Simulate being on step 3
      act(() => {
        result.current.setStep(3);
      });

      // Navigate backward to step 2
      await act(async () => {
        await result.current.handleStepChange(2);
      });

      await waitFor(() => {
        expect(result.current.step).toBe(3); // Should stay on step 3
      });
      expect(markClassroomSyncedMock).not.toHaveBeenCalled();
      expect(syncSeatingSnapshotMock).not.toHaveBeenCalled();
    });

    it('does not save when navigating backward from step 2', async () => {
      const { result } = renderHook(() => useSeatingWizard(mockConfig));

      // Simulate being on step 2
      act(() => {
        result.current.setStep(2);
      });

      // Navigate backward to step 1
      await act(async () => {
        await result.current.handleStepChange(1);
      });

      expect(mockSaveSeatingPlanWithCircle).not.toHaveBeenCalled();
      expect(markClassroomSyncedMock).not.toHaveBeenCalled();
      expect(syncSeatingSnapshotMock).not.toHaveBeenCalled();
      expect(result.current.step).toBe(1);
    });

    it('does not save when currentSeating is empty', async () => {
      mockConfig.currentSeating = [];

      const { result } = renderHook(() => useSeatingWizard(mockConfig));

      // Simulate being on step 3
      act(() => {
        result.current.setStep(3);
      });

      // Navigate backward to step 2
      await act(async () => {
        await result.current.handleStepChange(2);
      });

      expect(mockSaveSeatingPlanWithCircle).not.toHaveBeenCalled();
      expect(markClassroomSyncedMock).not.toHaveBeenCalled();
      expect(syncSeatingSnapshotMock).not.toHaveBeenCalled();
      expect(result.current.step).toBe(2);
    });
  });

  describe('Basic Navigation', () => {
    it('initializes with step 1', () => {
      const { result } = renderHook(() => useSeatingWizard(mockConfig));
      expect(result.current.step).toBe(1);
    });

    it('allows forward navigation to step 2 when students exist', async () => {
      const { result } = renderHook(() => useSeatingWizard(mockConfig));

      await act(async () => {
        await result.current.handleStepChange(2);
      });

      expect(result.current.step).toBe(2);
    });

    it('blocks navigation to step 2 when a student name is missing', async () => {
      mockConfig.students = [
        createMockStudent('1', 'Alice', { name: '' }),
        createMockStudent('2', 'Bob'),
      ];

      const { result } = renderHook(() => useSeatingWizard(mockConfig));

      await act(async () => {
        await result.current.handleStepChange(2);
      });

      expect(result.current.step).toBe(1);
      // The message comes from i18n, so match either locale.
      expect(showToastMock).toHaveBeenCalledWith(
        'error',
        expect.stringMatching(/fehlenden Namen|missing name/i),
      );
    });

    it('proceeds to step 2 when genders are missing (gender is optional)', async () => {
      mockConfig.students = [
        createMockStudent('1', 'Alice', { gender: undefined }),
        createMockStudent('2', 'Bob', { gender: undefined }),
      ];

      const { result } = renderHook(() => useSeatingWizard(mockConfig));

      await act(async () => {
        await result.current.handleStepChange(2);
      });

      expect(result.current.step).toBe(2);
    });

    it('initially marks classroom as not edited', () => {
      const { result } = renderHook(() => useSeatingWizard(mockConfig));
      expect(result.current.classroomEdited).toBe(false);
    });

    it('starts automatic mix with loading state and clears it after success', async () => {
      vi.useFakeTimers();
      mockConfig.currentSeating = [];
      let resolveMix: ((value: SeatingArrangement) => void) | null = null;
      const mixPromise = new Promise<SeatingArrangement>((resolve) => {
        resolveMix = resolve;
      });
      mockConfig.generateSeatingPlan = vi.fn().mockReturnValue(mixPromise);

      const { result } = renderHook(() => useSeatingWizard(mockConfig));

      await act(async () => {
        await result.current.handleStepChange(3);
      });
      expect(result.current.autoMixing).toBe(false);

      act(() => {
        vi.runAllTimers();
      });
      expect(mockConfig.generateSeatingPlan).toHaveBeenCalledTimes(1);
      expect(result.current.autoMixing).toBe(true);

      await act(async () => {
        resolveMix?.([
          [createMockStudent('1', 'Alice'), createMockStudent('2', 'Bob')],
        ]);
      });
      expect(result.current.autoMixing).toBe(false);
      expect(result.current.autoMixError).toBeNull();
      expect(mockConfig.generateSeatingPlan).toHaveBeenCalledWith(
        expect.any(Object),
        mockConfig.classroomScene,
        true,
      );
    });

    it('handles automatic mix failures with toast, logging, and error state', async () => {
      vi.useFakeTimers();
      mockConfig.currentSeating = [];
      const mixError = new Error('Worker exploded');
      mockConfig.generateSeatingPlan = vi.fn().mockRejectedValue(mixError);

      const { result } = renderHook(() => useSeatingWizard(mockConfig));

      await act(async () => {
        await result.current.handleStepChange(3);
      });
      act(() => {
        vi.runAllTimers();
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.autoMixError).toBe('Worker exploded');
      expect(result.current.autoMixing).toBe(false);
      expect(showToastMock).toHaveBeenCalledWith(
        'error',
        TOAST_MESSAGES.GENERATION_ERROR,
      );
      expect(logErrorMock).toHaveBeenCalledWith(
        'Automatic seating plan generation failed on step entry',
        expect.objectContaining({ error: mixError }),
        'useSeatingWizard',
      );
    });
  });
});
