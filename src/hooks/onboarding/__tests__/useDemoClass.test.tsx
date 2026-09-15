// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import type { CreateClassPayload, Student } from '@/types';

const mocks = vi.hoisted(() => ({
  createClass: vi.fn(),
  classSummaries: [] as Array<{ id: string; name: string }>,
  saveStudentPhoto: vi.fn(),
  removeStudentPhoto: vi.fn(),
  renderDemoAvatarBlob: vi.fn(),
}));

vi.mock('@/contexts/seatingPlan/ClassManagementContext', () => ({
  useClassManagementContext: () => ({
    classSummaries: mocks.classSummaries,
    createClass: mocks.createClass,
  }),
}));
vi.mock('@/hooks/student/studentPhotoCache', () => ({
  saveStudentPhoto: mocks.saveStudentPhoto,
  removeStudentPhoto: mocks.removeStudentPhoto,
}));
vi.mock('@/utils/image/demoAvatar', () => ({
  renderDemoAvatarBlob: mocks.renderDemoAvatarBlob,
}));

import { useDemoClass } from '../useDemoClass';

const createdPayload = (): CreateClassPayload =>
  mocks.createClass.mock.calls[0][0] as CreateClassPayload;

const load = async (result: { current: ReturnType<typeof useDemoClass> }) => {
  let created = false;
  await act(async () => {
    created = await result.current.loadDemoClass();
  });
  return created;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.classSummaries.length = 0;
  mocks.createClass.mockResolvedValue(true);
  mocks.saveStudentPhoto.mockResolvedValue(undefined);
  mocks.removeStudentPhoto.mockResolvedValue(undefined);
  mocks.renderDemoAvatarBlob.mockResolvedValue(
    new Blob(['jpeg'], { type: 'image/jpeg' }),
  );
});

describe('useDemoClass', () => {
  it('creates the sample class as the active class, with its room and pictures', async () => {
    const { result } = renderHook(() => useDemoClass());

    await expect(load(result)).resolves.toBe(true);

    expect(mocks.createClass).toHaveBeenCalledTimes(1);
    expect(mocks.createClass.mock.calls[0][1]).toEqual({ activate: true });
    const payload = createdPayload();
    expect(payload.name).toBe(i18n.t('generator:demoClass.className'));
    expect(payload.students).toHaveLength(24);
    expect(payload.students?.every((student) => student.hasPhoto)).toBe(true);
    expect(payload.classroomScene?.tables.length).toBe(12);
  });

  it('stores every picture before the class that refers to it', async () => {
    const { result } = renderHook(() => useDemoClass());

    await load(result);

    const storedIds = mocks.saveStudentPhoto.mock.calls.map(([id]) => id);
    expect(storedIds).toEqual(
      createdPayload().students?.map((student: Student) => student.id),
    );
    const lastStore = Math.max(
      ...mocks.saveStudentPhoto.mock.invocationCallOrder,
    );
    expect(lastStore).toBeLessThan(
      mocks.createClass.mock.invocationCallOrder[0],
    );
  });

  it('picks a free name when a sample class already exists', async () => {
    const baseName = i18n.t('generator:demoClass.className');
    mocks.classSummaries.push({ id: 'class-1', name: baseName });
    const { result } = renderHook(() => useDemoClass());

    await load(result);

    expect(createdPayload().name).toBe(`${baseName} 2`);
  });

  it('marks only the students whose picture was stored', async () => {
    mocks.saveStudentPhoto.mockRejectedValueOnce(new Error('quota'));
    const { result } = renderHook(() => useDemoClass());

    await load(result);

    const students = createdPayload().students ?? [];
    expect(students.filter((student) => student.hasPhoto)).toHaveLength(23);
  });

  it('creates the class without pictures where none can be drawn', async () => {
    mocks.renderDemoAvatarBlob.mockResolvedValue(null);
    const { result } = renderHook(() => useDemoClass());

    await expect(load(result)).resolves.toBe(true);

    expect(mocks.saveStudentPhoto).not.toHaveBeenCalled();
    expect(createdPayload().students?.some((student) => student.hasPhoto)).toBe(
      false,
    );
  });

  it('removes the pictures again when the class is not created', async () => {
    mocks.createClass.mockResolvedValue(false);
    const { result } = renderHook(() => useDemoClass());

    await expect(load(result)).resolves.toBe(false);

    expect(mocks.removeStudentPhoto).toHaveBeenCalledTimes(24);
  });

  it('cleans up and reports failure when creating the class throws', async () => {
    mocks.createClass.mockRejectedValue(new Error('IndexedDB closed'));
    const { result } = renderHook(() => useDemoClass());

    await expect(load(result)).resolves.toBe(false);

    expect(mocks.removeStudentPhoto).toHaveBeenCalledTimes(24);
  });

  it('creates a single class when asked twice at once', async () => {
    const { result } = renderHook(() => useDemoClass());

    await act(async () => {
      await Promise.all([
        result.current.loadDemoClass(),
        result.current.loadDemoClass(),
      ]);
    });

    expect(mocks.createClass).toHaveBeenCalledTimes(1);
  });

  it('reports the load while it runs', async () => {
    let finishCreate: (created: boolean) => void = () => {};
    mocks.createClass.mockReturnValue(
      new Promise<boolean>((resolve) => {
        finishCreate = resolve;
      }),
    );
    const { result } = renderHook(() => useDemoClass());

    let pending: Promise<boolean> = Promise.resolve(false);
    act(() => {
      pending = result.current.loadDemoClass();
    });
    expect(result.current.isLoadingDemoClass).toBe(true);

    await act(async () => {
      await vi.waitFor(() => expect(mocks.createClass).toHaveBeenCalled());
      finishCreate(true);
      await pending;
    });
    expect(result.current.isLoadingDemoClass).toBe(false);
  });
});
