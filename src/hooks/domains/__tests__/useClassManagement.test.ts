// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import type { ClassRecord } from '@/types';
import type { ISeatingPlanRepository } from '@/repositories';
import { ResultHelpers } from '@/repositories/types';
import { useClassManagement } from '../useClassManagement';

const record = (id: string, name: string): ClassRecord => ({
  id,
  name,
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: '2026-09-01T08:00:00.000Z',
  students: [],
  seatingHistory: [],
  mixHistory: [],
  currentSeating: [],
  lockedPositions: {},
  mixSettings: null,
  classroomScene: null,
  circleLayout: null,
});

/**
 * Records the order of repository calls and reloads. The class id must never
 * change ahead of the class data: the only way to another class is persisting
 * the choice and reloading, which sets both together.
 */
const setup = () => {
  const calls: string[] = [];
  const repository = {
    setActiveClass: vi.fn(async (classId: string) => {
      calls.push(`setActiveClass:${classId}`);
      return ResultHelpers.success(record(classId, 'Klasse B'));
    }),
    createClass: vi.fn(async () => {
      calls.push('createClass');
      return ResultHelpers.success(record('class-new', 'Neue Klasse'));
    }),
    duplicateClass: vi.fn(async () => {
      calls.push('duplicateClass');
      return ResultHelpers.success(record('class-copy', 'Klasse A Kopie'));
    }),
  } as unknown as ISeatingPlanRepository;
  const applyClassReload = vi.fn(async () => {
    calls.push('reload');
  });

  const { result } = renderHook(() =>
    useClassManagement({
      repository,
      classSummaries: [],
      activeClass: { id: 'class-a', name: 'Klasse A' },
      hasPendingStudentUpdates: false,
      hasUnsavedSeatingChanges: false,
      applyClassReload,
    }),
  );

  return { result, repository, calls };
};

describe('useClassManagement', () => {
  it('switches classes by persisting the choice, then reloading', async () => {
    const { result, calls } = setup();

    await act(async () => {
      await result.current.selectClass('class-b');
    });

    expect(calls).toEqual(['setActiveClass:class-b', 'reload']);
  });

  it('does nothing when the class is already open', async () => {
    const { result, calls } = setup();

    await act(async () => {
      await result.current.selectClass('class-a');
    });

    expect(calls).toEqual([]);
  });

  it('lets the reload open a class that was created as active', async () => {
    const { result, repository, calls } = setup();

    await act(async () => {
      await result.current.createClass({ name: 'Neue Klasse' });
    });

    expect(repository.createClass).toHaveBeenCalledWith(
      { name: 'Neue Klasse' },
      { activate: true },
    );
    expect(calls).toEqual(['createClass', 'reload']);
  });

  it('keeps the open class active after duplicating it', async () => {
    const { result, repository, calls } = setup();

    await act(async () => {
      await result.current.duplicateClass('class-a');
    });

    expect(calls).toEqual(['duplicateClass', 'reload']);
    expect(repository.setActiveClass).not.toHaveBeenCalled();
  });
});
