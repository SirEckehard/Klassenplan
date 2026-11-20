// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { ClassroomTable } from '@/types';
import { CLASSROOM_HEIGHT, CLASSROOM_WIDTH } from '@/utils';

/**
 * The room set up with an arrangement, small enough for a row of the
 * "Neu einrichten" menu: the walls as a frame, the tables as they stand.
 */
const ArrangementPreview = React.memo(function ArrangementPreview({
  tables,
}: {
  tables: readonly ClassroomTable[];
}) {
  return (
    <svg
      viewBox={`-30 -30 ${CLASSROOM_WIDTH + 60} ${CLASSROOM_HEIGHT + 60}`}
      className="h-5 w-7.5 text-(--text-muted)"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x={0}
        y={0}
        width={CLASSROOM_WIDTH}
        height={CLASSROOM_HEIGHT}
        rx={60}
        fill="none"
        stroke="currentColor"
        strokeWidth={40}
      />
      {tables.map((table, index) => (
        <rect
          key={table.id ?? index}
          x={table.x}
          y={table.y}
          width={table.width}
          height={table.height}
          rx={12}
          fill="currentColor"
          transform={`rotate(${table.rotation} ${table.x + table.width / 2} ${
            table.y + table.height / 2
          })`}
        />
      ))}
    </svg>
  );
});

export default ArrangementPreview;
