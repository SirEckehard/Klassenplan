// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useContainedTouchScroll } from '@/hooks/ui/useContainedTouchScroll';

const Drawer = ({ active = true }: { active?: boolean }) => {
  const ref = React.useRef<HTMLElement | null>(null);
  useContainedTouchScroll(ref, active);
  return (
    <>
      <aside ref={ref}>
        <header data-testid="head">Name</header>
        <div data-testid="body" style={{ overflowY: 'auto' }}>
          <p data-testid="row">Row</p>
        </div>
      </aside>
      <main data-testid="page">List</main>
    </>
  );
};

/** Gives the body a scroll range of 300px, scrolled to `top`. */
const makeScrollable = (element: HTMLElement, top: number) => {
  Object.defineProperty(element, 'clientHeight', {
    value: 200,
    configurable: true,
  });
  Object.defineProperty(element, 'scrollHeight', {
    value: 500,
    configurable: true,
  });
  element.scrollTop = top;
};

const touch = (target: Element, y: number, fingers = 1) =>
  Array.from({ length: fingers }, () => ({ target, clientX: 0, clientY: y }));

const swipe = (
  element: Element,
  from: number,
  to: number,
  fingers = 1,
): boolean => {
  const start = new Event('touchstart', { bubbles: true, cancelable: true });
  Object.assign(start, { touches: touch(element, from, fingers) });
  element.dispatchEvent(start);
  const move = new Event('touchmove', { bubbles: true, cancelable: true });
  Object.assign(move, { touches: touch(element, to, fingers) });
  element.dispatchEvent(move);
  return move.defaultPrevented;
};

afterEach(cleanup);

describe('useContainedTouchScroll', () => {
  it('keeps a swipe on a part that does not scroll from scrolling the page', () => {
    render(<Drawer />);
    expect(swipe(screen.getByTestId('head'), 300, 200)).toBe(true);
  });

  it('lets the drawer’s body scroll while it has room', () => {
    render(<Drawer />);
    makeScrollable(screen.getByTestId('body'), 100);
    expect(swipe(screen.getByTestId('row'), 300, 200)).toBe(false);
    expect(swipe(screen.getByTestId('row'), 200, 300)).toBe(false);
  });

  it('stops the swipe at the end of the body instead of passing it on', () => {
    render(<Drawer />);
    makeScrollable(screen.getByTestId('body'), 0);
    expect(swipe(screen.getByTestId('row'), 200, 300)).toBe(true);
    makeScrollable(screen.getByTestId('body'), 300);
    expect(swipe(screen.getByTestId('row'), 300, 200)).toBe(true);
  });

  it('leaves the page beside the drawer and a pinch alone', () => {
    render(<Drawer />);
    expect(swipe(screen.getByTestId('page'), 300, 200)).toBe(false);
    expect(swipe(screen.getByTestId('head'), 300, 200, 2)).toBe(false);
  });

  it('does nothing while the drawer is closed', () => {
    render(<Drawer active={false} />);
    expect(swipe(screen.getByTestId('head'), 300, 200)).toBe(false);
  });
});
