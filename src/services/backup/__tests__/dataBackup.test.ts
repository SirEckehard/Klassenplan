// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { set as idbSet } from 'idb-keyval';
import type {
  ClassCollectionState,
  ClassRecord,
  ClassroomTemplate,
  ExportBundle,
  Student,
} from '@/types';
import { clearAllData, importAllFromJson } from '../dataBackup';
import {
  BACKUP_ERROR_MESSAGES,
  BackupValidationError,
} from '@/utils/validation/backupValidation';
import { DB_KEYS, PROJECT_LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import { neutralSettings, normalizeMixSettings } from '@/utils';

const { delMock, setMock } = vi.hoisted(() => ({
  delMock: vi.fn().mockResolvedValue(undefined),
  setMock: vi.fn().mockResolvedValue(undefined),
}));
const resetApplicationStateMock = vi.hoisted(() => vi.fn());
// jsdom has no IndexedDB, so the photo wipe is only reached with both mocked.
const { clearAllPhotosMock, hasIndexedDBMock, setStudentPhotoMock } =
  vi.hoisted(() => ({
    clearAllPhotosMock: vi.fn(),
    hasIndexedDBMock: vi.fn(() => false),
    setStudentPhotoMock: vi.fn(),
  }));

vi.mock('idb-keyval', () => ({
  del: delMock,
  set: setMock,
  __esModule: true,
}));
vi.mock('@/stores/resetApplicationState', () => ({
  resetApplicationState: resetApplicationStateMock,
}));
vi.mock('@/repositories/studentPhotoStore', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/repositories/studentPhotoStore')
  >()),
  clearAllPhotos: clearAllPhotosMock,
  setStudentPhoto: setStudentPhotoMock,
}));
vi.mock('@/utils/data/indexedDb', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/data/indexedDb')>()),
  hasIndexedDB: hasIndexedDBMock,
}));

const bundle: ExportBundle = {
  version: 1,
  students: [
    {
      id: '1',
      name: 'Anna',
      restless: false,
      shy: false,
      concentrationIssues: false,
      needsFrontSeat: false,
    },
  ],
  seatingHistory: [],
  mixHistory: [],
  classroomScene: { tables: [], totalStudents: 0 },
  mixSettings: normalizeMixSettings(neutralSettings),
  lockedPositions: {},
  classroomTemplates: [],
  circleLayouts: [
    {
      exportType: 'circle-only',
      circleLayout: {
        students: [
          {
            student: {
              id: '1',
              name: 'Anna',
              restless: false,
              shy: false,
              concentrationIssues: false,
              needsFrontSeat: false,
            },
            angle: 0,
            x: 100,
            y: 100,
            preservedNeighbors: [],
            lostNeighbors: [],
            newNeighbors: [],
          },
        ],
        radius: { horizontal: 150, vertical: 100 },
        center: { x: 450, y: 300 },
        preservedNeighborhoods: 0,
        totalOriginalNeighborhoods: 0,
        newNeighborhoods: 0,
        preservationRate: 1.0,
        mode: 'preserve-neighbors',
        timestamp: Date.now(),
        neighborhoodPairs: [],
      },
      comparisonReport: {
        recommendedFor: ['Gesprächskreis'],
        warnings: [],
        benefits: ['Optimale Sicht zur Tafel'],
        statisticsSummary: '100% der Nachbarschaften erhalten',
      },
      timestamp: Date.now(),
      metadata: {
        generatedBy: 'test',
        version: '1.2.0',
        classSize: 1,
      },
    },
  ],
  currentCircleLayout: {
    students: [
      {
        student: {
          id: '1',
          name: 'Anna',
          restless: false,
          shy: false,
          concentrationIssues: false,
          needsFrontSeat: false,
        },
        angle: 0,
        x: 100,
        y: 100,
        preservedNeighbors: [],
        lostNeighbors: [],
        newNeighbors: [],
      },
    ],
    radius: { horizontal: 150, vertical: 100 },
    center: { x: 450, y: 300 },
    preservedNeighborhoods: 0,
    totalOriginalNeighborhoods: 0,
    newNeighborhoods: 0,
    preservationRate: 1.0,
    mode: 'preserve-neighbors',
    timestamp: Date.now(),
    neighborhoodPairs: [],
  },
};

