// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { useUpdateCheck, UPDATE_TOAST_ID } from '@/hooks/pwa/useUpdateCheck';
import { checkForUpdate } from '@/hooks/pwa/swUpdateController';
import { dismissToast, showToast } from '@/utils/ui/toast';

vi.mock('@/hooks/pwa/swUpdateController', () => ({
  checkForUpdate: vi.fn(),
  applyPendingUpdate: vi.fn(),
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
  // trades the app for the browser's offline page.
  it('neither checks nor reloads while offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    const { result } = renderHook(() => useUpdateCheck());

    act(() => result.current.checkNow());

    expect(checkForUpdate).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      'info',
      expect.stringMatching(/internetverbindung|internet connection/i),
      { id: UPDATE_TOAST_ID },
    );
    expect(result.current.checking).toBe(false);
  });

  // The gear's row says it; an earlier "offline" or "failed" goes away.
  it('reports a current version as state, not as a toast', async () => {
    vi.mocked(checkForUpdate).mockResolvedValue('up-to-date');
    const { result } = renderHook(() => useUpdateCheck());

    act(() => result.current.checkNow());

    await waitFor(() => expect(result.current.upToDate).toBe(true));
    expect(showToast).not.toHaveBeenCalled();
    expect(dismissToast).toHaveBeenCalledWith(UPDATE_TOAST_ID);
  });
});
