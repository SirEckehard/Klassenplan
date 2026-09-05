// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type {
  ClassroomTable,
  ClassroomScene,
  ClassroomFeature,
  ClassroomFeatureType,
} from '@/types';
import type {
  TableContextMenuState,
  CanvasContextMenuState,
} from '@/hooks/useContextMenus';
import { useCanvasInteraction } from '@/hooks/canvas/useCanvasInteraction';
import { useTableOperations } from '@/hooks/canvas/useTableOperations';
import { useFeatureOperations } from '@/hooks/canvas/useFeatureOperations';
import { useKeyboardInteraction } from '@/hooks/ui/useKeyboardInteraction';
import type { SceneTransactionRunner } from '@/hooks/scene/useSceneManager';
import type { FeatureTemplate } from '@/hooks/canvas/featureTemplates';
import type { SelectionBox } from '@/types/canvas';

export interface CanvasInteractionLayerProps {
  // Canvas Properties
  classroomHeight: number;
  classroomWidth: number;
  canvasWidth: number;

  // TableIcon State
  sceneTables: ClassroomTable[];
  selectedTableIds: number[];
  classroomScene: ClassroomScene;

  // Feature State (unified selection covers tables and features together)
  sceneFeatures: ClassroomFeature[];
  selectedFeatureIds: string[];
  featureTemplateMap: Map<ClassroomFeatureType, FeatureTemplate>;

  // Interaction State
  snapToGrid: boolean;
  studentsCount: number;

  // State setters
  setSelectedTableIds: React.Dispatch<React.SetStateAction<number[]>>;
  setSelectedFeatureIds: React.Dispatch<React.SetStateAction<string[]>>;
  setFeatureVisible: (type: ClassroomFeatureType, visible: boolean) => void;

  // Callbacks
  updateClassroomScene: (next: React.SetStateAction<ClassroomScene>) => void;
  removeTables: (
    indices: number[],
    options?: { skipSeatingUpdate?: boolean },
  ) => void;
  runSceneTransaction: SceneTransactionRunner;
  snapshot: () => void;

  // Context Menu Integration
  openTableContextMenu: (state: TableContextMenuState) => void;
  openCanvasContextMenu: (state: CanvasContextMenuState) => void;
  closeTableContextMenu: () => void;
  closeCanvasContextMenu: () => void;
  clearSelection: () => void;

  startTablePointerDrag: (e: React.PointerEvent<SVGGElement>) => void;
  releaseTablePointerCapture: (pointerId: number) => void;
  cancelSelectionInteraction: () => void;
  initializeDragFromSelection: (
    selection: number[],
    startPoint: { x: number; y: number },
  ) => void;
  updateDragSelection: (scenePoint: { x: number; y: number }) => void;
  finalizeDragInteraction: () => void;

  // External Hook Integration (from useTableSelection)
  toggleSelect: (index: number, multi: boolean) => number[];

  // Coordinate transformation
  toSceneCoordinates: (
    svg: SVGSVGElement,
    clientX: number,
    clientY: number,
  ) => { x: number; y: number };

  // Children (for render prop pattern)
  children: (handlers: {
    handleCanvasPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
    handleCanvasPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
    beginSelectionWithLongPress: (e: React.PointerEvent<SVGSVGElement>) => void;
    handleTablePointerDown: (
      e: React.PointerEvent<SVGGElement>,
      index: number,
    ) => void;
    // Unified selection operations acting on both tables and features.
    deleteSelection: () => void;
    copySelection: () => void;
    cutSelection: () => void;
    pasteSelectionAt: (coords?: { sceneX?: number; sceneY?: number }) => void;
    handleCanvasMenuPaste: (state: CanvasContextMenuState) => void;
    canPaste: boolean;
    selectionBox: SelectionBox | null;
  }) => React.ReactNode;
}

export type CanvasInteractionHandlers = Parameters<
  CanvasInteractionLayerProps['children']
>[0];

/**
 * Canvas Interaction Layer component that encapsulates all canvas-related user interactions
 * Provides a clean interface for pointer events, table operations, and context menu handling
 */
