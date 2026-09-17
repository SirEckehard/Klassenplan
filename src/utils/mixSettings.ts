// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  MixSettings,
  NeighborWeightSettings,
  ScalarMixSettingKey,
  Student,
} from '@/types';
import { isCriterionAvailable } from './criteriaValidation';

export const DEFAULT_NEIGHBOR_WEIGHTS: Readonly<NeighborWeightSettings> =
  Object.freeze({
    behavioral: Object.freeze({
      direct: 1,
      side: 0.7,
      front: 0.5,
      back: 0.5,
    }),
    gender: Object.freeze({
      direct: 1,
      side: 0.7,
      front: 0.5,
      back: 0.5,
    }),
  });

export const SCALAR_MIX_SETTING_KEYS: ReadonlyArray<ScalarMixSettingKey> = [
  'considerWishPartners',
  'avoidConflictPartners',
  'avoidPreviousPairs',
  'avoidRestlessTogether',
  'avoidConcentrationTogether',
  'avoidConcentrationNearRestless',
  'avoidShyAlone',
  'preferGenderMix',
  'peerTutoring',
  'homogeneousPerformanceGroups',
  'preferFrontForNeedsFrontSeat',
  'preferFrontForSmallerStudents',
  'preferWindowSeats',
  'preferDoorSeats',
  'preferLanguageMixing',
  'distributeSocialRoles',
] as const;

// Default weights for mixing criteria (0-10)
export const DEFAULT_MIX_WEIGHTS: Readonly<MixSettings> = {
  considerWishPartners: 8,
  avoidConflictPartners: 7,
  avoidPreviousPairs: 6,
  avoidRestlessTogether: 5,
  avoidConcentrationTogether: 5,
  avoidConcentrationNearRestless: 5,
  avoidShyAlone: 2,
  preferGenderMix: 2,
  peerTutoring: 3,
  homogeneousPerformanceGroups: 3,
  preferFrontForNeedsFrontSeat: 5,
  preferFrontForSmallerStudents: 3,
  preferWindowSeats: 3,
  preferDoorSeats: 2,
  preferLanguageMixing: 4,
  distributeSocialRoles: 3,
  neighborWeights: DEFAULT_NEIGHBOR_WEIGHTS,
};

// Neutral settings to disable all mixing criteria
export const neutralSettings: Readonly<MixSettings> = {
  considerWishPartners: 0,
  avoidConflictPartners: 0,
  avoidPreviousPairs: 0,
  avoidRestlessTogether: 0,
  avoidConcentrationTogether: 0,
  avoidConcentrationNearRestless: 0,
  avoidShyAlone: 0,
  preferGenderMix: 0,
  peerTutoring: 0,
  homogeneousPerformanceGroups: 0,
  preferFrontForNeedsFrontSeat: 0,
  preferFrontForSmallerStudents: 0,
  preferWindowSeats: 0,
  preferDoorSeats: 0,
  preferLanguageMixing: 0,
  distributeSocialRoles: 0,
  neighborWeights: DEFAULT_NEIGHBOR_WEIGHTS,
};

export const mergeNeighborWeights = (
  overrides: MixSettings['neighborWeights'] | undefined,
  base: MixSettings['neighborWeights'],
) => ({
  behavioral: {
    ...base.behavioral,
    ...(overrides?.behavioral ?? {}),
  },
  gender: {
    ...base.gender,
    ...(overrides?.gender ?? {}),
  },
});

export type PerformanceCriterion = Extract<
  ScalarMixSettingKey,
  'peerTutoring' | 'homogeneousPerformanceGroups'
>;

/**
 * The one performance criterion that applies: the higher weight, and
 * `peerTutoring` on a tie; null while both are 0. Construction, refinement, the
 * table score and the statistics all ask this, and `normalizeMixSettings` zeroes
 * the other weight, so they cannot disagree (decision 0013).
 */
export const resolvePerformanceCriterion = (
  settings: Partial<Pick<MixSettings, PerformanceCriterion>>,
): PerformanceCriterion | null => {
  const peerTutoring = settings.peerTutoring ?? 0;
  const homogeneous = settings.homogeneousPerformanceGroups ?? 0;
  if (peerTutoring <= 0 && homogeneous <= 0) {
    return null;
  }
  return peerTutoring >= homogeneous
    ? 'peerTutoring'
    : 'homogeneousPerformanceGroups';
};

export const normalizeMixSettings = (
  overrides: Partial<MixSettings> | undefined,
  base: Readonly<MixSettings> = DEFAULT_MIX_WEIGHTS,
): MixSettings => {
  const mergedScalars = SCALAR_MIX_SETTING_KEYS.reduce(
    (acc, key) => {
      const value = overrides?.[key];
      acc[key] = typeof value === 'number' ? value : base[key];
      return acc;
    },
    {} as Record<ScalarMixSettingKey, number>,
  );

  // Settings hold only one performance criterion — also those stored before
  // the rule existed, and the recommended weights, where both are 3.
  const performanceCriterion = resolvePerformanceCriterion(mergedScalars);
  if (performanceCriterion === 'peerTutoring') {
    mergedScalars.homogeneousPerformanceGroups = 0;
  } else if (performanceCriterion === 'homogeneousPerformanceGroups') {
    mergedScalars.peerTutoring = 0;
  }

  const neighborWeights = mergeNeighborWeights(
    overrides?.neighborWeights,
    base.neighborWeights,
  );

  return {
    ...base,
    ...mergedScalars,
    neighborWeights,
  };
};