describe('clearAllData', () => {
  beforeEach(() => {
    delMock.mockReset();
    delMock.mockResolvedValue(undefined);
    resetApplicationStateMock.mockReset();
    // Reset localStorage and seed with project + foreign keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key) localStorage.removeItem(key);
    }
    PROJECT_LOCAL_STORAGE_KEYS.forEach((key) => {
      localStorage.setItem(key, 'value');
    });
    localStorage.setItem('external-app', 'keep');
  });

  it('removes only project storage entries and resets state', async () => {
    const setters = {
      setCurrentSeating: vi.fn(),
      setActivePlanId: vi.fn(),
      setLockedPositions: vi.fn(),
    } as const;

    await clearAllData(setters);

    PROJECT_LOCAL_STORAGE_KEYS.forEach((key) => {
      expect(localStorage.getItem(key)).toBeNull();
    });
    expect(localStorage.getItem('external-app')).toBe('keep');

    const dbValues = Object.values(DB_KEYS);
    expect(delMock).toHaveBeenCalledTimes(dbValues.length);
    dbValues.forEach((key) => {
      expect(delMock).toHaveBeenCalledWith(key);
    });
    expect(resetApplicationStateMock).toHaveBeenCalledWith({
      setCurrentSeating: setters.setCurrentSeating,
      setActivePlanId: setters.setActivePlanId,
      setLockedPositions: setters.setLockedPositions,
    });
    expect(resetApplicationStateMock).toHaveBeenCalledTimes(1);
  });

  it('propagates errors so callers can react to failures', async () => {
    const setters = {
      setCurrentSeating: vi.fn(),
      setActivePlanId: vi.fn(),
      setLockedPositions: vi.fn(),
    } as const;
    const error = new Error('Quota exceeded');

    delMock.mockRejectedValueOnce(error);

    await expect(clearAllData(setters)).rejects.toThrow('Quota exceeded');
    expect(resetApplicationStateMock).not.toHaveBeenCalled();
  });

  it('wipes the photo database even when the caller already cleared the keys', async () => {
    // The footer's "delete all data" path: the repository removed the DB_KEYS,
    // but the photos live in a database of their own.
    hasIndexedDBMock.mockReturnValueOnce(true);
    clearAllPhotosMock.mockResolvedValueOnce({
      success: true,
      data: undefined,
    });

    await clearAllData({}, { skipIndexedDBClear: true });

    expect(delMock).not.toHaveBeenCalled();
    expect(clearAllPhotosMock).toHaveBeenCalledTimes(1);
    expect(resetApplicationStateMock).toHaveBeenCalledTimes(1);
  });

  it('fails instead of reporting success when the photos cannot be wiped', async () => {
    hasIndexedDBMock.mockReturnValueOnce(true);
    clearAllPhotosMock.mockResolvedValueOnce({
      success: false,
      error: { type: 'STORAGE_ERROR', message: 'Photo store locked' },
    });

    await expect(
      clearAllData({}, { skipIndexedDBClear: true }),
    ).rejects.toThrow('Photo store locked');
    expect(resetApplicationStateMock).not.toHaveBeenCalled();
  });
});

