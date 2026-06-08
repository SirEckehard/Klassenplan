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
    const invalid = { ...baseBundle, version: 2 };
    expect(() => parseExportBundle(JSON.stringify(invalid))).toThrowError(
      new BackupValidationError(BACKUP_ERROR_MESSAGES.unsupportedVersion),
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
