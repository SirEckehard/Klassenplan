// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomTable } from '@/types';

export type CanvasPointerType =
  | 'mouse'
  | 'touch'
  | 'pen'
  | 'keyboard'
  | 'unknown';

export interface ClientPoint {
  x: number;
  y: number;
}

export interface ScenePoint {
  x: number;
  y: number;
}

export interface PointerMeta {
  pointerId: number;
  pointerType: CanvasPointerType;
  pressedAt: ClientPoint;
}

export interface CanvasPressPayload {
  meta: PointerMeta;
  clientPoint: ClientPoint;
  scenePoint: ScenePoint;
  multiSelect: boolean;
}

export interface TablePressPayload extends CanvasPressPayload {
  tableIndex: number;
  isLocked: boolean;
}

export interface PointerMovePayload {
  pointerId: number;
  pointerType: CanvasPointerType;
  clientPoint: ClientPoint;
  scenePoint: ScenePoint;
}

export interface DragSelectionSnapshot {
  tables: Array<{
    index: number;
    startX: number;
    startY: number;
  }>;
  startMouse: ScenePoint;
}

export interface ClipboardSnapshot {
  tableClipboard: ClassroomTable[] | null;
  featureClipboardSize: number;
}

export interface LongPressDurations {
  table: number;
  canvas: number;
}

export type LongPressMode = 'legacy' | 'machine';

export interface CanvasPointerMachineContext {
  activePointer: PointerMeta | null;
  canvasPress: CanvasPressPayload | null;
  tablePress: TablePressPayload | null;
  dragSnapshot: DragSelectionSnapshot | null;
  clipboard: ClipboardSnapshot;
  longPressDurations: LongPressDurations;
  longPressMode: LongPressMode;
}

export type CanvasPointerMachineEvent =
  | { type: 'POINTER_DOWN_CANVAS'; payload: CanvasPressPayload }
  | { type: 'POINTER_DOWN_TABLE'; payload: TablePressPayload }
  | { type: 'POINTER_MOVE'; payload: PointerMovePayload }
  | { type: 'POINTER_UP'; pointerId: number }
  | { type: 'POINTER_CANCEL'; pointerId: number }
  | { type: 'LONG_PRESS_TIMEOUT'; target: 'canvas' | 'table' }
  | { type: 'DRAG_THRESHOLD_REACHED'; target: 'canvas' | 'table' }
  | { type: 'SYNC_CLIPBOARD'; snapshot: ClipboardSnapshot }
  | { type: 'ESCAPE' }
  | { type: 'CANCEL' }
  | { type: 'CONTEXT_MENU_CLOSED' };