/** Whether two settings hold the same weights, neighbour weights included. */
export const areMixSettingsEqual = (
  a: Readonly<MixSettings>,
  b: Readonly<MixSettings>,
): boolean =>
  SCALAR_MIX_SETTING_KEYS.every((key) => a[key] === b[key]) &&
  (['behavioral', 'gender'] as const).every((group) =>
    (['direct', 'side', 'front', 'back'] as const).every(
      (direction) =>
        a.neighborWeights[group][direction] ===
        b.neighborWeights[group][direction],
    ),
  );

/** Whether any criterion carries weight — with none, shuffling is random. */
export const hasActiveWeights = (settings: Readonly<MixSettings>): boolean =>
  SCALAR_MIX_SETTING_KEYS.some((key) => settings[key] > 0);

/**
 * One criterion's weight together with the weights tied to it: both
 * distractibility weights move as one, and switching on one performance
 * criterion switches the other off.
 */
export const withCriterionWeight = (
  settings: MixSettings,
  key: ScalarMixSettingKey,
  value: number,
): MixSettings => {
  if (key === 'avoidConcentrationTogether') {
    return {
      ...settings,
      avoidConcentrationTogether: value,
      avoidConcentrationNearRestless: value,
    };
  }
  if (key === 'peerTutoring' && value > 0) {
    return {
      ...settings,
      peerTutoring: value,
      homogeneousPerformanceGroups: 0,
    };
  }
  if (key === 'homogeneousPerformanceGroups' && value > 0) {
    return {
      ...settings,
      homogeneousPerformanceGroups: value,
      peerTutoring: 0,
    };
  }
  return { ...settings, [key]: value };
};

/**
 * The recommended weight for every criterion. Both performance criteria default
 * to 3, so only one of them keeps it: the one weighted higher before, and
 * `peerTutoring` on a tie.
 */
export const withDefaultWeights = (settings: MixSettings): MixSettings => {
  const next = { ...settings };
  SCALAR_MIX_SETTING_KEYS.forEach((key) => {
    next[key] = DEFAULT_MIX_WEIGHTS[key];
  });

  if (next.peerTutoring > 0 && next.homogeneousPerformanceGroups > 0) {
    const preferPeerTutoring =
      settings.peerTutoring > settings.homogeneousPerformanceGroups ||
      (settings.peerTutoring === settings.homogeneousPerformanceGroups &&
        DEFAULT_MIX_WEIGHTS.peerTutoring >=
          DEFAULT_MIX_WEIGHTS.homogeneousPerformanceGroups);

    if (preferPeerTutoring) {
      next.homogeneousPerformanceGroups = 0;
    } else {
      next.peerTutoring = 0;
    }
  }

  return next;
};

/**
 * The weight a criterion shows. Distractibility carries two weights, which the
 * class's data can set apart (`useAutoMixSettings` clears the one without
 * data), and shows the higher one, as the statistics do.
 */
export const criterionWeight = (
  settings: Readonly<MixSettings>,
  key: ScalarMixSettingKey,
): number =>
  key === 'avoidConcentrationTogether'
    ? Math.max(
        settings.avoidConcentrationTogether,
        settings.avoidConcentrationNearRestless,
      )
    : settings[key];

/**
 * The weights of criteria the class has no data for at 0, so no weight acts
 * that the sidebar does not show. Distractibility takes both of its weights
 * along. The same object when there is nothing to clear.
 */
export const withoutUnavailableWeights = (
  settings: MixSettings,
  students: Student[],
): MixSettings => {
  let next = settings;

  for (const key of SCALAR_MIX_SETTING_KEYS) {
    if (settings[key] === 0 || isCriterionAvailable(key, students).available) {
      continue;
    }
    if (next === settings) {
      next = { ...settings };
    }
    if (key === 'avoidConcentrationTogether') {
      next.avoidConcentrationTogether = 0;
      next.avoidConcentrationNearRestless = 0;
    } else {
      next[key] = 0;
    }
  }

  return next;
};

/** Every criterion at 0; the neighbour weights stay as they are. */
export const withoutWeights = (settings: MixSettings): MixSettings => {
  const next = { ...settings };
  SCALAR_MIX_SETTING_KEYS.forEach((key) => {
    next[key] = 0;
  });
  return next;
};

/** The criterion weights of `source`; the neighbour weights stay as they are. */
export const withWeightsFrom = (
  settings: MixSettings,
  source: Readonly<MixSettings>,
): MixSettings => {
  const next = { ...settings };
  SCALAR_MIX_SETTING_KEYS.forEach((key) => {
    next[key] = source[key];
  });
  return next;
};
