// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSwipeToClose } from '@/hooks/ui/useSwipeToClose';
import type { SwipeEdge } from '@/hooks/ui/usePanelMotion';

const Panel = ({
  onClose,
  active = true,
  edge = 'bottom',
}: {
  onClose: () => void;
  active?: boolean;
  edge?: SwipeEdge;
}) => {
  const ref = React.useRef<HTMLElement | null>(null);
  useSwipeToClose(ref, onClose, active, edge);
  return (
    <aside ref={ref} data-testid="panel">
      <div data-inspector-head="" data-testid="head">
        <input aria-label="Name" />
      </div>
      <div data-testid="body">Body</div>
    </aside>
  );
};

/** One touch event at a given moment; jsdom has no `TouchEvent` to speak of. */
const fire = (
  element: Element,
  type: string,
  y: number,
  time: number,
  x = 0,
) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'timeStamp', { value: time });
  Object.assign(event, {
    touches: type === 'touchend' ? [] : [{ clientX: x, clientY: y }],
  });
  element.dispatchEvent(event);
  return event;
};

/** Slowly, 200 ms a step, so that only the distance counts. */
const pullDown = (element: Element, by: number) => {
  fire(element, 'touchstart', 100, 0);
  fire(element, 'touchmove', 110, 200);
  fire(element, 'touchmove', 110 + by, 400);
};

const pullRight = (element: Element, by: number) => {
  fire(element, 'touchstart', 100, 0, 100);
  fire(element, 'touchmove', 100, 200, 110);
  fire(element, 'touchmove', 100, 400, 110 + by);
};

afterEach(cleanup);

describe('useSwipeToClose', () => {
  it('follows the finger from the head and closes when pulled far enough', () => {
    const onClose = vi.fn();
    render(<Panel onClose={onClose} />);
    const head = screen.getByTestId('head');

    pullDown(head, 120);
    expect(screen.getByTestId('panel').style.transform).toBe(
      'translateY(120px)',
    );

    fire(head, 'touchend', 0, 800);
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByTestId('panel').style.transform).toBe('');
  });

  it('goes back to its place when not pulled far enough', () => {
    const onClose = vi.fn();
    render(<Panel onClose={onClose} />);
    const head = screen.getByTestId('head');

    pullDown(head, 40);
    fire(head, 'touchend', 0, 800);

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('panel').style.transform).toBe('');
  });

  it('closes on a flick, but not after the finger rested', () => {
    const onClose = vi.fn();
    render(<Panel onClose={onClose} />);
    const head = screen.getByTestId('head');

    fire(head, 'touchstart', 100, 0);
    fire(head, 'touchmove', 110, 10);
    fire(head, 'touchmove', 150, 30);
    fire(head, 'touchend', 0, 500);
    expect(onClose).not.toHaveBeenCalled();

    fire(head, 'touchstart', 100, 1000);
    fire(head, 'touchmove', 110, 1010);
    fire(head, 'touchmove', 150, 1030);
    fire(head, 'touchend', 0, 1040);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('leaves the body, a swipe up and a swipe sideways alone', () => {
    const onClose = vi.fn();
    render(<Panel onClose={onClose} />);
    const panel = screen.getByTestId('panel');

    pullDown(screen.getByTestId('body'), 200);
    expect(panel.style.transform).toBe('');

    const head = screen.getByTestId('head');
    fire(head, 'touchstart', 100, 0);
    fire(head, 'touchmove', 80, 100);
    fire(head, 'touchmove', 400, 200);
    fire(head, 'touchend', 0, 300);
    expect(panel.style.transform).toBe('');

    fire(head, 'touchstart', 100, 400);
    fire(head, 'touchmove', 110, 500, 40);
    fire(head, 'touchmove', 400, 600, 40);
    fire(head, 'touchend', 0, 700);
    expect(panel.style.transform).toBe('');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('goes right, and only right, from a drawer on the right', () => {
    const onClose = vi.fn();
    render(<Panel onClose={onClose} edge="right" />);
    const head = screen.getByTestId('head');
    const panel = screen.getByTestId('panel');

    pullDown(head, 200);
    fire(head, 'touchend', 0, 800);
    expect(panel.style.transform).toBe('');
    expect(onClose).not.toHaveBeenCalled();

    fire(head, 'touchstart', 100, 1000, 300);
    fire(head, 'touchmove', 100, 1200, 200);
    fire(head, 'touchmove', 100, 1400, 0);
    fire(head, 'touchend', 0, 1800);
    expect(panel.style.transform).toBe('');
    expect(onClose).not.toHaveBeenCalled();

    pullRight(head, 120);
    expect(panel.style.transform).toBe('translateX(120px)');
    fire(head, 'touchend', 0, 800);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('leaves a focused text field its finger, but not an unfocused one', () => {
    const onClose = vi.fn();
    render(<Panel onClose={onClose} />);
    const field = screen.getByRole('textbox', { name: 'Name' });

    pullDown(field, 200);
    fire(field, 'touchend', 0, 800);
    expect(onClose).toHaveBeenCalledOnce();

    field.focus();
    pullDown(field, 200);
    fire(field, 'touchend', 0, 1600);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does nothing while it is not open as a sheet or a drawer', () => {
    const onClose = vi.fn();
    render(<Panel onClose={onClose} active={false} />);
    const head = screen.getByTestId('head');

    pullDown(head, 200);
    fire(head, 'touchend', 0, 800);

    expect(screen.getByTestId('panel').style.transform).toBe('');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps nothing pulled away when the panel closes under the finger', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Panel onClose={onClose} />);

    pullDown(screen.getByTestId('head'), 40);
    rerender(<Panel onClose={onClose} active={false} />);

    expect(screen.getByTestId('panel').style.transform).toBe('');
  });
});
