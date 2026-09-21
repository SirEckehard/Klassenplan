// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { MixSettings, ScalarMixSettingKey, Student } from '@/types';
import {
  DEFAULT_MIX_WEIGHTS,
  criterionImportance,
  criterionWeight,
  hasActiveWeights,
  weightForImportance,
  withCriterionWeight,
  withDefaultWeights,
  withWeightsFrom,
  withoutWeights,
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
  id: string;
  /** Empty for the leading category, which is shown without a heading. */
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
 * (`history`) and leads without a heading.
 */
const buildCategories = (t: TFunction<'generator'>): MixCriteriaCategory[] => [
  {
    id: 'history',
    label: '',
    criteria: [
      {
        key: 'avoidPreviousPairs',
        label: t('mix.criteria.avoidPreviousPairs.label', 'Wiederholung'),
        description: t(
          'mix.criteria.avoidPreviousPairs.desc',
          'Schüler, die zuletzt nebeneinander gemischt wurden, trennen',
        ),
      },
    ],
  },
  {
    id: 'person',
    label: t('students:inspector.groups.person'),
    criteria: [
      {
        key: 'preferGenderMix',
        label: t('mix.criteria.preferGenderMix.label', 'Geschlechter'),
        description: t(
          'mix.criteria.preferGenderMix.desc',
          'Geschlechter mischen für ausgewogene Tischbesetzung',
        ),
      },
    ],
  },
  {
    id: 'learning',
    label: t('students:inspector.groups.learning'),
    criteria: [
      {
        key: 'peerTutoring',
        label: t('mix.criteria.peerTutoring.label', 'Fördern (heterogen)'),
        description: t(
          'mix.criteria.peerTutoring.desc',
          'Schüler mit unterschiedlichem Leistungsniveau zusammen',
        ),
      },
      {
        key: 'homogeneousPerformanceGroups',
        label: t(
          'mix.criteria.homogeneousPerformanceGroups.label',
          'Fördern (homogen)',
        ),
        description: t(
          'mix.criteria.homogeneousPerformanceGroups.desc',
          'Schüler mit ähnlichem Förderstand zusammen',
        ),
      },
    ],
  },
  {
    id: 'language',
    label: t('students:inspector.groups.language'),
    criteria: [
      {
        key: 'preferLanguageMixing',
        label: t('mix.criteria.preferLanguageMixing.label', 'Sprachförderung'),
        description: t(
          'mix.criteria.preferLanguageMixing.desc',
          'Sprachstarke Schüler neben Anfänger/DaZ setzen',
        ),
      },
    ],
  },
  {
    id: 'behavior',
    label: t('students:inspector.groups.behavior'),
    criteria: [
      {
        key: 'avoidRestlessTogether',
        label: t('mix.criteria.avoidRestlessTogether.label', 'Unruhe'),
        description: t(
          'mix.criteria.avoidRestlessTogether.desc',
          'Schüler mit Unruheverhalten trennen',
        ),
      },
      {
        key: 'avoidConcentrationTogether',
        label: t(
          'mix.criteria.avoidConcentrationTogether.label',
          'Ablenkbarkeit',
        ),
        description: t(
          'mix.criteria.avoidConcentrationTogether.desc',
          'Schüler mit Konzentrationsschwierigkeiten trennen',
        ),
      },
    ],
  },
  {
    id: 'social',
    label: t('students:inspector.groups.social'),
    criteria: [
      {
        key: 'avoidShyAlone',
        label: t('mix.criteria.avoidShyAlone.label', 'Schüchternheit'),
        description: t(
          'mix.criteria.avoidShyAlone.desc',
          'Schüler mit zurückhaltendem Verhalten nicht alleine sitzen lassen',
        ),
      },
      {
        key: 'distributeSocialRoles',
        label: t('mix.criteria.distributeSocialRoles.label', 'Soziale Rollen'),
        description: t(
          'mix.criteria.distributeSocialRoles.desc',
          'Mediatoren, Anführer und Einzelgänger verteilen',
        ),
      },
      {
        key: 'considerWishPartners',
        label: t('mix.criteria.considerWishPartners.label', 'Wunschpartner'),
        description: t(
          'mix.criteria.considerWishPartners.desc',
          'Wunschpartner-Anfragen der Schüler',
        ),
      },
      {
        key: 'avoidConflictPartners',
        label: t('mix.criteria.avoidConflictPartners.label', 'Distanzwünsche'),
        description: t(
          'mix.criteria.avoidConflictPartners.desc',
          'Schüler mit Distanzwunsch trennen',
        ),
      },
    ],
  },
  {
    id: 'space',
    label: t('students:inspector.groups.space'),
    criteria: [
      {
        key: 'preferFrontForNeedsFrontSeat',
        label: t(
          'mix.criteria.preferFrontForNeedsFrontSeat.label',
          'Vordere Plätze',
        ),
        description: t(
          'mix.criteria.preferFrontForNeedsFrontSeat.desc',
          'Schüler, die vorne sitzen sollen',
        ),
      },
      {
        key: 'preferFrontForSmallerStudents',
        label: t(
          'mix.criteria.preferFrontForSmallerStudents.label',
          'Körpergröße',
        ),
        description: t(
          'mix.criteria.preferFrontForSmallerStudents.desc',
          'kleinere Schüler vorne, größere hinten',
        ),
      },
      {
        key: 'preferWindowSeats',
        label: t('mix.criteria.preferWindowSeats.label', 'Fensterplätze'),
        description: t(
          'mix.criteria.preferWindowSeats.desc',
          'Schüler mit Fenster-Präferenz näher am Fenster platzieren',
        ),
      },
      {
        key: 'preferDoorSeats',
        label: t('mix.criteria.preferDoorSeats.label', 'Türnähe'),
        description: t(
          'mix.criteria.preferDoorSeats.desc',
          'Schüler mit Tür-Präferenz nahe am Eingang platzieren',
        ),
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
      buildCategories(t)
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

  /** Off, or on at the recommended weight. */
  const toggle = React.useCallback(
    (key: ScalarMixSettingKey) => {
      setWeight(key, weightOf(key) > 0 ? 0 : DEFAULT_MIX_WEIGHTS[key]);
    },
    [setWeight, weightOf],
  );

  /** Every criterion off; the weights are kept for {@link enableAll}. */
  const disableAll = React.useCallback(() => {
    suspended.keep(hasActiveWeights(settings) ? settings : null);
    setMixSettings((prev) => withoutWeights(prev));
  }, [setMixSettings, settings, suspended]);

  /**
   * Brings back what {@link disableAll} switched off — a slip on the rail
   * button must not cost the teacher their weights. With nothing kept, the
   * recommended weights.
   */
  const enableAll = React.useCallback(() => {
    const previous = suspended.take();
    setMixSettings((prev) =>
      previous ? withWeightsFrom(prev, previous) : withDefaultWeights(prev),
    );
  }, [setMixSettings, suspended]);

  const resetToDefaults = React.useCallback(() => {
    suspended.keep(null);
    setMixSettings((prev) => withDefaultWeights(prev));
  }, [setMixSettings, suspended]);

  return {
    categories,
    isRandom,
    weightOf,
    setWeight,
    importanceOf,
    setImportance,
    toggle,
    disableAll,
    enableAll,
    resetToDefaults,
  };
}
