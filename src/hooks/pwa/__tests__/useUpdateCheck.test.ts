// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { useUpdateCheck, UPDATE_TOAST_ID } from '@/hooks/pwa/useUpdateCheck';
import { checkForUpdate, setUpdateReady } from '@/hooks/pwa/swUpdateController';
import { dismissToast, showToast } from '@/utils/ui/toast';

vi.mock('@/hooks/pwa/swUpdateController', () => ({
  checkForUpdate: vi.fn(),
  applyPendingUpdate: vi.fn(),
  setUpdateReady: vi.fn(),
}));

vi.mock('@/utils/ui/toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/ui/toast')>()),
  showToast: vi.fn(),
  dismissToast: vi.fn(),
}));

afterEach(() => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => true,
  });
  vi.clearAllMocks();
});

describe('useUpdateCheck', () => {
  // Without a service worker the check falls back to a reload, which offline
  // trades the app for the browser's offline page. The gear's row says why,
  // not a toast over the open menu.
  it('neither checks nor reloads while offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    const { result } = renderHook(() => useUpdateCheck());

    act(() => result.current.checkNow());

    expect(checkForUpdate).not.toHaveBeenCalled();
    expect(result.current.answer).toBe('offline');
    expect(showToast).not.toHaveBeenCalled();
    expect(result.current.checking).toBe(false);
  });

  // The gear's row says it; an earlier "offline" or "failed" goes away.
  it('reports a current version as state, not as a toast', async () => {
    vi.mocked(checkForUpdate).mockResolvedValue('up-to-date');
    const { result } = renderHook(() => useUpdateCheck());

    act(() => result.current.checkNow());

    await waitFor(() => expect(result.current.answer).toBe('upToDate'));
    expect(showToast).not.toHaveBeenCalled();
    expect(dismissToast).toHaveBeenCalledWith(UPDATE_TOAST_ID);
  });

  // A waiting version is a state the row and the status bar offer.
  it('marks a found update as ready, without a toast', async () => {
    vi.mocked(checkForUpdate).mockResolvedValue('update-ready');
    const { result } = renderHook(() => useUpdateCheck());

    act(() => result.current.checkNow());

    await waitFor(() => expect(setUpdateReady).toHaveBeenCalledWith(true));
    expect(showToast).not.toHaveBeenCalled();
    expect(result.current.answer).toBeNull();
  });

  it('says a failed check in the row', async () => {
    vi.mocked(checkForUpdate).mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useUpdateCheck());

    act(() => result.current.checkNow());

    await waitFor(() => expect(result.current.answer).toBe('failed'));
    expect(showToast).not.toHaveBeenCalled();
  });
});
