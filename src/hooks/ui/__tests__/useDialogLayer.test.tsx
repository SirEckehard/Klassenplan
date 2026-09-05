// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Escape ownership used to be read out of the DOM: whoever carried
 * `role="dialog"` or `role="menu"` won. That made an ARIA role into application
 * state — adding the correct role to a new component silently changed what
 * Escape did in two unrelated views. These tests pin the explicit registry that
 * replaced it.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  isAnyDialogOpen,
  isTopDialogLayer,
  resetDialogLayersForTests,
  useDialogLayer,
} from '../useDialogLayer';

beforeEach(() => {
  resetDialogLayersForTests();
});

describe('useDialogLayer', () => {
  it('reports nothing open before anything registers', () => {
    expect(isAnyDialogOpen()).toBe(false);
  });

  it('registers only while open', () => {
    const { rerender, unmount } = renderHook(
      ({ open }: { open: boolean }) => useDialogLayer(open),
      { initialProps: { open: false } },
    );
    expect(isAnyDialogOpen()).toBe(false);

    rerender({ open: true });
    expect(isAnyDialogOpen()).toBe(true);

    rerender({ open: false });
    expect(isAnyDialogOpen()).toBe(false);

    rerender({ open: true });
    unmount();
    // An overlay torn down while open must not leave Escape claimed forever.
    expect(isAnyDialogOpen()).toBe(false);
  });

  it('hands Escape to the innermost layer', () => {
    const outer = renderHook(() => useDialogLayer(true));
    expect(isTopDialogLayer(outer.result.current)).toBe(true);

    const inner = renderHook(() => useDialogLayer(true));

    // A modal opened from a popover: the popover must stand down.
    expect(isTopDialogLayer(inner.result.current)).toBe(true);
    expect(isTopDialogLayer(outer.result.current)).toBe(false);

    inner.unmount();

    expect(isTopDialogLayer(outer.result.current)).toBe(true);
  });

  it('gives every overlay its own id', () => {
    const a = renderHook(() => useDialogLayer(true));
    const b = renderHook(() => useDialogLayer(true));

    expect(a.result.current).not.toBe(b.result.current);
  });

  it('keeps an id stable across re-renders', () => {
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) => useDialogLayer(open),
      { initialProps: { open: true } },
    );
    const first = result.current;

    rerender({ open: false });
    rerender({ open: true });

    // Otherwise a closed-and-reopened overlay could never recognise itself as
    // the top layer again.
    expect(result.current).toBe(first);
    expect(isTopDialogLayer(first)).toBe(true);
  });

  it('answers false for a layer that never opened', () => {
    const { result } = renderHook(() => useDialogLayer(false));

    expect(isTopDialogLayer(result.current)).toBe(false);
  });

  it('removes the right layer when an outer one closes first', () => {
    const outer = renderHook(
      ({ open }: { open: boolean }) => useDialogLayer(open),
      { initialProps: { open: true } },
    );
    const inner = renderHook(() => useDialogLayer(true));

    // Unusual but reachable: a background sheet closing under an open modal.
    outer.rerender({ open: false });

    expect(isAnyDialogOpen()).toBe(true);
    expect(isTopDialogLayer(inner.result.current)).toBe(true);
  });
});
