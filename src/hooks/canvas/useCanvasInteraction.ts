// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/* eslint-disable react-hooks/refs -- refs are used for pointer state coordination */
import React from 'react';
import { useMachine } from '@xstate/react';
import type { ClassroomTable, ClassroomFeature } from '@/types';
import type {
  CanvasContextMenuState,
  PointerKind,
  TableContextMenuState,
} from '@/hooks/useContextMenus';
import {
  canvasPointerMachine,
  type CanvasPointerMachineContext,
  type CanvasPointerMachineEvent,
  type CanvasPointerType,
  type CanvasPressPayload,
  type PointerMovePayload,
  type TablePressPayload,
} from '@/stateMachines';
import {
  getRotationAdjustedDimensions,
  getRotationAdjustedPosition,
  getRotatedAabbHalfExtents,
  logDebug,
} from '@/utils';
import type { SelectionBox } from '@/types/canvas';

type PendingLongPressPoint = { x: number; y: number };

type PendingTableLongPress = {
  pointerId: number;
  tableIndex: number;
  multi: boolean;
  startScenePoint: PendingLongPressPoint;
  startClientPoint: PendingLongPressPoint;
  lastClientPoint: PendingLongPressPoint;
  pointerType?: CanvasPointerType;
  meta?: {
    selectionApplied: boolean;
  };
};

type PendingCanvasLongPress = {
  pointerId: number;
  startScenePoint: PendingLongPressPoint;
  startClientPoint: PendingLongPressPoint;
  lastClientPoint: PendingLongPressPoint;
  pointerType?: CanvasPointerType;
};

type PointerActionApi = {
  applySelectionForTable: (tableIndex: number, multi: boolean) => number[];
  initializeDragFromSelection: (
    selection: number[],
    startPoint: { x: number; y: number },
  ) => void;
  updateDragSelection: (scenePoint: { x: number; y: number }) => void;
  finalizeDragInteraction: () => void;
  openTableContextMenu: (state: TableContextMenuState) => void;
  openCanvasContextMenu: (state: CanvasContextMenuState) => void;
  closeTableContextMenuBase: () => void;
  closeCanvasContextMenuBase: () => void;
  cancelSelectionInteractionBase: () => void;
  releaseTablePointerCapture: (pointerId: number) => void;
};

const normalizePointerType = (
  pointerType: string | undefined,
): CanvasPointerType => {
  switch (pointerType) {
    case 'touch':
      return 'touch';
    case 'pen':
      return 'pen';
    case 'mouse':
      return 'mouse';
    case 'keyboard':
      return 'keyboard';
    default:
      return pointerType ? 'unknown' : 'mouse';
  }
};

export interface CanvasInteractionHook {
  handleCanvasPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  handleCanvasPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  beginSelectionWithLongPress: (e: React.PointerEvent<SVGSVGElement>) => void;
  handleTablePointerDown: (
    e: React.PointerEvent<SVGGElement>,
    index: number,
  ) => void;
  selectionBox: SelectionBox | null;
}

export interface UseCanvasInteractionParams {
  sceneTables: ClassroomTable[];
  sceneFeatures: ClassroomFeature[];
  clipboard: ClassroomTable[] | null;
  hasFeatureClipboard?: boolean;
  toSceneCoordinates: (
    svg: SVGSVGElement,
    clientX: number,
    clientY: number,
  ) => { x: number; y: number };
  classroomWidth: number;
  classroomHeight: number;
  setSelectedTableIds: React.Dispatch<React.SetStateAction<number[]>>;
  setSelectedFeatureIds: React.Dispatch<React.SetStateAction<string[]>>;
  clearSelection: () => void;

  // Selection operations
  applySelectionForTable: (tableIndex: number, multi: boolean) => number[];

  // Context menu operations
  openTableContextMenu: (state: TableContextMenuState) => void;
  openCanvasContextMenu: (state: CanvasContextMenuState) => void;
  closeTableContextMenu: () => void;
  closeCanvasContextMenu: () => void;

