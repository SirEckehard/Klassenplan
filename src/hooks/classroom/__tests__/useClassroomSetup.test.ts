// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ClassroomScene } from '@/types';
import { createMockStudents } from '@/__tests__/utils';
import { DEFAULT_CLASSROOM_SCENE } from '@/utils';
import { announce } from '@/utils/ui/toast';
import { useClassroomSetup } from '../useClassroomSetup';

vi.mock('@/utils/ui/toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/ui/toast')>()),
  announce: vi.fn(),
}));

/** The hook over a scene that keeps what each setup writes. */
const setup = (selectedTemplate: number | null = null) => {
  let scene: ClassroomScene = { ...DEFAULT_CLASSROOM_SCENE };
  const setClassroomScene = vi.fn(
    (next: ClassroomScene | ((prev: ClassroomScene) => ClassroomScene)) => {
      scene = typeof next === 'function' ? next(scene) : next;
    },
  );
  const hook = renderHook(() =>
    useClassroomSetup({
      students: createMockStudents(24),
      templates: [],
      classroomScene: scene,
      setClassroomScene,
      selectedTemplate,
      disableAutoGeneration: true,
    }),
  );
  return { ...hook, setClassroomScene, scene: () => scene };
};

describe('useClassroomSetup', () => {
  it('sets the room up with as many tables of a kind as the class needs', () => {
    const { result, scene } = setup();

    act(() => result.current.handleSetUp('group4'));

    expect(scene().tables).toHaveLength(6);
    expect(scene().totalStudents).toBe(24);
    // The board stays where it hangs.
    expect(scene().features).toEqual(DEFAULT_CLASSROOM_SCENE.features);
  });

  it('builds an arrangement', () => {
    const { result, scene } = setup();

    act(() => result.current.handleSetUp('horseshoe'));

    expect(scene().tables.reduce((sum, t) => sum + t.seatCount, 0)).toBe(24);
    expect(announce).not.toHaveBeenCalled();
  });

  it('says what chance put together, a new room every time', () => {
    const { result, scene } = setup();
    vi.mocked(announce).mockClear();

    const rooms: string[] = [];
    for (let round = 0; round < 4; round++) {
      act(() => result.current.handleSetUp('random'));
      rooms.push(JSON.stringify(scene().tables));
    }

    const said = vi.mocked(announce).mock.calls.map(([message]) => message);
    expect(said).toHaveLength(4);
    said.forEach((message) =>
      expect(message).toMatch(
        /^(Zufällig zusammengestellt|Put together at random): \S/,
      ),
    );
    expect(new Set(rooms).size).toBe(4);
  });

  it('leaves a loaded template alone unless forced', () => {
    const { result, setClassroomScene } = setup(7);

    act(() => result.current.handleSetUp('arena'));
    expect(setClassroomScene).not.toHaveBeenCalled();

    act(() => result.current.handleSetUp('arena', true));
    expect(setClassroomScene).toHaveBeenCalledTimes(1);
  });
});
