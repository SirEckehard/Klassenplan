// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SeatingPlanGeneratorProvider,
  useSeatingPlanState,
  useSeatingPlanActions,
  useSeatingPlan,
  useSeatingPlanSelector,
  useStudentManagementContext,
  useClassroomLayoutContext,
  useSeatingAlgorithmContext,
  type SeatingPlanSnapshot,
} from '../SeatingPlanContext';
import {
  createMockSeatingGenerator,
  createMockClassroomScene,
  createMockSavedPlan,
  createMockStudent,
  setupCleanStorage,
} from '../../__tests__/utils';

// Mock the useSeatingGenerator hook
const mockSeatingGenerator = createMockSeatingGenerator();
vi.mock('../../hooks/useSeatingGenerator', () => ({
  useSeatingGenerator: () => mockSeatingGenerator,
}));

describe('SeatingPlanContext', () => {
  beforeEach(() => {
    setupCleanStorage();
    vi.clearAllMocks();
    const fresh = createMockSeatingGenerator();
    Object.assign(mockSeatingGenerator, fresh);
    mockSeatingGenerator.state = fresh.state;
    mockSeatingGenerator.actions = fresh.actions;
  });

  describe('SeatingPlanGeneratorProvider', () => {
    it('provides context values to children', () => {
      const TestComponent = () => {
        const state = useSeatingPlanState();
        const actions = useSeatingPlanActions();

        return (
          <div>
            <span data-testid="students-count">{state.students.length}</span>
            <span data-testid="step">{state.step}</span>
            <span data-testid="plan-name">{state.planName}</span>
            <button onClick={() => actions.handleStepChange(2)}>
              Next Step
            </button>
          </div>
        );
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const { result } = renderHook(() => <TestComponent />, { wrapper });

      expect(result.current).toBeDefined();
    });

    it('exposes all state properties from useSeatingGenerator', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const { result } = renderHook(() => useSeatingPlanState(), { wrapper });

      // Verify all state properties are exposed
      expect(result.current).toHaveProperty('students');
      expect(result.current).toHaveProperty('classroomScene');
      expect(result.current).toHaveProperty('currentSeating');
      expect(result.current).toHaveProperty('mixSettings');
      expect(result.current).toHaveProperty('step');
      expect(result.current).toHaveProperty('seatCount');
      expect(result.current).toHaveProperty('classroomEdited');
      expect(result.current).toHaveProperty('planName');
      expect(result.current).toHaveProperty('planNameError');
      expect(result.current).toHaveProperty('planNameInputRef');
      expect(result.current).toHaveProperty('seatingHistory');
      expect(result.current).toHaveProperty('mixHistory');
      expect(result.current).toHaveProperty('circleLayout');
      expect(result.current).toHaveProperty('circleGenerationInProgress');
      expect(result.current).toHaveProperty('lastStatistics');
      expect(result.current).toHaveProperty('showStatisticsBadge');
      expect(result.current).toHaveProperty('hasPendingStudentUpdates');
      expect(result.current).toHaveProperty('showPostUpdateNotice');
      expect(result.current).toHaveProperty('latestChangelogEntry');
      expect(result.current).toHaveProperty('currentAppVersion');
    });

    it('exposes all action properties from useSeatingGenerator', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const { result } = renderHook(() => useSeatingPlanActions(), { wrapper });

      // Verify all action properties are exposed
      expect(result.current).toHaveProperty('handleStepChange');
      expect(result.current).toHaveProperty('addStudent');
      expect(result.current).toHaveProperty('removeStudent');
      expect(result.current).toHaveProperty('clearStudents');
      expect(result.current).toHaveProperty('updateStudent');
      expect(result.current).toHaveProperty('importCsv');
      expect(result.current).toHaveProperty('downloadStudentsCsv');
      expect(result.current).toHaveProperty('updateClassroomScene');
      expect(result.current).toHaveProperty('removeTables');
      expect(result.current).toHaveProperty('generateSeatingPlan');
      expect(result.current).toHaveProperty('moveStudent');
      expect(result.current).toHaveProperty('refineSeatingLocal');
      expect(result.current).toHaveProperty('onMix');
      expect(result.current).toHaveProperty('setPlanName');
      expect(result.current).toHaveProperty('setPlanNameError');
      expect(result.current).toHaveProperty('handleSaveSeatingPlan');
      expect(result.current).toHaveProperty('isSeatLocked');
      expect(result.current).toHaveProperty('toggleLock');
      expect(result.current).toHaveProperty('saveTemplate');
      expect(result.current).toHaveProperty('loadTemplate');
      expect(result.current).toHaveProperty('deleteTemplate');
      expect(result.current).toHaveProperty('handleHistoryLoad');
      expect(result.current).toHaveProperty('deleteSeatingPlan');
      expect(result.current).toHaveProperty('renameSeatingPlan');
      expect(result.current).toHaveProperty('handleMixLoad');
      expect(result.current).toHaveProperty('deleteMixResult');
      expect(result.current).toHaveProperty('setMixSettings');
      expect(result.current).toHaveProperty('handleHomeClick');
      expect(result.current).toHaveProperty('importInputRef');
      expect(result.current).toHaveProperty('triggerImport');
      expect(result.current).toHaveProperty('handleExportAll');
      expect(result.current).toHaveProperty('handleImportFile');
      expect(result.current).toHaveProperty('generateCircleSeating');
      expect(result.current).toHaveProperty('regenerateCircle');
      expect(result.current).toHaveProperty('updateStudentPosition');
      expect(result.current).toHaveProperty('swapStudentPositions');
      expect(result.current).toHaveProperty('clearCircleLayout');
      expect(result.current).toHaveProperty('syncCircleFromTable');
      expect(result.current).toHaveProperty('setLastStatistics');
      expect(result.current).toHaveProperty('setShowStatisticsBadge');
      expect(result.current).toHaveProperty('acknowledgePostUpdateNotice');
      expect(result.current).toHaveProperty('acknowledgeStudentUpdates');
    });

    it('passes through memoized state object without cloning', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const { result } = renderHook(() => useSeatingPlanState(), { wrapper });

      expect(result.current).toBe(mockSeatingGenerator.state);
    });

    it('passes through memoized action object without cloning', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const { result } = renderHook(() => useSeatingPlanActions(), { wrapper });

      expect(result.current).toBe(mockSeatingGenerator.actions);
    });

    it('notifies subscribers on consecutive state updates', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const { result, rerender } = renderHook(() => useSeatingPlanState(), {
        wrapper,
      });

      expect(result.current.students).toHaveLength(0);

      act(() => {
        const firstStudent = createMockStudent({ name: 'Student One' });
        const nextState = {
          ...mockSeatingGenerator.state,
          students: [firstStudent],
        };
        mockSeatingGenerator.state = nextState;
        mockSeatingGenerator.students = nextState.students;
        rerender();
      });

      expect(result.current.students).toHaveLength(1);

      act(() => {
        const secondStudent = createMockStudent({ name: 'Student Two' });
        const nextState = {
          ...mockSeatingGenerator.state,
          students: [...mockSeatingGenerator.state.students, secondStudent],
        };
        mockSeatingGenerator.state = nextState;
        mockSeatingGenerator.students = nextState.students;
        rerender();
      });

      expect(result.current.students).toHaveLength(2);
    });
  });

  describe('useSeatingPlanState hook', () => {
    it('returns state from context when used within provider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const { result } = renderHook(() => useSeatingPlanState(), { wrapper });

      expect(result.current.students).toEqual(mockSeatingGenerator.students);
      expect(result.current.step).toBe(mockSeatingGenerator.step);
      expect(result.current.planName).toBe(mockSeatingGenerator.planName);
      expect(result.current.classroomScene).toEqual(
        mockSeatingGenerator.classroomScene,
      );
    });

    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useSeatingPlanState());
      }).toThrow(
        'useSeatingPlanState must be used within a SeatingPlanGeneratorProvider',
      );
    });

    it('provides read-only access to state', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const { result } = renderHook(() => useSeatingPlanState(), { wrapper });

      // Should not have action methods
      expect(result.current).not.toHaveProperty('addStudent');
      expect(result.current).not.toHaveProperty('removeStudent');
      expect(result.current).not.toHaveProperty('handleStepChange');
    });
  });

  describe('useSeatingPlanActions hook', () => {
    it('returns actions from context when used within provider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const { result } = renderHook(() => useSeatingPlanActions(), { wrapper });

      expect(result.current.addStudent).toBe(mockSeatingGenerator.addStudent);
      expect(result.current.handleStepChange).toBe(
        mockSeatingGenerator.handleStepChange,
      );
      expect(result.current.generateSeatingPlan).toBe(
        mockSeatingGenerator.generateSeatingPlan,
      );
    });

    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useSeatingPlanActions());
      }).toThrow(
        'useSeatingPlanActions must be used within a SeatingPlanGeneratorProvider',
      );
    });

    it('provides access to all action methods', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const { result } = renderHook(() => useSeatingPlanActions(), { wrapper });

      // Should not have state properties
      expect(result.current).not.toHaveProperty('students');
      expect(result.current).not.toHaveProperty('step');
      expect(result.current).not.toHaveProperty('planName');

      // Should have action methods
      expect(typeof result.current.addStudent).toBe('function');
      expect(typeof result.current.removeStudent).toBe('function');
      expect(typeof result.current.handleStepChange).toBe('function');
    });
  });

  describe('useSeatingPlanSelector hook', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
    );

    const selectStudentsAndPlan = ({ state }: SeatingPlanSnapshot) => ({
      students: state.students,
      planName: state.planName,
    });
    type StudentsAndPlanSelection = ReturnType<typeof selectStudentsAndPlan>;
    // Ensure we reuse the previous selection to avoid retriggering the store with identical slices.
    const isStudentsAndPlanEqual = (
      previous: StudentsAndPlanSelection,
      next: StudentsAndPlanSelection,
    ) =>
      previous.students === next.students &&
      previous.planName === next.planName;

    const selectStudentCount = ({ state }: SeatingPlanSnapshot) =>
      state.students.length;
    const selectStudents = ({ state }: SeatingPlanSnapshot) => state.students;

    it('returns selected slices when used within provider', () => {
      const { result } = renderHook(
        () =>
          useSeatingPlanSelector(selectStudentsAndPlan, isStudentsAndPlanEqual),
        { wrapper },
      );

      expect(result.current.students).toBe(mockSeatingGenerator.state.students);
      expect(result.current.planName).toBe(mockSeatingGenerator.state.planName);
    });

    it('throws error when used outside provider', () => {
      expect(() =>
        renderHook(() => useSeatingPlanSelector(selectStudentCount)),
      ).toThrow(
        'useSeatingPlanSelector must be used within a SeatingPlanGeneratorProvider',
      );
    });

    it('memoizes selections when equality holds', () => {
      const { result, rerender } = renderHook(
        () => useSeatingPlanSelector(selectStudents),
        { wrapper },
      );

      const initialReference = result.current;
      rerender();
      expect(result.current).toBe(initialReference);
    });
  });

  describe('feature-specific contexts', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
    );

    it('exposes student management data and handlers', () => {
      const { result } = renderHook(() => useStudentManagementContext(), {
        wrapper,
      });

      expect(result.current.students).toBe(mockSeatingGenerator.state.students);
      expect(result.current.addStudent).toBe(
        mockSeatingGenerator.actions.addStudent,
      );
      expect(result.current.removeStudent).toBe(
        mockSeatingGenerator.actions.removeStudent,
      );
    });

    it('exposes classroom layout data and handlers', () => {
      const { result } = renderHook(() => useClassroomLayoutContext(), {
        wrapper,
      });

      expect(result.current.classroomScene).toBe(
        mockSeatingGenerator.state.classroomScene,
      );
      expect(result.current.setSeatingMode).toBe(
        mockSeatingGenerator.actions.setSeatingMode,
      );
      expect(result.current.circleLayout).toBe(
        mockSeatingGenerator.state.circleLayout,
      );
    });

    it('exposes seating algorithm data and handlers', () => {
      const { result } = renderHook(() => useSeatingAlgorithmContext(), {
        wrapper,
      });

      expect(result.current.step).toBe(mockSeatingGenerator.state.step);
      expect(result.current.currentSeating).toBe(
        mockSeatingGenerator.state.currentSeating,
      );
      expect(result.current.generateSeatingPlan).toBe(
        mockSeatingGenerator.actions.generateSeatingPlan,
      );
    });

    it('throws for student management hook outside provider', () => {
      expect(() => renderHook(() => useStudentManagementContext())).toThrow(
        'useStudentManagementContext must be used within a SeatingPlanGeneratorProvider',
      );
    });

    it('throws for classroom layout hook outside provider', () => {
      expect(() => renderHook(() => useClassroomLayoutContext())).toThrow(
        'useClassroomLayoutContext must be used within a SeatingPlanGeneratorProvider',
      );
    });

    it('throws for seating algorithm hook outside provider', () => {
      expect(() => renderHook(() => useSeatingAlgorithmContext())).toThrow(
        'useSeatingAlgorithmContext must be used within a SeatingPlanGeneratorProvider',
      );
    });
  });

  describe('useSeatingPlan convenience hook', () => {
    it('combines state and actions into single object', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const { result } = renderHook(() => useSeatingPlan(), { wrapper });

      // Should have both state and action properties
      expect(result.current).toHaveProperty('students'); // from state
      expect(result.current).toHaveProperty('addStudent'); // from actions
      expect(result.current).toHaveProperty('step'); // from state
      expect(result.current).toHaveProperty('handleStepChange'); // from actions
    });

    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useSeatingPlan());
      }).toThrow(
        'useSeatingPlan must be used within a SeatingPlanGeneratorProvider',
      );
    });

    it('provides access to all properties and methods', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const { result } = renderHook(() => useSeatingPlan(), { wrapper });

      // Verify both state and action properties are available
      const stateProperties = [
        'students',
        'classroomScene',
        'currentSeating',
        'mixSettings',
        'step',
        'seatCount',
        'classroomEdited',
        'planName',
        'planNameError',
        'planNameInputRef',
        'seatingHistory',
        'mixHistory',
        'circleLayout',
        'circleGenerationInProgress',
        'lastStatistics',
        'showStatisticsBadge',
      ];

      const actionProperties = [
        'handleStepChange',
        'addStudent',
        'removeStudent',
        'clearStudents',
        'updateStudent',
        'importCsv',
        'downloadStudentsCsv',
        'updateClassroomScene',
        'removeTables',
        'generateSeatingPlan',
        'moveStudent',
        'refineSeatingLocal',
        'onMix',
        'setPlanName',
        'setPlanNameError',
        'handleSaveSeatingPlan',
        'isSeatLocked',
        'toggleLock',
        'saveTemplate',
        'loadTemplate',
        'deleteTemplate',
        'handleHistoryLoad',
        'deleteSeatingPlan',
        'renameSeatingPlan',
        'handleMixLoad',
        'deleteMixResult',
        'setMixSettings',
        'handleHomeClick',
        'importInputRef',
        'triggerImport',
        'handleExportAll',
        'handleImportFile',
        'generateCircleSeating',
        'regenerateCircle',
        'updateStudentPosition',
        'swapStudentPositions',
        'batchSwapStudentPositions',
        'clearCircleLayout',
        'syncCircleFromTable',
        'setLastStatistics',
        'setShowStatisticsBadge',
      ];

      stateProperties.forEach((prop) => {
        expect(result.current).toHaveProperty(prop);
      });

      actionProperties.forEach((prop) => {
        expect(result.current).toHaveProperty(prop);
      });
    });
  });

  describe('context integration', () => {
    it('properly delegates to useSeatingGenerator', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const { result } = renderHook(() => useSeatingPlan(), { wrapper });

      // Test that actions are properly delegated
      act(() => {
        result.current.handleStepChange(3);
      });

      expect(mockSeatingGenerator.handleStepChange).toHaveBeenCalledWith(3);
    });

    it('maintains referential stability for actions', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const { result, rerender } = renderHook(() => useSeatingPlanActions(), {
        wrapper,
      });

      const firstRender = result.current;
      rerender();
      const secondRender = result.current;

      // Actions should be the same reference between renders
      expect(firstRender.handleStepChange).toBe(secondRender.handleStepChange);
      expect(firstRender.addStudent).toBe(secondRender.addStudent);
    });

    it('delegates plan save and load actions without recreating references', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const { result, rerender } = renderHook(() => useSeatingPlanActions(), {
        wrapper,
      });

      const initialSave = result.current.handleSaveSeatingPlan;
      const initialLoad = result.current.handleHistoryLoad;

      const planScene = createMockClassroomScene();
      const savedPlan = createMockSavedPlan();

      act(() => {
        result.current.handleSaveSeatingPlan('Mein Plan', planScene);
        result.current.handleHistoryLoad(savedPlan);
      });

      expect(mockSeatingGenerator.handleSaveSeatingPlan).toHaveBeenCalledWith(
        'Mein Plan',
        planScene,
      );
      expect(mockSeatingGenerator.handleHistoryLoad).toHaveBeenCalledWith(
        savedPlan,
      );

      rerender();

      expect(result.current.handleSaveSeatingPlan).toBe(initialSave);
      expect(result.current.handleHistoryLoad).toBe(initialLoad);
    });

    it('exposes circle mode state and actions for regression coverage', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const circleLayout = {
        students: [],
        radius: { horizontal: 100, vertical: 100 },
        center: { x: 0, y: 0 },
        preservedNeighborhoods: 0,
        totalOriginalNeighborhoods: 0,
        newNeighborhoods: 0,
        preservationRate: 0,
        mode: 'preserve-neighbors' as const,
        timestamp: Date.now(),
        neighborhoodPairs: [],
      };

      mockSeatingGenerator.circleLayout = circleLayout;
      mockSeatingGenerator.state.circleLayout = circleLayout;

      const { result } = renderHook(
        () => ({
          state: useSeatingPlanState(),
          actions: useSeatingPlanActions(),
        }),
        { wrapper },
      );

      expect(result.current.state.circleLayout).toBe(circleLayout);
      expect(result.current.actions.generateCircleSeating).toBe(
        mockSeatingGenerator.actions.generateCircleSeating,
      );
      expect(result.current.actions.regenerateCircle).toBe(
        mockSeatingGenerator.actions.regenerateCircle,
      );

      await act(async () => {
        await result.current.actions.generateCircleSeating();
        await result.current.actions.regenerateCircle();
        result.current.actions.clearCircleLayout();
        await result.current.actions.syncCircleFromTable();
      });

      expect(mockSeatingGenerator.generateCircleSeating).toHaveBeenCalledTimes(
        1,
      );
      expect(mockSeatingGenerator.regenerateCircle).toHaveBeenCalledTimes(1);
      expect(mockSeatingGenerator.clearCircleLayout).toHaveBeenCalledTimes(1);
      expect(mockSeatingGenerator.syncCircleFromTable).toHaveBeenCalledTimes(1);
    });

    it('provides consistent state across multiple hook calls', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const stateHook = renderHook(() => useSeatingPlanState(), { wrapper });
      const combinedHook = renderHook(() => useSeatingPlan(), { wrapper });

      // State should be identical from both hooks
      expect(stateHook.result.current.students).toBe(
        combinedHook.result.current.students,
      );
      expect(stateHook.result.current.step).toBe(
        combinedHook.result.current.step,
      );
      expect(stateHook.result.current.planName).toBe(
        combinedHook.result.current.planName,
      );
    });

    it('handles nested providers correctly', () => {
      const OuterWrapper = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>
          <SeatingPlanGeneratorProvider>
            {children}
          </SeatingPlanGeneratorProvider>
        </SeatingPlanGeneratorProvider>
      );

      const { result } = renderHook(() => useSeatingPlanState(), {
        wrapper: OuterWrapper,
      });

      // Should use the innermost provider
      expect(result.current).toBeDefined();
      expect(result.current.students).toEqual(mockSeatingGenerator.students);
    });

    it('isolates context values between different provider instances', () => {
      // This test verifies that different provider instances don't interfere
      const Provider1 = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const Provider2 = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const hook1 = renderHook(() => useSeatingPlanState(), {
        wrapper: Provider1,
      });
      const hook2 = renderHook(() => useSeatingPlanState(), {
        wrapper: Provider2,
      });

      // Both should work independently
      expect(hook1.result.current).toBeDefined();
      expect(hook2.result.current).toBeDefined();

      // Should have the same structure (since using same mock)
      expect(hook1.result.current.step).toBe(hook2.result.current.step);
    });
  });

  describe('error boundaries', () => {
    it('provides meaningful error messages for missing provider', () => {
      expect(() => {
        renderHook(() => useSeatingPlanState());
      }).toThrow(
        'useSeatingPlanState must be used within a SeatingPlanGeneratorProvider',
      );

      expect(() => {
        renderHook(() => useSeatingPlanActions());
      }).toThrow(
        'useSeatingPlanActions must be used within a SeatingPlanGeneratorProvider',
      );
    });

    it('handles partial provider mounting', () => {
      // Test what happens if contexts are partially provided
      const PartialProvider = ({ children }: { children: React.ReactNode }) => (
        <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
      );

      const { result } = renderHook(
        () => {
          try {
            return {
              state: useSeatingPlanState(),
              actions: useSeatingPlanActions(),
            };
          } catch (error) {
            return { error };
          }
        },
        { wrapper: PartialProvider },
      );

      // All contexts should be provided within SeatingPlanGeneratorProvider
      expect(result.current).toHaveProperty('state');
      expect(result.current).toHaveProperty('actions');
      expect(result.current).not.toHaveProperty('error');
    });
  });
});
