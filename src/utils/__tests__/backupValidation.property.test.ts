// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The promise behind `assertRestorable`, as a property: a backup written from
 * classes the app can hold is one the import reads, and it reads them back
 * seat for seat. A validator stricter than the app would let a teacher save a
 * backup that no device can restore.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { ClassRecord, ExportBundle } from '@/types';
import { neutralSettings, normalizeMixSettings } from '@/utils';
import { createClassCollection } from '@/utils/data/classCollection';
import { dehydrateExportBundle } from '@/utils/data/storedSeating';
import { parseExportBundle } from '@/utils/validation/backupValidation';
import { classRecordArb } from '@/__tests__/utils/arbitraries';

const RUNS = { numRuns: 200 };

/** The backup the export writes for these classes, the first one open. */
function backupOf(classes: ClassRecord[]): string {
  const open = classes[0]!;
  const collection = createClassCollection(open);
  collection.classes = classes;
  const bundle: ExportBundle = {
    version: 3,
    students: open.students,
    seatingHistory: open.seatingHistory,
    mixHistory: open.mixHistory,
    classroomScene: open.classroomScene!,
    mixSettings: normalizeMixSettings(
      open.mixSettings ?? undefined,
      neutralSettings,
    ),
    lockedPositions: open.lockedPositions,
    classroomTemplates: [],
    circleLayouts: [],
    currentCircleLayout: null,
    classCollection: collection,
  };
  return JSON.stringify(dehydrateExportBundle(bundle));
}

const seatIds = (record: ClassRecord) =>
  record.currentSeating.map((seats) =>
    seats.map((student) => student?.id ?? null),
  );

describe('a backup of the classes the app holds', () => {
  it('is read by the import, seat for seat', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(classRecordArb(), {
          minLength: 1,
          maxLength: 3,
          selector: (record) => record.id,
        }),
        (classes) => {
          const restored = parseExportBundle(backupOf(classes));
          const back = restored.classCollection!.classes as ClassRecord[];
          expect(back.map((record) => record.id)).toEqual(
            classes.map((record) => record.id),
          );
          back.forEach((record, index) => {
            expect(record.students.map((student) => student.id)).toEqual(
              classes[index]!.students.map((student) => student.id),
            );
            expect(seatIds(record)).toEqual(seatIds(classes[index]!));
          });
        },
      ),
      RUNS,
    );
  });
});
