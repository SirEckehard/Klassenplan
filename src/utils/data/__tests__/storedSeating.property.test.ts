// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Decision 0035 as properties: a class written as ids and read back is the
 * class it was — every seat of the open room, the plans, the mixes and the
 * parked rooms — and so is a backup.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { ClassCollectionState, ClassRecord, ExportBundle } from '@/types';
import { DEFAULT_MIX_WEIGHTS } from '@/utils';
import {
  dehydrateCollection,
  dehydrateExportBundle,
  hydrateCollection,
  hydrateExportBundle,
} from '@/utils/data/storedSeating';
import { classRecordArb } from '@/__tests__/utils/arbitraries';

const RUNS = { numRuns: 200 };

const collectionArb = fc
  .array(classRecordArb(), { minLength: 1, maxLength: 3 })
  .map((classes): ClassCollectionState => ({
    version: 1,
    activeClassId: classes[0]!.id,
    classes,
  }));

describe('stored seats', () => {
  it('reads back the collection it wrote', () => {
    fc.assert(
      fc.property(collectionArb, (collection) => {
        expect(hydrateCollection(dehydrateCollection(collection))).toEqual(
          collection,
        );
      }),
      RUNS,
    );
  });

  it('writes no student onto a seat, only ids', () => {
    fc.assert(
      fc.property(collectionArb, (collection) => {
        const stored = dehydrateCollection(collection);
        for (const record of stored.classes as ClassRecord[]) {
          const seats = [
            record.currentSeating,
            ...record.seatingHistory.map((plan) => plan.seating),
            ...record.mixHistory.map((mix) => mix.seating),
          ].flat(2);
          for (const seat of seats) {
            expect(seat === null || typeof seat === 'string').toBe(true);
          }
        }
      }),
      RUNS,
    );
  });

  it('reads back the backup it wrote', () => {
    fc.assert(
      fc.property(collectionArb, (collection) => {
        const open = collection.classes[0] as ClassRecord;
        const bundle: ExportBundle = {
          version: 3,
          students: open.students,
          seatingHistory: open.seatingHistory,
          mixHistory: open.mixHistory,
          classroomScene: open.classroomScene!,
          mixSettings: { ...DEFAULT_MIX_WEIGHTS },
          lockedPositions: {},
          classroomTemplates: [],
          circleLayouts: [],
          currentCircleLayout: null,
          classCollection: collection as ExportBundle['classCollection'],
        };
        expect(hydrateExportBundle(dehydrateExportBundle(bundle))).toEqual(
          bundle,
        );
      }),
      RUNS,
    );
  });
});
