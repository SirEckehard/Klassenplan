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
import {
  MAX_DUTIES,
  MAX_DUTY_COUNT,
  MAX_DUTY_NAME_LENGTH,
  MAX_DUTY_ROUNDS,
  MAX_MIX_PRESETS,
  MAX_NAME_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_ROOMS_PER_CLASS,
  MAX_STUDENTS,
} from '../constants';

/**
 * The most the backup's content may take. A school year of a teacher with
 * many classes — plans, mixes, photos — has to fit with room to spare, and
 * the export refuses a backup the import would refuse (`BackupExportError`).
 */
const DECRYPTED_JSON_BYTES = 24 * 1024 * 1024;

/**
 * The encrypted file that content makes: AES-GCM adds a 16-byte tag, Base64
 * four characters for every three bytes, the envelope its salt, iv and KDF
 * parameters. Derived, so a backup at the content limit is never refused for
 * the size of its file.
 */
const ENCRYPTED_FILE_BYTES =
  Math.ceil((DECRYPTED_JSON_BYTES + 16) / 3) * 4 + 4096;

// Hard limits that incoming backups must respect to be accepted.
export const BACKUP_LIMITS = {
  encryptedFileBytes: ENCRYPTED_FILE_BYTES,
  decryptedJsonBytes: DECRYPTED_JSON_BYTES,
  maxStudents: MAX_STUDENTS,
  // The app keeps every saved plan and template, so these are generous; the
  // size above bounds the file.
  maxSeatingHistory: 1000,
  maxMixHistory: 200,
  maxClassroomTemplates: 500,
  maxLockedPositions: 500,
  maxTablesPerScene: 150,
  maxSeatsPerTable: 12,
  maxIdLength: 128,
  // Partner wishes: the UI caps at MAX_PARTNER_WISHES, but a backup written by
  // an older build may hold more. Bounded by the class size, which is the most
  // a list of classmates can ever be.
  maxPartnerIds: MAX_STUDENTS,
  maxNameLength: MAX_NAME_LENGTH,
  // Class notes are free text and were checked against the name limit, so a
  // note longer than 120 characters made the whole backup unreadable.
  maxNoteLength: MAX_NOTE_LENGTH,
  // The rooms of a class (decision 0024), held to what the app allows.
  maxRoomsPerClass: MAX_ROOMS_PER_CLASS,
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
  // Class duties (decision 0028), held to what the tool allows.
  maxDutyClasses: 200,
  maxDuties: MAX_DUTIES,
  maxDutyNameLength: MAX_DUTY_NAME_LENGTH,
  maxDutyCount: MAX_DUTY_COUNT,
  maxDutyRounds: MAX_DUTY_ROUNDS,
  // The teacher's own presets (decision 0038), held to what the app allows.
  maxMixPresets: MAX_MIX_PRESETS,
  // Bounds for KDF iteration counts declared in the encrypted envelope: the
  // lower bound rejects deliberately weakened files, the upper bound prevents
  // a tampered envelope from stalling the browser during key derivation.
  minKdfIterations: 100000,
  maxKdfIterations: 10000000,
} as const;

// i18n keys (namespace `toast:backupValidation.*`) resolved by
// showToast/getToastMessage at display time — utils stay language-free.
export const BACKUP_ERROR_MESSAGES = {
  payloadTooLarge: 'toast:backupValidation.payloadTooLarge',
  unreadable: 'toast:backupValidation.unreadable',
  unsupportedVersion: 'toast:backupValidation.unsupportedVersion',
  invalidEncryptedPayload: 'toast:backupValidation.invalidEncryptedPayload',
  invalidData: 'toast:backupValidation.invalidData',
  mergeStateUnavailable: 'toast:backupValidation.mergeStateUnavailable',
  tooManyStudents: 'toast:backupValidation.tooManyStudents',
  tooManySeatingPlans: 'toast:backupValidation.tooManySeatingPlans',
  tooManyMixResults: 'toast:backupValidation.tooManyMixResults',
  tooManyTemplates: 'toast:backupValidation.tooManyTemplates',
  tooManyLocks: 'toast:backupValidation.tooManyLocks',
  tooManyCircleLayouts: 'toast:backupValidation.tooManyCircleLayouts',
  tooManyRooms: 'toast:backupValidation.tooManyRooms',
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

/**
 * A backup the export refuses because this app could not read it back: too
 * large for the import (`tooLarge`, with both sizes in bytes), or failing the
 * import's validation (`notRestorable`, which is a bug to report).
 */
export class BackupExportError extends Error {
  constructor(
    readonly reason: 'tooLarge' | 'notRestorable',
    readonly sizeBytes: number,
    readonly maxBytes: number = DECRYPTED_JSON_BYTES,
  ) {
    super(`Backup export refused: ${reason}`);
    this.name = 'BackupExportError';
  }
}
