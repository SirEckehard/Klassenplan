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

const rotationRenderRegistry = new WeakMap<ClassroomTable, () => void>();

interface UseTableRotationOptions {
  table: ClassroomTable;
  index: number;
  tableRef: React.RefObject<SVGGElement | null>;
  onUpdate: () => void;
  onTransformStart?: () => void;
  selectedTableIds?: number[];
  sceneTables?: ClassroomTable[];
  forceLocalRender: () => void;
}

interface UseTableRotationResult {
  handleRotate: (event: React.PointerEvent<SVGGElement>) => void;
}

export function useTableRotation({
  table,
  index,
  tableRef,
  onUpdate,
  onTransformStart,
  selectedTableIds,
  sceneTables,
  forceLocalRender,
}: UseTableRotationOptions): UseTableRotationResult {
  const rotationSnapActiveRef = React.useRef(false);
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

  React.useEffect(() => {
    rotationRenderRegistry.set(table, forceLocalRender);
    return () => {
      rotationRenderRegistry.delete(table);
    };
  }, [table, forceLocalRender]);

  const handleRotate = React.useCallback<
    (event: React.PointerEvent<SVGGElement>) => void
  >(
    (event) => {
      event.stopPropagation();
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

      const effectiveTargets = getRotationTargets();
      const startRotations = effectiveTargets.map((targetIndex) => {
        const target = resolveTable(targetIndex);
        return target ? target.rotation : 0;
      });

      const applyRotationDelta = (deltaDeg: number) => {
        let snappedInMove = false;
        let mutated = false;
        effectiveTargets.forEach((tableIndex, idx) => {
          const targetTable = resolveTable(tableIndex);
          if (!targetTable) {
            return;
          }
          const rawRotation = startRotations[idx] + deltaDeg;
          const result = snapRotationAngle(rawRotation, rotationSnapOptions);
          const nextRotation = result.snapped
            ? result.normalized
            : normalizeRotation(rawRotation);
          targetTable.rotation = nextRotation;
          rotationRenderRegistry.get(targetTable)?.();
          if (tableIndex === index && tableDataRef.current) {
            tableDataRef.current.rotation = nextRotation;
          }
          snappedInMove = snappedInMove || result.snapped;
          mutated = true;
        });
        rotationSnapActiveRef.current = snappedInMove;
        if (mutated) {
          forceLocalRender();
          onUpdate();
        }
      };

      const finalizeRotation = () => {
        let updated = false;
        effectiveTargets.forEach((tableIndex) => {
          const targetTable = resolveTable(tableIndex);
          if (!targetTable) {
            return;
          }
          const currentRotation = targetTable.rotation;
          const result = snapRotationAngle(
            currentRotation,
            rotationSnapOptions,
          );
          const nextRotation = normalizeRotation(
            result.snapped ? result.value : currentRotation,
          );
          if (!Object.is(nextRotation, currentRotation)) {
            targetTable.rotation = nextRotation;
            if (tableIndex === index && tableDataRef.current) {
              tableDataRef.current.rotation = nextRotation;
            }
            updated = true;
          }
        });
        if (updated || rotationSnapActiveRef.current) {
          onUpdate();
        }
        rotationSnapActiveRef.current = false;
      };

      const onMove = (ev: PointerEvent) => {
        const angle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX);
        const deg = ((angle - startAngle) * 180) / Math.PI;
        applyRotationDelta(deg);
      };

      const onPointerComplete = () => {
        finalizeRotation();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onPointerComplete);
        window.removeEventListener('pointercancel', onPointerComplete);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onPointerComplete);
      window.addEventListener('pointercancel', onPointerComplete);
    },
    [
      onTransformStart,
      tableRef,
      selectedTableIds,
      index,
      onUpdate,
      forceLocalRender,
    ],
  );

  return {
    handleRotate,
  };
}
