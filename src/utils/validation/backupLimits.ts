// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Limits, error messages and the error type of the backup validation.
 *
 * Kept apart from `backupValidation.ts` because the backup import checks the
 * file size and reports errors before its validators are loaded: a module only
 * ever lives in one chunk, so importing these from the validator module would
 * pull all of it into the initial bundle.
 */
import { MAX_STUDENTS } from '../constants';

// Hard limits that incoming backups must respect to be accepted.
// Raised for export version 2: backups may embed downscaled student photos as
// base64 (~8–15 KB each), so the JSON/encrypted payloads are larger than v1.
export const BACKUP_LIMITS = {
  encryptedFileBytes: 16 * 1024 * 1024,
  decryptedJsonBytes: 12 * 1024 * 1024,
  maxStudents: MAX_STUDENTS,
  maxSeatingHistory: 200,
  maxMixHistory: 200,
  maxClassroomTemplates: 100,
  maxLockedPositions: 500,
  maxTablesPerScene: 150,
  maxSeatsPerTable: 12,
  maxIdLength: 128,
  maxNameLength: 120,
  maxTimestampLength: 64,
  maxDateLength: 64,
  maxCoordinateValue: 10000,
  maxRotationDegrees: 360,
  maxZIndex: 1000,
  maxCircleLayouts: 50,
  maxCircleStudents: MAX_STUDENTS,
  maxAngleDegrees: 360,
  // Student photos (export version ≥ 2): aggressively downscaled, so each Data
  // URL stays small; cap generously to reject tampered/oversized payloads.
  maxStudentPhotos: 2000,
  maxPhotoDataUrlBytes: 96 * 1024,
  // Plan usage records (export version ≥ 2): a handful per class and school
  // year, each holding only pair keys and timestamps. Capped generously so a
  // long-running installation still imports while a tampered file does not.
  maxPlanUsageClasses: 200,
  maxPlanUsageRecords: 200,
  maxPlanUsagePairs: 1000,
  // Bounds for KDF iteration counts declared in the encrypted envelope: the
  // lower bound rejects deliberately weakened files, the upper bound prevents
  // a tampered envelope from stalling the browser during key derivation.
  minKdfIterations: 100000,
  maxKdfIterations: 10000000,
} as const;

// i18n keys (namespace `toast:backupValidation.*`) resolved by
// showToast/getToastMessage at display time — utils stay language-free.
export const BACKUP_ERROR_MESSAGES = {
  fileTooLarge: 'toast:backupValidation.fileTooLarge',
  payloadTooLarge: 'toast:backupValidation.payloadTooLarge',
  unreadable: 'toast:backupValidation.unreadable',
  unsupportedVersion: 'toast:backupValidation.unsupportedVersion',
  invalidEncryptedPayload: 'toast:backupValidation.invalidEncryptedPayload',
  invalidData: 'toast:backupValidation.invalidData',
  mergeStudentIdConflict: 'toast:backupValidation.mergeStudentIdConflict',
  mergeInvalidLocks: 'toast:backupValidation.mergeInvalidLocks',
  mergeStateUnavailable: 'toast:backupValidation.mergeStateUnavailable',
  tooManyStudents: 'toast:backupValidation.tooManyStudents',
  tooManySeatingPlans: 'toast:backupValidation.tooManySeatingPlans',
  tooManyMixResults: 'toast:backupValidation.tooManyMixResults',
  tooManyTemplates: 'toast:backupValidation.tooManyTemplates',
  tooManyLocks: 'toast:backupValidation.tooManyLocks',
  tooManyCircleLayouts: 'toast:backupValidation.tooManyCircleLayouts',
  invalidCircleData: 'toast:backupValidation.invalidCircleData',
  invalidPhotoData: 'toast:backupValidation.invalidPhotoData',
  tooManyPhotos: 'toast:backupValidation.tooManyPhotos',
  processingFailed: 'toast:backupValidation.processingFailed',
} as const;

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}
