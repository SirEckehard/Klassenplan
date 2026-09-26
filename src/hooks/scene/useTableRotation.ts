// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { ClassroomTable } from '@/types';
import {
  snapRotationAngle,
  normalizeRotation,
  DEFAULT_ROTATION_SNAP_STEP,
  DEFAULT_ROTATION_SNAP_TOLERANCE,
} from '@/utils';

const rotationSnapOptions = {
  step: DEFAULT_ROTATION_SNAP_STEP,
  tolerance: DEFAULT_ROTATION_SNAP_TOLERANCE,
} as const;

/**
 * Receives the rotations (table index → degrees) of a handle gesture: on
 * every pointer move (`'move'`) and once more when the handle is let go
 * (`'end'`), which is where the scene gets committed.
 */
export type TableRotationHandler = (
  rotations: ReadonlyMap<number, number>,
  phase: 'move' | 'end',
) => void;

interface UseTableRotationOptions {
  table: ClassroomTable;
  index: number;
  tableRef: React.RefObject<SVGGElement | null>;
  onRotate?: TableRotationHandler;
  onTransformStart?: () => void;
  selectedTableIds?: number[];
  sceneTables?: ClassroomTable[];
}

interface UseTableRotationResult {
  handleRotate: (event: React.PointerEvent<SVGGElement>) => void;
}

/**
 * Turns a table (or every unlocked table of the selection) by its handle.
 *
 * The hook never writes to the table objects themselves: they are shared
 * with the layout store, which would compare the scene with itself, see no
 * change and tell nobody — the inspector kept showing the old angle, and the
 * turn was only saved with the next change. New rotations go to `onRotate`
 * instead, and the scene re-renders from there.
 */
export function useTableRotation({
  table,
  index,
  tableRef,
  onRotate,
  onTransformStart,
  selectedTableIds,
  sceneTables,
}: UseTableRotationOptions): UseTableRotationResult {
  const sceneTablesRef = React.useRef<ClassroomTable[] | null>(
    sceneTables ?? null,
  );
  const tableDataRef = React.useRef(table);

  React.useEffect(() => {
    sceneTablesRef.current = sceneTables ?? null;
  }, [sceneTables]);

  React.useEffect(() => {
    tableDataRef.current = table;
  }, [table]);

  const handleRotate = React.useCallback<
    (event: React.PointerEvent<SVGGElement>) => void
  >(
    (event) => {
      event.stopPropagation();
      if (!onRotate) return;
      onTransformStart?.();
      const bbox = tableRef.current?.getBoundingClientRect();
      if (!bbox) return;

      const centerX = bbox.left + bbox.width / 2;
      const centerY = bbox.top + bbox.height / 2;
      const startAngle = Math.atan2(
        event.clientY - centerY,
        event.clientX - centerX,
      );

      const resolveTable = (tableIndex: number): ClassroomTable | null => {
        const tables = sceneTablesRef.current;
        if (tables && tables[tableIndex]) {
          return tables[tableIndex];
        }
        if (tableIndex === index) {
          return tableDataRef.current;
        }
        return null;
      };

      const getRotationTargets = (): number[] => {
        if (!selectedTableIds || selectedTableIds.length === 0) {
          return [index];
        }
        if (!selectedTableIds.includes(index)) {
          return [index];
        }
        const uniqueSelection = Array.from(new Set(selectedTableIds));
        const validTargets = uniqueSelection.filter((tableIndex) => {
          const tableCandidate = resolveTable(tableIndex);
          return tableCandidate && !tableCandidate.locked;
        });
        return validTargets.length > 0 ? validTargets : [index];
      };

      const targets = getRotationTargets().flatMap((tableIndex) => {
        const target = resolveTable(tableIndex);
        return target ? [{ tableIndex, startRotation: target.rotation }] : [];
      });

      let latestRotations: Map<number, number> | null = null;

      const applyRotationDelta = (deltaDeg: number) => {
        const rotations = new Map<number, number>();
        targets.forEach(({ tableIndex, startRotation }) => {
          const rawRotation = startRotation + deltaDeg;
          const result = snapRotationAngle(rawRotation, rotationSnapOptions);
          rotations.set(
            tableIndex,
            result.snapped ? result.normalized : normalizeRotation(rawRotation),
          );
        });
        if (rotations.size === 0) return;
        latestRotations = rotations;
        onRotate(rotations, 'move');
      };

      const onMove = (ev: PointerEvent) => {
        const angle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX);
        const deg = ((angle - startAngle) * 180) / Math.PI;
        applyRotationDelta(deg);
      };

      const onPointerComplete = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onPointerComplete);
        window.removeEventListener('pointercancel', onPointerComplete);
        // A press without a move turned nothing and commits nothing.
        if (latestRotations) {
          onRotate(latestRotations, 'end');
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onPointerComplete);
      window.addEventListener('pointercancel', onPointerComplete);
    },
    [onRotate, onTransformStart, tableRef, selectedTableIds, index],
  );

  return {
    handleRotate,
  };
}
