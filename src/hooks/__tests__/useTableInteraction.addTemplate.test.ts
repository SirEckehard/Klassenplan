// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useTableInteraction from '@/hooks/useTableInteraction';
import type {
  SceneTransactionRunner,
  SceneTransactionState,
} from '@/hooks/scene/useSceneManager';
import type { ClassroomFeature, ClassroomTable } from '@/types';
import { CLASSROOM_HEIGHT, CLASSROOM_WIDTH, getTablePresets } from '@/utils';

describe('useTableInteraction – adding a table by click', () => {
  let tables: ClassroomTable[];
  let features: ClassroomFeature[];
  let snapshot: ReturnType<typeof vi.fn<() => void>>;
  let setSelectedTableIds: ReturnType<
    typeof vi.fn<React.Dispatch<React.SetStateAction<number[]>>>
  >;
  let runSceneTransaction: ReturnType<typeof vi.fn<SceneTransactionRunner>>;

  beforeEach(() => {
    tables = [];
    features = [];
    snapshot = vi.fn();
    setSelectedTableIds =
      vi.fn<React.Dispatch<React.SetStateAction<number[]>>>();
    runSceneTransaction = vi.fn((mutator) => {
      const base: SceneTransactionState = {
        scene: { tables, features, totalStudents: 0 },
        tables,
        features,
        seating: [],
      };
      const result = mutator(base) ?? {};
      tables = result.tables ?? tables;
      return result;
    });
  });

  const renderInteraction = () =>
    renderHook(() =>
      useTableInteraction({
        sceneTables: tables,
        sceneFeatures: features,
        selectedFeatureIds: [],
        setSceneFeatures: vi.fn(),
        updateSceneTables: vi.fn(),
        runSceneTransaction,
        snapshot,
        commitScene: vi.fn(),
        setSelectedTableIds,
        snapToGrid: true,
        classroomWidth: CLASSROOM_WIDTH,
        classroomHeight: CLASSROOM_HEIGHT,
        canvasWidth: CLASSROOM_WIDTH,
        canvasRef: { current: null },
        alignmentGuidesEnabled: false,
        setActiveAlignmentGuides: vi.fn(),
      }),
    );

  it('puts the first table in the middle of the room and selects it', () => {
    const { result } = renderInteraction();
    const preset = getTablePresets().double;

    let added = false;
    act(() => {
      added = result.current.addTemplate('double');
    });

    expect(added).toBe(true);
    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(tables).toHaveLength(1);
    const [table] = tables;
    expect(table).toMatchObject({ templateType: 'double', rotation: 0 });
    // Centred within a step of the grid it is tried on.
    expect(
      Math.abs(table.x + preset.width / 2 - CLASSROOM_WIDTH / 2),
    ).toBeLessThanOrEqual(5);
    expect(
      Math.abs(table.y + preset.height / 2 - CLASSROOM_HEIGHT / 2),
    ).toBeLessThanOrEqual(5);
    expect(setSelectedTableIds).toHaveBeenCalledWith([0]);
  });

  it('puts the next one beside what already stands there', () => {
    const { result, rerender } = renderInteraction();

    act(() => {
      result.current.addTemplate('group4');
    });
    rerender();
    act(() => {
      result.current.addTemplate('group4');
    });

    const [first, second] = tables;
    const apart =
      second.x >= first.x + first.width ||
      first.x >= second.x + second.width ||
      second.y >= first.y + first.height ||
      first.y >= second.y + second.height;
    expect(apart).toBe(true);
    expect(setSelectedTableIds).toHaveBeenLastCalledWith([1]);
  });

  it('reports a room without space left', () => {
    features = [
      {
        id: 'wall-to-wall',
        type: 'cabinet',
        x: 0,
        y: 0,
        width: CLASSROOM_WIDTH,
        height: CLASSROOM_HEIGHT,
        anchor: 'free',
        movable: true,
        rotation: 0,
      },
    ];
    const { result } = renderInteraction();

    let added = true;
    act(() => {
      added = result.current.addTemplate('single');
    });

    expect(added).toBe(false);
    expect(snapshot).not.toHaveBeenCalled();
    expect(runSceneTransaction).not.toHaveBeenCalled();
  });
});
