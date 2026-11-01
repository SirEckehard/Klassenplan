// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { memory, photos } = vi.hoisted(() => ({
  memory: new Map<string, unknown>(),
  photos: new Map<string, Blob>(),
}));

vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);
vi.mock('@/repositories/studentPhotoStore', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/repositories/studentPhotoStore')
  >()),
  getAllPhotos: async () => ({ success: true as const, data: photos }),
}));

import '@/i18n';
import type { ClassRecord, MixResult, SavedPlan, Student } from '@/types';
import { exportAllAsJson } from '../dataBackup';
import { parseExportBundle } from '@/utils/validation/backupValidation';
import {
  BACKUP_LIMITS,
  BackupExportError,
} from '@/utils/validation/backupLimits';
import {
  buildDemoClassroomScene,
  buildDemoStudents,
} from '@/utils/demo/demoClass';
import {
  createClassCollection,
  createClassRecord,
} from '@/utils/data/classCollection';
import { generateId, neutralSettings } from '@/utils';

/** A student photo as the app stores it: a small JPEG of about 12 KB. */
const photoOfSize = (bytes: number) =>
  new Blob([new Uint8Array(bytes).fill(0xa5)], { type: 'image/jpeg' });

/**
 * One class after a school year of use: the sample class's 24 students with
 * photos, ten saved plans and the twenty mixes the history keeps.
 */
function busyClass(index: number, photoBytes: number): ClassRecord {
  const students = buildDemoStudents('de');
  const scene = buildDemoClassroomScene(students.length);
  const seating = scene.tables.map((table, tableIndex) =>
    Array.from(
      { length: table.seatCount },
      (_, seat) => students[tableIndex * table.seatCount + seat] ?? null,
    ),
  );
  const plans: SavedPlan[] = Array.from({ length: 10 }, (_, plan) => ({
    id: generateId(),
    name: `Plan ${plan + 1}`,
    date: '2026-10-01',
    seating,
    scene,
  }));
  const mixes: MixResult[] = Array.from({ length: 20 }, (_, mix) => ({
    id: mix + 1,
    timestamp: '2026-10-01T08:00:00.000Z',
    seating,
    mixSettings: neutralSettings,
  }));
  students.forEach((student) =>
    photos.set(student.id, photoOfSize(photoBytes)),
  );
  return createClassRecord({
    name: `Klasse ${index + 1}`,
    students,
    seatingHistory: plans,
    mixHistory: mixes,
    currentSeating: seating,
    classroomScene: scene,
    mixSettings: neutralSettings,
  });
}

function exportClasses(classes: ClassRecord[]) {
  const collection = createClassCollection(classes[0]);
  collection.classes = classes;
  const open = classes[0];
  return exportAllAsJson(
    {
      students: open.students,
      seatingHistory: open.seatingHistory,
      mixHistory: open.mixHistory,
      classroomScene: open.classroomScene!,
      mixSettings: neutralSettings,
      lockedPositions: {},
      classCollection: collection,
    },
    async () => [],
  );
}

describe('backup round trip', () => {
  beforeEach(() => {
    memory.clear();
    photos.clear();
  });

  // A subject teacher's school year: the backup the export writes is one the
  // import reads back, with every class and every photo.
  it('writes a busy school year into a backup the import reads', async () => {
    const classes = Array.from({ length: 30 }, (_, index) =>
      busyClass(index, 12 * 1024),
    );

    const json = await exportClasses(classes);

    expect(new TextEncoder().encode(json).length).toBeLessThan(
      BACKUP_LIMITS.decryptedJsonBytes,
    );
    const restored = parseExportBundle(json);
    expect(restored.classCollection?.classes).toHaveLength(30);
    expect(Object.keys(restored.studentPhotos ?? {})).toHaveLength(30 * 24);
  });

  it('refuses a backup too large for the import, with its size', async () => {
    // Photos as large as the import allows each one, far more than a class
    // list's: the content outgrows what the import takes.
    const classes = Array.from({ length: 16 }, (_, index) =>
      busyClass(index, 64 * 1024),
    );

    const refusal = await exportClasses(classes).catch((error) => error);

    expect(refusal).toBeInstanceOf(BackupExportError);
    expect(refusal).toMatchObject({
      reason: 'tooLarge',
      maxBytes: BACKUP_LIMITS.decryptedJsonBytes,
    });
    expect((refusal as BackupExportError).sizeBytes).toBeGreaterThan(
      BACKUP_LIMITS.decryptedJsonBytes,
    );
  });

  it('refuses a backup the import would reject', async () => {
    const crowded = busyClass(0, 1024);
    const extra: Student = { ...crowded.students[0], id: generateId() };
    crowded.students = Array.from(
      { length: BACKUP_LIMITS.maxStudents + 1 },
      (_, index) => ({ ...extra, id: `${extra.id}-${index}` }),
    );

    await expect(exportClasses([crowded])).rejects.toMatchObject({
      reason: 'notRestorable',
    });
  });

  // The two limits agree: content at the import's limit makes a file the
  // import's first check lets through.
  it('takes the encrypted file of content at its limit', () => {
    const base64 = Math.ceil((BACKUP_LIMITS.decryptedJsonBytes + 16) / 3) * 4;
    expect(BACKUP_LIMITS.encryptedFileBytes).toBeGreaterThan(base64 + 200);
  });
});
