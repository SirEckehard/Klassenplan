// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findMixRecipe, fullRecipeWeights } from '@/utils';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));
vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);

import { get, set } from 'idb-keyval';
import {
  addMixPreset,
  deleteMixPreset,
  getMixPresetsForBackup,
  loadMixPresets,
  restoreMixPresets,
  restoreOwnMixPreset,
  setMixPresetOverride,
  subscribeToMixPresets,
  updateMixPreset,
} from '../mixPresetStore';

const exam = fullRecipeWeights(findMixRecipe('exam')!.weights);

beforeEach(() => {
  memory.clear();
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mixPresetStore', () => {
  it('holds nothing until the teacher saves a preset', async () => {
    expect(await loadMixPresets()).toEqual({
      version: 1,
      overrides: {},
      presets: [],
    });
    expect(await getMixPresetsForBackup()).toBeUndefined();
  });

  it('keeps, renames and removes an own preset', async () => {
    const preset = await addMixPreset(' Stillarbeit ', exam);
    expect(preset).toMatchObject({ name: 'Stillarbeit', weights: exam });

    expect(
      await updateMixPreset(preset!.id, {
        name: 'Lesezeit',
        weights: { ...exam, avoidShyAlone: 5 },
      }),
    ).toBe(true);
    const renamed = (await loadMixPresets()).presets[0]!;
    expect(renamed.name).toBe('Lesezeit');
    expect(renamed.weights.avoidShyAlone).toBe(5);

    expect(await deleteMixPreset(preset!.id)).toBe(true);
    expect((await loadMixPresets()).presets).toEqual([]);
  });

  it('says so when the preset to change is gone', async () => {
    expect(await updateMixPreset('gone', { name: 'X' })).toBe(false);
  });

  it('changes a shipped preset and gives it back its own', async () => {
    await setMixPresetOverride('exam', { ...exam, preferGenderMix: 5 });
    expect(
      (await loadMixPresets()).overrides.exam?.weights.preferGenderMix,
    ).toBe(5);

    // The original weights are no change at all.
    await setMixPresetOverride('exam', exam);
    expect((await loadMixPresets()).overrides).toEqual({});

    await setMixPresetOverride('exam', { ...exam, preferGenderMix: 5 });
    await setMixPresetOverride('exam', null);
    expect((await loadMixPresets()).overrides).toEqual({});
  });

  it('tells its listeners about every write', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToMixPresets(listener);

    await addMixPreset('Stillarbeit', exam);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await addMixPreset('Lesezeit', exam);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('leaves a record of a newer version alone', async () => {
    await set('spg.mixPresets', { version: 2, presets: [] });

    expect(await addMixPreset('Stillarbeit', exam)).toBeNull();
    expect(await get('spg.mixPresets')).toEqual({ version: 2, presets: [] });
  });

  it('replaces everything on a full restore', async () => {
    await addMixPreset('Hier', exam);

    await restoreMixPresets({
      version: 1,
      overrides: {},
      presets: [
        {
          id: 'b',
          name: 'Aus dem Backup',
          weights: exam,
          criteriaVersion: 2,
          createdAt: '',
        },
      ],
    });

    expect((await loadMixPresets()).presets.map((p) => p.name)).toEqual([
      'Aus dem Backup',
    ]);
  });

  it('adds only what is free on a merge', async () => {
    const here = await addMixPreset('Hier', exam);
    await setMixPresetOverride('exam', { ...exam, preferGenderMix: 5 });

    await restoreMixPresets(
      {
        version: 1,
        overrides: {
          exam: {
            weights: { ...exam, preferGenderMix: 9 },
            criteriaVersion: 2,
          },
          quietWork: { weights: exam, criteriaVersion: 2 },
        },
        presets: [
          { ...here!, name: 'Gleiche Id' },
          {
            id: 'x',
            name: 'Hier',
            weights: exam,
            criteriaVersion: 2,
            createdAt: '',
          },
          {
            id: 'y',
            name: 'Neu',
            weights: exam,
            criteriaVersion: 2,
            createdAt: '',
          },
        ],
      },
      { merge: true },
    );

    const data = await loadMixPresets();
    expect(data.presets.map((p) => p.name)).toEqual(['Hier', 'Neu']);
    // The change made here stays; the one this device lacked joins.
    expect(data.overrides.exam?.weights.preferGenderMix).toBe(5);
    expect(data.overrides.quietWork).toBeDefined();
  });

  it('puts one own preset back in its place and leaves the others', async () => {
    const a = await addMixPreset('A', exam);
    const b = await addMixPreset('B', exam);
    const c = await addMixPreset('C', exam);
    await deleteMixPreset(b!.id);

    expect(await restoreOwnMixPreset(b!.id, b, 1)).toBe(true);
    expect((await loadMixPresets()).presets).toEqual([a, b, c]);

    // Standing, it stays where it stands.
    await restoreOwnMixPreset(b!.id, { ...b!, name: 'B2' }, 0);
    expect((await loadMixPresets()).presets.map((p) => p.name)).toEqual([
      'A',
      'B2',
      'C',
    ]);

    await restoreOwnMixPreset(b!.id, null, 1);
    expect((await loadMixPresets()).presets).toEqual([a, c]);
  });
});
