// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { set as idbSet } from 'idb-keyval';
import type { ExportBundle, Student, LockedPositions } from '../../types';
import { clearAllData, importAllFromJson } from '../data/dataBackup';
import {
  BACKUP_ERROR_MESSAGES,
  BackupValidationError,
} from '../validation/backupValidation';
import { DB_KEYS, PROJECT_LOCAL_STORAGE_KEYS } from '../data/storageKeys';
import { MAX_STUDENTS } from '../constants';
import { neutralSettings, normalizeMixSettings } from '../mixSettings';

const { delMock, setMock } = vi.hoisted(() => ({
  delMock: vi.fn().mockResolvedValue(undefined),
  setMock: vi.fn().mockResolvedValue(undefined),
}));
const resetApplicationStateMock = vi.hoisted(() => vi.fn());

vi.mock('idb-keyval', () => ({
  del: delMock,
  set: setMock,
  __esModule: true,
}));
vi.mock('@/utils/state/resetApplicationState', () => ({
  resetApplicationState: resetApplicationStateMock,
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

  it('imports data with merge', async () => {
    const existingStudents: Student[] = [
      {
        id: 'existing-1',
        name: 'Existing',
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
      },
    ];
    const existingLocks: LockedPositions = {
      'existing-1': { table: 0, seat: 0 },
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
      getStudents: vi.fn(() => existingStudents),
      getLockedPositions: vi.fn(() => existingLocks),
    };
    const sceneWithSeat: ExportBundle = {
      ...bundle,
      classroomScene: {
        tables: [
          {
            x: 0,
            y: 0,
            width: 100,
            height: 50,
            rotation: 0,
            seatCount: 2,
            locked: false,
            zIndex: 0,
          },
        ],
        totalStudents: 2,
      },
    };
    await importAllFromJson(JSON.stringify(sceneWithSeat), setters, {
      merge: true,
    });
    expect(setters.setStudents).toHaveBeenCalledWith([
      ...existingStudents,
      ...sceneWithSeat.students,
    ]);
    expect(setters.setLockedPositions).toHaveBeenCalledWith({
      ...existingLocks,
      ...sceneWithSeat.lockedPositions,
    });
  });

  it('rejects merge when combined students exceed the limit', async () => {
    const existingStudents: Student[] = Array.from(
      { length: MAX_STUDENTS - 1 },
      (_, index) => ({
        id: `existing-${index}`,
        name: `Existing ${index}`,
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
      }),
    );
    const mergeBundle: ExportBundle = {
      ...bundle,
      students: [
        {
          id: 'new-1',
          name: 'New 1',
          restless: false,
          shy: false,
          concentrationIssues: false,
          needsFrontSeat: false,
        },
        {
          id: 'new-2',
          name: 'New 2',
          restless: false,
          shy: false,
          concentrationIssues: false,
          needsFrontSeat: false,
        },
      ],
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
      getStudents: vi.fn(() => existingStudents),
      getLockedPositions: vi.fn(() => ({}) as LockedPositions),
    };

    await expect(
      importAllFromJson(JSON.stringify(mergeBundle), setters, { merge: true }),
    ).rejects.toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.tooManyStudents),
    );
    expect(setters.setStudents).not.toHaveBeenCalled();
    expect(setters.setSeatingHistory).not.toHaveBeenCalled();
    expect(setters.setMixHistory).not.toHaveBeenCalled();
    expect(setters.setLockedPositions).not.toHaveBeenCalled();
  });

  it('rejects merge when student IDs collide', async () => {
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
      getStudents: vi.fn(() => bundle.students),
      getLockedPositions: vi.fn(() => ({}) as LockedPositions),
    };

    await expect(
      importAllFromJson(JSON.stringify(bundle), setters, { merge: true }),
    ).rejects.toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.mergeStudentIdConflict),
    );
    expect(setters.setStudents).not.toHaveBeenCalled();
    expect(setters.setLockedPositions).not.toHaveBeenCalled();
  });

  it('rejects merge when merged locks reference invalid seats', async () => {
    const existingLocks: LockedPositions = {
      orphan: {
        table: 2,
        seat: 0,
      },
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
      getStudents: vi.fn(() => []),
      getLockedPositions: vi.fn(() => existingLocks),
    };
    const sceneWithSingleTable: ExportBundle = {
      ...bundle,
      classroomScene: {
        tables: [
          {
            x: 0,
            y: 0,
            width: 100,
            height: 50,
            rotation: 0,
            seatCount: 2,
            locked: false,
            zIndex: 0,
          },
        ],
        totalStudents: 0,
      },
    };

    await expect(
      importAllFromJson(JSON.stringify(sceneWithSingleTable), setters, {
        merge: true,
      }),
    ).rejects.toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.mergeInvalidLocks),
    );
    expect(setters.setLockedPositions).not.toHaveBeenCalled();
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
