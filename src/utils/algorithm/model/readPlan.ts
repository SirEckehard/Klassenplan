// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomScene,
  MixSettings,
  PlanUsage,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import { buildPreviousPairs } from '@/utils/pairs';
import {
  buildModelContext,
  occupantsOf,
  type ModelContext,
  type Occupants,
} from './objective';

export interface PlanReading {
  arrangement: SeatingArrangement;
  students: Student[];
  settings: Partial<MixSettings>;
  scene: ClassroomScene;
  seatingHistory?: SavedPlan[];
  planUsage?: PlanUsage[];
  /** When the neighbourhoods were last reset; see `buildPreviousPairs`. */
  planUsageSince?: string | null;
  /** Whether the class marks its plans by hand; see `buildPreviousPairs`. */
  planUsageManual?: boolean;
}

/**
 * The model of a plan as the teacher sees it: the context and the occupants
 * the fulfilment and the highlights read. A seat counts as taken when someone
 * sits on it — the plan is what it is, there are no targets to fill. Its
 * repetition is read against the plans in use, the plan itself left out
 * (decision 0032).
 */
export function readPlan(reading: PlanReading): {
  context: ModelContext;
  occupants: Occupants;
} {
  const { arrangement, students, settings, scene } = reading;
  const previousPairs =
    (settings.avoidPreviousPairs ?? 0) > 0
      ? buildPreviousPairs(reading.seatingHistory ?? [], {
          plan: arrangement,
          planUsage: reading.planUsage,
          since: reading.planUsageSince,
          manual: reading.planUsageManual,
          studentCount: students.length,
        })
      : new Map<string, number>();
  const context = buildModelContext({
    scene,
    students,
    settings,
    previousPairs,
    usable: (table, seat) => Boolean(arrangement[table]?.[seat]),
    arrangement,
  });
  return { context, occupants: occupantsOf(context, arrangement) };
}
