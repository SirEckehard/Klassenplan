// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { LocalizedLink } from '@/components/LocalizedLink';
import LayerSwitcher from '@/components/shell/LayerSwitcher';
import HelpButton from '@/components/ui/buttons/HelpButton';
import OnboardingTour from '@/components/onboarding/OnboardingTour';
import { resolveTourId } from '@/components/onboarding/tours';
import {
  useSeatingAlgorithmContext,
  useClassroomLayoutContext,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import { useClassManagementContext } from '@/contexts/seatingPlan/ClassManagementContext';
import { useSeatingPlanSelector } from '@/contexts/seatingPlan/seatingPlanSelectors';
import { useOnboardingTour } from '@/hooks/onboarding/onboardingTourStore';
import { type ShortcutContext } from '@/utils';
import { KpLockup } from '@/components/KpLockup';

/**
 * The workspace header: branding, the layer switcher, and Help.
 *
 * It sticks to the top so the layer switcher is reachable from anywhere in a
 * long student list, and it hosts the onboarding tour: the header knows the
 * step and class that decide which tour applies, and the Help button that
 * restarts it lives here.
 */
export default function SeatingPlanHeader() {
  const { t } = useTranslation('generator');
  const { step } = useSeatingAlgorithmContext();
  const { seatingMode } = useClassroomLayoutContext();
  const { handleStepChange } = useSeatingPlanActions();
  const { activeClass } = useClassManagementContext();
  const { requestTour } = useOnboardingTour();
  const autoMixing = useSeatingPlanSelector(({ state }) => state.autoMixing);
  const tourId = resolveTourId(
    step,
    Boolean(activeClass.id),
    seatingMode,
    autoMixing,
  );

  // Handle layer changes
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
          ]),
          contexts: ['plan'] as ShortcutContext[],
        };
      default:
        return null;
    }
  };

  const helpContent = getHelpContent();

  return (
    <header className="sticky top-0 z-30 border-b border-(--border-card) bg-(--surface-card)">
      <div className="mx-auto flex h-14 max-w-7xl flex-row items-center justify-between gap-4 px-4">
        {/* Left - Logo + Branding */}
        <h1 className="flex shrink-0 items-center">
          <LocalizedLink
            to="/"
            className="kp-lockup focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <KpLockup size="sm" hideWordmarkOnMobile />
          </LocalizedLink>
        </h1>

        {/* Centre - the three layers of the classroom */}
        <LayerSwitcher
          currentStep={step}
          onStepChange={onStepChange}
          seatingMode={seatingMode}
        />

        {/* Right - Help Button */}
        <div className="flex shrink-0 items-center">
          {helpContent && (
            <HelpButton
              title={helpContent.title}
              instructions={helpContent.instructions}
              shortcutContexts={helpContent.contexts}
              onStartTour={tourId ? () => requestTour(tourId) : undefined}
            />
          )}
        </div>
      </div>

      <OnboardingTour tourId={tourId} />
    </header>
  );
}
