import { generateId } from '@/utils';
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
