// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useUndoStep } from '../useUndoStep';

describe('useUndoStep', () => {
  it('takes one snapshot for everything inside a step', () => {
    const snapshot = vi.fn();
    const { result } = renderHook(() => useUndoStep(snapshot));

    result.current.asOneStep(() => {
      result.current.snapshot();
      result.current.snapshot();
      result.current.snapshot();
    });

    expect(snapshot).toHaveBeenCalledTimes(1);
  });

  it('lets every snapshot through outside a step', () => {
    const snapshot = vi.fn();
    const { result } = renderHook(() => useUndoStep(snapshot));

    result.current.snapshot();
    result.current.snapshot();

    expect(snapshot).toHaveBeenCalledTimes(2);
  });

  it('closes the step even when the gesture fails', () => {
    const snapshot = vi.fn();
    const { result } = renderHook(() => useUndoStep(snapshot));

    expect(() =>
      result.current.asOneStep(() => {
        result.current.snapshot();
        throw new Error('broken');
      }),
    ).toThrow('broken');
    result.current.snapshot();

    expect(snapshot).toHaveBeenCalledTimes(2);
  });

  it('gives each step a snapshot of its own', () => {
    const snapshot = vi.fn();
    const { result } = renderHook(() => useUndoStep(snapshot));

    result.current.asOneStep(() => result.current.snapshot());
    result.current.asOneStep(() => result.current.snapshot());

    expect(snapshot).toHaveBeenCalledTimes(2);
  });
});
