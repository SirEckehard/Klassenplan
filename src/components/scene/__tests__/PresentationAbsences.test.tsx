// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Decision 0045: the seat of a student missing today stays and is veiled.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ClassroomScene, ClassroomTable } from '@/types';
import { createMockStudent } from '@/__tests__/utils';
import PresentationScene from '../PresentationScene';

const table: ClassroomTable = {
  x: 400,
  y: 200,
  width: 55,
  height: 130,
  rotation: 0,
  seatCount: 2,
  locked: false,
  zIndex: 0,
  templateType: 'double',
};
const scene: ClassroomScene = { tables: [table], totalStudents: 2 };
const ada = createMockStudent({ id: 'ada', name: 'Ada' });
const ben = createMockStudent({ id: 'ben', name: 'Ben' });

describe('PresentationScene', () => {
  it('veils the seats of students missing today, and only those', () => {
    const { container } = render(
      <PresentationScene
        scene={scene}
        seating={[[ada, ben]]}
        students={[ada, ben]}
        perspective="teacher"
        absentIds={new Set(['ben'])}
      />,
    );

    const veils = container.querySelectorAll('[data-absent]');
    expect(veils).toHaveLength(1);
    expect(veils[0]!.getAttribute('data-absent')).toBe('ben');
    expect(veils[0]!.getAttribute('pointer-events')).toBe('none');
  });

  it('veils nothing while everybody is there', () => {
    const { container } = render(
      <PresentationScene
        scene={scene}
        seating={[[ada, ben]]}
        students={[ada, ben]}
        perspective="teacher"
      />,
    );

    expect(container.querySelectorAll('[data-absent]')).toHaveLength(0);
  });
});
