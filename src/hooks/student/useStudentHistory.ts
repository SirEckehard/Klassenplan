// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { Student } from '@/types';
import { createStudentSignature, deepClone } from '@/utils';
import { sweepPhotoTrash } from './studentPhotoTrash';

/**
 * One reversible step of the class list.
 *
 * Deliberately holds *only* the students. The seating plan is not part of it:
 * a snapshot taken here would be applied long after the teacher may have
 * edited the plan in step 3, and a step-1 undo must not quietly discard that
 * work. Deleting a student clears their seat (see the sync effect in
 * `useSeatingState`), and undoing brings them back to the list unseated — the
 * "class list changed" hint in the plan editor already asks for a re-mix.
 *
 * Locks are left out for the same reason, plus one of their own: a lock points
 * at the seat its student occupies, so restoring one for a student who is no
 * longer seated would describe a seat nobody sits on.
 */
export interface StudentSnapshot {
  students: Student[];
  /** Cheap change marker; identical signatures are not pushed twice. */
  signature: string;
}

export interface StudentHistoryHook {
  /**
   * Run `mutate` as a single undo step.
   *
   * The step is only kept if the class list actually changed, so a no-op edit
   * — blurring a name field without typing, an import the teacher cancelled —
   * neither consumes an undo nor discards the redo branch.
   */
  record: <T>(mutate: () => T) => T;
  /** Async counterpart of {@link StudentHistoryHook.record}. */
  recordAsync: <T>(mutate: () => Promise<T>) => Promise<T>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Drop both stacks — used when the underlying class changes. */
  resetHistory: () => void;
}

export interface UseStudentHistoryParams {
  /**
   * Synchronous read of the committed class list.
   *
   * Deliberately a getter rather than the rendered array: a mutation and the
   * check whether it changed anything happen inside one event handler, before
   * React has re-rendered, so a render-scoped value would still show the state
   * from before the write.
   */
  getStudents: () => Student[];
  applySnapshot: (students: Student[]) => void;
}

/**
 * Undo depth. A step of a 36-student class is a shallow clone of the list;
 * 30 of them stay well below what the mix history already holds.
 */
const HISTORY_LIMIT = 30;

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;

const mixInt = (hash: number, value: number): number =>
  Math.imul(hash ^ (value >>> 0), FNV_PRIME_32) >>> 0;

const mixString = (hash: number, value: string): number => {
  let next = hash;
  for (let i = 0; i < value.length; i++) {
    next = mixInt(next, value.charCodeAt(i));
  }
  return next;
};

/**
 * Signature over the whole class list, order included.
 *
 * Built from `createStudentSignature`, which serialises every field of a
 * student (and normalises the legacy partner ids), so a new attribute is
 * covered here the moment it exists — unlike a hand-maintained field list,
 * which silently stops detecting changes when the type grows.
 */
const createSignature = (students: Student[]): string => {
  let hash = FNV_OFFSET_BASIS;
  hash = mixInt(hash, students.length);
  students.forEach((student) => {
    hash = mixString(hash, createStudentSignature(student));
  });
  return (hash >>> 0).toString(16);
};

/** Ids of the students in `snapshots` (plus `live`) that carry a photo. */
const collectPhotoIds = (
  live: Student[],
  ...stacks: StudentSnapshot[][]
): Set<string> => {
  const ids = new Set<string>();
  const add = (students: Student[]) => {
    students.forEach((student) => {
      if (student.hasPhoto) {
        ids.add(student.id);
      }
    });
  };

  add(live);
  stacks.forEach((stack) => stack.forEach((entry) => add(entry.students)));
  return ids;
};

/**
 * Undo/redo for the class list — adding, removing, editing and importing
 * students in step 1.
 *
 * Mirrors `useSeatingHistory` (plan) and `useSceneHistory` (layout): the stacks
 * live in refs so consecutive actions inside one render cycle each record their
 * own entry, and the state mirrors exist only to re-render the buttons.
 *
 * Owns the retention side of the deferred photo deletion: whenever a snapshot
 * leaves the stacks, the blobs no longer reachable by any undo are committed
 * for real.
 */
export function useStudentHistory({
  getStudents,
  applySnapshot,
}: UseStudentHistoryParams): StudentHistoryHook {
  const undoStackRef = React.useRef<StudentSnapshot[]>([]);
  const redoStackRef = React.useRef<StudentSnapshot[]>([]);
  const [undoLength, setUndoLength] = React.useState(0);
  const [redoLength, setRedoLength] = React.useState(0);

  const syncMirrors = React.useCallback(() => {
    setUndoLength(undoStackRef.current.length);
    setRedoLength(redoStackRef.current.length);
    // A student only vanishes for good once no stack can reach them any more.
    sweepPhotoTrash(
      collectPhotoIds(
        getStudents(),
        undoStackRef.current,
        redoStackRef.current,
      ),
    );
  }, [getStudents]);

  const captureCurrent = React.useCallback((): StudentSnapshot => {
    const live = getStudents();
    return {
      students: deepClone(live),
      signature: createSignature(live),
    };
  }, [getStudents]);

  const restore = React.useCallback(
    (snapshot: StudentSnapshot) => {
      applySnapshot(snapshot.students);
    },
    [applySnapshot],
  );

  const pushUndoEntry = React.useCallback((snapshot: StudentSnapshot) => {
    const stack = [...undoStackRef.current, snapshot];
    undoStackRef.current =
      stack.length > HISTORY_LIMIT ? stack.slice(-HISTORY_LIMIT) : stack;
  }, []);

  const record = React.useCallback(
    <T>(mutate: () => T): T => {
      const before = captureCurrent();
      const result = mutate();

      // Compare against what the store actually holds now: an edit that
      // resolved to the same list is not a step the teacher can undo.
      if (createSignature(getStudents()) === before.signature) {
        return result;
      }

      pushUndoEntry(before);
      redoStackRef.current = [];
      syncMirrors();
      return result;
    },
    [captureCurrent, getStudents, pushUndoEntry, syncMirrors],
  );

  const recordAsync = React.useCallback(
    async <T>(mutate: () => Promise<T>): Promise<T> => {
      const before = captureCurrent();
      const result = await mutate();

      if (createSignature(getStudents()) === before.signature) {
        return result;
      }

      pushUndoEntry(before);
      redoStackRef.current = [];
      syncMirrors();
      return result;
    },
    [captureCurrent, getStudents, pushUndoEntry, syncMirrors],
  );

  const undo = React.useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) {
      return;
    }

    const target = stack[stack.length - 1];
    undoStackRef.current = stack.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, captureCurrent()].slice(
      -HISTORY_LIMIT,
    );

    restore(target);
    syncMirrors();
  }, [captureCurrent, restore, syncMirrors]);

  const redo = React.useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) {
      return;
    }

    const target = stack[stack.length - 1];
    redoStackRef.current = stack.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, captureCurrent()].slice(
      -HISTORY_LIMIT,
    );

    restore(target);
    syncMirrors();
  }, [captureCurrent, restore, syncMirrors]);

  const resetHistory = React.useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncMirrors();
  }, [syncMirrors]);

  return {
    record,
    recordAsync,
    undo,
    redo,
    canUndo: undoLength > 0,
    canRedo: redoLength > 0,
    resetHistory,
  };
}
