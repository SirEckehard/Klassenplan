// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import WizardProgressBar from '@/components/ui/navigation/WizardProgressBar';

interface SeatingPlanStepHeaderProps {
  currentStep: number;
  totalSteps: number;
  onEditStudents?: () => void;
  onEditLayout?: () => void;
  onProceedToLayout?: () => void;
  onProceedToPlan?: () => void;
}

/**
 * Wizard progress bar component for seating plan steps.
 * Displays clickable step indicators for navigation between steps.
 */
export default function SeatingPlanStepHeader({
  currentStep,
  totalSteps,
  onEditStudents,
  onEditLayout,
  onProceedToLayout,
  onProceedToPlan,
}: SeatingPlanStepHeaderProps) {
  const handleStepChange = (step: number) => {
    if (step === 1 && onEditStudents) {
      onEditStudents();
    } else if (step === 2) {
      if (onEditLayout) {
        onEditLayout();
      } else if (onProceedToLayout) {
        onProceedToLayout();
      }
    } else if (step === 3 && onProceedToPlan) {
      onProceedToPlan();
    }
  };

  return (
    <WizardProgressBar
      currentStep={currentStep}
      totalSteps={totalSteps}
      onStepChange={handleStepChange}
    />
  );
}
