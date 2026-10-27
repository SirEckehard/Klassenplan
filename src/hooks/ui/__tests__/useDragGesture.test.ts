// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DRAG_THRESHOLD_PX,
  useDragGesture,
  useTapGesture,
} from '../useDragGesture';

const press = (pointerType: string) =>
  ({
    pointerId: 7,
    pointerType,
    clientX: 0,
    clientY: 0,
  }) as unknown as React.PointerEvent;

const move = (type: string, x: number, pointerId = 7) =>
  act(() => {
    window.dispatchEvent(
      Object.assign(new MouseEvent(type, { clientX: x, clientY: 0 }), {
        pointerId,
      }),
    );
  });

const handlers = () => ({
  onStart: vi.fn(),
  onMove: vi.fn(),
  onDrop: vi.fn(),
  onCancel: vi.fn(),
});

describe('useDragGesture', () => {
  it('gives a finger more room than a mouse before a press is a drag', () => {
    const { result } = renderHook(() => useDragGesture());

    const mouse = handlers();
    act(() => result.current.begin(press('mouse'), mouse));
    move('pointermove', DRAG_THRESHOLD_PX.mouse - 1);
    expect(mouse.onStart).not.toHaveBeenCalled();
    move('pointermove', DRAG_THRESHOLD_PX.mouse);
    expect(mouse.onStart).toHaveBeenCalledWith({ x: 0, y: 0 });
    move('pointerup', DRAG_THRESHOLD_PX.mouse);
    expect(mouse.onDrop).toHaveBeenCalledTimes(1);

    const finger = handlers();
    act(() => result.current.begin(press('touch'), finger));
    move('pointermove', DRAG_THRESHOLD_PX.mouse + 1);
    expect(finger.onStart).not.toHaveBeenCalled();
    move('pointermove', DRAG_THRESHOLD_PX.touch);
    expect(finger.onStart).toHaveBeenCalledTimes(1);
  });

  it('treats a press that does not travel as a click, not a drop', () => {
    const { result } = renderHook(() => useDragGesture());
    const click = handlers();
    act(() => result.current.begin(press('mouse'), click));
    move('pointerup', 1);
    expect(click.onStart).not.toHaveBeenCalled();
    expect(click.onDrop).not.toHaveBeenCalled();
  });

  it('ignores other pointers and ends on Escape, a cancel or an unmount', () => {
    const { result, unmount } = renderHook(() => useDragGesture());

    const escaped = handlers();
    act(() => result.current.begin(press('mouse'), escaped));
    move('pointermove', 50, 8);
    expect(escaped.onStart).not.toHaveBeenCalled();
    move('pointermove', 50);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(escaped.onCancel).toHaveBeenCalledTimes(1);
    move('pointerup', 60);
    expect(escaped.onDrop).not.toHaveBeenCalled();

    const cancelled = handlers();
    act(() => result.current.begin(press('mouse'), cancelled));
    move('pointermove', 50);
    move('pointercancel', 50);
    expect(cancelled.onCancel).toHaveBeenCalledTimes(1);

    const leftBehind = handlers();
    act(() => result.current.begin(press('mouse'), leftBehind));
    move('pointermove', 50);
    unmount();
    expect(leftBehind.onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('useTapGesture', () => {
  it('acts on the release of a press that stayed put', () => {
    const { result } = renderHook(() => useTapGesture());
    const onTap = vi.fn();
    act(() => result.current(press('touch'), onTap));
    move('pointermove', DRAG_THRESHOLD_PX.touch - 1);
    expect(onTap).not.toHaveBeenCalled();
    move('pointerup', DRAG_THRESHOLD_PX.touch - 1);
    expect(onTap).toHaveBeenCalledTimes(1);
    move('pointerup', 0);
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('never acts on a press that travelled, even back to where it began', () => {
    const { result } = renderHook(() => useTapGesture());
    const onTap = vi.fn();
    act(() => result.current(press('mouse'), onTap));
    move('pointermove', DRAG_THRESHOLD_PX.mouse);
    move('pointermove', 0);
    move('pointerup', 0);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('ignores other pointers and acts on nothing after a cancel or an unmount', () => {
    const { result, unmount } = renderHook(() => useTapGesture());

    const cancelled = vi.fn();
    act(() => result.current(press('mouse'), cancelled));
    move('pointerup', 0, 8);
    expect(cancelled).not.toHaveBeenCalled();
    move('pointercancel', 0);
    move('pointerup', 0);
    expect(cancelled).not.toHaveBeenCalled();

    const leftBehind = vi.fn();
    act(() => result.current(press('mouse'), leftBehind));
    unmount();
    move('pointerup', 0);
    expect(leftBehind).not.toHaveBeenCalled();
  });
});
