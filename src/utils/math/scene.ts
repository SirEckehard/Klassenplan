// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomScene,
  ClassroomTable,
  SeatingArrangement,
} from '@/types';

// Returns true if the seating arrangement does not match the classroom scene
export function hasShapeMismatch(
  scene: ClassroomScene,
  seating: SeatingArrangement | null,
): boolean {
  if (!seating) return true;
  if (seating.length !== scene.tables.length) return true;
  if (seating.some((t, idx) => t.length !== scene.tables[idx]?.seatCount))
    return true;
  return false;
}
/**
 * Whether there is a plan at all: at least one student in a seat. An
 * arrangement of empty tables is the room without a plan — exporting it gives
 * an empty sheet, and the status bar says "no plan yet" for it. Every place
 * that asks the question asks it here.
 */
export function hasSeatedStudent(seating: SeatingArrangement): boolean {
  return seating.some((table) => table.some(Boolean));
}

// Counts the total number of seats in a classroom scene or table list
export function countSeats(
  sceneOrTables: ClassroomScene | ClassroomTable[],
): number {
  const tables = Array.isArray(sceneOrTables)
    ? sceneOrTables
    : sceneOrTables.tables;
  return tables.reduce((sum, t) => sum + t.seatCount, 0);
}
