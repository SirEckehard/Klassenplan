// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Storage layer for the mixing presets (decision 0038): the teacher's own and
 * their changes to the shipped ones.
 *
 * One record for every class in the default keyval store under
 * `DB_KEYS.mixPresets`, so "delete all data" wipes it with the rest. It stays
 * out of the class record: a preset belongs to no class, and writes of the
 * open class belong to the persist queue alone.
 *
 * Reads that fail are logged and give no presets; a write that fails is
 * reported to the caller, because the teacher just saved something and has to
 * know it did not stick. Nothing is written while the stored record cannot be
 * read, and that is reported the same way.
 */
import { tryReadValue, tryWriteValue } from './idbClient';
import { DB_KEYS } from '@/utils/data/storageKeys';
import { hasIndexedDB } from '@/utils/data/indexedDb';
import {
  emptyMixPresetData,
  generateId,
  hasMixPresetData,
  isOriginalWeights,
  logError,
  logWarn,
  MAX_MIX_PRESETS,
  MIX_CRITERIA_VERSION,
  normalizeMixPresetData,
} from '@/utils';
import type {
  EditableMixRecipeId,
  MixPresetData,
  MixPresetWeights,
  OwnMixPreset,
} from '@/types';

const LOG_SOURCE = 'mixPresetStore';

/** Saves arrive a click apart; chaining keeps read-modify-writes ordered. */
let writeChain: Promise<unknown> = Promise.resolve();

type MixPresetListener = () => void;

const listeners = new Set<MixPresetListener>();

/**
 * Watch for changes to the presets. The criteria panel and "Bibliothek" both
 * show them, and either may change them.
 *
 * @returns Unsubscribe function
 */
export function subscribeToMixPresets(listener: MixPresetListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (error) {
      logError('Mix preset listener failed', { error }, LOG_SOURCE);
    }
  }
}

/**
 * The stored record, or `null` when it cannot be read: the read failed, or a
 * newer version of the app wrote it. A change must not start from an empty
 * record then — written back, it would drop every preset.
 */
async function readStoredData(): Promise<MixPresetData | null> {
  if (!hasIndexedDB()) return emptyMixPresetData();

  const result = await tryReadValue<MixPresetData>(DB_KEYS.mixPresets);
  if (!result.success) {
    logError('Failed to load mix presets', { error: result.error }, LOG_SOURCE);
    return null;
  }

  const stored = result.data;
  if (stored && typeof stored.version === 'number' && stored.version > 1) {
    logWarn(
      'Mix presets of a newer version left as they are',
      { version: stored.version },
      LOG_SOURCE,
    );
    return null;
  }
  return normalizeMixPresetData(stored);
}

/** The presets as stored; none when they cannot be read. */
export async function loadMixPresets(): Promise<MixPresetData> {
  return (await readStoredData()) ?? emptyMixPresetData();
}

/** Run `task` behind the chain; a failure counts as not written. */
function enqueue(task: () => Promise<boolean>): Promise<boolean> {
  const run = writeChain.then(async () => {
    if (!hasIndexedDB()) return false;
    try {
      return await task();
    } catch (error) {
      logError('Failed to update mix presets', { error }, LOG_SOURCE);
      return false;
    }
  });
  writeChain = run;
  return run;
}

async function writeData(next: MixPresetData): Promise<boolean> {
  const result = await tryWriteValue(DB_KEYS.mixPresets, next);
  if (!result.success) {
    logError('Failed to save mix presets', { error: result.error }, LOG_SOURCE);
    return false;
  }
  notifyListeners();
  return true;
}

/**
 * Run a read-modify-write behind the chain. Nothing is written while the
 * stored record cannot be read.
 *
 * @returns Whether the change was written (true when there was nothing to do)
 */
function mutate(
  change: (data: MixPresetData) => MixPresetData | null,
): Promise<boolean> {
  return enqueue(async () => {
    const data = await readStoredData();
    if (!data) return false;
    const next = change(data);
    return next ? writeData(next) : true;
  });
}

/**
 * Keep the weights as a preset of the teacher's own.
 *
 * @returns The preset as stored, or null when it was not written
 */
export async function addMixPreset(
  name: string,
  weights: MixPresetWeights,
): Promise<OwnMixPreset | null> {
  const preset: OwnMixPreset = {
    id: generateId(),
    name: name.trim(),
    weights: { ...weights },
    criteriaVersion: MIX_CRITERIA_VERSION,
    createdAt: new Date().toISOString(),
  };
  const written = await mutate((data) => ({
    ...data,
    presets: [...data.presets, preset],
  }));
  return written ? preset : null;
}

