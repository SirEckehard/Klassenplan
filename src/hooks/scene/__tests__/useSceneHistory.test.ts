// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import {
  useSceneHistory,
  type UseSceneHistoryParams,
} from '../useSceneHistory';
import type {
  SceneTransactionResult,
  SceneTransactionState,
} from '@/hooks/scene/useSceneManager';
import type {
  ClassroomScene,
  SeatingArrangement,
  ClassroomTable,
  ClassroomFeature,
} from '@/types';
import type { FeatureVisibilityFlags } from '@/utils/ui';

// Add vitest-dom matchers
import '@testing-library/jest-dom/vitest';

describe('useSceneHistory', () => {
  // Mutable "committed store" double: the hook reads it through synchronous
  // getters, and the transaction mock writes results back — mirroring how
  // useSceneManager keeps its refs in sync without React re-renders.
  let committedScene: ClassroomScene;
  let committedSeating: SeatingArrangement;
  let visibilityFlags: FeatureVisibilityFlags;

  let mockRunSceneTransaction: Mock<
    UseSceneHistoryParams['runSceneTransaction']
  >;
  let mockSetAllFeatureVisibility: Mock<
    UseSceneHistoryParams['setAllFeatureVisibility']
  >;
  let mockSetSelectedTableIds: Mock<
    UseSceneHistoryParams['setSelectedTableIds']
  >;
  let mockSetSelectedFeatureIds: Mock<
    UseSceneHistoryParams['setSelectedFeatureIds']
  >;

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

  const createBoardFeature = (): ClassroomFeature => ({
    id: 'board-1',
    type: 'board',
    visible: true,
    x: 300,
    y: 0,
    width: 240,
    height: 20,
    anchor: 'top',
    movable: false,
    label: 'Tafel',
  });

  const buildParams = (): UseSceneHistoryParams => ({
    getCommittedSceneState: () => ({
      scene: committedScene,
      seating: committedSeating,
    }),
    runSceneTransaction: mockRunSceneTransaction,
    getFeatureVisibility: () => visibilityFlags,
    setAllFeatureVisibility: mockSetAllFeatureVisibility,
    setSelectedTableIds: mockSetSelectedTableIds,
    setSelectedFeatureIds: mockSetSelectedFeatureIds,
  });

  const renderHistory = () => renderHook(() => useSceneHistory(buildParams()));

  beforeEach(() => {
    committedScene = {
      tables: [createMockTable(0), createMockTable(1)],
      totalStudents: 8,
      features: [] as ClassroomFeature[],
    };
    committedSeating = [
      [null, null, null, null],
      [null, null, null, null],
    ];
    visibilityFlags = { board: true };

    mockRunSceneTransaction = vi.fn(
      (
        mutator: (
          state: SceneTransactionState,
        ) => SceneTransactionResult | void,
      ): SceneTransactionResult => {
        const baseState: SceneTransactionState = {
          scene: committedScene,
          tables: committedScene.tables,
          features: committedScene.features ?? [],
          seating: committedSeating,
        };
        const result = mutator(baseState) ?? {};
        const nextTables = result.tables ?? baseState.tables;
        const nextFeatures = result.features ?? baseState.features;
        const nextSeating = result.seating ?? baseState.seating;
        const nextScene =
          result.scene ??
          ({
            ...baseState.scene,
            tables: nextTables,
            features: nextFeatures,
          } as ClassroomScene);

        committedScene = nextScene;
        committedSeating = nextSeating;
        return {
          scene: nextScene,
          tables: nextTables,
          features: nextFeatures,
          seating: nextSeating,
        };
      },
    );
    mockSetAllFeatureVisibility = vi.fn((flags: FeatureVisibilityFlags) => {
      visibilityFlags = { ...flags };
    });
    mockSetSelectedTableIds = vi.fn();
    mockSetSelectedFeatureIds = vi.fn();
  });

  it('initializes with empty history', () => {
    const { result } = renderHistory();

    expect(result.current.history).toEqual([]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('creates snapshot correctly', () => {
    const { result } = renderHistory();

    act(() => {
      result.current.snapshot();
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.history[0]).toMatchObject({
      scene: committedScene,
      seating: committedSeating,
      featureVisibility: { board: true },
    });
    expect(result.current.history[0].signature).toEqual(expect.any(String));
  });

  it('prevents duplicate snapshots', () => {
    const { result } = renderHistory();

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

  it('records back-to-back mutations without a re-render (regression: skipped undo steps)', () => {
    const { result } = renderHistory();

    // Gesture A: snapshot before mutation, then commit S1 — all within the
    // same render cycle (the hook never re-renders in between).
    act(() => {
      result.current.snapshot();
      mockRunSceneTransaction(({ tables }) => ({
        tables: tables.map((table) => ({ ...table, x: table.x + 10 })),
      }));
    });

    // Gesture B fires immediately afterwards; its snapshot must capture S1,
    // not the stale pre-A scene (the old closure-based code deduped it away).
    act(() => {
      result.current.snapshot();
      mockRunSceneTransaction(({ tables }) => ({
        tables: tables.map((table) => ({ ...table, x: table.x + 10 })),
      }));
    });

    expect(result.current.history).toHaveLength(2);
    expect(committedScene.tables[0].x).toBe(120);

    // First undo reverts only gesture B (back to S1) …
    act(() => {
      result.current.undo();
    });
    expect(committedScene.tables[0].x).toBe(110);

    // … second undo reverts gesture A (back to S0); no step is skipped.
    act(() => {
      result.current.undo();
    });
    expect(committedScene.tables[0].x).toBe(100);
    expect(result.current.history).toHaveLength(0);
  });

  it('limits history to 50 entries', () => {
    const { result } = renderHistory();

    // Create 52 different snapshots by mutating the committed store between
    // pushes — no re-render required with the synchronous getters.
    for (let i = 0; i < 52; i++) {
      committedScene = { ...committedScene, totalStudents: i };
      act(() => {
        result.current.snapshot();
      });
    }

    // Should be limited to 50 entries, keeping the most recent ones
    expect(result.current.history).toHaveLength(50);
    expect(result.current.history[49].scene.totalStudents).toBe(51);
    expect(result.current.history[0].scene.totalStudents).toBe(2);
  });

  it('performs undo correctly', () => {
    const { result } = renderHistory();

    act(() => {
      result.current.snapshot();
    });
    committedScene = { ...committedScene, totalStudents: 12 };

    act(() => {
      result.current.undo();
    });

    expect(result.current.history).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);

    // The restore transaction wrote the snapshot back into the store
    expect(mockRunSceneTransaction).toHaveBeenCalled();
    expect(committedScene.totalStudents).toBe(8);
    expect(committedScene.tables).toEqual([
      expect.objectContaining({ x: 100 }),
      expect.objectContaining({ x: 150 }),
    ]);
    expect(mockSetSelectedTableIds).toHaveBeenCalledWith([]);
    expect(mockSetSelectedFeatureIds).toHaveBeenCalledWith([]);
  });

  it('reverts exactly one step per undo call, even in rapid succession', () => {
    const { result } = renderHistory();

    for (let i = 0; i < 3; i++) {
      committedScene = { ...committedScene, totalStudents: 8 + i };
      act(() => {
        result.current.snapshot();
      });
    }
    committedScene = { ...committedScene, totalStudents: 20 };

    expect(result.current.history).toHaveLength(3);

    const restoredStudents: number[] = [];
    act(() => {
      result.current.undo();
      restoredStudents.push(committedScene.totalStudents);
      result.current.undo();
      restoredStudents.push(committedScene.totalStudents);
      result.current.undo();
      restoredStudents.push(committedScene.totalStudents);
    });

    // Each call steps back exactly one snapshot, in reverse order
    expect(restoredStudents).toEqual([10, 9, 8]);
    expect(result.current.history).toHaveLength(0);
  });

  it('handles empty history on undo', () => {
    const { result } = renderHistory();

    expect(result.current.history).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);

    act(() => {
      result.current.undo();
    });

    expect(result.current.history).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
    expect(mockRunSceneTransaction).not.toHaveBeenCalled();
  });

  describe('redo', () => {
    it('restores the pre-undo state via redo', () => {
      const { result } = renderHistory();

      act(() => {
        result.current.snapshot();
      });
      committedScene = { ...committedScene, totalStudents: 12 };

      act(() => {
        result.current.undo();
      });
      expect(committedScene.totalStudents).toBe(8);
      expect(result.current.canRedo).toBe(true);

      act(() => {
        result.current.redo();
      });
      expect(committedScene.totalStudents).toBe(12);
      expect(result.current.canRedo).toBe(false);
      // Redo pushed the restored-from state back onto the undo stack
      expect(result.current.canUndo).toBe(true);
    });

    it('round-trips undo → redo → undo', () => {
      const { result } = renderHistory();

      act(() => {
        result.current.snapshot();
      });
      committedScene = { ...committedScene, totalStudents: 12 };

      act(() => {
        result.current.undo();
        result.current.redo();
        result.current.undo();
      });

      expect(committedScene.totalStudents).toBe(8);
      expect(result.current.canRedo).toBe(true);
    });

    it('clears the redo stack when a new mutation is snapshotted', () => {
      const { result } = renderHistory();

      act(() => {
        result.current.snapshot();
      });
      committedScene = { ...committedScene, totalStudents: 12 };

      act(() => {
        result.current.undo();
      });
      expect(result.current.canRedo).toBe(true);

      // A new gesture: snapshot + mutation invalidates the redo branch
      committedScene = { ...committedScene, totalStudents: 30 };
      act(() => {
        result.current.snapshot();
      });
      expect(result.current.canRedo).toBe(false);
    });

    it('supports multiple undo steps followed by multiple redo steps', () => {
      const { result } = renderHistory();

      for (let i = 0; i < 3; i++) {
        committedScene = { ...committedScene, totalStudents: 8 + i };
        act(() => {
          result.current.snapshot();
        });
      }
      committedScene = { ...committedScene, totalStudents: 20 };

      act(() => {
        result.current.undo();
        result.current.undo();
        result.current.undo();
      });
      expect(committedScene.totalStudents).toBe(8);

      const redoneStudents: number[] = [];
      act(() => {
        result.current.redo();
        redoneStudents.push(committedScene.totalStudents);
        result.current.redo();
        redoneStudents.push(committedScene.totalStudents);
        result.current.redo();
        redoneStudents.push(committedScene.totalStudents);
      });

      // Redo replays the undone states in original order, one per call
      expect(redoneStudents).toEqual([9, 10, 20]);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.canUndo).toBe(true);
    });

    it('no-ops on empty redo stack', () => {
      const { result } = renderHistory();

      act(() => {
        result.current.redo();
      });

      expect(result.current.canRedo).toBe(false);
      expect(mockRunSceneTransaction).not.toHaveBeenCalled();
    });
  });

  describe('feature visibility', () => {
    it('restores visibility flags on undo (board delete scenario)', () => {
      committedScene = {
        ...committedScene,
        features: [createBoardFeature()],
      };
      const { result } = renderHistory();

      // Delete flow: snapshot before mutation, then remove the board and
      // toggle its per-type visibility off (outside the scene).
      act(() => {
        result.current.snapshot();
      });
      committedScene = { ...committedScene, features: [] };
      visibilityFlags = { board: false };

      act(() => {
        result.current.undo();
      });

      expect(committedScene.features).toEqual([
        expect.objectContaining({ id: 'board-1', type: 'board' }),
      ]);
      expect(mockSetAllFeatureVisibility).toHaveBeenCalledWith({
        board: true,
      });
      expect(visibilityFlags).toEqual({ board: true });
    });

    it('treats visibility-only changes as distinct snapshots', () => {
      const { result } = renderHistory();

      act(() => {
        result.current.snapshot();
      });

      // Same scene/seating, only the visibility record differs
      visibilityFlags = { board: false };
      act(() => {
        result.current.snapshot();
      });

      expect(result.current.history).toHaveLength(2);
    });
  });

  it('restores snapshot correctly', () => {
    const { result } = renderHistory();

    const testSnapshot = {
      scene: {
        tables: [createMockTable(5), createMockTable(6)],
        totalStudents: 4,
      },
      seating: [
        [null, null],
        [null, null],
      ] as SeatingArrangement,
      featureVisibility: { board: false },
      signature: 'custom-snapshot',
    };

    act(() => {
      result.current.restoreFromSnapshot(testSnapshot);
    });

    expect(mockRunSceneTransaction).toHaveBeenCalledTimes(1);
    expect(committedScene.tables).toEqual([
      expect.objectContaining({ x: 350 }),
      expect.objectContaining({ x: 400 }),
    ]);
    expect(committedScene.totalStudents).toBe(4);
    expect(committedSeating).toEqual([
      [null, null],
      [null, null],
    ]);
    expect(mockSetSelectedTableIds).toHaveBeenCalledWith([]);
    expect(mockSetSelectedFeatureIds).toHaveBeenCalledWith([]);
    expect(mockSetAllFeatureVisibility).toHaveBeenCalledWith({ board: false });
  });

  it('creates deep clones for snapshots', () => {
    const { result } = renderHistory();

    act(() => {
      result.current.snapshot();
    });

    // Modify original data
    committedScene.totalStudents = 999;
    committedScene.tables[0].x = 999;
    visibilityFlags.board = false;

    // Snapshot should not be affected by modifications to original data
    expect(result.current.history[0].scene.totalStudents).toBe(8);
    expect(result.current.history[0].scene.tables[0].x).toBe(100);
    expect(result.current.history[0].featureVisibility.board).toBe(true);
  });
});
