// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import type { ExportBundle } from '../../types';
import {
  BACKUP_ERROR_MESSAGES,
  BACKUP_LIMITS,
  BackupValidationError,
  parseEncryptedBackupPayload,
  parseExportBundle,
} from '../validation/backupValidation';
import { neutralSettings, normalizeMixSettings } from '../../utils';

const baseMixSettings = normalizeMixSettings(neutralSettings);

const baseBundle: ExportBundle = {
  version: 1,
  students: [
    {
      id: '1',
      name: 'Anna',
      gender: 'girl',
      restless: false,
      shy: false,
      concentrationIssues: false,
      needsFrontSeat: false,
    },
  ],
  seatingHistory: [],
  mixHistory: [],
  classroomScene: {
    tables: [],
    totalStudents: 0,
  },
  mixSettings: baseMixSettings,
  lockedPositions: {},
  classroomTemplates: [],
};

describe('backupValidation', () => {
  const withCircle = (lockedStudentIds: unknown) => ({
    ...baseBundle,
    circleLayouts: [
      {
        exportType: 'circle-only',
        circleLayout: {
          students: [],
          radius: { horizontal: 200, vertical: 150 },
          center: { x: 450, y: 300 },
          preservedNeighborhoods: 0,
          totalOriginalNeighborhoods: 0,
          newNeighborhoods: 0,
          preservationRate: 0,
          mode: 'preserve-neighbors',
          timestamp: 1,
          neighborhoodPairs: [],
          lockedStudentIds,
        },
        comparisonReport: {},
        timestamp: 1,
        metadata: {},
      },
    ],
  });

  it('keeps the locked students of a circle and rejects malformed ones', () => {
    const parsed = parseExportBundle(JSON.stringify(withCircle(['1'])));
    expect(parsed.circleLayouts?.[0].circleLayout.lockedStudentIds).toEqual([
      '1',
    ]);
    expect(() =>
      parseExportBundle(JSON.stringify(withCircle([42]))),
    ).toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidCircleData),
    );
  });

  it('parses a valid export bundle', () => {
    const json = JSON.stringify(baseBundle);
    const parsed = parseExportBundle(json);
    expect(parsed).toEqual(baseBundle);
  });

  it('rejects payloads that exceed the size limit', () => {
    const oversized = ' '.repeat(BACKUP_LIMITS.decryptedJsonBytes + 1);
    expect(() => parseExportBundle(oversized)).toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.payloadTooLarge),
    );
  });

  it('rejects unsupported backup versions', () => {
    const invalid = { ...baseBundle, version: 99 };
    expect(() => parseExportBundle(JSON.stringify(invalid))).toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.unsupportedVersion),
    );
  });

  it('accepts version 2 bundles with embedded student photos', () => {
    const v2 = {
      ...baseBundle,
      version: 2,
      students: [{ ...baseBundle.students[0], hasPhoto: true }],
      studentPhotos: { '1': 'data:image/jpeg;base64,/9j/AAAQSkZJRg==' },
    } as ExportBundle;
    const parsed = parseExportBundle(JSON.stringify(v2));
    expect(parsed.studentPhotos).toEqual(v2.studentPhotos);
    expect(parsed.students[0].hasPhoto).toBe(true);
  });

  it('rejects bundles with malformed photo data', () => {
    const invalid = {
      ...baseBundle,
      version: 2,
      studentPhotos: { '1': 'not-a-data-url' },
    } as ExportBundle;
    expect(() => parseExportBundle(JSON.stringify(invalid))).toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidPhotoData),
    );
  });

  it('rejects bundles with too many students', () => {
    const tooManyStudents = {
      ...baseBundle,
      students: Array.from(
        { length: BACKUP_LIMITS.maxStudents + 1 },
        (_, index) => ({
          id: `s-${index}`,
          name: `Student ${index}`,
          restless: false,
          shy: false,
          concentrationIssues: false,
          needsFrontSeat: false,
        }),
      ),
    } as ExportBundle;
    expect(() =>
      parseExportBundle(JSON.stringify(tooManyStudents)),
    ).toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.tooManyStudents),
    );
  });

  it('rejects bundles with too many locked positions', () => {
    const locks: Record<string, { table: number; seat: number }> = {};
    for (let i = 0; i < BACKUP_LIMITS.maxLockedPositions + 1; i += 1) {
      locks[`id-${i}`] = { table: 0, seat: 0 };
    }
    const invalid = {
      ...baseBundle,
      lockedPositions: locks,
    } as ExportBundle;
    expect(() => parseExportBundle(JSON.stringify(invalid))).toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.tooManyLocks),
    );
  });

  it('validates encrypted backup payloads', () => {
    const payload = parseEncryptedBackupPayload({
      encrypted: true,
      iv: 'aGVsbG8=',
      salt: 'aGVsbG8=',
      data: 'aGVsbG8=',
    });
    expect(payload.encrypted).toBe(true);
  });

  it('rejects malformed encrypted payloads', () => {
    expect(() =>
      parseEncryptedBackupPayload({
        encrypted: true,
        iv: '',
        salt: '',
        data: '',
      }),
    ).toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidEncryptedPayload),
    );
  });
});

