// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import type { ClassCollectionState, ClassRecord } from '@/types';
import { MAX_NAME_LENGTH } from '@/utils';
import { mergeClassCollections } from '../classCollection';

const record = (id: string, name: string): ClassRecord => ({
  id,
  name,
  createdAt: '2026-10-04T08:00:00.000Z',
  updatedAt: '2026-10-04T08:00:00.000Z',
  students: [],
  seatingHistory: [],
  mixHistory: [],
  currentSeating: [],
  lockedPositions: {},
  mixSettings: null,
  classroomScene: null,
  circleLayout: null,
});

const collection = (
  classes: ClassRecord[],
  activeClassId: string | null = classes[0]?.id ?? null,
): ClassCollectionState => ({ version: 1, activeClassId, classes });

describe('mergeClassCollections', () => {
  it('adds the incoming classes after the ones here and keeps the open one', () => {
    const here = collection([record('a', '7a'), record('b', '7b')], 'b');
    const { collection: merged, addedClassIds } = mergeClassCollections(
      here,
      collection([record('c', '8c')], 'c'),
    );

    expect(merged.classes.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
    expect(merged.activeClassId).toBe('b');
    expect(addedClassIds).toEqual(['c']);
  });

  it('leaves out a class whose id is here and keeps the version here', () => {
    const mine = { ...record('a', '7a'), notes: 'mine' };
    const here = collection([mine]);
    const { collection: merged, addedClassIds } = mergeClassCollections(
      here,
      collection([{ ...record('a', '7a'), notes: 'older' }]),
    );

    expect(addedClassIds).toEqual([]);
    expect(merged).toBe(here);
  });

  it('numbers a name that is taken, also among the incoming classes', () => {
    const { collection: merged } = mergeClassCollections(
      collection([record('a', '7a')]),
      collection([record('b', '7A'), record('c', '7a')]),
    );

    expect(merged.classes.map((entry) => entry.name)).toEqual([
      '7a',
      '7A (2)',
      '7a (3)',
    ]);
  });

  it('keeps a numbered name within the length a class name may have', () => {
    const long = 'K'.repeat(MAX_NAME_LENGTH);
    const { collection: merged } = mergeClassCollections(
      collection([record('a', long)]),
      collection([record('b', long)]),
    );

    expect(merged.classes[1].name).toHaveLength(MAX_NAME_LENGTH);
    expect(merged.classes[1].name.endsWith(' (2)')).toBe(true);
  });

  it('opens the incoming open class where no class was open', () => {
    const { collection: merged } = mergeClassCollections(
      collection([]),
      collection([record('a', '5a'), record('b', '5b')], 'b'),
    );

    expect(merged.activeClassId).toBe('b');
  });
});
