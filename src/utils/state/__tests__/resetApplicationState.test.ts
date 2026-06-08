import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetApplicationState } from '../resetApplicationState';
import { studentStore } from '../../../stores/studentsStore';
import { layoutStore } from '../../../stores/layoutStore';
import { createMockStudent } from '../../../__tests__/utils';
import { DEFAULT_CLASSROOM_SCENE } from '../../../utils';
import { LOCAL_STORAGE_KEYS } from '../../../utils/data/storageKeys';

describe('resetApplicationState', () => {
  beforeEach(() => {
    localStorage.clear();
    studentStore.setState({
      ...studentStore.getState(),
      students: [createMockStudent({ name: 'Eva' })],
      hasPendingStudentUpdates: true,
    });
    layoutStore.setState({
      ...layoutStore.getState(),
      classroomScene: {
        ...DEFAULT_CLASSROOM_SCENE,
        tables: [],
        totalStudents: 0,
      },
      seatingMode: 'circle',
      circleLayout: {
        students: [],
        radius: { horizontal: 140, vertical: 90 },
        center: { x: 300, y: 200 },
        preservedNeighborhoods: 1,
        totalOriginalNeighborhoods: 2,
        newNeighborhoods: 0,
        preservationRate: 0.5,
        mode: 'preserve-neighbors',
        timestamp: Date.now(),
        neighborhoodPairs: [],
      },
      circleGenerationInProgress: true,
      circleGenerationStatus: {
        progress: 75,
        startedAt: Date.now() - 1000,
        updatedAt: Date.now(),
      },
    });
  });

  it('resets store slices and invokes optional handlers', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.seatingMode, 'circle');
    const setCurrentSeating = vi.fn();
    const setActivePlanId = vi.fn();
    const setLockedPositions = vi.fn();

    resetApplicationState({
      setCurrentSeating,
      setActivePlanId,
      setLockedPositions,
    });

    const studentState = studentStore.getState();
    expect(studentState.students).toEqual([]);
    expect(studentState.hasPendingStudentUpdates).toBe(false);

    const layoutState = layoutStore.getState();
    expect(layoutState.classroomScene).toEqual(DEFAULT_CLASSROOM_SCENE);
    expect(layoutState.circleLayout).toBeNull();
    expect(layoutState.circleGenerationInProgress).toBe(false);
    expect(layoutState.circleGenerationStatus).toBeNull();
    expect(layoutState.seatingMode).toBe('table');

    expect(setCurrentSeating).toHaveBeenCalledWith([]);
    expect(setActivePlanId).toHaveBeenCalledWith(null);
    expect(setLockedPositions).toHaveBeenCalledWith({});
  });
});
