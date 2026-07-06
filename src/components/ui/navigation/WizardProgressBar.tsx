// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AddressBookTabsIcon,
  GridNineIcon,
  CheckIcon,
  HouseIcon,
  CircleDashedIcon,
  ExportIcon,
} from '@phosphor-icons/react';
import { prefetchGeneratorStep } from '@/utils/performance/generatorPrefetch';

interface WizardProgressBarProps {
  currentStep: number;
  totalSteps?: number;
  onStepChange?: (step: number) => void;
  className?: string;
  seatingMode?: 'table' | 'circle';
}

interface StepConfig {
  step: number;
  icon: React.ElementType;
  labelKey: string;
  defaultLabel: string;
  disabled?: boolean;
}

/**
 * Visual wizard progress bar with animated step indicators and connectors.
 * Shows Icons for each step with completed/active/pending states.
 * For step 3, dynamically shows Circle icon when in circle mode.
 * Supports optional step 4 (Export) when totalSteps=4.
 */
export default function WizardProgressBar({
  currentStep,
  totalSteps = 3,
  onStepChange,
  className = '',
  seatingMode = 'table',
}: WizardProgressBarProps) {
  const { t } = useTranslation('generator');

  // Dynamic step configuration based on seating mode
  const steps = useMemo(() => {
    const allSteps: StepConfig[] = [
      {
        step: 1,
        icon: AddressBookTabsIcon,
        labelKey: 'steps.step1',
        defaultLabel: 'Klassenliste',
      },
      {
        step: 2,
        icon: HouseIcon,
        labelKey: 'steps.step2',
        defaultLabel: 'Klassenraum',
      },
      {
        step: 3,
        icon: seatingMode === 'circle' ? CircleDashedIcon : GridNineIcon,
        labelKey:
          seatingMode === 'circle' ? 'steps.step3Circle' : 'steps.step3',
        defaultLabel: seatingMode === 'circle' ? 'Sitzkreis' : 'Sitzplan',
      },
      {
        step: 4,
        icon: ExportIcon,
        labelKey: 'steps.step4',
        defaultLabel: 'Export',
        disabled: true, // Export step is not clickable from the Export page itself
      },
    ];
    return allSteps.slice(0, totalSteps);
  }, [seatingMode, totalSteps]);

  const getStepState = useCallback(
    (step: number): 'completed' | 'active' | 'pending' => {
      if (step < currentStep) return 'completed';
      if (step === currentStep) return 'active';
      return 'pending';
    },
    [currentStep],
  );

  const handleStepClick = useCallback(
    (step: number) => {
      if (onStepChange && step !== currentStep) {
        onStepChange(step);
      }
    },
    [onStepChange, currentStep],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, step: number) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleStepClick(step);
      }
    },
    [handleStepClick],
  );

  const handleStepHover = useCallback((stepNum: number) => {
    if (stepNum > 1) {
      void prefetchGeneratorStep(stepNum, 'hover');
    }
  }, []);

  return (
    <div
      className={`flex items-center justify-center gap-1 sm:gap-2 ${className}`}
      role="navigation"
      aria-label={t('wizard.progressLabel', 'Wizard-Fortschritt')}
    >
      {steps.map((stepConfig, index) => {
        const state = getStepState(stepConfig.step);
        const isCompleted = state === 'completed';
        const isActive = state === 'active';
        const Icon = stepConfig.icon;

        return (
          <React.Fragment key={stepConfig.step}>
            {/* Step indicator */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleStepClick(stepConfig.step)}
                onKeyDown={(e) => handleKeyDown(e, stepConfig.step)}
                onMouseEnter={() => handleStepHover(stepConfig.step)}
                onFocus={() => handleStepHover(stepConfig.step)}
                className={`
                  wizard-step-indicator
                  ${isActive ? 'wizard-step-active' : ''}
                  ${isCompleted ? 'wizard-step-completed' : ''}
                  ${!isActive && !isCompleted ? 'wizard-step-pending' : ''}
                `}
                aria-label={t('wizard.goToStep', 'Zu Schritt {{step}}', {
                  step: stepConfig.step,
                })}
                aria-current={isActive ? 'step' : undefined}
                disabled={!onStepChange || stepConfig.disabled}
              >
                {isCompleted ? (
                  <CheckIcon
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    aria-hidden="true"
                  />
                ) : (
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                )}
              </button>
              <span
                className={`
                  hidden sm:block text-xs font-medium transition-colors duration-200
                  ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}
                  ${isCompleted ? 'text-green-600 dark:text-green-400' : ''}
                  ${!isActive && !isCompleted ? 'text-gray-500 dark:text-gray-400' : ''}
                `}
              >
                {t(stepConfig.labelKey, stepConfig.defaultLabel)}
              </span>
            </div>

            {/* Connector line (not after last step) */}
            {index < steps.length - 1 && (
              <div
                className={`
                  wizard-connector
                  ${isCompleted ? 'wizard-connector-completed' : ''}
                `}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
