// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftIcon,
  ArrowsInIcon,
  DoorOpenIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  PaletteIcon,
  UserSquareIcon,
} from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { KpLockup } from '@/components/KpLockup';
import { LocalizedLink } from '@/components/LocalizedLink';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import usePersistentState from '@/hooks/usePersistentState';
import { usePanZoom } from '@/hooks/ui/usePanZoom';
import { useEnsureCircleLayout } from '@/hooks/circle/useEnsureCircleLayout';
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import {
  iconButtonClass,
  neutralButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/utils';
import HelpButton from '@/components/ui/buttons/HelpButton';
import PresentationScene from '@/components/scene/PresentationScene';
import SimpleCircleView from '@/components/circle/SimpleCircleView';
import PresentPerspectiveToggle from '@/components/SeatingPlanGenerator/PresentPerspectiveToggle';
import SeatingModeToggle, {
  type SeatingMode,
} from '@/components/SeatingPlanGenerator/SeatingModeToggle';
import type { PresentationPerspective } from '@/utils/ui/boardOrientation';

const PRESENT_MIN_ZOOM = 0.5;
const PRESENT_MAX_ZOOM = 3;

export default function Present() {
  const { t } = useTranslation('generator');
  const metadata = usePageSeo('/present');
  const navigate = useLocalizedNavigate();
  const isDark = useIsDarkMode();
  const location = useLocation();

  const { currentSeating, classroomScene, students, circleLayout } =
    useSeatingPlanState();

  const initialMode =
    (location.state as { mode?: SeatingMode } | null)?.mode ?? 'table';
  const [mode, setMode] = useState<SeatingMode>(initialMode);
  // Generate the circle layout on demand when switching to circle presentation.
  useEnsureCircleLayout(mode, { enabled: mode === 'circle' });

  const [perspective, setPerspective] =
    useState<PresentationPerspective>('student');
  const [showBadges, setShowBadges] = useState(false);
  const [showPhotos, setShowPhotos] = usePersistentState(
    LOCAL_STORAGE_KEYS.presentShowPhotos,
    true,
  );
  const [showGenderColors, setShowGenderColors] = usePersistentState(
    LOCAL_STORAGE_KEYS.presentShowColors,
    true,
  );
  const [showFeatures, setShowFeatures] = usePersistentState(
    LOCAL_STORAGE_KEYS.presentShowFeatures,
    true,
  );
  const [zoom, setZoom] = usePersistentState(LOCAL_STORAGE_KEYS.presentZoom, 1);
  const { pan, containerRef, pointerHandlers, canPan, setZoomLevel, reset } =
    usePanZoom({
      zoom,
      setZoom,
      minZoom: PRESENT_MIN_ZOOM,
      maxZoom: PRESENT_MAX_ZOOM,
    });

  // Same back shortcut as the export page (Alt+←).
  useKeyboardShortcuts({
    'alt+arrowleft': () => navigate('/generator'),
  });

  const hasPlan = classroomScene.tables.length > 0 && currentSeating.length > 0;
  const hasCircle = !!circleLayout && circleLayout.students.length > 0;
  const hasContent = mode === 'circle' ? hasCircle : hasPlan;
  const isTeacher = perspective === 'teacher';
  const isCircle = mode === 'circle';

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-gray-950">
      <Seo {...metadata} />

      {/* Minimal toolbar */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex flex-1 justify-start">
          <h1 className="flex items-center shrink-0">
            <LocalizedLink
              to="/"
              className="kp-lockup focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <KpLockup size="sm" hideWordmarkOnMobile />
            </LocalizedLink>
          </h1>
        </div>

        <PresentPerspectiveToggle
          perspective={perspective}
          onChange={setPerspective}
        />

        <SeatingModeToggle mode={mode} onModeChange={setMode} />

        <div className="flex flex-1 justify-end">
          <HelpButton
            title={t('help.present.title', 'Präsentiermodus')}
            instructions={
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  {t(
                    'help.present.item1',
                    'Wechsle oben zwischen Lehrer- und Schüleransicht sowie zwischen Sitzplan und Sitzkreis.',
                  )}
                </li>
                <li>
                  {t(
                    'help.present.item2',
                    'Die Schüleransicht zeigt den Plan aus Sicht der Klasse – ohne Merkmale und Fotos.',
                  )}
                </li>
                <li>
                  {t(
                    'help.present.item3',
                    'Blende über die Leiste unten Merkmale, Fotos und Farben ein oder aus.',
                  )}
                </li>
                <li>
                  {t(
                    'help.present.item4',
                    'Zoome per Regler oder Mausrad und verschiebe die Ansicht durch Ziehen; das Zentrieren-Symbol setzt die Ansicht zurück.',
                  )}
                </li>
                <li>
                  {t(
                    'help.present.item5',
                    'Mit Alt + ← kehrst du zum Generator zurück.',
                  )}
                </li>
              </ul>
            }
          />
        </div>
      </div>

      {/* Scene fills the remaining space */}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 touch-none overflow-hidden px-2"
        style={{ cursor: canPan ? 'grab' : 'default' }}
        {...pointerHandlers}
      >
        {hasContent && isCircle && circleLayout ? (
          <div className="flex h-full items-center justify-center">
            <div
              className="w-full max-w-5xl"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center',
              }}
            >
              <SimpleCircleView
                layout={circleLayout}
                editable={false}
                isDark={isDark}
                showSpecialNeeds={isTeacher && showBadges}
                showGenderColors={showGenderColors}
                photoMode={isTeacher && showPhotos ? 'all' : 'off'}
                connectionMode="off"
                transparentBackground
              />
            </div>
          </div>
        ) : hasContent ? (
          <PresentationScene
            scene={classroomScene}
            seating={currentSeating}
            students={students}
            perspective={perspective}
            showBadges={showBadges}
            showPhotos={showPhotos}
            showGenderColors={showGenderColors}
            showFeatures={showFeatures}
            zoom={zoom}
            panX={pan.x}
            panY={pan.y}
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
              title={t('present.backTitle', 'Zurück zum Generator (Alt + ←)')}
            >
              <ArrowLeftIcon size={20} aria-hidden />
              <span className="text-sm font-semibold">
                {t('present.back', 'Zurück')}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom bar: back button pinned left, view controls centered below the
          classroom. Teacher-only controls (badges, photos) hide in the student
          view; colors and zoom stay. */}
      {hasContent ? (
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex flex-1 justify-start">
            <button
              type="button"
              onClick={() => navigate('/generator')}
              className={`${neutralButtonClass} h-10 shrink-0 gap-2 px-4`}
              title={t('present.backTitle', 'Zurück zum Generator (Alt + ←)')}
            >
              <ArrowLeftIcon size={20} aria-hidden />
              <span className="text-sm font-semibold">
                {t('present.back', 'Zurück')}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {isTeacher && (
              <button
                type="button"
                onClick={() => setShowBadges((value) => !value)}
                className={`${
                  showBadges ? primaryButtonClass : secondaryButtonClass
                } h-10 gap-2 px-4`}
                aria-pressed={showBadges}
                title={t(
                  'present.badgesTitle',
                  'Merkmal-Symbole der Schüler ein- oder ausblenden',
                )}
              >
                <UserSquareIcon size={20} aria-hidden />
                <span className="text-sm font-semibold">
                  {t('present.badges', 'Merkmale')}
                </span>
              </button>
            )}

            {isTeacher && (
              <button
                type="button"
                onClick={() => setShowPhotos((value) => !value)}
                className={`${
                  showPhotos ? primaryButtonClass : secondaryButtonClass
                } h-10 gap-2 px-4`}
                aria-pressed={showPhotos}
                title={t(
                  'present.photosTitle',
                  'Schülerfotos ein- oder ausblenden',
                )}
              >
                <ImageIcon size={20} aria-hidden />
                <span className="text-sm font-semibold">
                  {t('present.photos', 'Fotos')}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowGenderColors((value) => !value)}
              className={`${
                showGenderColors ? primaryButtonClass : secondaryButtonClass
              } h-10 gap-2 px-4`}
              aria-pressed={showGenderColors}
              title={t(
                'present.colorsTitle',
                'Farbige Kennzeichnung (Geschlechterfarben) ein- oder ausblenden',
              )}
            >
              <PaletteIcon size={20} aria-hidden />
              <span className="text-sm font-semibold">
                {t('present.colors', 'Farben')}
              </span>
            </button>

            {!isCircle && (
              <button
                type="button"
                onClick={() => setShowFeatures((value) => !value)}
                className={`${
                  showFeatures ? primaryButtonClass : secondaryButtonClass
                } h-10 gap-2 px-4`}
                aria-pressed={showFeatures}
                title={t(
                  'present.featuresTitle',
                  'Raumelemente (Tafel, Fenster, Türen, Möbel) ein- oder ausblenden',
                )}
              >
                <DoorOpenIcon size={20} aria-hidden />
                <span className="text-sm font-semibold">
                  {t('present.features', 'Raum')}
                </span>
              </button>
            )}

            <div className="flex h-10 items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 shadow-inner dark:border-blue-900/40 dark:bg-gray-950/70">
              <MagnifyingGlassIcon
                size={20}
                aria-hidden
                className="text-gray-600 dark:text-gray-300"
              />
              <input
                type="range"
                min={PRESENT_MIN_ZOOM}
                max={PRESENT_MAX_ZOOM}
                step={0.05}
                value={zoom}
                onChange={(event) => setZoomLevel(Number(event.target.value))}
                aria-label={t('present.zoom', 'Zoom')}
                title={t(
                  'present.zoomTitle',
                  'Ansicht vergrößern oder verkleinern',
                )}
                className="w-40 cursor-pointer accent-blue-600"
              />
              <span className="w-12 text-right text-sm font-semibold tabular-nums text-gray-600 dark:text-gray-300">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <button
              type="button"
              onClick={reset}
              className={`${iconButtonClass} h-10 w-10`}
              aria-label={t(
                'present.resetView',
                'Ansicht zentrieren und zurücksetzen',
              )}
              title={t(
                'present.resetView',
                'Ansicht zentrieren und zurücksetzen',
              )}
            >
              <ArrowsInIcon size={20} aria-hidden />
            </button>
          </div>

          <div className="flex-1" aria-hidden />
        </div>
      ) : (
        <div className="h-4" aria-hidden />
      )}
    </div>
  );
}
