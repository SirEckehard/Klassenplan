// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Student, ScalarMixSettingKey } from '@/types';

/**
 * Result of checking if a criterion is available for use
 */
export interface CriterionAvailability {
  key: ScalarMixSettingKey;
  available: boolean;
  reason?: string;
}

/**
 * Check if a specific criterion is available based on student data.
 * A criterion is unavailable if no students have the relevant attributes.
 *
 * @param key - The mix setting key to check
 * @param students - Array of all students
 * @returns Availability information including reason if unavailable
 */
export function isCriterionAvailable(
  key: ScalarMixSettingKey,
  students: Student[],
): CriterionAvailability {
  switch (key) {
    case 'considerWishPartners': {
      const available = students.some((s) => s.wishPartnerId);
      return {
        key,
        available,
        reason: available ? undefined : 'Kein Schüler hat einen Wunschpartner',
      };
    }

    case 'avoidConflictPartners': {
      const available = students.some((s) => s.avoidPartnerId);
      return {
        key,
        available,
        reason: available ? undefined : 'Kein Schüler hat einen Distanzwunsch',
      };
    }

    case 'avoidPreviousPairs': {
      // Always available - history-based criterion
      return {
        key,
        available: true,
      };
    }

    case 'avoidRestlessTogether': {
      const restlessCount = students.filter((s) => s.restless).length;
      const available = restlessCount >= 2;
      return {
        key,
        available,
        reason: available
          ? undefined
          : 'Weniger als 2 Schüler sind als unruhig markiert',
      };
    }

    case 'avoidConcentrationTogether': {
      const concentrationCount = students.filter(
        (s) => s.concentrationIssues,
      ).length;
      const available = concentrationCount >= 2;
      return {
        key,
        available,
        reason: available
          ? undefined
          : 'Weniger als 2 Schüler haben Konzentrationsprobleme',
      };
    }

    case 'preferGenderMix': {
      const genderCount = students.filter((s) => s.gender !== undefined).length;
      const available = genderCount >= 2;
      return {
        key,
        available,
        reason: available
          ? undefined
          : 'Mindestens zwei Geschlechtsangaben erforderlich, um dieses Kriterium zu nutzen',
      };
    }

    case 'avoidShyAlone': {
      const available = students.some((s) => s.shy);
      return {
        key,
        available,
        reason: available
          ? undefined
          : 'Kein Schüler ist als schüchtern markiert',
      };
    }

    case 'peerTutoring': {
      const available = students.some(
        (s) => s.performanceStrong || s.performanceWeak,
      );
      return {
        key,
        available,
        reason: available
          ? undefined
          : 'Keine Schüler mit Leistungseinstufung vorhanden',
      };
    }

    case 'homogeneousPerformanceGroups': {
      const available = students.some(
        (s) => s.performanceStrong || s.performanceWeak,
      );
      return {
        key,
        available,
        reason: available
          ? undefined
          : 'Keine Schüler mit Leistungseinstufung vorhanden',
      };
    }

    case 'preferFrontForNeedsFrontSeat': {
      const available = students.some((s) => s.needsFrontSeat);
      return {
        key,
        available,
        reason: available
          ? undefined
          : 'Kein Schüler benötigt einen vorderen Platz',
      };
    }

    case 'preferFrontForSmallerStudents': {
      const available = students.some(
        (s) => s.height === 'small' || s.height === 'tall',
      );
      return {
        key,
        available,
        reason: available
          ? undefined
          : 'Keine Schüler mit Größeneinstufung vorhanden',
      };
    }

    case 'preferWindowSeats': {
      const available = students.some((s) => s.prefersWindow);
      return {
        key,
        available,
        reason: available
          ? undefined
          : 'Kein Schüler bevorzugt einen Fensterplatz',
      };
    }

    case 'preferDoorSeats': {
      const available = students.some((s) => s.prefersDoor);
      return {
        key,
        available,
        reason: available ? undefined : 'Kein Schüler bevorzugt Nähe zur Tür',
      };
    }

    case 'preferLanguageMixing': {
      // Need at least 2 students with different language skill levels
      const withLanguage = students.filter((s) => s.languageSkill);
      const uniqueLevels = new Set(withLanguage.map((s) => s.languageSkill));
      const available = uniqueLevels.size >= 2;
      return {
        key,
        available,
        reason: available
          ? undefined
          : 'Mindestens 2 verschiedene Sprachniveaus erforderlich',
      };
    }

    case 'distributeSocialRoles': {
      const available = students.some((s) => s.socialRole);
      return {
        key,
        available,
        reason: available
          ? undefined
          : 'Keine Schüler mit sozialer Rolle vorhanden',
      };
    }

    // avoidConcentrationNearRestless is covered by avoidConcentrationTogether
    case 'avoidConcentrationNearRestless': {
      const hasRestless = students.some((s) => s.restless);
      const hasConcentration = students.some((s) => s.concentrationIssues);
      const available = hasRestless && hasConcentration;
      return {
        key,
        available,
        reason: available
          ? undefined
          : 'Benötigt unruhige und konzentrationsschwächere Schüler',
      };
    }

    default:
      // Fallback for any unknown keys
      return {
        key,
        available: true,
      };
  }
}

/**
 * Get availability status for all mix criteria.
 * This is useful for batch checking all criteria at once.
 *
 * @param students - Array of all students
 * @returns Map of criterion keys to their availability status
 */
export function getAllCriteriaAvailability(
  students: Student[],
): Map<ScalarMixSettingKey, CriterionAvailability> {
  const keys: ScalarMixSettingKey[] = [
    'considerWishPartners',
    'avoidConflictPartners',
    'avoidPreviousPairs',
    'avoidRestlessTogether',
    'avoidConcentrationTogether',
    'avoidConcentrationNearRestless',
    'preferGenderMix',
    'avoidShyAlone',
    'peerTutoring',
    'homogeneousPerformanceGroups',
    'preferFrontForNeedsFrontSeat',
    'preferFrontForSmallerStudents',
    'preferWindowSeats',
    'preferDoorSeats',
    'preferLanguageMixing',
    'distributeSocialRoles',
  ];

  const result = new Map<ScalarMixSettingKey, CriterionAvailability>();

  for (const key of keys) {
    result.set(key, isCriterionAvailable(key, students));
  }

  return result;
}
