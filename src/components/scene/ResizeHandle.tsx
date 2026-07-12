// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { getResizeCursor, type FeatureResizeHandle } from '@/utils';

interface ResizeHandleProps {
  /** Feature frame width in local coordinates. */
  width: number;
  /** Feature frame height in local coordinates. */
  height: number;
  handle: FeatureResizeHandle;
  /**
   * Feature rotation (deg). The handle itself lives inside the rotated frame,
   * so this only rotates the cursor arrows along the on-screen drag axis.
   */
  rotation?: number;
  /** Translated by the caller so this component stays translation-free. */
  ariaLabel: string;
  onResizeStart: (
    handle: FeatureResizeHandle,
    event: React.PointerEvent<SVGGElement>,
  ) => void;
}

const HANDLE_HALF = 4;
const TOUCH_RADIUS = 14;

const HANDLE_POSITION: Record<
  FeatureResizeHandle,
  (width: number, height: number) => { x: number; y: number }
> = {
  nw: () => ({ x: 0, y: 0 }),
  n: (width) => ({ x: width / 2, y: 0 }),
  ne: (width) => ({ x: width, y: 0 }),
  e: (width, height) => ({ x: width, y: height / 2 }),
  se: (width, height) => ({ x: width, y: height }),
  s: (width, height) => ({ x: width / 2, y: height }),
  sw: (_width, height) => ({ x: 0, y: height }),
  w: (_width, height) => ({ x: 0, y: height / 2 }),
};

function ResizeHandle({
  width,
  height,
  handle,
  rotation = 0,
  ariaLabel,
  onResizeStart,
}: ResizeHandleProps) {
  const { x, y } = HANDLE_POSITION[handle](width, height);

  return (
    <g
      transform={`translate(${x} ${y})`}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        // Capture the pointer so no pointerleave fires on the parent while
        // resizing — otherwise the hover-gated handle unmounts mid-gesture.
        if (typeof e.currentTarget.setPointerCapture === 'function') {
          e.currentTarget.setPointerCapture(e.pointerId);
        }
        onResizeStart(handle, e);
      }}
      style={{ cursor: getResizeCursor(handle, rotation), touchAction: 'none' }}
      aria-label={ariaLabel}
      role="button"
    >
      {/* Invisible hit area so the small handle stays grabbable on touch. */}
      <circle r={TOUCH_RADIUS} fill="transparent" />
      <rect
        x={-HANDLE_HALF}
        y={-HANDLE_HALF}
        width={HANDLE_HALF * 2}
        height={HANDLE_HALF * 2}
        rx={2}
        fill="#3b82f6"
        stroke="#fff"
        strokeWidth={1.5}
      />
    </g>
  );
}

export default React.memo(ResizeHandle);
