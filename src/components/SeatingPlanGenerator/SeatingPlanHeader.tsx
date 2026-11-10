// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import AppHeader from '@/components/shell/AppHeader';
import LayerSwitcher from '@/components/shell/LayerSwitcher';
import HeaderClassMenu from '@/components/shell/HeaderClassMenu';
import HelpButton from '@/components/ui/buttons/HelpButton';
import { WORKSPACE_HELP_TOPICS } from '@/components/help/workspaceHelpTopics';
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

/**
 * The workspace header: the head every page wears (`AppHeader`) with the class,
 * the layer switcher and the screen's help in it.
 *
 * It sticks to the top so the layer switcher is reachable from anywhere in a
 * long student list, and it hosts the onboarding tour: the header knows the
 * step and class that decide which tour applies, and the Help button that
 * restarts it lives here. The plan itself is not here: its name is set where
 * it is saved, in the plan layer's inspector (`PlanSection`), and exporting
 * and presenting are the plan layer's way on, at the end of its status bar
 * (`PlanExits`).
 *
 * The export page and "Bibliothek" wear the same header (`view="export"`,
 * `view="library"`). No layer is current there, so every one of the three
 * leads back into the workspace; "Bibliothek" runs a tour of its own. All of
 * them keep their way back in the status bar, so the head has none.
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

  // Step-specific help: the screen's name and its topics, whose texts live in
  // `generator.json` under `help.*` (`WORKSPACE_HELP_TOPICS`).
  const getHelpContent = () => {
    if (view === 'library') {
      return {
        title: t('help.library.title'),
        topics: WORKSPACE_HELP_TOPICS.library,
        contexts: ['library'] as ShortcutContext[],
        faqSection: 'layout',
      };
    }

    if (isExport) {
      return {
        title: t('help.export.title'),
        topics: WORKSPACE_HELP_TOPICS.export,
        contexts: ['export'] as ShortcutContext[],
        faqSection: 'unterricht',
      };
    }

    switch (step) {
      case 1:
        return {
          title: t('help.students.title'),
          topics: WORKSPACE_HELP_TOPICS.students,
          contexts: ['students'] as ShortcutContext[],
          faqSection: 'klassenliste',
        };
      case 2:
        return {
          title: t('help.layout.title'),
          topics: WORKSPACE_HELP_TOPICS.layout,
          contexts: ['layout'] as ShortcutContext[],
          faqSection: 'layout',
        };
      case 3:
        if (seatingMode === 'circle') {
          return {
            title: t('help.circle.title'),
            topics: WORKSPACE_HELP_TOPICS.circle,
            contexts: ['circle'] as ShortcutContext[],
            faqSection: 'unterricht',
          };
        }
        return {
          title: t('help.plan.title'),
          topics: WORKSPACE_HELP_TOPICS.plan,
          contexts: ['plan'] as ShortcutContext[],
          faqSection: 'einstellungen',
        };
      default:
        return null;
    }
  };

  const helpContent = getHelpContent();

  return (
    <AppHeader
      brandIsHeading
      isWorkspaceHead={!isOutside}
      // The class as the name of the open document.
      start={<HeaderClassMenu />}
      center={
        <LayerSwitcher
          currentStep={isOutside ? 0 : step}
          onStepChange={onStepChange}
          seatingMode={seatingMode}
        />
      }
      help={
        helpContent ? (
          <HelpButton
            title={helpContent.title}
            topics={helpContent.topics}
            shortcutContexts={helpContent.contexts}
            onStartTour={tourId ? () => requestTour(tourId) : undefined}
            faqSection={helpContent.faqSection}
          />
        ) : undefined
      }
    >
      {!isExport && <OnboardingTour tourId={tourId} />}
    </AppHeader>
  );
}
