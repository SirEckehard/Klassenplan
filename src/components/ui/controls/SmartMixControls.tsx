// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CRITERIA_ICON_MAP } from '@/utils/ui/criteriaIcons';
import type { MixSettings, ScalarMixSettingKey, Student } from '@/types';
import {
  DEFAULT_MIX_WEIGHTS,
  SCALAR_MIX_SETTING_KEYS,
  getSidebarSurfaceClasses,
  getSidebarIconClasses,
} from '@/utils';
import { isCriterionAvailable } from '@/utils/criteriaValidation';
import { showToast } from '@/utils/ui/toast';
import SectionHeader from '../layout/SectionHeader';
import SectionSeparator from '../feedback/SectionSeparator';
import ToggleSwitch from './ToggleSwitch';

type SmartMixControlsProps = {
  settings: MixSettings;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
  students: Student[];
};

interface CriteriaCategory {
  id: string;
  label: string;
  criteria: Array<{
    key: ScalarMixSettingKey;
    label: string;
    description: string;
  }>;
}

/**
 * Redesigned MixControls with categories and preset buttons
 * Uses shared components for consistency across sidebar panels
 */
function SmartMixControls({
  settings,
  setMixSettings,
  students,
}: SmartMixControlsProps) {
  const { t } = useTranslation('generator');

  React.useEffect(() => {
    setMixSettings((prev) => {
      let nextSettings = prev;

      for (const key of SCALAR_MIX_SETTING_KEYS) {
        const availability = isCriterionAvailable(key, students);
        if (!availability.available && prev[key] > 0) {
          if (nextSettings === prev) {
            nextSettings = { ...prev };
          }

          if (key === 'avoidConcentrationTogether') {
            nextSettings.avoidConcentrationTogether = 0;
            nextSettings.avoidConcentrationNearRestless = 0;
          } else {
            nextSettings[key] = 0;
          }
        }
      }

      return nextSettings;
    });
  }, [students, settings, setMixSettings]);

  const categories: CriteriaCategory[] = [
    {
      id: 'repetition',
      label: '',
      criteria: [
        {
          key: 'avoidPreviousPairs',
          label: t('mix.criteria.avoidPreviousPairs.label', 'Wiederholung'),
          description: t(
            'mix.criteria.avoidPreviousPairs.desc',
            'Schüler, die zuletzt zusammen saßen, trennen',
          ),
        },
      ],
    },
    {
      id: 'identity',
      label: t('mix.categories.identity', 'Identität'),
      criteria: [
        {
          key: 'preferGenderMix',
          label: t('mix.criteria.preferGenderMix.label', 'Geschlechter'),
          description: t(
            'mix.criteria.preferGenderMix.desc',
            'Geschlechter mischen für ausgewogene Tischbesetzung',
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
      ],
    },
    {
      id: 'abilities',
      label: t('mix.categories.abilities', 'Fähigkeiten'),
      criteria: [
        {
          key: 'preferLanguageMixing',
          label: t(
            'mix.criteria.preferLanguageMixing.label',
            'Sprachförderung',
          ),
          description: t(
            'mix.criteria.preferLanguageMixing.desc',
            'Sprachstarke Schüler neben Anfänger/DaZ setzen',
          ),
        },
        {
          key: 'peerTutoring',
          label: t('mix.criteria.peerTutoring.label', 'Fördern (heterogen)'),
          description: t(
            'mix.criteria.peerTutoring.desc',
            'stärkere und schwächere Schüler zusammen',
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
            'stärkere und schwächere Schüler jeweils zusammen',
          ),
        },
        {
          key: 'preferFrontForNeedsFrontSeat',
          label: t(
            'mix.criteria.preferFrontForNeedsFrontSeat.label',
            'Vordere Plätze',
          ),
          description: t(
            'mix.criteria.preferFrontForNeedsFrontSeat.desc',
            'Schüler mit Platzbedarf vorne setzen',
          ),
        },
      ],
    },
    {
      id: 'behavior',
      label: t('mix.categories.behavior', 'Verhalten'),
      criteria: [
        {
          key: 'avoidRestlessTogether',
          label: t('mix.criteria.avoidRestlessTogether.label', 'Unruhe'),
          description: t(
            'mix.criteria.avoidRestlessTogether.desc',
            'unruhige Schüler trennen',
          ),
        },
        {
          key: 'avoidShyAlone',
          label: t('mix.criteria.avoidShyAlone.label', 'Schüchternheit'),
          description: t(
            'mix.criteria.avoidShyAlone.desc',
            'schüchterne Schüler nicht alleine sitzen lassen',
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
            'Schüler mit hoher Ablenkbarkeit trennen',
          ),
        },
      ],
    },
    {
      id: 'social',
      label: t('mix.categories.social', 'Soziales'),
      criteria: [
        {
          key: 'distributeSocialRoles',
          label: t(
            'mix.criteria.distributeSocialRoles.label',
            'Soziale Rollen',
          ),
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
          label: t(
            'mix.criteria.avoidConflictPartners.label',
            'Distanzwünsche',
          ),
          description: t(
            'mix.criteria.avoidConflictPartners.desc',
            'Schüler mit Distanzwunsch trennen',
          ),
        },
      ],
    },
    {
      id: 'environment',
      label: t('mix.categories.environment', 'Raum'),
      criteria: [
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

  const handleSettingChange = (key: ScalarMixSettingKey, value: number) => {
    // CheckIcon if criterion is available
    const availability = isCriterionAvailable(key, students);
    if (!availability.available && value > 0) {
      // Show toast with reason and prevent change
      showToast('info', availability.reason || 'generator:mix.criterionNotAvailable');
      return;
    }

    setMixSettings((prev) => {
      // Special handling for avoidConcentrationTogether
      if (key === 'avoidConcentrationTogether') {
        return {
          ...prev,
          avoidConcentrationTogether: value,
          avoidConcentrationNearRestless: value,
        };
      }
      // Mutual exclusivity: peerTutoring vs homogeneousPerformanceGroups
      if (key === 'peerTutoring' && value > 0) {
        return {
          ...prev,
          peerTutoring: value,
          homogeneousPerformanceGroups: 0,
        };
      }
      if (key === 'homogeneousPerformanceGroups' && value > 0) {
        return {
          ...prev,
          homogeneousPerformanceGroups: value,
          peerTutoring: 0,
        };
      }
      return {
        ...prev,
        [key]: value,
      };
    });
  };

  // Quick preset handlers
  const handleAllOn = () => {
    setMixSettings((prev) => {
      const newSettings = { ...prev };
      SCALAR_MIX_SETTING_KEYS.forEach((key) => {
        newSettings[key] = DEFAULT_MIX_WEIGHTS[key];
      });

      if (
        newSettings.peerTutoring > 0 &&
        newSettings.homogeneousPerformanceGroups > 0
      ) {
        const preferPeerTutoring =
          prev.peerTutoring > prev.homogeneousPerformanceGroups ||
          (prev.peerTutoring === prev.homogeneousPerformanceGroups &&
            DEFAULT_MIX_WEIGHTS.peerTutoring >=
              DEFAULT_MIX_WEIGHTS.homogeneousPerformanceGroups);

        if (preferPeerTutoring) {
          newSettings.homogeneousPerformanceGroups = 0;
        } else {
          newSettings.peerTutoring = 0;
        }
      }

      return newSettings;
    });
  };

  const handleAllOff = () => {
    setMixSettings((prev) => {
      const newSettings = { ...prev };
      SCALAR_MIX_SETTING_KEYS.forEach((key) => {
        newSettings[key] = 0;
      });
      return newSettings;
    });
  };

  const isRandom = React.useMemo(
    () => SCALAR_MIX_SETTING_KEYS.every((key) => settings[key] === 0),
    [settings],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 pb-2">
          {/* Header with description */}
          <SectionHeader
            title={t('mix.title', 'Mischkriterien')}
            description={t(
              'mix.description',
              'Stelle die Wichtigkeit der verschiedenen Kriterien ein (0-10).',
            )}
          />

          {/* Master switch: enable/disable all criteria at once */}
          <div className="px-2">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-800/60">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {t('mix.toggleAll', 'Alle Kriterien')}
              </span>
              <ToggleSwitch
                checked={!isRandom}
                onChange={(checked) => (checked ? handleAllOn() : handleAllOff())}
                label={t('mix.toggleAll', 'Alle Kriterien')}
                title={
                  isRandom
                    ? t('mix.enableAll', 'Alle Kriterien aktivieren')
                    : t('mix.disableAll', 'Alle Kriterien deaktivieren')
                }
              />
            </div>
          </div>

          {/* Categorized Criteria - only show available criteria */}
          {categories.map((category, categoryIndex) => {
            // Filter to only include available criteria
            const availableCriteria = category.criteria.filter(
              (criterion) =>
                isCriterionAvailable(criterion.key, students).available,
            );

            // Skip empty categories entirely
            if (availableCriteria.length === 0) {
              return null;
            }

            return (
              <div key={category.id}>
                {/* Category Separator - only show if category has a label */}
                {category.label && categoryIndex > 0 && (
                  <div className="py-1" />
                )}
                {category.label && <SectionSeparator label={category.label} />}
                <div className="space-y-3 px-2 pt-2">
                  {availableCriteria.map((criterion) => {
                    const value = settings[criterion.key];
                    const isActive = value > 0;
                    const surfaceClasses = [
                      'group relative w-full rounded-2xl p-3 text-left shadow-sm',
                      getSidebarSurfaceClasses({
                        variant: 'expanded',
                        isActive,
                        disabled: false,
                        interactive: true,
                      }),
                    ].join(' ');
                    const iconClasses = getSidebarIconClasses({
                      isActive,
                      disabled: false,
                    });
                    const IconComp = CRITERIA_ICON_MAP[criterion.key];

                    return (
                      <button
                        key={criterion.key}
                        type="button"
                        onClick={() => {
                          const newValue =
                            value === 0
                              ? DEFAULT_MIX_WEIGHTS[criterion.key]
                              : 0;
                          handleSettingChange(criterion.key, newValue);
                        }}
                        className={surfaceClasses}
                        title={`${criterion.label}: ${value}/10`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`${iconClasses} mt-1 inline-flex items-center justify-center`}
                            aria-hidden="true"
                          >
                            <IconComp size={16} />
                          </span>
                          <div className="flex-1 cursor-pointer">
                            <div className="mb-1 flex items-center justify-between">
                              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                {criterion.label}
                              </div>
                              <div
                                className={`
                                text-xs px-3 py-1 rounded-full shadow-sm
                                ${
                                  isActive
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-900/60 dark:text-gray-300'
                                }
                              `}
                              >
                                {value}/10
                              </div>
                            </div>
                            <div
                              className="mb-2 text-xs text-gray-500 dark:text-gray-400"
                              title={t(
                                'mix.weightTooltip',
                                'Gewichtung: {{value}}/10 – Je höher der Wert, desto wichtiger ist dieses Kriterium bei der Sitzplatzverteilung.',
                                { value },
                              )}
                            >
                              {criterion.description}
                            </div>
                            <div className="rounded-xl border border-blue-200 bg-white/80 px-3 py-2 dark:border-blue-900/40 dark:bg-gray-950/70">
                              <input
                                type="range"
                                min="0"
                                max="10"
                                value={value}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  handleSettingChange(
                                    criterion.key,
                                    parseInt(e.target.value, 10),
                                  )
                                }
                                className={`
                                h-1 w-full appearance-none rounded-full cursor-pointer
                                ${
                                  isActive
                                    ? 'bg-blue-200 dark:bg-blue-800'
                                    : 'bg-gray-200 dark:bg-gray-600'
                                }
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                                [&::-webkit-slider-thumb]:appearance-none
                                [&::-webkit-slider-thumb]:h-3
                                [&::-webkit-slider-thumb]:w-3
                                [&::-webkit-slider-thumb]:rounded-full
                                [&::-webkit-slider-thumb]:cursor-pointer
                                ${
                                  isActive
                                    ? '[&::-webkit-slider-thumb]:bg-blue-600'
                                    : '[&::-webkit-slider-thumb]:bg-gray-400'
                                }
                              `}
                              />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Random Warning */}
          {isRandom && (
            <div className="px-2 pb-2">
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
                <p className="text-center text-xs font-medium text-amber-700 dark:text-amber-400">
                  ⚠️{' '}
                  {t(
                    'mix.randomWarning',
                    'Alle Kriterien deaktiviert - Mischen ist komplett zufällig!',
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const areSettingsEqual = (prev: MixSettings, next: MixSettings) => {
  return SCALAR_MIX_SETTING_KEYS.every((key) => prev[key] === next[key]);
};

const arePropsEqual = (
  prev: SmartMixControlsProps,
  next: SmartMixControlsProps,
) => {
  return (
    prev.setMixSettings === next.setMixSettings &&
    prev.students === next.students &&
    areSettingsEqual(prev.settings, next.settings)
  );
};

export default React.memo(SmartMixControls, arePropsEqual);