describe('backupValidation: partner id lists', () => {
  const withStudent = (extra: Record<string, unknown>) =>
    JSON.stringify({
      ...baseBundle,
      students: [{ ...baseBundle.students[0], ...extra }],
    });

  it('accepts well-formed wish and avoid lists', () => {
    const parsed = parseExportBundle(
      withStudent({ wishPartnerIds: ['2'], avoidPartnerIds: ['3'] }),
    );
    expect(parsed.students[0]?.wishPartnerIds).toEqual(['2']);
  });

  it('rejects a wish list that is not an array', () => {
    // It used to pass through and throw a TypeError in the seating algorithm.
    expect(() =>
      parseExportBundle(withStudent({ wishPartnerIds: '2' })),
    ).toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData),
    );
  });

  it('rejects non-string entries in an avoid list', () => {
    expect(() =>
      parseExportBundle(withStudent({ avoidPartnerIds: [42] })),
    ).toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData),
    );
  });

  it('rejects an unknown height category', () => {
    expect(() =>
      parseExportBundle(withStudent({ height: 'gigantic' })),
    ).toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData),
    );
  });
});

describe('backupValidation: neighbourhood resets', () => {
  it('accepts when each class was reset', () => {
    const json = JSON.stringify({
      ...baseBundle,
      version: 2,
      planUsageResetAt: { 'class-1': '2026-10-03T08:00:00.000Z' },
    });

    expect(parseExportBundle(json).planUsageResetAt).toEqual({
      'class-1': '2026-10-03T08:00:00.000Z',
    });
  });

  it('rejects a reset that is no point in time', () => {
    const json = JSON.stringify({
      ...baseBundle,
      version: 2,
      planUsageResetAt: { 'class-1': 'gestern' },
    });

    expect(() => parseExportBundle(json)).toThrow(BackupValidationError);
  });

  it('accepts the classes that mark their plans by hand', () => {
    const json = JSON.stringify({
      ...baseBundle,
      version: 2,
      planUsageManualClassIds: ['class-1'],
    });

    expect(parseExportBundle(json).planUsageManualClassIds).toEqual([
      'class-1',
    ]);
  });

  it('rejects a list of classes that holds something else', () => {
    const json = JSON.stringify({
      ...baseBundle,
      version: 2,
      planUsageManualClassIds: [42],
    });

    expect(() => parseExportBundle(json)).toThrow(BackupValidationError);
  });
});

