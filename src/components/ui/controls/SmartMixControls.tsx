// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { CRITERIA_ICON_MAP } from '@/utils/ui/criteriaIcons';
import type { MixSettings, Student } from '@/types';
import {
  SCALAR_MIX_SETTING_KEYS,
  getSidebarSurfaceClasses,
  getSidebarIconClasses,
  quietIconButtonClass,
} from '@/utils';
import { isCriterionAvailable } from '@/utils/criteriaValidation';
import {
  useMixCriteria,
  type SuspendedWeights,
} from '@/hooks/ui/useMixCriteria';
import SectionHeader from '../layout/SectionHeader';
import SectionSeparator from '../feedback/SectionSeparator';
import ToggleSwitch from './ToggleSwitch';

type SmartMixControlsProps = {
  settings: MixSettings;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
  students: Student[];
  suspendedWeights?: SuspendedWeights;
};

/**
 * Redesigned MixControls with categories and preset buttons
 * Uses shared components for consistency across sidebar panels
 */
function SmartMixControls({
  settings,
  setMixSettings,
  students,
  suspendedWeights,
}: SmartMixControlsProps) {
  const { t } = useTranslation('generator');
  const mix = useMixCriteria({
    settings,
    setMixSettings,
    students,
    suspendedWeights,
  });

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

  const { isRandom } = mix;

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
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={mix.resetToDefaults}
                  className={`${quietIconButtonClass} h-8 w-8`}
                  title={t('mix.resetDefaultsTitle')}
                  aria-label={t('mix.resetDefaultsTitle')}
                >
                  <ArrowCounterClockwiseIcon size={16} aria-hidden="true" />
                </button>
                <ToggleSwitch
                  checked={!isRandom}
                  onChange={(checked) =>
                    checked ? mix.enableAll() : mix.disableAll()
                  }
                  label={t('mix.toggleAll', 'Alle Kriterien')}
                  title={
                    isRandom
                      ? t('mix.enableAll', 'Alle Kriterien aktivieren')
                      : t('mix.disableAll', 'Alle Kriterien deaktivieren')
                  }
                />
              </div>
            </div>
          </div>

          {/* Categorized criteria: only the available ones */}
          {mix.categories.map((category, categoryIndex) => {
            return (
              <div key={category.id}>
                {/* Category Separator - only show if category has a label */}
                {category.label && categoryIndex > 0 && (
                  <div className="py-1" />
                )}
                {category.label && <SectionSeparator label={category.label} />}
                <div className="space-y-3 px-2 pt-2">
                  {category.criteria.map((criterion) => {
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
                        onClick={() => mix.toggle(criterion.key)}
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
                                  mix.setWeight(
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
                    'Alle Kriterien deaktiviert - Mischen ist zufällig!',
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
    prev.suspendedWeights === next.suspendedWeights &&
    areSettingsEqual(prev.settings, next.settings)
  );
};

export default React.memo(SmartMixControls, arePropsEqual);
