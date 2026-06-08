import { renderHook, act } from '@testing-library/react';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import { useStudentsState } from '../state/useStudentsState';
import { resetStudentStore } from '@/stores/studentsStore';
import { MAX_STUDENTS } from '@/utils';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';

vi.mock('@/utils/ui/toast', () => ({
  showToast: vi.fn(),
  TOAST_MESSAGES: {
    STUDENT_MAX_REACHED: 'STUDENT_MAX_REACHED',
  },
}));

beforeEach(() => {
  resetStudentStore();
  vi.clearAllMocks();
});

test('addStudent and removeStudent work correctly', () => {
  const { result } = renderHook(() => useStudentsState());

  act(() => {
    result.current.addStudent('Alice', 'girl');
  });

  expect(result.current.students).toHaveLength(1);
  const id = result.current.students[0]!.id;

  act(() => {
    result.current.removeStudent(id);
  });

  expect(result.current.students).toHaveLength(0);
});

test('addStudent defaults gender to undefined', () => {
  const { result } = renderHook(() => useStudentsState());

  act(() => {
    result.current.addStudent('Bob');
  });

  expect(result.current.students[0]?.gender).toBeUndefined();
});

describe('addBulkPlaceholderStudents', () => {
  test('creates correct number of placeholder students', () => {
    const { result } = renderHook(() => useStudentsState());

    act(() => {
      result.current.addBulkPlaceholderStudents(5);
    });

    expect(result.current.students).toHaveLength(5);
  });

  test('placeholder students have empty names and undefined gender', () => {
    const { result } = renderHook(() => useStudentsState());

    act(() => {
      result.current.addBulkPlaceholderStudents(3);
    });

    result.current.students.forEach((student) => {
      expect(student.name).toBe('');
      expect(student.gender).toBeUndefined();
    });
  });

  test('placeholder students have all flags set to false', () => {
    const { result } = renderHook(() => useStudentsState());

    act(() => {
      result.current.addBulkPlaceholderStudents(2);
    });

    result.current.students.forEach((student) => {
      expect(student.restless).toBe(false);
      expect(student.shy).toBe(false);
      expect(student.concentrationIssues).toBe(false);
      expect(student.needsFrontSeat).toBe(false);
      expect(student.performanceStrong).toBe(false);
      expect(student.performanceWeak).toBe(false);
      expect(student.wishPartnerId).toBeNull();
    });
  });

  test('each placeholder has unique ID', () => {
    const { result } = renderHook(() => useStudentsState());

    act(() => {
      result.current.addBulkPlaceholderStudents(10);
    });

    const ids = result.current.students.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);
  });

  test('adds placeholders to existing students', () => {
    const { result } = renderHook(() => useStudentsState());

    act(() => {
      result.current.addStudent('Alice', 'girl');
      result.current.addStudent('Bob', 'boy');
    });

    expect(result.current.students).toHaveLength(2);

    act(() => {
      result.current.addBulkPlaceholderStudents(3);
    });

    expect(result.current.students).toHaveLength(5);
    expect(result.current.students[0]?.name).toBe('Alice');
    expect(result.current.students[1]?.name).toBe('Bob');
    expect(result.current.students[2]?.name).toBe('');
  });

  test('returns array of created students', () => {
    const { result } = renderHook(() => useStudentsState());

    let createdStudents: ReturnType<
      typeof result.current.addBulkPlaceholderStudents
    > = [];

    act(() => {
      createdStudents = result.current.addBulkPlaceholderStudents(4);
    });

    expect(createdStudents).toHaveLength(4);
    expect(createdStudents[0]?.name).toBe('');
    expect(createdStudents[0]?.gender).toBeUndefined();
  });

  test('does not exceed MAX_STUDENTS when exceeding placeholder count', () => {
    const { result } = renderHook(() => useStudentsState());

    act(() => {
      for (let i = 0; i < MAX_STUDENTS - 2; i += 1) {
        result.current.addStudent(`Student ${i}`);
      }
    });

    act(() => {
      result.current.addBulkPlaceholderStudents(5);
    });

    expect(result.current.students).toHaveLength(MAX_STUDENTS);
    expect(showToast).toHaveBeenCalledWith(
      'error',
      TOAST_MESSAGES.STUDENT_MAX_REACHED,
    );
  });

  test('returns empty array when no placeholder slots remain', () => {
    const { result } = renderHook(() => useStudentsState());

    act(() => {
      result.current.addBulkPlaceholderStudents(MAX_STUDENTS);
    });

    let createdStudents: ReturnType<
      typeof result.current.addBulkPlaceholderStudents
    > = [];

    act(() => {
      createdStudents = result.current.addBulkPlaceholderStudents(2);
    });

    expect(createdStudents).toHaveLength(0);
    expect(showToast).toHaveBeenCalledWith(
      'error',
      TOAST_MESSAGES.STUDENT_MAX_REACHED,
    );
    expect(result.current.students).toHaveLength(MAX_STUDENTS);
  });
});