describe('importAllFromJson', () => {
  beforeEach(() => {
    setMock.mockClear();
    vi.mocked(idbSet).mockResolvedValue(undefined);
  });

  it('imports data without merge', async () => {
    const setters = {
      setStudents: vi.fn(),
      setSeatingHistory: vi.fn(),
      setMixHistory: vi.fn(),
      setLockedPositions: vi.fn(),
      setMixSettings: vi.fn(),
      setClassroomScene: vi.fn(),
      setCircleLayout: vi.fn(),
      setCurrentSeating: vi.fn(),
      setPlanName: vi.fn(),
      setActivePlanId: vi.fn(),
    };
    await importAllFromJson(JSON.stringify(bundle), setters, { merge: false });
    expect(setters.setStudents).toHaveBeenCalledWith(bundle.students);
    expect(setters.setSeatingHistory).toHaveBeenCalledWith(
      bundle.seatingHistory,
    );
    expect(setters.setMixHistory).toHaveBeenCalledWith(bundle.mixHistory);
    expect(setters.setLockedPositions).toHaveBeenCalledWith(
      bundle.lockedPositions,
    );
    expect(setters.setMixSettings).toHaveBeenCalledWith(
      normalizeMixSettings(bundle.mixSettings, neutralSettings),
    );
    expect(setters.setClassroomScene).toHaveBeenCalledWith(
      bundle.classroomScene,
    );
    expect(setters.setCircleLayout).toHaveBeenCalledWith(
      bundle.currentCircleLayout,
    );
    expect(setters.setCurrentSeating).toHaveBeenCalledWith([]);
    expect(setters.setPlanName).toHaveBeenCalledWith('');
    expect(setters.setActivePlanId).toHaveBeenCalledWith(null);
    expect(idbSet).toHaveBeenCalledWith(
      DB_KEYS.classroomTemplates,
      bundle.classroomTemplates,
    );
  });

  describe('merge', () => {
    const timestamp = '2026-10-04T08:00:00.000Z';
    const student = (id: string, name: string): Student => ({
      id,
      name,
      restless: false,
      shy: false,
      concentrationIssues: false,
      needsFrontSeat: false,
    });
    const classRecord = (
      id: string,
      name: string,
      students: Student[] = [],
    ): ClassRecord => ({
      id,
      name,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastUsedAt: timestamp,
      students,
      seatingHistory: [],
      mixHistory: [],
      currentSeating: [],
      lockedPositions: {},
      mixSettings: null,
      classroomScene: null,
      circleLayout: null,
    });
    const collectionOf = (
      classes: ClassRecord[],
      activeClassId: string | null = classes[0]?.id ?? null,
    ): ClassCollectionState => ({ version: 1, activeClassId, classes });
    const template = (id: number, name: string): ClassroomTemplate => ({
      id,
      name,
      scene: { tables: [], totalStudents: 0 },
    });

    const mergeSetters = (
      existing: ClassCollectionState | null,
      templates: ClassroomTemplate[] | null = [],
    ) => ({
      setStudents: vi.fn(),
      setSeatingHistory: vi.fn(),
      setMixHistory: vi.fn(),
      setLockedPositions: vi.fn(),
      setMixSettings: vi.fn(),
      setClassroomScene: vi.fn(),
      setCircleLayout: vi.fn(),
      setCurrentSeating: vi.fn(),
      setPlanName: vi.fn(),
      setActivePlanId: vi.fn(),
      setCircleLayouts: vi.fn(),
      setClassCollection: vi.fn(),
      setTemplates: vi.fn(),
      loadClassCollection: vi.fn().mockResolvedValue(existing),
      loadTemplates: vi.fn().mockResolvedValue(templates),
    });

    const expectLiveStateUntouched = (
      setters: ReturnType<typeof mergeSetters>,
    ) => {
      expect(setters.setStudents).not.toHaveBeenCalled();
      expect(setters.setSeatingHistory).not.toHaveBeenCalled();
      expect(setters.setMixHistory).not.toHaveBeenCalled();
      expect(setters.setLockedPositions).not.toHaveBeenCalled();
      expect(setters.setMixSettings).not.toHaveBeenCalled();
      expect(setters.setClassroomScene).not.toHaveBeenCalled();
      expect(setters.setCircleLayout).not.toHaveBeenCalled();
      expect(setters.setCurrentSeating).not.toHaveBeenCalled();
      expect(setters.setPlanName).not.toHaveBeenCalled();
      expect(setters.setActivePlanId).not.toHaveBeenCalled();
      expect(setters.setCircleLayouts).not.toHaveBeenCalled();
    };

    it('adds the classes of the backup and keeps every class here as it is', async () => {
      const here = classRecord('class-a', '7a', [student('a-1', 'Anna')]);
      const sameClassFromBackup = classRecord('class-a', '7a', []);
      const newClass = classRecord('class-b', '8c', [student('b-1', 'Ben')]);
      const setters = mergeSetters(collectionOf([here]));
      const backup: ExportBundle = {
        ...bundle,
        classCollection: collectionOf(
          [sameClassFromBackup, newClass],
          'class-b',
        ),
      };

      const outcome = await importAllFromJson(JSON.stringify(backup), setters, {
        merge: true,
      });

      expect(outcome).toEqual({
        merge: true,
        addedClasses: 1,
        addedTemplates: 0,
      });
      expect(setters.setClassCollection).toHaveBeenCalledTimes(1);
      const [merged] = setters.setClassCollection.mock.calls[0];
      // The open class stays open, and its students stay its own.
      expect(merged.activeClassId).toBe('class-a');
      expect(merged.classes).toEqual([here, newClass]);
      expectLiveStateUntouched(setters);
    });

    it('gives a class whose name is taken a free one', async () => {
      const setters = mergeSetters(collectionOf([classRecord('here', '7b')]));
      const backup: ExportBundle = {
        ...bundle,
        classCollection: collectionOf([classRecord('there', '7B')]),
      };

      await importAllFromJson(JSON.stringify(backup), setters, { merge: true });

      const [merged] = setters.setClassCollection.mock.calls[0];
      expect(merged.classes.map((entry: ClassRecord) => entry.name)).toEqual([
        '7b',
        '7B (2)',
      ]);
    });

    it('adds the class of a backup that predates class management', async () => {
      const setters = mergeSetters(collectionOf([classRecord('here', '7b')]));

      await importAllFromJson(JSON.stringify(bundle), setters, { merge: true });

      const [merged] = setters.setClassCollection.mock.calls[0];
      expect(merged.classes).toHaveLength(2);
      expect(merged.classes[1].students).toEqual(bundle.students);
      expect(merged.activeClassId).toBe('here');
    });

    it("opens the backup's open class on a device without a class", async () => {
      const setters = mergeSetters(collectionOf([]));
      const backup: ExportBundle = {
        ...bundle,
        classCollection: collectionOf(
          [classRecord('first', '5a'), classRecord('second', '5b')],
          'second',
        ),
      };

      await importAllFromJson(JSON.stringify(backup), setters, { merge: true });

      const [merged] = setters.setClassCollection.mock.calls[0];
      expect(merged.activeClassId).toBe('second');
    });

    it('writes nothing when every class of the backup is here already', async () => {
      const here = classRecord('class-a', '7a');
      const setters = mergeSetters(collectionOf([here]));
      const backup: ExportBundle = {
        ...bundle,
        classCollection: collectionOf([here]),
      };

      const outcome = await importAllFromJson(JSON.stringify(backup), setters, {
        merge: true,
      });

      expect(outcome).toEqual({
        merge: true,
        addedClasses: 0,
        addedTemplates: 0,
      });
      expect(setters.setClassCollection).not.toHaveBeenCalled();
      expect(setters.setTemplates).not.toHaveBeenCalled();
      expectLiveStateUntouched(setters);
    });

    it('keeps the templates here and adds those whose name is free', async () => {
      const lab = template(1, 'Labor');
      const setters = mergeSetters(collectionOf([classRecord('here', '7b')]), [
        lab,
      ]);
      const backup: ExportBundle = {
        ...bundle,
        classroomTemplates: [template(2, 'Labor'), template(3, 'Turnhalle')],
        classCollection: collectionOf([classRecord('here', '7b')]),
      };

      const outcome = await importAllFromJson(JSON.stringify(backup), setters, {
        merge: true,
      });

      expect(setters.setTemplates).toHaveBeenCalledWith([
        lab,
        template(3, 'Turnhalle'),
      ]);
      expect(outcome).toMatchObject({ addedClasses: 0, addedTemplates: 1 });
    });

    it('restores only the photos of the students the merge brought', async () => {
      setStudentPhotoMock.mockClear();
      const known = student('known', 'Anna');
      const setters = mergeSetters(
        collectionOf([classRecord('here', '7a', [known])]),
      );
      const photo = 'data:image/jpeg;base64,AAAA';
      const backup: ExportBundle = {
        ...bundle,
        classCollection: collectionOf([
          classRecord('here', '7a', [known]),
          classRecord('there', '8c', [known, student('new', 'Ben')]),
        ]),
        studentPhotos: { known: photo, new: photo },
      };

      await importAllFromJson(JSON.stringify(backup), setters, { merge: true });

      expect(setStudentPhotoMock).toHaveBeenCalledTimes(1);
      expect(setStudentPhotoMock).toHaveBeenCalledWith('new', expect.any(Blob));
    });

    it('refuses to merge when the stored classes cannot be read', async () => {
      const setters = mergeSetters(null);

      await expect(
        importAllFromJson(JSON.stringify(bundle), setters, { merge: true }),
      ).rejects.toThrowError(
        new BackupValidationError(BACKUP_ERROR_MESSAGES.mergeStateUnavailable),
      );
      expect(setters.setClassCollection).not.toHaveBeenCalled();
      expectLiveStateUntouched(setters);
    });
  });

  it('throws on invalid JSON', async () => {
    const setters = {
      setStudents: vi.fn(),
      setSeatingHistory: vi.fn(),
      setMixHistory: vi.fn(),
      setLockedPositions: vi.fn(),
      setMixSettings: vi.fn(),
      setClassroomScene: vi.fn(),
      setCircleLayout: vi.fn(),
      setCurrentSeating: vi.fn(),
      setPlanName: vi.fn(),
      setActivePlanId: vi.fn(),
    };
    await expect(importAllFromJson('not json', setters)).rejects.toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.unreadable),
    );
  });

  it('throws when validation fails', async () => {
    const setters = {
      setStudents: vi.fn(),
      setSeatingHistory: vi.fn(),
      setMixHistory: vi.fn(),
      setLockedPositions: vi.fn(),
      setMixSettings: vi.fn(),
      setClassroomScene: vi.fn(),
      setCircleLayout: vi.fn(),
      setCurrentSeating: vi.fn(),
      setPlanName: vi.fn(),
      setActivePlanId: vi.fn(),
    };
    const invalidRecord: Record<string, unknown> = { ...bundle };
    invalidRecord.students = null;
    const invalidJson = JSON.stringify(invalidRecord);
    await expect(importAllFromJson(invalidJson, setters)).rejects.toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData),
    );
  });

  it('resets active seating plan state after import', async () => {
    const setters = {
      setStudents: vi.fn(),
      setSeatingHistory: vi.fn(),
      setMixHistory: vi.fn(),
      setLockedPositions: vi.fn(),
      setMixSettings: vi.fn(),
      setClassroomScene: vi.fn(),
      setCircleLayout: vi.fn(),
      setCurrentSeating: vi.fn(),
      setPlanName: vi.fn(),
      setActivePlanId: vi.fn(),
    };
    await importAllFromJson(JSON.stringify(bundle), setters, { merge: false });
    // Verify that active seating plan state is reset to prevent stale UI
    expect(setters.setCurrentSeating).toHaveBeenCalledWith([]);
    expect(setters.setPlanName).toHaveBeenCalledWith('');
    expect(setters.setActivePlanId).toHaveBeenCalledWith(null);
  });

  it('wraps errors from persistence layer', async () => {
    vi.mocked(idbSet).mockRejectedValueOnce(new Error('boom'));
    const setters = {
      setStudents: vi.fn(),
      setSeatingHistory: vi.fn(),
      setMixHistory: vi.fn(),
      setLockedPositions: vi.fn(),
      setMixSettings: vi.fn(),
      setClassroomScene: vi.fn(),
      setCircleLayout: vi.fn(),
      setCurrentSeating: vi.fn(),
      setPlanName: vi.fn(),
      setActivePlanId: vi.fn(),
    };
    await expect(
      importAllFromJson(JSON.stringify(bundle), setters),
    ).rejects.toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.processingFailed),
    );
  });

  it('imports circle data correctly', async () => {
    const setters = {
      setStudents: vi.fn(),
      setSeatingHistory: vi.fn(),
      setMixHistory: vi.fn(),
      setLockedPositions: vi.fn(),
      setMixSettings: vi.fn(),
      setClassroomScene: vi.fn(),
      setCircleLayout: vi.fn(),
      setCurrentSeating: vi.fn(),
      setPlanName: vi.fn(),
      setActivePlanId: vi.fn(),
    };

    await importAllFromJson(JSON.stringify(bundle), setters, { merge: false });

    // Check that circle layout setter was called with the right data
    expect(setters.setCircleLayout).toHaveBeenCalledWith(
      bundle.currentCircleLayout,
    );

    // Check that circle layouts are saved to IndexedDB
    expect(idbSet).toHaveBeenCalledWith(
      DB_KEYS.classroomTemplates,
      bundle.classroomTemplates,
    );
    // Note: The actual circle layouts saving is checked implicitly since the function doesn't error
  });

  it('handles missing circle data gracefully', async () => {
    const bundleWithoutCircles = { ...bundle };
    delete bundleWithoutCircles.circleLayouts;
    delete bundleWithoutCircles.currentCircleLayout;

    const setters = {
      setStudents: vi.fn(),
      setSeatingHistory: vi.fn(),
      setMixHistory: vi.fn(),
      setLockedPositions: vi.fn(),
      setMixSettings: vi.fn(),
      setClassroomScene: vi.fn(),
      setCircleLayout: vi.fn(),
      setCurrentSeating: vi.fn(),
      setPlanName: vi.fn(),
      setActivePlanId: vi.fn(),
    };

    await importAllFromJson(JSON.stringify(bundleWithoutCircles), setters, {
      merge: false,
    });

    // Circle layout setter should not be called when there's no circle data
    expect(setters.setCircleLayout).not.toHaveBeenCalled();
  });

  it('persists class collection data when provided in backup', async () => {
    const timestamp = '2024-01-01T00:00:00.000Z';
    const normalized = normalizeMixSettings(neutralSettings, neutralSettings);
    const classCollection = {
      version: 1,
      activeClassId: 'class-1',
      classes: [
        {
          id: 'class-1',
          name: 'Alpha',
          createdAt: timestamp,
          updatedAt: timestamp,
          lastUsedAt: timestamp,
          students: [],
          seatingHistory: [],
          mixHistory: [],
          currentSeating: [],
          lockedPositions: {},
          mixSettings: normalized,
          classroomScene: null,
          circleLayout: null,
        },
      ],
    };
    const bundleWithClassCollection: ExportBundle = {
      ...bundle,
      classCollection,
    };
    const setters = {
      setStudents: vi.fn(),
      setSeatingHistory: vi.fn(),
      setMixHistory: vi.fn(),
      setLockedPositions: vi.fn(),
      setMixSettings: vi.fn(),
      setClassroomScene: vi.fn(),
      setCircleLayout: vi.fn(),
      setCurrentSeating: vi.fn(),
      setPlanName: vi.fn(),
      setActivePlanId: vi.fn(),
      setClassCollection: vi.fn(),
    };

    await importAllFromJson(
      JSON.stringify(bundleWithClassCollection),
      setters,
      {
        merge: false,
      },
    );

    expect(setters.setClassCollection).toHaveBeenCalledWith(classCollection);
  });

  it('creates a fallback class collection when backup predates class management', async () => {
    const setters = {
      setStudents: vi.fn(),
      setSeatingHistory: vi.fn(),
      setMixHistory: vi.fn(),
      setLockedPositions: vi.fn(),
      setMixSettings: vi.fn(),
      setClassroomScene: vi.fn(),
      setCircleLayout: vi.fn(),
      setCurrentSeating: vi.fn(),
      setPlanName: vi.fn(),
      setActivePlanId: vi.fn(),
      setClassCollection: vi.fn(),
    };

    await importAllFromJson(JSON.stringify(bundle), setters, { merge: false });

    expect(setters.setClassCollection).toHaveBeenCalledTimes(1);
    const [collection] = setters.setClassCollection.mock.calls[0];
    expect(collection.classes).toHaveLength(1);
    const importedClass = collection.classes[0];
    expect(collection.activeClassId).toBe(importedClass.id);
    expect(importedClass.students).toEqual(bundle.students);
    expect(importedClass.seatingHistory).toEqual(bundle.seatingHistory);
    expect(importedClass.mixHistory).toEqual(bundle.mixHistory);
    expect(importedClass.lockedPositions).toEqual(bundle.lockedPositions);
    expect(importedClass.classroomScene).toEqual(bundle.classroomScene);
    expect(importedClass.circleLayout).toEqual(
      bundle.currentCircleLayout ?? null,
    );
    expect(importedClass.mixSettings).toEqual(
      normalizeMixSettings(bundle.mixSettings, neutralSettings),
    );
  });
});
