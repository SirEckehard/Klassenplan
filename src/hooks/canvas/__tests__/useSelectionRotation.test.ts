// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSelectionRotation } from '@/hooks/canvas/useSelectionRotation';
import type {
  SceneTransactionRunner,
  SceneTransactionState,
} from '@/hooks/scene/useSceneManager';
import type { ClassroomFeature, ClassroomTable } from '@/types';

const table = (overrides: Partial<ClassroomTable> = {}): ClassroomTable => ({
  x: 100,
  y: 100,
  width: 130,
  height: 120,
  rotation: 0,
  seatCount: 4,
  locked: false,
  zIndex: 0,
  ...overrides,
});

const cabinet: ClassroomFeature = {
  id: 'cabinet',
  type: 'cabinet',
  x: 300,
  y: 300,
  width: 120,
  height: 40,
  anchor: 'free',
  movable: true,
  rotation: 0,
};

describe('useSelectionRotation', () => {
  let tables: ClassroomTable[];
  let features: ClassroomFeature[];
  let snapshot: ReturnType<typeof vi.fn<() => void>>;
  let runSceneTransaction: ReturnType<typeof vi.fn<SceneTransactionRunner>>;

  beforeEach(() => {
    // Angles well away from the 45° snap, so 20° turns stay 20° turns.
    tables = [table(), table({ rotation: 100 }), table({ locked: true })];
    features = [cabinet];
    snapshot = vi.fn();
    // Applies the transaction to the test's scene, as the scene manager does.
    runSceneTransaction = vi.fn<SceneTransactionRunner>((mutator) => {
      const base: SceneTransactionState = {
        scene: { tables, features, totalStudents: 0 },
        tables,
        features,
        seating: [],
      };
      const result = mutator(base) ?? {};
      tables = result.tables ?? tables;
      features = result.features ?? features;
      return result;
    });
  });

  const renderRotation = (
    selectedTableIds: number[],
    selectedFeatureIds: string[] = [],
  ) =>
    renderHook(() =>
      useSelectionRotation({
        sceneTables: tables,
        sceneFeatures: features,
        selectedTableIds,
        selectedFeatureIds,
        updateSceneTables: (update) => {
          tables = update(tables);
        },
        setSceneFeatures: (update) => {
          features = typeof update === 'function' ? update(features) : update;
        },
        runSceneTransaction,
        snapshot,
        roomWidth: 900,
        roomHeight: 600,
      }),
    );

  it('turns the whole selection when its own table is grabbed', () => {
    const { result } = renderRotation([0, 1, 2], ['cabinet']);

    act(() => {
      result.current.handleRotationGesture({ table: 0 }, 'start', 0);
      result.current.handleRotationGesture({ table: 0 }, 'move', 20);
    });

    // Each from its own angle; the locked table stays where it is.
    expect(tables.map((entry) => entry.rotation)).toEqual([20, 120, 0]);
    expect(features[0].rotation).toBe(20);
  });

  it('turns the selection when one of its room elements is grabbed', () => {
    const { result } = renderRotation([0], ['cabinet']);

    act(() => {
      result.current.handleRotationGesture({ feature: 'cabinet' }, 'start', 0);
      result.current.handleRotationGesture({ feature: 'cabinet' }, 'move', 20);
    });

    expect(tables[0].rotation).toBe(20);
    expect(features[0].rotation).toBe(20);
  });

  it('turns only the grabbed table when it is not part of the selection', () => {
    const { result } = renderRotation([0], ['cabinet']);

    act(() => {
      result.current.handleRotationGesture({ table: 1 }, 'start', 0);
      result.current.handleRotationGesture({ table: 1 }, 'move', 20);
    });

    expect(tables.map((entry) => entry.rotation)).toEqual([0, 120, 0]);
    expect(features[0].rotation).toBe(0);
  });

  it('snaps to 45° steps close by and turns freely elsewhere', () => {
    const { result } = renderRotation([0]);

    act(() => {
      result.current.handleRotationGesture({ table: 0 }, 'start', 0);
      result.current.handleRotationGesture({ table: 0 }, 'move', 92);
    });
    expect(tables[0].rotation).toBe(90);

    act(() => {
      result.current.handleRotationGesture({ table: 0 }, 'move', 63);
    });
    expect(tables[0].rotation).toBeCloseTo(63, 5);
  });

  it('takes one undo step and commits once, when the handle is let go', () => {
    const { result } = renderRotation([0], ['cabinet']);

    act(() => {
      result.current.handleRotationGesture({ table: 0 }, 'start', 0);
      result.current.handleRotationGesture({ table: 0 }, 'move', 20);
      result.current.handleRotationGesture({ table: 0 }, 'move', 45);
    });
    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(runSceneTransaction).not.toHaveBeenCalled();

    act(() => {
      result.current.handleRotationGesture({ table: 0 }, 'end', 0);
    });
    expect(runSceneTransaction).toHaveBeenCalledTimes(1);
    expect(runSceneTransaction.mock.calls[0][1]).toEqual({
      skipSeatingUpdate: true,
    });
    expect(tables[0].rotation).toBe(45);
    expect(features[0].rotation).toBe(45);
  });

  it('leaves no undo step for a click on the handle', () => {
    const { result } = renderRotation([0]);

    act(() => {
      result.current.handleRotationGesture({ table: 0 }, 'start', 0);
      result.current.handleRotationGesture({ table: 0 }, 'end', 0);
    });

    expect(snapshot).not.toHaveBeenCalled();
    expect(runSceneTransaction).not.toHaveBeenCalled();
  });

  it('commits rotations handed to it in one step', () => {
    const { result } = renderRotation([]);

    act(() => {
      result.current.commitRotations({
        tables: new Map([[1, 90]]),
        features: new Map([['cabinet', 90]]),
      });
    });

    expect(runSceneTransaction).toHaveBeenCalledTimes(1);
    expect(tables[1].rotation).toBe(90);
    expect(features[0].rotation).toBe(90);
  });
});
