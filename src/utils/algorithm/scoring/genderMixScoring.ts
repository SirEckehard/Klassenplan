// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { calculateGenderImbalance } from '../genderBalance';
import type { ScoringContext } from './scoringContext';
import { tableStats } from './scoringHelpers';

/**
 * Score gender mixing at the local table level.
 * Rewards placements that reduce gender imbalance at the table.
 *
 * @param context - Scoring context with student and position information
 * @returns Negative score for better gender balance, positive for worse
 */
export const scoreLocalGenderMix = (context: ScoringContext): number => {
  const { student, tableIndex, settings, arrangement } = context;
  const weight = settings.preferGenderMix ?? 0;

  if (weight === 0) return 0;
  if (!student.gender) return 0;

  const { boy, girl, diverse } = tableStats(tableIndex, arrangement);

  // Calculate gender imbalance before and after placement
  const beforeCounts = { boy, girl, diverse };
  const before = calculateGenderImbalance(beforeCounts);

  const afterCounts = { boy, girl, diverse };
  afterCounts[student.gender]++;
  const after = calculateGenderImbalance(afterCounts);

  // Reward if imbalance decreases (better balance)
  if (after < before) {
    return -weight;
  }

  return 0;
};

/**
 * Score gender mixing at the global classroom level.
 * Penalizes placements that worsen global gender distribution.
 *
 * @param context - Scoring context with student and position information
 * @returns Positive score for worsening global balance, negative for improving
 */
export const scoreGlobalGenderMix = (context: ScoringContext): number => {
  const { student, settings, globalCounts } = context;
  const weight = settings.preferGenderMix ?? 0;

  if (weight === 0) return 0;
  if (!student.gender) return 0;

  // Calculate global imbalance before and after placement
  const globalBefore = calculateGenderImbalance(globalCounts);
  const globalAfterCounts = { ...globalCounts };
  globalAfterCounts[student.gender]++;
  const globalAfter = calculateGenderImbalance(globalAfterCounts);

  // Penalty if global imbalance increases
  if (globalAfter > globalBefore) {
    return weight;
  }
  // Reward if global imbalance decreases
  else if (globalAfter < globalBefore) {
    return -weight;
  }

  return 0;
};

/**
 * Score cross-table adjacency to avoid same-gender neighbors.
 * Penalizes placing students next to same-gender neighbors at adjacent tables.
 *
 * @param context - Scoring context with student and position information
 * @returns Positive score for same-gender neighbors (penalty)
 */
export const scoreCrossTableGenderAdjacency = (
  context: ScoringContext,
): number => {
  const {
    student,
    tableIndex,
    seatIndex,
    settings,
    arrangement,
    seatNeighborhoods,
    genderNeighborWeights,
  } = context;
  const weight = settings.preferGenderMix ?? 0;

  if (weight === 0) return 0;
  if (!student.gender) return 0;

  let score = 0;
  const neighbors = seatNeighborhoods.get(`${tableIndex}-${seatIndex}`) ?? [];

  for (const neighbor of neighbors) {
    const {
      tableIndex: nt,
      seatIndex: ns,
      strengthFactor,
      direction,
    } = neighbor;
    const other = arrangement[nt]?.[ns];

    if (other && other.gender && other.gender === student.gender) {
      const directionalWeight = genderNeighborWeights[direction] ?? 1;
      score += weight * strengthFactor * directionalWeight;
    }
  }

  return score;
};

/**
 * Combined gender mixing score.
 * Evaluates all gender-related constraints for a seat placement.
 *
 * @param context - Scoring context with student and position information
 * @returns Total gender mixing score (lower is better)
 */
export const scoreGenderMix = (context: ScoringContext): number => {
  return (
    scoreLocalGenderMix(context) +
    scoreGlobalGenderMix(context) +
    scoreCrossTableGenderAdjacency(context)
  );
};
