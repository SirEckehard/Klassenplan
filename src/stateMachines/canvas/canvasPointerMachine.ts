// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { setup } from 'xstate';
import type { StateFrom, StateValueFrom } from 'xstate';
import type {
  CanvasPointerMachineContext,
  CanvasPointerMachineEvent,
} from './canvasInteractionTypes';

export const createCanvasPointerContext = (): CanvasPointerMachineContext => ({
  activePointer: null,
  canvasPress: null,
  tablePress: null,
  dragSnapshot: null,
  clipboard: {
    tableClipboard: null,
    featureClipboardSize: 0,
  },
  longPressDurations: {
    table: 500,
    canvas: 500,
  },
  longPressMode: 'machine',
});

const pointerSetup = setup({
  types: {
    context: {} as CanvasPointerMachineContext,
    events: {} as CanvasPointerMachineEvent,
  },
  actions: {
    handleContextMenuEntry: () => undefined,
    handleContextMenuExit: () => undefined,
    handleDragEntry: () => undefined,
    handleDragMove: () => undefined,
    handleDragExit: () => undefined,
    logPointerState: () => undefined,
  },
  guards: {
    isMachineLongPressEnabled: ({ context }) =>
      context.longPressMode === 'machine' &&
      (context.activePointer?.pointerType === 'touch' ||
        context.activePointer?.pointerType === 'pen'),
  },
  delays: {
    TABLE_LONG_PRESS_DELAY: ({ context }) => context.longPressDurations.table,
    CANVAS_LONG_PRESS_DELAY: ({ context }) => context.longPressDurations.canvas,
  },
});

const raiseTableLongPressTimeout = pointerSetup.raise(() => ({
  type: 'LONG_PRESS_TIMEOUT',
  target: 'table' as const,
}));

const raiseCanvasLongPressTimeout = pointerSetup.raise(() => ({
  type: 'LONG_PRESS_TIMEOUT',
  target: 'canvas' as const,
}));

const resetInteractiveState = pointerSetup.assign(() => ({
  activePointer: null,
  canvasPress: null,
  tablePress: null,
  dragSnapshot: null,
}));

const storeCanvasPress = pointerSetup.assign(({ event }) => {
  if (event.type !== 'POINTER_DOWN_CANVAS') {
    return {};
  }
  return {
    activePointer: event.payload.meta,
    canvasPress: event.payload,
    tablePress: null,
    dragSnapshot: null,
  };
});

const storeTablePress = pointerSetup.assign(({ event }) => {
  if (event.type !== 'POINTER_DOWN_TABLE') {
    return {};
  }
  return {
    activePointer: event.payload.meta,
    tablePress: event.payload,
    canvasPress: null,
    dragSnapshot: null,
  };
});

const updateClipboard = pointerSetup.assign(({ event }) => {
  if (event.type !== 'SYNC_CLIPBOARD') {
    return {};
  }
  return {
    clipboard: event.snapshot,
  };
});

const isPointerForActiveContext = (
  context: CanvasPointerMachineContext,
  event: CanvasPointerMachineEvent,
): boolean => {
  if (!context.activePointer) {
    return false;
  }
  const pointerId = context.activePointer.pointerId;
  if (event.type === 'POINTER_MOVE') {
    return event.payload.pointerId === pointerId;
  }
  if (event.type === 'POINTER_UP' || event.type === 'POINTER_CANCEL') {
    return event.pointerId === pointerId;
  }
  return false;
};

const canOpenCanvasMenu = (
  context: CanvasPointerMachineContext,
  event: CanvasPointerMachineEvent,
): boolean => {
  if (event.type !== 'LONG_PRESS_TIMEOUT' || event.target !== 'canvas') {
    return false;
  }
  const { tableClipboard, featureClipboardSize } = context.clipboard;
  return Boolean(tableClipboard?.length) || featureClipboardSize > 0;
};

const isTableLongPress = (event: CanvasPointerMachineEvent): boolean =>
  event.type === 'LONG_PRESS_TIMEOUT' && event.target === 'table';

const isTableDragThreshold = (event: CanvasPointerMachineEvent): boolean =>
  event.type === 'DRAG_THRESHOLD_REACHED' && event.target === 'table';

