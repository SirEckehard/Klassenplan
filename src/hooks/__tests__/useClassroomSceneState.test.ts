import { renderHook, act } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { useClassroomSceneState } from '../state/useClassroomSceneState';
import { DEFAULT_CLASSROOM_SCENE } from '@/utils';
import { resetLayoutStore } from '@/stores/layoutStore';

afterEach(() => {
  act(() => {
    resetLayoutStore();
  });
});

test('set and reset classroom scene', () => {
  const { result } = renderHook(() => useClassroomSceneState());
  const custom = { tables: [], totalStudents: 1 };

  act(() => {
    result.current.setClassroomScene(custom);
  });
  expect(result.current.classroomScene).toEqual(custom);

  act(() => {
    result.current.resetClassroomScene();
  });
  expect(result.current.classroomScene).toEqual(DEFAULT_CLASSROOM_SCENE);
});
