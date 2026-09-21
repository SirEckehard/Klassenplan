// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEdgeReveal } from '../useEdgeReveal';

/** A bar that shows whether it is up, the way the projection draws it. */
function Bar({ enabled }: { enabled: boolean }) {
  const { visible, barProps } = useEdgeReveal(enabled);
  return (
    <div {...barProps} data-testid="bar" data-visible={visible}>
      <button type="button">Größe</button>
      <button type="button">Vollbild</button>
    </div>
  );
}

const bar = () => screen.getByTestId('bar');
const pointerAt = (fromBottom: number) =>
  act(() => {
    window.dispatchEvent(
      new MouseEvent('pointermove', {
        clientY: window.innerHeight - fromBottom,
      }),
    );
  });
/** Well past the delay, whatever it is tuned to. */
const waitLong = () => act(() => vi.advanceTimersByTime(10_000));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useEdgeReveal', () => {
  it('is always up while it is not asked to hide', () => {
    render(<Bar enabled={false} />);

    pointerAt(500);
    waitLong();

    expect(bar()).toHaveAttribute('data-visible', 'true');
  });

  it('waits below the edge until the pointer comes near it', () => {
    render(<Bar enabled />);
    expect(bar()).toHaveAttribute('data-visible', 'false');

    // The middle of the wall is the plan's.
    pointerAt(400);
    expect(bar()).toHaveAttribute('data-visible', 'false');

    pointerAt(20);
    expect(bar()).toHaveAttribute('data-visible', 'true');
  });

  it('slides away a moment after the pointer has left the edge', () => {
    render(<Bar enabled />);

    pointerAt(20);
    waitLong();

    expect(bar()).toHaveAttribute('data-visible', 'false');
  });

  it('stays up while the pointer rests on it', () => {
    render(<Bar enabled />);

    pointerAt(20);
    fireEvent.pointerEnter(bar());
    waitLong();
    expect(bar()).toHaveAttribute('data-visible', 'true');

    fireEvent.pointerLeave(bar());
    waitLong();
    expect(bar()).toHaveAttribute('data-visible', 'false');
  });

  // Tab is a way in, not a dead end: the bar comes up with the focus and
  // stays while the focus moves between its buttons.
  it('comes up with the keyboard and stays while the focus is inside', () => {
    render(<Bar enabled />);
    const [size, fullscreen] = screen.getAllByRole('button');

    act(() => size.focus());
    expect(bar()).toHaveAttribute('data-visible', 'true');

    act(() => fullscreen.focus());
    waitLong();
    expect(bar()).toHaveAttribute('data-visible', 'true');

    act(() => fullscreen.blur());
    waitLong();
    expect(bar()).toHaveAttribute('data-visible', 'false');
  });

  // Pressing "Vollbild" with the mouse leaves the focus on that button. The
  // bar has to go once the pointer does, not after the next click elsewhere.
  it('lets go once the pointer leaves, though a click left the focus in it', () => {
    const matches = Element.prototype.matches;
    const spy = vi
      .spyOn(Element.prototype, 'matches')
      .mockImplementation(function (this: Element, selector: string) {
        // What a browser says about focus a click brought.
        return selector === ':focus-visible'
          ? false
          : matches.call(this, selector);
      });
    render(<Bar enabled />);
    const [, fullscreen] = screen.getAllByRole('button');

    fireEvent.pointerEnter(bar());
    act(() => fullscreen.focus());
    fireEvent.pointerLeave(bar());
    waitLong();

    expect(fullscreen).toHaveFocus();
    expect(bar()).toHaveAttribute('data-visible', 'false');
    spy.mockRestore();
  });
});
