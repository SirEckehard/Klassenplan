import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { keyboardInteractionMachine } from '../../stateMachines';

const baseArrowPayload = {
  direction: 'right' as const,
  shiftKey: false,
  repeat: false,
};

describe('keyboardInteractionMachine', () => {
  // XState 5 sets the initial context via createMachine; provide() only
  // overrides actions/actors/guards/delays. The machine already declares
  // context: createKeyboardContext, so we don't pass it here.
  const createTestActor = () =>
    createActor(
      keyboardInteractionMachine.provide({
        actions: {
          moveSelection: () => undefined,
          deleteSelection: () => undefined,
          copySelection: () => undefined,
          cutSelection: () => undefined,
          pasteSelection: () => undefined,
          closeCanvasMenu: () => undefined,
          logKeyboardState: () => undefined,
        },
      }),
    );

  it('ignores arrow keys without selection', () => {
    const actor = createTestActor().start();
    actor.send({ type: 'KEY_ARROW', payload: baseArrowPayload });
    expect(actor.getSnapshot().value).toBe('keyboardIdle');
    actor.stop();
  });

  it('enters movingSelection when selection exists', () => {
    const actor = createTestActor().start();
    actor.send({
      type: 'SYNC_STATUS',
      snapshot: {
        focusInInput: false,
        hasClipboardContent: false,
        selectionCount: 2,
      },
    });
    actor.send({ type: 'KEY_ARROW', payload: baseArrowPayload });
    expect(actor.getSnapshot().value).toBe('movingSelection');
    actor.stop();
  });

  it('returns to idle on KEY_UP', () => {
    const actor = createTestActor().start();
    actor.send({
      type: 'SYNC_STATUS',
      snapshot: {
        focusInInput: false,
        hasClipboardContent: false,
        selectionCount: 1,
      },
    });
    actor.send({ type: 'KEY_ARROW', payload: baseArrowPayload });
    actor.send({
      type: 'KEY_RELEASE',
      payload: { direction: baseArrowPayload.direction },
    });
    expect(actor.getSnapshot().value).toBe('keyboardIdle');
    actor.stop();
  });

  it('triggers clipboard state when copy combo is pressed', () => {
    const actor = createTestActor().start();
    actor.send({
      type: 'SYNC_STATUS',
      snapshot: {
        focusInInput: false,
        hasClipboardContent: true,
        selectionCount: 1,
      },
    });
    actor.send({ type: 'KEY_COPY' });
    expect(actor.getSnapshot().value).toBe('keyboardIdle');
    actor.stop();
  });
});
