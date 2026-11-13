// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Markers carry a date, and the app asks whether they still hold (decision
 * 0044).
 *
 * A marker describes how a student behaves now, not who they are
 * (PEDAGOGY.md § 2), and children change. Every change of a marker stamps the
 * student with the day (`markersUpdatedAt`); "Passt noch" stamps the class
 * (`markersReviewedAt`). Once a student's markers have stood still longer than
 * `MARKER_REVIEW_AGE_WEEKS`, the plan layer asks once. Nothing changes by
 * itself: the teacher looks, keeps or changes.
 *
 * A class from before the dates counts from the day it was created. The
 * snooze of "Später" lives in localStorage by class id, nothing more.
 */
import type { Student } from '@/types';
import { logWarn, toIsoDate } from '@/utils';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';

const SOURCE = 'markerReview';

/** How long markers may stand unchanged before the app asks (maintainer). */
export const MARKER_REVIEW_AGE_WEEKS = 12;

/** How long "Später" keeps the question away. */
const MARKER_REVIEW_SNOOZE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * What describes a student for the mixing: behaviour, needs, wishes,
 * languages, roles, preferences. Not the name, the gender or the photo.
 */
const MARKER_KEYS = [
  'restless',
  'shy',
  'concentrationIssues',
  'needsFrontSeat',
  'performanceStrong',
  'performanceWeak',
  'height',
  'languageSkill',
  'socialRole',
  'wishPartnerIds',
  'avoidPartnerIds',
  'wishPartnerId',
  'avoidPartnerId',
  'prefersWindow',
  'prefersDoor',
  'needsFreeNeighbourSeat',
  'leftHanded',
] as const satisfies readonly (keyof Student)[];

/** A value as a marker reads it: unset, false and an empty list are one. */
const markerValue = (value: unknown): string => {
  if (value === undefined || value === null || value === false) return '';
  if (value === 'medium') return '';
  if (Array.isArray(value)) return value.join(',');
  return String(value);
};

/** Whether a student carries any marker at all. */
export const hasMarkers = (student: Student): boolean =>
  MARKER_KEYS.some((key) => markerValue(student[key]) !== '');

/** Whether a patch changes a marker of the student. */
const changesMarkers = (student: Student, patch: Partial<Student>): boolean =>
  MARKER_KEYS.some(
    (key) =>
      key in patch && markerValue(patch[key]) !== markerValue(student[key]),
  );

/**
 * The student after a patch, stamped with the day when the patch changed a
 * marker; the patched student as it is otherwise.
 */
export const stampMarkerChange = (
  before: Student,
  after: Student,
  patch: Partial<Student>,
  today: string = toIsoDate(),
): Student =>
  changesMarkers(before, patch) ? { ...after, markersUpdatedAt: today } : after;

/** A student new to the class, stamped when they arrive with markers. */
export const stampNewStudent = (
  student: Student,
  today: string = toIsoDate(),
): Student =>
  hasMarkers(student) ? { ...student, markersUpdatedAt: today } : student;

/** Midnight of a stored day, local time, as `toIsoDate` wrote it. */
const dayStart = (iso: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  ).getTime();
};

export interface MarkerReviewInput {
  students: readonly Student[];
  /** When the class was made: the clock of a class from before the dates */
  createdAt?: string;
  /** When "Passt noch" was last pressed */
  reviewedAt?: string;
  now?: Date;
}

/**
 * How many students carry markers older than the review age, each counted
 * from the latest of its own change, the class's last review and the class's
 * creation. Students without a marker are never asked about.
 */
export function staleMarkerCount({
  students,
  createdAt,
  reviewedAt,
  now = new Date(),
}: MarkerReviewInput): number {
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const limit = MARKER_REVIEW_AGE_WEEKS * 7 * DAY_MS;
  const classBasis = Math.max(
    (createdAt && dayStart(createdAt)) || 0,
    (reviewedAt && dayStart(reviewedAt)) || 0,
  );
  let stale = 0;
  for (const student of students) {
    if (!hasMarkers(student)) continue;
    const basis = Math.max(
      classBasis,
      (student.markersUpdatedAt && dayStart(student.markersUpdatedAt)) || 0,
    );
    if (basis > 0 && today - basis >= limit) stale += 1;
  }
  return stale;
}

const readSnoozes = (): Record<string, string> => {
  try {
    const raw = window.localStorage.getItem(
      LOCAL_STORAGE_KEYS.markerReviewSnoozedUntil,
    );
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, string>)
      : {};
  } catch (error) {
    logWarn('Could not read the marker review snooze', { error }, SOURCE);
    return {};
  }
};

/** Whether "Später" still keeps the question away for the class. */
export function isMarkerReviewSnoozed(
  classId: string,
  now: Date = new Date(),
): boolean {
  const until = readSnoozes()[classId];
  const time = until ? Date.parse(until) : Number.NaN;
  return Number.isFinite(time) && now.getTime() < time;
}

/** "Später": the question comes again in `MARKER_REVIEW_SNOOZE_DAYS`. */
export function snoozeMarkerReview(
  classId: string,
  now: Date = new Date(),
): void {
  const snoozes = readSnoozes();
  snoozes[classId] = new Date(
    now.getTime() + MARKER_REVIEW_SNOOZE_DAYS * DAY_MS,
  ).toISOString();
  try {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEYS.markerReviewSnoozedUntil,
      JSON.stringify(snoozes),
    );
  } catch (error) {
    // A full or blocked storage only means the question comes again.
    logWarn('Could not store the marker review snooze', { error }, SOURCE);
  }
}
