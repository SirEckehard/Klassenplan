// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Centralized storage key definitions for the application.
 * Contains all localStorage and IndexedDB keys in one place.
 */

export const STORAGE_KEYS = {
  localStorage: {
    theme: 'theme',
    cookieConsent: 'cookieConsent',
    showGrid: 'showGrid',
    alignmentGuides: 'spg.alignmentGuides',
    featureVisibility: 'spg.featureVisibility',
    seatingMode: 'spg.seatingMode',
    photoDisplayMode: 'spg.photoDisplayMode',
    circlePhotoMode: 'circle-photo-mode',
    lockSeatLabelOrientation: 'lockSeatLabelOrientation',
    seatLabelRotation: 'seatLabelRotation',
    presentShowPhotos: 'spg.present.showPhotos',
    presentShowColors: 'spg.present.showColors',
    presentShowFeatures: 'spg.present.showFeatures',
    presentZoom: 'spg.present.zoom',
    photoConsentConfirmed: 'spg.photoConsentConfirmed',
    lastSeenVersion: 'spg.lastSeenVersion',
    mixSettings: 'spg.mixSettings',
    sidebarExpanded: 'spg.sidebarExpanded',
    sidebarActiveTab: 'spg.sidebarActiveTab',
    hasVisitedApp: 'spg.hasVisitedApp',
    // Mirrors the migration version held in IndexedDB so the boot path can skip
    // opening the database when no migration can possibly be pending.
    migrationVersion: 'spg.migrationVersion',
  },
  indexedDB: {
    students: 'spg.students',
    seatingHistory: 'spg.seatingHistory',
    mixHistory: 'spg.mixHistory',
    currentSeating: 'spg.currentSeating',
    lockedPositions: 'spg.lockedPositions',
    classroomScene: 'spg.classroomScene',
    classroomTemplates: 'spg.classroomTemplates',
    mixSettings: 'spg.mixSettings',
    circleLayouts: 'spg.circleLayouts',
    currentCircleLayout: 'spg.currentCircleLayout',
    classCollection: 'spg.classCollection',
    nameGameStats: 'spg.nameGameStats',
    version: 'spg.version',
  },
} as const;

/**
 * Student photos live in their own IndexedDB database/object store (created via
 * idb-keyval's `createStore`), NOT in the default `keyval` store used by the
 * keys above. This keeps the (potentially larger) binary blobs out of every
 * read/write of the class collection and lets us clear them independently.
 *
 * Keys inside this store are raw `student.id` strings; values are image Blobs.
 * Managed by {@link file://./../../repositories/studentPhotoStore.ts}.
 */
export const STUDENT_PHOTO_STORE = {
  dbName: 'spg-student-photos',
  storeName: 'photos',
} as const;

// Legacy exports for backward compatibility
export const LOCAL_STORAGE_KEYS = STORAGE_KEYS.localStorage;
export const DB_KEYS = STORAGE_KEYS.indexedDB;

/**
 * Per-feature visibility flags that predate the `spg.featureVisibility`
 * record. Read once for migration and kept in the cleanup list so a full
 * data wipe removes them from existing installations.
 */
export const LEGACY_FEATURE_VISIBILITY_KEYS = [
  'showBoard',
  'showWindows',
  'showDoor',
  'showPodium',
] as const;

// Type definitions
export type LocalStorageKey = keyof typeof STORAGE_KEYS.localStorage;
export type LocalStorageValue =
  (typeof STORAGE_KEYS.localStorage)[LocalStorageKey];

export type IndexedDBKey = keyof typeof STORAGE_KEYS.indexedDB;
export type IndexedDBValue = (typeof STORAGE_KEYS.indexedDB)[IndexedDBKey];

export type StorageKey = LocalStorageKey | IndexedDBKey;

// Project localStorage keys array for cleanup operations
export const PROJECT_LOCAL_STORAGE_KEYS = [
  STORAGE_KEYS.localStorage.theme,
  STORAGE_KEYS.localStorage.cookieConsent,
  STORAGE_KEYS.localStorage.showGrid,
  STORAGE_KEYS.localStorage.alignmentGuides,
  STORAGE_KEYS.localStorage.featureVisibility,
  ...LEGACY_FEATURE_VISIBILITY_KEYS,
  STORAGE_KEYS.localStorage.seatingMode,
  STORAGE_KEYS.localStorage.photoDisplayMode,
  STORAGE_KEYS.localStorage.circlePhotoMode,
  STORAGE_KEYS.localStorage.lockSeatLabelOrientation,
  STORAGE_KEYS.localStorage.seatLabelRotation,
  STORAGE_KEYS.localStorage.presentShowPhotos,
  STORAGE_KEYS.localStorage.presentShowColors,
  STORAGE_KEYS.localStorage.presentShowFeatures,
  STORAGE_KEYS.localStorage.presentZoom,
  STORAGE_KEYS.localStorage.photoConsentConfirmed,
  STORAGE_KEYS.localStorage.lastSeenVersion,
  STORAGE_KEYS.localStorage.mixSettings,
  STORAGE_KEYS.localStorage.sidebarExpanded,
  STORAGE_KEYS.localStorage.sidebarActiveTab,
  STORAGE_KEYS.localStorage.hasVisitedApp,
  STORAGE_KEYS.localStorage.migrationVersion,
] as const;

export type ProjectLocalStorageKey =
  (typeof PROJECT_LOCAL_STORAGE_KEYS)[number];

/**
 * Get all localStorage keys for the project
 */
export function getLocalStorageKeys(): readonly string[] {
  return PROJECT_LOCAL_STORAGE_KEYS;
}

/**
 * Get all IndexedDB keys for the project
 */
export function getIndexedDBKeys(): readonly string[] {
  return Object.values(STORAGE_KEYS.indexedDB);
}

/**
 * Get all storage keys (localStorage + IndexedDB) for the project
 */
export function getAllStorageKeys(): readonly string[] {
  return [...getLocalStorageKeys(), ...getIndexedDBKeys()];
}
