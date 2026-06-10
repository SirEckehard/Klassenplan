// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomScene,
  ClassroomTemplate,
  ExportBundle,
  LockedPositions,
  MixResult,
  MixSettings,
  SavedPlan,
  SeatingArrangement,
  Student,
  ClassCollectionState,
} from '@/types';
import type { CircleLayout, CircleExportData } from '@/types/Circle';
import { MAX_STUDENTS } from '../constants';
import { SCALAR_MIX_SETTING_KEYS } from '../mixSettings';

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
} as const;

export const BACKUP_ERROR_MESSAGES = {
  fileTooLarge: 'Import fehlgeschlagen. Datei ist zu groß.',
  payloadTooLarge: 'Import fehlgeschlagen. Inhalt ist zu groß.',
  unreadable: 'Import fehlgeschlagen. Backup konnte nicht gelesen werden.',
  unsupportedVersion:
    'Import fehlgeschlagen. Backup-Version wird nicht unterstützt.',
  invalidEncryptedPayload:
    'Import fehlgeschlagen. Backup-Datei ist beschädigt.',
  invalidData: 'Import fehlgeschlagen. Backup enthält ungültige Daten.',
  mergeStudentIdConflict:
    'Import fehlgeschlagen. Merge nicht möglich: Schüler*innen sind bereits vorhanden.',
  mergeInvalidLocks:
    'Import fehlgeschlagen. Merge nicht möglich: Feste Plätze passen nicht zum importierten Raumplan.',
  mergeStateUnavailable:
    'Import fehlgeschlagen. Merge nicht möglich: Aktueller Datenstand ist nicht verfügbar.',
  tooManyStudents: `Import fehlgeschlagen. Maximal ${MAX_STUDENTS} Schülerinnen und Schüler erlaubt.`,
  tooManySeatingPlans:
    'Import fehlgeschlagen. Limit für gespeicherte Sitzpläne überschritten.',
  tooManyMixResults:
    'Import fehlgeschlagen. Limit für Mix-Historie überschritten.',
  tooManyTemplates: 'Import fehlgeschlagen. Limit für Vorlagen überschritten.',
  tooManyLocks: 'Import fehlgeschlagen. Limit für feste Plätze überschritten.',
  tooManyCircleLayouts:
    'Import fehlgeschlagen. Limit für Sitzkreis-Layouts überschritten.',
  invalidCircleData: 'Import fehlgeschlagen. Sitzkreis-Daten sind ungültig.',
  invalidPhotoData: 'Import fehlgeschlagen. Foto-Daten sind ungültig.',
  tooManyPhotos: 'Import fehlgeschlagen. Limit für Schülerfotos überschritten.',
  processingFailed:
    'Import fehlgeschlagen. Backup konnte nicht verarbeitet werden.',
} as const;

export const CURRENT_EXPORT_VERSION = 2;
// v1 (without photos) stays importable for backward compatibility.
const SUPPORTED_EXPORT_VERSIONS = new Set<number>([1, CURRENT_EXPORT_VERSION]);

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

export interface EncryptedBackupPayload {
  encrypted: true;
  iv: string;
  salt: string;
  data: string;
}

const encoder = new TextEncoder();

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function ensureInteger(value: unknown): value is number {
  return ensureFiniteNumber(value) && Number.isInteger(value);
}

function ensureNumberInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return ensureFiniteNumber(value) && value >= min && value <= max;
}

function ensureIntegerInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return ensureInteger(value) && value >= min && value <= max;
}

function assertString(
  value: unknown,
  {
    allowEmpty = false,
    maxLength,
  }: { allowEmpty?: boolean; maxLength: number },
): value is string {
  if (typeof value !== 'string') return false;
  if (!allowEmpty && value.length === 0) return false;
  return value.length <= maxLength;
}

function assertOptionalString(
  value: unknown,
  options: { allowEmpty?: boolean; maxLength: number },
): value is string | null | undefined {
  if (value === undefined || value === null) {
    return true;
  }
  return assertString(value, options);
}

