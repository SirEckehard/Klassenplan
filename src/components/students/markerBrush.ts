// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Icon } from '@phosphor-icons/react';
import type { Student } from '@/types';
import { STUDENT_FLAGS, type DataFamily } from '@/utils';
import { STUDENT_ATTRIBUTE_ICONS } from '@/utils/ui/studentAppearance';

/** A yes/no marker the brush sets on one student after another. */
export type BrushKey =
  | 'restless'
  | 'concentrationIssues'
  | 'shy'
  | 'performanceStrong'
  | 'performanceWeak'
  | 'needsFrontSeat'
  | 'prefersWindow'
  | 'prefersDoor'
  | 'needsFreeNeighbourSeat'
  | 'leftHanded';

export type BrushMarker = {
  key: BrushKey;
  family: DataFamily;
  icon: Icon;
  /** The word the marker's badge carries, so the brush and the chip agree. */
  labelKey: string;
  /** The other marker this one rules out, if any. */
  exclusiveWith?: BrushKey;
};

const flag = (key: (typeof STUDENT_FLAGS)[number]['key']): BrushMarker => {
  const entry = STUDENT_FLAGS.find((candidate) => candidate.key === key);
  if (!entry) throw new Error(`Unknown student flag: ${key}`);
  return {
    key,
    family: entry.family,
    icon: entry.icon,
    labelKey: `students:studentFlags.${key}.label`,
    exclusiveWith: entry.exclusiveWith,
  };
};

/**
 * The markers the brush offers, in the order a teacher thinks in: what
 * disturbs the lesson, then who holds back, then who needs what, then where
 * they would rather sit. Only the yes/no markers: a level (language, role,
 * height) or a partner needs a choice on every row, which the inspector
 * makes once for several ticked students.
 */
export const BRUSH_MARKERS: readonly BrushMarker[] = [
  flag('restless'),
  flag('concentrationIssues'),
  flag('shy'),
  flag('performanceStrong'),
  flag('performanceWeak'),
  flag('needsFrontSeat'),
  {
    key: 'prefersWindow',
    family: 'space',
    icon: STUDENT_ATTRIBUTE_ICONS.prefersWindow,
    labelKey: 'students:listHeader.windowFull',
  },
  {
    key: 'prefersDoor',
    family: 'space',
    icon: STUDENT_ATTRIBUTE_ICONS.prefersDoor,
    labelKey: 'students:listHeader.doorFull',
  },
  {
    key: 'needsFreeNeighbourSeat',
    family: 'space',
    icon: STUDENT_ATTRIBUTE_ICONS.needsFreeNeighbourSeat,
    labelKey: 'students:listHeader.freeNeighbourFull',
  },
  {
    key: 'leftHanded',
    family: 'space',
    icon: STUDENT_ATTRIBUTE_ICONS.leftHanded,
    labelKey: 'students:listHeader.leftHandedFull',
  },
];

export const brushMarker = (key: BrushKey): BrushMarker =>
  BRUSH_MARKERS.find((marker) => marker.key === key) ?? BRUSH_MARKERS[0];

/** Whether a student carries the brush's marker. */
export const hasBrushMarker = (student: Student, key: BrushKey): boolean =>
  Boolean(student[key]);

/**
 * The change one stroke of the brush makes: the marker on or off, and a
 * marker it rules out off with it (leistungsstark and leistungsschwach).
 */
export function brushPatch(
  student: Student,
  marker: BrushMarker,
): Partial<Student> {
  const next = !hasBrushMarker(student, marker.key);
  const patch: Partial<Student> = { [marker.key]: next };
  if (next && marker.exclusiveWith) patch[marker.exclusiveWith] = false;
  return patch;
}
