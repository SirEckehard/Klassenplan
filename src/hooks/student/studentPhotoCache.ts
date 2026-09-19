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

// Re-exported so components can read the stored blob (e.g. to re-edit a
// photo) without importing the repository directly.
export { getStudentPhoto } from '@/repositories/studentPhotoStore';
import type { RepositoryError } from '@/repositories/types';
import { blobToDataUrl } from '@/utils/image/processStudentPhoto';
import { logError } from '@/utils';

const LOG_SOURCE = 'studentPhotoCache';

interface PhotoEntry {
  objectUrl: string;
  dataUrl: string;
}

/**
 * Raised when the photo store could not save or delete a photo.
 *
 * The cache turns the storage `Result` into an exception here because its
 * callers are UI handlers that already show a toast on rejection — a silently
 * ignored failure would leave a photo visible that is not actually stored.
 */
export class StudentPhotoStorageError extends Error {
  readonly cause: RepositoryError;

  constructor(cause: RepositoryError) {
    super(cause.message);
    this.name = 'StudentPhotoStorageError';
    this.cause = cause;
  }
}

const cache = new Map<string, PhotoEntry>();
/** In-flight loads, with the generation they were started for. */
const inflight = new Map<
  string,
  { generation: number; promise: Promise<PhotoEntry | undefined> }
>();

/**
 * Per-id counter, raised whenever a photo is invalidated or written directly.
 *
 * A load that started before that must not store its blob afterwards: the photo
 * it read has since been deleted or replaced, and writing it back would put a
 * stale entry (and a leaked Object URL) into the cache.
 */
const generations = new Map<string, number>();

function bumpGeneration(id: string): void {
  generations.set(id, (generations.get(id) ?? 0) + 1);
}

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
  const generation = generations.get(id) ?? 0;
  const pending = inflight.get(id);
  // Only reuse a load that was started for the photo as it is now — one from
  // before an invalidation discards its result and would hand this caller an
  // empty answer for a photo that is there.
  if (pending && pending.generation === generation) {
    return pending.promise;
  }

  const promise = (async () => {
    try {
      const stored = await getStudentPhoto(id);
      if (!stored.success) {
        logError(
          'Failed to load student photo',
          { error: stored.error, id },
          LOG_SOURCE,
        );
        return undefined;
      }
      const blob = stored.data;
      if (!blob) {
        return undefined;
      }
      const dataUrl = await blobToDataUrl(blob);
      if ((generations.get(id) ?? 0) !== generation) {
        // Invalidated or replaced while this load was in flight.
        return undefined;
      }
      const objectUrl = URL.createObjectURL(blob);
      const entry = storeEntry(id, objectUrl, dataUrl);
      notify();
      return entry;
    } catch (error) {
      logError('Failed to load student photo', { error, id }, LOG_SOURCE);
      return undefined;
    } finally {
      // Only if no newer load has taken this slot in the meantime.
      if (inflight.get(id)?.generation === generation) {
        inflight.delete(id);
      }
    }
  })();

  inflight.set(id, { generation, promise });
  return promise;
}

/**
 * Persist a freshly processed photo blob and update the cache immediately so
 * the UI reflects it without a round-trip to IndexedDB.
 */
export async function saveStudentPhoto(id: string, blob: Blob): Promise<void> {
  const stored = await setStudentPhoto(id, blob);
  if (!stored.success) {
    throw new StudentPhotoStorageError(stored.error);
  }
  // Before awaiting, so a load already in flight cannot overwrite this photo
  // with the one it read from storage a moment ago.
  bumpGeneration(id);
  const dataUrl = await blobToDataUrl(blob);
  const objectUrl = URL.createObjectURL(blob);
  storeEntry(id, objectUrl, dataUrl);
  notify();
}

/** Remove a photo from storage and invalidate the cached representations. */
export async function removeStudentPhoto(id: string): Promise<void> {
  invalidatePhoto(id);
  const removed = await deleteStudentPhoto(id);
  if (!removed.success) {
    throw new StudentPhotoStorageError(removed.error);
  }
}

/** Drop every cached photo (revokes all Object URLs). Used after a full import. */
export function clearPhotoCache(): void {
  for (const id of inflight.keys()) {
    bumpGeneration(id);
  }
  if (cache.size === 0) return;
  for (const [id, entry] of cache) {
    bumpGeneration(id);
    URL.revokeObjectURL(entry.objectUrl);
  }
  cache.clear();
  notify();
}

/** Drop cached representations for `id` (revokes the Object URL). */
export function invalidatePhoto(id: string): void {
  bumpGeneration(id);
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
