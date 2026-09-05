// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The layout tier decides whether a teacher sees the classroom canvas and the
 * options at the same time. It used to be one boolean at `lg`, which handed
 * every iPad in portrait the phone UI — floating button, full-screen sheet, no
 * sidebar. These tests pin the three tiers to the widths that produce them.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useIsPhone, useLayoutMode } from '../useLayoutMode';

const setWidth = (width: number): void => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  // The breakpoint store caches the width and only re-reads on resize.
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

afterEach(() => {
  setWidth(1024);
});

describe('useLayoutMode', () => {
  it.each([
    ['a phone', 390, 'phone'],
    ['a large phone one pixel short of md', 767, 'phone'],
    ['the md breakpoint itself', 768, 'tablet'],
    ['an iPad mini in portrait', 744, 'phone'],
    ['an iPad 10.9" in portrait', 820, 'tablet'],
    ['an iPad Pro 11" in portrait', 834, 'tablet'],
    ['one pixel short of lg', 1023, 'tablet'],
    // Contrary to what the assessment claimed, this one was never on the phone
    // path: `useBreakpointUp('lg')` is `width >= 1024`.
    ['an iPad Pro 12.9" in portrait', 1024, 'desktop'],
    ['an iPad in landscape', 1180, 'desktop'],
    ['a laptop', 1440, 'desktop'],
  ])('reports %s (%ipx) as %s', (_label, width, expected) => {
    setWidth(width);

    const { result } = renderHook(() => useLayoutMode());

    expect(result.current).toBe(expected);
  });

  it('follows a resize across the tier boundary', () => {
    setWidth(1440);
    const { result } = renderHook(() => useLayoutMode());
    expect(result.current).toBe('desktop');

    // Rotating an iPad from landscape to portrait is exactly this transition.
    setWidth(820);

    expect(result.current).toBe('tablet');
  });
});

describe('useIsPhone', () => {
  it('is true only below md', () => {
    setWidth(767);
    const { result, rerender } = renderHook(() => useIsPhone());
    expect(result.current).toBe(true);

    setWidth(768);
    rerender();

    expect(result.current).toBe(false);
  });
});
