// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SeatingPlanCanvas from '../SeatingPlanCanvas';
import {
  createMockStudent,
  createMockTable,
} from '@/__tests__/utils/testHelpers';
import type { SeatingArrangement, Student } from '@/types';

const studentAda: Student = createMockStudent({
  id: 's1',
  name: 'Ada Lovelace',
});

const sceneTables = [
  createMockTable({ x: 100, y: 100 }),
  createMockTable({ x: 300, y: 100 }),
];

const currentSeating: SeatingArrangement = [
  [studentAda, null],
  [null, null],
];

const renderCanvas = (
  overrides: Partial<React.ComponentProps<typeof SeatingPlanCanvas>> = {},
) =>
  render(
    <SeatingPlanCanvas
      canvasWidth={900}
      classroomHeight={600}
      sceneTables={sceneTables}
      currentSeating={currentSeating}
      allStudents={[studentAda]}
      selectedTableIds={[]}
      showGrid={false}
      showBoard={false}
      showWindows={false}
      showDoor={false}
      showPodium={false}
      selectionBox={null}
      handlePointerMove={() => {}}
      handlePointerUp={() => {}}
      beginSelection={() => {}}
      startTablePointerDrag={() => {}}
      templateDragPreview={null}
      onTableUpdate={() => {}}
      toggleSelect={() => []}
      {...overrides}
    />,
  );

const getSeatRect = (
  container: HTMLElement,
  tableIndex: number,
  seatIndex: number,
) =>
  container.querySelector(
    `rect[data-table-index="${tableIndex}"][data-seat-index="${seatIndex}"]`,
  ) as SVGRectElement;

describe('SeatingPlanCanvas keyboard seat move', () => {
  const moveStudent = vi.fn(() => true);
  const onLockedSeatDrop = vi.fn();
  const onSeatHoverChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moves a student to another table via Enter grab and drop', () => {
    const { container } = renderCanvas({
      moveStudent,
      onSeatHoverChange,
      onLockedSeatDrop,
    });

    const sourceSeat = getSeatRect(container, 0, 0);
    expect(sourceSeat).toHaveAttribute('role', 'button');
    expect(sourceSeat.getAttribute('aria-label')).toMatch(/Ada Lovelace/);

    fireEvent.keyDown(sourceSeat, { key: 'Enter' });

    // Grab is reflected as origin state and announced for screen readers
    expect(getSeatRect(container, 0, 0)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const liveRegion = container.querySelector('[role="status"]');
    expect(liveRegion?.textContent).toMatch(/Ada Lovelace/);

    const targetSeat = getSeatRect(container, 1, 1);
    fireEvent.keyDown(targetSeat, { key: 'Enter' });

    expect(moveStudent).toHaveBeenCalledWith(0, 0, 1, 1);
    expect(getSeatRect(container, 0, 0)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('rejects locked target seats and keeps the grab active', () => {
    const isSeatLocked = (table: number, seat: number) =>
      table === 1 && seat === 0;
    const { container } = renderCanvas({
      moveStudent,
      isSeatLocked,
      onSeatHoverChange,
      onLockedSeatDrop,
    });

    fireEvent.keyDown(getSeatRect(container, 0, 0), { key: 'Enter' });
    fireEvent.keyDown(getSeatRect(container, 1, 0), { key: 'Enter' });

    expect(moveStudent).not.toHaveBeenCalled();
    expect(onLockedSeatDrop).toHaveBeenCalledWith({
      tableIndex: 1,
      seatIndex: 0,
      locked: true,
    });
    expect(getSeatRect(container, 0, 0)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('cancels an active grab with Escape', () => {
    const { container } = renderCanvas({ moveStudent, onSeatHoverChange });

    fireEvent.keyDown(getSeatRect(container, 0, 0), { key: 'Enter' });
    fireEvent.keyDown(getSeatRect(container, 1, 1), { key: 'Escape' });
    fireEvent.keyDown(getSeatRect(container, 1, 1), { key: 'Enter' });

    expect(moveStudent).not.toHaveBeenCalled();
    expect(getSeatRect(container, 0, 0)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('shows hover feedback on the focused seat while a grab is active', () => {
    const { container } = renderCanvas({ moveStudent, onSeatHoverChange });

    fireEvent.keyDown(getSeatRect(container, 0, 0), { key: 'Enter' });
    fireEvent.focus(getSeatRect(container, 1, 1));

    expect(onSeatHoverChange).toHaveBeenLastCalledWith({
      tableIndex: 1,
      seatIndex: 1,
      locked: false,
    });
  });
});
