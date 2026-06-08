// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import {
  useTableOperations,
  type UseTableOperationsParams,
} from '../useTableOperations';
import type { SceneTransactionRunner } from '../../scene/useSceneManager';
import type {
  ClassroomTable,
  ClassroomScene,
  SeatingArrangement,
} from '../../../types';

// Add vitest-dom matchers
import '@testing-library/jest-dom/vitest';

// Mock deepClone utility
vi.mock('../../../utils/deepClone', () => ({
  deepClone: vi.fn((obj) => JSON.parse(JSON.stringify(obj))),
}));

// Mock positioning utilities
vi.mock('../../../utils/positioning', () => ({
  positionTablesRelative: vi.fn(
    (tables: ClassroomTable[], center: { x: number; y: number }) =>
      tables.map((table, index) => ({
        ...table,
        x: center.x + index * 10,
        y: center.y + index * 10,
      })),
  ),
  calculateTableGroupBounds: vi.fn(() => ({
    x: 50,
    y: 50,
    width: 200,
    height: 150,
  })),
}));

// Mock math utilities
vi.mock('../../../utils/math/scene', () => ({
  countSeats: vi.fn((tables: ClassroomTable[]) =>
    tables.reduce((sum, table) => sum + table.seatCount, 0),
  ),
}));

