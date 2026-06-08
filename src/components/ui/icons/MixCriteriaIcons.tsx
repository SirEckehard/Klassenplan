// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  LightningIcon,
  XIcon,
} from '@phosphor-icons/react';
import { CRITERIA_ICON_MAP } from '@/utils/ui/criteriaIcons';
import type { MixSettings, ScalarMixSettingKey, Student } from '@/types';
import {
  DEFAULT_MIX_WEIGHTS,
  SCALAR_MIX_SETTING_KEYS,
  getSidebarSurfaceClasses,
  getSidebarIconClasses,
  getSidebarIndicatorClasses,
} from '@/utils';
import { isCriterionAvailable } from '@/utils/criteriaValidation';
import { showToast } from '@/utils/ui/toast';
import SectionHeader from '../layout/SectionHeader';
import SectionSeparator from '../feedback/SectionSeparator';

interface MixCriteriaIconsProps {
  settings: MixSettings;
  students: Student[];
  onSettingChange?: (key: keyof MixSettings, value: number) => void;
  isExpanded?: boolean;
  className?: string;
  compactLayout?: boolean;
}

interface CriteriaIconProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: number;
  isExpanded: boolean;
  isAvailable: boolean;
  disabledReason?: string;
  activeLabel: string;
  inactiveLabel: string;
  onChange?: (value: number) => void;
  onToggle?: () => void;
}

interface CriteriaCategory {
  id: string;
  label: string;
  criteria: Array<{
    key: ScalarMixSettingKey;
    label: string;
    description: string;
  }>;
}

