// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Student } from '@/types';
import { useStudentHistory } from '@/hooks/student/useStudentHistory';
import { createMockStudent } from '@/__tests__/utils';

const sweepPhotoTrash = vi.fn();

vi.mock('@/hooks/student/studentPhotoTrash', () => ({
  sweepPhotoTrash: (retained: Iterable<string>) =>
    sweepPhotoTrash([...retained]),
}));

/**
 * Drives the hook against a mutable list, the way the store does: `record`
 * mutates first and the hook then reads the committed result back.
 */
function setupHistory(initial: Student[] = []) {
  let students = initial;
  const getStudents = () => students;
  const applySnapshot = (next: Student[]) => {
    students = next;
  };
  const mutate = (next: Student[]) => {
    students = next;
  };

  const view = renderHook(() =>
    useStudentHistory({ getStudents, applySnapshot }),
  );

  return { view, mutate, read: () => students };
}

const student = (id: string, overrides: Partial<Student> = {}) =>
  createMockStudent({ id, name: id, ...overrides });

describe('useStudentHistory', () => {
  beforeEach(() => {
    sweepPhotoTrash.mockClear();
  });

  it('starts with both stacks empty', () => {
    const { view } = setupHistory([student('a')]);

    expect(view.result.current.canUndo).toBe(false);
    expect(view.result.current.canRedo).toBe(false);
  });

  it('restores the list a mutation left behind', () => {
    const before = [student('a')];
    const { view, mutate, read } = setupHistory(before);

    act(() => {
      view.result.current.record(() => mutate([]));
    });
    expect(read()).toEqual([]);
    expect(view.result.current.canUndo).toBe(true);

    act(() => view.result.current.undo());

    expect(read()).toEqual(before);
    expect(view.result.current.canUndo).toBe(false);
    expect(view.result.current.canRedo).toBe(true);
  });

  it('redo replays the undone mutation', () => {
    const { view, mutate, read } = setupHistory([student('a')]);

    act(() => {
      view.result.current.record(() => mutate([student('a'), student('b')]));
    });
    act(() => view.result.current.undo());
    act(() => view.result.current.redo());

    expect(read().map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(view.result.current.canRedo).toBe(false);
  });

  it('returns the mutation result untouched', () => {
    const { view, mutate } = setupHistory([]);

    let created: string | undefined;
    act(() => {
      created = view.result.current.record(() => {
        mutate([student('a')]);
        return 'created';
      });
    });

    expect(created).toBe('created');
  });

  it('does not record a mutation that changed nothing', () => {
    const { view } = setupHistory([student('a')]);

    act(() => {
      view.result.current.record(() => undefined);
    });

    expect(view.result.current.canUndo).toBe(false);
  });

  it('keeps the redo branch when a mutation changed nothing', () => {
    const { view, mutate } = setupHistory([student('a')]);

    act(() => {
      view.result.current.record(() => mutate([]));
    });
    act(() => view.result.current.undo());
    expect(view.result.current.canRedo).toBe(true);

    // A no-op edit is not a new branch — the redo has to survive it.
    act(() => {
      view.result.current.record(() => undefined);
    });

    expect(view.result.current.canRedo).toBe(true);
  });

  it('drops the redo branch once a real mutation follows an undo', () => {
    const { view, mutate } = setupHistory([student('a')]);

    act(() => {
      view.result.current.record(() => mutate([]));
    });
    act(() => view.result.current.undo());
    act(() => {
      view.result.current.record(() => mutate([student('c')]));
    });

    expect(view.result.current.canRedo).toBe(false);
  });

  it('detects an attribute change, not just a changed length', () => {
    const { view, mutate, read } = setupHistory([student('a', { shy: false })]);

    act(() => {
      view.result.current.record(() => mutate([student('a', { shy: true })]));
    });
    act(() => view.result.current.undo());

    expect(read()[0].shy).toBe(false);
  });

  it('records every step of a chain and unwinds it in order', () => {
    const { view, mutate, read } = setupHistory([]);

    act(() => {
      view.result.current.record(() => mutate([student('a')]));
    });
    act(() => {
      view.result.current.record(() => mutate([student('a'), student('b')]));
    });

    act(() => view.result.current.undo());
    expect(read().map((entry) => entry.id)).toEqual(['a']);

    act(() => view.result.current.undo());
    expect(read()).toEqual([]);
    expect(view.result.current.canUndo).toBe(false);
  });

  it('caps the undo depth at 30 steps', () => {
    const { view, mutate } = setupHistory([]);

    for (let i = 0; i < 35; i++) {
      act(() => {
        view.result.current.record(() =>
          mutate(
            Array.from({ length: i + 1 }, (_, index) => student(`s${index}`)),
          ),
        );
      });
    }

    for (let i = 0; i < 30; i++) {
      act(() => view.result.current.undo());
    }

    expect(view.result.current.canUndo).toBe(false);
  });

  it('resetHistory drops both stacks', () => {
    const { view, mutate } = setupHistory([student('a')]);

    act(() => {
      view.result.current.record(() => mutate([]));
    });
    act(() => view.result.current.undo());

    act(() => view.result.current.resetHistory());

    expect(view.result.current.canUndo).toBe(false);
    expect(view.result.current.canRedo).toBe(false);
  });

  it('recordAsync records once the awaited mutation resolved', async () => {
    const { view, mutate, read } = setupHistory([]);

    await act(async () => {
      await view.result.current.recordAsync(async () => {
        mutate([student('a')]);
      });
    });

    expect(view.result.current.canUndo).toBe(true);

    act(() => view.result.current.undo());
    expect(read()).toEqual([]);
  });

  it('recordAsync ignores an import that brought nothing in', async () => {
    const { view } = setupHistory([student('a')]);

    await act(async () => {
      await view.result.current.recordAsync(async () => []);
    });

    expect(view.result.current.canUndo).toBe(false);
  });

  describe('photo retention', () => {
    it('retains a deleted student’s photo while an undo can reach them', () => {
      const withPhoto = student('a', { hasPhoto: true });
      const { view, mutate } = setupHistory([withPhoto]);

      act(() => {
        view.result.current.record(() => mutate([]));
      });

      expect(sweepPhotoTrash).toHaveBeenLastCalledWith(['a']);
    });

    it('releases the photo once the step is gone from both stacks', () => {
      const { view, mutate } = setupHistory([student('a', { hasPhoto: true })]);

      act(() => {
        view.result.current.record(() => mutate([]));
      });
      act(() => view.result.current.resetHistory());

      expect(sweepPhotoTrash).toHaveBeenLastCalledWith([]);
    });

    it('keeps retaining the photo after an undo brought the student back', () => {
      const { view, mutate } = setupHistory([student('a', { hasPhoto: true })]);

      act(() => {
        view.result.current.record(() => mutate([]));
      });
      act(() => view.result.current.undo());

      // Live again, and the redo stack still holds the version without them.
      expect(sweepPhotoTrash).toHaveBeenLastCalledWith(['a']);
    });
  });
});