export default function CanvasInteractionLayer({
  classroomHeight,
  classroomWidth,
  canvasWidth,
  sceneTables,
  selectedTableIds,
  classroomScene,
  sceneFeatures,
  selectedFeatureIds,
  featureTemplateMap,
  snapToGrid,
  studentsCount,
  setSelectedTableIds,
  setSelectedFeatureIds,
  setFeatureVisible,
  updateClassroomScene,
  removeTables,
  runSceneTransaction,
  snapshot,
  openTableContextMenu,
  openCanvasContextMenu,
  closeTableContextMenu,
  closeCanvasContextMenu,
  clearSelection,
  startTablePointerDrag,
  releaseTablePointerCapture,
  cancelSelectionInteraction,
  initializeDragFromSelection,
  updateDragSelection,
  finalizeDragInteraction,
  toggleSelect,
  toSceneCoordinates,
  children,
}: CanvasInteractionLayerProps) {
  // Internal clipboard state management
  const [clipboard, setClipboard] = React.useState<ClassroomTable[] | null>(
    null,
  );
  const [featureClipboard, setFeatureClipboard] = React.useState<
    ClassroomFeature[] | null
  >(null);

  // TableIcon operations hook
  const tableOperations = useTableOperations({
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
    clearSelection: cancelSelectionInteraction,
    closeCanvasContextMenu,
  });

  // Feature operations hook (copy/cut/paste/delete for room features)
  const featureOperations = useFeatureOperations({
    sceneFeatures,
    selectedFeatureIds,
    featureClipboard,
    snapToGrid,
    canvasWidth,
    classroomHeight,
    featureTemplateMap,
    setSelectedFeatureIds,
    setFeatureClipboard,
    runSceneTransaction,
    snapshot,
    setFeatureVisible,
  });

  // Unified clipboard operations acting on both tables and features. Copying
  // captures whatever is selected and clears the opposite clipboard slot, so a
  // subsequent paste reproduces exactly the last copied selection.
  const hasTableSelection = selectedTableIds.length > 0;
  const hasFeatureSelection = selectedFeatureIds.length > 0;

  const copySelection = React.useCallback(() => {
    const hasTables = selectedTableIds.length > 0;
    const hasFeatures = selectedFeatureIds.length > 0;
    if (!hasTables && !hasFeatures) return;
    if (hasTables) {
      tableOperations.copySelectedTables();
    } else {
      setClipboard(null);
    }
    if (hasFeatures) {
      featureOperations.copySelectedFeatures();
    } else {
      setFeatureClipboard(null);
    }
  }, [
    selectedTableIds,
    selectedFeatureIds,
    tableOperations,
    featureOperations,
  ]);

  const deleteSelection = React.useCallback(() => {
    tableOperations.deleteSelectedTables();
    featureOperations.deleteSelectedFeatures();
  }, [tableOperations, featureOperations]);

  const cutSelection = React.useCallback(() => {
    const hasTables = selectedTableIds.length > 0;
    const hasFeatures = selectedFeatureIds.length > 0;
    if (!hasTables && !hasFeatures) return;
    // Per-domain cut: the feature side keeps singleton elements (board /
    // lectern) in place since they can't be pasted back.
    if (hasTables) {
      tableOperations.cutSelectedTables();
    } else {
      setClipboard(null);
    }
    if (hasFeatures) {
      featureOperations.cutSelectedFeatures();
    } else {
      setFeatureClipboard(null);
    }
  }, [
    selectedTableIds,
    selectedFeatureIds,
    tableOperations,
    featureOperations,
  ]);

  const pasteSelectionAt = React.useCallback(
    (coords?: { sceneX?: number; sceneY?: number }) => {
      tableOperations.pasteTablesAt(coords);
      featureOperations.pasteFeaturesAt(coords);
    },
    [tableOperations, featureOperations],
  );

  const handleCanvasMenuPaste = React.useCallback(
    (state: CanvasContextMenuState) => {
      pasteSelectionAt({ sceneX: state.sceneX, sceneY: state.sceneY });
      closeCanvasContextMenu();
      cancelSelectionInteraction();
    },
    [pasteSelectionAt, closeCanvasContextMenu, cancelSelectionInteraction],
  );

  const canPaste =
    (!!clipboard && clipboard.length > 0) ||
    (!!featureClipboard && featureClipboard.length > 0);

  // Canvas interaction hook
  const canvasInteraction = useCanvasInteraction({
    sceneTables,
    sceneFeatures,
    setSelectedFeatureIds,
    clipboard,
    hasFeatureClipboard: !!featureClipboard && featureClipboard.length > 0,
    toSceneCoordinates,
    classroomWidth,
    classroomHeight,
    setSelectedTableIds,
    clearSelection,
    applySelectionForTable: tableOperations.applySelectionForTable,
    openTableContextMenu,
    openCanvasContextMenu,
    closeTableContextMenu,
    closeCanvasContextMenu,
    startTablePointerDrag,
    releaseTablePointerCapture,
    cancelSelectionInteraction,
    initializeDragFromSelection,
    updateDragSelection,
    finalizeDragInteraction,
  });

  // Keyboard interaction hook
  useKeyboardInteraction({
    selectedTableIds,
    sceneTables,
    classroomScene,
    updateClassroomScene,
    snapToGrid,
    classroomWidth,
    classroomHeight,
    snapshot,
    hasSelection: hasTableSelection || hasFeatureSelection,
    deleteSelection,
    copySelection,
    cutSelection,
    pasteSelectionAt,
    closeCanvasContextMenu,
    canPaste,
  });

  // Cleanup clipboard effect
  React.useEffect(() => {
    if (!canPaste) {
      closeCanvasContextMenu();
    }
  }, [canPaste, closeCanvasContextMenu]);

  // Memoised because it is a prop of the memoised `LayoutEditorView`: rebuilding
  // it every render made that memo compare unequal every time, so the whole
  // layout editor re-rendered on any parent update.
  const handlers = React.useMemo<CanvasInteractionHandlers>(
    () => ({
      handleCanvasPointerMove: canvasInteraction.handleCanvasPointerMove,
      handleCanvasPointerUp: canvasInteraction.handleCanvasPointerUp,
      beginSelectionWithLongPress:
        canvasInteraction.beginSelectionWithLongPress,
      handleTablePointerDown: canvasInteraction.handleTablePointerDown,
      deleteSelection,
      copySelection,
      cutSelection,
      pasteSelectionAt,
      handleCanvasMenuPaste,
      canPaste,
      selectionBox: canvasInteraction.selectionBox,
    }),
    [
      canvasInteraction.handleCanvasPointerMove,
      canvasInteraction.handleCanvasPointerUp,
      canvasInteraction.beginSelectionWithLongPress,
      canvasInteraction.handleTablePointerDown,
      canvasInteraction.selectionBox,
      deleteSelection,
      copySelection,
      cutSelection,
      pasteSelectionAt,
      handleCanvasMenuPaste,
      canPaste,
    ],
  );

  return <>{children(handlers)}</>;
}
