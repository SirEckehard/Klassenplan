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

describe('useKeyboardShortcuts: which key a shortcut names', () => {
  const press = (init: KeyboardEventInit) =>
    window.dispatchEvent(new KeyboardEvent('keydown', init));

  // "+" and the space bar used to parse to an empty key: the presentation's
  // zoom and "Wer kommt dran?" never reacted to them.
  it.each([
    ['+', { key: '+' }],
    [' ', { key: ' ' }],
    ['space', { key: ' ' }],
    ['plus', { key: '+' }],
    ['ctrl++', { key: '+', ctrlKey: true }],
    ['-', { key: '-' }],
    ['0', { key: '0' }],
    ['f', { key: 'f' }],
    ['alt+arrowleft', { key: 'ArrowLeft', altKey: true }],
    ['ctrl+shift+z', { key: 'z', ctrlKey: true, shiftKey: true }],
    ['cmd+enter', { key: 'Enter', metaKey: true }],
  ] as const)('%j fires on its key', (shortcut, init) => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ [shortcut]: handler }));
    press(init);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('matches a symbol with or without Shift, as layouts need it', () => {
    // A US keyboard types "+" with Shift, a German one without.
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ '+': handler }));
    press({ key: '+', shiftKey: true });
    press({ key: '+' });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('keeps letters and the space bar strict about Shift', () => {
    const letter = vi.fn();
    const space = vi.fn();
    renderHook(() => useKeyboardShortcuts({ f: letter, ' ': space }));
    press({ key: 'F', shiftKey: true });
    press({ key: ' ', shiftKey: true });
    expect(letter).not.toHaveBeenCalled();
    expect(space).not.toHaveBeenCalled();
  });

  it('keeps modifiers exact', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ 'ctrl+s': handler }));
    press({ key: 's' });
    press({ key: 's', ctrlKey: true, altKey: true });
    expect(handler).not.toHaveBeenCalled();
    press({ key: 's', ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
