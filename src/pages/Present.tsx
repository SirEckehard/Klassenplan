// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftIcon,
  UserSquareIcon,
} from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';
import { neutralButtonClass, primaryButtonClass, secondaryButtonClass } from '@/utils';
import PresentationScene from '@/components/scene/PresentationScene';
import PresentPerspectiveToggle from '@/components/SeatingPlanGenerator/PresentPerspectiveToggle';
import type { PresentationPerspective } from '@/utils/ui/boardOrientation';

export default function Present() {
  const { t } = useTranslation('generator');
  const metadata = usePageSeo('/present');
  const navigate = useLocalizedNavigate();
  const isDark = useIsDarkMode();

  const { currentSeating, classroomScene, students } = useSeatingPlanState();

  const [perspective, setPerspective] =
    useState<PresentationPerspective>('teacher');
  const [showBadges, setShowBadges] = useState(false);

  const hasPlan =
    classroomScene.tables.length > 0 && currentSeating.length > 0;

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-gray-950">
      <Seo {...metadata} />

      {/* Minimal toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => navigate('/generator')}
          className={`${neutralButtonClass} h-10 gap-2 px-4`}
        >
          <ArrowLeftIcon size={20} aria-hidden />
          <span className="text-sm font-semibold">
            {t('present.back', 'Zurück')}
          </span>
        </button>

        <PresentPerspectiveToggle
          perspective={perspective}
          onChange={setPerspective}
        />

        {/* Badge toggle only makes sense in the teacher view. */}
        {perspective === 'teacher' ? (
          <button
            type="button"
            onClick={() => setShowBadges((value) => !value)}
            className={`${
              showBadges ? primaryButtonClass : secondaryButtonClass
            } h-10 gap-2 px-4`}
            aria-pressed={showBadges}
          >
            <UserSquareIcon size={20} aria-hidden />
            <span className="text-sm font-semibold">
              {t('present.badges', 'Merkmale')}
            </span>
          </button>
        ) : (
          <div className="h-10 w-px" aria-hidden />
        )}
      </div>

      {/* Scene fills the remaining space */}
      <div className="min-h-0 flex-1 px-2 pb-4">
        {hasPlan ? (
          <PresentationScene
            scene={classroomScene}
            seating={currentSeating}
            students={students}
            perspective={perspective}
            showBadges={showBadges}
            isDark={isDark}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-gray-600 dark:text-gray-300">
            <p className="text-lg font-medium">
              {t('present.empty', 'Noch kein Sitzplan zum Präsentieren.')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/generator')}
              className={`${primaryButtonClass} h-10 gap-2 px-4`}
            >
              <ArrowLeftIcon size={20} aria-hidden />
              <span className="text-sm font-semibold">
                {t('present.back', 'Zurück')}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
