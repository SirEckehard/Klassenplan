// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook, act } from '@testing-library/react';
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import {
  useCanvasInteraction,
  type UseCanvasInteractionParams,
} from '../useCanvasInteraction';
import type { ClassroomTable } from '../../../types';

// Add vitest-dom matchers
import '@testing-library/jest-dom/vitest';

describe('useCanvasInteraction', () => {
  let mockSceneTables: ClassroomTable[];
  let mockClipboard: ClassroomTable[] | null;
  let mockToSceneCoordinates: Mock<UseCanvasInteractionParams['toSceneCoordinates']>;
  let mockApplySelectionForTable: Mock<UseCanvasInteractionParams['applySelectionForTable']>;
  let mockOpenTableContextMenu: Mock<UseCanvasInteractionParams['openTableContextMenu']>;
  let mockOpenCanvasContextMenu: Mock<UseCanvasInteractionParams['openCanvasContextMenu']>;
  let mockCloseTableContextMenu: Mock<UseCanvasInteractionParams['closeTableContextMenu']>;
  let mockCloseCanvasContextMenu: Mock<UseCanvasInteractionParams['closeCanvasContextMenu']>;
  let mockStartTablePointerDrag: Mock<UseCanvasInteractionParams['startTablePointerDrag']>;
  let mockReleaseTablePointerCapture: Mock<UseCanvasInteractionParams['releaseTablePointerCapture']>;
  let mockCancelSelectionInteraction: Mock<UseCanvasInteractionParams['cancelSelectionInteraction']>;
  let mockInitializeDragFromSelection: Mock<UseCanvasInteractionParams['initializeDragFromSelection']>;
  let mockUpdateDragSelection: Mock<UseCanvasInteractionParams['updateDragSelection']>;
  let mockFinalizeDragInteraction: Mock<UseCanvasInteractionParams['finalizeDragInteraction']>;
  let mockSetSelectedTableIds: Mock<UseCanvasInteractionParams['setSelectedTableIds']>;
  let mockClearSelection: Mock<UseCanvasInteractionParams['clearSelection']>;

  const createMockTable = (index: number): ClassroomTable => ({
    x: 100 + index * 50,
    y: 100 + index * 30,
    width: 130,
    height: 120,
    seatCount: 4,
    rotation: 0,
    zIndex: index,
    locked: false,
    templateType: 'group4',
  });

  const createMockPointerEvent = (
    overrides: Partial<React.PointerEvent<any>> = {},
  ): React.PointerEvent<any> =>
    ({
      pointerId: 1,
      clientX: 200,
      clientY: 300,
      pointerType: 'mouse',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      button: 0,
      target: mockSVGElement,
      currentTarget: mockSVGElement,
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
      nativeEvent: { type: 'pointerup' },
      ...overrides,
    }) as any;

  const mockSVGElement = {
    ownerSVGElement: null,
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    getBoundingClientRect: vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 900,
      height: 600,
      right: 900,
      bottom: 600,
    }),
  } as any;

  const mockTableElement = {
    ownerSVGElement: mockSVGElement,
    setPointerCapture: vi.fn(),
  } as any;

  beforeEach(() => {
    mockSceneTables = [createMockTable(0), createMockTable(1)];
    mockClipboard = null;

    mockToSceneCoordinates = vi
      .fn()
      .mockImplementation(
        (_svg: SVGSVGElement, clientX: number, clientY: number) => ({
          x: clientX,
          y: clientY,
        }),
      );
    mockApplySelectionForTable = vi.fn().mockReturnValue([0]);
    mockOpenTableContextMenu = vi.fn();
    mockOpenCanvasContextMenu = vi.fn();
    mockCloseTableContextMenu = vi.fn();
    mockCloseCanvasContextMenu = vi.fn();
    mockStartTablePointerDrag = vi.fn();
    mockReleaseTablePointerCapture = vi.fn();
    mockCancelSelectionInteraction = vi.fn();
    mockInitializeDragFromSelection = vi.fn();
    mockUpdateDragSelection = vi.fn();
    mockFinalizeDragInteraction = vi.fn();
    mockSetSelectedTableIds = vi.fn();
    mockClearSelection = vi.fn();

    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const getHookResult = () =>
    renderHook(() =>
      useCanvasInteraction({
        sceneTables: mockSceneTables,
        clipboard: mockClipboard,
        classroomWidth: 900,
        classroomHeight: 600,
        toSceneCoordinates: mockToSceneCoordinates,
        setSelectedTableIds: mockSetSelectedTableIds,
        clearSelection: mockClearSelection,
        applySelectionForTable: mockApplySelectionForTable,
        openTableContextMenu: mockOpenTableContextMenu,
        openCanvasContextMenu: mockOpenCanvasContextMenu,
        closeTableContextMenu: mockCloseTableContextMenu,
        closeCanvasContextMenu: mockCloseCanvasContextMenu,
        startTablePointerDrag: mockStartTablePointerDrag,
        releaseTablePointerCapture: mockReleaseTablePointerCapture,
        cancelSelectionInteraction: mockCancelSelectionInteraction,
        initializeDragFromSelection: mockInitializeDragFromSelection,
        updateDragSelection: mockUpdateDragSelection,
        finalizeDragInteraction: mockFinalizeDragInteraction,
      }),
    );

  it('returns correct interface functions', () => {
    const { result } = getHookResult();

    expect(result.current).toHaveProperty('handleCanvasPointerMove');
    expect(result.current).toHaveProperty('handleCanvasPointerUp');
    expect(result.current).toHaveProperty('beginSelectionWithLongPress');
    expect(result.current).toHaveProperty('handleTablePointerDown');
    expect(result.current).toHaveProperty('selectionBox');

    expect(typeof result.current.handleCanvasPointerMove).toBe('function');
    expect(typeof result.current.handleCanvasPointerUp).toBe('function');
    expect(typeof result.current.beginSelectionWithLongPress).toBe('function');
    expect(typeof result.current.handleTablePointerDown).toBe('function');
  });

  describe('beginSelectionWithLongPress', () => {
    it('initialises marquee selection on background press', () => {
      const { result } = getHookResult();

      const pointerEvent = createMockPointerEvent({
        pointerType: 'mouse',
      });

      act(() => {
        result.current.beginSelectionWithLongPress(pointerEvent);
      });

      expect(mockClearSelection).toHaveBeenCalled();
      expect(result.current.selectionBox).toEqual({
        x: 200,
        y: 300,
        width: 0,
        height: 0,
      });
    });

    it('skips marquee selection when event target differs from canvas', () => {
      const childTarget = { id: 'child' } as unknown as SVGElement;
      const { result } = getHookResult();

      const pointerEvent = createMockPointerEvent({
        target: childTarget,
        currentTarget: mockSVGElement,
      });

      act(() => {
        result.current.beginSelectionWithLongPress(pointerEvent);
      });

      expect(mockClearSelection).not.toHaveBeenCalled();
      expect(result.current.selectionBox).toBeNull();
    });
  });

  describe('handleTablePointerDown', () => {
    it('handles table pointer down correctly', () => {
      const { result } = getHookResult();
      const pointerEvent = createMockPointerEvent({
        currentTarget: mockTableElement,
        target: mockTableElement,
      });

      act(() => {
        result.current.handleTablePointerDown(pointerEvent, 0);
      });

      expect(mockCloseTableContextMenu).toHaveBeenCalled();
      expect(mockCloseCanvasContextMenu).toHaveBeenCalled();
      expect(pointerEvent.stopPropagation).toHaveBeenCalled();
      expect(pointerEvent.preventDefault).toHaveBeenCalled();
      expect(mockStartTablePointerDrag).toHaveBeenCalledWith(pointerEvent);
      expect(mockToSceneCoordinates).toHaveBeenCalledWith(
        mockSVGElement,
        200,
        300,
      );
    });

    it('ignores locked tables', () => {
      mockSceneTables[0].locked = true;
      const { result } = getHookResult();
      const pointerEvent = createMockPointerEvent();

      act(() => {
        result.current.handleTablePointerDown(pointerEvent, 0);
      });

      expect(mockStartTablePointerDrag).not.toHaveBeenCalled();
    });

    it('detects multi-selection modifiers', () => {
      const { result } = getHookResult();
      const pointerEvent = createMockPointerEvent({
        shiftKey: true,
        currentTarget: mockTableElement,
        target: mockTableElement,
      });

      act(() => {
        result.current.handleTablePointerDown(pointerEvent, 0);
      });

      expect(mockStartTablePointerDrag).toHaveBeenCalled();
    });

    it('triggers long press after delay', () => {
      const { result } = getHookResult();
      const pointerEvent = createMockPointerEvent({
        currentTarget: mockTableElement,
        target: mockTableElement,
        pointerType: 'touch',
      });

      act(() => {
        result.current.handleTablePointerDown(pointerEvent, 0);
      });

      // Fast-forward time to trigger long press
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockApplySelectionForTable).toHaveBeenCalledWith(0, false);
      expect(mockOpenTableContextMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          tableIndex: 0,
          clientX: 200,
          clientY: 300,
          pointerType: 'touch',
          trigger: 'longpress',
        }),
      );
      expect(mockReleaseTablePointerCapture).toHaveBeenCalledWith(1);
    });

    it('does not trigger long press for mouse pointer', () => {
      const { result } = getHookResult();
      const pointerEvent = createMockPointerEvent({
        currentTarget: mockTableElement,
        target: mockTableElement,
        pointerType: 'mouse',
      });

      act(() => {
        result.current.handleTablePointerDown(pointerEvent, 0);
      });

      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(mockOpenTableContextMenu).not.toHaveBeenCalled();
    });
  });

  describe('handleCanvasPointerMove', () => {
    it('updates pending press position', () => {
      const { result } = getHookResult();

      // First, start a table pointer down to create pending press
      const initialEvent = createMockPointerEvent({
        pointerId: 1,
        currentTarget: mockTableElement,
        target: mockTableElement,
      });

      act(() => {
        result.current.handleTablePointerDown(initialEvent, 0);
      });

      // Then move pointer
      const moveEvent = createMockPointerEvent({
        pointerId: 1,
        clientX: 250,
        clientY: 350,
        currentTarget: mockSVGElement,
      });

      act(() => {
        result.current.handleCanvasPointerMove(moveEvent);
      });

      expect(mockToSceneCoordinates).toHaveBeenCalledWith(
        mockSVGElement,
        250,
        350,
      );
    });

    it('starts drag when distance threshold exceeded', () => {
      mockToSceneCoordinates
        .mockReturnValueOnce({ x: 100, y: 150 }) // Initial position
        .mockReturnValueOnce({ x: 110, y: 150 }); // Moved position (10px distance > 6px threshold)

      const { result } = getHookResult();

      // Start table pointer down
      const initialEvent = createMockPointerEvent({
        pointerId: 1,
        currentTarget: mockTableElement,
        target: mockTableElement,
      });

      act(() => {
        result.current.handleTablePointerDown(initialEvent, 0);
      });

      // Move pointer beyond threshold
      const moveEvent = createMockPointerEvent({
        pointerId: 1,
        currentTarget: mockSVGElement,
      });

      act(() => {
        result.current.handleCanvasPointerMove(moveEvent);
      });

      expect(mockApplySelectionForTable).toHaveBeenCalledWith(0, false);
      expect(mockInitializeDragFromSelection).toHaveBeenCalledWith([0], {
        x: 100,
        y: 150,
      });
      expect(mockUpdateDragSelection).toHaveBeenCalledWith({
        x: 110,
        y: 150,
      });
    });

    it('handles canvas long press movement', () => {
      mockClipboard = [createMockTable(0)];
      const { result } = getHookResult();

      // Start canvas long press
      const canvasEvent = createMockPointerEvent({
        target: mockSVGElement,
        currentTarget: mockSVGElement,
        pointerType: 'touch',
        pointerId: 2,
      });

      act(() => {
        result.current.beginSelectionWithLongPress(canvasEvent);
      });

      // Move canvas pointer
      const moveEvent = createMockPointerEvent({
        pointerId: 2,
        clientX: 250,
        clientY: 350,
        currentTarget: mockSVGElement,
      });

      act(() => {
        result.current.handleCanvasPointerMove(moveEvent);
      });

      expect(mockToSceneCoordinates).toHaveBeenCalled();
    });

    it('updates selection state while dragging selection box', () => {
      const { result } = getHookResult();
      const startEvent = createMockPointerEvent({
        pointerId: 5,
        clientX: 50,
        clientY: 50,
      });

      act(() => {
        result.current.beginSelectionWithLongPress(startEvent);
      });

      const moveEvent = createMockPointerEvent({
        pointerId: 5,
        clientX: 350,
        clientY: 260,
      });

      act(() => {
        result.current.handleCanvasPointerMove(moveEvent);
      });

      expect(mockSetSelectedTableIds).toHaveBeenLastCalledWith([0, 1]);
      expect(result.current.selectionBox).toEqual({
        x: 50,
        y: 50,
        width: 300,
        height: 210,
      });
    });
  });

  describe('handleCanvasPointerUp', () => {
    it('applies selection on pointer up', () => {
      const { result } = getHookResult();

      // Start table pointer down
      const initialEvent = createMockPointerEvent({
        pointerId: 1,
        currentTarget: mockTableElement,
        target: mockTableElement,
      });

      act(() => {
        result.current.handleTablePointerDown(initialEvent, 0);
      });

      // Pointer up
      const upEvent = createMockPointerEvent({
        pointerId: 1,
      });

      act(() => {
        result.current.handleCanvasPointerUp(upEvent);
      });

      expect(mockApplySelectionForTable).toHaveBeenCalledWith(0, false);
    });

    it('clears canvas pending press', () => {
      mockClipboard = [createMockTable(0)];
      const { result } = getHookResult();

      // Start canvas long press
      const canvasEvent = createMockPointerEvent({
        target: mockSVGElement,
        currentTarget: mockSVGElement,
        pointerType: 'touch',
        pointerId: 2,
      });

      act(() => {
        result.current.beginSelectionWithLongPress(canvasEvent);
      });

      // Pointer up
      const upEvent = createMockPointerEvent({
        pointerId: 2,
      });

      act(() => {
        result.current.handleCanvasPointerUp(upEvent);
      });

      // Should not crash or cause issues
      expect(mockApplySelectionForTable).not.toHaveBeenCalled();
    });

    it('finalizes drag interaction when drag was active', () => {
      const { result } = getHookResult();

      const pointerDownEvent = createMockPointerEvent({
        pointerId: 3,
        currentTarget: mockTableElement,
        target: mockTableElement,
      });

      act(() => {
        result.current.handleTablePointerDown(pointerDownEvent, 0);
      });

      const moveEvent = createMockPointerEvent({
        pointerId: 3,
        clientX: 260,
        clientY: 360,
        currentTarget: mockSVGElement,
      });

      act(() => {
        result.current.handleCanvasPointerMove(moveEvent);
      });

      const upEvent = createMockPointerEvent({
        pointerId: 3,
      });

      act(() => {
        result.current.handleCanvasPointerUp(upEvent);
      });

      expect(mockFinalizeDragInteraction).toHaveBeenCalled();
    });

    it('finalizes drag interaction on pointer cancel', () => {
      const { result } = getHookResult();

      const pointerDownEvent = createMockPointerEvent({
        pointerId: 4,
        currentTarget: mockTableElement,
        target: mockTableElement,
      });

      act(() => {
        result.current.handleTablePointerDown(pointerDownEvent, 0);
      });

      const moveEvent = createMockPointerEvent({
        pointerId: 4,
        clientX: 250,
        clientY: 260,
        currentTarget: mockSVGElement,
      });

      act(() => {
        result.current.handleCanvasPointerMove(moveEvent);
      });

      const cancelEvent = createMockPointerEvent({
        pointerId: 4,
        nativeEvent: { type: 'pointercancel' } as PointerEvent,
      });

      act(() => {
        result.current.handleCanvasPointerUp(cancelEvent);
      });

      expect(mockFinalizeDragInteraction).toHaveBeenCalled();
    });
  });

  describe('long press detection', () => {
    it('triggers canvas context menu after long press', () => {
      mockClipboard = [createMockTable(0)];
      const { result } = getHookResult();

      const canvasEvent = createMockPointerEvent({
        target: mockSVGElement,
        currentTarget: mockSVGElement,
        pointerType: 'touch',
      });

      act(() => {
        result.current.beginSelectionWithLongPress(canvasEvent);
      });

      // Fast-forward time to trigger long press
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockCancelSelectionInteraction).toHaveBeenCalled();
      expect(mockCloseTableContextMenu).toHaveBeenCalled();
      expect(mockOpenCanvasContextMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          clientX: 200,
          clientY: 300,
          sceneX: 200,
          sceneY: 300,
          pointerType: 'touch',
          trigger: 'longpress',
        }),
      );
    });

    it('does not trigger canvas context menu without clipboard', () => {
      mockClipboard = null;
      const { result } = getHookResult();

      const canvasEvent = createMockPointerEvent({
        target: mockSVGElement,
        currentTarget: mockSVGElement,
        pointerType: 'touch',
      });

      act(() => {
        result.current.beginSelectionWithLongPress(canvasEvent);
      });

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockOpenCanvasContextMenu).not.toHaveBeenCalled();
    });

    it('ignores long press with mouse pointer', () => {
      mockClipboard = [createMockTable(0)];
      const { result } = getHookResult();

      const canvasEvent = createMockPointerEvent({
        target: mockSVGElement,
        currentTarget: mockSVGElement,
        pointerType: 'mouse',
      });

      act(() => {
        result.current.beginSelectionWithLongPress(canvasEvent);
      });

      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(mockOpenCanvasContextMenu).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('cleans up timers on unmount', () => {
      const { result, unmount } = getHookResult();

      // Start some interactions
      const pointerEvent = createMockPointerEvent({
        currentTarget: mockTableElement,
        target: mockTableElement,
      });

      act(() => {
        result.current.handleTablePointerDown(pointerEvent, 0);
      });

      // Unmount should not cause timer leaks
      unmount();

      // Advance timers to ensure no callbacks fire
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // No context menu should open after unmount
      expect(mockOpenTableContextMenu).not.toHaveBeenCalled();
    });
  });
});
