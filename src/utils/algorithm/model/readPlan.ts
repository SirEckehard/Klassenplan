// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomScene,
  MixResult,
  MixSettings,
  PlanUsage,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import { buildPreviousPairs } from '@/utils/pairs';
import {
  collectSeatingPairKeys,
  computePlanFingerprint,
} from '@/utils/data/planUsage';
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
  /** The mix history as stored: the plan's own mix, if any, last */
  mixHistory?: MixResult[];
  planUsage?: PlanUsage[];
  /** When the neighbourhoods were last reset; see `buildPreviousPairs`. */
  planUsageSince?: string | null;
  /** Whether the class marks its plans by hand; see `buildPreviousPairs`. */
  planUsageManual?: boolean;
}

const fingerprintOf = (seating: SeatingArrangement | null | undefined) =>
  computePlanFingerprint(collectSeatingPairKeys(seating));

/**
 * What came before a plan, the way its mix weighed it: when the plan is the
 * newest mix, that mix is no history of its own and the mix before it was the
 * plan on screen (`runMixSession`'s `lastSeating`); a plan rearranged by hand
 * since has every mix behind it.
 */
const historyBeforePlan = (
  mixHistory: MixResult[],
  arrangement: SeatingArrangement,
): { mixes: MixResult[]; previousSeating: SeatingArrangement | null } => {
  const newest = mixHistory[mixHistory.length - 1];
  if (newest && fingerprintOf(newest.seating) === fingerprintOf(arrangement)) {
    return {
      mixes: mixHistory.slice(0, -1),
      previousSeating: mixHistory[mixHistory.length - 2]?.seating ?? null,
    };
  }
  return { mixes: mixHistory, previousSeating: null };
};

/**
 * The model of a plan as the teacher sees it: the context and the occupants
 * the fulfilment and the highlights read. A seat counts as taken when someone
 * sits on it — the plan is what it is, there are no targets to fill.
 */
export function readPlan(reading: PlanReading): {
  context: ModelContext;
  occupants: Occupants;
} {
  const { arrangement, students, settings, scene } = reading;
  const { mixes, previousSeating } = historyBeforePlan(
    reading.mixHistory ?? [],
    arrangement,
  );
  const previousPairs =
    (settings.avoidPreviousPairs ?? 0) > 0
      ? buildPreviousPairs(reading.seatingHistory ?? [], {
          mixHistory: mixes,
          currentSeating: previousSeating,
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
