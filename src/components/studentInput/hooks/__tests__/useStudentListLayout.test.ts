// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudentListLayout } from '@/components/studentInput/hooks/useStudentListLayout';

const VIEWPORT_HEIGHT = 800;

/** An element that reports a fixed viewport position, the only input the hint needs. */
const elementAt = <T extends HTMLElement>(tag: string, top: number): T => {
  const element = document.createElement(tag) as T;
  element.getBoundingClientRect = () =>
    ({ top, bottom: top + 40, height: 40 }) as DOMRect;
  element.scrollIntoView = vi.fn();
  return element;
};

const renderLayout = (isMobile = true) =>
  renderHook(() =>
    useStudentListLayout({ isMobile, studentCount: 24, recalcKey: 0 }),
  );

/** Places both anchors and lets the scroll listener's debounce elapse. */
const place = (
  result: { current: ReturnType<typeof useStudentListLayout> },
  { proceedTop, listTop }: { proceedTop: number; listTop: number },
) => {
  act(() => {
    result.current.proceedButtonRef.current = elementAt<HTMLButtonElement>(
      'button',
      proceedTop,
    );
    result.current.listTopRef.current = elementAt<HTMLDivElement>(
      'div',
      listTop,
    );
    window.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(150);
  });
};

describe('useStudentListLayout scroll hint', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.innerHeight = VIEWPORT_HEIGHT;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays silent at lg and up, where the list has its own scroll container', () => {
    const { result } = renderLayout(false);

    place(result, { proceedTop: 2000, listTop: -1500 });

    expect(result.current.scrollHint).toBeNull();
  });

  it('points down while the action row is still out of reach', () => {
    const { result } = renderLayout();

    place(result, { proceedTop: 2000, listTop: 0 });

    expect(result.current.scrollHint).toBe('down');
  });

  it('points back up once the action row is reached and the top is far away', () => {
    const { result } = renderLayout();

    place(result, { proceedTop: 400, listTop: -1500 });

    expect(result.current.scrollHint).toBe('up');
  });

  it('shows nothing while both ends of the list are within reach', () => {
    const { result } = renderLayout();

    place(result, { proceedTop: 400, listTop: -20 });

    expect(result.current.scrollHint).toBeNull();
  });

  it('scrolls to the action row when pointing down', () => {
    const { result } = renderLayout();

    place(result, { proceedTop: 2000, listTop: 0 });
    act(() => result.current.handleScrollHint());

    expect(
      result.current.proceedButtonRef.current?.scrollIntoView,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ block: 'center', behavior: 'smooth' }),
    );
    expect(
      result.current.listTopRef.current?.scrollIntoView,
    ).not.toHaveBeenCalled();
  });

  it('scrolls to the top of the step when pointing up', () => {
    const { result } = renderLayout();

    place(result, { proceedTop: 400, listTop: -1500 });
    act(() => result.current.handleScrollHint());

    expect(
      result.current.listTopRef.current?.scrollIntoView,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ block: 'start', behavior: 'smooth' }),
    );
  });
});
