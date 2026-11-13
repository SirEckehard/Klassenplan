// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));
vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);
vi.mock('@/services/ui/dialogs', () => ({ confirmDialog: vi.fn() }));

import '@/i18n';
import { get, set } from 'idb-keyval';
import { createMockClassroomScene } from '@/__tests__/utils';
import { loadMixPresets } from '@/repositories/mixPresetStore';
import { confirmDialog } from '@/services/ui/dialogs';
import type { ClassroomTemplate } from '@/types';
import { fullRecipeWeights } from '@/utils';
import { DB_KEYS } from '@/utils/data/storageKeys';
import * as toastModule from '@/utils/ui/toast';
import {
  subscribeToSharedImports,
  useShareFiles,
  type SharedImport,
} from '../useShareFiles';

const confirmMock = vi.mocked(confirmDialog);

const open = () => renderHook(() => useShareFiles()).result.current;

beforeEach(() => {
  memory.clear();
  vi.stubGlobal('indexedDB', {});
  confirmMock.mockReset().mockResolvedValue(true);
  vi.spyOn(toastModule, 'showToast').mockImplementation(() => '');
  vi.spyOn(toastModule, 'announce').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useShareFiles', () => {
  it('adds a room template beside one of the same name, and says so', async () => {
    const scene = createMockClassroomScene();
    await set(DB_KEYS.classroomTemplates, [
      { id: 1, name: 'Raum 204', scene },
    ] satisfies ClassroomTemplate[]);
    const added: SharedImport[] = [];
    const stop = subscribeToSharedImports((entry) => {
      added.push(entry);
      return false;
    });

    await open().openSharedFile({ kind: 'template', name: 'Raum 204', scene });
    stop();

    const templates = (await get(
      DB_KEYS.classroomTemplates,
    )) as ClassroomTemplate[];
    expect(templates.map((entry) => entry.name)).toEqual([
      'Raum 204',
      'Raum 204 (2)',
    ]);
    expect(templates[1]?.scene).toEqual(scene);
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Raum 204 (2)'),
        tone: 'primary',
      }),
    );
    expect(added).toEqual([{ kind: 'template', templateId: templates[1]?.id }]);
    // No view on screen shows it, so a toast does.
    expect(toastModule.showToast).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Raum 204 (2)'),
    );
  });

  it('adds a preset as the teacher’s own, never under a shipped name', async () => {
    const weights = fullRecipeWeights({ avoidRestlessTogether: 9 });
    const stop = subscribeToSharedImports(() => true);

    await open().openSharedFile({
      kind: 'preset',
      name: 'Ruhige Arbeitsphase',
      weights,
    });
    stop();

    const { presets } = await loadMixPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0]).toMatchObject({
      name: 'Ruhige Arbeitsphase (2)',
      weights,
    });
    // "Bibliothek" chose it, so the words are only said.
    expect(toastModule.announce).toHaveBeenCalled();
    expect(toastModule.showToast).not.toHaveBeenCalled();
  });

  it('adds nothing when the question is declined', async () => {
    confirmMock.mockResolvedValue(false);
    const files = open();

    await files.openSharedFile({
      kind: 'template',
      name: 'Raum 204',
      scene: createMockClassroomScene(),
    });
    await files.openSharedFile({
      kind: 'preset',
      name: 'Laut',
      weights: fullRecipeWeights({}),
    });

    expect(await get(DB_KEYS.classroomTemplates)).toBeUndefined();
    expect((await loadMixPresets()).presets).toEqual([]);
  });
});
