// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomScene,
  MixResult,
  MixSettings,
  PlanUsage,
  SavedPlan,
  SeatingArrangement,
} from '@/types';
import { buildCriterionHighlightEntries } from './criterionHighlights';
import type { CriterionFulfillment } from './seatingStatistics';

/**
 * Why the plan looks the way it does, in the few sentences a teacher would
 * want before defending a seating plan to a class.
 *
 * Every reason is read off the plan that was actually built — the same
 * per-seat data the highlights are drawn from — never from a template of
 * plausible-sounding sentences. A reason that cannot be backed by seats is
 * not produced at all (decision 0018).
 */

export type PlanReasonTone = 'met' | 'open';

export interface PlanReason {
  key: CriterionFulfillment['key'];
  tone: PlanReasonTone;
  percentage: number;
  /** The counting behind the percentage, where the criterion has one. */
  fulfilled: number;
  total: number;
  /** Whether the sentence is about people rather than about tables or pairs. */
  named: boolean;
  /** Who the sentence is about, in seating order; empty where names say nothing. */
  studentIds: string[];
  /** Students concerned beyond {@link studentIds}. */
  moreStudents: number;
}

/** Everything above this counts as done; the rest is what is still open. */
const MET_THRESHOLD = 95;

/** More than three names stop being a sentence and start being a list. */
const MAX_NAMES = 3;

/**
 * The criteria a name means something for. "Ben und Mats sitzen nebeneinander"
 * is a fact about two students; "an vier von fünf Tischen sind die Rollen
 * verteilt" is a fact about tables, and naming everybody sitting at them would
 * say nothing.
 */
const NAMED_CRITERIA: ReadonlySet<keyof MixSettings> = new Set([
  'considerWishPartners',
  'avoidConflictPartners',
  'avoidPreviousPairs',
  'avoidRestlessTogether',
  'avoidConcentrationTogether',
  'avoidShyAlone',
  'preferFrontForNeedsFrontSeat',
  'preferWindowSeats',
  'preferDoorSeats',
]);

type BuildPlanReasonsParams = {
  /** What the last mix scored; only active criteria are considered. */
  fulfillment: CriterionFulfillment[];
  arrangement: SeatingArrangement;
  scene: ClassroomScene;
  seatingHistory?: SavedPlan[];
  mixHistory?: MixResult[];
  planUsage?: PlanUsage[];
  limit?: number;
};

/**
 * The criteria worth a sentence: the heaviest ones, and always the one that
 * came off worst — a plan that only praises itself is not worth reading.
 */
const selectCriteria = (
  fulfillment: CriterionFulfillment[],
  limit: number,
): CriterionFulfillment[] => {
  const active = fulfillment.filter(
    (criterion) => criterion.active && criterion.weight > 0,
  );
  if (active.length === 0) return [];

  const byWeight = [...active].sort((a, b) => b.weight - a.weight);
  const weakest = [...active].sort((a, b) => a.percentage - b.percentage)[0];

  const chosen: CriterionFulfillment[] = [];
  if (weakest.percentage < MET_THRESHOLD) {
    chosen.push(weakest);
  }
  for (const criterion of byWeight) {
    if (chosen.length >= limit) break;
    if (chosen.some((entry) => entry.key === criterion.key)) continue;
    chosen.push(criterion);
  }

  // What worked first, what is open last — the way the panel reads it.
  return chosen.sort((a, b) => b.percentage - a.percentage).slice(0, limit);
};

export function buildPlanReasons({
  fulfillment,
  arrangement,
  scene,
  seatingHistory,
  mixHistory,
  planUsage,
  limit = 3,
}: BuildPlanReasonsParams): PlanReason[] {
  return selectCriteria(fulfillment, limit).map((criterion) => {
    const tone: PlanReasonTone =
      criterion.percentage >= MET_THRESHOLD ? 'met' : 'open';

    const named = NAMED_CRITERIA.has(criterion.key);
    let studentIds: string[] = [];
    if (named) {
      const entries = buildCriterionHighlightEntries({
        criterionKey: criterion.key,
        arrangement,
        scene,
        seatingHistory,
        mixHistory,
        planUsage,
      });
      // The seats the sentence is about: those still short of the criterion
      // where it is open, those it worked out for where it is met.
      const seen = new Set<string>();
      for (const entry of entries) {
        const id = entry.target.studentId;
        if (!id || seen.has(id)) continue;
        const isOk = entry.status === 'ok';
        if (tone === 'open' ? isOk : !isOk) continue;
        seen.add(id);
      }
      studentIds = [...seen];
    }

    const count = criterion.count;
    return {
      key: criterion.key,
      tone,
      named,
      percentage: criterion.percentage,
      fulfilled: count?.fulfilled ?? 0,
      total: count?.total ?? 0,
      studentIds: studentIds.slice(0, MAX_NAMES),
      moreStudents: Math.max(0, studentIds.length - MAX_NAMES),
    };
  });
}
