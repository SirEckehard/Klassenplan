// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Hit areas used to follow the viewport width, so a tablet in landscape — the
 * likely orientation for setting up a classroom — got mouse-sized drag targets
 * on a touch screen. This hook is the separate signal that fixes that.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const listeners = new Set<(event: MediaQueryListEvent) => void>();

/** Installs a `matchMedia` whose match state the test drives. */
const mockMatchMedia = (matches: boolean) => {
  const query = {
    matches,
    media: '(pointer: coarse)',
    addEventListener: (
      _type: string,
      listener: (e: MediaQueryListEvent) => void,
    ) => listeners.add(listener),
    removeEventListener: (
      _type: string,
      listener: (e: MediaQueryListEvent) => void,
    ) => listeners.delete(listener),
  } as unknown as MediaQueryList;

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  );
  return query as { matches: boolean };
};

/** Fresh module instance — the hook caches its MediaQueryList at module scope. */
const loadHook = async () => {
  vi.resetModules();
  const module = await import('../useCoarsePointer');
  return module.useIsCoarsePointer;
};

afterEach(() => {
  listeners.clear();
  vi.unstubAllGlobals();
});

describe('useIsCoarsePointer', () => {
  it('reports a finger', async () => {
    mockMatchMedia(true);
    const useIsCoarsePointer = await loadHook();

    const { result } = renderHook(() => useIsCoarsePointer());

    expect(result.current).toBe(true);
  });

  it('reports a mouse', async () => {
    mockMatchMedia(false);
    const useIsCoarsePointer = await loadHook();

    const { result } = renderHook(() => useIsCoarsePointer());

    expect(result.current).toBe(false);
  });

  it('follows a change of primary pointer', async () => {
    const query = mockMatchMedia(false);
    const useIsCoarsePointer = await loadHook();

    const { result } = renderHook(() => useIsCoarsePointer());
    expect(result.current).toBe(false);

    // Detaching a keyboard from a 2-in-1 flips the primary pointer.
    query.matches = true;
    act(() => {
      listeners.forEach((listener) =>
        listener({ matches: true } as MediaQueryListEvent),
      );
    });

    expect(result.current).toBe(true);
  });

  it('assumes a mouse where matchMedia is missing', async () => {
    vi.stubGlobal('matchMedia', undefined);
    const useIsCoarsePointer = await loadHook();

    // A browser without the API must not get phone-sized targets by accident.
    const { result } = renderHook(() => useIsCoarsePointer());

    expect(result.current).toBe(false);
  });

  it('keeps one shared listener for many consumers', async () => {
    mockMatchMedia(true);
    const useIsCoarsePointer = await loadHook();

    const { unmount } = renderHook(() => ({
      a: useIsCoarsePointer(),
      b: useIsCoarsePointer(),
      c: useIsCoarsePointer(),
    }));

    expect(listeners.size).toBe(1);

    unmount();

    expect(listeners.size).toBe(0);
  });
});
