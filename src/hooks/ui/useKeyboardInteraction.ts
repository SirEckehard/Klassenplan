// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/* eslint-disable react-hooks/refs -- refs are used to keep machine actions stable */
import React from 'react';
import { useMachine } from '@xstate/react';
import { keyboardInteractionMachine } from '@/stateMachines';
import {
  DEFAULT_ROTATION_SNAP_STEP,
  GRID_SNAP_SIZE,
  applyFeatureRotations,
  applyTableRotations,
  clampTablePositionWithinBounds,
  collectRotationTargets,
  hasRotationTargets,
  isFormElementFocused,
  isSilencedCharacterKey,
  logDebug,
  moveFeaturesBy,
  rotateTargets,
} from '@/utils';
import type { ClassroomTable, ClassroomScene, ClassroomFeature } from '@/types';
import type { KeyboardDirection } from '@/stateMachines/canvas/keyboardInteractionMachine';

export interface UseKeyboardInteractionParams {
  selectedTableIds: number[];
  sceneTables: ClassroomTable[];
  /** Room elements turn with the tables on Q/E. */
  selectedFeatureIds: string[];
  sceneFeatures: ClassroomFeature[];
  /** The area room elements are kept inside (the canvas, board strip included). */
  canvasWidth: number;
  classroomScene: ClassroomScene;
  updateClassroomScene: (next: React.SetStateAction<ClassroomScene>) => void;
  snapToGrid: boolean;
  classroomWidth: number;
  classroomHeight: number;
  snapshot: () => void;
  // Unified selection operations (tables + features)
  hasSelection: boolean;
  deleteSelection: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteSelectionAt: (coords?: { sceneX?: number; sceneY?: number }) => void;
  closeCanvasContextMenu: () => void;
  canPaste: boolean;
}

// Hook manages keyboard interactions internally through event listeners
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface KeyboardInteractionHook {}

interface KeyboardActionApi {
  moveSelection: (payload: {
    direction: KeyboardDirection;
    shiftKey: boolean;
    repeat: boolean;
  }) => void;
  rotateSelection: (payload: {
    direction: 'cw' | 'ccw';
    shiftKey: boolean;
  }) => void;
  deleteSelection: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteSelection: () => void;
  closeCanvasMenu: () => void;
}

/**
 * Custom hook for managing keyboard interactions in the canvas
 * Handles arrow key navigation and keyboard shortcuts (Ctrl+C/X/V, Delete)
 */
