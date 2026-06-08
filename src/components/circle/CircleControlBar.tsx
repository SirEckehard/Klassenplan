// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, FloppyDiskIcon, ShareNetworkIcon } from '@phosphor-icons/react';
import type { ClassroomScene } from '@/types';
import type { CircleLayout } from '@/types/Circle';
import {
  inputFieldClass,
  isFormElementFocused,
  neutralButtonClass,
  primaryButtonClass,
} from '@/utils';

type Props = {
  planName: string;
  setPlanName: (v: string) => void;
  planNameError: boolean;
  setPlanNameError: (v: boolean) => void;
  planNameInputRef: React.RefObject<HTMLInputElement | null>;
  onEditLayout: () => void;
  saveSeatingPlan: (
    name: string,
    scene: ClassroomScene,
    circleLayout?: CircleLayout | null,
  ) => void;
  circleLayout: CircleLayout | null;
  classroomScene: ClassroomScene;
  onExport: () => void;
  isSaveDisabled: boolean;
};

/**
 * Control bar for circle view with navigation, save and export functionality
 */
export default function CircleControlBar({
  planName,
  setPlanName,
  planNameError,
  setPlanNameError,
  planNameInputRef,
  onEditLayout,
  saveSeatingPlan,
  circleLayout,
  classroomScene,
  onExport,
  isSaveDisabled,
}: Props) {
  const { t } = useTranslation('generator');

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFormElementFocused()) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveSeatingPlan(planName, classroomScene, circleLayout);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        onExport();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [planName, classroomScene, circleLayout, saveSeatingPlan, onExport]);

  return (
    <form
      className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-start"
      onSubmit={(e) => {
        e.preventDefault();
        saveSeatingPlan(planName, classroomScene, circleLayout);
      }}
    >
      <button
        type="button"
        onClick={onEditLayout}
        title={t('actions.backShortcut', 'Zurück (Alt/Option+←)')}
        className={`${neutralButtonClass} w-full justify-center gap-2 sm:w-auto`}
      >
        <ArrowLeftIcon className="w-4 h-4" />
        {t('circle.backToClassroom', 'Zurück zum Klassenraum')}
      </button>
      <div className="w-full sm:w-auto flex-1">
        <div className="relative">
          <input
            ref={planNameInputRef}
            type="text"
            value={planName}
            onChange={(e) => {
              setPlanName(e.target.value);
              if (planNameError) setPlanNameError(false);
            }}
            placeholder={t(
              'circle.planNamePlaceholder',
              'Name für diesen Sitzplan',
            )}
            className={`${inputFieldClass} w-full pr-12`}
            aria-label={t(
              'circle.planNameLabel',
              'Gib einen Namen für diesen Sitzplan ein',
            )}
          />
          <button
            type="submit"
            disabled={isSaveDisabled}
            title={t('actions.saveShortcut', 'Plan speichern (Strg/Cmd+S)')}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
              isSaveDisabled
                ? 'cursor-not-allowed text-gray-400 dark:text-gray-600'
                : 'cursor-pointer text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-300'
            }`}
            aria-label={t('actions.savePlan', 'Plan speichern')}
          >
            <FloppyDiskIcon className="w-5 h-5" />
          </button>
        </div>
        {planNameError && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">
            {t('circle.planNameError', 'Bitte gib einen Namen ein.')}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onExport}
        title={t('actions.exportShortcut', 'Exportieren (Strg/Cmd+E)')}
        className={`${primaryButtonClass} w-full justify-center gap-2 px-4 sm:w-auto`}
      >
        <ShareNetworkIcon className="w-4 h-4" size={16} />
        {t('actions.export', 'Exportieren')}
      </button>
    </form>
  );
}
