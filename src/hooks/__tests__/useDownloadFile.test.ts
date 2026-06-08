// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useDownloadFile } from '../useDownloadFile';
import * as downloads from '@/utils/downloads';

describe('useDownloadFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates to downloadBlob with default options', async () => {
    const spy = vi
      .spyOn(downloads, 'downloadBlob')
      .mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDownloadFile({
        defaultMimeType: 'text/plain',
        logContext: 'hook-test',
      }),
    );

    await act(async () => {
      await result.current('payload', 'file.txt');
    });

    expect(spy).toHaveBeenCalledWith('payload', 'file.txt', 'text/plain', {
      logContext: 'hook-test',
      filePickerTypes: undefined,
    });
  });

  it('propagates download errors', async () => {
    const spy = vi
      .spyOn(downloads, 'downloadBlob')
      .mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useDownloadFile());

    await expect(result.current('payload', 'broken.txt')).rejects.toThrow(
      'fail',
    );
    expect(spy).toHaveBeenCalled();
  });
});
