// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import {
  useSceneHistory,
  type UseSceneHistoryParams,
} from '../useSceneHistory';
import type {
  ClassroomScene,
  SeatingArrangement,
  ClassroomTable,
  ClassroomFeature,
} from '../../../types';

// Add vitest-dom matchers
import '@testing-library/jest-dom/vitest';

describe('useSceneHistory', () => {
  let mockClassroomScene: ClassroomScene;
  let mockCurrentSeating: SeatingArrangement;
  let mockUpdateClassroomScene: Mock<
    UseSceneHistoryParams['updateClassroomScene']
  >;
  let mockSetSceneTables: Mock<UseSceneHistoryParams['setSceneTables']>;
  let mockSetSceneFeatures: Mock<UseSceneHistoryParams['setSceneFeatures']>;
  let mockSetSelectedTableIds: Mock<
    UseSceneHistoryParams['setSelectedTableIds']
  >;
  let mockSetCurrentSeating: Mock<UseSceneHistoryParams['setCurrentSeating']>;

  const createMockTable = (index: number): ClassroomTable => ({
    x: 100 + index * 50,
    y: 100 + index * 30,
    width: 130,
    height: 120,
    seatCount: 4,
    rotation: 0,
    zIndex: index,
    locked: false,
    templateType: 'group4',
  });

  beforeEach(() => {
    mockUpdateClassroomScene = vi.fn();
    mockSetSceneTables = vi.fn();
    mockSetSceneFeatures = vi.fn();
    mockSetSelectedTableIds = vi.fn();
    mockSetCurrentSeating = vi.fn();

    mockClassroomScene = {
      tables: [createMockTable(0), createMockTable(1)],
      totalStudents: 8,
      features: [] as ClassroomFeature[],
    };

    mockCurrentSeating = [
      [null, null, null, null],
      [null, null, null, null],
    ];
  });

  it('initializes with empty history', () => {
    const { result } = renderHook(() =>
      useSceneHistory({
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        setCurrentSeating: mockSetCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setSceneTables: mockSetSceneTables,
        setSceneFeatures: mockSetSceneFeatures,
        setSelectedTableIds: mockSetSelectedTableIds,
      }),
    );

    expect(result.current.history).toEqual([]);
    expect(result.current.canUndo).toBe(false);
  });

  it('creates snapshot correctly', () => {
    const { result } = renderHook(() =>
      useSceneHistory({
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        setCurrentSeating: mockSetCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setSceneTables: mockSetSceneTables,
        setSceneFeatures: mockSetSceneFeatures,
        setSelectedTableIds: mockSetSelectedTableIds,
      }),
    );

    act(() => {
      result.current.snapshot();
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.history[0]).toMatchObject({
      scene: mockClassroomScene,
      seating: mockCurrentSeating,
    });
    expect(result.current.history[0].signature).toEqual(expect.any(String));
  });

  it('prevents duplicate snapshots', () => {
    const { result } = renderHook(() =>
      useSceneHistory({
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        setCurrentSeating: mockSetCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setSceneTables: mockSetSceneTables,
        setSceneFeatures: mockSetSceneFeatures,
        setSelectedTableIds: mockSetSelectedTableIds,
      }),
    );

    act(() => {
      result.current.snapshot();
    });

    expect(result.current.history).toHaveLength(1);

    // Take another snapshot with same data
    act(() => {
      result.current.snapshot();
    });

    // Should still have only one snapshot
    expect(result.current.history).toHaveLength(1);
  });

  it('limits history to 50 entries', () => {
    const { result, rerender } = renderHook((props) => useSceneHistory(props), {
      initialProps: {
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        setCurrentSeating: mockSetCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setSceneTables: mockSetSceneTables,
        setSceneFeatures: mockSetSceneFeatures,
        setSelectedTableIds: mockSetSelectedTableIds,
      },
    });

    // Create 52 different snapshots
    for (let i = 0; i < 52; i++) {
      const modifiedScene = {
        ...mockClassroomScene,
        totalStudents: i, // Make each snapshot different
      };

      rerender({
        classroomScene: modifiedScene,
        currentSeating: mockCurrentSeating,
        setCurrentSeating: mockSetCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setSceneTables: mockSetSceneTables,
        setSceneFeatures: mockSetSceneFeatures,
        setSelectedTableIds: mockSetSelectedTableIds,
      });

      act(() => {
        result.current.snapshot();
      });
    }

    // Should be limited to 50 entries
    expect(result.current.history).toHaveLength(50);
    // Should keep the most recent entries (totalStudents should be 51, 50, 49, ...)
    expect(result.current.history[49].scene.totalStudents).toBe(51);
    expect(result.current.history[0].scene.totalStudents).toBe(2);
  });

  it('performs undo correctly', () => {
    const { result } = renderHook(() =>
      useSceneHistory({
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        setCurrentSeating: mockSetCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setSceneTables: mockSetSceneTables,
        setSceneFeatures: mockSetSceneFeatures,
        setSelectedTableIds: mockSetSelectedTableIds,
      }),
    );

    // Create a snapshot
    act(() => {
      result.current.snapshot();
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);

    // Perform undo
    act(() => {
      result.current.undo();
    });

    expect(result.current.history).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);

    // Verify that the restoration functions were called
    expect(mockSetSceneTables).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ x: 100 }),
        expect.objectContaining({ x: 150 }),
      ]),
    );
    expect(mockSetSelectedTableIds).toHaveBeenCalledWith([]);
    expect(mockSetCurrentSeating).toHaveBeenCalledWith([
      [null, null, null, null],
      [null, null, null, null],
    ]);
    expect(mockUpdateClassroomScene).toHaveBeenCalled();
  });

  it('prevents multiple simultaneous undo calls', () => {
    const { result, rerender } = renderHook((props) => useSceneHistory(props), {
      initialProps: {
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        setCurrentSeating: mockSetCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setSceneTables: mockSetSceneTables,
        setSceneFeatures: mockSetSceneFeatures,
        setSelectedTableIds: mockSetSelectedTableIds,
      },
    });

    // Create multiple snapshots
    for (let i = 0; i < 3; i++) {
      const modifiedScene = {
        ...mockClassroomScene,
        totalStudents: 8 + i, // Different values to create distinct snapshots
      };

      rerender({
        classroomScene: modifiedScene,
        currentSeating: mockCurrentSeating,
        setCurrentSeating: mockSetCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setSceneTables: mockSetSceneTables,
        setSceneFeatures: mockSetSceneFeatures,
        setSelectedTableIds: mockSetSelectedTableIds,
      });

      act(() => {
        result.current.snapshot();
      });
    }

    expect(result.current.history).toHaveLength(3);

    const originalLength = result.current.history.length;
    const callCounts = {
      setSceneTables: mockSetSceneTables.mock.calls.length,
      updateClassroomScene: mockUpdateClassroomScene.mock.calls.length,
    };

    // Try to call undo multiple times rapidly
    // The race condition protection should ensure only one processes
    act(() => {
      result.current.undo();
    });

    // Additional undo calls should be ignored due to race condition protection
    result.current.undo();
    result.current.undo();

    // Should only process one undo
    expect(result.current.history).toHaveLength(originalLength - 1);

    // Restoration functions should only be called once more
    expect(mockSetSceneTables.mock.calls.length).toBe(
      callCounts.setSceneTables + 1,
    );
    expect(mockUpdateClassroomScene.mock.calls.length).toBe(
      callCounts.updateClassroomScene + 1,
    );
  });

  it('handles empty history on undo', () => {
    const { result } = renderHook(() =>
      useSceneHistory({
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        setCurrentSeating: mockSetCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setSceneTables: mockSetSceneTables,
        setSceneFeatures: mockSetSceneFeatures,
        setSelectedTableIds: mockSetSelectedTableIds,
      }),
    );

    expect(result.current.history).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);

    // Try to undo with empty history
    act(() => {
      result.current.undo();
    });

    // Should remain empty and not call restoration functions
    expect(result.current.history).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
    expect(mockSetSceneTables).not.toHaveBeenCalled();
    expect(mockUpdateClassroomScene).not.toHaveBeenCalled();
  });

  it('restores snapshot correctly', () => {
    const { result } = renderHook(() =>
      useSceneHistory({
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        setCurrentSeating: mockSetCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setSceneTables: mockSetSceneTables,
        setSceneFeatures: mockSetSceneFeatures,
        setSelectedTableIds: mockSetSelectedTableIds,
      }),
    );

    const testSnapshot = {
      scene: {
        tables: [createMockTable(5), createMockTable(6)],
        totalStudents: 4,
      },
      seating: [
        [null, null],
        [null, null],
      ],
      signature: 'custom-snapshot',
    };

    act(() => {
      result.current.restoreFromSnapshot(testSnapshot);
    });

    // Verify that restoration functions were called with correct data
    expect(mockSetSceneTables).toHaveBeenCalledWith([
      expect.objectContaining({ x: 350 }),
      expect.objectContaining({ x: 400 }),
    ]);
    expect(mockSetSelectedTableIds).toHaveBeenCalledWith([]);
    expect(mockSetCurrentSeating).toHaveBeenCalledWith([
      [null, null],
      [null, null],
    ]);
    expect(mockUpdateClassroomScene).toHaveBeenCalled();
    const lastCall = mockUpdateClassroomScene.mock.calls.at(-1);
    expect(typeof lastCall?.[0]).toBe('function');
    const updater = lastCall?.[0] as (scene: ClassroomScene) => ClassroomScene;
    const updatedScene = updater(mockClassroomScene);
    expect(updatedScene.tables).toEqual([
      expect.objectContaining({ x: 350 }),
      expect.objectContaining({ x: 400 }),
    ]);
    expect(updatedScene.totalStudents).toBe(4);
  });

  it('creates deep clones for snapshots', () => {
    const { result } = renderHook(() =>
      useSceneHistory({
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        setCurrentSeating: mockSetCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setSceneTables: mockSetSceneTables,
        setSceneFeatures: mockSetSceneFeatures,
        setSelectedTableIds: mockSetSelectedTableIds,
      }),
    );

    act(() => {
      result.current.snapshot();
    });

    // Modify original data
    mockClassroomScene.totalStudents = 999;
    mockClassroomScene.tables[0].x = 999;

    // Snapshot should not be affected by modifications to original data
    expect(result.current.history[0].scene.totalStudents).toBe(8);
    expect(result.current.history[0].scene.tables[0].x).toBe(100);
  });
});
