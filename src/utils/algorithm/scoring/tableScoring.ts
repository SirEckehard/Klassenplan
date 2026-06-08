// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Table-level scoring for Group4/Group6 tables.
 *
 * Evaluates the entire table composition, not just individual seat pairs.
 * This catches issues that pair-based scoring misses, like:
 * - Too many restless students at one table
 * - Poor gender balance across all 4-6 seats
 * - Missing mediator support for loners
 */

import type { Student, MixSettings } from '@/types';
import { isRestless, isConcentration } from './scoringHelpers';
import { calculateGenderImbalance, createGenderCounts } from '../genderBalance';

/**
 * Context for table-level scoring.
 */
export interface TableScoringContext {
  /** All students seated at this table */
  members: Student[];
  /** Table index in arrangement */
  tableIndex: number;
  /** Algorithm settings */
  settings: Partial<MixSettings>;
}

/**
 * Score the composition of an entire table.
 *
 * @param ctx - Table scoring context
 * @returns Score penalty/reward for table composition
 *          Positive = penalty (bad composition)
 *          Negative = reward (good composition)
 */
export const scoreTableComposition = (ctx: TableScoringContext): number => {
  const { members, settings } = ctx;

  // Only apply to tables with 4+ students
  if (members.length < 4) {
    return 0;
  }

  let score = 0;

  // 1. Restless clustering penalty
  // Having 2+ restless students at the same table is worse than just the sum of pair penalties
  const restlessCount = members.filter(isRestless).length;
  const avoidRestlessWeight = settings.avoidRestlessTogether ?? 0;
  if (restlessCount >= 2 && avoidRestlessWeight > 0) {
    // Penalty increases exponentially with more restless students
    // 2 restless: 0.5 * weight, 3 restless: 1.0 * weight, 4 restless: 1.5 * weight
    score += avoidRestlessWeight * (restlessCount - 1) * 0.5;
  }

  // 2. Concentration issues clustering penalty
  // Multiple students with concentration issues distract each other
  const concentrationCount = members.filter(isConcentration).length;
  const avoidConcentrationWeight = settings.avoidConcentrationTogether ?? 0;
  if (concentrationCount >= 2 && avoidConcentrationWeight > 0) {
    // Similar exponential penalty
    score += avoidConcentrationWeight * (concentrationCount - 1) * 0.4;
  }

  // 3. Loner-Mediator support reward
  // A loner at a table should have a mediator or social hub for support
  const socialRoleWeight = settings.distributeSocialRoles ?? 0;
  if (socialRoleWeight > 0) {
    const hasLoner = members.some((m) => m.socialRole === 'loner');
    const hasMediator = members.some((m) => m.socialRole === 'mediator');
    const hasSocialHub = members.some((m) => m.socialRole === 'socialHub');

    if (hasLoner) {
      if (hasMediator || hasSocialHub) {
        // Reward: loner has support
        score -= socialRoleWeight * 0.5;
      } else {
        // Penalty: loner without support
        score += socialRoleWeight * 0.3;
      }
    }

    // Penalty: clustering multiple leaders (can cause conflicts)
    const leaderCount = members.filter((m) => m.socialRole === 'leader').length;
    if (leaderCount >= 2) {
      score += socialRoleWeight * 0.4 * (leaderCount - 1);
    }
  }

  // 4. Gender balance across all seats
  // A 4-person table should ideally have 2 boys and 2 girls
  const genderMixWeight = settings.preferGenderMix ?? 0;
  if (genderMixWeight > 0) {
    const boyCount = members.filter((m) => m.gender === 'boy').length;
    const girlCount = members.filter((m) => m.gender === 'girl').length;

    // Only apply if we have gendered students
    if (boyCount + girlCount >= 2) {
      const genderCounts = createGenderCounts();
      genderCounts.boy = boyCount;
      genderCounts.girl = girlCount;
      genderCounts.diverse = members.filter(
        (m) => m.gender === 'diverse',
      ).length;
      const imbalance = calculateGenderImbalance(genderCounts);
      // Scale penalty by table size (larger tables have more impact)
      score += imbalance * genderMixWeight * 0.3 * (members.length / 4);
    }
  }

  // 5. Performance level clustering
  // Having all low-performers or all high-performers at one table is suboptimal
  const peerTutoringWeight = settings.peerTutoring ?? 0;
  if (peerTutoringWeight > 0) {
    const highPerfCount = members.filter((m) => m.performanceStrong).length;
    const lowPerfCount = members.filter((m) => m.performanceWeak).length;

    // Penalty for homogeneous performance levels
    if (highPerfCount >= 3 || lowPerfCount >= 3) {
      score += peerTutoringWeight * 0.3;
    }

    // Reward for heterogeneous mix (tutoring opportunity)
    if (highPerfCount >= 1 && lowPerfCount >= 1) {
      score -= peerTutoringWeight * 0.2;
    }
  }

  return score;
};
