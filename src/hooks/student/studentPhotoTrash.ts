// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Deferred deletion of student photos.
 *
 * Removing a student — or just their photo — is undoable in the class
 * workbench, so the blob has to outlive the removal: deleting it right away
 * would bring the student back with `hasPhoto: true` and nothing behind it.
 * Deletions are therefore only *scheduled* here and committed once no undo
 * step can reach the student any more (see `useStudentHistory`).
 *
 * The cached representations stay untouched while a deletion is pending, so an
 * undo shows the photo again without a round-trip to IndexedDB. They are
 * revoked together with the blob when the deletion is finally committed.
 *
 * Blobs still pending when the tab closes are not leaked forever: the start-up
 * `sweepOrphanPhotos` pass in `useSeatingPersistence` collects every photo
 * whose student no longer exists in any class.
 */
import { logWarn } from '@/utils';
import { removeStudentPhoto } from './studentPhotoCache';

const LOG_SOURCE = 'studentPhotoTrash';

/** Student ids whose photo is deleted as far as the UI is concerned. */
const pending = new Set<string>();

/**
 * Mark the photo of `id` as deleted without touching storage yet.
 *
 * Safe to call for students without a photo — the commit is a no-op then.
 */
export function schedulePhotoDeletion(id: string): void {
  pending.add(id);
}

/**
 * Commit every pending deletion whose student id is *not* in `retained`.
 *
 * `retained` must cover everything an undo could still bring back: the live
 * class list plus every student held in an undo or redo snapshot. Ids that are
 * retained stay pending and are re-evaluated on the next sweep.
 */
export function sweepPhotoTrash(retained: Iterable<string>): void {
  if (pending.size === 0) {
    return;
  }

  const keep = retained instanceof Set ? retained : new Set(retained);
  for (const id of [...pending]) {
    if (keep.has(id)) {
      continue;
    }
    pending.delete(id);
    removeStudentPhoto(id).catch((error) => {
      logWarn(
        'Failed to delete student photo',
        { studentId: id, error },
        LOG_SOURCE,
      );
    });
  }
}

/**
 * Drop the pending set without deleting anything.
 *
 * Used when storage is wiped wholesale (backup import, "delete all data") —
 * the blobs are gone anyway and committing would only log failures.
 */
export function clearPhotoTrash(): void {
  pending.clear();
}
