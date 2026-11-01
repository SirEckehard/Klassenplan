// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useStudentManagement } from '@/hooks/student/useStudentManagement';
import { TOAST_MESSAGES } from '@/utils/ui/toast';
import { createMockStudent } from '@/__tests__/utils/testHelpers';
import type { Student } from '@/types';

function setup(students: Student[]) {
  const addStudent = vi.fn((name: string) =>
    createMockStudent({ id: `new-${name}`, name }),
  );
  const hook = renderHook(() => useStudentManagement({ students, addStudent }));
  const add = (name: string) => {
    act(() => hook.result.current.setNewStudentName(name));
    act(() => hook.result.current.handleAddStudent());
  };
  return { hook, addStudent, add };
}

describe('useStudentManagement', () => {
  it('adds a student under a name the class does not have', () => {
    const { hook, addStudent, add } = setup([
      createMockStudent({ id: 'anna', name: 'Anna Berg' }),
    ]);

    add('  Ben Kurz ');

    expect(addStudent).toHaveBeenCalledWith('Ben Kurz');
    expect(hook.result.current.addProblem).toBeNull();
    expect(hook.result.current.newStudentName).toBe('');
  });

  it('refuses a name the class already has, whatever its case', () => {
    const { hook, addStudent, add } = setup([
      createMockStudent({ id: 'anna', name: 'Anna Berg' }),
    ]);

    add('anna berg');

    expect(addStudent).not.toHaveBeenCalled();
    expect(hook.result.current.addProblem).toBe(
      TOAST_MESSAGES.STUDENT_NAME_EXISTS,
    );
    // The name stays in the field, to be told apart.
    expect(hook.result.current.newStudentName).toBe('anna berg');
  });

  it('lets the refusal go once the name changes', () => {
    const { hook, add } = setup([
      createMockStudent({ id: 'anna', name: 'Anna Berg' }),
    ]);

    add('Anna Berg');
    act(() => hook.result.current.setNewStudentName('Anna Berg B.'));

    expect(hook.result.current.addProblem).toBeNull();
  });
});
