// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as utils from '@/utils';
import usePersistentState from '../usePersistentState';

describe('usePersistentState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores and retrieves values from localStorage', () => {
    const { result } = renderHook(() => usePersistentState('test-key', false));
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(JSON.parse(localStorage.getItem('test-key') || 'false')).toBe(true);
  });

  it('removes corrupted values and falls back to the default', () => {
    const corruptedKey = 'corrupted-key';
    localStorage.setItem(corruptedKey, '{invalid');
    const toastSpy = vi.spyOn(utils, 'showToast').mockReturnValue('id');
    const logSpy = vi
      .spyOn(utils, 'logWarn')
      .mockImplementation(() => undefined);
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem');

    const { result } = renderHook(() =>
      usePersistentState<Record<string, string>>(corruptedKey, {
        fallback: 'value',
      }),
    );

    expect(result.current[0]).toEqual({ fallback: 'value' });
    expect(localStorage.getItem(corruptedKey)).toBe(
      JSON.stringify({ fallback: 'value' }),
    );
    expect(logSpy).toHaveBeenCalledWith(
      'usePersistentState: corrupted entry removed',
      expect.objectContaining({ key: corruptedKey }),
    );
    expect(removeSpy).toHaveBeenCalledWith(corruptedKey);
    expect(toastSpy).toHaveBeenCalledWith(
      'warning',
      utils.TOAST_MESSAGES.PREFERENCES_RESET,
    );
  });
});
