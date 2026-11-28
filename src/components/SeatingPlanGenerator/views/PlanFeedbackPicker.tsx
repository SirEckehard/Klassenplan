// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ClassroomTable } from '@/types';
import { TABLE_CORNER_RADIUS } from '@/utils';
import { calculateSeatLayout } from '@/utils/math/positionCalculations';
import type { SeatAddress } from '@/utils/data/planUsage';
import type { PlanFeedbackTable } from '@/hooks/plan/usePlanFeedbackTables';

/** How far the ring round a table stands off its edge. */
const RING_OFFSET = 4;

/** The transform `SceneTable` draws a table with, into its own frame. */
const tableTransform = (table: ClassroomTable) =>
  `translate(${table.x + table.width / 2} ${table.y + table.height / 2}) rotate(${table.rotation}) translate(${-table.width / 2} ${-table.height / 2})`;

/** Where a seat's middle is on the plan, and how large its cell is. */
function seatCentre(table: ClassroomTable, seatIndex: number) {
  const { cols, seatWidth, seatHeight, positions } = calculateSeatLayout(table);
  const cell = positions[seatIndex] ?? {
    col: seatIndex % cols,
    row: Math.floor(seatIndex / cols),
  };
  const localX = (cell.col + 0.5) * seatWidth - table.width / 2;
  const localY = (cell.row + 0.5) * seatHeight - table.height / 2;
  const angle = (table.rotation * Math.PI) / 180;
  return {
    x:
      table.x +
      table.width / 2 +
      localX * Math.cos(angle) -
      localY * Math.sin(angle),
    y:
      table.y +
      table.height / 2 +
      localX * Math.sin(angle) +
      localY * Math.cos(angle),
    size: Math.min(seatWidth, seatHeight),
  };
}

/**
 * A join of desks pushed together in a row: a capsule across the seam of
 * the two seats, which the mixing reads as a double desk.
 */
function joinCapsule(
  tables: readonly ClassroomTable[],
  [a, b]: [SeatAddress, SeatAddress],
) {
  const tableA = tables[a.tableIndex];
  const tableB = tables[b.tableIndex];
  if (!tableA || !tableB) return null;
  const from = seatCentre(tableA, a.seatIndex);
  const to = seatCentre(tableB, b.seatIndex);
  const length = Math.hypot(to.x - from.x, to.y - from.y) * 0.5;
  const thickness = Math.max(18, Math.min(from.size, to.size) * 0.5);
  return {
    transform: `translate(${(from.x + to.x) / 2} ${(from.y + to.y) / 2}) rotate(${(Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI})`,
    length,
    thickness,
  };
}

const ringClass =
  'transition-[fill-opacity] group-focus-visible:stroke-(--focus-ring) group-focus-visible:[stroke-dasharray:none]';

/**
 * The tables of the plan on the stage as buttons over it, while the teacher
 * says where it did not work (decision 0054, addendum of 2026-11-27): a ring
 * round every table that feedback can name — a group round all its tables —
 * dashed until chosen, then drawn in the ink of "Verlauf" with the table
 * tinted under it; a capsule across each join of desks pushed together in a
 * row. A drawing of its own over the canvas, with the canvas's frame: it
 * takes every press, so neither a drag nor a lock starts meanwhile, and it
 * comes before the canvas, so the keyboard reaches the tables before the
 * seats. Each is a button named by who sat there; the first takes the focus.
 */
export default function PlanFeedbackPicker({
  width,
  height,
  tables,
  units,
  chosen,
  onToggle,
}: {
  /** The canvas's frame, turned or not */
  width: number;
  height: number;
  /** The tables as the canvas draws them */
  tables: readonly ClassroomTable[];
  units: readonly PlanFeedbackTable[];
  /** Keys of the tables where it did not work */
  chosen: ReadonlySet<string>;
  onToggle: (ids: readonly string[]) => void;
}) {
  const { t } = useTranslation('generator');
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  React.useEffect(() => {
    svgRef.current
      ?.querySelector<SVGGElement>('[data-feedback-table]')
      ?.focus({ preventScroll: true });
  }, []);

  const pressByKey =
    (unit: PlanFeedbackTable) => (event: React.KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      onToggle(unit.ids);
    };

  // Groups first, so a join's capsule lies over the desks it joins.
  const ordered = [
    ...units.filter((unit) => !unit.join),
    ...units.filter((unit) => unit.join),
  ];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0 z-10 h-full w-full touch-none select-none"
      role="group"
      aria-label={t('planFeedback.pickTitle')}
      data-plan-feedback-picker=""
    >
      <rect width={width} height={height} fill="transparent" />
      {ordered.map((unit) => {
        const on = chosen.has(unit.key);
        const common = {
          fill: 'var(--data-history)',
          stroke: on ? 'var(--data-history)' : 'var(--text-muted)',
          strokeWidth: on ? 3 : 1.5,
          strokeDasharray: on ? undefined : '6 5',
          className: ringClass,
        };
        const capsule = unit.join ? joinCapsule(tables, unit.join) : null;
        const label = t('planFeedback.table', { names: unit.names });
        return (
          <g
            key={unit.key}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={label}
            data-feedback-table=""
            onClick={() => onToggle(unit.ids)}
            onKeyDown={pressByKey(unit)}
            className="group cursor-pointer outline-none"
          >
            <title>{label}</title>
            {capsule ? (
              <rect
                {...common}
                fillOpacity={on ? 0.3 : 0.06}
                transform={capsule.transform}
                x={-capsule.length / 2}
                y={-capsule.thickness / 2}
                width={capsule.length}
                height={capsule.thickness}
                rx={capsule.thickness / 2}
              />
            ) : (
              unit.tables.map((index) => {
                const table = tables[index];
                if (!table) return null;
                return (
                  <rect
                    key={index}
                    {...common}
                    fillOpacity={on ? 0.16 : 0}
                    transform={tableTransform(table)}
                    x={-RING_OFFSET}
                    y={-RING_OFFSET}
                    width={table.width + RING_OFFSET * 2}
                    height={table.height + RING_OFFSET * 2}
                    rx={TABLE_CORNER_RADIUS + RING_OFFSET}
                  />
                );
              })
            )}
          </g>
        );
      })}
    </svg>
  );
}