describe('useTableOperations', () => {
  let mockSelectedTableIds: number[];
  let mockSceneTables: ClassroomTable[];
  let mockClassroomScene: ClassroomScene;
  let mockCurrentSeating: SeatingArrangement;
  let mockClipboard: ClassroomTable[] | null;
  let mockSetSelectedTableIds: Mock<UseTableOperationsParams['setSelectedTableIds']>;
  let mockSetClipboard: Mock<UseTableOperationsParams['setClipboard']>;
  let mockRunSceneTransaction: Mock<UseTableOperationsParams['runSceneTransaction']>;
  let mockRemoveTables: Mock<UseTableOperationsParams['removeTables']>;
  let mockSnapshot: Mock<UseTableOperationsParams['snapshot']>;
  let mockToggleSelect: Mock<UseTableOperationsParams['toggleSelect']>;
  let mockClearSelection: Mock<UseTableOperationsParams['clearSelection']>;
  let mockCloseCanvasContextMenu: Mock<UseTableOperationsParams['closeCanvasContextMenu']>;

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
    mockSelectedTableIds = [0, 1];
    mockSceneTables = [
      createMockTable(0),
      createMockTable(1),
      createMockTable(2),
    ];
    mockClassroomScene = {
      tables: mockSceneTables,
      totalStudents: 12,
    };
    mockCurrentSeating = [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    mockClipboard = null;

    mockSetSelectedTableIds = vi.fn();
    mockSetClipboard = vi.fn();
    mockRunSceneTransaction = vi.fn<SceneTransactionRunner>(
      (mutator) => {
        const baseState = {
          scene: mockClassroomScene,
          tables: mockSceneTables,
          features: mockClassroomScene.features ?? [],
          seating: mockCurrentSeating,
        };
        const result = mutator(baseState) ?? {};
        const nextTables = result.tables ?? baseState.tables;
        const nextFeatures = result.features ?? baseState.features;
        const nextScene = result.scene ?? {
          ...baseState.scene,
          tables: nextTables,
          features: nextFeatures,
        };
        const nextSeating = result.seating ?? baseState.seating;
        mockSceneTables = nextTables;
        mockClassroomScene = nextScene;
        mockCurrentSeating = nextSeating;
        return {
          scene: nextScene,
          tables: nextTables,
          features: nextFeatures,
          seating: nextSeating,
        };
      },
    );
    mockRemoveTables = vi.fn();
    mockSnapshot = vi.fn();
    mockToggleSelect = vi.fn().mockImplementation((index, multi) => {
      if (multi) {
        return mockSelectedTableIds.includes(index)
          ? mockSelectedTableIds.filter((id) => id !== index)
          : [...mockSelectedTableIds, index];
      } else {
        return [index];
      }
    });
    mockClearSelection = vi.fn();
    mockCloseCanvasContextMenu = vi.fn();
  });

  const getHookResult = () =>
    renderHook(() =>
      useTableOperations({
        selectedTableIds: mockSelectedTableIds,
        sceneTables: mockSceneTables,
        clipboard: mockClipboard,
        snapToGrid: true,
        classroomWidth: 900,
        classroomHeight: 600,
        studentsCount: 12,
        setSelectedTableIds: mockSetSelectedTableIds,
        setClipboard: mockSetClipboard,
        runSceneTransaction: mockRunSceneTransaction,
        removeTables: mockRemoveTables,
        snapshot: mockSnapshot,
        toggleSelect: mockToggleSelect,
        clearSelection: mockClearSelection,
        closeCanvasContextMenu: mockCloseCanvasContextMenu,
      }),
    );

  it('returns correct interface functions', () => {
    const { result } = getHookResult();

    expect(result.current).toHaveProperty('deleteSelectedTables');
    expect(result.current).toHaveProperty('copySelectedTables');
    expect(result.current).toHaveProperty('cutSelectedTables');
    expect(result.current).toHaveProperty('pasteTablesAt');
    expect(result.current).toHaveProperty('handleCanvasMenuPaste');
    expect(result.current).toHaveProperty('applySelectionForTable');

    expect(typeof result.current.deleteSelectedTables).toBe('function');
    expect(typeof result.current.copySelectedTables).toBe('function');
    expect(typeof result.current.cutSelectedTables).toBe('function');
    expect(typeof result.current.pasteTablesAt).toBe('function');
    expect(typeof result.current.handleCanvasMenuPaste).toBe('function');
    expect(typeof result.current.applySelectionForTable).toBe('function');
  });

  describe('applySelectionForTable', () => {
    it('applies multi-selection correctly', () => {
      const { result } = getHookResult();

      const newSelection = result.current.applySelectionForTable(2, true);

      expect(mockToggleSelect).toHaveBeenCalledWith(2, true);
      expect(newSelection).toEqual([0, 1, 2]);
    });

    it('applies single selection when table not selected', () => {
      const { result } = getHookResult();

      const newSelection = result.current.applySelectionForTable(2, false);

      expect(mockToggleSelect).toHaveBeenCalledWith(2, false);
      expect(newSelection).toEqual([2]);
    });

    it('keeps selection when table already selected in single mode', () => {
      const { result } = getHookResult();

      const newSelection = result.current.applySelectionForTable(0, false);

      expect(mockToggleSelect).not.toHaveBeenCalled();
      expect(newSelection).toEqual([0, 1]);
    });
  });

  describe('deleteSelectedTables', () => {
    it('deletes selected tables correctly', () => {
      const { result } = getHookResult();

      act(() => {
        result.current.deleteSelectedTables();
      });

      expect(mockSnapshot).toHaveBeenCalled();
      expect(mockRunSceneTransaction).toHaveBeenCalled();
      expect(mockRemoveTables).toHaveBeenCalledWith([1, 0], {
        skipSeatingUpdate: true,
      });
      expect(mockSceneTables).toHaveLength(1);
      expect(mockSceneTables[0].zIndex).toBe(0);
      expect(mockCurrentSeating).toHaveLength(1);
      expect(mockSetSelectedTableIds).toHaveBeenCalledWith([]);
    });

    it('does nothing when no tables selected', () => {
      mockSelectedTableIds = [];
      const { result } = getHookResult();

      act(() => {
        result.current.deleteSelectedTables();
      });

      expect(mockSnapshot).not.toHaveBeenCalled();
      expect(mockRemoveTables).not.toHaveBeenCalled();
      expect(mockRunSceneTransaction).not.toHaveBeenCalled();
    });
  });

  describe('copySelectedTables', () => {
    it('copies selected tables to clipboard', () => {
      const { result } = getHookResult();

      act(() => {
        result.current.copySelectedTables();
      });

      expect(mockSetClipboard).toHaveBeenCalledWith([
        expect.objectContaining({ x: 100 }),
        expect.objectContaining({ x: 150 }),
      ]);
    });

    it('does nothing when no tables selected', () => {
      mockSelectedTableIds = [];
      const { result } = getHookResult();

      act(() => {
        result.current.copySelectedTables();
      });

      expect(mockSetClipboard).not.toHaveBeenCalled();
    });
  });

  describe('cutSelectedTables', () => {
    it('copies and deletes selected tables', () => {
      const { result } = getHookResult();

      act(() => {
        result.current.cutSelectedTables();
      });

      expect(mockSetClipboard).toHaveBeenCalled();
      expect(mockSnapshot).toHaveBeenCalled();
      expect(mockRunSceneTransaction).toHaveBeenCalled();
      expect(mockRemoveTables).toHaveBeenCalledWith(expect.any(Array), {
        skipSeatingUpdate: true,
      });
    });
  });

  describe('pasteTablesAt', () => {
    beforeEach(() => {
      mockClipboard = [createMockTable(0), createMockTable(1)];
    });

    const renderPasteHook = () =>
      renderHook(() =>
        useTableOperations({
          selectedTableIds: mockSelectedTableIds,
          sceneTables: mockSceneTables,
          clipboard: mockClipboard,
          snapToGrid: true,
          classroomWidth: 900,
          classroomHeight: 600,
          studentsCount: 12,
          setSelectedTableIds: mockSetSelectedTableIds,
          setClipboard: mockSetClipboard,
          runSceneTransaction: mockRunSceneTransaction,
          removeTables: mockRemoveTables,
          snapshot: mockSnapshot,
          toggleSelect: mockToggleSelect,
          clearSelection: mockClearSelection,
          closeCanvasContextMenu: mockCloseCanvasContextMenu,
        }),
      );

    it('pastes tables at specified coordinates', () => {
      const { result } = renderPasteHook();

      act(() => {
        result.current.pasteTablesAt({ sceneX: 300, sceneY: 400 });
      });

      expect(mockSnapshot).toHaveBeenCalled();
      expect(mockRunSceneTransaction).toHaveBeenCalled();
      expect(mockSetSelectedTableIds).toHaveBeenCalledWith([3, 4]);
      expect(mockSceneTables).toHaveLength(5);
      expect(mockCurrentSeating).toHaveLength(5);
    });

    it('pastes tables at original center when no coordinates provided', () => {
      const { result } = renderPasteHook();

      act(() => {
        result.current.pasteTablesAt();
      });

      expect(mockSnapshot).toHaveBeenCalled();
      expect(mockRunSceneTransaction).toHaveBeenCalled();
    });

    it('does nothing when clipboard is empty', () => {
      mockClipboard = null;
      const { result } = renderPasteHook();

      act(() => {
        result.current.pasteTablesAt({ sceneX: 300, sceneY: 400 });
      });

      expect(mockSnapshot).not.toHaveBeenCalled();
      expect(mockRunSceneTransaction).not.toHaveBeenCalled();
      expect(mockSetSelectedTableIds).not.toHaveBeenCalled();
    });
  });

  describe('handleCanvasMenuPaste', () => {
    it('calls pasteTablesAt with state coordinates, closes menu, and clears selection', () => {
      mockClipboard = [createMockTable(0)];
      const { result } = renderHook(() =>
        useTableOperations({
          selectedTableIds: mockSelectedTableIds,
          sceneTables: mockSceneTables,
          clipboard: mockClipboard,
          snapToGrid: true,
          classroomWidth: 900,
          classroomHeight: 600,
          studentsCount: 12,
          setSelectedTableIds: mockSetSelectedTableIds,
          setClipboard: mockSetClipboard,
          runSceneTransaction: mockRunSceneTransaction,
          removeTables: mockRemoveTables,
          snapshot: mockSnapshot,
          toggleSelect: mockToggleSelect,
          clearSelection: mockClearSelection,
          closeCanvasContextMenu: mockCloseCanvasContextMenu,
        }),
      );

      const mockState = {
        clientX: 100,
        clientY: 200,
        sceneX: 300,
        sceneY: 400,
      };

      act(() => {
        result.current.handleCanvasMenuPaste(mockState);
      });

      expect(mockSnapshot).toHaveBeenCalled();
      expect(mockCloseCanvasContextMenu).toHaveBeenCalled();
      expect(mockClearSelection).toHaveBeenCalled();
      expect(mockRunSceneTransaction).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles empty scene tables', () => {
      mockSceneTables = [];
      mockSelectedTableIds = [];
      const { result } = getHookResult();

      act(() => {
        result.current.deleteSelectedTables();
      });

      expect(mockRemoveTables).not.toHaveBeenCalled();
    });

    it('handles clipboard with different table types', () => {
      mockClipboard = [
        { ...createMockTable(0), templateType: 'single', seatCount: 1 },
        { ...createMockTable(1), templateType: 'group6', seatCount: 6 },
      ];

      const { result } = renderHook(() =>
        useTableOperations({
          selectedTableIds: mockSelectedTableIds,
          sceneTables: mockSceneTables,
          clipboard: mockClipboard,
          snapToGrid: false, // Test without grid snapping
          classroomWidth: 900,
          classroomHeight: 600,
          studentsCount: 12,
          setSelectedTableIds: mockSetSelectedTableIds,
          setClipboard: mockSetClipboard,
          runSceneTransaction: mockRunSceneTransaction,
          removeTables: mockRemoveTables,
          snapshot: mockSnapshot,
          toggleSelect: mockToggleSelect,
          clearSelection: mockClearSelection,
          closeCanvasContextMenu: mockCloseCanvasContextMenu,
        }),
      );

      act(() => {
        result.current.pasteTablesAt({ sceneX: 100, sceneY: 100 });
      });

      expect(mockRunSceneTransaction).toHaveBeenCalled();
      expect(mockSceneTables).toHaveLength(5);
      expect(mockCurrentSeating).toHaveLength(5);
    });
  });
});
