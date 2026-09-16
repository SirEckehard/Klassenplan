// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLongPress } from '../useLongPress';

function Harness({
  onLongPress,
  onClick,
}: {
  onLongPress: (element: HTMLButtonElement) => void;
  onClick: () => void;
}) {
  const longPress = useLongPress<HTMLButtonElement>(onLongPress);
  return (
    <button
      type="button"
      {...longPress.handlers}
      onClick={() => {
        if (!longPress.isClickAfterLongPress()) {
          onClick();
        }
      }}
    >
      Hold
    </button>
  );
}

const setup = () => {
  const onLongPress = vi.fn();
  const onClick = vi.fn();
  render(<Harness onLongPress={onLongPress} onClick={onClick} />);
  return { onLongPress, onClick, button: screen.getByRole('button') };
};

describe('useLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires after half a second and swallows the click that ends the press', () => {
    const { onLongPress, onClick, button } = setup();

    fireEvent.pointerDown(button, {
      pointerType: 'touch',
      clientX: 10,
      clientY: 10,
    });
    act(() => vi.advanceTimersByTime(499));
    expect(onLongPress).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onLongPress).toHaveBeenCalledWith(button);

    fireEvent.pointerUp(button, { pointerType: 'touch' });
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('leaves a short tap its click', () => {
    const { onLongPress, onClick, button } = setup();

    fireEvent.pointerDown(button, { pointerType: 'touch' });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.pointerUp(button, { pointerType: 'touch' });
    fireEvent.click(button);
    act(() => vi.advanceTimersByTime(1000));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('leaves a mouse alone — it has the right click', () => {
    const { onLongPress, onClick, button } = setup();

    fireEvent.pointerDown(button, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.pointerUp(button, { pointerType: 'mouse' });
    fireEvent.click(button);

    expect(onLongPress).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('gives up when the finger starts to scroll, but tolerates a tremble', () => {
    const { onLongPress, button } = setup();

    fireEvent.pointerDown(button, {
      pointerType: 'touch',
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(button, { clientX: 13, clientY: 14 });
    fireEvent.pointerMove(button, { clientX: 10, clientY: 30 });
    act(() => vi.advanceTimersByTime(1000));
    expect(onLongPress).not.toHaveBeenCalled();

    fireEvent.pointerDown(button, {
      pointerType: 'pen',
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(button, { clientX: 13, clientY: 14 });
    act(() => vi.advanceTimersByTime(500));
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('does not eat a later keyboard click when no click ended the press', () => {
    const { onLongPress, onClick, button } = setup();

    // Android answers a long press with `contextmenu` and cancels the pointer
    // instead of clicking.
    fireEvent.pointerDown(button, { pointerType: 'touch' });
    act(() => vi.advanceTimersByTime(500));
    fireEvent.pointerCancel(button, { pointerType: 'touch' });
    expect(onLongPress).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(2000));
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
