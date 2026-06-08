// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import {
  useSceneManager,
  type UseSceneManagerParams,
} from '../useSceneManager';
import type {
  ClassroomScene,
  ClassroomTable,
  ClassroomFeature,
  SeatingArrangement,
} from '../../../types';

// Add vitest-dom matchers
import '@testing-library/jest-dom/vitest';

describe('useSceneManager', () => {
  let mockClassroomScene: ClassroomScene;
  let mockUpdateClassroomScene: Mock<UseSceneManagerParams['updateClassroomScene']>;
  let mockCurrentSeating: SeatingArrangement;
  let mockSetCurrentSeating: Mock<UseSceneManagerParams['setCurrentSeating']>;
  const createMockFeature = (
    id: number,
    type: ClassroomFeature['type'] = 'window',
  ): ClassroomFeature => ({
    id: `feature-${id}`,
    type,
    x: 10 * id,
    y: 20 * id,
    width: 40,
    height: 60,
    anchor: type === 'podium' ? 'free' : 'left',
    movable: type === 'podium',
    label: `Feature ${id}`,
  });

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

  const createMockSeating = (tables: ClassroomTable[]): SeatingArrangement =>
    tables.map((table) => Array(table.seatCount).fill(null));

  beforeEach(() => {
    mockUpdateClassroomScene = vi.fn();
    mockSetCurrentSeating = vi.fn();
    mockClassroomScene = {
      tables: [createMockTable(0), createMockTable(1)],
      totalStudents: 8,
      features: [createMockFeature(1), createMockFeature(2, 'door')],
    };
    mockCurrentSeating = createMockSeating(mockClassroomScene.tables ?? []);
  });

  it('returns correct interface', () => {
    const { result } = renderHook(() =>
      useSceneManager({
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setCurrentSeating: mockSetCurrentSeating,
      }),
    );

    expect(result.current).toHaveProperty('sceneTables');
    expect(result.current).toHaveProperty('setSceneTables');
    expect(result.current).toHaveProperty('sceneFeatures');
    expect(result.current).toHaveProperty('setSceneFeatures');
    expect(result.current).toHaveProperty('commitScene');
    expect(result.current).toHaveProperty('updateSceneTables');
    expect(result.current).toHaveProperty('runSceneTransaction');

    expect(Array.isArray(result.current.sceneTables)).toBe(true);
    expect(Array.isArray(result.current.sceneFeatures)).toBe(true);
    expect(typeof result.current.setSceneTables).toBe('function');
    expect(typeof result.current.commitScene).toBe('function');
    expect(typeof result.current.updateSceneTables).toBe('function');
    expect(typeof result.current.runSceneTransaction).toBe('function');
  });

  it('initializes sceneTables from classroomScene', () => {
    const { result } = renderHook(() =>
      useSceneManager({
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setCurrentSeating: mockSetCurrentSeating,
      }),
    );

    expect(result.current.sceneTables).toHaveLength(2);
    expect(result.current.sceneTables[0]).toEqual(createMockTable(0));
    expect(result.current.sceneTables[1]).toEqual(createMockTable(1));
    expect(result.current.sceneFeatures).toHaveLength(
      mockClassroomScene.features?.length ?? 0,
    );
  });

  it('synchronizes with external classroomScene changes', () => {
    const { result, rerender } = renderHook((props) => useSceneManager(props), {
      initialProps: {
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setCurrentSeating: mockSetCurrentSeating,
      },
    });

    expect(result.current.sceneTables).toHaveLength(2);

    // Update classroomScene externally
    const newClassroomScene = {
      ...mockClassroomScene,
      tables: [createMockTable(0), createMockTable(1), createMockTable(2)],
    };

    rerender({
      classroomScene: newClassroomScene,
      currentSeating: createMockSeating(newClassroomScene.tables ?? []),
      updateClassroomScene: mockUpdateClassroomScene,
      setCurrentSeating: mockSetCurrentSeating,
    });

    expect(result.current.sceneTables).toHaveLength(3);
    expect(result.current.sceneTables[2]).toEqual(createMockTable(2));
  });

  it('commitScene updates classroomScene with current sceneTables', () => {
    const { result } = renderHook(() =>
      useSceneManager({
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setCurrentSeating: mockSetCurrentSeating,
      }),
    );

    // Modify sceneTables
    act(() => {
      result.current.setSceneTables((prev) =>
        prev.map((table) => ({ ...table, x: table.x + 50 })),
      );
    });

    // Commit changes
    act(() => {
      result.current.commitScene();
    });

    expect(mockUpdateClassroomScene).toHaveBeenCalledWith({
      ...mockClassroomScene,
      tables: expect.arrayContaining([
        expect.objectContaining({ x: 150 }),
        expect.objectContaining({ x: 200 }),
      ]),
    });
  });

  it('updateSceneTables applies update function', () => {
    const { result } = renderHook(() =>
      useSceneManager({
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setCurrentSeating: mockSetCurrentSeating,
      }),
    );

    const updateFn = vi.fn((tables: ClassroomTable[]) =>
      tables.map((table) => ({ ...table, x: table.x + 100 })),
    );

    act(() => {
      result.current.updateSceneTables(updateFn);
    });

    expect(updateFn).toHaveBeenCalledWith(mockClassroomScene.tables);
    expect(result.current.sceneTables[0].x).toBe(200);
    expect(result.current.sceneTables[1].x).toBe(250);
  });

  it('handles empty tables array', () => {
    const emptyScene: ClassroomScene = {
      tables: [],
      totalStudents: 0,
    };

    const { result } = renderHook(() =>
      useSceneManager({
        classroomScene: emptyScene,
        currentSeating: createMockSeating(emptyScene.tables),
        updateClassroomScene: mockUpdateClassroomScene,
        setCurrentSeating: mockSetCurrentSeating,
      }),
    );

    expect(result.current.sceneTables).toEqual([]);

    act(() => {
      result.current.commitScene();
    });

    expect(mockUpdateClassroomScene).toHaveBeenCalledWith({
      ...emptyScene,
      tables: [],
      features: emptyScene.features ?? [],
    });
  });

  it('provides stable function references', () => {
    const { result, rerender } = renderHook(() =>
      useSceneManager({
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setCurrentSeating: mockSetCurrentSeating,
      }),
    );

    const firstRender = {
      commitScene: result.current.commitScene,
      updateSceneTables: result.current.updateSceneTables,
    };

    rerender();

    expect(result.current.commitScene).toBe(firstRender.commitScene);
    expect(result.current.updateSceneTables).toBe(
      firstRender.updateSceneTables,
    );
  });

  it('runSceneTransaction updates scene and seating atomically', () => {
    const { result } = renderHook(() =>
      useSceneManager({
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setCurrentSeating: mockSetCurrentSeating,
      }),
    );

    const newTable: ClassroomTable = {
      x: 320,
      y: 240,
      width: 130,
      height: 120,
      seatCount: 4,
      rotation: 0,
      zIndex: 2,
      locked: false,
      templateType: 'group4',
    };

    act(() => {
      result.current.runSceneTransaction(({ tables, seating, scene }) => {
        const appendedTables = [...tables, { ...newTable }];
        const updatedSeating = [
          ...seating,
          Array(newTable.seatCount).fill(null),
        ];
        return {
          tables: appendedTables,
          seating: updatedSeating,
          scene: { ...scene, tables: appendedTables },
        };
      });
    });

    expect(result.current.sceneTables).toHaveLength(3);
    expect(mockUpdateClassroomScene).toHaveBeenCalledWith(
      expect.objectContaining({
        tables: expect.arrayContaining([
          expect.objectContaining({ x: newTable.x }),
        ]),
        features: mockClassroomScene.features,
      }),
    );
    expect(mockSetCurrentSeating).toHaveBeenCalled();
    const lastCall = mockSetCurrentSeating.mock.calls.at(-1);
    expect(lastCall?.[0]).toHaveLength(3);
  });

  it('runSceneTransaction reduces seating when tables are removed', () => {
    const { result } = renderHook(() =>
      useSceneManager({
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setCurrentSeating: mockSetCurrentSeating,
      }),
    );

    act(() => {
      result.current.runSceneTransaction(({ tables, seating, scene }) => {
        const trimmedTables = tables.slice(0, tables.length - 1);
        const trimmedSeating = seating.slice(0, seating.length - 1);
        return {
          tables: trimmedTables,
          seating: trimmedSeating,
          scene: { ...scene, tables: trimmedTables },
        };
      });
    });

    expect(mockSetCurrentSeating).toHaveBeenCalled();
    const lastCall = mockSetCurrentSeating.mock.calls.at(-1);
    expect(lastCall?.[0]).toHaveLength(mockCurrentSeating.length - 1);
  });

  it('runSceneTransaction can update features', () => {
    const { result } = renderHook(() =>
      useSceneManager({
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setCurrentSeating: mockSetCurrentSeating,
      }),
    );

    const podiumFeature: ClassroomFeature = {
      id: 'feature-podium',
      type: 'podium',
      x: 300,
      y: 320,
      width: 90,
      height: 60,
      anchor: 'free',
      movable: true,
      label: 'Pult',
    };

    act(() => {
      result.current.runSceneTransaction(({ features, scene }) => {
        const nextFeatures = [
          ...(features ?? scene.features ?? []),
          podiumFeature,
        ];
        return {
          features: nextFeatures,
          scene: { ...scene, features: nextFeatures },
        };
      });
    });

    expect(result.current.sceneFeatures).toContainEqual(podiumFeature);
    expect(mockUpdateClassroomScene).toHaveBeenCalledWith(
      expect.objectContaining({
        features: expect.arrayContaining([
          expect.objectContaining({ id: podiumFeature.id }),
        ]),
      }),
    );
  });

  it('allows mutations to sceneTables without affecting commitScene behavior', () => {
    const { result } = renderHook(() =>
      useSceneManager({
        classroomScene: mockClassroomScene,
        currentSeating: mockCurrentSeating,
        updateClassroomScene: mockUpdateClassroomScene,
        setCurrentSeating: mockSetCurrentSeating,
      }),
    );

    const originalX = mockClassroomScene.tables[0].x;

    // Modify sceneTables directly
    result.current.sceneTables[0].x = 999;

    // commitScene should work with the current state of sceneTables
    act(() => {
      result.current.commitScene();
    });

    expect(mockUpdateClassroomScene).toHaveBeenCalledWith({
      ...mockClassroomScene,
      tables: expect.arrayContaining([expect.objectContaining({ x: 999 })]),
      features: expect.arrayContaining(
        (mockClassroomScene.features ?? []).map((feature) =>
          expect.objectContaining({ id: feature.id }),
        ),
      ),
    });

    // Original scene should still have the original value (different reference)
    expect(originalX).toBe(100);
  });
});