export const canvasPointerMachine = pointerSetup.createMachine({
  id: 'canvasPointer',
  context: createCanvasPointerContext,
  initial: 'idle',
  on: {
    SYNC_CLIPBOARD: {
      actions: updateClipboard,
    },
  },
  states: {
    idle: {
      entry: { type: 'logPointerState', params: 'idle' },
      on: {
        POINTER_DOWN_CANVAS: {
          target: 'canvasPressPending',
          actions: storeCanvasPress,
        },
        POINTER_DOWN_TABLE: [
          {
            guard: ({ event }) =>
              event.type === 'POINTER_DOWN_TABLE' && !event.payload.isLocked,
            target: 'tablePressPending',
            actions: storeTablePress,
          },
          {
            guard: ({ event }) => event.type === 'POINTER_DOWN_TABLE',
            target: 'idle',
            actions: resetInteractiveState,
          },
        ],
      },
    },
    canvasPressPending: {
      entry: { type: 'logPointerState', params: 'canvasPressPending' },
      on: {
        POINTER_MOVE: {
          guard: ({ context, event }) =>
            isPointerForActiveContext(context, event),
          target: 'selectionBoxActive',
        },
        LONG_PRESS_TIMEOUT: {
          guard: ({ context, event }) => canOpenCanvasMenu(context, event),
          target: 'contextMenuOpen',
        },
        POINTER_UP: {
          guard: ({ context, event }) =>
            isPointerForActiveContext(context, event),
          target: 'idle',
          actions: resetInteractiveState,
        },
        POINTER_CANCEL: {
          guard: ({ context, event }) =>
            isPointerForActiveContext(context, event),
          target: 'idle',
          actions: resetInteractiveState,
        },
        ESCAPE: {
          target: 'idle',
          actions: resetInteractiveState,
        },
        CANCEL: {
          target: 'idle',
          actions: resetInteractiveState,
        },
      },
      after: {
        CANVAS_LONG_PRESS_DELAY: {
          guard: 'isMachineLongPressEnabled',
          actions: raiseCanvasLongPressTimeout,
        },
      },
    },
    selectionBoxActive: {
      entry: { type: 'logPointerState', params: 'selectionBoxActive' },
      on: {
        POINTER_MOVE: {
          guard: ({ context, event }) =>
            isPointerForActiveContext(context, event),
        },
        POINTER_UP: {
          guard: ({ context, event }) =>
            isPointerForActiveContext(context, event),
          target: 'idle',
          actions: resetInteractiveState,
        },
        POINTER_CANCEL: {
          guard: ({ context, event }) =>
            isPointerForActiveContext(context, event),
          target: 'idle',
          actions: resetInteractiveState,
        },
        ESCAPE: {
          target: 'idle',
          actions: resetInteractiveState,
        },
      },
    },
    tablePressPending: {
      entry: { type: 'logPointerState', params: 'tablePressPending' },
      on: {
        POINTER_MOVE: {
          guard: ({ context, event }) =>
            isPointerForActiveContext(context, event),
          target: 'draggingSelection',
        },
        LONG_PRESS_TIMEOUT: {
          guard: ({ event }) => isTableLongPress(event),
          target: 'contextMenuOpen',
        },
        DRAG_THRESHOLD_REACHED: {
          guard: ({ event }) => isTableDragThreshold(event),
          target: 'draggingSelection',
        },
        POINTER_UP: {
          guard: ({ context, event }) =>
            isPointerForActiveContext(context, event),
          target: 'idle',
          actions: resetInteractiveState,
        },
        POINTER_CANCEL: {
          guard: ({ context, event }) =>
            isPointerForActiveContext(context, event),
          target: 'idle',
          actions: resetInteractiveState,
        },
        ESCAPE: {
          target: 'idle',
          actions: resetInteractiveState,
        },
        CANCEL: {
          target: 'idle',
          actions: resetInteractiveState,
        },
      },
      after: {
        TABLE_LONG_PRESS_DELAY: {
          guard: 'isMachineLongPressEnabled',
          actions: raiseTableLongPressTimeout,
        },
      },
    },
    draggingSelection: {
      entry: [
        'handleDragEntry',
        'handleDragMove',
        { type: 'logPointerState', params: 'draggingSelection' },
      ],
      on: {
        POINTER_MOVE: {
          guard: ({ context, event }) =>
            isPointerForActiveContext(context, event),
          actions: 'handleDragMove',
        },
        POINTER_UP: {
          guard: ({ context, event }) =>
            isPointerForActiveContext(context, event),
          target: 'idle',
          actions: ['handleDragExit', resetInteractiveState],
        },
        POINTER_CANCEL: {
          guard: ({ context, event }) =>
            isPointerForActiveContext(context, event),
          target: 'idle',
          actions: ['handleDragExit', resetInteractiveState],
        },
        ESCAPE: {
          target: 'idle',
          actions: resetInteractiveState,
        },
      },
    },
    contextMenuOpen: {
      entry: [
        'handleContextMenuEntry',
        { type: 'logPointerState', params: 'contextMenuOpen' },
      ],
      exit: 'handleContextMenuExit',
      on: {
        CONTEXT_MENU_CLOSED: {
          target: 'idle',
          actions: resetInteractiveState,
        },
        POINTER_UP: {
          target: 'idle',
          actions: resetInteractiveState,
        },
        POINTER_CANCEL: {
          target: 'idle',
          actions: resetInteractiveState,
        },
        ESCAPE: {
          target: 'idle',
          actions: resetInteractiveState,
        },
        CANCEL: {
          target: 'idle',
          actions: resetInteractiveState,
        },
      },
    },
  },
});

export type CanvasPointerMachine = typeof canvasPointerMachine;
export type CanvasPointerState = StateValueFrom<CanvasPointerMachine>;
export type CanvasPointerSnapshot = StateFrom<CanvasPointerMachine>;
