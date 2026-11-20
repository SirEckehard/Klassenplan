// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type {
  ClassroomFeature,
  ClassroomTable,
  RoomArrangementId,
} from '@/types';
import { determineFrontDirection } from '@/utils/algorithm/orientationUtils';
import {
  arrangeArrangement,
  arrangementCapacity,
  ROOM_ARRANGEMENTS,
} from '@/utils/algorithm/arrangements';

export interface RoomArrangementOption {
  id: RoomArrangementId;
  /** What it places for the class, towards the board: its preview. */
  tables: ClassroomTable[];
  /** Up to how many students it seats in this room. */
  capacity: number;
}

/** A class without students yet is previewed with a class of this size. */
const PREVIEW_CLASS = 24;

/**
 * The arrangements "Neu einrichten" offers (decision 0053): for each, the
 * tables it places for a class of `studentsCount` towards the board among
 * `features`, and up to how many students it seats there. Only the board's
 * wall matters, so moving a window builds nothing anew.
 */
export function useRoomArrangementOptions(
  studentsCount: number,
  features: readonly ClassroomFeature[],
): RoomArrangementOption[] {
  const wall = React.useMemo(
    () =>
      determineFrontDirection({
        tables: [],
        totalStudents: 0,
        features: [...features],
      }).frontDirection,
    [features],
  );
  return React.useMemo(() => {
    const students = studentsCount > 0 ? studentsCount : PREVIEW_CLASS;
    return ROOM_ARRANGEMENTS.map((id) => ({
      id,
      tables: arrangeArrangement(id, students, wall),
      capacity: arrangementCapacity(id, wall),
    }));
  }, [studentsCount, wall]);
}
