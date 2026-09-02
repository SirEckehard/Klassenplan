// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * React hooks exposing the student photo cache to components.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Student } from '@/types';
import {
  subscribe,
  getVersion,
  getCachedObjectUrl,
  getCachedDataUrl,
  ensurePhotoLoaded,
} from './studentPhotoCache';

export {
  getStudentPhoto,
  getStudentPhotoDataUrl,
  saveStudentPhoto,
} from './studentPhotoCache';

/**
 * Load and subscribe to a single student's photo.
 *
 * @returns Object URL (DOM) and Data URL (SVG/PDF); both undefined until loaded
 *   or when no photo exists. `loading` is true while the initial load runs.
 */
export function useStudentPhoto(
  id: string,
  hasPhoto: boolean | undefined,
): { objectUrl?: string; dataUrl?: string; loading: boolean } {
  useSyncExternalStore(subscribe, getVersion, getVersion);

  useEffect(() => {
    if (hasPhoto) {
      void ensurePhotoLoaded(id);
    }
  }, [id, hasPhoto]);

  if (!hasPhoto) {
    return { objectUrl: undefined, dataUrl: undefined, loading: false };
  }

  const objectUrl = getCachedObjectUrl(id);
  const dataUrl = getCachedDataUrl(id);
  return { objectUrl, dataUrl, loading: !objectUrl };
}

/**
 * Build a live `studentId -> Object URL` map for the students that have a photo.
 * Re-renders when any cached photo changes. Used by the interactive seating
 * plan / circle views.
 */
export function useStudentPhotoUrls(
  students: Student[],
): ReadonlyMap<string, string> {
  // Drives re-renders whenever a cached photo is added/removed; the version is
  // also a memo dependency so the map below is rebuilt with fresh Object URLs.
  const version = useSyncExternalStore(subscribe, getVersion, getVersion);

  // Stable key of the ids that currently have a photo, so the load effect only
  // re-runs when that set changes (not on every parent render).
  const photoIdsKey = useMemo(
    () =>
      students
        .filter((student) => student.hasPhoto)
        .map((student) => student.id)
        .join(','),
    [students],
  );

  useEffect(() => {
    if (!photoIdsKey) return;
    for (const id of photoIdsKey.split(',')) {
      void ensurePhotoLoaded(id);
    }
  }, [photoIdsKey]);

  return useMemo(() => {
    const map = new Map<string, string>();
    if (!photoIdsKey) return map;
    for (const id of photoIdsKey.split(',')) {
      const url = getCachedObjectUrl(id);
      if (url) {
        map.set(id, url);
      }
    }
    return map;
    // `version` intentionally busts the memo when cached photos change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoIdsKey, version]);
}
