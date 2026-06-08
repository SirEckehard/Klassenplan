// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useState } from 'react';
import type { LockedPositions, SeatingArrangement } from '@/types';

/**
 * Manage locked seat positions.
 * Zustand or Redux Toolkit were considered but React state suffices here.
 */
export function useLockState(currentSeating: SeatingArrangement) {
  const [lockedPositions, setLockedPositions] = useState<LockedPositions>({});

  /**
   * Toggle the lock for a given student.
   * @param studentId Student identifier
   * @param table Table index
   * @param seat Seat index
   */
  const toggleLock = useCallback(
    (studentId: string, table: number, seat: number) => {
      setLockedPositions((prev) => {
        const curr = prev[studentId];
        if (curr && curr.table === table && curr.seat === seat) {
          const rest = { ...prev };
          delete rest[studentId];
          return rest;
        }
        return { ...prev, [studentId]: { table, seat } };
      });
    },
    [],
  );

  /**
   * Determine if the seat is locked for its occupant.
   * @param table Table index
   * @param seat Seat index
   * @returns `true` if locked
   */
  const isSeatLocked = useCallback(
    (table: number, seat: number): boolean => {
      const s = currentSeating?.[table]?.[seat];
      if (!s) return false;
      const lp = lockedPositions[s.id];
      return !!lp && lp.table === table && lp.seat === seat;
    },
    [currentSeating, lockedPositions],
  );

  /**
   * Remove lock for a specific student.
   * @param id Student identifier
   */
  const removeLock = useCallback((id: string) => {
    setLockedPositions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  /**
   * Clear all locked positions.
   */
  const clearLocks = useCallback(() => {
    setLockedPositions({});
  }, []);

  return {
    lockedPositions,
    setLockedPositions,
    toggleLock,
    isSeatLocked,
    removeLock,
    clearLocks,
  } as const;
}
