// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it, vi } from 'vitest';
import { revealInScroller } from '../scroll';

/** A box with the given edges, as `getBoundingClientRect` reports them. */
const box = (top: number, bottom: number) =>
  ({ getBoundingClientRect: () => ({ top, bottom }) }) as HTMLElement;

/** A scroller from 0 to 300 on screen, scrolled by `scrollTop`. */
const scroller = (scrollTop = 0) => {
  const scrollTo = vi.fn();
  const element = {
    scrollTop,
    scrollTo,
    getBoundingClientRect: () => ({ top: 0, bottom: 300 }),
  } as unknown as HTMLElement;
  return { element, scrollTo };
};

describe('revealInScroller', () => {
  it('leaves what is in view where it is', () => {
    const { element, scrollTo } = scroller();
    revealInScroller(element, box(100, 280));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls just far enough to show a short element whole', () => {
    const { element, scrollTo } = scroller(40);
    revealInScroller(element, box(200, 360), 'smooth');
    // 60 hidden below, and the 12px margin under it.
    expect(scrollTo).toHaveBeenCalledWith({ top: 112, behavior: 'smooth' });
  });

  it('stops a tall element with its top in view', () => {
    const { element, scrollTo } = scroller();
    revealInScroller(element, box(250, 900));
    // Its top lands 12px under the scroller's.
    expect(scrollTo).toHaveBeenCalledWith({ top: 238, behavior: 'auto' });
  });
});
