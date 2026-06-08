import React from 'react';
import type { ClassroomTable, ClassroomScene, ClassroomFeature } from '@/types';
import type {
  TableContextMenuState,
  CanvasContextMenuState,
} from '@/hooks/useContextMenus';
import { useCanvasInteraction } from '@/hooks/canvas/useCanvasInteraction';
import { useTableOperations } from '@/hooks/canvas/useTableOperations';
import { useKeyboardInteraction } from '@/hooks/ui/useKeyboardInteraction';
import type { SceneTransactionRunner } from '@/hooks/scene/useSceneManager';
import type { SelectionBox } from '@/types/canvas';

export interface CanvasInteractionLayerProps {
  // Canvas Properties
  classroomHeight: number;
  classroomWidth: number;

  // TableIcon State
  sceneTables: ClassroomTable[];
  selectedTableIds: number[];
  classroomScene: ClassroomScene;

  // Interaction State
  snapToGrid: boolean;
  studentsCount: number;

  // State setters
  setSelectedTableIds: React.Dispatch<React.SetStateAction<number[]>>;

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
    deleteSelectedTables: () => void;
    copySelectedTables: () => void;
    cutSelectedTables: () => void;
    pasteTablesAt: (coords?: { sceneX?: number; sceneY?: number }) => void;
    handleCanvasMenuPaste: (state: CanvasContextMenuState) => void;
    clipboard: ClassroomTable[] | null;
    featureClipboard: ClassroomFeature[] | null;
    setFeatureClipboard: React.Dispatch<
      React.SetStateAction<ClassroomFeature[] | null>
    >;
    canPasteTables: boolean;
    canPasteFeatures: boolean;
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
  sceneTables,
  selectedTableIds,
  classroomScene,
  snapToGrid,
  studentsCount,
  setSelectedTableIds,
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

  // Canvas interaction hook
  const canvasInteraction = useCanvasInteraction({
    sceneTables,
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
    deleteSelectedTables: tableOperations.deleteSelectedTables,
    copySelectedTables: tableOperations.copySelectedTables,
    cutSelectedTables: tableOperations.cutSelectedTables,
    pasteTablesAt: tableOperations.pasteTablesAt,
    closeCanvasContextMenu,
    clipboard,
  });

  // Cleanup clipboard effect
  React.useEffect(() => {
    const hasTables = !!clipboard && clipboard.length > 0;
    const hasFeatures = !!featureClipboard && featureClipboard.length > 0;
    if (!hasTables && !hasFeatures) {
      closeCanvasContextMenu();
    }
  }, [clipboard, featureClipboard, closeCanvasContextMenu]);

  return (
    <>
      {children({
        handleCanvasPointerMove: canvasInteraction.handleCanvasPointerMove,
        handleCanvasPointerUp: canvasInteraction.handleCanvasPointerUp,
        beginSelectionWithLongPress:
          canvasInteraction.beginSelectionWithLongPress,
        handleTablePointerDown: canvasInteraction.handleTablePointerDown,
        deleteSelectedTables: tableOperations.deleteSelectedTables,
        copySelectedTables: tableOperations.copySelectedTables,
        cutSelectedTables: tableOperations.cutSelectedTables,
        pasteTablesAt: tableOperations.pasteTablesAt,
        handleCanvasMenuPaste: tableOperations.handleCanvasMenuPaste,
        clipboard,
        featureClipboard,
        setFeatureClipboard,
        canPasteTables: !!clipboard && clipboard.length > 0,
        canPasteFeatures: !!featureClipboard && featureClipboard.length > 0,
        selectionBox: canvasInteraction.selectionBox,
      })}
    </>
  );
}
