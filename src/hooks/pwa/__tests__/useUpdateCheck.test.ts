// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { useUpdateCheck, UPDATE_TOAST_ID } from '@/hooks/pwa/useUpdateCheck';
import { checkForUpdate } from '@/hooks/pwa/swUpdateController';
import { showToast } from '@/utils/ui/toast';

vi.mock('@/hooks/pwa/swUpdateController', () => ({
  checkForUpdate: vi.fn(),
  applyPendingUpdate: vi.fn(),
}));

vi.mock('@/utils/ui/toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/ui/toast')>()),
  showToast: vi.fn(),
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
});
