// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SeatingPlanCanvas from '../SeatingPlanCanvas';
import {
  createMockStudent,
  createMockTable,
} from '@/__tests__/utils/testHelpers';
import type { SeatingArrangement, Student } from '@/types';

// A mouse: the open lock shows on hover only, a closed one always.
vi.mock('@/hooks/ui/useHasHoverPointer', () => ({
  useHasHoverPointer: () => true,
}));

const names = [
  'Hannah Kowalski',
  'Jonas Richter',
  'Mehmet Demir',
  'Clara Lindner',
  'Sofia Rossi',
  'Noah Weber',
];
const students: Student[] = names.map((name, index) =>
  // A marker on every seat: its pill takes the room under the name, so the
  // lock above it counts.
  createMockStudent({ id: `s${index}`, name, restless: true }),
);
const sceneTables = [0, 1, 2].map((index) =>
  createMockTable({ x: 100 + index * 150, y: 100 }),
);
const seating: SeatingArrangement = [
  [students[0], students[1]],
  [students[2], students[3]],
  [students[4], students[5]],
];

const nameSizes = (lockedSeat: [number, number] | null) => {
  const { container, unmount } = render(
    <SeatingPlanCanvas
      canvasWidth={900}
      classroomHeight={600}
      sceneTables={sceneTables}
      currentSeating={seating}
      allStudents={students}
      selectedTableIds={[]}
      showGrid={false}
      featureVisibility={{
        board: false,
        window: false,
        door: false,
        podium: false,
      }}
      selectionBox={null}
      handlePointerMove={() => {}}
      handlePointerUp={() => {}}
      beginSelection={() => {}}
      startTablePointerDrag={() => {}}
      templateDragPreview={null}
      toggleSelect={() => []}
      toggleLock={() => {}}
      isSeatLocked={(table, seat) =>
        lockedSeat !== null && lockedSeat[0] === table && lockedSeat[1] === seat
      }
    />,
  );
  // A name's <title> carries the full name, its lines the label.
  const sizes = new Map(
    Array.from(container.querySelectorAll('text')).map((node) => [
      node.querySelector('title')?.textContent,
      node.getAttribute('font-size'),
    ]),
  );
  unmount();
  return sizes;
};

describe('SeatingPlanCanvas name size', () => {
  it('keeps every other name as it was when one seat is locked', () => {
    const free = nameSizes(null);
    seating.forEach((table, tableIndex) =>
      table.forEach((student, seatIndex) => {
        const withLock = nameSizes([tableIndex, seatIndex]);
        for (const name of names) {
          if (name === student?.name) continue;
          expect(free.get(name)).toBeTruthy();
          expect(withLock.get(name)).toBe(free.get(name));
        }
      }),
    );
  });
});
