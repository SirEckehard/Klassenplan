// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { Student } from '@/types';
import { triggerHapticFeedback } from '@/utils/touch/hapticFeedback';
import type { NameDisplayMode, NameLabels } from '@/utils';

/** The student in hand while a pointer drags one, for the chip beside it. */
export interface DragPreview {
  student: Student;
  /** The pointer, in client coordinates. */
  x: number;
  y: number;
  /** `touch` puts the chip above the finger, a mouse or a pen beside the tip. */
  pointerType: string;
  appearance: {
    fill: string;
    stroke: string;
    text: string;
  };
  nameDisplay?: NameDisplayMode;
  nameLabels?: NameLabels;
}

interface DragDropStateHook {
  dragPreview: DragPreview | null;
  dragOrigin: DragOrigin | null;
  dragHover: DragHover | null;
  lockedDropTarget: LockedDropTarget | null;
  handleSeatDragStart: (student: Student, config: DragSeatConfig) => void;
  handleSeatDrag: (x: number, y: number) => void;
  handleSeatDragEnd: () => void;
  handleSeatHoverChange: (hover: DragHover | null) => void;
  handleLockedDrop: (target: DragHover) => void;
}

export interface DragOrigin {
  tableIndex: number;
  seatIndex: number;
}

export interface DragHover {
  tableIndex: number;
  seatIndex: number;
  locked: boolean;
}

export interface LockedDropTarget extends DragHover {
  id: number;
}

export interface DragSeatConfig {
  x: number;
  y: number;
  pointerType: string;
  tableIndex: number;
  seatIndex: number;
  appearance: {
    fill: string;
    stroke: string;
    text: string;
  };
  nameDisplay?: NameDisplayMode;
  nameLabels?: NameLabels;
}

/**
 * Custom hook for managing drag and drop state for student seats
 * Provides drag preview state and handlers for seat dragging operations
 */
export function useDragDropState(): DragDropStateHook {
  const [dragPreview, setDragPreview] = React.useState<DragPreview | null>(
    null,
  );
  const [dragOrigin, setDragOrigin] = React.useState<DragOrigin | null>(null);
  const [dragHover, setDragHover] = React.useState<DragHover | null>(null);
  const [lockedDropTarget, setLockedDropTarget] =
    React.useState<LockedDropTarget | null>(null);
  const lockedTimeoutRef = React.useRef<number | null>(null);

  const handleSeatDragStart = React.useCallback(
    (student: Student, config: DragSeatConfig) => {
      triggerHapticFeedback('dragStart');
      setDragPreview({
        student,
        x: config.x,
        y: config.y,
        pointerType: config.pointerType,
        appearance: config.appearance,
        nameDisplay: config.nameDisplay,
        nameLabels: config.nameLabels,
      });
      setDragOrigin({
        tableIndex: config.tableIndex,
        seatIndex: config.seatIndex,
      });
      // The seat it came from is no target; the first move finds one.
      setDragHover(null);
      setLockedDropTarget(null);
    },
    [],
  );

  const handleSeatDrag = React.useCallback((x: number, y: number) => {
    setDragPreview((prev) => (prev ? { ...prev, x, y } : prev));
  }, []);

  const handleSeatDragEnd = React.useCallback(() => {
    triggerHapticFeedback('dragEnd');
    setDragPreview(null);
    setDragOrigin(null);
    setDragHover(null);
  }, []);

  const handleSeatHoverChange = React.useCallback((hover: DragHover | null) => {
    setDragHover((prev) => {
      if (
        prev?.tableIndex === hover?.tableIndex &&
        prev?.seatIndex === hover?.seatIndex &&
        prev?.locked === hover?.locked
      ) {
        return prev;
      }
      return hover;
    });
  }, []);

  const handleLockedDrop = React.useCallback((target: DragHover) => {
    setLockedDropTarget({
      ...target,
      id: Date.now(),
    });
  }, []);

  React.useEffect(() => {
    if (!lockedDropTarget) {
      return undefined;
    }
    if (lockedTimeoutRef.current) {
      window.clearTimeout(lockedTimeoutRef.current);
    }
    lockedTimeoutRef.current = window.setTimeout(() => {
      setLockedDropTarget(null);
      lockedTimeoutRef.current = null;
    }, 700);

    return () => {
      if (lockedTimeoutRef.current) {
        window.clearTimeout(lockedTimeoutRef.current);
        lockedTimeoutRef.current = null;
      }
    };
  }, [lockedDropTarget]);

  return {
    dragPreview,
    dragOrigin,
    dragHover,
    lockedDropTarget,
    handleSeatDragStart,
    handleSeatDrag,
    handleSeatDragEnd,
    handleSeatHoverChange,
    handleLockedDrop,
  };
}

/**
 * How long a drag rests on a seat before the plan shows the swap there. The
 * ring follows the pointer at once; the students wait this long, so a drag
 * across the room does not flicker every name it passes.
 */
export const SWAP_PREVIEW_DWELL_MS = 70;

/**
 * `key` once it has stayed the same for `delay` ms, null until then and
 * whenever it is null. A key that comes back starts its wait anew.
 */
export function useDwellKey(
  key: string | null,
  delay: number = SWAP_PREVIEW_DWELL_MS,
): string | null {
  const [settled, setSettled] = React.useState<string | null>(null);
  React.useEffect(() => {
    const timeout = window.setTimeout(
      () => setSettled(key),
      key === null ? 0 : delay,
    );
    return () => window.clearTimeout(timeout);
  }, [key, delay]);
  return key !== null && settled === key ? key : null;
}

/** A swap the plan shows while a drag rests on a seat: who would sit where. */
export interface SwapPreview {
  origin: DragOrigin;
  target: DragOrigin;
  /** The dragged student, drawn on the target. */
  student: Student;
  /** Whoever sits on the target, drawn on the origin; null leaves it empty. */
  partner: Student | null;
}

/**
 * The swap a drop on `hover` would make: the dragged student on the target,
 * the target's student — or nobody — on the origin. Null without a target,
 * on a held seat or the origin itself.
 */
export function getSwapPreview(
  arrangement: ReadonlyArray<ReadonlyArray<Student | null>>,
  origin: DragOrigin | null,
  hover: DragHover | null,
): SwapPreview | null {
  if (!origin || !hover || hover.locked) return null;
  if (
    origin.tableIndex === hover.tableIndex &&
    origin.seatIndex === hover.seatIndex
  ) {
    return null;
  }
  const student = arrangement[origin.tableIndex]?.[origin.seatIndex];
  if (!student) return null;
  return {
    origin,
    target: { tableIndex: hover.tableIndex, seatIndex: hover.seatIndex },
    student,
    partner: arrangement[hover.tableIndex]?.[hover.seatIndex] ?? null,
  };
}

/**
 * What a seat shows while a swap is previewed: the partner on the origin, the
 * dragged student on the target; undefined on every other seat, which shows
 * whoever sits there.
 */
export function previewStudentAt(
  preview: SwapPreview | null,
  tableIndex: number,
  seatIndex: number,
): Student | null | undefined {
  if (!preview) return undefined;
  const { origin, target } = preview;
  if (origin.tableIndex === tableIndex && origin.seatIndex === seatIndex) {
    return preview.partner;
  }
  if (target.tableIndex === tableIndex && target.seatIndex === seatIndex) {
    return preview.student;
  }
  return undefined;
}
