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

  // Step-specific help content
  const getHelpContent = () => {
    switch (step) {
      case 1:
        return {
          title: t('help.students.title', 'Klassenliste'),
          instructions: (
            <ul className="list-disc space-y-1 pl-4">
              <li>
                {t(
                  'help.students.item1',
                  'Füge Schüler hinzu: manuell, per "Klasse anlegen" oder über CSV-Import.',
                )}
              </li>
              <li>
                {t(
                  'help.students.item2',
                  'Wähle bis zu 3 Wunsch- und Distanzpartner pro Schüler.',
                )}
              </li>
              <li>
                {t(
                  'help.students.item3',
                  'Speichere und lade Backups über das Backup-Menü.',
                )}
              </li>
            </ul>
          ),
          contexts: ['students'] as ShortcutContext[],
        };
      case 2:
        return {
          title: t('help.layout.title', 'Klassenraum'),
          instructions: (
            <ul className="list-disc space-y-1 pl-4">
              <li>
                {t(
                  'help.layout.item1',
                  'Wähle eine Vorlage oder füge Tische per Klick hinzu.',
                )}
              </li>
              <li>
                {t(
                  'help.layout.item2',
                  'Verschiebe und drehe Tische per Drag & Drop.',
                )}
              </li>
              <li>
                {t(
                  'help.layout.item3',
                  'Mehrfachauswahl: Strg/Cmd + Klick oder Auswahl-Rechteck aufziehen.',
                )}
              </li>
            </ul>
          ),
          contexts: ['layout'] as ShortcutContext[],
        };
      case 3:
        if (seatingMode === 'circle') {
          return {
            title: t('help.circle.title', 'Sitzkreis'),
            instructions: (
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  {t(
                    'help.circle.item1',
                    'Ziehe Schüler per Drag & Drop auf neue Positionen.',
                  )}
                </li>
                <li>
                  {t(
                    'help.circle.item2',
                    'Grüne Linien zeigen Verbindungen zu Tischnachbarn.',
                  )}
                </li>
              </ul>
            ),
            contexts: ['circle'] as ShortcutContext[],
          };
        }
        return {
          title: t('help.plan.title', 'Sitzplan'),
          instructions: (
            <ul className="list-disc space-y-1 pl-4">
              <li>
                {t(
                  'help.plan.item1',
                  'Passe die Gewichtung der Kriterien in der Sidebar an.',
                )}
              </li>
              <li>
                {t(
                  'help.plan.item2',
                  'Ziehe Schüler per Drag & Drop auf andere Plätze.',
                )}
              </li>
              <li>
                {t(
                  'help.plan.item3',
                  'Klicke auf das Schloss, um einen Platz zu sperren.',
                )}
              </li>
            </ul>
          ),
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
