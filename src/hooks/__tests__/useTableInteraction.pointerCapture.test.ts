// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useTableInteraction from '@/hooks/useTableInteraction';
import { CLASSROOM_HEIGHT, CLASSROOM_WIDTH } from '@/utils';

/**
 * A canvas that captures pointers the way a browser does: only an active
 * pointer can be captured or released, and a pointer stops being active — and
 * loses its capture — when the finger lifts. A mouse never stops; a finger
 * does, which is why the room only broke on touch screens.
 */
function createCanvas() {
  const active = new Set<number>();
  const held = new Set<number>();
  const notFound = () =>
    new DOMException(
      "Failed to execute 'releasePointerCapture' on 'Element': No active pointer with the given id is found.",
      'NotFoundError',
    );
  // A real element, so the hook can measure and observe it; only the capture
  // methods are the browser's rules written out.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  Object.assign(svg, {
    setPointerCapture: vi.fn((pointerId: number) => {
      if (!active.has(pointerId)) throw notFound();
      held.add(pointerId);
    }),
    releasePointerCapture: vi.fn((pointerId: number) => {
      if (!active.has(pointerId)) throw notFound();
      held.delete(pointerId);
    }),
    hasPointerCapture: vi.fn((pointerId: number) => held.has(pointerId)),
  });
  return {
    svg,
    press: (pointerId: number) => active.add(pointerId),
    lift: (pointerId: number) => {
      active.delete(pointerId);
      held.delete(pointerId);
    },
  };
}

const tablePress = (pointerId: number, svg: SVGSVGElement) =>
  ({
    pointerId,
    pointerType: 'touch',
    currentTarget: { ownerSVGElement: svg },
  }) as unknown as React.PointerEvent<SVGGElement>;

const renderInteraction = (svg: SVGSVGElement) =>
  renderHook(() =>
    useTableInteraction({
      sceneTables: [],
      sceneFeatures: [],
      selectedFeatureIds: [],
      setSceneFeatures: vi.fn(),
      updateSceneTables: vi.fn(),
      runSceneTransaction: vi.fn(),
      snapshot: vi.fn(),
      commitScene: vi.fn(),
      setSelectedTableIds: vi.fn(),
      snapToGrid: true,
      classroomWidth: CLASSROOM_WIDTH,
      classroomHeight: CLASSROOM_HEIGHT,
      canvasWidth: CLASSROOM_WIDTH,
      canvasRef: { current: svg },
      alignmentGuidesEnabled: false,
      setActiveAlignmentGuides: vi.fn(),
    }),
  );

describe('useTableInteraction – pointer capture', () => {
  it('passes over a finger that lifted before the clean-up came', () => {
    // A table tapped, then the paste menu opened by a long press on the
    // floor: the menu clears the selection with the tap's pointer id.
    const canvas = createCanvas();
    const { result } = renderInteraction(canvas.svg);

    canvas.press(7);
    act(() => result.current.startTablePointerDrag(tablePress(7, canvas.svg)));
    canvas.lift(7);

    expect(() =>
      act(() => result.current.cancelSelectionInteraction()),
    ).not.toThrow();
    expect(canvas.svg.releasePointerCapture).not.toHaveBeenCalled();
  });

  it('lets go of a pointer the canvas still holds, once', () => {
    const canvas = createCanvas();
    const { result } = renderInteraction(canvas.svg);

    canvas.press(3);
    act(() => result.current.startTablePointerDrag(tablePress(3, canvas.svg)));
    act(() => result.current.releaseTablePointerCapture(3));
    act(() => result.current.releaseTablePointerCapture(3));

    expect(canvas.svg.releasePointerCapture).toHaveBeenCalledTimes(1);
    expect(canvas.svg.releasePointerCapture).toHaveBeenCalledWith(3);
  });

  it('forgets a released pointer, so a later clean-up has nothing to do', () => {
    const canvas = createCanvas();
    const { result } = renderInteraction(canvas.svg);

    canvas.press(4);
    act(() => result.current.startTablePointerDrag(tablePress(4, canvas.svg)));
    act(() => result.current.releaseTablePointerCapture(4));
    canvas.lift(4);
    act(() => result.current.cancelSelectionInteraction());

    expect(canvas.svg.hasPointerCapture).toHaveBeenCalledTimes(1);
  });
});
