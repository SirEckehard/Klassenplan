// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Student } from '@/types';
import { createMockStudent } from '@/__tests__/utils';

const removeStudentPhoto = vi.fn<(id: string) => Promise<void>>();

vi.mock('@/hooks/student/studentPhotoCache', () => ({
  removeStudentPhoto: (id: string) => removeStudentPhoto(id),
}));

import { useStudentHistory } from '@/hooks/student/useStudentHistory';
import {
  clearPhotoTrash,
  schedulePhotoDeletion,
} from '@/hooks/student/studentPhotoTrash';

/**
 * The history with the real photo trash, the way the class layer runs them: a
 * removal schedules the photo's deletion, the history decides when it is
 * committed, and opening another class puts that class's list in place before
 * the history is reset (`applyClassReload`).
 */
function setupClass(initial: Student[]) {
  let students = initial;
  const getStudents = () => students;
  const applySnapshot = (next: Student[]) => {
    students = next;
  };
  const view = renderHook(() =>
    useStudentHistory({ getStudents, applySnapshot }),
  );

  return {
    history: () => view.result.current,
    edit: (next: Student[]) => {
      students = next;
    },
    openAnotherClass: () => {
      students = [student('other')];
      act(() => view.result.current.resetHistory());
    },
  };
}

const student = (id: string, overrides: Partial<Student> = {}) =>
  createMockStudent({ id, name: id, ...overrides });

describe('useStudentHistory with the photo trash', () => {
  const sara = student('sara', { hasPhoto: true });
  const ben = student('ben');

  beforeEach(() => {
    clearPhotoTrash();
    removeStudentPhoto.mockReset();
    removeStudentPhoto.mockResolvedValue(undefined);
  });

  it('deletes the photo of a removed student once another class is open', () => {
    const { history, edit, openAnotherClass } = setupClass([sara, ben]);

    act(() => {
      history().record(() => {
        edit([ben]);
        schedulePhotoDeletion('sara');
      });
    });
    expect(removeStudentPhoto).not.toHaveBeenCalled();

    openAnotherClass();

    expect(removeStudentPhoto).toHaveBeenCalledWith('sara');
  });

  it('keeps the photo of a removal undone before another class is opened', () => {
    const { history, edit, openAnotherClass } = setupClass([sara, ben]);

    act(() => {
      history().record(() => {
        edit([ben]);
        schedulePhotoDeletion('sara');
      });
    });
    act(() => history().undo());
    openAnotherClass();

    expect(removeStudentPhoto).not.toHaveBeenCalled();
  });

  it('keeps a photo whose removal was undone', () => {
    const { history, edit, openAnotherClass } = setupClass([sara, ben]);

    act(() => {
      history().record(() => {
        edit([{ ...sara, hasPhoto: false }, ben]);
        schedulePhotoDeletion('sara');
      });
    });
    act(() => history().undo());
    openAnotherClass();

    expect(removeStudentPhoto).not.toHaveBeenCalled();
  });

  it('keeps a new photo taken after the old one was removed', () => {
    const { history, edit, openAnotherClass } = setupClass([sara, ben]);

    act(() => {
      history().record(() => {
        edit([{ ...sara, hasPhoto: false }, ben]);
        schedulePhotoDeletion('sara');
      });
    });
    act(() => {
      history().record(() => edit([{ ...sara, hasPhoto: true }, ben]));
    });
    openAnotherClass();

    expect(removeStudentPhoto).not.toHaveBeenCalled();
  });

  it('deletes the photo when a redo takes the student off the list again', () => {
    const { history, edit, openAnotherClass } = setupClass([sara, ben]);

    act(() => {
      history().record(() => {
        edit([ben]);
        schedulePhotoDeletion('sara');
      });
    });
    act(() => history().undo());
    act(() => history().redo());
    expect(removeStudentPhoto).not.toHaveBeenCalled();

    openAnotherClass();

    expect(removeStudentPhoto).toHaveBeenCalledWith('sara');
  });

  it('deletes a photo an undo took off the list once no redo can bring it back', () => {
    const noPhotoYet = student('sara');
    const { history, edit } = setupClass([noPhotoYet, ben]);

    act(() => {
      history().record(() => edit([{ ...noPhotoYet, hasPhoto: true }, ben]));
    });
    act(() => history().undo());
    expect(removeStudentPhoto).not.toHaveBeenCalled();

    // A new step drops the redo branch that held the photo.
    act(() => {
      history().record(() => edit([noPhotoYet, { ...ben, name: 'Ben' }]));
    });

    expect(removeStudentPhoto).toHaveBeenCalledWith('sara');
  });
});
