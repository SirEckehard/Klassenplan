// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

/**
 * One step of a turn by the table's handle: `'start'` when it is pressed,
 * `'move'` with the angle turned since (degrees, unsnapped), `'end'` when it
 * is let go.
 */
export type TableRotationHandler = (
  phase: 'start' | 'move' | 'end',
  delta: number,
) => void;

interface UseTableRotationOptions {
  tableRef: React.RefObject<SVGGElement | null>;
  /** The table's own size, in the group's local units. */
  width: number;
  height: number;
  onRotate?: TableRotationHandler;
}

interface UseTableRotationResult {
  handleRotate: (event: React.PointerEvent<SVGGElement>) => void;
}

/**
 * The table's centre on screen. The group's bounding box is no measure of
 * it: the handle, the chair dots and the handle's icon (a nested `<svg>`
 * whose 256-unit viewBox a browser may count unscaled) stretch it to one
 * side, so the turn pivoted beside the table — a small table then spun
 * wildly near that point and turned against the pointer away from it. The
 * group's own matrix maps its local centre exactly; the box stays only as a
 * fallback where there is no matrix (jsdom).
 */
function getTableCenterOnScreen(
  group: SVGGElement,
  width: number,
  height: number,
): { x: number; y: number } {
  const matrix =
    typeof group.getScreenCTM === 'function' ? group.getScreenCTM() : null;
  if (matrix) {
    const localX = width / 2;
    const localY = height / 2;
    return {
      x: matrix.a * localX + matrix.c * localY + matrix.e,
      y: matrix.b * localX + matrix.d * localY + matrix.f,
    };
  }
  const bbox = group.getBoundingClientRect();
  return { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 };
}

/**
 * Measures a turn of a table's handle around the table's centre and reports
 * it. What turns with it — the selection, room elements included — and how
 * far it snaps is the room layer's business, so this hook never writes to a
 * table itself.
 */
export function useTableRotation({
  tableRef,
  width,
  height,
  onRotate,
}: UseTableRotationOptions): UseTableRotationResult {
  const handleRotate = React.useCallback<
    (event: React.PointerEvent<SVGGElement>) => void
  >(
    (event) => {
      event.stopPropagation();
      if (!onRotate) return;
      const group = tableRef.current;
      if (!group) return;
      const { x: centerX, y: centerY } = getTableCenterOnScreen(
        group,
        width,
        height,
      );
      const startAngle = Math.atan2(
        event.clientY - centerY,
        event.clientX - centerX,
      );

      const onMove = (ev: PointerEvent) => {
        const angle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX);
        onRotate('move', ((angle - startAngle) * 180) / Math.PI);
      };

      const onPointerComplete = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onPointerComplete);
        window.removeEventListener('pointercancel', onPointerComplete);
        onRotate('end', 0);
      };

      onRotate('start', 0);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onPointerComplete);
      window.addEventListener('pointercancel', onPointerComplete);
    },
    [height, onRotate, tableRef, width],
  );

  return {
    handleRotate,
  };
}
