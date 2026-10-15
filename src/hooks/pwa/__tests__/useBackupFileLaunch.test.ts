// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBackupFileLaunch } from '../useBackupFileLaunch';
import * as toastModule from '@/utils/ui/toast';

type Consumer = (params: LaunchParams) => void;

/** A launch queue that hands its consumer whatever the test launches. */
const installLaunchQueue = () => {
  let consumer: Consumer | null = null;
  window.launchQueue = {
    setConsumer: (next) => {
      consumer = next;
    },
  };
  return {
    launch: (files: FileSystemHandle[]) => consumer?.({ files }),
  };
};

const fileHandle = (file: File | Error): FileSystemFileHandle =>
  ({
    kind: 'file',
    name: file instanceof File ? file.name : 'broken.klassenplan',
    getFile: () =>
      file instanceof File ? Promise.resolve(file) : Promise.reject(file),
  }) as unknown as FileSystemFileHandle;

describe('useBackupFileLaunch', () => {
  afterEach(() => {
    delete window.launchQueue;
    vi.restoreAllMocks();
  });

  it('restores the backup the app was opened with', async () => {
    const queue = installLaunchQueue();
    const importBackupFile = vi.fn();
    renderHook(() => useBackupFileLaunch(importBackupFile));

    const backup = new File(['{}'], 'backup-2026-10-15.klassenplan');
    queue.launch([fileHandle(backup)]);

    await waitFor(() => expect(importBackupFile).toHaveBeenCalledWith(backup));
  });

  it('restores only the first of several files', async () => {
    const queue = installLaunchQueue();
    const importBackupFile = vi.fn();
    renderHook(() => useBackupFileLaunch(importBackupFile));

    const first = new File(['{}'], 'a.klassenplan');
    queue.launch([
      fileHandle(first),
      fileHandle(new File([], 'b.klassenplan')),
    ]);

    await waitFor(() => expect(importBackupFile).toHaveBeenCalledTimes(1));
    expect(importBackupFile).toHaveBeenCalledWith(first);
  });

  it('does nothing for a launch without a file', () => {
    const queue = installLaunchQueue();
    const importBackupFile = vi.fn();
    renderHook(() => useBackupFileLaunch(importBackupFile));

    queue.launch([]);

    expect(importBackupFile).not.toHaveBeenCalled();
  });

  it('says so when the file cannot be read', async () => {
    const showToast = vi.spyOn(toastModule, 'showToast');
    const queue = installLaunchQueue();
    const importBackupFile = vi.fn();
    renderHook(() => useBackupFileLaunch(importBackupFile));

    queue.launch([fileHandle(new Error('gone'))]);

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('error', expect.any(String)),
    );
    expect(importBackupFile).not.toHaveBeenCalled();
  });

  it('stays out of the way where there is no launch queue', () => {
    const importBackupFile = vi.fn();
    expect(() =>
      renderHook(() => useBackupFileLaunch(importBackupFile)),
    ).not.toThrow();
  });
});
