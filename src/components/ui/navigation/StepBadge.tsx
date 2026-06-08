// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  cardSurfaceClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/utils';
import { prefetchGeneratorStep } from '@/utils/performance/generatorPrefetch';

interface StepBadgeProps {
  currentStep: number;
  totalSteps: number;
  onStepChange?: (step: number) => void;
  className?: string;
  title?: string;
}

export default function StepBadge({
  currentStep,
  totalSteps,
  onStepChange,
  className = '',
  title,
}: StepBadgeProps) {
  const { t } = useTranslation('generator');

  const handleStepClick = (step: number) => {
    if (onStepChange && step !== currentStep) {
      onStepChange(step);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, step: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleStepClick(step);
    }
  };

  // Preload components on hover for instant navigation
  const handleStepHover = (step: number) => {
    if (step === 1 || (step !== currentStep && step > 1)) {
      void prefetchGeneratorStep(step, 'hover');
    }
  };

  // Generate array of step numbers
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div
      className={`${cardSurfaceClass} flex w-full flex-col gap-3 border border-blue-100/60 px-4 py-4 shadow-md dark:border-blue-900/40 md:w-auto ${className}`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {/* Title Section (if provided) */}
        {title && (
          <div className="md:mr-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
          </div>
        )}

        {/* Step Navigation */}
        <div className="flex flex-col items-center gap-2 md:ml-auto">
          {/* "Schritt" Label in Klassenplan Orange */}
          <span className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">
            {t('wizard.step', 'Schritt')}
          </span>

          {/* Horizontal Step Numbers */}
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <React.Fragment key={step}>
                <button
                  type="button"
                  onClick={() => handleStepClick(step)}
                  onKeyDown={(e) => handleKeyDown(e, step)}
                  onMouseEnter={() => handleStepHover(step)}
                  onFocus={() => handleStepHover(step)}
                  className={
                    step === currentStep
                      ? `${primaryButtonClass} min-h-8 min-w-8 justify-center px-3 py-1 text-sm`
                      : `${secondaryButtonClass} min-h-8 min-w-8 justify-center px-3 py-1 text-sm text-gray-600 hover:text-blue-600 dark:text-gray-300`
                  }
                  aria-label={t('wizard.goToStep', 'Zu Schritt {{step}}', {
                    step,
                  })}
                  title={t('wizard.goToStep', 'Zu Schritt {{step}}', { step })}
                  disabled={!onStepChange}
                >
                  {step}
                </button>
                {index < steps.length - 1 && (
                  <span className="text-sm text-gray-400 dark:text-gray-500">
                    |
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
