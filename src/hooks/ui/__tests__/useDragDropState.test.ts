// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import {
  getSwapPreview,
  previewStudentAt,
  SWAP_PREVIEW_DWELL_MS,
  useDragDropState,
  useDwellKey,
} from '../../../hooks/ui/useDragDropState';
import type { DragSeatConfig } from '../../../hooks/ui/useDragDropState';
import type { Student } from '../../../types';

const createBaseConfig = (
  overrides: Partial<DragSeatConfig> = {},
): DragSeatConfig => ({
  x: 100,
  y: 200,
  pointerType: 'touch',
  tableIndex: 0,
  seatIndex: 0,
  appearance: {
    fill: '#ffffff',
    stroke: '#000000',
    text: '#111827',
  },
  nameDisplay: 'firstNameInitial',
  ...overrides,
});

const renderDragHook = () => renderHook(() => useDragDropState());

describe('useDragDropState', () => {
  let mockStudent: Student;
  let baseConfig: DragSeatConfig;

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    mockStudent = {
      id: 'student-1',
      name: 'Test Student',
      gender: 'boy',
      restless: false,
      shy: false,
      concentrationIssues: false,
      needsFrontSeat: false,
    };
    baseConfig = createBaseConfig();
  });

  it('exposes the expected interface', () => {
    const { result } = renderDragHook();

    expect(result.current.dragPreview).toBeNull();
    expect(result.current.dragOrigin).toBeNull();
    expect(result.current.dragHover).toBeNull();
    expect(result.current.lockedDropTarget).toBeNull();
    expect(typeof result.current.handleSeatDragStart).toBe('function');
    expect(typeof result.current.handleSeatDrag).toBe('function');
    expect(typeof result.current.handleSeatDragEnd).toBe('function');
    expect(typeof result.current.handleSeatHoverChange).toBe('function');
    expect(typeof result.current.handleLockedDrop).toBe('function');
  });

  it('initialises without an active drag', () => {
    const { result } = renderDragHook();

    expect(result.current.dragPreview).toBeNull();
    expect(result.current.dragOrigin).toBeNull();
    expect(result.current.dragHover).toBeNull();
  });

  it('stores drag preview and origin on drag start, with no target yet', () => {
    const { result } = renderDragHook();

    act(() => {
      result.current.handleSeatDragStart(mockStudent, baseConfig);
    });

    expect(result.current.dragPreview).toMatchObject({
      student: mockStudent,
      x: baseConfig.x,
      y: baseConfig.y,
      pointerType: 'touch',
      appearance: baseConfig.appearance,
    });
    expect(result.current.dragOrigin).toEqual({
      tableIndex: baseConfig.tableIndex,
      seatIndex: baseConfig.seatIndex,
    });
    // The seat a drag starts from is no target; the first move finds one.
    expect(result.current.dragHover).toBeNull();
  });

  it('updates preview coordinates while dragging', () => {
    const { result } = renderDragHook();

    act(() => {
      result.current.handleSeatDragStart(mockStudent, baseConfig);
    });

    act(() => {
      result.current.handleSeatDrag(150, 250);
    });

    expect(result.current.dragPreview).toMatchObject({
      x: 150,
      y: 250,
    });
  });

  it('ignores drag updates when no drag is active', () => {
    const { result } = renderDragHook();

    act(() => {
      result.current.handleSeatDrag(150, 250);
    });

    expect(result.current.dragPreview).toBeNull();
  });

  it('clears drag state on drag end', () => {
    const { result } = renderDragHook();

    act(() => {
      result.current.handleSeatDragStart(mockStudent, baseConfig);
    });

    act(() => {
      result.current.handleSeatDragEnd();
    });

    expect(result.current.dragPreview).toBeNull();
    expect(result.current.dragOrigin).toBeNull();
    expect(result.current.dragHover).toBeNull();
  });

  it('supports multiple drag sessions', () => {
    const { result } = renderDragHook();

    act(() => {
      result.current.handleSeatDragStart(mockStudent, baseConfig);
    });

    act(() => {
      result.current.handleSeatDragEnd();
    });

    const secondStudent: Student = {
      ...mockStudent,
      id: 'student-2',
      name: 'Second',
    };

    act(() => {
      result.current.handleSeatDragStart(
        secondStudent,
        createBaseConfig({ x: 320, y: 180, tableIndex: 2, seatIndex: 1 }),
      );
    });

    expect(result.current.dragPreview?.student).toBe(secondStudent);
    expect(result.current.dragOrigin).toEqual({ tableIndex: 2, seatIndex: 1 });
  });

  it('updates hover information explicitly', () => {
    const { result } = renderDragHook();

    const hover = { tableIndex: 3, seatIndex: 2, locked: true };

    act(() => {
      result.current.handleSeatHoverChange(hover);
    });

    expect(result.current.dragHover).toEqual(hover);

    act(() => {
      result.current.handleSeatHoverChange(null);
    });

    expect(result.current.dragHover).toBeNull();
  });

  it('tracks locked drop targets', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDragDropState());

    const lockedTarget = { tableIndex: 4, seatIndex: 5, locked: true };

    act(() => {
      result.current.handleLockedDrop(lockedTarget);
    });

    expect(result.current.lockedDropTarget).toMatchObject(lockedTarget);

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(result.current.lockedDropTarget).toBeNull();
    vi.useRealTimers();
  });
});