  // Table interaction hooks integration
  startTablePointerDrag: (e: React.PointerEvent<SVGGElement>) => void;
  releaseTablePointerCapture: (pointerId: number) => void;
  cancelSelectionInteraction: () => void;

  // Drag operations
  initializeDragFromSelection: (
    selection: number[],
    startPoint: { x: number; y: number },
  ) => void;
  updateDragSelection: (scenePoint: { x: number; y: number }) => void;
  finalizeDragInteraction: () => void;
}

/**
 * Custom hook for managing canvas pointer interactions, long press detection, and drag operations
 * Extracted from SeatingPlanView for better separation of concerns
 */
export function useCanvasInteraction({
  sceneTables,
  sceneFeatures,
  clipboard,
  hasFeatureClipboard = false,
  toSceneCoordinates,
  classroomWidth,
  classroomHeight,
  setSelectedTableIds,
  setSelectedFeatureIds,
  clearSelection,
  applySelectionForTable,
  openTableContextMenu,
  openCanvasContextMenu,
  closeTableContextMenu: closeTableContextMenuBase,
  closeCanvasContextMenu: closeCanvasContextMenuBase,
  startTablePointerDrag,
  releaseTablePointerCapture,
  cancelSelectionInteraction: cancelSelectionInteractionBase,
  initializeDragFromSelection,
  updateDragSelection,
  finalizeDragInteraction,
}: UseCanvasInteractionParams): CanvasInteractionHook {
  const pendingTableLongPressRef = React.useRef<PendingTableLongPress | null>(
    null,
  );
  const pendingCanvasLongPressRef = React.useRef<PendingCanvasLongPress | null>(
    null,
  );
  const selectionPointerIdRef = React.useRef<number | null>(null);
  const selectionStartRef = React.useRef<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [selectionBox, setSelectionBox] = React.useState<SelectionBox | null>(
    null,
  );
  const clampScenePoint = React.useCallback(
    (point: { x: number; y: number }) => ({
      x: Math.min(Math.max(point.x, 0), classroomWidth),
      y: Math.min(Math.max(point.y, 0), classroomHeight),
    }),
    [classroomWidth, classroomHeight],
  );
  const updateSelectionFromPoint = React.useCallback(
    (currentPoint: { x: number; y: number }) => {
      const start = clampScenePoint(selectionStartRef.current);
      selectionStartRef.current = start;
      const clampedPoint = clampScenePoint(currentPoint);
      const box: SelectionBox = {
        x: Math.min(start.x, clampedPoint.x),
        y: Math.min(start.y, clampedPoint.y),
        width: Math.abs(clampedPoint.x - start.x),
        height: Math.abs(clampedPoint.y - start.y),
      };
      setSelectionBox(box);
      const boxRight = box.x + box.width;
      const boxBottom = box.y + box.height;
      const intersectsBox = (bounds: {
        x: number;
        y: number;
        right: number;
        bottom: number;
      }) =>
        bounds.x < boxRight &&
        bounds.right > box.x &&
        bounds.y < boxBottom &&
        bounds.bottom > box.y;

      const liveTableSelection = (sceneTables || [])
        .map((table, index) =>
          intersectsBox(getTableBounds(table)) ? index : null,
        )
        .filter(
          (value): value is number =>
            value !== null && !sceneTables[value].locked,
        );
      setSelectedTableIds(liveTableSelection);

      // Unified selection: the same box also picks up room features.
      const liveFeatureSelection = (sceneFeatures || [])
        .filter((feature) => intersectsBox(getFeatureBounds(feature)))
        .map((feature) => feature.id);
      setSelectedFeatureIds(liveFeatureSelection);
    },
    [
      clampScenePoint,
      sceneTables,
      sceneFeatures,
      setSelectedTableIds,
      setSelectedFeatureIds,
    ],
  );

  const resetSelectionState = React.useCallback(() => {
    selectionPointerIdRef.current = null;
    setSelectionBox(null);
  }, []);

  const beginSelection = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (event.target !== event.currentTarget) {
        return;
      }
      const svg = event.currentTarget as SVGSVGElement;
      const scenePoint = toSceneCoordinates(svg, event.clientX, event.clientY);
      const clampedPoint = clampScenePoint(scenePoint);
      selectionPointerIdRef.current = event.pointerId;
      selectionStartRef.current = clampedPoint;
      setSelectionBox({
        x: clampedPoint.x,
        y: clampedPoint.y,
        width: 0,
        height: 0,
      });
      clearSelection();
      if (typeof svg.setPointerCapture === 'function') {
        svg.setPointerCapture(event.pointerId);
      }
    },
    [clampScenePoint, clearSelection, toSceneCoordinates],
  );

  const updateSelectionDuringMove = React.useCallback(
    (
      event: React.PointerEvent<SVGSVGElement>,
      scenePoint: { x: number; y: number },
    ) => {
      if (selectionPointerIdRef.current !== event.pointerId) {
        return;
      }
      updateSelectionFromPoint(scenePoint);
    },
    [updateSelectionFromPoint],
  );

  const finalizeSelectionPointer = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (selectionPointerIdRef.current !== event.pointerId) {
        return;
      }
      const svg = event.currentTarget as SVGSVGElement;
      if (typeof svg.releasePointerCapture === 'function') {
        svg.releasePointerCapture(event.pointerId);
      }
      resetSelectionState();
    },
    [resetSelectionState],
  );

  const actionApiRef = React.useRef<PointerActionApi>({
    applySelectionForTable,
    initializeDragFromSelection,
    updateDragSelection,
    finalizeDragInteraction,
    openTableContextMenu,
    openCanvasContextMenu,
    closeTableContextMenuBase,
    closeCanvasContextMenuBase,
    cancelSelectionInteractionBase,
    releaseTablePointerCapture,
  });

  actionApiRef.current = {
    applySelectionForTable,
    initializeDragFromSelection,
    updateDragSelection,
    finalizeDragInteraction,
    openTableContextMenu,
    openCanvasContextMenu,
    closeTableContextMenuBase,
    closeCanvasContextMenuBase,
    cancelSelectionInteractionBase,
    releaseTablePointerCapture,
  };

  const pointerMachine = React.useMemo(
    () =>
      canvasPointerMachine.provide({
        actions: {
          handleContextMenuEntry: () => {
            const api = actionApiRef.current;
            if (pendingTableLongPressRef.current) {
              const pending = pendingTableLongPressRef.current;
              if (!pending.meta?.selectionApplied) {
                api.applySelectionForTable(pending.tableIndex, pending.multi);
                pending.meta = {
                  ...(pending.meta ?? {}),
                  selectionApplied: true,
                };
              }
              api.closeCanvasContextMenuBase();
              api.openTableContextMenu({
                tableIndex: pending.tableIndex,
                clientX: pending.lastClientPoint.x,
                clientY: pending.lastClientPoint.y,
                pointerType: pending.pointerType as PointerKind | undefined,
                trigger: 'longpress',
              });
              api.releaseTablePointerCapture(pending.pointerId);
              pendingTableLongPressRef.current = null;
              pendingCanvasLongPressRef.current = null;
              return;
            }
            if (pendingCanvasLongPressRef.current) {
              const pending = pendingCanvasLongPressRef.current;
              api.cancelSelectionInteractionBase();
              api.closeTableContextMenuBase();
              api.openCanvasContextMenu({
                clientX: pending.lastClientPoint.x,
                clientY: pending.lastClientPoint.y,
                sceneX: pending.startScenePoint.x,
                sceneY: pending.startScenePoint.y,
                pointerType: pending.pointerType as PointerKind | undefined,
                trigger: 'longpress',
              });
              pendingCanvasLongPressRef.current = null;
              pendingTableLongPressRef.current = null;
              return;
            }
            logDebug(
              'canvas.pointer.contextMenu.noPending',
              undefined,
              'pointerMachine',
            );
          },
          handleDragMove: ({ event }) => {
            if (event.type !== 'POINTER_MOVE') {
              return;
            }
            actionApiRef.current.updateDragSelection(event.payload.scenePoint);
          },
          handleDragExit: ({
            context,
            event,
          }: {
            context: CanvasPointerMachineContext;
            event: CanvasPointerMachineEvent;
          }) => {
            actionApiRef.current.finalizeDragInteraction();
            const pointerId =
              event.type === 'POINTER_UP' || event.type === 'POINTER_CANCEL'
                ? event.pointerId
                : (context.activePointer?.pointerId ?? null);
            if (typeof pointerId === 'number') {
              actionApiRef.current.releaseTablePointerCapture(pointerId);
            }
          },
          handleContextMenuExit: () => {
            const api = actionApiRef.current;
            api.closeTableContextMenuBase();
            api.closeCanvasContextMenuBase();
            pendingTableLongPressRef.current = null;
            pendingCanvasLongPressRef.current = null;
          },
          handleDragEntry: ({
            context,
          }: {
            context: CanvasPointerMachineContext;
          }) => {
            const api = actionApiRef.current;
            const press = context.tablePress;
            if (!press) {
              logDebug(
                'canvas.pointer.drag.noPress',
                undefined,
                'pointerMachine',
              );
              return;
            }
            const selection = api.applySelectionForTable(
              press.tableIndex,
              press.multiSelect,
            );
            api.initializeDragFromSelection(selection, press.scenePoint);
          },
          logPointerState: (
            {
              context,
              event,
            }: {
              context: CanvasPointerMachineContext;
              event: CanvasPointerMachineEvent;
            },
            stateLabel?: unknown,
          ) => {
            const label =
              typeof stateLabel === 'string' ? stateLabel : 'unknown';
            logDebug(
              'canvas.pointer.state',
              {
                state: label,
                event: event.type,
                pointerType: context.activePointer?.pointerType ?? null,
              },
              'pointerMachine',
            );
          },
        },
      }),
    [],
  );

  const [, send] = useMachine(pointerMachine);

  const closeTableContextMenu = React.useCallback(() => {
    closeTableContextMenuBase();
    send({ type: 'CONTEXT_MENU_CLOSED' });
  }, [closeTableContextMenuBase, send]);

  const closeCanvasContextMenu = React.useCallback(() => {
    closeCanvasContextMenuBase();
    send({ type: 'CONTEXT_MENU_CLOSED' });
  }, [closeCanvasContextMenuBase, send]);

  const cancelSelectionInteraction = React.useCallback(() => {
    send({ type: 'CANCEL' });
    cancelSelectionInteractionBase();
    pendingTableLongPressRef.current = null;
    pendingCanvasLongPressRef.current = null;
    resetSelectionState();
  }, [cancelSelectionInteractionBase, resetSelectionState, send]);

  React.useEffect(() => {
    send({
      type: 'SYNC_CLIPBOARD',
      snapshot: {
        tableClipboard: clipboard ?? null,
        featureClipboardSize: hasFeatureClipboard ? 1 : 0,
      },
    });
  }, [clipboard, hasFeatureClipboard, send]);

  const DRAG_DISTANCE_THRESHOLD = 6;

  const beginSelectionWithLongPress = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Right-click (button 2) is handled by onContextMenu - don't start selection or timers
      if (e.button === 2) {
        cancelSelectionInteraction();
        pendingCanvasLongPressRef.current = null;
        pendingTableLongPressRef.current = null;
        return;
      }

      const pointerKind = normalizePointerType(e.pointerType);
      const allowsLongPress = pointerKind === 'touch' || pointerKind === 'pen';
      const hasClipboardContent =
        (clipboard && clipboard.length > 0) || hasFeatureClipboard;
      const svg = e.currentTarget as SVGSVGElement;
      const rawScenePoint = toSceneCoordinates(svg, e.clientX, e.clientY);
      const scenePoint = clampScenePoint(rawScenePoint);
      const canvasPressPayload: CanvasPressPayload = {
        meta: {
          pointerId: e.pointerId,
          pointerType: pointerKind,
          pressedAt: { x: e.clientX, y: e.clientY },
        },
        clientPoint: { x: e.clientX, y: e.clientY },
        scenePoint,
        multiSelect: e.shiftKey || e.metaKey || e.ctrlKey,
      };
      send({ type: 'POINTER_DOWN_CANVAS', payload: canvasPressPayload });

      if (e.target === e.currentTarget) {
        beginSelection(e);
      }

      pendingCanvasLongPressRef.current =
        e.target === e.currentTarget && hasClipboardContent && allowsLongPress
          ? {
              pointerId: e.pointerId,
              startScenePoint: scenePoint,
              startClientPoint: { x: e.clientX, y: e.clientY },
              lastClientPoint: { x: e.clientX, y: e.clientY },
              pointerType: pointerKind,
            }
          : null;
    },
    [
      clipboard,
      cancelSelectionInteraction,
      hasFeatureClipboard,
      beginSelection,
      clampScenePoint,
      send,
      toSceneCoordinates,
    ],
  );

  const updatePendingPointerMove = React.useCallback(
    (
      event: React.PointerEvent<SVGSVGElement>,
      scenePoint: { x: number; y: number },
    ) => {
      const pointerId = event.pointerId;
      if (
        pendingTableLongPressRef.current &&
        pendingTableLongPressRef.current.pointerId === pointerId
      ) {
        pendingTableLongPressRef.current.lastClientPoint = {
          x: event.clientX,
          y: event.clientY,
        };
        const startPoint = pendingTableLongPressRef.current.startScenePoint;
        const distance = Math.hypot(
          scenePoint.x - startPoint.x,
          scenePoint.y - startPoint.y,
        );
        if (distance >= DRAG_DISTANCE_THRESHOLD) {
          pendingTableLongPressRef.current = null;
          send({ type: 'DRAG_THRESHOLD_REACHED', target: 'table' });
        }
      }
      if (
        pendingCanvasLongPressRef.current &&
        pendingCanvasLongPressRef.current.pointerId === pointerId
      ) {
        pendingCanvasLongPressRef.current.lastClientPoint = {
          x: event.clientX,
          y: event.clientY,
        };
      }
    },
    [send],
  );

  const clearPendingPressForPointer = React.useCallback(
    (pointerId: number) => {
      if (
        pendingTableLongPressRef.current &&
        pendingTableLongPressRef.current.pointerId === pointerId
      ) {
        const pending = pendingTableLongPressRef.current;
        if (!pending.meta?.selectionApplied) {
          applySelectionForTable(pending.tableIndex, pending.multi);
        }
        pendingTableLongPressRef.current = null;
      }
      if (
        pendingCanvasLongPressRef.current &&
        pendingCanvasLongPressRef.current.pointerId === pointerId
      ) {
        pendingCanvasLongPressRef.current = null;
      }
    },
    [applySelectionForTable],
  );

  const handleCanvasPointerMove = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = e.currentTarget as SVGSVGElement;
      const scenePoint = toSceneCoordinates(svg, e.clientX, e.clientY);
      const pointerKind = normalizePointerType(e.pointerType);
      const movePayload: PointerMovePayload = {
        pointerId: e.pointerId,
        pointerType: pointerKind,
        clientPoint: { x: e.clientX, y: e.clientY },
        scenePoint,
      };
      send({ type: 'POINTER_MOVE', payload: movePayload });
      updatePendingPointerMove(e, scenePoint);
      updateSelectionDuringMove(e, scenePoint);
    },
    [
      send,
      toSceneCoordinates,
      updatePendingPointerMove,
      updateSelectionDuringMove,
    ],
  );

  const handleCanvasPointerUp = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const nativeType = e.nativeEvent?.type;
      if (nativeType === 'pointercancel') {
        send({ type: 'POINTER_CANCEL', pointerId: e.pointerId });
      } else {
        send({ type: 'POINTER_UP', pointerId: e.pointerId });
      }
      finalizeSelectionPointer(e);
      clearPendingPressForPointer(e.pointerId);
    },
    [clearPendingPressForPointer, finalizeSelectionPointer, send],
  );

  const handleTablePointerDown = React.useCallback(
    (e: React.PointerEvent<SVGGElement>, index: number) => {
      if (sceneTables[index].locked) return;

      // Right-click (button 2) is handled by onContextMenu - don't start long-press timer
      if (e.button === 2) {
        return;
      }

      closeTableContextMenu();
      closeCanvasContextMenu();
      e.stopPropagation();
      e.preventDefault();
      startTablePointerDrag(e);
      const svg = e.currentTarget.ownerSVGElement;
      if (!svg) return;
      const multi = e.shiftKey || e.metaKey || e.ctrlKey;
      const startPoint = toSceneCoordinates(svg, e.clientX, e.clientY);
      const pointerKind = normalizePointerType(e.pointerType);
      pendingTableLongPressRef.current = {
        pointerId: e.pointerId,
        tableIndex: index,
        multi,
        startScenePoint: startPoint,
        startClientPoint: { x: e.clientX, y: e.clientY },
        lastClientPoint: { x: e.clientX, y: e.clientY },
        pointerType: pointerKind,
        meta: {
          selectionApplied: pointerKind !== 'touch' && pointerKind !== 'pen',
        },
      };
      const tablePressPayload: TablePressPayload = {
        meta: {
          pointerId: e.pointerId,
          pointerType: pointerKind,
          pressedAt: { x: e.clientX, y: e.clientY },
        },
        clientPoint: { x: e.clientX, y: e.clientY },
        scenePoint: startPoint,
        multiSelect: multi,
        tableIndex: index,
        isLocked: false,
      };
      send({ type: 'POINTER_DOWN_TABLE', payload: tablePressPayload });
      if (pointerKind !== 'touch' && pointerKind !== 'pen') {
        applySelectionForTable(index, multi);
      }
    },
    [
      sceneTables,
      closeTableContextMenu,
      closeCanvasContextMenu,
      startTablePointerDrag,
      toSceneCoordinates,
      applySelectionForTable,
      send,
    ],
  );

  return {
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    beginSelectionWithLongPress,
    handleTablePointerDown,
    selectionBox,
  };
}
const getTableBounds = (table: ClassroomTable) => {
  const adjustedPosition = getRotationAdjustedPosition(table);
  const adjustedSize = getRotationAdjustedDimensions(table);
  return {
    x: adjustedPosition.x,
    y: adjustedPosition.y,
    right: adjustedPosition.x + adjustedSize.width,
    bottom: adjustedPosition.y + adjustedSize.height,
  };
};

// Rotation-aware axis-aligned bounding box for a room feature, computed around
// its center so rotated features are hit-tested by their real footprint.
const getFeatureBounds = (feature: ClassroomFeature) => {
  const centerX = feature.x + feature.width / 2;
  const centerY = feature.y + feature.height / 2;
  const { halfWidth, halfHeight } = getRotatedAabbHalfExtents(
    feature.width,
    feature.height,
    feature.rotation ?? 0,
  );
  return {
    x: centerX - halfWidth,
    y: centerY - halfHeight,
    right: centerX + halfWidth,
    bottom: centerY + halfHeight,
  };
};
