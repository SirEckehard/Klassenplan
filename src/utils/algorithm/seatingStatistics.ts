// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  Student,
  SeatingArrangement,
  MixSettings,
  SavedPlan,
  ClassroomScene,
  MixResult,
  PlanUsage,
} from '@/types';
import { resolvePerformanceCriterion } from '../mixSettings';
import {
  evaluateCriteria,
  type CriteriaCases,
  type CriterionCases,
} from './model/fulfilment';
import { readPlan } from './model/readPlan';

/**
 * How well a seating arrangement meets the mix criteria: the cases of every
 * criterion (`model/fulfilment.ts`), read by the terms the mixing optimises
 * (decision 0031).
 */
export interface SeatingStatistics {
  totalStudents: number;
  totalSeats: number;
  criteria: CriteriaCases;
}

/**
 * Calculate statistics for a seating arrangement.
 *
 * @param arrangement Current seating arrangement to analyze
 * @param students Full list of students
 * @param settings Mix criteria weights (0-10)
 * @param seatingHistory Previous seating plans for repetition avoidance
 * @param scene Classroom layout for position calculations
 * @returns The cases of every criterion, with their credits
 */
export function calculateSeatingStatistics(
  arrangement: SeatingArrangement,
  students: Student[],
  settings: Partial<MixSettings>,
  seatingHistory: SavedPlan[],
  scene: ClassroomScene,
  options?: {
    /** The mix history as stored, the plan's own mix last when it is one */
    mixHistory?: MixResult[];
    planUsage?: PlanUsage[];
    /** When the neighbourhoods were last reset; see `buildPreviousPairs`. */
    planUsageSince?: string | null;
    /** Whether the class marks its plans by hand; see `buildPreviousPairs`. */
    planUsageManual?: boolean;
  },
): SeatingStatistics {
  const { context, occupants } = readPlan({
    arrangement,
    students,
    settings,
    scene,
    seatingHistory,
    mixHistory: options?.mixHistory,
    planUsage: options?.planUsage,
    planUsageSince: options?.planUsageSince,
    planUsageManual: options?.planUsageManual,
  });
  return {
    totalStudents: students.length,
    totalSeats: arrangement.reduce((sum, table) => sum + table.length, 0),
    criteria: evaluateCriteria(context, occupants),
  };
}

/**
 * How many of the cases a criterion is about came out right — the plain
 * counting behind the percentage, where there is one to do. Window and door
 * seats have none: their percentage is an average distance, not a tally, and
 * "2 von 2" beside a 60 % bar would be a lie.
 */
export interface CriterionCount {
  fulfilled: number;
  total: number;
}

/**
 * Represents a single criterion's fulfillment status
 */
export interface CriterionFulfillment {
  key: keyof MixSettings;
  label: string;
  percentage: number;
  weight: number;
  active: boolean;
  /** Absent where the criterion is scored rather than counted. */
  count?: CriterionCount;
}

export function calculateCriteriaWeightedScore(
  criteria: CriterionFulfillment[],
): number {
  if (!criteria.length) {
    return 0;
  }

  const totalWeight = criteria.reduce(
    (sum, criterion) => sum + criterion.weight,
    0,
  );
  if (totalWeight <= 0) {
    return 0;
  }

  const weightedSum = criteria.reduce(
    (sum, criterion) => sum + criterion.percentage * criterion.weight,
    0,
  );
  return weightedSum / totalWeight;
}

const hasCases = (cases: CriterionCases | undefined): cases is CriterionCases =>
  (cases?.total ?? 0) > 0;

/** The mean credit as a percentage; 100 where there is nothing to meet. */
const percentageOf = (cases: CriterionCases | undefined): number =>
  hasCases(cases) ? (cases.credit / cases.total) * 100 : 100;

const countOf = (
  cases: CriterionCases | undefined,
): CriterionCount | undefined =>
  hasCases(cases) && !cases.measured
    ? { fulfilled: cases.full, total: cases.total }
    : undefined;