describe('backupValidation: class notes', () => {
  const withClassNotes = (notes: string) =>
    JSON.stringify({
      ...baseBundle,
      version: 2,
      classCollection: {
        version: 1,
        activeClassId: 'class-1',
        classes: [
          {
            id: 'class-1',
            name: '7b',
            notes,
            createdAt: '2026-10-03T08:00:00.000Z',
            updatedAt: '2026-10-03T08:00:00.000Z',
            students: [],
            seatingHistory: [],
            mixHistory: [],
            currentSeating: [],
            lockedPositions: {},
            mixSettings: null,
            classroomScene: null,
            circleLayout: null,
          },
        ],
      },
    });

  // Notes were held to the 120 characters of a name, so a backup with a
  // longer one could not be read back.
  it('accepts class notes longer than a name', () => {
    const notes = 'Chemie im Fachraum, Gruppenarbeit dienstags. '.repeat(10);
    expect(notes.length).toBeGreaterThan(BACKUP_LIMITS.maxNameLength);

    const bundle = parseExportBundle(withClassNotes(notes));

    expect(bundle.classCollection?.classes[0]).toMatchObject({ notes });
  });

  it('rejects class notes beyond the note limit', () => {
    const notes = 'x'.repeat(BACKUP_LIMITS.maxNoteLength + 1);

    expect(() => parseExportBundle(withClassNotes(notes))).toThrow(
      BackupValidationError,
    );
  });
});

describe('backupValidation: rooms of a class', () => {
  const withClass = (extra: Record<string, unknown>) =>
    JSON.stringify({
      ...baseBundle,
      version: 2,
      classCollection: {
        version: 2,
        activeClassId: 'class-1',
        classes: [
          {
            id: 'class-1',
            name: '7b',
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
            ...extra,
          },
        ],
      },
    });
  const room = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    name: `Raum ${id}`,
    createdAt: '2026-10-04T08:00:00.000Z',
    ...extra,
  });
  const parked = {
    scene: { tables: [], totalStudents: 0 },
    seating: [],
    lockedPositions: {},
    circleLayout: null,
    activePlanId: 'plan-1',
  };
  const expectInvalid = (
    json: string,
    message: string = BACKUP_ERROR_MESSAGES.invalidData,
  ) =>
    expect(() => parseExportBundle(json)).toThrowError(
      new BackupValidationError(message),
    );

  it('accepts a class from before rooms', () => {
    expect(() => parseExportBundle(withClass({}))).not.toThrow();
  });

  it('accepts rooms, a parked room and the room ids of plans and mixes', () => {
    const bundle = parseExportBundle(
      withClass({
        rooms: [room('a'), room('b', { parked })],
        activeRoomId: 'a',
        seatingHistory: [
          {
            id: 'plan-1',
            name: 'Labor',
            date: '2026-10-04',
            seating: [],
            scene: { tables: [], totalStudents: 0 },
            roomId: 'b',
          },
        ],
        mixHistory: [
          {
            id: 1,
            timestamp: '2026-10-04T08:00:00.000Z',
            seating: [],
            mixSettings: baseMixSettings,
            roomId: 'a',
          },
        ],
      }),
    );

    expect(bundle.classCollection?.classes[0]).toMatchObject({
      rooms: [{ id: 'a' }, { id: 'b' }],
    });
  });

  it('rejects rooms that are no list, or a room without an id or a name', () => {
    expectInvalid(withClass({ rooms: { a: room('a') } }));
    expectInvalid(withClass({ rooms: [{ name: 'Labor' }] }));
    expectInvalid(withClass({ rooms: [room('a', { name: '' })] }));
    expectInvalid(
      withClass({
        rooms: [
          room('a', { name: 'x'.repeat(BACKUP_LIMITS.maxNameLength + 1) }),
        ],
      }),
    );
  });

  it('rejects more rooms than a class may keep', () => {
    const rooms = Array.from(
      { length: BACKUP_LIMITS.maxRoomsPerClass + 1 },
      (_, index) => room(`r${index}`),
    );
    expectInvalid(withClass({ rooms }), BACKUP_ERROR_MESSAGES.tooManyRooms);
  });

  it('rejects a parked room whose seating is broken', () => {
    expectInvalid(
      withClass({
        rooms: [room('a', { parked: { ...parked, seating: 'x' } })],
      }),
    );
  });

  it('rejects a room id that is no string', () => {
    expectInvalid(withClass({ activeRoomId: 7 }));
    expectInvalid(
      withClass({
        mixHistory: [
          {
            id: 1,
            timestamp: '2026-10-04T08:00:00.000Z',
            seating: [],
            mixSettings: baseMixSettings,
            roomId: 3,
          },
        ],
      }),
    );
  });
});
