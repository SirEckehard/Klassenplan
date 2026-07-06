// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePanZoom } from '../ui/usePanZoom';
import type { PointerEvent as ReactPointerEvent } from 'react';

type Handlers = ReturnType<typeof usePanZoom>['pointerHandlers'];

function fakePointerEvent(
  pointerId: number,
  clientX: number,
  clientY: number,
): ReactPointerEvent<HTMLDivElement> {
  return {
    pointerId,
    clientX,
    clientY,
    currentTarget: {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      hasPointerCapture: vi.fn().mockReturnValue(false),
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    },
  } as unknown as ReactPointerEvent<HTMLDivElement>;
}

describe('usePanZoom', () => {
  let zoom: number;
  let setZoom: ReturnType<typeof vi.fn<(value: number) => void>>;

  beforeEach(() => {
    zoom = 1;
    setZoom = vi.fn<(value: number) => void>((value) => {
      zoom = value;
    });
  });

  it('clamps setZoomLevel to min/max and resets pan at fit zoom', () => {
    const { result } = renderHook(() =>
      usePanZoom({ zoom, setZoom, minZoom: 0.5, maxZoom: 3 }),
    );

    act(() => result.current.setZoomLevel(10));
    expect(setZoom).toHaveBeenLastCalledWith(3);

    act(() => result.current.setZoomLevel(0.1));
    expect(setZoom).toHaveBeenLastCalledWith(0.5);
    // Zoom ≤ 1 recentres the pan offset
    expect(result.current.pan).toEqual({ x: 0, y: 0 });
  });

  it('reset returns to 100% and recentres', () => {
    const { result } = renderHook(() =>
      usePanZoom({ zoom: 2, setZoom, minZoom: 0.5, maxZoom: 3 }),
    );

    act(() => result.current.reset());
    expect(setZoom).toHaveBeenLastCalledWith(1);
    expect(result.current.pan).toEqual({ x: 0, y: 0 });
  });

  it('exposes canPan only when zoomed in', () => {
    const { result, rerender } = renderHook(
      ({ z }: { z: number }) =>
        usePanZoom({ zoom: z, setZoom, minZoom: 0.5, maxZoom: 3 }),
      { initialProps: { z: 1 } },
    );
    expect(result.current.canPan).toBe(false);
    rerender({ z: 2 });
    expect(result.current.canPan).toBe(true);
  });

  it('pans by the pointer delta while zoomed in', () => {
    const { result } = renderHook(() =>
      usePanZoom({ zoom: 2, setZoom, minZoom: 0.5, maxZoom: 3 }),
    );
    const handlers: Handlers = result.current.pointerHandlers;

    act(() => {
      handlers.onPointerDown(fakePointerEvent(1, 100, 100));
      handlers.onPointerMove(fakePointerEvent(1, 130, 80));
    });
    expect(result.current.pan).toEqual({ x: 30, y: -20 });

    act(() => {
      handlers.onPointerUp(fakePointerEvent(1, 130, 80));
      // After releasing, moves without an active gesture change nothing.
      handlers.onPointerMove(fakePointerEvent(1, 200, 200));
    });
    expect(result.current.pan).toEqual({ x: 30, y: -20 });
  });

  it('does not pan at fit zoom (zoom = 1)', () => {
    const { result } = renderHook(() =>
      usePanZoom({ zoom: 1, setZoom, minZoom: 0.5, maxZoom: 3 }),
    );
    const handlers: Handlers = result.current.pointerHandlers;

    act(() => {
      handlers.onPointerDown(fakePointerEvent(1, 100, 100));
      handlers.onPointerMove(fakePointerEvent(1, 150, 150));
    });
    expect(result.current.pan).toEqual({ x: 0, y: 0 });
  });

  it('pinch zoom scales with the finger distance and anchors at the midpoint', () => {
    const { result } = renderHook(() =>
      usePanZoom({ zoom: 1, setZoom, minZoom: 0.5, maxZoom: 3 }),
    );
    const handlers: Handlers = result.current.pointerHandlers;

    act(() => {
      // Two fingers 100px apart, centred on the container centre (400, 300).
      handlers.onPointerDown(fakePointerEvent(1, 350, 300));
      handlers.onPointerDown(fakePointerEvent(2, 450, 300));
      // Spread to 200px → zoom doubles.
      handlers.onPointerMove(fakePointerEvent(2, 550, 300));
    });

    expect(setZoom).toHaveBeenLastCalledWith(2);
    // Anchor math: startMid == container centre and startPan == 0, so the only
    // pan contribution is the midpoint shift ((350+550)/2 - 400 = 50).
    expect(result.current.pan).toEqual({ x: 50, y: 0 });
  });

  it('clamps pinch zoom to maxZoom', () => {
    const { result } = renderHook(() =>
      usePanZoom({ zoom: 1, setZoom, minZoom: 0.5, maxZoom: 3 }),
    );
    const handlers: Handlers = result.current.pointerHandlers;

    act(() => {
      handlers.onPointerDown(fakePointerEvent(1, 390, 300));
      handlers.onPointerDown(fakePointerEvent(2, 410, 300));
      // 20px → 800px would be zoom 40; must clamp to 3.
      handlers.onPointerMove(fakePointerEvent(2, 1190, 300));
    });

    expect(setZoom).toHaveBeenLastCalledWith(3);
  });
});
