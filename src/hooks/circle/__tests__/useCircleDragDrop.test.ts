// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Dragging in the circle: a press becomes a drag only once it travels, the
 * target is the nearest place as drawn, held places refuse, and Escape or a
 * cancelled pointer lets go without moving anyone.
 */
import '@testing-library/jest-dom/vitest';
import type React from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCircleDragDrop } from '../useCircleDragDrop';
import type { UseCircleDragDropParams } from '../useCircleDragDrop';
import type { CircleLayout, CircleStudentPosition } from '@/types/Circle';
import { createMockStudent } from '@/__tests__/utils';

vi.mock('@/utils/ui/toast', () => ({
  showToast: vi.fn(),
  TOAST_MESSAGES: { SEAT_LOCKED_DROP: 'toast:seatLocked' },
}));

const position = (id: string, x: number): CircleStudentPosition => ({
  student: createMockStudent({ id, name: `Student ${id}` }),
  angle: 0,
  x,
  y: 300,
  preservedNeighbors: [],
  lostNeighbors: [],
  newNeighbors: [],
});

const layout: CircleLayout = {
  students: [position('a', 100), position('b', 300), position('c', 500)],
  radius: { horizontal: 200, vertical: 200 },
  center: { x: 450, y: 300 },
  preservedNeighborhoods: 0,
  totalOriginalNeighborhoods: 0,
  newNeighborhoods: 0,
  preservationRate: 1,
  mode: 'preserve-neighbors',
  timestamp: 0,
  neighborhoodPairs: [],
};

// Drawn where the layout says, except that the view box is 1:1 with the
// screen: one view-box unit per pixel.
const slots = layout.students.map(({ x, y }) => ({ x, y }));

const press = (x: number, y = 300, pointerType = 'mouse') =>
  ({
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    pointerId: 1,
    pointerType,
    clientX: x,
    clientY: y,
  }) as unknown as React.PointerEvent<Element>;

const pointer = (type: string, x: number, y = 300) =>
  act(() => {
    window.dispatchEvent(
      Object.assign(new MouseEvent(type, { clientX: x, clientY: y }), {
        pointerId: 1,
      }),
    );
  });

let params: UseCircleDragDropParams;

beforeEach(() => {
  params = {
    layout,
    editable: true,
    slotPositions: slots,
    onStudentMove: vi.fn(),
    onMoved: vi.fn(),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

const renderDrag = (overrides: Partial<UseCircleDragDropParams> = {}) => {
  const hook = renderHook(() => useCircleDragDrop({ ...params, ...overrides }));
  // The circle's SVG, 900 × 600 on screen.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 900, height: 600 }) as DOMRect;
  (hook.result.current.svgRef as { current: SVGSVGElement | null }).current =
    svg;
  return hook;
};

describe('useCircleDragDrop', () => {
  it('starts idle', () => {
    const { result } = renderDrag();
    expect(result.current.dragState).toMatchObject({
      isDragging: false,
      draggedPosition: null,
      hoverPosition: null,
      pointer: null,
    });
  });

  it('turns a press into a drag only once it travels', () => {
    const { result } = renderDrag();
    act(() => result.current.handlePointerDown(press(100), 0, 'a'));
    expect(result.current.dragState.isDragging).toBe(false);

    pointer('pointermove', 102);
    expect(result.current.dragState.isDragging).toBe(false);

    pointer('pointermove', 120);
    expect(result.current.dragState).toMatchObject({
      isDragging: true,
      draggedPosition: 0,
      pointer: { x: 120, y: 300 },
    });

    // Released without a target: nobody moves.
    pointer('pointerup', 120);
    expect(result.current.dragState.isDragging).toBe(false);
    expect(params.onStudentMove).not.toHaveBeenCalled();
  });

  it('swaps with the nearest place as drawn', () => {
    const { result } = renderDrag();
    act(() => result.current.handlePointerDown(press(100), 0, 'a'));
    pointer('pointermove', 290);
    expect(result.current.dragState.hoverPosition).toBe(1);

    pointer('pointerup', 290);
    expect(params.onStudentMove).toHaveBeenCalledWith('a', 1);
    expect(params.onMoved).toHaveBeenCalledWith(0, 1);
  });

  it('never picks up a held student and refuses to drop on one', () => {
    const isPositionLocked = (index: number) => index === 1;
    const { result } = renderDrag({ isPositionLocked });

    act(() => result.current.handlePointerDown(press(300), 1, 'b'));
    pointer('pointermove', 400);
    expect(result.current.dragState.isDragging).toBe(false);
    pointer('pointerup', 400);

    act(() => result.current.handlePointerDown(press(100), 0, 'a'));
    pointer('pointermove', 295);
    expect(result.current.dragState).toMatchObject({
      hoverPosition: 1,
      hoverBlocked: true,
    });
    pointer('pointerup', 295);
    expect(params.onStudentMove).not.toHaveBeenCalled();
  });

  it('lets go on Escape and on a cancelled pointer', () => {
    const { result } = renderDrag();

    act(() => result.current.handlePointerDown(press(100), 0, 'a'));
    pointer('pointermove', 290);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.dragState.isDragging).toBe(false);
    pointer('pointerup', 290);
    expect(params.onStudentMove).not.toHaveBeenCalled();

    act(() => result.current.handlePointerDown(press(100), 0, 'a'));
    pointer('pointermove', 290);
    pointer('pointercancel', 290);
    expect(result.current.dragState.isDragging).toBe(false);
    expect(params.onStudentMove).not.toHaveBeenCalled();
  });

  it('does nothing while the circle is only shown', () => {
    const { result } = renderDrag({ editable: false });
    const event = press(100);
    act(() => result.current.handlePointerDown(event, 0, 'a'));
    pointer('pointermove', 290);
    expect(result.current.dragState.isDragging).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