function CriteriaIcon({
  icon,
  label,
  description,
  value,
  isExpanded,
  isAvailable,
  disabledReason,
  activeLabel,
  inactiveLabel,
  onChange,
  onToggle,
}: CriteriaIconProps) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(parseInt(e.target.value, 10));
    }
  };

  const handleClick = () => {
    if (!isAvailable) {
      showToast('info', disabledReason || 'generator:mix.criterionNotAvailable');
      return;
    }
    if (onToggle) {
      onToggle();
    }
  };

  const isActive = value > 0;
  const iconStyleOptions = {
    isActive: isActive && isAvailable,
    disabled: !isAvailable,
  } as const;

  if (!isExpanded) {
    const buttonClasses = [
      'group relative inline-flex h-12 w-12 items-center justify-center rounded-full p-0',
      getSidebarSurfaceClasses({
        variant: 'collapsed',
        isActive: iconStyleOptions.isActive,
        disabled: iconStyleOptions.disabled,
        interactive: isAvailable,
      }),
    ].join(' ');
    const indicatorClasses = getSidebarIndicatorClasses();
    return (
      <button
        type="button"
        onClick={handleClick}
        className={buttonClasses}
        title={!isAvailable ? disabledReason : `${label}: ${value}/10`}
        aria-pressed={isActive}
        aria-disabled={!isAvailable}
        tabIndex={isAvailable ? 0 : -1}
        aria-label={`${label} ${isActive ? activeLabel : inactiveLabel}`}
      >
        <span className={getSidebarIconClasses(iconStyleOptions)}>{icon}</span>

        {/* Active indicator for collapsed mode */}
        {isActive && <div className={indicatorClasses} />}
      </button>
    );
  }

  const containerClasses = [
    'group relative flex w-full flex-col gap-2 rounded-2xl p-3 shadow-sm',
    getSidebarSurfaceClasses({
      variant: 'expanded',
      isActive: iconStyleOptions.isActive,
      disabled: iconStyleOptions.disabled,
      interactive: isAvailable,
    }),
  ].join(' ');

  return (
    <div
      className={containerClasses}
      title={!isAvailable ? disabledReason : `${label}: ${value}/10`}
    >
      <span className={getSidebarIconClasses(iconStyleOptions)}>{icon}</span>

      {isExpanded && (
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {label}
            </div>
            <div
              className={`
              text-xs px-3 py-1 rounded-full shadow-sm
              ${
                isActive && isAvailable
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-900/60 dark:text-gray-300'
              }
            `}
            >
              {value}/10
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {description}
          </div>
          <input
            type="range"
            min="0"
            max="10"
            value={value}
            disabled={!isAvailable}
            onChange={handleSliderChange}
            className={`
              w-full h-1 rounded-lg appearance-none cursor-pointer
              ${
                isActive
                  ? 'bg-blue-200 dark:bg-blue-800'
                  : 'bg-gray-200 dark:bg-gray-600'
              }
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
      )}
    </div>
  );
}

export default function MixCriteriaIcons({
  settings,
  students,
  onSettingChange,
  isExpanded = false,
  className = '',
  compactLayout = false,
}: MixCriteriaIconsProps) {
  const { t } = useTranslation('generator');

  const categories: CriteriaCategory[] = [
    {
      id: 'repetition',
      label: '',
      criteria: [
        {
          key: 'avoidPreviousPairs',
          label: t('mix.criteria.avoidPreviousPairs.label', 'Wiederholungen'),
          description: t(
            'mix.criteriaDescriptions.avoidPreviousPairs',
            'Schüler, die zuletzt zusammen saßen, trennen.',
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
            'mix.criteriaDescriptions.preferGenderMix',
            'Geschlechter mischen für ausgewogene Tischbesetzung.',
          ),
        },
        {
          key: 'preferFrontForSmallerStudents',
          label: t(
            'mix.criteria.preferFrontForSmallerStudents.label',
            'Körpergröße',
          ),
          description: t(
            'mix.criteriaDescriptions.preferFrontForSmallerStudents',
            'Kleinere Schüler vorne, größere hinten.',
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
            'mix.criteriaDescriptions.preferLanguageMixing',
            'Sprachstarke neben Anfänger/DaZ setzen.',
          ),
        },
        {
          key: 'peerTutoring',
          label: t('mix.criteria.peerTutoring.label', 'Fördern (heterogen)'),
          description: t(
            'mix.criteriaDescriptions.peerTutoring',
            'Stärkere und schwächere Schüler zusammen.',
          ),
        },
        {
          key: 'homogeneousPerformanceGroups',
          label: t(
            'mix.criteria.homogeneousPerformanceGroups.label',
            'Fördern (homogen)',
          ),
          description: t(
            'mix.criteriaDescriptions.homogeneousPerformanceGroups',
            'Leistungsstarke und -schwache jeweils zusammen.',
          ),
        },
        {
          key: 'preferFrontForNeedsFrontSeat',
          label: t(
            'mix.criteria.preferFrontForNeedsFrontSeat.label',
            'Vordere Plätze',
          ),
          description: t(
            'mix.criteriaDescriptions.preferFrontForNeedsFrontSeat',
            'Schüler mit Platzbedarf in den vorderen Reihen platzieren.',
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
            'mix.criteriaDescriptions.avoidRestlessTogether',
            'Unruhige Schüler trennen.',
          ),
        },
        {
          key: 'avoidShyAlone',
          label: t(
            'mix.criteria.avoidShyAlone.label',
            'Schüchterne nicht alleine',
          ),
          description: t(
            'mix.criteriaDescriptions.avoidShyAlone',
            'Schüchterne Schüler nicht alleine sitzen lassen.',
          ),
        },
        {
          key: 'avoidConcentrationTogether',
          label: t(
            'mix.criteria.avoidConcentrationTogether.label',
            'Ablenkbarkeit',
          ),
          description: t(
            'mix.criteriaDescriptions.avoidConcentrationTogether',
            'Schüler mit hoher Ablenkbarkeit trennen.',
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
            'mix.criteriaDescriptions.distributeSocialRoles',
            'Mediatoren, Anführer und Einzelgänger verteilen.',
          ),
        },
        {
          key: 'considerWishPartners',
          label: t('mix.criteria.considerWishPartners.label', 'Wunschpartner'),
          description: t(
            'mix.criteriaDescriptions.considerWishPartners',
            'Wunschpartner-Anfragen der Schüler.',
          ),
        },
        {
          key: 'avoidConflictPartners',
          label: t(
            'mix.criteria.avoidConflictPartners.label',
            'Distanzwünsche',
          ),
          description: t(
            'mix.criteriaDescriptions.avoidConflictPartners',
            'Schüler mit Distanzwunsch trennen.',
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
            'mix.criteriaDescriptions.preferWindowSeats',
            'Fensterpräferenzen berücksichtigen.',
          ),
        },
        {
          key: 'preferDoorSeats',
          label: t('mix.criteria.preferDoorSeats.label', 'Türnähe'),
          description: t(
            'mix.criteriaDescriptions.preferDoorSeats',
            'Türpräferenzen berücksichtigen.',
          ),
        },
      ],
    },
  ];

  const criterionNotAvailableMsg = t(
    'mix.criterionNotAvailable',
    'Kriterium nicht verfügbar',
  );
  const activeLabel = t('mix.active', 'aktiv');
  const inactiveLabel = t('mix.inactive', 'inaktiv');

  const handleSettingChange = (key: ScalarMixSettingKey, value: number) => {
    if (!onSettingChange) return;

    // Check if criterion is available
    const availability = isCriterionAvailable(key, students);
    if (!availability.available && value > 0) {
      // Show toast with reason and prevent change
      showToast('info', availability.reason || criterionNotAvailableMsg);
      return;
    }

    onSettingChange(key, value);
  };

  const handleToggle = (key: ScalarMixSettingKey) => {
    if (!onSettingChange) return;

    const currentValue = settings[key];
    const newValue = currentValue > 0 ? 0 : DEFAULT_MIX_WEIGHTS[key];

    // Check availability before increasing value
    if (newValue > 0) {
      const availability = isCriterionAvailable(key, students);
      if (!availability.available) {
        showToast('info', availability.reason || criterionNotAvailableMsg);
        return;
      }
    }

    // Special handling for avoidConcentrationTogether - also update avoidConcentrationNearRestless
    if (key === 'avoidConcentrationTogether') {
      onSettingChange('avoidConcentrationTogether', newValue);
      onSettingChange('avoidConcentrationNearRestless', newValue);
    }
    // Mutual exclusivity: peerTutoring vs homogeneousPerformanceGroups
    else if (key === 'peerTutoring' && newValue > 0) {
      onSettingChange('peerTutoring', newValue);
      onSettingChange('homogeneousPerformanceGroups', 0);
    } else if (key === 'homogeneousPerformanceGroups' && newValue > 0) {
      onSettingChange('homogeneousPerformanceGroups', newValue);
      onSettingChange('peerTutoring', 0);
    } else {
      onSettingChange(key, newValue);
    }
  };

  // Quick preset handlers
  const handleAllOn = () => {
    if (onSettingChange) {
      SCALAR_MIX_SETTING_KEYS.forEach((key) => {
        onSettingChange(key, DEFAULT_MIX_WEIGHTS[key]);
      });
    }
  };

  const handleAllOff = () => {
    if (onSettingChange) {
      SCALAR_MIX_SETTING_KEYS.forEach((key) => {
        onSettingChange(key, 0);
      });
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {isExpanded ? (
        <>
          {/* Header with description */}
          <SectionHeader
            title={t('mix.title', 'Mix-Kriterien')}
            description={t(
              'mix.sectionDescription',
              'Stelle die Wichtigkeit der verschiedenen Kriterien ein (0-10)',
            )}
          />

          {/* Quick Preset Buttons */}
          <div className="px-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAllOn}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
                title={t('mix.enableAll', 'Alle Kriterien aktivieren')}
              >
                <LightningIcon size={12} />
                {t('mix.allOn', 'Alle an')}
              </button>
              <button
                type="button"
                onClick={handleAllOff}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
                title={t('mix.disableAll', 'Alle Kriterien deaktivieren')}
              >
                <XIcon size={12} />
                {t('mix.allOff', 'Alle aus')}
              </button>
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

                {/* Category Criteria */}
                <div className="space-y-2 px-3 pt-2">
                  {availableCriteria.map((criterion) => {
                    const IconComp = CRITERIA_ICON_MAP[criterion.key];
                    return (
                      <CriteriaIcon
                        key={criterion.key}
                        icon={<IconComp size={16} />}
                        label={criterion.label}
                        description={criterion.description}
                        value={settings[criterion.key]}
                        isExpanded={isExpanded}
                        isAvailable={true}
                        activeLabel={activeLabel}
                        inactiveLabel={inactiveLabel}
                        onChange={(value) =>
                          handleSettingChange(criterion.key, value)
                        }
                        onToggle={() => handleToggle(criterion.key)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        /* Collapsed Mode - Show all criteria without categories */
        <div
          className={
            compactLayout
              ? 'flex flex-wrap items-center justify-center gap-2 px-1'
              : 'flex flex-col items-center space-y-1 px-1'
          }
        >
          {categories.flatMap((category) =>
            category.criteria
              .filter(
                (criterion) =>
                  isCriterionAvailable(criterion.key, students).available,
              )
              .map((criterion) => {
                const IconComp = CRITERIA_ICON_MAP[criterion.key];
                return (
                  <CriteriaIcon
                    key={criterion.key}
                    icon={<IconComp size={16} />}
                    label={criterion.label}
                    description={criterion.description}
                    value={settings[criterion.key]}
                    isExpanded={isExpanded}
                    isAvailable={true}
                    activeLabel={activeLabel}
                    inactiveLabel={inactiveLabel}
                    onChange={(value) =>
                      handleSettingChange(criterion.key, value)
                    }
                    onToggle={() => handleToggle(criterion.key)}
                  />
                );
              }),
          )}
        </div>
      )}
    </div>
  );
}
