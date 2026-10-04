// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { ClassroomScene } from '@/types';
import { CLASSROOM_HEIGHT, CLASSROOM_WIDTH } from '@/utils';

/**
 * A room at a glance: its outline, its tables and its room elements, drawn in
 * ink on paper at any size — how "Pläne & Verlauf" tells a classroom from a
 * lab (decision 0024). Only a picture: it takes no pointer and is hidden from
 * screen readers, since the name and the numbers beside it say what it shows.
 */
function RoomThumbnail({
  scene,
  className = '',
}: {
  scene: ClassroomScene;
  className?: string;
}) {
  const centred = (
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
  ) =>
    `translate(${x + width / 2} ${y + height / 2}) rotate(${rotation}) ` +
    `translate(${-width / 2} ${-height / 2})`;

  return (
    <svg
      viewBox={`0 0 ${CLASSROOM_WIDTH} ${CLASSROOM_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none ${className}`}
    >
      <rect
        x={6}
        y={6}
        width={CLASSROOM_WIDTH - 12}
        height={CLASSROOM_HEIGHT - 12}
        rx={18}
        fill="var(--surface-card)"
        stroke="var(--border-card)"
        strokeWidth={12}
      />
      {(scene.features ?? [])
        .filter((feature) => feature.visible !== false)
        .map((feature) => (
          <rect
            key={feature.id}
            transform={centred(
              feature.x,
              feature.y,
              feature.width,
              feature.height,
              feature.anchor === 'free' ? (feature.rotation ?? 0) : 0,
            )}
            width={feature.width}
            height={feature.height}
            rx={6}
            fill="var(--text-muted)"
            opacity={0.45}
          />
        ))}
      {scene.tables.map((table, index) => (
        <rect
          key={index}
          transform={centred(
            table.x,
            table.y,
            table.width,
            table.height,
            table.rotation,
          )}
          width={table.width}
          height={table.height}
          rx={8}
          fill="var(--text-page)"
          opacity={0.75}
        />
      ))}
    </svg>
  );
}

export default React.memo(RoomThumbnail);
