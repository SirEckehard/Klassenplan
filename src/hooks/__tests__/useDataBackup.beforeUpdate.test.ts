// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The classes from before the switch to a key per class (decision 0049)
 * come back as a backup does with "Alles ersetzen": everything stays as it
 * is now but the classes, which are the copy's.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassCollectionState } from '@/types';
import { createMockStudent } from '@/__tests__/utils';
import { createClassRecord } from '@/utils/data/classCollection';
import * as toastModule from '@/utils/ui/toast';

const { repository, confirmDialog } = vi.hoisted(() => ({
  repository: {
    loadRetiredClasses: vi.fn(),
    loadClassCollection: vi.fn(),
  },
  confirmDialog: vi.fn(),
}));
vi.mock('@/hooks/useSeatingRepository', () => ({
  useSeatingRepository: () => repository,
}));
vi.mock('@/services/ui/dialogs', () => ({ confirmDialog }));

import useDataBackup from '../useDataBackup';

const showToast = vi.spyOn(toastModule, 'showToast');

const collectionOf = (...names: string[]): ClassCollectionState => {
  const classes = names.map((name) =>
    createClassRecord({
      name,
      students: [createMockStudent({ name: `${name} Mia` })],
    }),
  );
  return { version: 3, activeClassId: classes[0]!.id, classes };
};

describe('restoring the classes from before the update', () => {
  const now = collectionOf('7a', '9c');
  const older = collectionOf('8b');
  const before: ClassCollectionState = {
    ...now,
    classes: [now.classes[0]!, ...older.classes],
  };
  const exportAllAsJson = vi.fn();
  const importAllFromJson = vi.fn();

  const restore = async () => {
    const { result } = renderHook(() =>
      useDataBackup({ exportAllAsJson, importAllFromJson }),
    );
    await act(() => result.current.restoreClassesFromBeforeUpdate());
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository.loadClassCollection.mockResolvedValue({
      success: true,
      data: now,
    });
    repository.loadRetiredClasses.mockResolvedValue({
      success: true,
      data: {
        collection: before,
        retiredAt: '2026-11-20T08:00:00.000Z',
        keptUntil: '2026-12-20T08:00:00.000Z',
      },
    });
    exportAllAsJson.mockResolvedValue(
      JSON.stringify({ version: 3, classroomTemplates: ['kept'] }),
    );
    importAllFromJson.mockResolvedValue({ merge: false });
  });

  it('replaces the classes and keeps everything else', async () => {
    confirmDialog.mockResolvedValue(true);

    await restore();

    expect(importAllFromJson).toHaveBeenCalledTimes(1);
    const [json, options] = importAllFromJson.mock.calls[0]!;
    const bundle = JSON.parse(json as string);
    expect(options).toEqual({ merge: false });
    expect(bundle.classroomTemplates).toEqual(['kept']);
    expect(
      bundle.classCollection.classes.map(
        (entry: { name: string }) => entry.name,
      ),
    ).toEqual(['7a', '8b']);
    expect(showToast).toHaveBeenCalledWith(
      'success',
      'toast:backup.beforeUpdateRestored',
    );
  });

  it('compares the classes there are now with those from before', async () => {
    confirmDialog.mockResolvedValue(false);

    await restore();

    const [question] = confirmDialog.mock.calls[0]!;
    expect(question.comparison.columns).toEqual(['Jetzt', 'Vor dem Update']);
    expect(question.comparison.rows[0]).toEqual({
      label: 'Klassen',
      counts: [2, 2],
    });
    expect(question.comparison.notes).toEqual([
      'Nur jetzt: 9c',
      'Nur vor dem Update: 8b',
    ]);
    expect(importAllFromJson).not.toHaveBeenCalled();
  });

  it('says so when the copy is gone', async () => {
    repository.loadRetiredClasses.mockResolvedValue({
      success: true,
      data: null,
    });

    await restore();

    expect(confirmDialog).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      'info',
      'toast:backup.beforeUpdateGone',
    );
  });
});