export function useKeyboardInteraction({
  selectedTableIds,
  sceneTables,
  selectedFeatureIds,
  sceneFeatures,
  canvasWidth,
  classroomScene,
  updateClassroomScene,
  snapToGrid,
  classroomWidth,
  classroomHeight,
  snapshot,
  hasSelection,
  deleteSelection,
  copySelection,
  cutSelection,
  pasteSelectionAt,
  closeCanvasContextMenu,
  canPaste,
}: UseKeyboardInteractionParams): KeyboardInteractionHook {
  const actionApiRef = React.useRef<KeyboardActionApi>({
    moveSelection: () => {},
    rotateSelection: () => {},
    deleteSelection: () => {},
    copySelection: () => {},
    cutSelection: () => {},
    pasteSelection: () => {},
    closeCanvasMenu: closeCanvasContextMenu,
  });

  /**
   * The arrow keys move what a drag would move: the unlocked tables of the
   * selection and its room elements — a free one anywhere, one on a wall
   * along that wall. A key held down is one undo step: only its first press
   * takes a snapshot, its repeats add to the same move.
   */
  const moveSelection = React.useCallback(
    ({
      direction,
      shiftKey,
      repeat,
    }: {
      direction: KeyboardDirection;
      shiftKey: boolean;
      repeat: boolean;
    }) => {
      const movesTables = selectedTableIds.some(
        (index) => sceneTables[index] && !sceneTables[index].locked,
      );
      const movesFeatures = selectedFeatureIds.length > 0;
      if (!movesTables && !movesFeatures) {
        return;
      }
      const baseStep = shiftKey ? 10 : 1;
      const stepSize = snapToGrid ? GRID_SNAP_SIZE : 1;
      const delta = baseStep * stepSize;
      let dx = 0;
      let dy = 0;
      switch (direction) {
        case 'up':
          dy = -delta;
          break;
        case 'down':
          dy = delta;
          break;
        case 'left':
          dx = -delta;
          break;
        case 'right':
          dx = delta;
          break;
        default:
          return;
      }
      if (!repeat) {
        snapshot();
      }
      const updatedTables = sceneTables.map((table, index) => {
        if (!selectedTableIds.includes(index) || table.locked) {
          return table;
        }
        const snap = (value: number) =>
          snapToGrid
            ? Math.round(value / GRID_SNAP_SIZE) * GRID_SNAP_SIZE
            : value;
        const newX = snap(table.x + dx);
        const newY = snap(table.y + dy);
        const clamped = clampTablePositionWithinBounds(
          table,
          { x: newX, y: newY },
          { width: classroomWidth, height: classroomHeight },
        );
        return {
          ...table,
          x: clamped.x,
          y: clamped.y,
        };
      });
      const updatedFeatures = movesFeatures
        ? moveFeaturesBy(
            sceneFeatures,
            selectedFeatureIds,
            { x: dx, y: dy },
            { width: canvasWidth, height: classroomHeight },
          )
        : sceneFeatures;
      updateClassroomScene({
        ...classroomScene,
        tables: updatedTables,
        features: updatedFeatures,
      });
    },
    [
      canvasWidth,
      classroomHeight,
      classroomScene,
      classroomWidth,
      sceneFeatures,
      sceneTables,
      selectedFeatureIds,
      selectedTableIds,
      snapToGrid,
      snapshot,
      updateClassroomScene,
    ],
  );

  const rotateSelection = React.useCallback(
    ({
      direction,
      shiftKey,
    }: {
      direction: 'cw' | 'ccw';
      shiftKey: boolean;
    }) => {
      // The same targets as the handles and the inspector: unlocked tables
      // and freely placed room elements (cabinet, divider, lectern).
      const targets = collectRotationTargets(
        sceneTables,
        sceneFeatures,
        selectedTableIds,
        selectedFeatureIds,
      );
      if (!hasRotationTargets(targets)) {
        return;
      }
      snapshot();
      const step = shiftKey ? 90 : DEFAULT_ROTATION_SNAP_STEP;
      const delta = direction === 'cw' ? step : -step;
      const rotations = rotateTargets(targets, (rotation) => rotation + delta);
      updateClassroomScene({
        ...classroomScene,
        tables: applyTableRotations(sceneTables, rotations.tables),
        features: applyFeatureRotations(sceneFeatures, rotations.features, {
          width: canvasWidth,
          height: classroomHeight,
        }),
      });
    },
    [
      canvasWidth,
      classroomHeight,
      classroomScene,
      sceneFeatures,
      sceneTables,
      selectedFeatureIds,
      selectedTableIds,
      snapshot,
      updateClassroomScene,
    ],
  );

  React.useEffect(() => {
    actionApiRef.current = {
      moveSelection,
      rotateSelection,
      deleteSelection,
      copySelection,
      cutSelection,
      pasteSelection: () => pasteSelectionAt(),
      closeCanvasMenu: closeCanvasContextMenu,
    };
  }, [
    closeCanvasContextMenu,
    copySelection,
    cutSelection,
    deleteSelection,
    moveSelection,
    pasteSelectionAt,
    rotateSelection,
  ]);

  const machine = React.useMemo(
    () =>
      keyboardInteractionMachine.provide({
        actions: {
          moveSelection: ({ event }) => {
            if (event.type === 'KEY_ARROW') {
              actionApiRef.current.moveSelection({
                direction: event.payload.direction,
                shiftKey: event.payload.shiftKey,
                repeat: event.payload.repeat,
              });
            }
          },
          rotateSelection: ({ event }) => {
            if (event.type === 'KEY_ROTATE') {
              actionApiRef.current.rotateSelection({
                direction: event.payload.direction,
                shiftKey: event.payload.shiftKey,
              });
            }
          },
          deleteSelection: () => actionApiRef.current.deleteSelection(),
          copySelection: () => actionApiRef.current.copySelection(),
          cutSelection: () => actionApiRef.current.cutSelection(),
          pasteSelection: () => actionApiRef.current.pasteSelection(),
          closeCanvasMenu: () => actionApiRef.current.closeCanvasMenu(),
          logKeyboardState: ({ event }) => {
            logDebug(
              'canvas.keyboard.state',
              { event: event.type },
              'keyboardMachine',
            );
          },
        },
      }),
    [],
  );

  const [, send] = useMachine(machine);

  const selectionCount = hasSelection ? 1 : 0;
  const hasClipboardContent = canPaste;
  // Read by the key handler, which is registered once.
  const hasSelectionRef = React.useRef(hasSelection);
  React.useEffect(() => {
    hasSelectionRef.current = hasSelection;
  }, [hasSelection]);

  const syncStatus = React.useCallback(
    (focusInInput: boolean) => {
      send({
        type: 'SYNC_STATUS',
        snapshot: {
          selectionCount,
          hasClipboardContent,
          focusInInput,
        },
      });
    },
    [hasClipboardContent, selectionCount, send],
  );

  React.useEffect(() => {
    syncStatus(isFormElementFocused());
  }, [syncStatus]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const focusInInput = isFormElementFocused();
      const hasSystemModifier = event.ctrlKey || event.metaKey || event.altKey;
      syncStatus(focusInInput);
      const direction = mapKeyToDirection(event.key);

      if (direction) {
        // Without a selection the arrows are the page's: below `lg` they
        // scroll it.
        if (focusInInput || hasSystemModifier || !hasSelectionRef.current) {
          return;
        }
        event.preventDefault();
        send({
          type: 'KEY_ARROW',
          payload: {
            direction,
            shiftKey: event.shiftKey,
            repeat: event.repeat ?? false,
          },
        });
        return;
      }

      if (isDeleteKey(event)) {
        if (focusInInput) {
          return;
        }
        event.preventDefault();
        send({ type: 'KEY_DELETE' });
        return;
      }

      const normalizedKey = event.key.toLowerCase();

      if (normalizedKey === 'e' || normalizedKey === 'q') {
        // The inspector turns a table as well, so switching the keys off
        // (WCAG 2.1.4) takes nothing away.
        if (
          focusInInput ||
          hasSystemModifier ||
          isSilencedCharacterKey(event)
        ) {
          return;
        }
        event.preventDefault();
        send({
          type: 'KEY_ROTATE',
          payload: {
            direction: normalizedKey === 'e' ? 'cw' : 'ccw',
            shiftKey: event.shiftKey,
          },
        });
        return;
      }

      const usesClipboardCombo =
        (event.ctrlKey || event.metaKey) &&
        ['c', 'x', 'v'].includes(normalizedKey);
      if (!usesClipboardCombo) {
        return;
      }
      if (focusInInput) {
        return;
      }
      event.preventDefault();
      if (normalizedKey === 'c') {
        send({ type: 'KEY_COPY' });
      } else if (normalizedKey === 'x') {
        send({ type: 'KEY_CUT' });
      } else if (normalizedKey === 'v') {
        send({ type: 'KEY_PASTE' });
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const direction = mapKeyToDirection(event.key);
      if (!direction) {
        return;
      }
      send({
        type: 'KEY_RELEASE',
        payload: { direction },
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [send, syncStatus]);

  return {};
}

const mapKeyToDirection = (key: string): KeyboardDirection | null => {
  switch (key) {
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    default:
      return null;
  }
};

const isDeleteKey = (event: KeyboardEvent) =>
  event.key === 'Delete' || event.key === 'Backspace';
