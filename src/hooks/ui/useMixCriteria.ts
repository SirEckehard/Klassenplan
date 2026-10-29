// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { MixSettings, ScalarMixSettingKey, Student } from '@/types';
import {
  criterionImportance,
  criterionWeight,
  hasActiveWeights,
  weightForImportance,
  withCriterionWeight,
  withDefaultWeights,
  withWeightsFrom,
  withoutWeights,
  type DataFamily,
  type MixImportance,
} from '@/utils';
import { isCriterionAvailable } from '@/utils/criteriaValidation';
import { showToast } from '@/utils/ui/toast';

export interface MixCriterion {
  key: ScalarMixSettingKey;
  label: string;
  description: string;
}

export interface MixCriteriaCategory {
  /** The data family the category speaks for; it colours its heading. */
  id: DataFamily;
  label: string;
  criteria: MixCriterion[];
}

/**
 * Keeps the weights "all off" cleared until "all on" takes them back. One per
 * view, handed to every control in it, so the rail can restore what the
 * expanded panel switched off and vice versa.
 */
export type SuspendedWeights = {
  keep: (settings: MixSettings | null) => void;
  take: () => MixSettings | null;
};

export function createSuspendedWeights(): SuspendedWeights {
  let kept: MixSettings | null = null;
  return {
    keep: (settings) => {
      kept = settings;
    },
    take: () => {
      const settings = kept;
      kept = null;
      return settings;
    },
  };
}

type UseMixCriteriaOptions = {
  settings: MixSettings;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
  students: Student[];
  /** Falls back to one of the control's own. */
  suspendedWeights?: SuspendedWeights;
};

/**
 * The criteria in the order the class list asks about a student
 * (`StudentInspector`): person, learning, language, behaviour, social, place and
 * room. Each category is a data family and borrows the class list's heading, so
 * a criterion stands under the same word — and in the same colour
 * (`CRITERIA_FAMILY_MAP`) — as the attribute it acts on. Repetition is about the
 * plans already used rather than an attribute: it has a family of its own
 * (`history`) and leads under a heading of its own.
 */
export const buildMixCriteriaCategories = (
  t: TFunction<'generator'>,
): MixCriteriaCategory[] => [
  {
    id: 'history',
    label: t('students:inspector.groups.history'),
    criteria: [
      {
        key: 'avoidPreviousPairs',
        label: t('mix.criteria.avoidPreviousPairs.label'),
        description: t('mix.criteria.avoidPreviousPairs.desc'),
      },
    ],
  },
  {
    id: 'person',
    label: t('students:inspector.groups.person'),
    criteria: [
      {
        key: 'preferGenderMix',
        label: t('mix.criteria.preferGenderMix.label'),
        description: t('mix.criteria.preferGenderMix.desc'),
      },
    ],
  },
  {
    id: 'learning',
    label: t('students:inspector.groups.learning'),
    criteria: [
      {
        key: 'peerTutoring',
        label: t('mix.criteria.peerTutoring.label'),
        description: t('mix.criteria.peerTutoring.desc'),
      },
      {
        key: 'homogeneousPerformanceGroups',
        label: t('mix.criteria.homogeneousPerformanceGroups.label'),
        description: t('mix.criteria.homogeneousPerformanceGroups.desc'),
      },
    ],
  },
  {
    id: 'language',
    label: t('students:inspector.groups.language'),
    criteria: [
      {
        key: 'preferLanguageMixing',
        label: t('mix.criteria.preferLanguageMixing.label'),
        description: t('mix.criteria.preferLanguageMixing.desc'),
      },
    ],
  },
  {
    id: 'behavior',
    label: t('students:inspector.groups.behavior'),
    criteria: [
      {
        key: 'avoidRestlessTogether',
        label: t('mix.criteria.avoidRestlessTogether.label'),
        description: t('mix.criteria.avoidRestlessTogether.desc'),
      },
      {
        key: 'avoidConcentrationTogether',
        label: t('mix.criteria.avoidConcentrationTogether.label'),
        description: t('mix.criteria.avoidConcentrationTogether.desc'),
      },
    ],
  },
  {
    id: 'social',
    label: t('students:inspector.groups.social'),
    criteria: [
      {
        key: 'avoidShyAlone',
        label: t('mix.criteria.avoidShyAlone.label'),
        description: t('mix.criteria.avoidShyAlone.desc'),
      },
      {
        key: 'distributeSocialRoles',
        label: t('mix.criteria.distributeSocialRoles.label'),
        description: t('mix.criteria.distributeSocialRoles.desc'),
      },
      {
        key: 'considerWishPartners',
        label: t('mix.criteria.considerWishPartners.label'),
        description: t('mix.criteria.considerWishPartners.desc'),
      },
      {
        key: 'avoidConflictPartners',
        label: t('mix.criteria.avoidConflictPartners.label'),
        description: t('mix.criteria.avoidConflictPartners.desc'),
      },
    ],
  },
  {
    id: 'space',
    label: t('students:inspector.groups.space'),
    criteria: [
      {
        key: 'preferFrontForNeedsFrontSeat',
        label: t('mix.criteria.preferFrontForNeedsFrontSeat.label'),
        description: t('mix.criteria.preferFrontForNeedsFrontSeat.desc'),
      },
      {
        key: 'preferFrontForSmallerStudents',
        label: t('mix.criteria.preferFrontForSmallerStudents.label'),
        description: t('mix.criteria.preferFrontForSmallerStudents.desc'),
      },
      {
        key: 'preferWindowSeats',
        label: t('mix.criteria.preferWindowSeats.label'),
        description: t('mix.criteria.preferWindowSeats.desc'),
      },
      {
        key: 'preferDoorSeats',
        label: t('mix.criteria.preferDoorSeats.label'),
        description: t('mix.criteria.preferDoorSeats.desc'),
      },
    ],
  },
];

