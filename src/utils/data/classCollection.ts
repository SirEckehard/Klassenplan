// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { generateId, MAX_NAME_LENGTH, uniqueName } from '@/utils';
import type {
  ClassCollectionState,
  ClassRecord,
  ClassSummary,
  CreateClassPayload,
} from '@/types';
import i18n from '@/i18n';

export const CLASS_COLLECTION_VERSION = 1;

export function createClassRecord(
  payload?: Partial<CreateClassPayload> & Partial<ClassRecord>,
): ClassRecord {
  const timestamp = new Date().toISOString();
  const baseName =
    payload?.name?.trim() || i18n.t('generator:common.newClassName');
  return {
    id: payload?.id ?? generateId(),
    name: baseName,
    label: payload?.label,
    notes: payload?.notes,
    createdAt: payload?.createdAt ?? timestamp,
    updatedAt: payload?.updatedAt ?? timestamp,
    lastUsedAt: payload?.lastUsedAt ?? timestamp,
    students: payload?.students ?? [],
    seatingHistory: payload?.seatingHistory ?? [],
    mixHistory: payload?.mixHistory ?? [],
    currentSeating: payload?.currentSeating ?? [],
    lockedPositions: payload?.lockedPositions ?? {},
    mixSettings: payload?.mixSettings ?? null,
    classroomScene: payload?.classroomScene ?? null,
    circleLayout: payload?.circleLayout ?? null,
  };
}

export function createClassCollection(
  initialClass?: ClassRecord,
): ClassCollectionState {
  if (!initialClass) {
    return {
      version: CLASS_COLLECTION_VERSION,
      activeClassId: null,
      classes: [],
    };
  }
  const classRecord = initialClass;
  return {
    version: CLASS_COLLECTION_VERSION,
    activeClassId: classRecord.id,
    classes: [classRecord],
  };
}

export function summarizeClass(record: ClassRecord): ClassSummary {
  return {
    id: record.id,
    name: record.name,
    label: record.label,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastUsedAt: record.lastUsedAt,
    studentCount: record.students.length,
  };
}

export function ensureActiveClass(
  collection: ClassCollectionState,
): ClassCollectionState {
  if (!collection.classes.length) {
    if (collection.activeClassId === null) {
      return collection;
    }
    return {
      ...collection,
      activeClassId: null,
    };
  }

  const activeExists =
    collection.activeClassId !== null &&
    collection.classes.some((entry) => entry.id === collection.activeClassId);
  if (activeExists) {
    return collection;
  }

  const first = collection.classes[0];
  return {
    ...collection,
    activeClassId: first.id,
  };
}

/** What `mergeClassCollections` made of two collections. */
export type ClassCollectionMerge = {
  collection: ClassCollectionState;
  /** The classes the merge added, in the order the incoming one holds them. */
  addedClassIds: string[];
};

/**
 * Adds the classes of `incoming` — a backup's — to `existing`, as a merge
 * import promises: every class already here stays as it is, and so does the
 * open one. A class whose id is here already is that same class from an
 * earlier backup and is left out; one whose name is taken gets a free one
 * ("7b (2)"), since class names are unique. On a device without a class the
 * backup's open class opens.
 */
export function mergeClassCollections(
  existing: ClassCollectionState,
  incoming: ClassCollectionState,
): ClassCollectionMerge {
  const knownIds = new Set(existing.classes.map((entry) => entry.id));
  const names = existing.classes.map((entry) => entry.name);
  const added: ClassRecord[] = [];
  for (const record of incoming.classes) {
    if (knownIds.has(record.id)) continue;
    const name = uniqueName(record.name, names, MAX_NAME_LENGTH);
    knownIds.add(record.id);
    names.push(name);
    added.push(name === record.name ? record : { ...record, name });
  }
  if (added.length === 0) {
    return { collection: existing, addedClassIds: [] };
  }

  const addedClassIds = added.map((entry) => entry.id);
  const activeClassId =
    existing.activeClassId === null &&
    incoming.activeClassId !== null &&
    addedClassIds.includes(incoming.activeClassId)
      ? incoming.activeClassId
      : existing.activeClassId;
  return {
    collection: ensureActiveClass({
      ...existing,
      activeClassId,
      classes: [...existing.classes, ...added],
    }),
    addedClassIds,
  };
}
