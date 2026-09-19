// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AddressBookTabsIcon,
  HouseIcon,
  GridNineIcon,
  CircleDashedIcon,
} from '@phosphor-icons/react';
import {
  pillTabActiveClass,
  pillTabBaseClass,
  pillTabInactiveClass,
  segmentedTrackClass,
} from '@/utils';
import { prefetchGeneratorStep } from '@/utils/performance/generatorPrefetch';

export interface LayerSwitcherProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  seatingMode?: 'table' | 'circle';
  className?: string;
}

/**
 * Klasse · Raum · Plan.
 *
 * Replaces the wizard progress bar. The three steps were never really steps —
 * they are three layers of the same classroom, and teachers move between them
 * constantly. A segmented control says "you are looking at one of three
 * things"; a progress bar said "you are on your way somewhere", which stopped
 * being true after the first class.
 *
 * The active option is a raised paper pill rather than a blue one: blue means
 * "you can act here", and which layer you are looking at is not an action.
 */
export default function LayerSwitcher({
  currentStep,
  onStepChange,
  seatingMode = 'table',
  className = '',
}: LayerSwitcherProps) {
  const { t } = useTranslation('generator');

  const layers = useMemo(
    () => [
      { step: 1, icon: AddressBookTabsIcon, label: t('shell.layers.class') },
      { step: 2, icon: HouseIcon, label: t('shell.layers.room') },
      {
        step: 3,
        icon: seatingMode === 'circle' ? CircleDashedIcon : GridNineIcon,
        label:
          seatingMode === 'circle'
            ? t('shell.layers.circle')
            : t('shell.layers.plan'),
      },
    ],
    [seatingMode, t],
  );

  const handleHover = useCallback((step: number) => {
    if (step > 1) {
      void prefetchGeneratorStep(step, 'hover');
    }
  }, []);

  return (
    <div
      className={`${segmentedTrackClass} ${className}`}
      role="tablist"
      aria-label={t('shell.layerSwitchLabel')}
    >
      {layers.map(({ step, icon: Icon, label }) => {
        const isActive = step === currentStep;
        return (
          <button
            key={step}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              if (!isActive) onStepChange(step);
            }}
            onMouseEnter={() => handleHover(step)}
            onFocus={() => handleHover(step)}
            className={`${pillTabBaseClass} ${
              isActive ? pillTabActiveClass : pillTabInactiveClass
            } gap-2 px-3 py-1.5 sm:px-4`}
          >
            <Icon size={17} aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sr-only sm:hidden">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
