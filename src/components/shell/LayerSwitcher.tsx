// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AddressBookTabsIcon,
  HouseIcon,
  GridNineIcon,
  CircleDashedIcon,
} from '@phosphor-icons/react';
import SegmentedControl from '@/components/ui/controls/SegmentedControl';
import { prefetchGeneratorStep } from '@/utils/performance/generatorPrefetch';

export interface LayerSwitcherProps {
  /** 1–3; anything else marks no layer as current (the export page). */
  currentStep: number;
  onStepChange: (step: number) => void;
  seatingMode?: 'table' | 'circle';
  className?: string;
}

type LayerValue = '1' | '2' | '3';

/**
 * Klasse · Raum · Plan.
 *
 * Replaces the wizard progress bar. The three steps were never really steps —
 * they are three layers of the same classroom, and teachers move between them
 * constantly. A segmented control says "you are looking at one of three
 * things"; a progress bar said "you are on your way somewhere", which stopped
 * being true after the first class.
 */
export default function LayerSwitcher({
  currentStep,
  onStepChange,
  seatingMode = 'table',
  className = '',
}: LayerSwitcherProps) {
  const { t } = useTranslation('generator');

  const options = useMemo(
    () => [
      {
        value: '1' as LayerValue,
        icon: AddressBookTabsIcon,
        label: t('shell.layers.class'),
      },
      {
        value: '2' as LayerValue,
        icon: HouseIcon,
        label: t('shell.layers.room'),
      },
      {
        value: '3' as LayerValue,
        icon: seatingMode === 'circle' ? CircleDashedIcon : GridNineIcon,
        label:
          seatingMode === 'circle'
            ? t('shell.layers.circle')
            : t('shell.layers.plan'),
      },
    ],
    [seatingMode, t],
  );

  const handlePointed = useCallback((value: LayerValue) => {
    const step = Number(value);
    if (step > 1) {
      void prefetchGeneratorStep(step, 'hover');
    }
  }, []);

  return (
    <SegmentedControl
      options={options}
      value={String(currentStep) as LayerValue}
      onChange={(value) => onStepChange(Number(value))}
      onOptionPointed={handlePointed}
      ariaLabel={t('shell.layerSwitchLabel')}
      compactLabels
      className={className}
    />
  );
}
