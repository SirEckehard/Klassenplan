// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useCircleDragDrop } from '../useCircleDragDrop';
import type { UseCircleDragDropParams } from '../useCircleDragDrop';
import type {
  CircleLayout,
  CircleStudentPosition,
} from '../../../types/Circle';
import type { Student } from '../../../types';
import type React from 'react';

// Add vitest-dom matchers
import '@testing-library/jest-dom/vitest';

const circleCenter = { x: 450, y: 300 } as const;
const circleRadius = { horizontal: 200, vertical: 200 } as const;

const createPosition = (
  student: Student,
  angle: number,
): CircleStudentPosition => {
  const radians = (angle * Math.PI) / 180;
  return {
    student,
    angle,
    x: circleCenter.x + circleRadius.horizontal * Math.cos(radians),
    y: circleCenter.y + circleRadius.vertical * Math.sin(radians),
    preservedNeighbors: [],
    lostNeighbors: [],
    newNeighbors: [],
  };
};

const createEmptyPosition = (angle: number): CircleStudentPosition => {
  const radians = (angle * Math.PI) / 180;
  return {
    student: null as unknown as Student,
    angle,
    x: circleCenter.x + circleRadius.horizontal * Math.cos(radians),
    y: circleCenter.y + circleRadius.vertical * Math.sin(radians),
    preservedNeighbors: [],
    lostNeighbors: [],
    newNeighbors: [],
  };
};

const createMockPointerEvent = (): React.PointerEvent<Element> =>
  ({
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    pointerType: 'mouse',
  }) as unknown as React.PointerEvent<Element>;

