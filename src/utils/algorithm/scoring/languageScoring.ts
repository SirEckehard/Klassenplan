// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ScoringContext } from './scoringContext';
import type { LanguageSkillLevel } from '@/types';
import { PLACEMENT_SCORE_WEIGHTS } from '@/utils';

/**
 * Language skill level hierarchy for scoring.
 * Higher value = better language skills.
 * Goal: Pair students with different levels to promote peer support.
 */
const LANGUAGE_SKILL_LEVELS: Record<LanguageSkillLevel, number> = {
  native: 5,
  fluent: 4,
  intermediate: 3,
  beginner: 2,
  daz: 1,
};

/**
 * Check if a language skill level is considered "strong" (can help others)
 */
const isLanguageStrong = (level: LanguageSkillLevel | undefined): boolean =>
  level === 'native' || level === 'fluent';

/**
 * Check if a language skill level is considered "needs support"
 */
const isLanguageNeedsSupport = (
  level: LanguageSkillLevel | undefined,
): boolean => level === 'beginner' || level === 'daz';

/**
 * Score language skill mixing for heterogeneous grouping.
 * Rewards pairing strong speakers with students needing support.
 * Penalizes grouping multiple students needing support together.
 */
export function scoreLanguageMixing(context: ScoringContext): number {
  const weight = context.settings.preferLanguageMixing ?? 0;
  if (weight === 0) return 0;

  const studentLevel = context.student.languageSkill;
  if (!studentLevel) return 0;

  const table = context.arrangement[context.tableIndex];
  if (!table) return 0;

  let score = 0;
  const neighbors = table.filter((s) => s !== null && s.languageSkill);

  // If student needs support, prefer tables with strong speakers
  if (isLanguageNeedsSupport(studentLevel)) {
    const hasStrongSpeaker = neighbors.some((s) =>
      isLanguageStrong(s?.languageSkill),
    );
    if (hasStrongSpeaker) {
      score -= weight * PLACEMENT_SCORE_WEIGHTS.language.strongSpeakerNearby; // Reward: lower score is better
    } else {
      // Penalize grouping multiple students needing support
      const needsSupportCount = neighbors.filter((s) =>
        isLanguageNeedsSupport(s?.languageSkill),
      ).length;
      if (needsSupportCount > 0) {
        score +=
          weight *
          PLACEMENT_SCORE_WEIGHTS.language.needsSupportCluster *
          needsSupportCount;
      }
    }
  }

  // If student is strong speaker, prefer tables with students needing support
  if (isLanguageStrong(studentLevel)) {
    const hasNeedsSupport = neighbors.some((s) =>
      isLanguageNeedsSupport(s?.languageSkill),
    );
    if (hasNeedsSupport) {
      score -=
        weight * PLACEMENT_SCORE_WEIGHTS.language.peerTutoringOpportunity; // Reward peer tutoring opportunity
    }
  }

  return score;
}

/**
 * Calculate language skill difference for refinement scoring.
 * Returns a value indicating how well language skills are distributed.
 */
export function getLanguageSkillDifference(
  levelA: LanguageSkillLevel | undefined,
  levelB: LanguageSkillLevel | undefined,
): number {
  if (!levelA || !levelB) return 0;
  return Math.abs(
    LANGUAGE_SKILL_LEVELS[levelA] - LANGUAGE_SKILL_LEVELS[levelB],
  );
}
