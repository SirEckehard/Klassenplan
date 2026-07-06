// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * In-memory cache for student photos, keyed by `student.id`.
 *
 * Provides the two representations the app needs:
 * - an Object URL (`URL.createObjectURL`) for cheap DOM/`<img>` rendering, and
 * - a base64 Data URL for SVG `<image href>` in the seating plan / circle and
 *   for the PDF export (Object URLs would taint the canvas when an SVG is
 *   rasterized).
 *
 * The cache loads blobs from {@link studentPhotoStore} on demand, revokes Object
 * URLs on invalidation, and notifies React subscribers so live views update.
 */
import {
  getStudentPhoto,
  setStudentPhoto,
  deleteStudentPhoto,
} from '@/repositories/studentPhotoStore';
import { blobToDataUrl } from '@/utils/image/processStudentPhoto';
import { logError } from '@/utils';

const LOG_SOURCE = 'studentPhotoCache';

interface PhotoEntry {
  objectUrl: string;
  dataUrl: string;
}

const cache = new Map<string, PhotoEntry>();
const inflight = new Map<string, Promise<PhotoEntry | undefined>>();

let version = 0;
const listeners = new Set<() => void>();

function notify(): void {
  version += 1;
  for (const listener of listeners) {
    listener();
  }
}

/** Subscribe to cache changes (for `useSyncExternalStore`). */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Monotonic version, bumped whenever a cached photo is added/removed. */
export function getVersion(): number {
  return version;
}

/** Synchronously read the cached Object URL, if already loaded. */
export function getCachedObjectUrl(id: string): string | undefined {
  return cache.get(id)?.objectUrl;
}

/** Synchronously read the cached Data URL, if already loaded. */
export function getCachedDataUrl(id: string): string | undefined {
  return cache.get(id)?.dataUrl;
}

function storeEntry(
  id: string,
  objectUrl: string,
  dataUrl: string,
): PhotoEntry {
  const previous = cache.get(id);
  if (previous) {
    URL.revokeObjectURL(previous.objectUrl);
  }
  const entry: PhotoEntry = { objectUrl, dataUrl };
  cache.set(id, entry);
  return entry;
}

/**
 * Ensure the photo for `id` is loaded into the cache. Returns the cached entry,
 * or undefined if there is no stored photo. De-duplicates concurrent loads.
 */
export function ensurePhotoLoaded(id: string): Promise<PhotoEntry | undefined> {
  const existing = cache.get(id);
  if (existing) {
    return Promise.resolve(existing);
  }
  const pending = inflight.get(id);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    try {
      const blob = await getStudentPhoto(id);
      if (!blob) {
        return undefined;
      }
      const dataUrl = await blobToDataUrl(blob);
      const objectUrl = URL.createObjectURL(blob);
      const entry = storeEntry(id, objectUrl, dataUrl);
      notify();
      return entry;
    } catch (error) {
      logError('Failed to load student photo', { error, id }, LOG_SOURCE);
      return undefined;
    } finally {
      inflight.delete(id);
    }
  })();

  inflight.set(id, promise);
  return promise;
}

/**
 * Persist a freshly processed photo blob and update the cache immediately so
 * the UI reflects it without a round-trip to IndexedDB.
 */
export async function saveStudentPhoto(id: string, blob: Blob): Promise<void> {
  await setStudentPhoto(id, blob);
  const dataUrl = await blobToDataUrl(blob);
  const objectUrl = URL.createObjectURL(blob);
  storeEntry(id, objectUrl, dataUrl);
  notify();
}

/** Remove a photo from storage and invalidate the cached representations. */
export async function removeStudentPhoto(id: string): Promise<void> {
  invalidatePhoto(id);
  await deleteStudentPhoto(id);
}

/** Drop every cached photo (revokes all Object URLs). Used after a full import. */
export function clearPhotoCache(): void {
  if (cache.size === 0) return;
  for (const entry of cache.values()) {
    URL.revokeObjectURL(entry.objectUrl);
  }
  cache.clear();
  notify();
}

/** Drop cached representations for `id` (revokes the Object URL). */
export function invalidatePhoto(id: string): void {
  const entry = cache.get(id);
  if (entry) {
    URL.revokeObjectURL(entry.objectUrl);
    cache.delete(id);
    notify();
  }
}

/** Async Data URL accessor for the PDF export pre-load step. */
export async function getStudentPhotoDataUrl(
  id: string,
): Promise<string | undefined> {
  const entry = await ensurePhotoLoaded(id);
  return entry?.dataUrl;
}
