// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { createPortal } from 'react-dom';
import { LockIcon } from '@phosphor-icons/react';

/** Between the touch point and the chip: the fingertip lies in between. */
const FINGER_CLEARANCE = 40;
/** The chip's height, for deciding whether it fits above the finger. */
const CHIP_HEIGHT = 32;
/** The chip's widest, for deciding which side of the finger it fits on. */
const CHIP_MAX_WIDTH = 176;
/** Kept clear of the window's edges. */
const EDGE_MARGIN = 8;
/** From a mouse pointer's tip to the chip, beside and below the arrow. */
const CURSOR_OFFSET = { x: 14, y: 18 };

export type DragGhostProps = {
  /** The pointer, in client coordinates. */
  x: number;
  y: number;
  /** `touch` puts the chip above the finger; a mouse or a pen beside the tip. */
  pointerType: string;
  name: string;
  /** The seat's gender tint, so the chip reads as the student it carries. */
  appearance: { fill: string; stroke: string; text: string };
  /** The place under the finger is held: the drop would be refused. */
  blocked?: boolean;
};

/** Where the chip goes for a finger: above it, beside it at the top. */
function fingerTransform(x: number, y: number): string {
  if (y - FINGER_CLEARANCE - CHIP_HEIGHT >= EDGE_MARGIN) {
    return `translate(-50%, calc(-100% - ${FINGER_CLEARANCE}px))`;
  }
  const width = typeof window === 'undefined' ? Infinity : window.innerWidth;
  return x + FINGER_CLEARANCE + CHIP_MAX_WIDTH <= width - EDGE_MARGIN
    ? `translate(${FINGER_CLEARANCE}px, -50%)`
    : `translate(calc(-100% - ${FINGER_CLEARANCE}px), -50%)`;
}

/**
 * Where the chip goes for a mouse or a pen: below and right of the tip, as a
 * system labels what it drags, so the seat under the tip stays in sight —
 * turned to the left or upwards where the window ends.
 */
function cursorTransform(x: number, y: number): string {
  const width = typeof window === 'undefined' ? Infinity : window.innerWidth;
  const height = typeof window === 'undefined' ? Infinity : window.innerHeight;
  const dx =
    x + CURSOR_OFFSET.x + CHIP_MAX_WIDTH <= width - EDGE_MARGIN
      ? `${CURSOR_OFFSET.x}px`
      : `calc(-100% - ${CURSOR_OFFSET.x / 2}px)`;
  const dy =
    y + CURSOR_OFFSET.y + CHIP_HEIGHT <= height - EDGE_MARGIN
      ? `${CURSOR_OFFSET.y}px`
      : `calc(-100% - ${CURSOR_OFFSET.y / 2}px)`;
  return `translate(${dx}, ${dy})`;
}

/**
 * The name of the student being dragged, in the plan and in the circle alike.
 *
 * The plan itself shows where the student would land — the student on the
 * target, the one displaced on the seat left behind — so this only says who
 * is in hand. Above a finger, which hides the seat underneath (beside it in
 * the top row of the window); below and right of a mouse pointer's tip.
 */
export default function DragGhost({
  x,
  y,
  pointerType,
  name,
  appearance,
  blocked = false,
}: DragGhostProps) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: x,
        top: y,
        transform:
          pointerType === 'touch'
            ? fingerTransform(x, y)
            : cursorTransform(x, y),
      }}
    >
      <div
        data-drag-ghost=""
        className="flex max-w-44 items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-semibold shadow-lg"
        style={{
          backgroundColor: appearance.fill,
          borderColor: appearance.stroke,
          color: appearance.text,
        }}
      >
        {blocked && (
          <LockIcon
            size={14}
            weight="bold"
            className="shrink-0 text-(--status-alert)"
            aria-hidden="true"
          />
        )}
        <span className="truncate">{name}</span>
      </div>
    </div>,
    document.body,
  );
}