function validateStudent(value: unknown): asserts value is Student {
  if (!isObject(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (!assertString(value.id, { maxLength: BACKUP_LIMITS.maxIdLength })) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (!assertString(value.name, { maxLength: BACKUP_LIMITS.maxNameLength })) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (!('restless' in value) || typeof value.restless !== 'boolean') {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (!('shy' in value) || typeof value.shy !== 'boolean') {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (
    !('concentrationIssues' in value) ||
    typeof value.concentrationIssues !== 'boolean'
  ) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (
    !('needsFrontSeat' in value) ||
    typeof value.needsFrontSeat !== 'boolean'
  ) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if ('gender' in value) {
    if (
      value.gender !== 'boy' &&
      value.gender !== 'girl' &&
      value.gender !== 'diverse'
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
  }
  if ('wishPartnerId' in value && value.wishPartnerId !== null) {
    if (
      !assertString(value.wishPartnerId, {
        allowEmpty: true,
        maxLength: BACKUP_LIMITS.maxIdLength,
      })
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
  }
  if ('avoidPartnerId' in value && value.avoidPartnerId !== null) {
    if (
      !assertString(value.avoidPartnerId, {
        allowEmpty: true,
        maxLength: BACKUP_LIMITS.maxIdLength,
      })
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
  }
  if (
    'performanceStrong' in value &&
    typeof value.performanceStrong !== 'boolean'
  ) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (
    'performanceWeak' in value &&
    typeof value.performanceWeak !== 'boolean'
  ) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if ('prefersWindow' in value && typeof value.prefersWindow !== 'boolean') {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if ('prefersDoor' in value && typeof value.prefersDoor !== 'boolean') {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  // Optional: hasPhoto flag (export version ≥ 2, backwards compatible)
  if ('hasPhoto' in value && typeof value.hasPhoto !== 'boolean') {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  // Optional: languageSkill validation (new field, backwards compatible)
  if ('languageSkill' in value && value.languageSkill !== undefined) {
    if (
      value.languageSkill !== 'native' &&
      value.languageSkill !== 'fluent' &&
      value.languageSkill !== 'intermediate' &&
      value.languageSkill !== 'beginner' &&
      value.languageSkill !== 'daz'
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
  }
  // Optional: socialRole validation (new field, backwards compatible)
  if ('socialRole' in value && value.socialRole !== undefined) {
    if (
      value.socialRole !== 'mediator' &&
      value.socialRole !== 'leader' &&
      value.socialRole !== 'loner' &&
      value.socialRole !== 'socialHub'
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
  }
}

function validateStudents(value: unknown): asserts value is Student[] {
  if (!Array.isArray(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (value.length > BACKUP_LIMITS.maxStudents) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.tooManyStudents);
  }
  value.forEach(validateStudent);
}

function validateMixSettings(value: unknown): asserts value is MixSettings {
  if (!isObject(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }

  const record = value as Partial<MixSettings>;

  for (const key of SCALAR_MIX_SETTING_KEYS) {
    // Backwards compatibility: newer fields may not exist in older backups
    if (!(key in record)) {
      continue; // Skip validation for missing keys (they'll get defaults via normalizeMixSettings)
    }
    if (!ensureFiniteNumber(record[key])) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    const num = record[key] as number;
    if (num < 0 || num > 10) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
  }

  const neighborWeights = record.neighborWeights;
  if (neighborWeights === undefined) {
    return; // Backwards compatibility: older backups may not include this field
  }

  if (!isObject(neighborWeights)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }

  const categories: Array<'behavioral' | 'gender'> = ['behavioral', 'gender'];
  const directions: Array<'direct' | 'side' | 'front' | 'back'> = [
    'direct',
    'side',
    'front',
    'back',
  ];

  for (const category of categories) {
    const config = (neighborWeights as Record<string, unknown>)[category];
    if (!isObject(config)) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }

    for (const direction of directions) {
      const value = (config as Record<string, unknown>)[direction];
      if (!ensureFiniteNumber(value) || value < 0 || value > 10) {
        throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
      }
    }
  }
}

function validateClassroomTable(value: unknown): void {
  if (!isObject(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  const record = value as Record<string, unknown>;
  if (
    !ensureNumberInRange(
      record.x,
      -BACKUP_LIMITS.maxCoordinateValue,
      BACKUP_LIMITS.maxCoordinateValue,
    )
  ) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (
    !ensureNumberInRange(
      record.y,
      -BACKUP_LIMITS.maxCoordinateValue,
      BACKUP_LIMITS.maxCoordinateValue,
    )
  ) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (!ensureNumberInRange(record.width, 0, BACKUP_LIMITS.maxCoordinateValue)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (
    !ensureNumberInRange(record.height, 0, BACKUP_LIMITS.maxCoordinateValue)
  ) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (
    !ensureNumberInRange(
      record.rotation,
      -BACKUP_LIMITS.maxRotationDegrees,
      BACKUP_LIMITS.maxRotationDegrees,
    )
  ) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (
    !ensureIntegerInRange(record.seatCount, 1, BACKUP_LIMITS.maxSeatsPerTable)
  ) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (!ensureIntegerInRange(record.zIndex, 0, BACKUP_LIMITS.maxZIndex)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (typeof record.locked !== 'boolean') {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if ('templateType' in record && record.templateType !== undefined) {
    if (
      record.templateType !== 'double' &&
      record.templateType !== 'single' &&
      record.templateType !== 'group4' &&
      record.templateType !== 'group6'
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
  }
}

function validateClassroomScene(
  value: unknown,
): asserts value is ClassroomScene {
  if (!isObject(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  const record = value as Record<string, unknown>;
  const tables = record.tables;
  if (!Array.isArray(tables)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (tables.length > BACKUP_LIMITS.maxTablesPerScene) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  tables.forEach(validateClassroomTable);
  if (!ensureInteger(record.totalStudents)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  const total = record.totalStudents as number;
  if (total < 0 || total > BACKUP_LIMITS.maxStudents) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
}

function validateSeatingArrangement(
  value: unknown,
): asserts value is SeatingArrangement {
  if (!Array.isArray(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (value.length > BACKUP_LIMITS.maxTablesPerScene) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  for (const table of value) {
    if (!Array.isArray(table)) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    if (table.length > BACKUP_LIMITS.maxSeatsPerTable) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    for (const seat of table) {
      if (seat !== null) {
        validateStudent(seat);
      }
    }
  }
}

function validateLockedPositions(
  value: unknown,
): asserts value is LockedPositions {
  if (!isObject(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  const entries = Object.entries(value);
  if (entries.length > BACKUP_LIMITS.maxLockedPositions) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.tooManyLocks);
  }
  for (const [key, position] of entries) {
    if (
      !assertString(key, {
        allowEmpty: false,
        maxLength: BACKUP_LIMITS.maxIdLength,
      })
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    if (!isObject(position)) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    if (
      !ensureIntegerInRange(
        position.table,
        0,
        BACKUP_LIMITS.maxTablesPerScene - 1,
      )
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    if (
      !ensureIntegerInRange(
        position.seat,
        0,
        BACKUP_LIMITS.maxSeatsPerTable - 1,
      )
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
  }
}

function validateSavedPlans(value: unknown): asserts value is SavedPlan[] {
  if (!Array.isArray(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (value.length > BACKUP_LIMITS.maxSeatingHistory) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.tooManySeatingPlans);
  }
  for (const plan of value) {
    if (!isObject(plan)) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    const record = plan as Record<string, unknown>;
    const hasValidStringId = assertString(record.id, {
      allowEmpty: false,
      maxLength: BACKUP_LIMITS.maxIdLength,
    });
    const hasValidNumericId =
      ensureInteger(record.id) && (record.id as number) >= 0;
    if (!hasValidStringId && !hasValidNumericId) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    if (
      !assertString(record.name, {
        allowEmpty: true,
        maxLength: BACKUP_LIMITS.maxNameLength,
      })
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    if (
      !assertString(record.date, {
        allowEmpty: true,
        maxLength: BACKUP_LIMITS.maxDateLength,
      })
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    if ('locks' in record && record.locks !== undefined) {
      validateLockedPositions(record.locks);
    }
    validateSeatingArrangement(record.seating);
    validateClassroomScene(record.scene);
  }
}

function validateMixResults(value: unknown): asserts value is MixResult[] {
  if (!Array.isArray(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (value.length > BACKUP_LIMITS.maxMixHistory) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.tooManyMixResults);
  }
  for (const entry of value) {
    if (!isObject(entry)) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    const record = entry as Record<string, unknown>;
    if (!ensureInteger(record.id) || (record.id as number) < 0) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    if (
      !assertString(record.timestamp, {
        allowEmpty: false,
        maxLength: BACKUP_LIMITS.maxTimestampLength,
      })
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    validateSeatingArrangement(record.seating);
    validateMixSettings(record.mixSettings);
  }
}

function validateClassroomTemplates(
  value: unknown,
): asserts value is ClassroomTemplate[] {
  if (!Array.isArray(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (value.length > BACKUP_LIMITS.maxClassroomTemplates) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.tooManyTemplates);
  }
  for (const template of value) {
    if (!isObject(template)) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    const record = template as Record<string, unknown>;
    if (!ensureInteger(record.id) || (record.id as number) < 0) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    if (
      !assertString(record.name, {
        allowEmpty: false,
        maxLength: BACKUP_LIMITS.maxNameLength,
      })
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    validateClassroomScene(record.scene);
  }
}

function validateCircleStudentPosition(value: unknown): void {
  if (!isObject(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidCircleData);
  }
  const record = value as Record<string, unknown>;

  // Validate student
  if (!isObject(record.student)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidCircleData);
  }
  validateStudent(record.student);

  // Validate angle
  if (!ensureNumberInRange(record.angle, 0, BACKUP_LIMITS.maxAngleDegrees)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidCircleData);
  }

  // Validate coordinates
  if (!ensureFiniteNumber(record.x) || !ensureFiniteNumber(record.y)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidCircleData);
  }

  // Validate neighbor arrays
  const neighborFields = [
    'preservedNeighbors',
    'lostNeighbors',
    'newNeighbors',
  ];
  for (const field of neighborFields) {
    if (field in record) {
      if (!Array.isArray(record[field])) {
        throw new BackupValidationError(
          BACKUP_ERROR_MESSAGES.invalidCircleData,
        );
      }
      const arr = record[field] as unknown[];
      for (const item of arr) {
        if (
          !assertString(item, {
            allowEmpty: false,
            maxLength: BACKUP_LIMITS.maxIdLength,
          })
        ) {
          throw new BackupValidationError(
            BACKUP_ERROR_MESSAGES.invalidCircleData,
          );
        }
      }
    }
  }
}

function validateCircleLayout(value: unknown): asserts value is CircleLayout {
  if (!isObject(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidCircleData);
  }
  const record = value as Record<string, unknown>;

  // Validate students array
  if (!Array.isArray(record.students)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidCircleData);
  }
  if (record.students.length > BACKUP_LIMITS.maxCircleStudents) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidCircleData);
  }
  record.students.forEach(validateCircleStudentPosition);

  // Validate radius
  if (
    'radius' in record &&
    record.radius !== null &&
    record.radius !== undefined
  ) {
    if (!isObject(record.radius)) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidCircleData);
    }
  }

  // Validate mode
  if (!assertString(record.mode, { allowEmpty: false, maxLength: 50 })) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidCircleData);
  }

  // Validate timestamp
  if (!ensureInteger(record.timestamp) || (record.timestamp as number) < 0) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidCircleData);
  }

  // Validate neighborhoodPairs array
  if (!Array.isArray(record.neighborhoodPairs)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidCircleData);
  }
}

function validateCircleExportData(
  value: unknown,
): asserts value is CircleExportData {
  if (!isObject(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidCircleData);
  }
  const record = value as Record<string, unknown>;

  // Validate exportType
  if (
    record.exportType !== 'circle-only' &&
    record.exportType !== 'dual-layout'
  ) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidCircleData);
  }

  // Validate circleLayout
  validateCircleLayout(record.circleLayout);

  // Validate tableLayout if present
  if ('tableLayout' in record && record.tableLayout) {
    validateSeatingArrangement(record.tableLayout);
  }

  // Validate comparisonReport
  if (!isObject(record.comparisonReport)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidCircleData);
  }
}

function validateCircleLayouts(
  value: unknown,
): asserts value is CircleExportData[] {
  if (!Array.isArray(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidCircleData);
  }
  if (value.length > BACKUP_LIMITS.maxCircleLayouts) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.tooManyCircleLayouts);
  }
  value.forEach(validateCircleExportData);
}

function validateClassRecord(value: unknown) {
  if (!isObject(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (
    !assertString(value.id, {
      allowEmpty: false,
      maxLength: BACKUP_LIMITS.maxIdLength,
    })
  ) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (
    !assertString(value.name, {
      allowEmpty: false,
      maxLength: BACKUP_LIMITS.maxNameLength,
    })
  ) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (
    !assertOptionalString(value.label, {
      allowEmpty: true,
      maxLength: BACKUP_LIMITS.maxNameLength,
    })
  ) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (
    !assertOptionalString(value.notes, {
      allowEmpty: true,
      maxLength: BACKUP_LIMITS.maxNameLength,
    })
  ) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (
    !assertOptionalString(value.createdAt, {
      allowEmpty: false,
      maxLength: BACKUP_LIMITS.maxTimestampLength,
    }) ||
    !assertOptionalString(value.updatedAt, {
      allowEmpty: false,
      maxLength: BACKUP_LIMITS.maxTimestampLength,
    }) ||
    !assertOptionalString(value.lastUsedAt, {
      allowEmpty: false,
      maxLength: BACKUP_LIMITS.maxTimestampLength,
    })
  ) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  validateStudents(value.students);
  validateSavedPlans(value.seatingHistory);
  validateMixResults(value.mixHistory);
  validateSeatingArrangement(value.currentSeating);
  validateLockedPositions(value.lockedPositions);
  if (value.mixSettings) {
    validateMixSettings(value.mixSettings);
  }
  if (value.classroomScene) {
    validateClassroomScene(value.classroomScene);
  }
  if (value.circleLayout) {
    validateCircleLayout(value.circleLayout);
  }
}

function validateClassCollection(
  value: unknown,
): asserts value is ClassCollectionState {
  if (!isObject(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (!ensureInteger(value.version)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (value.activeClassId !== null) {
    if (
      !assertString(value.activeClassId, {
        allowEmpty: false,
        maxLength: BACKUP_LIMITS.maxIdLength,
      })
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
  }
  if (!Array.isArray(value.classes)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (value.classes.length === 0) {
    if (value.activeClassId !== null) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
    }
    return;
  }
  value.classes.forEach(validateClassRecord);
}

function validateStudentPhotos(
  value: unknown,
): asserts value is Record<string, string> {
  if (!isObject(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidPhotoData);
  }
  const entries = Object.entries(value);
  if (entries.length > BACKUP_LIMITS.maxStudentPhotos) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.tooManyPhotos);
  }
  for (const [key, dataUrl] of entries) {
    if (
      !assertString(key, {
        allowEmpty: false,
        maxLength: BACKUP_LIMITS.maxIdLength,
      })
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidPhotoData);
    }
    if (
      typeof dataUrl !== 'string' ||
      !dataUrl.startsWith('data:image/') ||
      dataUrl.length > BACKUP_LIMITS.maxPhotoDataUrlBytes
    ) {
      throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidPhotoData);
    }
  }
}

function validateExportBundleStructure(
  value: unknown,
): asserts value is ExportBundle {
  if (!isObject(value)) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.invalidData);
  }
  if (
    !ensureInteger(value.version) ||
    !SUPPORTED_EXPORT_VERSIONS.has(value.version)
  ) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.unsupportedVersion);
  }
  validateStudents(value.students);
  validateSavedPlans(value.seatingHistory);
  validateMixResults(value.mixHistory);
  validateClassroomScene(value.classroomScene);
  validateMixSettings(value.mixSettings);
  validateLockedPositions(value.lockedPositions);
  validateClassroomTemplates(value.classroomTemplates);

  // Validate optional circle data
  if ('circleLayouts' in value && value.circleLayouts) {
    validateCircleLayouts(value.circleLayouts);
  }
  if ('currentCircleLayout' in value && value.currentCircleLayout) {
    validateCircleLayout(value.currentCircleLayout);
  }
  if ('classCollection' in value && value.classCollection) {
    validateClassCollection(value.classCollection);
  }
  if ('studentPhotos' in value && value.studentPhotos) {
    validateStudentPhotos(value.studentPhotos);
  }
}

function assertEncryptedBackupPayload(
  value: unknown,
): asserts value is EncryptedBackupPayload {
  if (!isObject(value) || value.encrypted !== true) {
    throw new BackupValidationError(
      BACKUP_ERROR_MESSAGES.invalidEncryptedPayload,
    );
  }
  if (!assertString(value.iv, { allowEmpty: false, maxLength: 256 })) {
    throw new BackupValidationError(
      BACKUP_ERROR_MESSAGES.invalidEncryptedPayload,
    );
  }
  if (!assertString(value.salt, { allowEmpty: false, maxLength: 256 })) {
    throw new BackupValidationError(
      BACKUP_ERROR_MESSAGES.invalidEncryptedPayload,
    );
  }
  if (
    !assertString(value.data, {
      allowEmpty: false,
      maxLength: BACKUP_LIMITS.decryptedJsonBytes * 8,
    })
  ) {
    throw new BackupValidationError(
      BACKUP_ERROR_MESSAGES.invalidEncryptedPayload,
    );
  }
}

export function parseEncryptedBackupPayload(
  value: unknown,
): EncryptedBackupPayload {
  assertEncryptedBackupPayload(value);
  return value;
}

export function parseExportBundle(json: string): ExportBundle {
  if (encoder.encode(json).length > BACKUP_LIMITS.decryptedJsonBytes) {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.payloadTooLarge);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw new BackupValidationError(BACKUP_ERROR_MESSAGES.unreadable);
  }
  validateExportBundleStructure(parsed);
  return parsed as ExportBundle;
}
