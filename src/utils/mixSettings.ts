import type {
  MixSettings,
  NeighborWeightSettings,
  ScalarMixSettingKey,
} from '@/types';

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
