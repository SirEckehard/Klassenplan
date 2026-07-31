// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

const pressEscape = () => {
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useKeyboardShortcuts', () => {
  it('runs a capture listener before a bubble listener registered earlier', () => {
    // The order matters wherever a shortcut inspects state that another
    // handler tears down: dialogs close on Escape from a bubble listener, and
    // in a real browser React can commit that close between two bubble
    // listeners of the same event.
    const calls: string[] = [];
    const bubbleFirst = () => calls.push('bubble');
    window.addEventListener('keydown', bubbleFirst);

    renderHook(() =>
      useKeyboardShortcuts(
        { escape: () => calls.push('capture') },
        { capture: true },
      ),
    );

    pressEscape();
    window.removeEventListener('keydown', bubbleFirst);

    expect(calls).toEqual(['capture', 'bubble']);
  });

  it('runs in the bubble phase by default', () => {
    const calls: string[] = [];
    const bubbleFirst = () => calls.push('other');
    window.addEventListener('keydown', bubbleFirst);

    renderHook(() =>
      useKeyboardShortcuts({ escape: () => calls.push('shortcut') }),
    );

    pressEscape();
    window.removeEventListener('keydown', bubbleFirst);

    expect(calls).toEqual(['other', 'shortcut']);
  });

  it('removes the capture listener on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({ escape: handler }, { capture: true }),
    );

    pressEscape();
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
    pressEscape();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('skips the handler while its condition is false', () => {
    const handler = vi.fn();
    let allowed = false;
    renderHook(() =>
      useKeyboardShortcuts(
        { escape: handler },
        { capture: true, condition: () => allowed },
      ),
    );

    pressEscape();
    expect(handler).not.toHaveBeenCalled();

    allowed = true;
    pressEscape();

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
