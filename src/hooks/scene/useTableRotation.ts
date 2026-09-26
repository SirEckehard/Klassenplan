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
  onRotate?: TableRotationHandler;
}

interface UseTableRotationResult {
  handleRotate: (event: React.PointerEvent<SVGGElement>) => void;
}

/**
 * Measures a turn of a table's handle around the table's centre and reports
 * it. What turns with it — the selection, room elements included — and how
 * far it snaps is the room layer's business, so this hook never writes to a
 * table itself.
 */
export function useTableRotation({
  tableRef,
  onRotate,
}: UseTableRotationOptions): UseTableRotationResult {
  const handleRotate = React.useCallback<
    (event: React.PointerEvent<SVGGElement>) => void
  >(
    (event) => {
      event.stopPropagation();
      if (!onRotate) return;
      const bbox = tableRef.current?.getBoundingClientRect();
      if (!bbox) return;

      const centerX = bbox.left + bbox.width / 2;
      const centerY = bbox.top + bbox.height / 2;
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
    [onRotate, tableRef],
  );

  return {
    handleRotate,
  };
}