/**
 * The mixing criteria and every way of changing their weights, shared by the
 * expanded sidebar panel, the collapsed rail and the row under the canvas on a
 * phone — so a rule such as the two exclusive performance criteria is written
 * once.
 *
 * `categories` holds only the criteria the class has data for; categories left
 * empty are dropped.
 */
export function useMixCriteria({
  settings,
  setMixSettings,
  students,
  suspendedWeights,
}: UseMixCriteriaOptions) {
  const { t } = useTranslation('generator');
  const [ownSuspendedWeights] = React.useState(createSuspendedWeights);
  const suspended = suspendedWeights ?? ownSuspendedWeights;

  const categories = React.useMemo(
    () =>
      buildMixCriteriaCategories(t)
        .map((category) => ({
          ...category,
          criteria: category.criteria.filter(
            (criterion) =>
              isCriterionAvailable(criterion.key, students).available,
          ),
        }))
        .filter((category) => category.criteria.length > 0),
    [t, students],
  );

  const isRandom = !hasActiveWeights(settings);

  /** The weight a criterion's control shows; see {@link criterionWeight}. */
  const weightOf = React.useCallback(
    (key: ScalarMixSettingKey) => criterionWeight(settings, key),
    [settings],
  );

  const setWeight = React.useCallback(
    (key: ScalarMixSettingKey, value: number) => {
      const availability = isCriterionAvailable(key, students);
      if (!availability.available && value > 0) {
        showToast(
          'info',
          availability.reason || 'generator:mix.criterionNotAvailable',
        );
        return;
      }
      setMixSettings((prev) => withCriterionWeight(prev, key, value));
    },
    [setMixSettings, students],
  );

  /** The level a criterion's control shows; see {@link criterionImportance}. */
  const importanceOf = React.useCallback(
    (key: ScalarMixSettingKey) => criterionImportance(settings, key),
    [settings],
  );

  /**
   * The weight behind a named level. A weight the fine tuning set inside the
   * same band is kept, so pressing the level a criterion already has changes
   * nothing about the plan it produces.
   */
  const setImportance = React.useCallback(
    (key: ScalarMixSettingKey, level: MixImportance) => {
      setWeight(
        key,
        weightForImportance(level, criterionWeight(settings, key)),
      );
    },
    [setWeight, settings],
  );

  /** Every criterion off; the weights are kept for {@link enableAll}. */
  const disableAll = React.useCallback(() => {
    suspended.keep(hasActiveWeights(settings) ? settings : null);
    setMixSettings((prev) => withoutWeights(prev));
  }, [setMixSettings, settings, suspended]);

  /**
   * Brings back what {@link disableAll} switched off — a slip on the switch
   * must not cost the teacher their weights. With nothing kept, the
   * recommended weights.
   */
  const enableAll = React.useCallback(() => {
    const previous = suspended.take();
    setMixSettings((prev) =>
      previous ? withWeightsFrom(prev, previous) : withDefaultWeights(prev),
    );
  }, [setMixSettings, suspended]);

  return {
    categories,
    isRandom,
    weightOf,
    setWeight,
    importanceOf,
    setImportance,
    disableAll,
    enableAll,
  };
}
