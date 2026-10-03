// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createActor } from 'xstate';
import { canvasPointerMachine } from '../../stateMachines/canvas/canvasPointerMachine';
import type {
  CanvasPressPayload,
  ClipboardSnapshot,
  TablePressPayload,
} from '../../stateMachines';
import type { ClassroomTable } from '../../types';

describe('canvasPointerMachine', () => {
  const basePointer = {
    pointerId: 1,
    pointerType: 'mouse' as const,
    pressedAt: { x: 100, y: 120 },
  };

  const canvasPressPayload: CanvasPressPayload = {
    meta: basePointer,
    clientPoint: { x: 100, y: 120 },
    scenePoint: { x: 10, y: 12 },
    multiSelect: false,
  };

  const tablePressPayload: TablePressPayload = {
    ...canvasPressPayload,
    tableIndex: 3,
    isLocked: false,
  };

  it('initialises with idle state', () => {
    const actor = createActor(canvasPointerMachine).start();

    expect(actor.getSnapshot().value).toBe('idle');
    actor.stop();
  });

  it('stores canvas press data on pointer down', () => {
    const actor = createActor(canvasPointerMachine).start();

    actor.send({ type: 'POINTER_DOWN_CANVAS', payload: canvasPressPayload });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('canvasPressPending');
    expect(snapshot.context.canvasPress).toEqual(canvasPressPayload);
    actor.stop();
  });

  it('ignores pointer down on locked table', () => {
    const actor = createActor(canvasPointerMachine).start();

    actor.send({
      type: 'POINTER_DOWN_TABLE',
      payload: { ...tablePressPayload, isLocked: true },
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('idle');
    expect(snapshot.context.tablePress).toBe(null);
    actor.stop();
  });

  it('synchronises clipboard snapshot', () => {
    const actor = createActor(canvasPointerMachine).start();

    const tableClipboard: ClassroomTable[] = [
      {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        rotation: 0,
        seatCount: 2,
        locked: false,
        zIndex: 0,
      },
    ];
    const clipboard: ClipboardSnapshot = {
      tableClipboard,
      featureClipboardSize: 1,
    };

    actor.send({ type: 'SYNC_CLIPBOARD', snapshot: clipboard });

    expect(actor.getSnapshot().context.clipboard).toEqual(clipboard);
    actor.stop();
  });

  describe('with a finger', () => {
    const touchPointer = { ...basePointer, pointerType: 'touch' as const };
    const touchTablePress: TablePressPayload = {
      ...tablePressPayload,
      meta: touchPointer,
    };
    const touchCanvasPress: CanvasPressPayload = {
      ...canvasPressPayload,
      meta: touchPointer,
    };
    const jitter = {
      type: 'POINTER_MOVE' as const,
      payload: {
        pointerId: 1,
        pointerType: 'touch' as const,
        clientPoint: { x: 102, y: 121 },
        scenePoint: { x: 11, y: 12 },
      },
    };

    afterEach(() => {
      vi.useRealTimers();
    });

    it('keeps a table press through a finger that trembles', () => {
      const actor = createActor(canvasPointerMachine).start();

      actor.send({ type: 'POINTER_DOWN_TABLE', payload: touchTablePress });
      actor.send(jitter);

      expect(actor.getSnapshot().value).toBe('tablePressPending');

      actor.send({ type: 'DRAG_THRESHOLD_REACHED', target: 'table' });

      expect(actor.getSnapshot().value).toBe('draggingSelection');
      actor.stop();
    });

    it('still drags a table from the first move of a mouse', () => {
      const actor = createActor(canvasPointerMachine).start();

      actor.send({ type: 'POINTER_DOWN_TABLE', payload: tablePressPayload });
      actor.send({
        ...jitter,
        payload: { ...jitter.payload, pointerType: 'mouse' },
      });

      expect(actor.getSnapshot().value).toBe('draggingSelection');
      actor.stop();
    });

    it('starts a selection box on the floor only past the threshold', () => {
      const actor = createActor(canvasPointerMachine).start();

      actor.send({ type: 'POINTER_DOWN_CANVAS', payload: touchCanvasPress });
      actor.send(jitter);

      expect(actor.getSnapshot().value).toBe('canvasPressPending');

      actor.send({ type: 'DRAG_THRESHOLD_REACHED', target: 'canvas' });

      expect(actor.getSnapshot().value).toBe('selectionBoxActive');
      actor.stop();
    });

    it('leaves the menu of a long press open when the finger lifts', () => {
      vi.useFakeTimers();
      const handleContextMenuExit = vi.fn();
      const actor = createActor(
        canvasPointerMachine.provide({ actions: { handleContextMenuExit } }),
      ).start();

      actor.send({ type: 'POINTER_DOWN_TABLE', payload: touchTablePress });
      actor.send(jitter);
      vi.advanceTimersByTime(500);

      expect(actor.getSnapshot().value).toBe('contextMenuOpen');

      actor.send({ type: 'POINTER_UP', pointerId: 1 });

      expect(actor.getSnapshot().value).toBe('idle');
      expect(handleContextMenuExit).not.toHaveBeenCalled();
      actor.stop();
    });

    it('closes the menu of a long press on Escape', () => {
      vi.useFakeTimers();
      const handleContextMenuExit = vi.fn();
      const actor = createActor(
        canvasPointerMachine.provide({ actions: { handleContextMenuExit } }),
      ).start();

      actor.send({ type: 'POINTER_DOWN_TABLE', payload: touchTablePress });
      vi.advanceTimersByTime(500);
      actor.send({ type: 'ESCAPE' });

      expect(actor.getSnapshot().value).toBe('idle');
      expect(handleContextMenuExit).toHaveBeenCalledTimes(1);
      actor.stop();
    });
  });
});
