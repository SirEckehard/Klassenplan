// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { beforeEach, describe, expect, it, vi } from 'vitest';

const removeStudentPhoto = vi.fn<(id: string) => Promise<void>>();

vi.mock('@/hooks/student/studentPhotoCache', () => ({
  removeStudentPhoto: (id: string) => removeStudentPhoto(id),
}));

import {
  clearPhotoTrash,
  schedulePhotoDeletion,
  sweepPhotoTrash,
} from '@/hooks/student/studentPhotoTrash';

describe('studentPhotoTrash', () => {
  beforeEach(() => {
    clearPhotoTrash();
    removeStudentPhoto.mockReset();
    removeStudentPhoto.mockResolvedValue(undefined);
  });

  it('does not touch storage when a deletion is only scheduled', () => {
    schedulePhotoDeletion('a');

    expect(removeStudentPhoto).not.toHaveBeenCalled();
  });

  it('commits a deletion once the id is no longer retained', () => {
    schedulePhotoDeletion('a');

    sweepPhotoTrash([]);

    expect(removeStudentPhoto).toHaveBeenCalledExactlyOnceWith('a');
  });

  it('keeps a retained id pending', () => {
    schedulePhotoDeletion('a');

    sweepPhotoTrash(['a']);
    expect(removeStudentPhoto).not.toHaveBeenCalled();

    // Still pending, so a later sweep without it still commits.
    sweepPhotoTrash([]);
    expect(removeStudentPhoto).toHaveBeenCalledExactlyOnceWith('a');
  });

  it('commits each id only once', () => {
    schedulePhotoDeletion('a');

    sweepPhotoTrash([]);
    sweepPhotoTrash([]);

    expect(removeStudentPhoto).toHaveBeenCalledTimes(1);
  });

  it('sweeps only the ids that lost their retention', () => {
    schedulePhotoDeletion('a');
    schedulePhotoDeletion('b');

    sweepPhotoTrash(['b']);

    expect(removeStudentPhoto).toHaveBeenCalledExactlyOnceWith('a');
  });

  it('survives a failing deletion', async () => {
    removeStudentPhoto.mockRejectedValue(new Error('IndexedDB gone'));
    schedulePhotoDeletion('a');

    expect(() => sweepPhotoTrash([])).not.toThrow();
    await vi.waitFor(() => expect(removeStudentPhoto).toHaveBeenCalled());
  });

  it('clearPhotoTrash drops pending deletions without committing them', () => {
    schedulePhotoDeletion('a');

    clearPhotoTrash();
    sweepPhotoTrash([]);

    expect(removeStudentPhoto).not.toHaveBeenCalled();
  });
});
