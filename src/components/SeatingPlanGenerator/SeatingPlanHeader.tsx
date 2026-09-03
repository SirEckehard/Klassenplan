// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { LocalizedLink } from '@/components/LocalizedLink';
import WizardProgressBar from '@/components/ui/navigation/WizardProgressBar';
import HelpButton from '@/components/ui/buttons/HelpButton';
import {
  useSeatingAlgorithmContext,
  useClassroomLayoutContext,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import { type ShortcutContext } from '@/utils';
import { KpLockup } from '@/components/KpLockup';

/**
 * Header with Klassenplan branding, centered wizard progress bar, and Help button.
 */
export default function SeatingPlanHeader() {
  const { t } = useTranslation('generator');
  const { step } = useSeatingAlgorithmContext();
  const { seatingMode } = useClassroomLayoutContext();
  const { handleStepChange } = useSeatingPlanActions();

  // Handle wizard step changes
  const onStepChange = (targetStep: number) => {
    if (targetStep !== step) {
      void handleStepChange(targetStep);
    }
  };

  // Step-specific help content. The list items are pure i18n keys: the German
  // texts live in `generator.json` and would only drift if repeated here.
  const getHelpContent = () => {
    const list = (keys: string[]) => (
      <ul className="list-disc space-y-1 pl-4">
        {keys.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
    );

    switch (step) {
      case 1:
        return {
          title: t('help.students.title'),
          instructions: list([
            'help.students.item1',
            'help.students.item2',
            'help.students.item3',
            'help.students.item4',
            'help.students.item5',
            'help.students.item6',
            'help.students.item7',
          ]),
          contexts: ['students'] as ShortcutContext[],
        };
      case 2:
        return {
          title: t('help.layout.title'),
          instructions: list([
            'help.layout.item1',
            'help.layout.item2',
            'help.layout.item3',
            'help.layout.item4',
            'help.layout.item5',
            'help.layout.item6',
            'help.layout.item7',
          ]),
          contexts: ['layout'] as ShortcutContext[],
        };
      case 3:
        if (seatingMode === 'circle') {
          return {
            title: t('help.circle.title'),
            instructions: list([
              'help.circle.item1',
              'help.circle.item2',
              'help.circle.item3',
              'help.circle.item4',
            ]),
            contexts: ['circle'] as ShortcutContext[],
          };
        }
        return {
          title: t('help.plan.title'),
          instructions: list([
            'help.plan.item1',
            'help.plan.item2',
            'help.plan.item3',
            'help.plan.item4',
            'help.plan.item5',
            'help.plan.item6',
            'help.plan.item7',
          ]),
          contexts: ['plan'] as ShortcutContext[],
        };
      default:
        return null;
    }
  };

  const helpContent = getHelpContent();

  return (
    <div className="mb-6 flex flex-row items-center justify-between gap-4">
      {/* Left side - Logo + Branding (matching Export.tsx style) */}
      <h1 className="flex items-center shrink-0">
        <LocalizedLink
          to="/"
          className="kp-lockup focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <KpLockup size="sm" hideWordmarkOnMobile />
        </LocalizedLink>
      </h1>

      {/* Centered Wizard Progress Bar */}
      <div className="flex-1 flex justify-center px-4">
        <WizardProgressBar
          currentStep={step}
          totalSteps={3}
          onStepChange={onStepChange}
          seatingMode={seatingMode}
          className="w-full max-w-xl"
        />
      </div>

      {/* Right side - Help Button */}
      <div className="flex items-center shrink-0">
        {helpContent && (
          <HelpButton
            title={helpContent.title}
            instructions={helpContent.instructions}
            shortcutContexts={helpContent.contexts}
          />
        )}
      </div>
    </div>
  );
}
