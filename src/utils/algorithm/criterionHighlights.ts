// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomScene,
  MixResult,
  PlanUsage,
  MixSettings,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import type { StatisticHighlightEntry } from '@/types/StatisticsHighlight';
import { getStatisticStatus } from '@/utils/ui/statisticsStatus';
import { evaluateCriteria, type CriteriaCases } from './model/fulfilment';
import { readPlan } from './model/readPlan';

type HighlightParams = {
  criterionKey: keyof MixSettings;
  arrangement: SeatingArrangement;
  scene: ClassroomScene;
  /** The class, as the fulfilment reads it */
  students: Student[];
  /** The weights the plan is read by, as the fulfilment reads them */
  settings: Partial<MixSettings>;
  seatingHistory?: SavedPlan[];
  mixHistory?: MixResult[];
  /** Records of plans that were really in use; see `buildPreviousPairs`. */
  planUsage?: PlanUsage[];
  /** When the neighbourhoods were last reset; see `buildPreviousPairs`. */
  planUsageSince?: string | null;
  /** Whether the class marks its plans by hand; see `buildPreviousPairs`. */
  planUsageManual?: boolean;
};

/**
 * The criteria a highlight shows: distractibility is one criterion with two
 * weights, so its highlight marks both of its cases where they carry weight.
 */
const highlightedKeys = (
  criterionKey: keyof MixSettings,
  settings: Partial<MixSettings>,
): Array<keyof CriteriaCases> => {
  if (criterionKey === 'avoidConcentrationTogether') {
    return (
      ['avoidConcentrationTogether', 'avoidConcentrationNearRestless'] as const
    ).filter((key) => (settings[key] ?? 0) > 0);
  }
  return criterionKey === 'neighborWeights' ||
    criterionKey === 'criteriaVersion'
    ? []
    : [criterionKey];
};

/**
 * The seats a criterion is about, each with how well it is met there: the
 * cases the fulfilment counts (decision 0031), so a marking never disagrees
 * with the percentage it explains.
 */
export function buildCriterionHighlightEntries({
  criterionKey,
  arrangement,
  scene,
  students,
  settings,
  seatingHistory,
  mixHistory,
  planUsage,
  planUsageSince,
  planUsageManual,
}: HighlightParams): StatisticHighlightEntry[] {
  const keys = highlightedKeys(criterionKey, settings);
  if (keys.length === 0) return [];
  const { context, occupants } = readPlan({
    arrangement,
    students,
    settings,
    scene,
    seatingHistory,
    mixHistory,
    planUsage,
    planUsageSince,
    planUsageManual,
  });
  const cases = evaluateCriteria(context, occupants);

  const credits = new Map<number, number>();
  for (const key of keys) {
    for (const [seat, credit] of cases[key]?.seats ?? []) {
      const known = credits.get(seat);
      credits.set(seat, known === undefined ? credit : Math.min(known, credit));
    }
  }

  const { layout, students: seated } = context;
  return [...credits.entries()]
    .sort(([a], [b]) => a - b)
    .map(([seat, credit]) => {
      const student = occupants[seat]!;
      const percentage = credit * 100;
      return {
        target: {
          type: 'seat' as const,
          tableIndex: layout.tableOf[seat]!,
          seatIndex: layout.seatOf[seat]!,
          studentId: student >= 0 ? seated[student]!.id : null,
        },
        percentage,
        status: getStatisticStatus(percentage),
      };
    });
}
