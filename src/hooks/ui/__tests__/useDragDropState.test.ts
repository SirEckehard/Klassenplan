// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { useDragDropState } from '../../../hooks/ui/useDragDropState';
import type { DragSeatConfig } from '../../../hooks/ui/useDragDropState';
import type { Student } from '../../../types';

const createBaseConfig = (
  overrides: Partial<DragSeatConfig> = {},
): DragSeatConfig => ({
  x: 100,
  y: 200,
  tableIndex: 0,
  seatIndex: 0,
  seatWidth: 60,
  seatHeight: 60,
  appearance: {
    fill: '#ffffff',
    stroke: '#000000',
    text: '#111827',
  },
  flags: [],
  showFullName: false,
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

  it('stores drag preview, origin and hover on drag start', () => {
    const { result } = renderDragHook();

    act(() => {
      result.current.handleSeatDragStart(mockStudent, baseConfig);
    });

    expect(result.current.dragPreview).toMatchObject({
      student: mockStudent,
      x: baseConfig.x,
      y: baseConfig.y,
      seatWidth: baseConfig.seatWidth,
      seatHeight: baseConfig.seatHeight,
      appearance: baseConfig.appearance,
      flags: baseConfig.flags,
    });
    expect(result.current.dragOrigin).toEqual({
      tableIndex: baseConfig.tableIndex,
      seatIndex: baseConfig.seatIndex,
    });
    expect(result.current.dragHover).toEqual({
      tableIndex: baseConfig.tableIndex,
      seatIndex: baseConfig.seatIndex,
      locked: false,
    });
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
