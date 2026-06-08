import React from 'react';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import type { ClassroomTable } from '@/types';
import type { CanvasContextMenuState } from '@/hooks/useContextMenus';
import {
  deepClone,
  positionTablesRelative,
  calculateTableGroupBounds,
} from '@/utils';
import { countSeats } from '@/utils/math/scene';
import { addSeatingForTables } from '@/utils/seating/seatingOperations';
import type { SceneTransactionRunner } from '@/hooks/scene/useSceneManager';

export interface TableOperationsHook {
  deleteSelectedTables: () => void;
  copySelectedTables: () => void;
  cutSelectedTables: () => void;
  pasteTablesAt: (coords?: { sceneX?: number; sceneY?: number }) => void;
  handleCanvasMenuPaste: (state: CanvasContextMenuState) => void;
  applySelectionForTable: (tableIndex: number, multi: boolean) => number[];
}

export interface UseTableOperationsParams {
  // State
  selectedTableIds: number[];
  sceneTables: ClassroomTable[];
  clipboard: ClassroomTable[] | null;
  snapToGrid: boolean;
  classroomWidth: number;
  classroomHeight: number;
  studentsCount: number;

  // State setters
  setSelectedTableIds: React.Dispatch<React.SetStateAction<number[]>>;
  setClipboard: React.Dispatch<React.SetStateAction<ClassroomTable[] | null>>;

  // Operations
  runSceneTransaction: SceneTransactionRunner;
  removeTables: (
    indices: number[],
    options?: { skipSeatingUpdate?: boolean },
  ) => void;
  snapshot: () => void;

  // Selection operations
  toggleSelect: (index: number, multi: boolean) => number[];
  clearSelection: () => void;

  // Context menu
  closeCanvasContextMenu: () => void;
}

/**
 * Custom hook for managing table operations like copy, cut, paste, delete, and selection
 * Extracted from SeatingPlanView for better separation of concerns
 */
export function useTableOperations({
  selectedTableIds,
  sceneTables,
  clipboard,
  snapToGrid,
  classroomWidth,
  classroomHeight,
  studentsCount,
  setSelectedTableIds,
  setClipboard,
  runSceneTransaction,
  removeTables,
  snapshot,
  toggleSelect,
  clearSelection,
  closeCanvasContextMenu,
}: UseTableOperationsParams): TableOperationsHook {
  const applySelectionForTable = React.useCallback(
    (tableIndex: number, multi: boolean) => {
      let newSelection = selectedTableIds;
      if (multi) {
        newSelection = toggleSelect(tableIndex, true);
      } else if (!selectedTableIds.includes(tableIndex)) {
        newSelection = toggleSelect(tableIndex, false);
      }
      return newSelection;
    },
    [selectedTableIds, toggleSelect],
  );

  const deleteSelectedTables = React.useCallback(() => {
    if (selectedTableIds.length === 0) return;
    snapshot();
    const sorted = [...selectedTableIds].sort((a, b) => b - a);
    const transactionOutcome = runSceneTransaction(
      ({ tables, seating, scene }) => {
        const filteredTables = tables
          .filter((_, index) => !sorted.includes(index))
          .map((table, idx) => ({ ...table, zIndex: idx }));
        const updatedSeating = seating
          .filter((_, index) => !sorted.includes(index))
          .map((row) => [...row]);
        return {
          tables: filteredTables,
          seating: updatedSeating,
          scene: { ...scene, tables: filteredTables },
        };
      },
    );
    const updatedTables = transactionOutcome.tables ?? [];
    removeTables(sorted, { skipSeatingUpdate: true });
    setSelectedTableIds([]);
    const totalSeats = countSeats(updatedTables);
    if (totalSeats < studentsCount) {
      showToast('error', TOAST_MESSAGES.SEATS_INSUFFICIENT);
    }
  }, [
    selectedTableIds,
    removeTables,
    setSelectedTableIds,
    snapshot,
    runSceneTransaction,
    studentsCount,
  ]);

  const copySelectedTables = React.useCallback(() => {
    if (selectedTableIds.length === 0) return;
    const copied = selectedTableIds.map((i) => deepClone(sceneTables[i]));
    setClipboard(copied);
  }, [sceneTables, selectedTableIds, setClipboard]);

  const cutSelectedTables = React.useCallback(() => {
    copySelectedTables();
    deleteSelectedTables();
  }, [copySelectedTables, deleteSelectedTables]);

  const pasteTablesAt = React.useCallback(
    ({ sceneX, sceneY }: { sceneX?: number; sceneY?: number } = {}) => {
      if (!clipboard || clipboard.length === 0) return;
      snapshot();

      // Determine target position for paste operation
      const hasScenePosition =
        typeof sceneX === 'number' && typeof sceneY === 'number';

      // For keyboard paste (Ctrl+V), use original selection center instead of canvas center
      let targetCenter;
      if (hasScenePosition) {
        targetCenter = { x: sceneX, y: sceneY }; // Long-press context menu at mouse position
      } else {
        // Calculate center of original copied selection
        const originalBounds = calculateTableGroupBounds(clipboard);
        targetCenter = {
          x: originalBounds.x + originalBounds.width / 2,
          y: originalBounds.y + originalBounds.height / 2,
        };
      }

      // Use precise positioning utility to maintain relative positions
      // Always add paste offset for better visual feedback (context menu is long-press, not right-click)
      const newTables = positionTablesRelative(
        clipboard,
        targetCenter,
        { width: classroomWidth, height: classroomHeight },
        snapToGrid,
        true, // Always add paste offset to make copied tables visible
      );

      let newIndices: number[] = [];
      runSceneTransaction(({ tables, seating, scene }) => {
        const startIndex = tables.length;
        const processedTables = newTables.map((table, index) => ({
          ...table,
          zIndex: startIndex + index,
        }));
        newIndices = Array.from(
          { length: processedTables.length },
          (_, index) => startIndex + index,
        );
        const combinedTables = [...tables, ...processedTables].map(
          (tbl, idx) => ({
            ...tbl,
            zIndex: idx,
          }),
        );
        const updatedSeating = addSeatingForTables(seating, processedTables);
        return {
          tables: combinedTables,
          seating: updatedSeating,
          scene: { ...scene, tables: combinedTables },
        };
      });
      setSelectedTableIds(newIndices);
    },
    [
      clipboard,
      snapshot,
      snapToGrid,
      classroomWidth,
      classroomHeight,
      setSelectedTableIds,
      runSceneTransaction,
    ],
  );

  const handleCanvasMenuPaste = React.useCallback(
    (state: CanvasContextMenuState) => {
      pasteTablesAt({
        sceneX: state.sceneX,
        sceneY: state.sceneY,
      });
      closeCanvasContextMenu();
      // Clear selection box after paste to avoid lingering selection rectangle
      clearSelection();
    },
    [closeCanvasContextMenu, pasteTablesAt, clearSelection],
  );

  return {
    deleteSelectedTables,
    copySelectedTables,
    cutSelectedTables,
    pasteTablesAt,
    handleCanvasMenuPaste,
    applySelectionForTable,
  };
}