describe('useCircleDragDrop', () => {
  let mockLayout: CircleLayout;
  let mockParams: UseCircleDragDropParams;

  const createMockStudent = (id: string, name: string): Student => ({
    id,
    name,
    gender: 'boy',
    restless: false,
    shy: false,
    concentrationIssues: false,
    needsFrontSeat: false,
  });

  beforeEach(() => {
    mockLayout = {
      center: circleCenter,
      radius: circleRadius,
      students: [
        createPosition(createMockStudent('1', 'Student 1'), 0),
        createPosition(createMockStudent('2', 'Student 2'), 120),
        createPosition(createMockStudent('3', 'Student 3'), 240),
      ],
      preservedNeighborhoods: 0,
      totalOriginalNeighborhoods: 0,
      newNeighborhoods: 0,
      preservationRate: 1,
      mode: 'preserve-neighbors',
      timestamp: Date.now(),
      neighborhoodPairs: [],
    };

    mockParams = {
      layout: mockLayout,
      editable: true,
      onStudentMove:
        vi.fn<NonNullable<UseCircleDragDropParams['onStudentMove']>>(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns correct interface', () => {
    const { result } = renderHook(() => useCircleDragDrop(mockParams));

    expect(result.current).toHaveProperty('dragState');
    expect(result.current).toHaveProperty('handlePointerDown');
    expect(result.current).toHaveProperty('svgRef');

    expect(typeof result.current.handlePointerDown).toBe('function');
    expect(result.current.svgRef.current).toBeNull(); // No SVG element attached yet
  });

  it('initializes with empty drag state', () => {
    const { result } = renderHook(() => useCircleDragDrop(mockParams));

    expect(result.current.dragState).toEqual({
      isDragging: false,
      draggedPosition: null,
      hoverPosition: null,
      dragPreview: null,
    });
  });

  it('does not start drag when not editable', () => {
    const nonEditableParams = { ...mockParams, editable: false };
    const { result } = renderHook(() => useCircleDragDrop(nonEditableParams));

    const mockEvent = createMockPointerEvent();

    act(() => {
      result.current.handlePointerDown(mockEvent, 0, 'student-1');
    });

    expect(result.current.dragState.isDragging).toBe(false);
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('does not start drag when no student at position', () => {
    const emptyLayout: CircleLayout = {
      ...mockLayout,
      students: [createEmptyPosition(0), createEmptyPosition(120)],
    };
    const paramsWithEmptyLayout = { ...mockParams, layout: emptyLayout };
    const { result } = renderHook(() =>
      useCircleDragDrop(paramsWithEmptyLayout),
    );

    const mockEvent = createMockPointerEvent();

    act(() => {
      result.current.handlePointerDown(mockEvent, 0, 'student-1');
    });

    expect(result.current.dragState.isDragging).toBe(false);
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('starts drag when conditions are met', () => {
    const { result } = renderHook(() => useCircleDragDrop(mockParams));

    const mockEvent = createMockPointerEvent();

    act(() => {
      result.current.handlePointerDown(mockEvent, 0, 'student-1');
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(result.current.dragState.isDragging).toBe(true);
    expect(result.current.dragState.draggedPosition).toBe(0);
  });

  it('provides stable svgRef across renders', () => {
    const { result, rerender } = renderHook(() =>
      useCircleDragDrop(mockParams),
    );

    const firstRef = result.current.svgRef;
    rerender();
    const secondRef = result.current.svgRef;

    expect(firstRef).toBe(secondRef);
  });

  it('handles multiple drag sessions', () => {
    const { result } = renderHook(() => useCircleDragDrop(mockParams));

    const mockEvent = createMockPointerEvent();

    // First drag session
    act(() => {
      result.current.handlePointerDown(mockEvent, 0, 'student-1');
    });

    expect(result.current.dragState.isDragging).toBe(true);
    expect(result.current.dragState.draggedPosition).toBe(0);

    // Simulate drag end by creating and dispatching a mock pointerup event
    act(() => {
      const mockPointerUpEvent = new Event('pointerup');
      window.dispatchEvent(mockPointerUpEvent);
    });

    expect(result.current.dragState.isDragging).toBe(false);
    expect(result.current.dragState.draggedPosition).toBeNull();

    // Second drag session
    act(() => {
      result.current.handlePointerDown(mockEvent, 1, 'student-2');
    });

    expect(result.current.dragState.isDragging).toBe(true);
    expect(result.current.dragState.draggedPosition).toBe(1);
  });

  it('cleans up listeners on unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    // Start a drag to create listeners
    const { result, unmount } = renderHook(() => useCircleDragDrop(mockParams));
    const mockEvent = createMockPointerEvent();

    act(() => {
      result.current.handlePointerDown(mockEvent, 0, 'student-1');
    });

    // Verify listeners were added
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'pointermove',
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'pointerup',
      expect.any(Function),
    );

    // Unmount should clean up
    unmount();

    // Should have called removeEventListener for cleanup
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'pointermove',
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'pointerup',
      expect.any(Function),
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('handles multiple concurrent hook instances independently', () => {
    const mockParams1: UseCircleDragDropParams = {
      ...mockParams,
      layout: mockLayout,
      onStudentMove:
        vi.fn<NonNullable<UseCircleDragDropParams['onStudentMove']>>(),
    };

    const mockLayout2: CircleLayout = {
      center: circleCenter,
      radius: circleRadius,
      students: [
        createPosition(createMockStudent('4', 'Student 4'), 0),
        createPosition(createMockStudent('5', 'Student 5'), 120),
        createPosition(createMockStudent('6', 'Student 6'), 240),
      ],
      preservedNeighborhoods: 0,
      totalOriginalNeighborhoods: 0,
      newNeighborhoods: 0,
      preservationRate: 1,
      mode: 'preserve-neighbors',
      timestamp: Date.now(),
      neighborhoodPairs: [],
    };

    const mockParams2: UseCircleDragDropParams = {
      layout: mockLayout2,
      editable: true,
      onStudentMove:
        vi.fn<NonNullable<UseCircleDragDropParams['onStudentMove']>>(),
    };

    const { result: result1 } = renderHook(() =>
      useCircleDragDrop(mockParams1),
    );
    const { result: result2 } = renderHook(() =>
      useCircleDragDrop(mockParams2),
    );

    const mockEvent1 = createMockPointerEvent();
    const mockEvent2 = createMockPointerEvent();

    // Start drag in both instances
    act(() => {
      result1.current.handlePointerDown(mockEvent1, 0, 'student-1');
    });

    act(() => {
      result2.current.handlePointerDown(mockEvent2, 0, 'student-4');
    });

    // Both should be dragging independently
    expect(result1.current.dragState.isDragging).toBe(true);
    expect(result1.current.dragState.draggedPosition).toBe(0);

    expect(result2.current.dragState.isDragging).toBe(true);
    expect(result2.current.dragState.draggedPosition).toBe(0);

    // Verify they don't interfere with each other
    expect(mockEvent1.preventDefault).toHaveBeenCalled();
    expect(mockEvent2.preventDefault).toHaveBeenCalled();

    // Verify both instances maintain independent state
    // Each instance has its own listeners and state management
    expect(result1.current.svgRef).not.toBe(result2.current.svgRef);

    // End both drags via window event (simulates real pointer up)
    act(() => {
      const mockPointerUpEvent = new Event('pointerup');
      window.dispatchEvent(mockPointerUpEvent);
    });

    // Both instances should have cleaned up independently
    expect(result1.current.dragState.isDragging).toBe(false);
    expect(result2.current.dragState.isDragging).toBe(false);

    // Verify callbacks were independent
    expect(mockParams1.onStudentMove).not.toHaveBeenCalled();
    expect(mockParams2.onStudentMove).not.toHaveBeenCalled();
  });
});
