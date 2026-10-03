// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStorageHistoryModal } from '@/components/ui/navigation/useStorageHistoryModal';
import { showToast } from '@/utils/ui/toast';

// The chunk cannot be fetched: offline, where no service worker serves the
// page and the dialog was never opened before.
vi.mock('@/components/ui/navigation/StorageHistoryModal', () => {
  throw new TypeError(
    'error loading dynamically imported module: http://x/chunks/StorageHistoryModal.js',
  );
});

vi.mock('@/utils/ui/toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/ui/toast')>()),
  showToast: vi.fn(),
}));

afterEach(() => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => true,
  });
});

describe('useStorageHistoryModal', () => {
  // As `React.lazy` it threw into the layer's error boundary, and the whole
  // room editor gave way to an error screen.
  it('says why the dialog does not open instead of throwing', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    const { result } = renderHook(() => useStorageHistoryModal());

    act(() => result.current.show());

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        'error',
        'toast:errors.chunkOffline',
        expect.anything(),
      ),
    );
    expect(result.current.modal).toBeNull();
  });
});
