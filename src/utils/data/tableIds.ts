// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Tables carry ids, and locks name their table by id (decision 0036).
 *
 * A lock used to name its table by its place in the scene's list, so every
 * change that moves tables in the list had to move the locks along — removing
 * a table did, its undo did not, and the locks of the students at a removed
 * table were gone for good. With the table's id the index is derived:
 * `anchorLocks` sets it wherever the table now is, and to `-1` while it is
 * gone, which no mix, no seat and no swap reads; an undo that brings the
 * table back brings the lock back with it.
 */
import type { ClassroomScene, ClassroomTable, LockedPositions } from '@/types';
import { generateId } from '@/utils';

/** The index of a lock whose table is gone: it rests, and binds nothing. */
export const RESTING_LOCK_TABLE = -1;

/**
 * The tables with an id each, unique in the list: a table without one, or
 * with the id of a table before it — a pasted or duplicated copy — gets a new
 * one. The same array when every table has its own already.
 */
export function withTableIds(tables: ClassroomTable[]): ClassroomTable[] {
  if (!Array.isArray(tables)) return tables;
  const seen = new Set<string>();
  let changed = false;
  const next = tables.map((table) => {
    if (table.id && !seen.has(table.id)) {
      seen.add(table.id);
      return table;
    }
    changed = true;
    const id = generateId();
    seen.add(id);
    return { ...table, id };
  });
  return changed ? next : tables;
}

/** The scene with an id on every table; the same object when it has them. */
export function withSceneTableIds(scene: ClassroomScene): ClassroomScene {
  if (!scene || !Array.isArray(scene.tables)) return scene;
  const tables = withTableIds(scene.tables);
  return tables === scene.tables ? scene : { ...scene, tables };
}

/**
 * The locks with their table found by id: the index where the table now
 * stands, or `RESTING_LOCK_TABLE` while it is gone. A lock without an id —
 * just set, or written before decision 0036 — takes the id of the table at
 * its index. The same object when nothing changes.
 */
export function anchorLocks(
  locks: LockedPositions,
  tables: readonly ClassroomTable[],
): LockedPositions {
  // Tables that have no ids yet (a scene on its way into the live state) say
  // nothing about where a table went.
  if (tables.length > 0 && !tables.some((table) => table.id)) return locks;
  let changed = false;
  const anchored: LockedPositions = {};
  for (const [studentId, lock] of Object.entries(locks)) {
    let next = lock;
    if (lock.tableId) {
      const index = tables.findIndex((table) => table.id === lock.tableId);
      if (index !== lock.table) next = { ...lock, table: index };
    } else {
      const id = tables[lock.table]?.id;
      if (id) next = { ...lock, tableId: id };
    }
    if (next !== lock) changed = true;
    anchored[studentId] = next;
  }
  return changed ? anchored : locks;
}
