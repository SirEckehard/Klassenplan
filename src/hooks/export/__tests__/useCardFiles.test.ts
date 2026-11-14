// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));

vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);
vi.mock('@/utils/ui/toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/ui/toast')>()),
  showToast: vi.fn(),
}));

import '@/i18n';
import { getCardFile, setCardFile } from '@/repositories/cardFileStore';
import { showToast } from '@/utils/ui/toast';
import { useCardFiles } from '../useCardFiles';

const FONT = {
  name: 'Schulschrift.woff2',
  type: 'font/woff2',
  data: new Uint8Array([119, 79, 70, 50]).buffer,
};

describe('useCardFiles', () => {
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(showToast).mockClear();
  });

  // Decision 0041: what can come back asks nothing and offers "Rückgängig".
  // A font from a backup may lie nowhere else.
  it('removes the own font at once and brings it back from the card', async () => {
    await setCardFile('font', FONT);
    const { result } = renderHook(() => useCardFiles(true));

    await act(() => result.current.removeFont());
    const gone = await getCardFile('font');
    expect(gone.success && gone.data).toBeUndefined();

    const [, message, options] = vi.mocked(showToast).mock.calls.at(-1)!;
    expect(message).toMatch(/Schulschrift\.woff2/);
    act(() => options?.action?.onClick());

    await waitFor(async () => {
      const back = await getCardFile('font');
      expect(back.success && back.data?.name).toBe('Schulschrift.woff2');
    });
  });

  it('offers nothing when there was nothing to remove', async () => {
    const { result } = renderHook(() => useCardFiles(true));
    await act(() => result.current.removeImage());
    expect(showToast).not.toHaveBeenCalled();
  });
});
