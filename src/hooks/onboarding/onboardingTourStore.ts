// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Which coach-mark tours a teacher has already seen.
 *
 * There is one tour per wizard context (`components/onboarding/tours.ts`); the
 * record lives in localStorage under `spg.onboardingTour`. A tour counts as
 * seen the moment it appears, not when it is finished: a teacher who clicks on
 * into the app halfway through has seen enough, and a tour that returns on every
 * reload until someone presses "Fertig" is exactly the nagging it must avoid.
 *
 * Installations that predate the tours are not greeted by them after an update.
 * `spg.hasVisitedApp` — set by `useFirstVisit` once a step 2/3 view or the
 * export page has been open — tells them apart: a record created while that
 * flag exists starts out skipped. The record is written on first use, so the
 * flag the same session sets moments later cannot turn a new teacher into a
 * returning one on the next visit.
 *
 * The Help dialog starts a tour again at any time (`requestTour`), whether tours
 * were skipped or not.
 *
 * Module state instead of a context: the tour host and the Help button in the
 * wizard header are the only readers, and a provider around the app for them
 * would cost more than it explains.
 */
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { LOCAL_STORAGE_KEYS, logDebug } from '@/utils';

export type TourId = 'welcome' | 'students' | 'layout' | 'plan';

const TOUR_IDS: readonly TourId[] = ['welcome', 'students', 'layout', 'plan'];
const TOUR_RECORD_VERSION = 1;

interface TourRecord {
  version: typeof TOUR_RECORD_VERSION;
  /** Tours that have been on screen at least once. */
  seen: TourId[];
  /** "Nicht mehr zeigen" was pressed, or the installation predates the tours. */
  skipped: boolean;
}

interface TourSnapshot {
  record: TourRecord;
  /** A tour started from the Help dialog; it runs even when tours are skipped. */
  requested: TourId | null;
}

let snapshot: TourSnapshot | null = null;
/** Whether the record in `snapshot` is known to be in localStorage. */
let recordStored = false;
const listeners = new Set<() => void>();

const isTourId = (value: unknown): value is TourId =>
  TOUR_IDS.includes(value as TourId);

function parseRecord(raw: string | null): TourRecord | null {
  if (raw === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const { version, seen, skipped } = parsed as Record<string, unknown>;
    if (
      version !== TOUR_RECORD_VERSION ||
      !Array.isArray(seen) ||
      typeof skipped !== 'boolean'
    ) {
      return null;
    }
    return {
      version: TOUR_RECORD_VERSION,
      seen: seen.filter(isTourId),
      skipped,
    };
  } catch {
    return null;
  }
}

function readInitialSnapshot(): TourSnapshot {
  try {
    const existing = parseRecord(
      localStorage.getItem(LOCAL_STORAGE_KEYS.onboardingTour),
    );
    if (existing) {
      recordStored = true;
      return { record: existing, requested: null };
    }
    const returningTeacher =
      localStorage.getItem(LOCAL_STORAGE_KEYS.hasVisitedApp) !== null;
    return {
      record: {
        version: TOUR_RECORD_VERSION,
        seen: [],
        skipped: returningTeacher,
      },
      requested: null,
    };
  } catch (error) {
    // A tour that cannot remember being seen would return on every visit, so
    // without storage there are no automatic tours at all.
    logDebug('Onboarding tour record unavailable', { error });
    recordStored = true;
    return {
      record: { version: TOUR_RECORD_VERSION, seen: [], skipped: true },
      requested: null,
    };
  }
}

function getSnapshot(): TourSnapshot {
  snapshot ??= readInitialSnapshot();
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function writeRecord(record: TourRecord): void {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.onboardingTour,
      JSON.stringify(record),
    );
    recordStored = true;
  } catch (error) {
    logDebug('Failed to persist onboarding tour record', { error });
  }
}

function update(next: TourSnapshot, persist: boolean): void {
  snapshot = next;
  if (persist) {
    writeRecord(next.record);
  }
  for (const listener of listeners) {
    listener();
  }
}

function storeInitialRecord(): void {
  const current = getSnapshot();
  if (!recordStored) {
    writeRecord(current.record);
  }
}

function markTourSeen(id: TourId): void {
  const { record, requested } = getSnapshot();
  update(
    {
      record: {
        ...record,
        seen: record.seen.includes(id) ? record.seen : [...record.seen, id],
      },
      requested: requested === id ? null : requested,
    },
    true,
  );
}

function skipTours(): void {
  const { record } = getSnapshot();
  update({ record: { ...record, skipped: true }, requested: null }, true);
}

function requestTour(id: TourId): void {
  update({ ...getSnapshot(), requested: id }, false);
}

/** Test seam: the record outlives a single render tree. */
export function resetOnboardingTourForTests(): void {
  snapshot = null;
  recordStored = false;
}

/**
 * Read and update the tour record.
 *
 * `isTourDue` answers whether the tour for a context should start: it was asked
 * for from the Help dialog, or it has never been shown and tours are not skipped.
 */
export function useOnboardingTour() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    storeInitialRecord();
  }, []);

  const isTourDue = useCallback(
    (id: TourId) =>
      current.requested === id ||
      (!current.record.skipped && !current.record.seen.includes(id)),
    [current],
  );

  return useMemo(
    () => ({ isTourDue, markTourSeen, skipTours, requestTour }),
    [isTourDue],
  );
}
