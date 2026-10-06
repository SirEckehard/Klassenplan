// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { LocalizedLink } from '@/components/LocalizedLink';
import LayerSwitcher from '@/components/shell/LayerSwitcher';
import HeaderClassMenu from '@/components/shell/HeaderClassMenu';
import HelpButton from '@/components/ui/buttons/HelpButton';
import AppSettingsMenu from '@/components/shell/AppSettingsMenu';
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
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import type { ShortcutContext } from '@/utils';
import { KpLockup } from '@/components/KpLockup';

/**
 * The workspace header: branding, the class, the layer switcher, Help and the
 * settings.
 *
 * It sticks to the top so the layer switcher is reachable from anywhere in a
 * long student list, and it hosts the onboarding tour: the header knows the
 * step and class that decide which tour applies, and the Help button that
 * restarts it lives here. The plan itself is not here: its name is set where
 * it is saved, in the plan layer's toolbar (`PlanSavePanel`), and exporting
 * and presenting are the plan layer's way on, at the end of its status bar
 * (`PlanExits`).
 *
 * The export page and "Bibliothek" wear the same header (`view="export"`,
 * `view="library"`). No layer is current there, so every one of the three
 * leads back into the workspace; "Bibliothek" runs a tour of its own.
 */
export default function SeatingPlanHeader({
  view = 'workspace',
}: {
  view?: 'workspace' | 'export' | 'library';
}) {
  const { t } = useTranslation(['generator', 'common']);
  const isExport = view === 'export';
  // A page beside the layers: none of them is current.
  const isOutside = view !== 'workspace';
  const navigate = useLocalizedNavigate();
  const { step } = useSeatingAlgorithmContext();
  const { seatingMode } = useClassroomLayoutContext();
  const { handleStepChange } = useSeatingPlanActions();
  const { activeClass } = useClassManagementContext();
  const { requestTour } = useOnboardingTour();
  const autoMixing = useSeatingPlanSelector(({ state }) => state.autoMixing);
  // "Bibliothek" has a tour of its own; the export page has none.
  const tourId =
    view === 'library'
      ? 'library'
      : isOutside
        ? null
        : resolveTourId(step, Boolean(activeClass.id), seatingMode, autoMixing);

  // Handle layer changes
  const onStepChange = (targetStep: number) => {
    if (isOutside) {
      navigate('/generator', { state: { step: targetStep } });
      return;
    }
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

    if (view === 'library') {
      return {
        title: t('help.library.title'),
        instructions: list([
          'help.library.item1',
          'help.library.item2',
          'help.library.item3',
          'help.library.item4',
          'help.library.item5',
        ]),
        contexts: ['library'] as ShortcutContext[],
        faqSection: 'layout',
      };
    }

    if (isExport) {
      return {
        title: t('help.export.title'),
        instructions: list([
          'help.export.item1',
          'help.export.item2',
          'help.export.itemFlip',
          'help.export.item3',
          'help.export.itemNames',
          'help.export.item4',
          'help.export.item5',
        ]),
        contexts: ['export'] as ShortcutContext[],
        faqSection: 'unterricht',
      };
    }

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
          faqSection: 'klassenliste',
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
          faqSection: 'layout',
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
              'help.circle.item5',
              'help.circle.item6',
              'help.circle.item7',
            ]),
            contexts: ['circle'] as ShortcutContext[],
            faqSection: 'unterricht',
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
          faqSection: 'einstellungen',
        };
      default:
        return null;
    }
  };

  const helpContent = getHelpContent();

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-(--border-card) bg-(--surface-card) pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 flex-row items-center justify-between gap-3 px-4">
        {/* Left — the brand, and the class as the name of the open document */}
        <div className="flex min-w-0 shrink items-center gap-3 lg:w-95">
          <h1 className="flex shrink-0 items-center">
            <LocalizedLink
              to="/"
              // Both halves of the lockup are decorative, so without a label
              // the heading and its link have no accessible name at all.
              aria-label={t('common:nav.home')}
              className="kp-lockup focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:ring-offset-2"
            >
              <KpLockup size="sm" markOnly />
            </LocalizedLink>
          </h1>
          <HeaderClassMenu />
        </div>

        {/* Centre - the three layers of the classroom */}
        <LayerSwitcher
          currentStep={isOutside ? 0 : step}
          onStepChange={onStepChange}
          seatingMode={seatingMode}
        />

        {/* Right — help and the settings. */}
        <div className="flex shrink-0 items-center justify-end gap-2 lg:w-95">
          {helpContent && (
            <HelpButton
              title={helpContent.title}
              instructions={helpContent.instructions}
              shortcutContexts={helpContent.contexts}
              onStartTour={tourId ? () => requestTour(tourId) : undefined}
              faqSection={helpContent.faqSection}
            />
          )}
          {/* The workspace runs at viewport height and shows no footer, so
              appearance, the data wipe, feedback, the changelog and the legal
              pages hang here. */}
          <AppSettingsMenu />
        </div>
      </div>

      {!isExport && <OnboardingTour tourId={tourId} />}
    </header>
  );
}