/**
 * Rename an own preset or give it new weights.
 *
 * @returns Whether the change was written; false for a preset that is gone
 */
export function updateMixPreset(
  id: string,
  changes: { name?: string; weights?: MixPresetWeights },
): Promise<boolean> {
  let found = false;
  return mutate((data) => {
    found = data.presets.some((preset) => preset.id === id);
    if (!found) return null;
    return {
      ...data,
      presets: data.presets.map((preset) =>
        preset.id === id
          ? {
              ...preset,
              ...(changes.name !== undefined && { name: changes.name.trim() }),
              ...(changes.weights && {
                weights: { ...changes.weights },
                criteriaVersion: MIX_CRITERIA_VERSION,
              }),
            }
          : preset,
      ),
    };
  }).then((written) => written && found);
}

/** Remove an own preset. */
export function deleteMixPreset(id: string): Promise<boolean> {
  return mutate((data) =>
    data.presets.some((preset) => preset.id === id)
      ? { ...data, presets: data.presets.filter((preset) => preset.id !== id) }
      : null,
  );
}

/**
 * Put an own preset back as it was, at `index` where it is gone, or take it
 * away with `null`; the others stay as they are.
 */
export function restoreOwnMixPreset(
  id: string,
  preset: OwnMixPreset | null,
  index: number,
): Promise<boolean> {
  return mutate((data) => {
    const standing = data.presets.findIndex((entry) => entry.id === id);
    const others = data.presets.filter((entry) => entry.id !== id);
    if (!preset) return { ...data, presets: others };
    const at = standing === -1 ? index : standing;
    return {
      ...data,
      presets: [...others.slice(0, at), preset, ...others.slice(at)],
    };
  });
}

/**
 * Change a shipped preset, or — with `null`, or the weights it ships with —
 * give it back its own ("Original wiederherstellen").
 */
export function setMixPresetOverride(
  id: EditableMixRecipeId,
  weights: MixPresetWeights | null,
): Promise<boolean> {
  return mutate((data) => {
    const overrides = { ...data.overrides };
    if (!weights || isOriginalWeights(id, weights)) {
      if (!overrides[id]) return null;
      delete overrides[id];
    } else {
      overrides[id] = {
        weights: { ...weights },
        criteriaVersion: MIX_CRITERIA_VERSION,
      };
    }
    return { ...data, overrides };
  });
}

/** The presets for embedding in a backup; undefined when there are none. */
export async function getMixPresetsForBackup(): Promise<
  MixPresetData | undefined
> {
  const data = await loadMixPresets();
  return hasMixPresetData(data) ? data : undefined;
}

/**
 * Restore the presets from a backup.
 *
 * A full import replaces them, as it replaces everything else. A merge keeps
 * what is here: an own preset of the backup joins when neither its id nor its
 * name is taken — as templates join — and while the device holds fewer than
 * `MAX_MIX_PRESETS`; a change to a shipped preset only where this device has
 * none. Resolves to the number of the backup's presets the limit kept out.
 */
export async function restoreMixPresets(
  value: MixPresetData | undefined,
  options?: { merge?: boolean },
): Promise<number> {
  const restored = normalizeMixPresetData(value);

  if (!options?.merge) {
    // Replaces the store, so nothing is read first.
    await enqueue(() => writeData(restored));
    return 0;
  }

  let leftOut = 0;
  await mutate((data) => {
    const ids = new Set(data.presets.map((preset) => preset.id));
    const names = new Set(data.presets.map((preset) => preset.name));
    const added: OwnMixPreset[] = [];
    leftOut = 0;
    for (const preset of restored.presets) {
      if (ids.has(preset.id) || names.has(preset.name)) continue;
      if (data.presets.length + added.length >= MAX_MIX_PRESETS) {
        leftOut += 1;
        continue;
      }
      ids.add(preset.id);
      names.add(preset.name);
      added.push(preset);
    }
    const overrides = { ...data.overrides };
    let overridden = false;
    for (const [id, override] of Object.entries(restored.overrides)) {
      const key = id as EditableMixRecipeId;
      if (overrides[key] || !override) continue;
      overrides[key] = override;
      overridden = true;
    }
    if (added.length === 0 && !overridden) return null;
    return { ...data, overrides, presets: [...data.presets, ...added] };
  });
  return leftOut;
}
