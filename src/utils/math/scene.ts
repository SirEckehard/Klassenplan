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
// Counts the total number of seats in a classroom scene or table list
export function countSeats(
  sceneOrTables: ClassroomScene | ClassroomTable[],
): number {
  const tables = Array.isArray(sceneOrTables)
    ? sceneOrTables
    : sceneOrTables.tables;
  return tables.reduce((sum, t) => sum + t.seatCount, 0);
}
