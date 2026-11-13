// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  buildPresetFile,
  buildTemplateFile,
  readSharedFile,
  SHARE_FILE_MAX_BYTES,
  sharedFileName,
} from '../shareFiles';
import {
  fullRecipeWeights,
  MIX_CRITERIA_VERSION,
  SCALAR_MIX_SETTING_KEYS,
} from '@/utils';
import { sceneArb } from '@/__tests__/utils/arbitraries';
import { createMockClassroomScene } from '@/__tests__/utils';
import type { MixPresetWeights } from '@/types';

const read = (json: string) => readSharedFile(JSON.parse(json), json.length);

const weightsArb: fc.Arbitrary<MixPresetWeights> = fc
  .tuple(...SCALAR_MIX_SETTING_KEYS.map(() => fc.integer({ min: 0, max: 10 })))
  .map((values) =>
    fullRecipeWeights(
      Object.fromEntries(
        SCALAR_MIX_SETTING_KEYS.map((key, index) => [key, values[index]]),
      ),
    ),
  );

const nameArb = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((name) => name.trim() !== '')
  .map((name) => name.trim());

describe('shareFiles', () => {
  it('reads back every room template it writes', () => {
    fc.assert(
      fc.property(nameArb, sceneArb(), (name, scene) => {
        expect(read(buildTemplateFile({ name, scene }))).toEqual({
          kind: 'template',
          name,
          scene,
        });
      }),
      { numRuns: 200 },
    );
  });

  it('reads back every preset it writes', () => {
    fc.assert(
      fc.property(nameArb, weightsArb, (name, weights) => {
        expect(read(buildPresetFile({ name, weights }))).toEqual({
          kind: 'preset',
          name,
          weights,
        });
      }),
      { numRuns: 200 },
    );
  });

  it('carries the format, its version and what the weights mean', () => {
    const json = JSON.parse(
      buildPresetFile(
        { name: 'Ruhig', weights: fullRecipeWeights({}) },
        new Date('2026-11-13T08:00:00.000Z'),
      ),
    );
    expect(json).toMatchObject({
      format: 'klassenplan-mix-preset',
      version: 1,
      savedAt: '2026-11-13T08:00:00.000Z',
      preset: { name: 'Ruhig', criteriaVersion: MIX_CRITERIA_VERSION },
    });
  });

  it('leaves a backup and anything else to the restore', () => {
    expect(
      readSharedFile({ encrypted: true, iv: 'a', salt: 'b', data: 'c' }),
    ).toBeNull();
    expect(readSharedFile([])).toBeNull();
    expect(readSharedFile('text')).toBeNull();
    expect(readSharedFile(null)).toBeNull();
  });

  it('says a template file without a scene is unreadable', () => {
    expect(() =>
      readSharedFile({
        format: 'klassenplan-room-template',
        version: 1,
        template: { name: 'Raum 204' },
      }),
    ).toThrow('toast:sharedFile.unreadable');
    expect(() =>
      readSharedFile({
        format: 'klassenplan-room-template',
        version: 1,
        template: { name: '', scene: createMockClassroomScene() },
      }),
    ).toThrow('toast:sharedFile.unreadable');
  });

  it('says a preset with a weight out of range is unreadable', () => {
    expect(() =>
      readSharedFile({
        format: 'klassenplan-mix-preset',
        version: 1,
        preset: { name: 'Laut', weights: { avoidRestlessTogether: 99 } },
      }),
    ).toThrow('toast:sharedFile.unreadable');
    expect(() =>
      readSharedFile({
        format: 'klassenplan-mix-preset',
        version: 1,
        preset: { name: '  ', weights: {} },
      }),
    ).toThrow('toast:sharedFile.unreadable');
  });

  it('says a file of a newer app is not this one’s to read', () => {
    expect(() =>
      readSharedFile({
        format: 'klassenplan-room-template',
        version: 2,
        template: { name: 'Raum 204', scene: createMockClassroomScene() },
      }),
    ).toThrow('toast:sharedFile.newer');
    expect(() =>
      readSharedFile({ format: 'klassenplan-table-cards', version: 1 }),
    ).toThrow('toast:sharedFile.newer');
  });

  it('refuses a file far larger than any room', () => {
    const json = buildTemplateFile({
      name: 'Raum 204',
      scene: createMockClassroomScene(),
    });
    expect(() =>
      readSharedFile(JSON.parse(json), SHARE_FILE_MAX_BYTES + 1),
    ).toThrow('toast:sharedFile.tooLarge');
  });

  it('fills missing criteria with nothing, as the store reads a preset', () => {
    const shared = readSharedFile({
      format: 'klassenplan-mix-preset',
      version: 1,
      preset: {
        name: 'Nur Unruhe',
        weights: { avoidRestlessTogether: 7 },
        criteriaVersion: MIX_CRITERIA_VERSION,
      },
    });
    expect(shared).toMatchObject({ kind: 'preset', name: 'Nur Unruhe' });
    if (shared?.kind !== 'preset') throw new Error('no preset');
    expect(shared.weights.avoidRestlessTogether).toBe(7);
    expect(shared.weights.keepNeighbourSeatFree).toBe(0);
  });

  it('names the file after what it is and the entry, as Windows allows', () => {
    expect(sharedFileName('Raumvorlage', 'Raum 204')).toBe(
      'Raumvorlage Raum 204.klassenplan',
    );
    expect(sharedFileName('Voreinstellung', 'Mathe: 7/8 "ruhig"')).toBe(
      'Voreinstellung Mathe_ 7_8 _ruhig_.klassenplan',
    );
  });
});