describe('getSwapPreview', () => {
  const anna = { id: 'a', name: 'Anna' } as Student;
  const ben = { id: 'b', name: 'Ben' } as Student;
  const seating = [[anna, ben], [null]];
  const origin = { tableIndex: 0, seatIndex: 0 };

  it('puts the dragged student on the target and its student on the origin', () => {
    const preview = getSwapPreview(seating, origin, {
      tableIndex: 0,
      seatIndex: 1,
      locked: false,
    });
    expect(preview).toEqual({
      origin,
      target: { tableIndex: 0, seatIndex: 1 },
      student: anna,
      partner: ben,
    });
    expect(previewStudentAt(preview, 0, 0)).toBe(ben);
    expect(previewStudentAt(preview, 0, 1)).toBe(anna);
    // Every other seat shows whoever sits there.
    expect(previewStudentAt(preview, 1, 0)).toBeUndefined();
    expect(previewStudentAt(null, 0, 0)).toBeUndefined();
  });

  it('leaves the origin empty when the target is', () => {
    const preview = getSwapPreview(seating, origin, {
      tableIndex: 1,
      seatIndex: 0,
      locked: false,
    });
    expect(preview?.partner).toBeNull();
    expect(previewStudentAt(preview, 0, 0)).toBeNull();
    expect(previewStudentAt(preview, 1, 0)).toBe(anna);
  });

  it('shows nothing for a held seat, the origin or no target', () => {
    expect(
      getSwapPreview(seating, origin, {
        tableIndex: 0,
        seatIndex: 1,
        locked: true,
      }),
    ).toBeNull();
    expect(
      getSwapPreview(seating, origin, { ...origin, locked: false }),
    ).toBeNull();
    expect(getSwapPreview(seating, origin, null)).toBeNull();
    expect(getSwapPreview(seating, null, null)).toBeNull();
  });
});

describe('useDwellKey', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('settles on a key only after it has rested there', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ key }: { key: string | null }) => useDwellKey(key),
      { initialProps: { key: null as string | null } },
    );

    rerender({ key: 'a' });
    expect(result.current).toBeNull();
    act(() => {
      vi.advanceTimersByTime(SWAP_PREVIEW_DWELL_MS - 1);
    });
    expect(result.current).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('a');

    // Passing on to the next seat lets go at once and waits again.
    rerender({ key: 'b' });
    expect(result.current).toBeNull();
    act(() => {
      vi.advanceTimersByTime(SWAP_PREVIEW_DWELL_MS);
    });
    expect(result.current).toBe('b');

    rerender({ key: null });
    expect(result.current).toBeNull();
  });

  it('makes a key that comes back wait anew', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ key }: { key: string | null }) => useDwellKey(key),
      { initialProps: { key: 'a' as string | null } },
    );
    act(() => {
      vi.advanceTimersByTime(SWAP_PREVIEW_DWELL_MS);
    });
    expect(result.current).toBe('a');

    rerender({ key: null });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    rerender({ key: 'a' });
    expect(result.current).toBeNull();
  });
});
