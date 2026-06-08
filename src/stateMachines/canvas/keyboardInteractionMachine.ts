import { setup } from 'xstate';
import type { StateFrom } from 'xstate';

export type KeyboardDirection = 'up' | 'down' | 'left' | 'right';

export interface KeyboardStatusSnapshot {
  selectionCount: number;
  hasClipboardContent: boolean;
  focusInInput: boolean;
}

export interface KeyboardContext extends KeyboardStatusSnapshot {
  activeDirection: KeyboardDirection | null;
}

export type KeyboardMachineEvent =
  | {
      type: 'KEY_ARROW';
      payload: {
        direction: KeyboardDirection;
        shiftKey: boolean;
        repeat: boolean;
      };
    }
  | {
      type: 'KEY_ROTATE';
      payload: {
        direction: 'cw' | 'ccw';
        shiftKey: boolean;
      };
    }
  | { type: 'KEY_RELEASE'; payload: { direction: KeyboardDirection | null } }
  | { type: 'KEY_DELETE' }
  | { type: 'KEY_COPY' }
  | { type: 'KEY_CUT' }
  | { type: 'KEY_PASTE' }
  | { type: 'SYNC_STATUS'; snapshot: KeyboardStatusSnapshot }
  | { type: 'RESET' };

export const createKeyboardContext = (): KeyboardContext => ({
  selectionCount: 0,
  hasClipboardContent: false,
  focusInInput: false,
  activeDirection: null,
});

const keyboardSetup = setup({
  types: {
    context: {} as KeyboardContext,
    events: {} as KeyboardMachineEvent,
  },
  actions: {
    moveSelection: () => undefined,
    rotateSelection: () => undefined,
    deleteSelection: () => undefined,
    copySelection: () => undefined,
    cutSelection: () => undefined,
    pasteSelection: () => undefined,
    closeCanvasMenu: () => undefined,
    logKeyboardState: () => undefined,
  },
  guards: {
    keyboardInputBlocked: ({ context }) => context.focusInInput,
    hasSelection: ({ context }) =>
      context.selectionCount > 0 && !context.focusInInput,
    hasClipboardContent: ({ context }) =>
      context.hasClipboardContent && !context.focusInInput,
    isMatchingRelease: ({ context, event }) =>
      event.type === 'KEY_RELEASE' &&
      context.activeDirection !== null &&
      event.payload.direction === context.activeDirection,
  },
});

const storeDirection = keyboardSetup.assign(({ event }) => {
  if (event.type !== 'KEY_ARROW') {
    return {};
  }
  return { activeDirection: event.payload.direction };
});

const resetDirection = keyboardSetup.assign({ activeDirection: () => null });

const updateStatus = keyboardSetup.assign(({ event }) => {
  if (event.type !== 'SYNC_STATUS') {
    return {};
  }
  return {
    selectionCount: event.snapshot.selectionCount,
    hasClipboardContent: event.snapshot.hasClipboardContent,
    focusInInput: event.snapshot.focusInInput,
  };
});

export const keyboardInteractionMachine = keyboardSetup.createMachine({
  id: 'keyboardInteraction',
  context: createKeyboardContext,
  initial: 'keyboardIdle',
  on: {
    SYNC_STATUS: {
      actions: updateStatus,
    },
    RESET: {
      target: '#keyboardInteraction.keyboardIdle',
      actions: [resetDirection],
    },
  },
  states: {
    keyboardIdle: {
      entry: 'logKeyboardState',
      on: {
        KEY_ARROW: [
          {
            guard: 'keyboardInputBlocked',
            target: 'keyboardIdle',
          },
          {
            guard: 'hasSelection',
            target: '#keyboardInteraction.movingSelection',
            actions: ['logKeyboardState', storeDirection, 'moveSelection'],
          },
        ],
        KEY_DELETE: {
          guard: 'hasSelection',
          target: 'keyboardIdle',
          actions: ['deleteSelection', 'logKeyboardState'],
        },
        KEY_ROTATE: [
          {
            guard: 'keyboardInputBlocked',
            target: 'keyboardIdle',
          },
          {
            guard: 'hasSelection',
            target: 'keyboardIdle',
            actions: ['rotateSelection', 'logKeyboardState'],
          },
        ],
        KEY_COPY: {
          guard: 'hasSelection',
          target: '#keyboardInteraction.clipboardOp',
          actions: ['copySelection', 'logKeyboardState'],
        },
        KEY_CUT: {
          guard: 'hasSelection',
          target: '#keyboardInteraction.clipboardOp',
          actions: ['cutSelection', 'logKeyboardState'],
        },
        KEY_PASTE: {
          guard: 'hasClipboardContent',
          target: '#keyboardInteraction.clipboardOp',
          actions: ['closeCanvasMenu', 'pasteSelection', 'logKeyboardState'],
        },
        KEY_RELEASE: {
          actions: resetDirection,
        },
      },
    },
    movingSelection: {
      entry: 'logKeyboardState',
      on: {
        KEY_ARROW: [
          {
            guard: 'keyboardInputBlocked',
            target: '#keyboardInteraction.keyboardIdle',
            actions: resetDirection,
          },
          {
            guard: 'hasSelection',
            actions: [storeDirection, 'moveSelection'],
          },
        ],
        KEY_RELEASE: [
          {
            guard: 'isMatchingRelease',
            target: '#keyboardInteraction.keyboardIdle',
            actions: resetDirection,
          },
        ],
      },
    },
    clipboardOp: {
      entry: 'logKeyboardState',
      always: {
        target: '#keyboardInteraction.keyboardIdle',
        actions: resetDirection,
      },
    },
  },
});

export type KeyboardInteractionMachine = typeof keyboardInteractionMachine;
export type KeyboardInteractionSnapshot = StateFrom<KeyboardInteractionMachine>;
