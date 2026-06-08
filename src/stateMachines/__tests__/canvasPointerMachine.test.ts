// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
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
});