/**
 * Get top fulfilled criteria sorted by importance and fulfillment.
 *
 * A criterion is listed while it carries weight and the plan has a case of it
 * — a class without a restless pair has no "Unruhe" to meet — in the fixed
 * order of the inspector.
 *
 * @param stats Statistics from calculateSeatingStatistics
 * @param settings Current mix criteria weights
 * @param limit Maximum number of criteria to return (default: all)
 * @returns Array of active criteria
 */
export function getTopFulfilledCriteria(
  stats: SeatingStatistics,
  settings: Partial<MixSettings>,
  limit?: number,
): CriterionFulfillment[] {
  const { criteria: cases } = stats;
  const performance = resolvePerformanceCriterion(settings);

  const criterion = (
    key: keyof MixSettings & keyof CriteriaCases,
    label: string,
    active = true,
  ): CriterionFulfillment => {
    const weight = (settings[key] as number | undefined) ?? 0;
    const count = countOf(cases[key]);
    return {
      key,
      label,
      percentage: percentageOf(cases[key]),
      weight,
      ...(count && { count }),
      active: active && weight > 0 && hasCases(cases[key]),
    };
  };

  // Distractibility is one criterion with two weights: apart from each other
  // and away from restless neighbours, each counted where it has a case.
  const concentrationMetrics = (
    [
      ['avoidConcentrationTogether', settings.avoidConcentrationTogether],
      [
        'avoidConcentrationNearRestless',
        settings.avoidConcentrationNearRestless,
      ],
    ] as const
  ).flatMap(([key, weight]) =>
    (weight ?? 0) > 0 && hasCases(cases[key])
      ? [{ percentage: percentageOf(cases[key]), weight: weight ?? 0 }]
      : [],
  );
  const concentrationWeight = Math.max(
    settings.avoidConcentrationTogether ?? 0,
    settings.avoidConcentrationNearRestless ?? 0,
  );
  const concentrationPercentage =
    concentrationMetrics.length > 0
      ? concentrationMetrics.reduce(
          (sum, metric) => sum + metric.percentage * metric.weight,
          0,
        ) / concentrationMetrics.reduce((sum, metric) => sum + metric.weight, 0)
      : 0;

  // Criteria ordered by Option A: Wiederholung → Identität → Fähigkeiten → Verhalten → Soziales → Raum
  const list: CriterionFulfillment[] = [
    criterion('avoidPreviousPairs', 'Wiederholung'),
    criterion('preferGenderMix', 'Geschlechter'),
    criterion('preferFrontForSmallerStudents', 'Körpergröße'),
    criterion('preferLanguageMixing', 'Sprachförderung'),
    criterion(
      'peerTutoring',
      'Fördern (heterogen)',
      performance === 'peerTutoring',
    ),
    criterion(
      'homogeneousPerformanceGroups',
      'Fördern (homogen)',
      performance === 'homogeneousPerformanceGroups',
    ),
    criterion('preferFrontForNeedsFrontSeat', 'Vordere Plätze'),
    criterion('avoidRestlessTogether', 'Unruhe'),
    criterion('avoidShyAlone', 'Schüchternheit'),
    {
      key: 'avoidConcentrationTogether',
      label: 'Ablenkbarkeit',
      percentage: concentrationPercentage,
      weight: concentrationWeight,
      active: concentrationWeight > 0 && concentrationMetrics.length > 0,
    },
    criterion('distributeSocialRoles', 'Soziale Rollen'),
    criterion('considerWishPartners', 'Wunschpartner erfüllt'),
    criterion('avoidConflictPartners', 'Distanzwünsche'),
    criterion('preferWindowSeats', 'Fensterplätze'),
    criterion('preferDoorSeats', 'Türnähe'),
  ];

  // Filter active criteria - preserve fixed Option A order (no sorting)
  const filtered = list.filter((entry) => entry.active);

  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
}
